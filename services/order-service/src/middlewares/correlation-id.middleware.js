import crypto from "crypto";

export const correlationIdMiddleware = (req, res, next) => {
  const incomingCorrelationId = req.correlationId || req.headers["x-correlation-id"];

  const correlationId = typeof incomingCorrelationId === "string" &&
    incomingCorrelationId.trim().length > 0
      ? incomingCorrelationId
      : crypto.randomUUID();

  req.correlationId = correlationId;

  res.setHeader("x-correlation-id", correlationId);

  next();
};