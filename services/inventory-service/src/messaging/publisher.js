import { getChannel } from "./rabbitmq.js";

export const publishEvent = async (routingKeyOrObj, eventParam) => {
  const channel = getChannel();

  let routingKey;
  let event;

  if (typeof routingKeyOrObj === "object" && routingKeyOrObj !== null && routingKeyOrObj.routingKey) {
    routingKey = routingKeyOrObj.routingKey;
    event = routingKeyOrObj.event;
  } else {
    routingKey = routingKeyOrObj;
    event = eventParam;
  }

  return channel.publish(
    "writing.events",
    routingKey,
    Buffer.from(JSON.stringify(event)),
    {
      persistent: true,
      contentType: "application/json",
    }
  );
};
