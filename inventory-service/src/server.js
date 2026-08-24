import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import { startConsumer } from "./messaging/consumer.js";

const PORT = env.PORT || 3003;

const startServer = async () => {
  try {
    await connectDB();

    await startConsumer();

    app.listen(PORT, () => {
      console.log(`Inventory Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Inventory Service", error);
    process.exit(1);
  }
};

startServer();