import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";
import { startConsumer } from "./messaging/consumer.js";
import { startOutboxWorker } from "./workers/outbox.worker.js";
import logger from "./config/logger.js";

const PORT = process.env.PORT || 3002;

const startServer = async () => {
  try {
    await connectDB();

    try {
      await startConsumer();
    } catch (rabbitErr) {
      logger.warn({ err: rabbitErr },
        "RabbitMQ connection failed. Order Service running with RabbitMQ offline"
      );
    }

    startOutboxWorker();

    app.listen(PORT, () => {
      logger.info(`Order Service running on port ${PORT}`);
    });

  } 
  catch (error) {
    logger.fatal({ err: error },
      "Failed to start Order Service"
    );
    process.exit(1);
  }
};

startServer();