import express from "express";
import inventoryRoutes from "./routes/inventory.routes.js";

const app = express();

app.use(express.json());

// Health check
app.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory service is running",
  });
});

app.use("/internal/inventory", inventoryRoutes);

export default app;