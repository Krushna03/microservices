import { connectRabbitMQ } from "./rabbitmq.js";
import { processInventoryReserved } from "../services/payment.service.js";

export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  // Assert Dead Letter Queue (DLQ)
  await channel.assertQueue("payment-service.dlq", {
    durable: true,
  });

  await channel.bindQueue(
    "payment-service.dlq",
    "writing.events.dlx",
    "payment.failed"
  );

  // Assert main queue
  const queue = await channel.assertQueue("payment-service", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "writing.events.dlx",
      "x-dead-letter-routing-key": "payment.failed",
    },
  });

  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "inventory.reserved"
  );

  // Bulkhead / backpressure mechanism
  await channel.prefetch(10);

  await channel.consume(queue.queue, async (message) => {
    if (!message) return;

    try {
      const event = JSON.parse(message.content.toString());

      console.log("[Payment Service] Event Received:", event.eventType);

      await processInventoryReserved(event);

      channel.ack(message);
    } catch (error) {
      console.error("[Payment Service] Event processing failed:", error);

      channel.nack(message, false, false);
    }
  });

  console.log("Payment Service consumer started listening for 'inventory.reserved' events");
};