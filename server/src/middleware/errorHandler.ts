import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

interface ErrorWithStatus extends Error {
  status?: number;
  code?: number;
}

/**
 * Global error handling middleware
 * This centralizes error handling and provides consistent error responses
 */
export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  // Default error status and message
  let statusCode = err.status || 500;
  let message = err.message || "An unexpected error occurred";
  let errors: any = {};

  // Handle specific error types
  if (err instanceof mongoose.Error.ValidationError) {
    // Mongoose validation error
    statusCode = 400;
    message = "Validation failed";

    // Extract validation errors
    for (const field in err.errors) {
      errors[field] = err.errors[field].message;
    }
  } else if (err instanceof mongoose.Error.CastError) {
    // MongoDB casting error (e.g., invalid ObjectId)
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 400;
    message = "Duplicate key error";

    // Extract the duplicate field
    const field = Object.keys((err as any).keyValue)[0];
    errors[field] = `The ${field} already exists`;
  }

  // Send the error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(Object.keys(errors).length > 0 && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
