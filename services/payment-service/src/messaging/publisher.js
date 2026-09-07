import { getChannel } from "./rabbitmq.js";


export const publishEvent = async ({routingKey, event}) => {

  const channel = getChannel();

  const message = Buffer.from(JSON.stringify(event));

  return new Promise((resolve, reject) => {

    channel.publish(
      "writing.events",
      routingKey,
      message,
      {
        persistent: true,
        contentType: "application/json",
      },

      // Publisher Confirm callback.
      // RabbitMQ calls this after confirming whether the message was accepted.
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      }
    );
  });
};