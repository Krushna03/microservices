import crypto from "crypto";

export const correlationIdMiddleware = (req, res, next) => {
  const incomingCorrelationId = req.correlationId || req.headers["x-correlation-id"];

  const isValidCorrelationId = typeof incomingCorrelationId === "string" && incomingCorrelationId.length <= 100 && /^[a-zA-Z0-9._:-]+$/.test(incomingCorrelationId);

  const correlationId = isValidCorrelationId ? incomingCorrelationId : crypto.randomUUID();

  req.correlationId = correlationId;

  res.setHeader("x-correlation-id", correlationId);

  next();
};