import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import { startConsumer } from "./messaging/consumer.js";
import { startOutboxWorker } from "./workers/outbox.worker.js";
import logger from "./config/logger.js";

const PORT = env.PORT || 3003;

const startServer = async () => {
  try {
    await connectDB();

    try {
      await startConsumer();
    } catch (rabbitErr) {
      logger.warn({ err: rabbitErr }, 
        "RabbitMQ connection failed. Inventory Service running with RabbitMQ offline");
    }

    startOutboxWorker();

    logger.info("Inventory Service outbox worker started");

    app.listen(PORT, () => {
      logger.info(`Inventory Service running on port ${PORT}`);
    });
  } 
  catch (error) {
    logger.fatal({ err: error }, "Failed to start Inventory Service");
    process.exit(1);
  }
};

startServer();