import { handleOrderCreated } from "./order.handlers.js";
import { connectRabbitMQ } from "./rabbitmq.js";

export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  // Assert Dead Letter Queue (DLQ)
  await channel.assertQueue("inventory-service.dlq", {
    durable: true,
  });

  await channel.bindQueue(
    "inventory-service.dlq",
    "writing.events.dlx",
    "inventory.failed"
  );

  // Assert main queue with Dead Letter Exchange settings
  const queue = await channel.assertQueue("inventory-service", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "writing.events.dlx",
      "x-dead-letter-routing-key": "inventory.failed",
    },
  });

  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "order.created"
  );

  console.log("Inventory Service listening for 'order.created' events...");

  await channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      console.log("Event Received:", event.eventType);

      await handleOrderCreated(event);

      channel.ack(msg);
    } catch (error) {
      console.error("Event processing failed:", error);

      // Requeue = false -> routes rejected message to DLQ via x-dead-letter-exchange
      channel.nack(msg, false, false);
    }
  });
};