import AppError from "../utils/AppError.js";
import env from "../config/env.js";

export const internalServiceAuth = (req, res, next) => {
  const token = req.headers["x-internal-service-token"];

  if (!token || token !== env.INTERNAL_SERVICE_TOKEN) {
    return next(new AppError(
        "Invalid internal service credentials",
        401
      )
    );
  }

  next();
};