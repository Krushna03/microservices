import mongoose from "mongoose";
import env from "./env.js";
import logger from "./logger.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);

    logger.info({ host: conn.connection.host }, "MongoDB Connected");
  }
  catch (error) {
    logger.error({ err: error }, "MongoDB Connection Error");

    process.exit(1);
  }
};

export default connectDB;
