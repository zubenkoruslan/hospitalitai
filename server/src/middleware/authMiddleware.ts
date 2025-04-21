import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Define the shape of the JWT payload (ensure it matches what you put in during sign)
interface AuthPayload {
  userId: mongoose.Types.ObjectId;
  role: string;
  name: string;
  restaurantId?: mongoose.Types.ObjectId;
  restaurantName?: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request interface to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "your_very_secret_key_change_me";

/**
 * Middleware to authenticate JWT token.
 * Verifies the token from the Authorization header and attaches user info to req.user.
 */
export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else {
    res.status(401).json({ message: "Not authorized, no token provided" });
    return;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    // Attach user payload to the request object (excluding sensitive parts if necessary)
    // For this use case, we need the full payload
    req.user = decoded;

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

/**
 * Middleware factory to authorize based on user roles.
 * Takes an array of allowed roles.
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: "You do not have permission to perform this action",
      });
      return;
    }
    next();
  };
};
