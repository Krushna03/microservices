import { getChannel } from "./rabbitmq.js";

export const publishEvent = async (routingKeyOrObj, eventParam) => {
  const channel = getChannel();

  let routingKey;
  let event;

  if (typeof routingKeyOrObj === "object" && routingKeyOrObj !== null && routingKeyOrObj.routingKey) {
    routingKey = routingKeyOrObj.routingKey;
    event = routingKeyOrObj.event;
  } 
  else {
    routingKey = routingKeyOrObj;
    event = eventParam;
  }

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
