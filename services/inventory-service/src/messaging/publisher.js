import { getChannel } from "./rabbitmq.js";

export const publishEvent = async ({
  routingKey,
  event,
}) => {
  const channel = getChannel();

  return new Promise((resolve, reject) => {
    channel.publish(
      "writing.events",
      routingKey,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true,
        contentType: "application/json",
      },
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