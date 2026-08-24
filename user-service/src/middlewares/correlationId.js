import crypto from "crypto";

export const correlationId = (req, res, next) => {
  const incomingId = req.headers["x-correlation-id"];

  const id = incomingId || crypto.randomUUID();

  req.correlationId = id;

  res.setHeader("x-correlation-id", id);

  next();
};