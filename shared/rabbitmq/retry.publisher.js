
export const publishToRetryQueue = async (
  channel,
  message,
  retryAttempt,
  retryQueue,
  originalRoutingKey
) => {
  const headers = {
    ...(message.properties?.headers || {}),
    "x-retry-attempt": retryAttempt,
    "x-original-routing-key": originalRoutingKey,
  };

  return new Promise((resolve, reject) => {
    channel.sendToQueue(retryQueue, message.content,
      {
        persistent: true,
        headers,
        contentType: message.properties?.contentType,
        contentEncoding: message.properties?.contentEncoding,
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
  });
};


export const publishToExchange = async (channel, exchange, routingKey, message) => {

  const headers = { ...channel(message.properties?.headers || {}) }

  return new Promise((resolve, reject) => {
    channel.publish(exchange, routingKey, message.content,
      {
        persistent: true,
        headers,
        contentType: message.properties?.contentType,
        contentEncoding: message.properties?.contentEncoding,
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
  })
}