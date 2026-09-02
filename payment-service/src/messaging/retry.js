import { RETRY_CONFIG } from "./retry.config.js";

export const setupRetryQueues = async (channel, {
    mainQueue,
    retryQueuePrefix,
    deadLetterQueue,
    retryRoutingKey,
    dlqRoutingKey,
    eventExchange,
    deadLetterExchange,
  }
) => {
  // Main Queue
  await channel.assertQueue(mainQueue, {
    durable: true,
  });

  // Retry Queues
  for (let index = 0; index < RETRY_CONFIG.delays.length; index++) {
    const delay = RETRY_CONFIG.delays[index];

    const retryQueue = `${ retryQueuePrefix }.${ delay } ms`;

    await channel.assertQueue(retryQueue, {
        durable: true,

        arguments: {
          // Wait before retrying.
          "x-message-ttl": delay,

          // After TTL expires, send the
          // message back to the main exchange.
          "x-dead-letter-exchange": eventExchange,

          "x-dead-letter-routing-key": retryRoutingKey,
        },
      }
    );
  }

  // Dead Letter Queue
  await channel.assertQueue(deadLetterQueue, {
      durable: true,
  });

  await channel.bindQueue(deadLetterQueue, deadLetterExchange, dlqRoutingKey);
};


// Get the retry attempt from RabbitMQ message header
export const getRetryAttempt = (message) => {
  const headers = message.properties?.headers || {};

  return Number(headers["x-retry-attempt"] || 0);
};


// Calculate the next retry attempt.
export const getNextRetryAttempt = (currentAttempt) => {
  return currentAttempt + 1;
};


// Get retry delay.
export const getRetryDelay = (attempt) => {
  const index = attempt - 1;

  return RETRY_CONFIG.delays[index] ?? null;
};
