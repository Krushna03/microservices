import { publishEvent } from "../messaging/publisher.js";
import { Outbox } from "../models/outbox.model.js";

const getRoutingKey = (eventType) => {
  const mapping = {
    InventoryReserved: "inventory.reserved",
    InventoryReservationFailed: "inventory.reservation_failed",
    InventoryReleased: "inventory.released",
  };

  return mapping[eventType] || "inventory.reserved";
};

export const processOutbox = async () => {
  const events = await Outbox.find({
    status: 'pending'
  })
    .sort({ createdAt: 1 })
    .limit(100);

  for (const event of events) {
    try {
      await publishEvent({
        routingKey: getRoutingKey(event.eventType),
        event: {
          eventId: event.eventId,
          eventType: event.eventType,
          occurredAt: event.createdAt,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
        }
      });

      await Outbox.updateOne(
        { _id: event._id },
        {
          $set: {
            status: 'published',
            publishedAt: new Date(),
          },

          $inc: {
            attempts: 1
          }
        }
      );
    } catch (error) {
      await Outbox.updateOne(
        { _id: event._id },
        {
          $set: {
            status: 'failed',
          },

          $inc: {
            attempts: 1
          }
        },
      );
    }
  }
};

export const startOutboxWorker = (intervalMs = 3000) => {
  console.log("Starting Inventory Service Outbox Worker...");
  setInterval(async () => {
    try {
      await processOutbox();
    } catch (error) {
      console.error("Outbox worker error:", error);
    }
  }, intervalMs);
};

