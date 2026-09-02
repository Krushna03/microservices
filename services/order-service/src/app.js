import express from "express";
import orderRoutes from "./routes/order.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());

// Health check
app.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Order service is running",
  });
});

app.use("/api/v1/orders", orderRoutes);

app.use(errorHandler);

export default app;