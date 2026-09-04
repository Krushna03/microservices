import { connectRabbitMQ } from "./rabbitmq.js";
import { handlePaymentSucceeded, handleInventoryReleased, handleInventoryReservationFailed, } from "./payment.handlers.js";
import { setupRetryQueues } from "../../../shared/rabbitmq/retry.js";
import { processMessageWithRetry } from "../../../shared/rabbitmq/message.processor.js";


export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  // main exchange
  await channel.assertExchange(
    "writing.events",
    "topic",
    { durable: true }
  );

  // Dead Letter Exchange
  await channel.assertExchange(
    "writing.events.dlx",
    "topic",
    { durable: true }
  );

  // main queue
  const queue = await channel.assertQueue("order-service", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "writing.events.dlx",
      "x-dead-letter-routing-key": "order.processing.failed",
    },
  });

  // Payment succeeded
  await channel.bindQueue(queue.queue, "writing.events", "payment.succeeded");

  // Inventory released
  await channel.bindQueue(queue.queue, "writing.events", "inventory.released");

  // Inventory reservation failed
  await channel.bindQueue(queue.queue, "writing.events", "inventory.reservation_failed");

  // Retry queues + DLQ
  await setupRetryQueues(channel, {
    retryQueuePrefix: "order-service.retry",
    deadLetterQueue: "order-service.dlq",
    /*
     * This is a little different from Payment/Inventory.
     *
     * The same retry queue can receive events
     * from multiple routing keys.
     *
     * Therefore we cannot simply use one routing key
     * for all retry messages.
     */
  });

  await channel.prefetch(10);

  await channel.consume(queue.queue, async (message) => {
    if (!message) return;

    const routingKey = message.fields.routingKey;

    let handler;

    if (routingKey === "payment.succeeded") {
      handler = handlePaymentSucceeded;
    }
    else if (routingKey === "inventory.released") {
      handler = handleInventoryReleased;
    }
    else if (routingKey === "inventory.reservation_failed") {
      handler = handleInventoryReservationFailed;
    }

    if (!handler) {
      console.warn(`[Order Service] Unknown routing key: ${routingKey}`);
      //  Don't endlessly retry an event that this service doesn't understand.
      channel.nack(message, false, false);
      return;
    }

    await processMessageWithRetry(channel, message, handler, {
      retryQueuePrefix: "order-service.retry"
    });
  });

  console.log("[Order Service] Consumer started.");
};