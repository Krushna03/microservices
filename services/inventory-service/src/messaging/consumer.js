import { connectRabbitMQ } from "./rabbitmq.js";
import { reserveInventory, processPaymentFailed } from "../services/inventory.service.js";

export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  // DLQ
  await channel.assertQueue("inventory-service.dlq", {durable: true});

  await channel.bindQueue(
    "inventory-service.dlq",
    "writing.events.dlx",
    "inventory.processing.failed"
  );

  // Main Queue
  const queue = await channel.assertQueue("inventory-service", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "writing.events.dlx",
      "x-dead-letter-routing-key": "inventory.processing.failed",
      },
    }
  );

  // Event bindings, order created event will reserve inventory
  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "order.created"
  );

  // PaymentFailed
  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "payment.failed"
  );

  await channel.prefetch(10);

  console.log("[Inventory Service] Listening for events...");

  // Consumer
  await channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const routingKey = msg.fields.routingKey;

      console.log(`[Inventory Service] Event Received: ${event.eventType} (${routingKey})`);

      if (routingKey === "order.created") {
        await reserveInventory(event);
      }

      else if (routingKey === "payment.failed") {
        await processPaymentFailed(event);
      }

      else {
        console.warn(`[Inventory Service] Unhandled event: ${routingKey}`);
      }

      channel.ack(msg);

    } catch (error) {
      console.error("[Inventory Service] Event processing failed:", error);

      channel.nack(msg, false, false);
    }
    }
  );

  console.log("[Inventory Service] Consumer started.");
};