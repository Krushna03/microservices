import jwt from "jsonwebtoken";

import env from "../config/env.js";
import AppError from "../utils/AppError.js";

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Authentication required", 401);
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError("Invalid authorization header", 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.userId = decoded.sub;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Access token expired", 401));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid access token", 401));
    }

    next(error);
  }
};