import express, { Request, Response, Router, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";

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

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (Restaurant or Staff)
 * @access  Public
 */
router.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password, role, name, restaurantName, restaurantId } =
      req.body;

    // Basic validation
    if (!email || !password || !role || !name) {
      res.status(400).json({
        message: "Missing required fields (email, password, role, name)",
      });
      return;
    }
    if (role === "restaurant" && !restaurantName) {
      res
        .status(400)
        .json({ message: "Restaurant name is required for restaurant role" });
      return;
    }
    if (role === "staff" && !restaurantId) {
      res
        .status(400)
        .json({ message: "Restaurant ID is required for staff role" });
      return;
    }
    if (role === "restaurant" && restaurantId) {
      res.status(400).json({
        message:
          "Restaurant ID should not be provided when signing up as restaurant owner",
      });
      return;
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res
          .status(400)
          .json({ message: "User with this email already exists" });
        return;
      }

      let newRestaurantDoc: IRestaurant | null = null;
      let finalRestaurantId: mongoose.Types.ObjectId | undefined;
      let newUserDoc: IUser | null = null;

      // If role is restaurant, create the user first, then the restaurant linked to the user
      if (role === "restaurant") {
        // 1. Create the User
        newUserDoc = new User({
          email,
          password, // Hashing handled by pre-save hook
          role,
          name,
          // restaurantId will be added after restaurant is created
        });
        await newUserDoc.save();

        // 2. Create the Restaurant, assigning the owner
        newRestaurantDoc = new Restaurant({
          name: restaurantName,
          owner: newUserDoc._id as mongoose.Types.ObjectId, // Assign owner immediately
        });
        await newRestaurantDoc.save();

        // 3. Update the User with the Restaurant ID
        finalRestaurantId = newRestaurantDoc._id as mongoose.Types.ObjectId;
        newUserDoc.restaurantId = finalRestaurantId;
        await newUserDoc.save(); // Save the user again with the restaurantId
      }
      // If role is staff, validate the provided restaurantId and find the restaurant
      else if (role === "staff") {
        // Find restaurant by ID
        const targetRestaurant = await Restaurant.findById(restaurantId);

        if (!targetRestaurant) {
          res
            .status(404)
            .json({ message: "Restaurant not found with the provided ID." });
          return;
        }
        finalRestaurantId = targetRestaurant._id as mongoose.Types.ObjectId; // Get ID from found restaurant

        // Create staff user linked to the restaurant
        newUserDoc = new User({
          email,
          password,
          role,
          name,
          restaurantId: finalRestaurantId,
        });
        await newUserDoc.save();

        // Add staff member to the restaurant's staff list
        await Restaurant.findByIdAndUpdate(
          finalRestaurantId,
          { $addToSet: { staff: newUserDoc._id } } // Use $addToSet to avoid duplicates
        );
      } else {
        // Handle potential other roles or invalid role value if necessary
        res.status(400).json({ message: "Invalid user role specified" });
        return;
      }

      // Prepare response (exclude password) - newUserDoc should be defined from above branches
      if (!newUserDoc) {
        // This case should ideally not happen if validation & role handling is correct
        console.error(
          "Signup Error: newUserDoc is null after processing roles."
        );
        res
          .status(500)
          .json({ message: "Internal server error during signup" });
        return;
      }

      const { password: _, ...userResponse } = newUserDoc.toObject();

      // Generate JWT token
      const payload: AuthPayload = {
        userId: newUserDoc._id as mongoose.Types.ObjectId,
        role: newUserDoc.role,
        name: newUserDoc.name, // Include user name
        restaurantId: newUserDoc.restaurantId,
        // Fetch restaurant name if role is staff and ID exists, or use newRestaurantDoc name if owner
        restaurantName:
          role === "staff" && newUserDoc.restaurantId
            ? (await Restaurant.findById(newUserDoc.restaurantId))?.name
            : role === "restaurant"
            ? newRestaurantDoc?.name
            : undefined,
      };
      const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS };
      const token = jwt.sign(payload, JWT_SECRET, options);

      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        restaurant: newRestaurantDoc ? newRestaurantDoc.toObject() : undefined,
        token,
      });
    } catch (error: any) {
      console.error("Signup Error:", error);
      // Handle Mongoose validation errors or other errors
      if (!res.headersSent) {
        if (error.name === "ValidationError") {
          res
            .status(400)
            .json({ message: "Validation failed", errors: error.errors });
        } else {
          res.status(500).json({ message: "Server error during signup" });
        }
      } else {
        next(error); // Pass to error handling middleware if headers sent
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Please provide email and password" });
      return;
    }

    try {
      // Find user by email, explicitly select fields needed for payload + password
      const user = await User.findOne({ email }).select(
        "+password name role restaurantId"
      );

      if (!user) {
        res.status(401).json({ message: "Invalid credentials" }); // User not found
        return;
      }

      // Compare submitted password with stored hashed password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" }); // Password doesn't match
        return;
      }

      // Create JWT payload
      const payload: AuthPayload = {
        userId: user._id as mongoose.Types.ObjectId,
        role: user.role,
        name: user.name, // Include user name
        restaurantId: user.restaurantId, // Include restaurantId if present
        // Fetch and include restaurant name if user has a restaurantId (staff or owner)
        restaurantName: user.restaurantId
          ? (await Restaurant.findById(user.restaurantId))?.name
          : undefined,
      };

      console.log("--- Login Route Debug --- ");
      console.log("User object from DB:", JSON.stringify(user, null, 2)); // Log user object
      console.log("Payload for JWT:", JSON.stringify(payload, null, 2)); // Log payload

      // Sign the token
      const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS };
      const token = jwt.sign(payload, JWT_SECRET, options);

      // Send token back to client
      res.status(200).json({ token });
    } catch (error) {
      console.error("Login Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Server error during login" });
      } else {
        next(error); // Pass to error handling middleware
      }
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
