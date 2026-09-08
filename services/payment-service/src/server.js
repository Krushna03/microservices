import { startOutboxWorker } from "./workers/outbox.worker.js";
import { startConsumer } from "./messaging/consumer.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import logger from "./config/logger.js";

const PORT = env.PORT || 3004;

const startServer = async () => {
  try {
    await connectDB();

    try {
      await startConsumer();
    }
    catch (rabbitErr) {
      logger.warn({ err: rabbitErr.message}, "RabbitMQ Connection Failed. Payment service running with RabbitMQ offline.");
    }

    startOutboxWorker();

    logger.info("Payment Service outbox worker started");

    app.listen(PORT, () => {
      logger.info({ PORT }, "Payment Service running");
    });

  }
  catch (error) {
    logger.fatal({ err: error }, "Failed to start Payment Service");
    process.exit(1);
  }
};

startServer();
