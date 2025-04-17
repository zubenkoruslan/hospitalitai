import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your_very_secret_key_change_me";

// Extend Express Request interface to include user payload
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    restaurantId?: string;
  };
}

// Define the structure of the JWT payload
interface JwtPayload {
  userId: string; // Should match the type used in User model (_id)
  role: string; // Or specific 'restaurant' | 'staff'
  restaurantId?: string; // Should match the type used in User model (_id)
  iat?: number;
  exp?: number;
}

/**
 * Middleware to authenticate JWT token.
 * Verifies the token from the Authorization header and attaches user info to req.user.
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (token == null) {
    // No token provided
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      // Token might be expired or invalid
      return res
        .status(403)
        .json({ message: "Forbidden: Invalid or expired token" });
    }

    // Check if payload is of the expected type
    const decodedPayload = payload as JwtPayload;
    if (
      !decodedPayload ||
      typeof decodedPayload !== "object" ||
      !decodedPayload.userId ||
      !decodedPayload.role
    ) {
      console.error("Invalid JWT payload structure:", payload);
      return res
        .status(403)
        .json({ message: "Forbidden: Invalid token payload" });
    }

    // Attach user information to the request object
    req.user = {
      userId: decodedPayload.userId,
      role: decodedPayload.role,
      restaurantId: decodedPayload.restaurantId,
    };

    next(); // Proceed to the next middleware or route handler
  });
};

/**
 * Middleware factory to authorize based on user roles.
 * Takes an array of allowed roles.
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.role) {
      // This should ideally not happen if authenticateToken runs first
      res.status(403).json({ message: "Forbidden: User role not found" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json({
          message: `Forbidden: Access denied for role \'${req.user.role}\'`,
        });
      return;
    }

    next(); // Role is authorized, proceed
  };
};
