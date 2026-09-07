import { RETRY_CONFIG } from "./retry.config.js";
import { publishToExchange } from "./retry.publisher.js";

/*
 * Retry Queue
 *     ↓
 * Message expires
 *     ↓
 * Retry Dispatcher
 *     ↓
 * Read original routing key
 *     ↓
 * Publish to main exchange
 *     ↓
 * RabbitMQ confirms publish
 *     ↓
 * ACK retry message
 */

export const startRetryDispatcher = async (channel, {
    retryQueuePrefix,
    eventExchange,
  }
) => {

  // Limit the number of retry messages processed concurrently.
  await channel.prefetch(10); 
  
  for (const delay of RETRY_CONFIG.delays) {

    const retryQueue = `${retryQueuePrefix}.${delay}ms`;

    const consumer = await channel.consume(retryQueue, async (message) => {

      if (!message) return;

      try {
        const headers = message.properties?.headers || {};

        const originalRoutingKey = headers["x-original-routing-key"];

        if (!originalRoutingKey) {
          throw new Error("Missing x-original-routing-key header");
        }

        await publishToExchange(
          channel,
          eventExchange,
          originalRoutingKey,
          message
        );

        channel.ack(message);

        console.log(`[RabbitMQ] Retry dispatched: ${originalRoutingKey}`);

      } catch (error) {
        
        console.error("[RabbitMQ] Retry dispatch failed:", error);

        channel.nack(message, false, true);
      }
    });

    console.log(`[RabbitMQ] Retry dispatcher listening on ${retryQueue}`);

    return consumer;
  }
};
