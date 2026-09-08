import crypto from "crypto";
import logger from "../config/logger.js";
import { publishEvent } from "../messaging/publisher.js";
import {
  claimNextOutboxEvent,
  markPublished,
  markFailed,
} from "../repositories/outbox.repository.js";


const EVENT_ROUTING_KEYS = {
  InventoryReserved:"inventory.reserved",
  InventoryReservationFailed: "inventory.reservation_failed",
  InventoryReleased: "inventory.released",
};


const calculateNextAttempt = (
  attempts
) => {

  const delay = Math.min(
    1000 * Math.pow(2, attempts),
    60000
  );

  return new Date(
    Date.now() + delay
  );
};


export const processOutbox = async () => {

  const workerId = `inventory-worker-${crypto.randomUUID()}`;


  /*
   * Process up to 100 events
   * during one worker cycle.
   */

  for (let i = 0; i < 100; i++) {

    /*
     * Atomically claim an event.
     */

    const event = await claimNextOutboxEvent(workerId);

    /*
     * No more events available.
     */

    if (!event) {
      break;
    }


    try {

      const routingKey =
        EVENT_ROUTING_KEYS[
          event.eventType
        ];


      if (!routingKey) {

        throw new Error(
          `Unknown event type: ${event.eventType}`
        );
      }


      /*
       * Publish to RabbitMQ.
       */

      await publishEvent({

        routingKey,

        event: {
          eventId:
            event.eventId,

          eventType:
            event.eventType,

          occurredAt:
            event.createdAt,

          aggregateType:
            event.aggregateType,

          aggregateId:
            event.aggregateId,

          correlationId:
            event.correlationId,

          payload:
            event.payload,
        },
      });


      /*
       * Only mark published
       * after RabbitMQ confirms.
       */

      await markPublished(
        event.eventId,
        workerId
      );

      logger.info({
        eventId: event.eventId,
        eventType: event.eventType,
        routingKey,
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        workerId,
      }, 
        "Inventory outbox event published" 
      );
    } catch (error) {
      logger.error({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        workerId,
        error: error.message
      },
        "Inventory outbox event failed " + error
      );

      const nextAttemptAt = calculateNextAttempt(event.attempts);

      await markFailed(event.eventId, workerId, nextAttemptAt);
    }
  }
};


export const startOutboxWorker = (intervalMs = 3000) => {
  logger.info( { intervalMs, }, "Starting Inventory Service Outbox Worker" );

  setInterval(async () => {
    try {
      await processOutbox();
    } catch (error) {
      logger.error({ err: error }, "Inventory Outbox worker error:");
    }
  }, intervalMs);
};