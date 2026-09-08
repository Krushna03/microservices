import crypto from "crypto";
import { markPublished, markFailed, claimPendingOutboxEvents } from "../repositories/outbox.repository.js";
import { publishEvent } from "../messaging/publisher.js";
import logger from "../config/logger.js";

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

  logger.info(
    {
      workerId: WORKER_ID,
      eventCount: events.length,
    },
    "Payment Outbox worker claimed events"
  );
  
  for (const event of events) {
    try {
      logger.info(
        {
          eventId: event.eventId,
          eventType: event.eventType,
          workerId: WORKER_ID,
        },
        "Payment Outbox publishing event"
      );
      
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
         logger.warn(
          {
            eventId: event.eventId,
            workerId: WORKER_ID,
          },
          "Payment Outbox event published but worker no longer owns the lock"
        );
        continue;
      }

      logger.info(
        {
          eventId: event.eventId,
          eventType: event.eventType,
          workerId: WORKER_ID,
        },
        "Payment Outbox event published successfully"
      );
    
    } catch (error) {
      logger.error(
        {
          err: error,
          eventId: event.eventId,
          eventType: event.eventType,
          workerId: WORKER_ID,
        },
        "Payment Outbox failed to publish event"
      );

      const nextAttemptAt = calculateNextAttempt(event.attempts);

      await markFailed(event.eventId, WORKER_ID, nextAttemptAt);

      logger.warn(
        {
          eventId: event.eventId,
          nextAttemptAt,
          workerId: WORKER_ID,
        },
        "Payment Outbox retry scheduled"
      );
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
      logger.error(
        {
          err: error,
          workerId: WORKER_ID,
        },
        "Payment Outbox worker cycle failed"
      );
    }
  };

  // Run immediately.
  run();

  // Then periodically check for new events.
  setInterval(run, 5000);

  logger.info(
    {
      workerId: WORKER_ID,
      intervalMs: 5000,
    },
    "Payment Outbox worker started"
  );
};