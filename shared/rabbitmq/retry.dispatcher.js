import { publishToExchange } from "./retry.publisher.js";


/*
 * ============================================================
 * RETRY DISPATCHER
 * ============================================================
 *
 * Flow:
 *
 * Retry Delay Queue (NO CONSUMERS)
 *     ↓
 * Message TTL expires in RabbitMQ (1s, 2s, 4s, 8s, 16s)
 *     ↓
 * RabbitMQ dead-letters to ${retryQueuePrefix}.dlx ("retry.ready")
 *     ↓
 * Arrives in ${retryQueuePrefix}.dispatch
 *     ↓
 * Retry Dispatcher (consumes ONLY from this dispatch queue)
 *     ↓
 * Read original routing key (x-original-routing-key)
 *     ↓
 * Publish to main exchange (e.g. writing.events)
 *     ↓
 * RabbitMQ confirms publish
 *     ↓
 * ACK retry message from dispatch queue
 */

export const startRetryDispatcher = async (
  channel,
  {
    retryQueuePrefix,
    eventExchange,
  }
) => {

  /*
   * Limit concurrent retry processing.
   */
  await channel.prefetch(10);

  const dispatchQueue = `${retryQueuePrefix}.dispatch`;

  const consumer = await channel.consume(
    dispatchQueue,

    async (message) => {

      if (!message) return;

      try {

        const headers =
          message.properties?.headers || {};

        const originalRoutingKey =
          headers["x-original-routing-key"];

        if (!originalRoutingKey) {

          throw new Error(
            "Missing x-original-routing-key header"
          );
        }

        /*
         * Publish expired retry message back to the main event exchange.
         */
        await publishToExchange(
          channel,
          eventExchange,
          originalRoutingKey,
          message
        );

        /*
         * Only ACK after RabbitMQ confirms the publish.
         */
        channel.ack(message);

        console.log(
          `[RabbitMQ] Retry dispatched: ${originalRoutingKey} (Attempt ${headers["x-retry-attempt"] || "?"})`
        );

      } catch (error) {

        console.error(
          "[RabbitMQ] Retry dispatch failed:",
          error
        );

        /*
         * Keep retry message in the dispatch queue if publishing fails.
         */
        channel.nack(
          message,
          false,
          true
        );
      }
    }
  );

  console.log(
    `[RabbitMQ] Retry dispatcher listening on ${dispatchQueue}`
  );

  return consumer;
};