import { AppError } from "../utils/appError.js";

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
}

export function errorHandler(error, _req, res, _next) {
  if (error.name === "CastError") {
    error = new AppError(`Invalid ${error.path}: ${error.value}`, 400);
  }

  if (error.name === "ValidationError") {
    error = new AppError(error.message, 400);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || "value";
    error = new AppError(`${field} already exists`, 409);
  }

  const statusCode = error.statusCode || 500;
  const message =
    error.isOperational || error instanceof AppError
      ? error.message
      : "Internal server error";

  if (!(error.isOperational || error instanceof AppError)) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null,
  });
}
