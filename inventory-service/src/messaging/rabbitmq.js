import amqp from "amqplib";
import env from "../config/env.js";

let connection;
let channel;

export const connectRabbitMQ = async () => {
  if (channel) return channel;

  connection = await amqp.connect(env.RABBITMQ_URL);

  channel = await connection.createChannel();

  await setupExchange();

  console.log("Inventory Service RabbitMQ Connected Successfully");
  
  return channel;
};

export const getChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ channel not connected in Inventory Service");
  }
  return channel;
};

export const setupExchange = async () => {
  const ch = getChannel();

  await ch.assertExchange("writing.events", "topic", {
    durable: true,
  });

  await ch.assertExchange("writing.events.dlx", "topic", {
    durable: true,
  });
};
