import { BusinessError } from "../errors/business-error.js";
import { RETRY_CONFIG } from "./retry.config.js";
import { getRetryAttempt, getNextRetryAttempt, getRetryDelay, getOriginalRoutingKey } from "./retry.js";
import { publishToRetryQueue } from "./retry.publisher.js";

export const processMessageWithRetry = async (channel, message, handler, {
    retryQueuePrefix,
  }
) => {
  try {
    /*
     * Parse event.
     */
    const event = JSON.parse(message.content.toString());

    /*
     * Execute business logic.
     */
    await handler(event);

    /*
     * Business logic succeeded.
     * Message is completely processed.
     */
    channel.ack(message);

  } catch (error) {

    /*
     * ========================================================
     * BUSINESS ERROR
     * ========================================================
     * Expected business failures should NOT retry.
     * Examples:
     * - Insufficient inventory
     * - Payment declined
     * - Invalid business state
     */
    if (error instanceof BusinessError || error?.isBusinessError) {
      console.warn(`[RabbitMQ] Business failure: ${error.message}`);

      /*
       * ACK because retrying would not solve
       * a business problem.
       */
      channel.ack(message);

      return;
    }

    /*
     * ========================================================
     * SYSTEM ERROR
     * ========================================================
     * Examples:
     * - MongoDB unavailable
     * - MongoDB timeout
     * - Network failure
     * - Unexpected application error
     */
    console.error("[RabbitMQ] System failure:", error);

    const currentAttempt = getRetryAttempt(message);
    
    const nextAttempt = getNextRetryAttempt(currentAttempt);

    /*
     * ========================================================
     * ORIGINAL ROUTING KEY
     * ========================================================
     */

    const originalRoutingKey = getOriginalRoutingKey(message);

    /*
     * If we don't know where this message
     * originally came from, we cannot safely
     * retry it.
     */
    if (!originalRoutingKey) {
      console.error("[RabbitMQ] Missing original routing key. Sending to DLQ.");

      channel.nack(message, false, false);

      return;
    }

    /*
     * ========================================================
     * RETRY
     * ========================================================
     */

    if (nextAttempt <= RETRY_CONFIG.maxAttempts) {

      const delay = getRetryDelay(nextAttempt);

      /*
       * Defensive check.
       */
      if (!delay) {
        console.error(`[RabbitMQ] No retry delay configured for attempt ${nextAttempt}. Sending to DLQ.`);
        channel.nack(message, false, false);
        return;
      }

      const retryQueue = `${retryQueuePrefix}.${delay}ms`;

      try {
        /*
         * Publish the failed message to the retry queue.
         */
        await publishToRetryQueue(
          channel,
          message,
          nextAttempt,
          retryQueue,
          originalRoutingKey
        );

        /*
         * IMPORTANT:
         * ACK the original only AFTER the retry message has been
         * confirmed by RabbitMQ.
         */
        channel.ack(message);

        console.log(`[RabbitMQ] Retry ${nextAttempt}/${RETRY_CONFIG.maxAttempts} scheduled after ${delay}ms`);

      } catch (publishError) {
        console.error("[RabbitMQ] Failed to publish retry:", publishError);

        /*
         * Retry publishing failed.
         * Keep original message alive.
         */
        channel.nack(message, false, true);
      }

      return;
    }

    /*
     * ========================================================
     * MAX RETRIES EXCEEDED
     * ========================================================
     */

    console.error(`[RabbitMQ] Maximum retries (${RETRY_CONFIG.maxAttempts}) exceeded. Sending to DLQ.`);

    /*
     * reject + requeue=false
     * Because our main queue has:
     * x-dead-letter-exchange
     * RabbitMQ will move the message
     * to the service DLQ.
     */
    channel.nack(message, false, false);
  }
};