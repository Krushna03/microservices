import { connectRabbitMQ } from "./rabbitmq.js";
import { reserveInventory, processPaymentFailed } from "../services/inventory.service.js";
import { setupRetryQueues } from "../../../../shared/rabbitmq/retry.js";
import { processMessageWithRetry } from "../../../../shared/rabbitmq/message.processor.js";
import { startRetryDispatcher } from "../../../../shared/rabbitmq/retry.dispatcher.js";
import { RABBITMQ_CONFIG } from "./rabbitmq.config.js";


export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  /*
   * ============================================================
   * 1. Main Event Exchange
   * ============================================================
   */
  await channel.assertExchange(
    RABBITMQ_CONFIG.exchange,
    "topic",
    {
      durable: true,
    }
  );

  /*
   * ============================================================
   * 2. Dead Letter Exchange
   * ============================================================
   */
  await channel.assertExchange(
    RABBITMQ_CONFIG.deadLetterExchange,
    "topic",
    {
      durable: true,
    }
  );

  /*
   * ============================================================
   * 3. Main Inventory Queue
   * ============================================================
   */
  const queue = await channel.assertQueue(RABBITMQ_CONFIG.queue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RABBITMQ_CONFIG.deadLetterExchange,
      "x-dead-letter-routing-key": RABBITMQ_CONFIG.dlqRoutingKey,
    },
  });

  /*
   * ============================================================
   * 4. Bind Events Inventory Service Consumes
   * ============================================================
   */
  for (const routingKey of RABBITMQ_CONFIG.routingKeys) {
    await channel.bindQueue(
      queue.queue,
      RABBITMQ_CONFIG.exchange,
      routingKey
    );
  }

  /*
   * ============================================================
   * 5. Retry Queues + DLQ
   * ============================================================
   */
  await setupRetryQueues(channel, {
    retryQueuePrefix: RABBITMQ_CONFIG.retryQueuePrefix,
    deadLetterQueue: RABBITMQ_CONFIG.dlq,
  });

  /*
   * ============================================================
   * 6. Start Retry Dispatcher
   * ============================================================
   */
  await startRetryDispatcher(channel, {
    retryQueuePrefix: RABBITMQ_CONFIG.retryQueuePrefix,
    eventExchange: RABBITMQ_CONFIG.exchange,
  });

  /*
   * ============================================================
   * 7. Backpressure
   * ============================================================
   */
  await channel.prefetch(10);

  /*
   * ============================================================
   * 8. Main Consumer
   * ============================================================
   */
  await channel.consume(queue.queue, async (message) => {
    if (!message) return;

    const routingKey = message.fields?.routingKey;

    console.log(`[Inventory Service] Event received: ${routingKey}`);

    /*
       * --------------------------------------------------------
       * OrderCreated
       * --------------------------------------------------------
       *
       * Reserve inventory.
       */

      if (routingKey === "order.created") {
        await processMessageWithRetry(
          channel,
          message,
          reserveInventory,
          { retryQueuePrefix: RABBITMQ_CONFIG.retryQueuePrefix }
        );

        return;
      }

      /*
       * --------------------------------------------------------
       * PaymentFailed
       * --------------------------------------------------------
       *
       * Release previously reserved inventory.
       */

      if (routingKey === "payment.failed") {
        await processMessageWithRetry(
          channel,
          message,
          processPaymentFailed,
          { retryQueuePrefix: RABBITMQ_CONFIG.retryQueuePrefix }
        );

        return;
      }

      /*
       * --------------------------------------------------------
       * Unknown Event
       * --------------------------------------------------------
       * Do not requeue an event that this service doesn't understand.
       */

      console.warn(`[Inventory Service] Unknown routing key: ${routingKey}`);

      channel.nack(message, false, false);
    }
  );

  console.log("[Inventory Service] Consumer started.");
};