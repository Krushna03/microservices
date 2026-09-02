import env from "./config/env.js";
import logger from "./config/logger.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { startServer } from "./server.js";

let server;

const bootstrap = async () => {
  try {
    logger.info("Starting User Service...");

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start HTTP server only after DB connection succeeds
    server = startServer();

  } catch (error) {
    logger.fatal(error, "Failed to start User Service");

    process.exit(1); 
  }
};

const gracefulShutdown = async (signal) => {
  try {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      logger.info("HTTP server closed");
    }

    // Close database connections
    await disconnectDB();

    process.exit(0);
  } catch (error) {
    logger.error(error, "Error during graceful shutdown");

    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

bootstrap();