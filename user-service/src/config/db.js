import mongoose from "mongoose";
import env from "./env.js";
import logger from "./logger.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);

    logger.info("MongoDB Connected Successfully");

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB Disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB Reconnected");
    });

    mongoose.connection.on("error", (error) => {
      logger.error(error, "MongoDB Connection Error");
    });

  } catch (error) {

    logger.fatal(error, "Unable to connect MongoDB");

    process.exit(1);

  }
};


export const disconnectDB = async () => {
  await mongoose.connection.close();

  logger.info("MongoDB connection closed");
};