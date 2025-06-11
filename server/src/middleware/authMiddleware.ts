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

// Fetch JWT_SECRET from environment variables.
// Reverting to include a default fallback for development/testing if not set.
// WARNING: This default key is insecure and should NOT be used in production.
// Ensure a strong, unique JWT_SECRET is set in your production environment variables.
const JWT_SECRET = process.env.JWT_SECRET || "your_very_secret_key_change_me";

// Validate JWT_SECRET during application startup (or at least before first use).
// This is a conceptual check. Ideally, this check happens once when the app starts.
// For middleware, we ensure it's checked before use within the function.

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
    // If JWT_SECRET is undefined (e.g. process.env.JWT_SECRET was explicitly set to empty string and no fallback existed)
    // or if it's the default insecure key, jwt.verify will proceed.
    // Security depends on the strength of the actual JWT_SECRET used.
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    // Attach user payload to the request object (excluding sensitive parts if necessary)
    // For this use case, we need the full payload
    req.user = decoded;

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Token verification failed:", error);
    // Make sure not to include the error details in the response to the client for security.
    let message = "Not authorized, token failed";
    if (error instanceof jwt.TokenExpiredError) {
      message = "Not authorized, token expired";
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Catches malformed tokens, invalid signatures etc.
      message = "Not authorized, token invalid";
    }
    res.status(401).json({ message });
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

/**
 * Middleware to ensure only admin users can access the route.
 */
export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({
        message: "Admin access required for this resource",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error in admin authentication" });
  }
};

/**
 * Middleware to allow restaurant owners or admin users.
 */
export const restaurantOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (req.user.role !== "restaurant" && req.user.role !== "admin") {
      res.status(403).json({
        message: "Restaurant or admin access required",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error in authentication" });
  }
};
