import logger from "../config/logger.js";

export const errorHandler = (error, req, res, next) => {
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
    },
    "Request failed"
  );

  // MongoDB duplicate key
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "User with this email already exists",
    });
  }
  
  // Operational/application error
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Unexpected error
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};