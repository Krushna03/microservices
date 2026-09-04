export const RABBITMQ_CONFIG = {
  exchange: "writing.events",

  deadLetterExchange: "writing.events.dlx",

  queue: "payment-service",

  routingKeys: [
    "inventory.reserved",
  ],

  retryQueuePrefix: "payment-service.retry",

  dlq: "payment-service.dlq",

  dlqRoutingKey: "payment.processing.failed",
};