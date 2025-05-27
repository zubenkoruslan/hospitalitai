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
  validateProfileUpdateRequest,
  validatePasswordChangeRequest,
} from "../middleware/validationMiddleware";
import { AppError } from "../utils/errorHandler";
import {
  AuthPayload,
  SignupData,
  UserProfileUpdateData,
  PasswordChangeData,
} from "../types/authTypes"; // Added UserProfileUpdateData and PasswordChangeData

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
      let jwtRestaurantId: mongoose.Types.ObjectId | undefined = undefined;
      if (user.restaurantId) {
        try {
          jwtRestaurantId = new mongoose.Types.ObjectId(
            user.restaurantId.toString()
          );
        } catch (e) {
          // Handle cases where user.restaurantId might be an invalid string for ObjectId
          console.error(
            "Invalid restaurantId format for JWT payload:",
            user.restaurantId,
            e
          );
          // Depending on policy, you might throw an error or proceed without restaurantId in JWT
        }
      }

      const payload: AuthPayload = {
        userId: new mongoose.Types.ObjectId(user._id.toString()), // Ensure _id is ObjectId
        role: user.role,
        name: user.name,
        restaurantId: jwtRestaurantId, // Use the converted ObjectId
        restaurantName: user.restaurantName, // AuthService.loginUser returns user with restaurantName
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

/**
 * @route   PUT /api/auth/me
 * @desc    Update current logged in user's profile details (name, email, restaurantName)
 * @access  Private
 */
router.put(
  "/me",
  protect, // Ensures req.user is populated
  validateProfileUpdateRequest, // Added validation for profile update
  handleValidationErrors, // Handles any validation errors
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("Authentication error: User ID not found.", 401);
      }

      const profileData = req.body as UserProfileUpdateData;

      // Call service to update user details
      // The service should handle logic like: if user is restaurant owner, can they update restaurantName via this?
      // Or should restaurantName update be a separate endpoint /api/restaurants/:id ?
      // For now, assume AuthService.updateUserProfile handles this logic.
      const updatedUser = await AuthService.updateUserProfile(
        userId,
        profileData
      );

      // Send updated user details (password should already be excluded by the service)
      res
        .status(200)
        .json({ user: updatedUser, message: "Profile updated successfully." });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change current logged in user's password
 * @access  Private
 */
router.post(
  "/change-password",
  protect, // Ensures req.user is populated
  validatePasswordChangeRequest, // Added validation for password change
  handleValidationErrors, // Handles any validation errors
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("Authentication error: User ID not found.", 401);
      }

      const { currentPassword, newPassword } = req.body as PasswordChangeData;

      // Call service to change password
      await AuthService.changeUserPassword(
        userId,
        currentPassword,
        newPassword
      );

      res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/auth/me
 * @desc    Delete current logged in user's account
 * @access  Private
 */
router.delete(
  "/me",
  protect, // Ensures req.user is populated
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("Authentication error: User ID not found.", 401);
      }

      // Call service to delete user account
      // This service method needs to handle implications, e.g., if a restaurant owner deletes their account,
      // what happens to the restaurant and its staff? For now, focus on basic user deletion.
      // If it's a staff member, they should just be removed.
      // If it's an owner, it's more complex (cascade delete restaurant and staff, or prevent?)
      // For MVP, let's assume AuthService.deleteUserAccount handles this logic.
      await AuthService.deleteUserAccount(
        userId,
        req.user?.role,
        req.user?.restaurantId
      );

      // TODO: Consider what happens to the JWT token on the client. It should be invalidated.
      res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
