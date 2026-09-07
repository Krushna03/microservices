import { BusinessError } from "../errors/business-error.js";

import { RETRY_CONFIG } from "./retry.config.js";

import {
  getRetryAttempt,
  getNextRetryAttempt,
  getRetryDelay,
  getOriginalRoutingKey,
} from "./retry.js";

import {
  publishToRetryQueue,
} from "./retry.publisher.js";


export const processMessageWithRetry = async (
  channel,
  message,
  handler,
  {
    retryQueuePrefix,
  }
) => {

  try {

    /*
     * Parse event.
     */

    const event =
      JSON.parse(
        message.content.toString()
      );


    /*
     * Execute business logic.
     */

    await handler(event);


    /*
     * Successfully processed.
     */

    channel.ack(message);

  } catch (error) {

    /*
     * ========================================================
     * BUSINESS ERROR
     * ========================================================
     *
     * Business errors should not retry.
     */

    if (
      error instanceof BusinessError ||
      error?.isBusinessError
    ) {

      console.warn(
        `[RabbitMQ] Business failure: ${error.message}`
      );


      channel.ack(message);

      return;
    }


    /*
     * ========================================================
     * SYSTEM ERROR
     * ========================================================
     */

    console.error(
      "[RabbitMQ] System failure:",
      error
    );


    const currentAttempt =
      getRetryAttempt(message);


    const nextAttempt =
      getNextRetryAttempt(
        currentAttempt
      );


    /*
     * ========================================================
     * ORIGINAL ROUTING KEY
     * ========================================================
     *
     * For the original message:
     *
     * message.fields.routingKey
     *
     * For a retry message:
     *
     * x-original-routing-key
     */

    const originalRoutingKey =
      getOriginalRoutingKey(message) ||
      message.fields?.routingKey;


    if (!originalRoutingKey) {

      console.error(
        "[RabbitMQ] Missing original routing key. Sending to DLQ."
      );


      channel.nack(
        message,
        false,
        false
      );

      return;
    }


    /*
     * ========================================================
     * RETRY
     * ========================================================
     */

    if (
      nextAttempt <=
      RETRY_CONFIG.maxAttempts
    ) {

      const delay =
        getRetryDelay(nextAttempt);


      if (!delay) {

        console.error(
          `[RabbitMQ] No retry delay configured for attempt ${nextAttempt}. Sending to DLQ.`
        );


        channel.nack(
          message,
          false,
          false
        );

        return;
      }


      const retryQueue =
        `${retryQueuePrefix}.${delay}ms`;


      try {

        /*
         * Publish failed message
         * to retry queue.
         */

        await publishToRetryQueue(
          channel,

          message,

          nextAttempt,

          retryQueue,

          originalRoutingKey
        );


        /*
         * ACK original only after
         * retry publish is confirmed.
         */

        channel.ack(message);


        console.log(
          `[RabbitMQ] Retry ${nextAttempt}/${RETRY_CONFIG.maxAttempts} scheduled after ${delay}ms`
        );

      } catch (publishError) {

        console.error(
          "[RabbitMQ] Failed to publish retry:",
          publishError
        );


        /*
         * Retry publish failed.
         *
         * Keep original message.
         */

        channel.nack(
          message,
          false,
          true
        );
      }


      return;
    }


    /*
     * ========================================================
     * MAX RETRIES EXCEEDED
     * ========================================================
     */

    console.error(
      `[RabbitMQ] Maximum retries (${RETRY_CONFIG.maxAttempts}) exceeded. Sending to DLQ.`
    );


    /*
     * Main queue has:
     *
     * x-dead-letter-exchange
     *
     * RabbitMQ sends the message
     * to the service DLQ.
     */

    channel.nack(
      message,
      false,
      false
    );
  }
};