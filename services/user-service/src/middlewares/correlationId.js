import crypto from "crypto";

export const correlationId = (req, res, next) => {
  const incomingId = req.headers["x-correlation-id"];

  const isValidCorrelationId =
    typeof incomingId === "string" &&
    incomingId.length <= 100 &&
    /^[a-zA-Z0-9._:-]+$/.test(incomingId);

  const id = isValidCorrelationId ? incomingId : crypto.randomUUID();

  req.correlationId = id;

  res.setHeader("x-correlation-id", id);

  next();
};
