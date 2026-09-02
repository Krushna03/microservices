import mongoose from "mongoose";
import env from "./env.js";

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Order Service MongoDB Connected Successfully");
  } catch (error) {
    console.error("Unable to connect MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
