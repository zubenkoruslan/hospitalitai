import express, { Request, Response, Router, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import notificationService from "../services/notificationService";
import {
  validateSignupRequest,
  handleValidationErrors,
  validateLoginRequest,
} from "../middleware/validationMiddleware";

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

interface AuthPayload {
  userId: mongoose.Types.ObjectId;
  role: string; // Or specific 'restaurant' | 'staff'
  name: string; // Add user name
  restaurantId?: mongoose.Types.ObjectId;
  restaurantName?: string; // Add restaurantName (optional)
}

interface SignupData {
  email: string;
  password?: string; // Password might not be needed if hashing is done elsewhere
  role: "restaurant" | "staff";
  name: string;
  restaurantName?: string;
  restaurantId?: string;
  professionalRole?: string;
}

// --- Helper Functions ---

/**
 * Creates a new Restaurant owner User and associated Restaurant document.
 */
async function registerOwnerAndRestaurant(
  data: SignupData
): Promise<{ user: IUser; restaurant: IRestaurant }> {
  const { email, password, role, name, restaurantName } = data;

  // 1. Create the User (owner)
  const newUser = new User({
    email,
    password, // Hashing handled by pre-save hook
    role,
    name,
  });
  await newUser.save();

  // 2. Create the Restaurant
  const newRestaurant = new Restaurant({
    name: restaurantName,
    owner: newUser._id as mongoose.Types.ObjectId,
  });
  await newRestaurant.save();

  // 3. Update the User with the Restaurant ID
  newUser.restaurantId = newRestaurant._id as mongoose.Types.ObjectId;
  await newUser.save();

  return { user: newUser, restaurant: newRestaurant };
}

/**
 * Creates a new Staff User, links them to an existing Restaurant, and notifies managers.
 */
async function registerStaffMember(
  data: SignupData
): Promise<{ user: IUser; restaurantId: mongoose.Types.ObjectId }> {
  const { email, password, role, name, restaurantId, professionalRole } = data;

  // 1. Find the target restaurant
  if (!restaurantId) {
    // This should be caught by validation, but double-check
    throw new Error(
      "Restaurant ID is required for staff role but was not provided."
    );
  }
  const targetRestaurant = await Restaurant.findById(restaurantId);
  if (!targetRestaurant) {
    // Throw a specific error to be caught by the main handler
    const error = new Error(
      "Restaurant not found with the provided ID."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
  const finalRestaurantId = targetRestaurant._id as mongoose.Types.ObjectId;

  // 2. Create the staff user
  const newUser = new User({
    email,
    password,
    role,
    name,
    restaurantId: finalRestaurantId,
    professionalRole,
  });
  await newUser.save();

  // 3. Add staff to restaurant list
  await Restaurant.findByIdAndUpdate(finalRestaurantId, {
    $addToSet: { staff: newUser._id },
  });

  // 4. Trigger notifications (fire and forget, handle errors internally)
  try {
    await notificationService.notifyManagersAboutNewStaff(
      finalRestaurantId,
      newUser._id as mongoose.Types.ObjectId,
      name
    );
  } catch (notificationError) {
    console.error(
      "Failed to create notifications for new staff (staff registration successful):",
      notificationError
    );
  }

  return { user: newUser, restaurantId: finalRestaurantId };
}

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
    const signupData: SignupData = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: signupData.email });
      if (existingUser) {
        // Use 409 Conflict for existing resource
        res
          .status(409)
          .json({ message: "User with this email already exists" });
        return;
      }

      let userResult: IUser;
      let restaurantResult: IRestaurant | null = null;
      let restaurantNameForJwt: string | undefined;

      // Call appropriate helper based on role
      if (signupData.role === "restaurant") {
        const { user, restaurant } = await registerOwnerAndRestaurant(
          signupData
        );
        userResult = user;
        restaurantResult = restaurant;
        restaurantNameForJwt = restaurant.name;
      } else if (signupData.role === "staff") {
        const { user, restaurantId } = await registerStaffMember(signupData);
        userResult = user;
        // Fetch restaurant name separately for JWT if needed
        const staffRestaurant = await Restaurant.findById(restaurantId);
        restaurantNameForJwt = staffRestaurant?.name;
      } else {
        // Should be caught by validation, but acts as a safeguard
        res.status(400).json({ message: "Invalid user role specified" });
        return;
      }

      // Prepare response (user data excluding password)
      const { password: _, ...userResponse } = userResult.toObject();

      // Generate JWT token
      const payload: AuthPayload = {
        userId: userResult._id as mongoose.Types.ObjectId,
        role: userResult.role,
        name: userResult.name,
        restaurantId: userResult.restaurantId,
        restaurantName: restaurantNameForJwt,
      };
      const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS };
      const token = jwt.sign(payload, JWT_SECRET, options);

      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        restaurant: restaurantResult ? restaurantResult.toObject() : undefined,
        token,
      });
    } catch (error: any) {
      console.error("Signup Error:", error);
      if (!res.headersSent) {
        // Handle specific errors thrown by helpers
        if (error.statusCode === 404) {
          res
            .status(404)
            .json({ message: error.message || "Resource not found" });
        } else if (error.code === 11000) {
          // Mongo duplicate key (redundant check? handled above)
          res
            .status(409)
            .json({ message: "User with this email already exists" });
        } else if (error.name === "ValidationError") {
          res
            .status(400)
            .json({ message: "Data validation failed", errors: error.errors });
        } else {
          res
            .status(500)
            .json({ message: error.message || "Server error during signup" });
        }
      } else {
        next(error); // Pass to global error handler
      }
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
      // Find user by email, explicitly select fields needed for payload + password
      const user = await User.findOne({ email }).select(
        "+password name role restaurantId"
      );

      // Use a single 401 response for "user not found" or "password mismatch"
      // This prevents leaking information about whether an email exists in the system.
      if (!user) {
        // Pass a generic error to the error handler
        const error: any = new Error("Invalid credentials");
        error.statusCode = 401;
        return next(error); // Use next() for consistency
      }

      // Compare submitted password with stored hashed password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        // Pass a generic error to the error handler
        const error: any = new Error("Invalid credentials");
        error.statusCode = 401;
        return next(error); // Use next() for consistency
      }

      // Fetch restaurant name only if restaurantId exists
      let restaurantName: string | undefined = undefined;
      if (user.restaurantId) {
        // Ensure the restaurant actually exists before accessing its name
        const restaurant = await Restaurant.findById(user.restaurantId).lean(); // Use lean() for performance if only reading
        if (restaurant) {
          restaurantName = restaurant.name;
        } else {
          // Log a warning if restaurant linked to user doesn't exist, but don't block login
          console.warn(
            `User ${user.email} (ID: ${user._id}) is linked to non-existent restaurant ID: ${user.restaurantId}`
          );
        }
      }

      // Create JWT payload
      const payload: AuthPayload = {
        userId: user._id as mongoose.Types.ObjectId,
        role: user.role,
        name: user.name, // Include user name
        restaurantId: user.restaurantId, // Include restaurantId if present
        restaurantName: restaurantName, // Use fetched name
      };

      // Sign the token
      const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS };
      const token = jwt.sign(payload, JWT_SECRET, options);

      // Send token back to client
      // Exclude sensitive info if needed before sending user data (optional for login)
      res.status(200).json({
        token,
        user: {
          // Optionally return some basic user info (excluding password)
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          restaurantName: restaurantName,
        },
      });
    } catch (error) {
      // Log the original error for server-side debugging
      console.error("Login Error:", error);
      // Pass the error to the central error handling middleware
      next(error);
    }
  }
);

/**
 * @route   GET /api/auth/staff
 * @desc    Get all staff members for the logged-in restaurant owner
 * @access  Private (Restaurant Owner only)
 */
router.get(
  "/staff",
  protect, // Apply authentication middleware
  restrictTo("restaurant"), // Apply role restriction middleware
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // The protect middleware should have added the user object to req
    if (!req.user?.restaurantId) {
      res
        .status(400)
        .json({ message: "Restaurant ID not found for this user." });
      return;
    }

    try {
      const staffMembers = await User.find({
        restaurantId: req.user.restaurantId,
        role: "staff", // Ensure we only fetch staff
      }).select("name email createdAt"); // Select specific fields to return

      res.status(200).json({ staff: staffMembers });
    } catch (error) {
      console.error("Error fetching staff:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Server error fetching staff" });
      } else {
        next(error);
      }
    }
  }
);

export default router;
