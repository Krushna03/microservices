import crypto from "crypto";
import logger from "../config/logger.js";

export const correlationIdMiddleware = (req, res, next) => {
  const incomingCorrelationId = req.correlationId || req.headers["x-correlation-id"];

  const correlationId = typeof incomingCorrelationId === "string" &&
    incomingCorrelationId.trim().length > 0
      ? incomingCorrelationId
      : crypto.randomUUID();

  req.correlationId = correlationId;

  res.setHeader("x-correlation-id", correlationId);

  logger.info({
      correlationId,
      method: req.method,
      path: req.originalUrl,
    },
    "Incoming request"
  );

  next();
};