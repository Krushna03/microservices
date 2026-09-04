import { RETRY_CONFIG } from "./retry.config.js";

export const setupRetryQueues = async (channel,
  {
    retryQueuePrefix,
    deadLetterQueue
  }
) => {

  // Retry Queues
  for (const delay of RETRY_CONFIG.delays) {

    const retryQueue = `${retryQueuePrefix}.${delay}ms`;

    await channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        // Wait before retrying.
        "x-message-ttl": delay,

        // After TTL expires, send the
        // message back to the main exchange.
        // Send expired message to the main exchange.
        // We will preserve the original routing key in the message headers.
        // "x-dead-letter-exchange": "writing.events",

        // Route it back to the original event.
        // "x-dead-letter-routing-key": retryRoutingKey,
      },
    });
  }

  // Dead Letter Queue
  await channel.assertQueue(deadLetterQueue, {
    durable: true,
  });

  // Bind DLQ to dead-letter exchange
  // await channel.bindQueue(deadLetterQueue, deadLetterExchange, dlqRoutingKey);
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


// Get the original routing key from RabbitMQ message header
export const getOriginalRoutingKey = (message) => {
  const headers = message.properties?.headers || {};

  return headers["x-original-routing-key"] || null;
};