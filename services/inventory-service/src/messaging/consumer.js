import { connectRabbitMQ } from "./rabbitmq.js";

import {
  reserveInventory,
  processPaymentFailed,
} from "../services/inventory.service.js";

import {
  setupRetryQueues,
} from "../../../../shared/rabbitmq/retry.js";

import {
  processMessageWithRetry,
} from "../../../../shared/rabbitmq/message.processor.js";

import {
  startRetryDispatcher,
} from "../../../../shared/rabbitmq/retry.dispatcher.js";

import {
  RABBITMQ_CONFIG,
} from "./rabbitmq.config.js";
import logger from "../config/logger.js";

export const startConsumer = async () => {

  const channel =
    await connectRabbitMQ();


  /*
   * Main Exchange
   */

  await channel.assertExchange(
    RABBITMQ_CONFIG.exchange,
    "topic",
    {
      durable: true,
    }
  );


  /*
   * Dead Letter Exchange
   */

  await channel.assertExchange(
    RABBITMQ_CONFIG.deadLetterExchange,
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
      RABBITMQ_CONFIG.queue,
      {
        durable: true,

        arguments: {
          "x-dead-letter-exchange":
            RABBITMQ_CONFIG.deadLetterExchange,

          "x-dead-letter-routing-key":
            RABBITMQ_CONFIG.dlqRoutingKey,
        },
      }
    );


  /*
   * Bind Events
   */

  for (
    const routingKey
    of RABBITMQ_CONFIG.routingKeys
  ) {

    await channel.bindQueue(
      queue.queue,
      RABBITMQ_CONFIG.exchange,
      routingKey
    );
  }


  /*
   * Retry Queues + DLQ
   */

  await setupRetryQueues(
    channel,
    {
      retryQueuePrefix:
        RABBITMQ_CONFIG.retryQueuePrefix,

      deadLetterQueue:
        RABBITMQ_CONFIG.dlq,

      deadLetterExchange:
        RABBITMQ_CONFIG.deadLetterExchange,

      dlqRoutingKey:
        RABBITMQ_CONFIG.dlqRoutingKey,
    }
  );


  /*
   * Retry Dispatcher
   */

  await startRetryDispatcher(
    channel,
    {
      retryQueuePrefix:
        RABBITMQ_CONFIG.retryQueuePrefix,

      eventExchange:
        RABBITMQ_CONFIG.exchange,
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

      logger.info(
        { routingKey },
        "Inventory Service event received"
      );

      if (
        routingKey ===
        "order.created"
      ) {

        await processMessageWithRetry(
          channel,
          message,
          reserveInventory,
          {
            retryQueuePrefix:
              RABBITMQ_CONFIG.retryQueuePrefix,
          }
        );

        return;
      }


      if (
        routingKey ===
        "payment.failed"
      ) {

        await processMessageWithRetry(
          channel,
          message,
          processPaymentFailed,
          {
            retryQueuePrefix:
              RABBITMQ_CONFIG.retryQueuePrefix,
          }
        );

        return;
      }


      /*
       * Unknown Event
       */

      logger.warn( 
        { routingKey }, 
        "Inventory Service received unknown routing key" 
      );

      channel.nack(
        message,
        false,
        false
      );
    }
  );


  logger.info( 
    { queue: RABBITMQ_CONFIG.queue, },
    "Inventory Service consumer started" 
  );
};