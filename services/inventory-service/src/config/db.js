import mongoose from "mongoose";
import env from "./env.js";
import logger from "./logger.js";

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    
    logger.info("Inventory Service MongoDB Connected Successfully");
  } 
  catch (error) {
    logger.fatal({ err: error }, "Unable to connect MongoDB");
    
    process.exit(1);
  }
};

export default connectDB;
