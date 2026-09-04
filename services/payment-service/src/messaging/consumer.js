import { connectRabbitMQ } from "./rabbitmq.js";
import { processInventoryReserved } from "../services/payment.service.js";
import { setupRetryQueues } from "../../../../shared/rabbitmq/retry.js";
import { processMessageWithRetry } from "../../../../shared/rabbitmq/message.processor.js";
import { startRetryDispatcher } from "../../../../shared/rabbitmq/retry.dispatcher.js";
import { RABBITMQ_CONFIG } from "../config/rabbitmq.config.js";

export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  /*
   * Main exchange
   */
  await channel.assertExchange(RABBITMQ_CONFIG.exchange,
    "topic",
    {
      durable: true,
    }
  );

  /*
   * Dead-letter exchange
   */
  await channel.assertExchange(RABBITMQ_CONFIG.deadLetterExchange,
    "topic",
    {
      durable: true,
    }
  );

  /*
   * Main queue
   */
  const queue = await channel.assertQueue(RABBITMQ_CONFIG.queue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RABBITMQ_CONFIG.deadLetterExchange,
      "x-dead-letter-routing-key": RABBITMQ_CONFIG.dlqRoutingKey,
    },
  });

  /*
   * Bind required events
   */
  for (const routingKey of RABBITMQ_CONFIG.routingKeys) {
    await channel.bindQueue(queue.queue, RABBITMQ_CONFIG.exchange, routingKey);
  }

  /*
   * Retry queues
   */
  await setupRetryQueues(channel, {
    retryQueuePrefix: RABBITMQ_CONFIG.retryQueuePrefix,
    deadLetterQueue: RABBITMQ_CONFIG.dlq,
  });

  /*
   * Retry dispatcher
   */
  await startRetryDispatcher(channel, {
    retryQueuePrefix: RABBITMQ_CONFIG.retryQueuePrefix,
    eventExchange: RABBITMQ_CONFIG.exchange,
    }
  );

  /*
   * Limit concurrent messages.
   */
  await channel.prefetch(10);

  /*
   * Consume events.
   */
  await channel.consume(queue.queue, async (message) => {
    if (!message) return;

    const routingKey = message.fields?.routingKey;

    console.log(`[Payment Service] Event received: ${routingKey}`);

    if (routingKey === "inventory.reserved") {
      await processMessageWithRetry(channel, message, processInventoryReserved, {
        retryQueuePrefix: RABBITMQ_CONFIG.retryQueuePrefix,
      });

      return;
    }

    /*
      * Unknown event
      */
    console.warn(`[Payment Service] Unknown routing key: ${routingKey}`);

    channel.nack(message, false, false);
  });

  console.log("[Payment Service] Consumer started.");
};