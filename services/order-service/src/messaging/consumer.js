import { connectRabbitMQ } from "./rabbitmq.js";

import {
  handlePaymentSucceeded,
  handleInventoryReleased,
  handleInventoryReservationFailed,
} from "./payment.handlers.js";

import {
  setupRetryQueues,
} from "../../../../shared/rabbitmq/retry.js";

import {
  processMessageWithRetry,
} from "../../../../shared/rabbitmq/message.processor.js";

import {
  startRetryDispatcher,
} from "../../../../shared/rabbitmq/retry.dispatcher.js";

export const startConsumer = async () => {

  const channel =
    await connectRabbitMQ();


  /*
   * Main Exchange
   */

  await channel.assertExchange(
    "writing.events",
    "topic",
    {
      durable: true,
    }
  );


  /*
   * Dead Letter Exchange
   */

  await channel.assertExchange(
    "writing.events.dlx",
    "topic",
    {
      durable: true,
    }
  );


  /*
   * Main Queue
   */

  const queue =
    await channel.assertQueue(
      "order-service",
      {
        durable: true,

        arguments: {
          "x-dead-letter-exchange":
            "writing.events.dlx",

          "x-dead-letter-routing-key":
            "order.processing.failed",
        },
      }
    );


  /*
   * Bind Events
   */

  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "payment.succeeded"
  );


  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "inventory.released"
  );


  await channel.bindQueue(
    queue.queue,
    "writing.events",
    "inventory.reservation_failed"
  );


  /*
   * Retry Queues + DLQ
   */

  await setupRetryQueues(
    channel,
    {
      retryQueuePrefix:
        "order-service.retry",

      deadLetterQueue:
        "order-service.dlq",

      deadLetterExchange:
        "writing.events.dlx",

      dlqRoutingKey:
        "order.processing.failed",
    }
  );


  /*
   * Retry Dispatcher
   */

  await startRetryDispatcher(
    channel,
    {
      retryQueuePrefix:
        "order-service.retry",

      eventExchange:
        "writing.events",
    }
  );


  /*
   * Backpressure
   */

  await channel.prefetch(10);


  /*
   * Main Consumer
   */

  await channel.consume(
    queue.queue,

    async (message) => {

      if (!message) return;


      const routingKey =
        message.fields?.routingKey;


      console.log(
        `[Order Service] Event received: ${routingKey}`
      );


      let handler;


      if (
        routingKey ===
        "payment.succeeded"
      ) {

        handler =
          handlePaymentSucceeded;

      } else if (
        routingKey ===
        "inventory.released"
      ) {

        handler =
          handleInventoryReleased;

      } else if (
        routingKey ===
        "inventory.reservation_failed"
      ) {

        handler =
          handleInventoryReservationFailed;
      }


      /*
       * Unknown Event
       */

      if (!handler) {

        console.warn(
          `[Order Service] Unknown routing key: ${routingKey}`
        );


        channel.nack(
          message,
          false,
          false
        );

        return;
      }


      /*
       * Process with retry.
       */

      await processMessageWithRetry(
        channel,
        message,
        handler,
        {
          retryQueuePrefix:
            "order-service.retry",
        }
      );
    }
  );


  console.log(
    "[Order Service] Consumer started."
  );
};