import amqp from "amqplib";
import env from "../config/env.js";

let connection;
let channel;

export const connectRabbitMQ = async () => {
  if (channel) return channel;

  connection = await amqp.connect(env.RABBITMQ_URL);
  channel = await connection.createChannel();

  await setupExchange();

  console.log("Order Service RabbitMQ Connected Successfully");
  return channel;
};

export const getChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ not connected");
  }

  return channel;
};

// Topic Exchange
// This is the best exchange for event-driven microservices.
// It allows you to route messages based on routing keys.
export const setupExchange = async () => {
  const channel = getChannel();

  await channel.assertExchange(
    "writing.events",
    "topic",
    {
      durable: true,
    }
  );
};
// 6. Why Topic Exchange ?
// Because routing keys allow us to categorize events.

// For example:

// order.created
// order.confirmed
// order.cancelled

// inventory.reserved
// inventory.failed

// payment.completed
// payment.failed

// Then consumers can subscribe to the events they care about.
// For example:

// Inventory Service
// → order.created

// while:
// Notification Service
// → order.created
// → order.confirmed
// → order.cancelled

// This keeps producers and consumers loosely coupled.