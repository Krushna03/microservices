import { findPendingOutboxEvents, markPublished, markFailed } from "../repositories/outbox.repository.js";
import { publishEvent } from "../messaging/publisher.js";

const calculateNextAttempt = (attempts) => {
  const delay = Math.min(1000 * Math.pow(2, attempts), 60000);

  return new Date(Date.now() + delay);
};

export const processOutbox = async () => {
  const events = await findPendingOutboxEvents(100);

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
          },
        });

        await markPublished(event.eventId);
      
      } catch (error) {
        console.error(`Failed to publish ${event.eventId}:`, error);

        const nextAttemptAt = calculateNextAttempt(event.attempts);

        await markFailed(event.eventId, nextAttemptAt);
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