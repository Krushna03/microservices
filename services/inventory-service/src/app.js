import express from "express";
import inventoryRoutes from "./routes/inventory.routes.js";
import { correlationIdMiddleware } from "./middleware/correlation-id.middleware.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

// Correlation ID 
app.use(correlationIdMiddleware);

// Health check
app.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory service is running",
  });
});

// Inventory routes
app.use("/internal/inventory", inventoryRoutes);

// Error handler
app.use(errorHandler);

export default app;