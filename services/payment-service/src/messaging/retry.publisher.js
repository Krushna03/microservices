import { getRetryDelay } from "./retry.js";

// export const publishToRetryQueue = async (
//   channel,
//   message,
//   retryAttempt,
//   retryQueuePrefix
// ) => {
//   const delay = getRetryDelay(retryAttempt);

//   if (!delay) {
//     return false;
//   }

//   const retryQueue = `${ retryQueuePrefix }.${ delay } ms`;

//   const headers = {
//     ...(message.properties?.headers || {}),
//     "x-retry-attempt": retryAttempt,
//   };

//   channel.sendToQueue(retryQueue, message.content, {
//     persistent: true,
//     headers,
//   });

//   return true;
// };



export const publishToRetryQueue = async (
  channel,
  message,
  retryAttempt,
  retryQueue
) => {
  const headers = {
    ...(message.properties?.headers || {}),
    "x-retry-attempt": retryAttempt,
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

          resolve(true);
        }
      );
    }
  );
};
