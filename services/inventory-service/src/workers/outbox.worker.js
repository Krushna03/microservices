import crypto from "crypto";
import { markPublished, markFailed, claimPendingOutboxEvents } from "../repositories/outbox.repository.js";
import { publishEvent } from "../messaging/publisher.js";

const WORKER_ID = `inventory-outbox-${crypto.randomUUID()}`;
const BATCH_SIZE = 100;
const LOCK_DURATION_MS = 60_000;

const calculateNextAttempt = (attempts) => {
  const delay = Math.min(1000 * Math.pow(2, attempts), 60_000);
  return new Date(Date.now() + delay);
};

export const processOutbox = async () => {
  const events = await claimPendingOutboxEvents(BATCH_SIZE, WORKER_ID, LOCK_DURATION_MS);

  if (events.length === 0) {
    return;
  }

  console.log(`[Inventory Outbox] Worker ${WORKER_ID} claimed ${events.length} events`);

  for (const event of events) {
    try {
      console.log(`[Inventory Outbox] Publishing event ${event.eventId} (${event.eventType})`);

      await publishEvent({
        routingKey: getRoutingKey(event.eventType),
        event: {
          eventId: event.eventId,
          eventType: event.eventType,
          correlationId: event.correlationId,
          occurredAt: event.createdAt,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
        },
      });

      const result = await markPublished(event.eventId, WORKER_ID);

      if (result.modifiedCount === 0) {
        console.warn(`[Inventory Outbox] Event ${event.eventId} was published but worker no longer owns the lock.`);
        continue;
      }

      console.log(`[Inventory Outbox] Successfully processed event ${event.eventId}`);

    } catch (error) {
      console.error(`[Inventory Outbox] Failed to publish ${event.eventId}:`, error);

      const nextAttemptAt = calculateNextAttempt(event.attempts);

      await markFailed(event.eventId, WORKER_ID, nextAttemptAt);

      console.log(`[Inventory Outbox] Retry scheduled for ${event.eventId} at ${nextAttemptAt.toISOString()}`);
    }
  }
};

const getRoutingKey = (eventType) => {
  const mapping = {
    InventoryReserved: "inventory.reserved",
    InventoryReservationFailed: "inventory.reservation_failed",
    InventoryReleased: "inventory.released",
  };

  const routingKey = mapping[eventType];

  if (!routingKey) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  return routingKey;
};

export const startOutboxWorker = (intervalMs = 3000) => {
  console.log("Starting Inventory Service Outbox Worker...");
  setInterval(async () => {
    try {
      await processOutbox();
    } catch (error) {
      console.error("Inventory Outbox worker error:", error);
    }
  }, intervalMs);
};
