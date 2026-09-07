import { RETRY_CONFIG } from "./retry.config.js";


export const setupRetryQueues = async (channel, {
    retryQueuePrefix,
    deadLetterQueue,
    deadLetterExchange,
    dlqRoutingKey,
  }
) => {

  /*
   * ============================================================
   * Retry Queues
   * ============================================================
   *
   * Messages stay here for the configured TTL.
   *
   * Example:
   *
   * payment-service.retry.1000ms
   * payment-service.retry.2000ms
   * payment-service.retry.4000ms
   */

  for (const delay of RETRY_CONFIG.delays) {

    const retryQueue = `${retryQueuePrefix}.${delay}ms`;

    await channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        "x-message-ttl": delay,
      },
    });
  }


  /*
   * ============================================================
   * Dead Letter Queue
   * ============================================================
   */

  await channel.assertQueue(deadLetterQueue, {
    durable: true,
  });


  /*
   * ============================================================
   * DLQ Binding
   * ============================================================
   *
   * Main Queue
   *     ↓
   * Dead Letter Exchange
   *     ↓
   * Service DLQ
   */

  if (deadLetterExchange && dlqRoutingKey) {

    await channel.bindQueue(
      deadLetterQueue,
      deadLetterExchange,
      dlqRoutingKey
    );
  }
};


/*
 * Get retry attempt from message headers.
 */
export const getRetryAttempt = (message) => {

  const headers = message.properties?.headers || {};

  return Number(headers["x-retry-attempt"] || 0);
};


/*
 * Calculate next retry attempt.
 */
export const getNextRetryAttempt = (currentAttempt) => {

  return currentAttempt + 1;
};


/*
 * Get configured delay for retry attempt.
 */
export const getRetryDelay = (attempt) => {

  const index = attempt - 1;

  return RETRY_CONFIG.delays[index] ?? null;
};


/*
 * Get original routing key.
 */

export const getOriginalRoutingKey = (message) => {

  const headers = message.properties?.headers || {};

  return headers["x-original-routing-key"] || null;
};