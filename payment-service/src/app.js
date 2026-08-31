import express from "express";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();

app.use(express.json());

app.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Payment Service is running",
  });
});

app.use("/api/v1/payments", paymentRoutes);

export default app;
