import crypto from "crypto";
import { markPublished, markFailed, claimPendingOutboxEvents } from "../repositories/outbox.repository.js";
import { publishEvent } from "../messaging/publisher.js";

const WORKER_ID = `payment-outbox-${crypto.randomUUID()}`;

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

  console.log(`[Outbox] Worker ${WORKER_ID} claimed ${events.length} events`);
  
  for (const event of events) {
    try {
      console.log( `[Outbox] Publishing event ${event.eventId} (${event.eventType})`);
      
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
        console.warn(`[Outbox] Event ${event.eventId} was published but worker no longer owns the lock.`);

        continue;
      }

      console.log(`[Outbox] Successfully processed event ${event.eventId}`);
    
    } catch (error) {
      console.error(`[Outbox] Failed to publish ${event.eventId}:`, error);

      const nextAttemptAt = calculateNextAttempt(event.attempts);

      await markFailed(event.eventId, WORKER_ID, nextAttemptAt);

      console.log(`[Outbox] Retry scheduled for ${event.eventId} at ${nextAttemptAt.toISOString()}`);
    }
  }
};


const getRoutingKey = (eventType) => {
  const mapping = {
    PaymentSucceeded: "payment.succeeded",
    PaymentFailed: "payment.failed",
  };

  const routingKey = mapping[eventType];

  if (!routingKey) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  return routingKey;
};


export const startOutboxWorker = () => {
  const run = async () => {
    try {
      await processOutbox();
    } catch (error) {
      console.error("[Outbox] Worker cycle failed:", error);
    }
  };

  // Run immediately.
  run();

  // Then periodically check for new events.
  setInterval(run, 5000);

  console.log(`[Outbox] Worker started: ${WORKER_ID}`);
};