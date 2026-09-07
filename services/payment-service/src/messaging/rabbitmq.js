import env from "../config/env.js";
import {
  connectRabbitMQ as connectSharedRabbitMQ,
  getChannel as getSharedChannel,
} from "../../../../shared/rabbitmq/rabbitmq.js";


export const connectRabbitMQ = async () => {
  return connectSharedRabbitMQ(env.RABBITMQ_URL);
};


export const getChannel = () => {
  return getSharedChannel();
};