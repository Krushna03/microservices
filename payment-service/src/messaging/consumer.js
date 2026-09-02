import { connectRabbitMQ } from "./rabbitmq.js";
import { processInventoryReserved } from "../services/payment.service.js";
import { RETRY_CONFIG } from "./retry.config.js";
import { setupRetryQueues, getRetryAttempt, } from "./retry.js";
import { publishToRetryQueue } from "./retry.publisher.js";

export const startConsumer = async () => {
  const channel = await connectRabbitMQ();

  // Queue Configuration
  const MAIN_QUEUE = "payment-service";
  
  const RETRY_QUEUE_PREFIX = "payment-service.retry";
  
  const DLQ = "payment-service.dlq";
  
  const EVENT_EXCHANGE = "writing.events";
  
  const DEAD_LETTER_EXCHANGE = "writing.events.dlx";

  // Retry / DLQ Setup
  await setupRetryQueues(
    channel,
    {
      mainQueue: MAIN_QUEUE,
      retryQueuePrefix: RETRY_QUEUE_PREFIX,
      deadLetterQueue: DLQ,
      retryRoutingKey: "inventory.reserved",
      dlqRoutingKey: "payment.processing.failed",
      eventExchange: EVENT_EXCHANGE,
      deadLetterExchange: DEAD_LETTER_EXCHANGE,
    }
  );

  // Bind Main Queue
  await channel.bindQueue(MAIN_QUEUE, EVENT_EXCHANGE, "inventory.reserved");

  // Backpressure
  channel.prefetch(10);

  // Consumer
  await channel.consume(MAIN_QUEUE, async (message) => {
    if (!message) {
      return;
    }

    const retryAttempt = getRetryAttempt(message);

    try {
      const event = JSON.parse(message.content.toString());

      console.log(`[Payment Service] Event Received: ${ event.eventType }`);

      console.log(`[Payment Service]Attempt: ${ retryAttempt + 1 }`);

      // Business Logic
      await processInventoryReserved(event);

      console.log(`[Payment Service] Event Received: ${ event.eventType }`);

      console.log(`[Payment Service]Attempt: ${ retryAttempt + 1 }`);

      // Business Logic
      await processInventoryReserved(event);

      // ACK only after the business
      // transaction has completed.
      channel.ack(message);

      console.log(`[Payment Service] Event processed successfully: ${event.eventId} `);
      
    } catch (error) {
      console.error("[Payment Service] Event processing failed:", error);

      const nextAttempt = retryAttempt + 1;

      // Retry available?
      if (nextAttempt <= RETRY_CONFIG.maxAttempts) {

        const published = publishToRetryQueue(channel, message, nextAttempt, RETRY_QUEUE_PREFIX);

        if (published) {
          // ACK the original message
          // because we successfully copied
          // it to the retry queue.
          channel.ack(message);

          console.log(`[Payment Service] Message scheduled for retry #${ nextAttempt }`);

          return;
        }
      }

      // No retries remaining.
      // Send message to DLQ.
      channel.nack(message, false, false);
      
      console.error(`[Payment Service] Max retries exceeded.Message sent to DLQ.`);
    }
  });

  console.log("[Payment Service] Consumer started listening for 'inventory.reserved'");
};
