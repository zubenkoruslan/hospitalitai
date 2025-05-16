import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/errorHandler";

/**
 * Global error handling middleware
 * This centralizes error handling and provides consistent error responses
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Condition to skip logging for the specific "No progress found" 404 error
  const isNoProgressError =
    err instanceof AppError &&
    err.statusCode === 404 &&
    err.message === "No progress found for this staff and quiz.";

  if (!isNoProgressError) {
    // Log all other errors
    console.error("ERROR STACK: ", err.stack);
    console.error("ERROR MESSAGE: ", err.message);
    console.error("ERROR FULL: ", err);
  }

  let statusCode: number;
  let message: string;
  let errors: any = {};

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    for (const field in err.errors) {
      errors[field] = err.errors[field].message;
    }
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered for: ${field}. Please use another value.`;
    errors[field] = `A record with that ${field} already exists.`;
  } else {
    statusCode = 500;
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode >= 500 ? "error" : "fail",
    message,
    ...(Object.keys(errors).length > 0 && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
