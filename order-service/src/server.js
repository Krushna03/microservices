import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3002;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Order Service running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start Order Service",
      error
    );

    process.exit(1);
  }
};

startServer();