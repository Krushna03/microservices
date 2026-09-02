import AppError from "../utils/AppError.js";

export const userIdentity = (req, res, next) => {
  const userId = req.headers["x-user-id"] || req.body?.userId;

  if (!userId) {
    return next(
      new AppError("User identity missing", 401)
    );
  }

  req.userId = userId;

  next();
};