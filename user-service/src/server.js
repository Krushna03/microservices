import app from "./app.js";
import env from "./config/env.js";
import logger from "./config/logger.js";

export const startServer = () => {
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 User Service is running on port ${env.PORT}`);
  });

  return server;
};