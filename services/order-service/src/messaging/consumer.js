import { connectRabbitMQ } from "./rabbitmq.js";
import { handlePaymentSucceeded, handleInventoryReleased, handleInventoryReservationFailed } from "./payment.handlers.js";

export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  // Assert Dead Letter Queue (DLQ)
  await channel.assertQueue("order-service.dlq", {
    durable: true,
  });

  await channel.bindQueue(
    "order-service.dlq",
    "writing.events.dlx",
    "order.processing.failed"
  );

  // Assert main queue
  const queue = await channel.assertQueue("order-service", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "writing.events.dlx",
      "x-dead-letter-routing-key": "order.processing.failed",
    },
  });

  // Bind queue to Saga events, payment Succeed
  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "payment.succeeded"
  );

  // Inventory Released
  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "inventory.released"
  );

  // Inventory Reservation Failed
  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "inventory.reservation_failed"
  );

  console.log("Order Service listening for Saga events ('payment.succeeded', 'inventory.released', 'inventory.reservation_failed')...");

  await channel.prefetch(10);

  await channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      
      const routingKey = msg.fields.routingKey;

      console.log(`[Order Service] Event Received: ${event.eventType} (Key: ${routingKey})`);

      if (event.eventType === "PaymentSucceeded" || routingKey === "payment.succeeded") {
        await handlePaymentSucceeded(event);
      }
      else if (event.eventType === "InventoryReleased" || routingKey === "inventory.released") {
        await handleInventoryReleased(event);
      }
      else if (event.eventType === "InventoryReservationFailed" || routingKey === "inventory.reservation_failed") {
        await handleInventoryReservationFailed(event);
      }
      else {
        console.warn(`[Order Service] Unhandled event type: ${event.eventType}`);
      }

      channel.ack(msg);

    } catch (error) {
      console.error("[Order Service] Event processing failed:", error);
      
      channel.nack(msg, false, false);
    }
  });

  console.log("[Order Service] Consumer started.");

};
