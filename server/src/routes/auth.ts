import express, { Request, Response, Router, NextFunction } from "express";
// import bcrypt as _bcrypt from "bcryptjs"; // Removing bcrypt import
import jwt from "jsonwebtoken";
// import { default as _User, IUser } from "../models/User"; // Removing default User import, keeping IUser
import { IUser } from "../models/User";
// import { default as _Restaurant, IRestaurant } from "../models/Restaurant"; // Removing default Restaurant import, keeping IRestaurant
import { IRestaurant } from "../models/Restaurant";
// import mongoose, { Types as _Types } from "mongoose"; // Removing Types import, keeping mongoose default
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware";
// import notificationService from "../services/notificationService"; // Removed - Service deleted
import AuthService from "../services/authService";
import {
  validateSignupRequest,
  handleValidationErrors,
  validateLoginRequest,
} from "../middleware/validationMiddleware";
import { AppError } from "../utils/errorHandler";
import { AuthPayload, SignupData } from "../types/authTypes"; // Added import

const router: Router = express.Router();

// --- Configuration (Move to environment variables in a real app) ---
const JWT_SECRET = process.env.JWT_SECRET || "your_very_secret_key_change_me"; // Use environment variable!
if (JWT_SECRET === "your_very_secret_key_change_me") {
  console.warn(
    "WARNING: Using default JWT_SECRET. Please set a strong secret in environment variables."
  );
}
// Expect expiration time in seconds directly from env var
const JWT_EXPIRES_IN_SECONDS_STR =
  process.env.JWT_EXPIRES_IN_SECONDS || "86400"; // Default to 1 day (in seconds)
let JWT_EXPIRES_IN_SECONDS: number;
try {
  JWT_EXPIRES_IN_SECONDS = parseInt(JWT_EXPIRES_IN_SECONDS_STR, 10);
  if (isNaN(JWT_EXPIRES_IN_SECONDS)) {
    console.warn(
      `Invalid JWT_EXPIRES_IN_SECONDS value: "${JWT_EXPIRES_IN_SECONDS_STR}". Using default 86400 seconds.`
    );
    JWT_EXPIRES_IN_SECONDS = 86400;
  }
} catch (e) {
  console.warn(
    `Error parsing JWT_EXPIRES_IN_SECONDS. Using default 86400 seconds.`,
    e
  );
  JWT_EXPIRES_IN_SECONDS = 86400;
}
// ------------------------------------------------------------------

// Removed local AuthPayload interface
// Removed local SignupData interface

// --- Routes ---

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (Restaurant or Staff)
 * @access  Public
 */
router.post(
  "/signup",
  validateSignupRequest,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const signupData = req.body as SignupData; // Added type assertion

    try {
      // 1. Check if user already exists - REMOVED (handled by AuthService within transaction)
      // const existingUser = await User.findOne({ email: signupData.email });
      // if (existingUser) {
      //   throw new AppError("User with this email already exists", 409);
      // }

      let userResultData: IUser; // More specific type
      let restaurantResultData: IRestaurant | null = null; // More specific type
      let restaurantNameForJwt: string | undefined;

      // 2. Call appropriate AuthService method based on role
      if (signupData.role === "restaurant") {
        const { user, restaurant } = await AuthService.registerOwner(
          signupData
        );
        userResultData = user;
        restaurantResultData = restaurant;
        restaurantNameForJwt = restaurantResultData.name;
      } else if (signupData.role === "staff") {
        // Destructure restaurantName from the service response
        const { user, restaurantName } = await AuthService.registerStaff(
          signupData
        );
        userResultData = user;
        restaurantNameForJwt = restaurantName; // Use directly from service
        // Removed extra DB call for restaurant name
      } else {
        // Validation middleware should catch this, but handle defensively
        throw new AppError("Invalid user role specified", 400);
      }

      // 3. Prepare response (user data excluding password)
      // The toObject() and spread for password exclusion can be done here if service returns Mongoose doc
      const { password: _, ...userResponse } = userResultData.toObject
        ? userResultData.toObject()
        : userResultData;

      // 4. Generate JWT token
      const payload: AuthPayload = {
        userId: userResultData._id as mongoose.Types.ObjectId,
        role: userResultData.role,
        name: userResultData.name,
        restaurantId: userResultData.restaurantId,
        restaurantName: restaurantNameForJwt,
        professionalRole: userResultData.professionalRole,
      };
      const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS };
      const token = jwt.sign(payload, JWT_SECRET, options);

      // 5. Send success response
      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        restaurant: restaurantResultData,
        token,
      });
    } catch (error: any) {
      // Log original error for debugging (service methods also log)
      console.error("Error in /signup route handler:", error.message);
      // Pass error to the global error handler
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post(
  "/login",
  validateLoginRequest,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    try {
      // Call AuthService to validate credentials and get user data
      const { user, restaurantName } = await AuthService.loginUser(
        email,
        password
      );

      // Create JWT payload
      const payload: AuthPayload = {
        userId: user._id as mongoose.Types.ObjectId,
        role: user.role,
        name: user.name,
        restaurantId: user.restaurantId,
        restaurantName: restaurantName,
        professionalRole: user.professionalRole,
      };

      // Sign the token
      const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS };
      const token = jwt.sign(payload, JWT_SECRET, options);

      // Send token and user data back to client
      res.status(200).json({ token, user }); // user object already excludes password
    } catch (error) {
      // AuthService throws AppError on failure, pass it to the handler
      next(error);
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user details
 * @access  Private
 */
router.get(
  "/me",
  protect, // Ensures req.user is populated
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        // Should not happen if protect middleware is working correctly
        throw new AppError("Authentication error: User ID not found.", 401);
      }

      // Call service to get user details
      const user = await AuthService.getCurrentUserDetails(userId);

      // Send user details (password is already excluded by the service)
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
