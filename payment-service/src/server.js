import { processOutbox } from "./workers/outbox.worker.js";
import { startConsumer } from "./messaging/consumer.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";

const PORT = env.PORT || 3004;

const startServer = async () => {
  try {
    await connectDB();

    try {
      await startConsumer();
    } catch (rabbitErr) {
      console.warn("RabbitMQ Connection Failed:", rabbitErr.message);
      console.warn("Payment Service running (RabbitMQ offline)");
    }

    setInterval(processOutbox, 3000);

    app.listen(PORT, () => {
      console.log(`Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Payment Service", error);
    process.exit(1);
  }
};

startServer();
