import { connectRabbitMQ } from "./rabbitmq.js";
import { processInventoryReserved } from "../services/payment.service.js";

export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  // Dead Letter Queue
  await channel.assertQueue("payment-service.dlq", { durable: true });

  await channel.bindQueue(
    "payment-service.dlq",
    "writing.events.dlx",
    "payment.processing.failed"
  );

  // Main Queue
  const queue = await channel.assertQueue("payment-service", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "writing.events.dlx",
      "x-dead-letter-routing-key": "payment.processing.failed",
    },
  });

  // Event Bindings
  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "inventory.reserved"
  );

  // Backpressure / Bulkhead
  channel.prefetch(10);

  // Consumer
  await channel.consume(queue.queue, async (message) => {
    if (!message) return;

    try {
      const event = JSON.parse(message.content.toString());

      const routingKey = message.fields.routingKey;

      console.log(`[Payment Service] Event Received: ${event.eventType} (${routingKey})`);

      // Inventory Reserved
      if (routingKey === "inventory.reserved") {
        await processInventoryReserved(event);
      } else {
        console.warn(`[Payment Service] Unhandled event: ${routingKey}`);
      }

      // ACK only after processing
      channel.ack(message);

    } catch (error) {
      console.error("[Payment Service] Event processing failed:", error);
      // Don't requeue.
      // Send message to DLQ.
      channel.nack(message, false, false);
    }
  });

  console.log("[Payment Service] Consumer started. Listening for 'inventory.reserved'.");
};