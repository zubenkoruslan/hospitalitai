// Custom error class to handle operational errors (e.g., user input, not found)
// Allows attaching a status code and marking errors as operational
import { Request, Response, NextFunction } from "express";

class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message); // Call parent constructor (Error)

    this.statusCode = statusCode;
    // Determine status based on statusCode (fail for 4xx, error for 5xx)
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    // Mark as operational (errors we expect and handle gracefully)
    this.isOperational = true;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handling middleware (to be used in app.ts)
// This is a basic structure; enhance as needed (e.g., different handling for dev/prod)
const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default to 500 if status code or operational flag isn't set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log the error (especially non-operational ones)
  console.error("ERROR \u{1F525}:", err);

  // Send response to client
  // For operational errors, send a user-friendly message
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // For programming or unknown errors, don't leak details
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

export { AppError, globalErrorHandler };
