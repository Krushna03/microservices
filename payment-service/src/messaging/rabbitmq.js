import amqp from "amqplib";
import env from "../config/env.js";

let connection;
let channel;

export const connectRabbitMQ = async () => {
  if (channel) return channel;

  connection = await amqp.connect(env.RABBITMQ_URL);


  channel = await connection.createChannel();

  await channel.assertExchange(
    "writing.events",
    "topic",
    {
      durable: true,
    }
  );

  await channel.assertExchange(
    "writing.events.dlx",
    "topic",
    {
      durable: true,
    }
  );

  console.log("RabbitMQ connected");

  return channel;
};


export const getChannel = () => {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel is not initialized"
    );
  }

  return channel;
};