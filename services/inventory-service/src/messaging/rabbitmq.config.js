export const RABBITMQ_CONFIG = {
  exchange: "writing.events",

  deadLetterExchange: "writing.events.dlx",

  queue: "inventory-service",

  routingKeys: ["order.created", "payment.failed"],

  retryQueuePrefix: "inventory-service.retry",

  dlq: "inventory-service.dlq",

  dlqRoutingKey: "inventory.processing.failed",
};