import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

import env from "./config/env.js";
import userRoutes from "./modules/user/routes/user.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { correlationId } from "./middlewares/correlationId.js";
import authRoutes from "./modules/user/routes/auth.routes.js";
import internalRoutes from "./modules/user/routes/internal.routes.js";

const app = express();

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Compression
app.use(compression());

// Body Parser
app.use(express.json());

// Health Check
app.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    message: "User Service is running",
  });
});

app.use(correlationId);

// Auth routes
app.use("/api/v1/auth", authRoutes);

// User routes
app.use("/api/v1/users", userRoutes);

// Internal routes
app.use("/internal/users", internalRoutes);
app.use("/api/v1/internal/users", internalRoutes);

// Error middleware
app.use(errorHandler);

export default app;