import { RETRY_CONFIG } from "./retry.config.js";


export const setupRetryQueues = async (
  channel,
  {
    retryQueuePrefix,
    deadLetterQueue,
    deadLetterExchange,
    dlqRoutingKey,
  }
) => {

  /*
   * ============================================================
   * Retry Exchange & Dispatch Queue
   * ============================================================
   *
   * When message TTL expires in any of the retry delay queues,
   * RabbitMQ automatically dead-letters the expired message to
   * this exchange, which places it into the single dispatch queue.
   */

  const retryDlx = `${retryQueuePrefix}.dlx`;
  const dispatchQueue = `${retryQueuePrefix}.dispatch`;
  const retryReadyRoutingKey = "retry.ready";

  await channel.assertExchange(retryDlx, "direct", {
    durable: true,
  });

  await channel.assertQueue(dispatchQueue, {
    durable: true,
  });

  await channel.bindQueue(
    dispatchQueue,
    retryDlx,
    retryReadyRoutingKey
  );


  /*
   * ============================================================
   * Retry Delay Queues (NO ACTIVE CONSUMERS!)
   * ============================================================
   *
   * Messages stay here unconsumed for the full configured TTL.
   * Because NO consumer listens on these delay queues, RabbitMQ
   * guarantees the message waits the full delay before dead-lettering.
   *
   * Example:
   * order-service.retry.1000ms  (TTL: 1000ms)
   * order-service.retry.2000ms  (TTL: 2000ms)
   * order-service.retry.4000ms  (TTL: 4000ms)
   * order-service.retry.8000ms  (TTL: 8000ms)
   * order-service.retry.16000ms (TTL: 16000ms)
   */

  for (const delay of RETRY_CONFIG.delays) {

    const retryQueue = `${retryQueuePrefix}.${delay}ms`;

    await channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        "x-message-ttl": delay,
        "x-dead-letter-exchange": retryDlx,
        "x-dead-letter-routing-key": retryReadyRoutingKey,
      },
    });
  }


  /*
   * ============================================================
   * Dead Letter Queue (DLQ)
   * ============================================================
   *
   * Messages that exceed max retry attempts or fail with unrecoverable
   * system errors are routed here from the main queue DLX.
   */

  await channel.assertQueue(deadLetterQueue, {
    durable: true,
  });


  /*
   * ============================================================
   * DLQ Binding
   * ============================================================
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