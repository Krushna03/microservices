import express from "express";
import env from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();

app.use(express.json());

app.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Gateway is running",
  });
});

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/users", userRoutes);

app.use("/api/v1/orders", orderRoutes);

app.use("/api/v1/payments", paymentRoutes);

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});