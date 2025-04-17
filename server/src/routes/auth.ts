import express, { Request, Response, Router, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import mongoose, { Types } from "mongoose";

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
  restaurantId?: mongoose.Types.ObjectId;
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
        message: "Restaurant ID should not be provided for restaurant role",
      });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email }).session(session);
      if (existingUser) {
        await session.abortTransaction();
        session.endSession();
        res
          .status(400)
          .json({ message: "User with this email already exists" });
        return;
      }

      let newRestaurantDoc: IRestaurant | null = null;
      let finalRestaurantId: mongoose.Types.ObjectId | undefined;

      // If role is restaurant, create the restaurant first
      if (role === "restaurant") {
        newRestaurantDoc = new Restaurant({ name: restaurantName });
        // Owner will be set after user is created
        await newRestaurantDoc.save({ session });
        finalRestaurantId = newRestaurantDoc._id as mongoose.Types.ObjectId; // Assert type
      }
      // If role is staff, validate the provided restaurantId
      else if (role === "staff") {
        const targetRestaurant = await Restaurant.findById(
          restaurantId
        ).session(session);
        if (!targetRestaurant) {
          await session.abortTransaction();
          session.endSession();
          res
            .status(404)
            .json({ message: "Restaurant not found for staff assignment" });
          return;
        }
        finalRestaurantId = targetRestaurant._id as mongoose.Types.ObjectId; // Assert type
      }

      // Create new user
      const newUserDoc = new User({
        email,
        password, // Hashing is handled by the pre-save hook in the model
        role,
        name, // Assuming name field exists in User model (add if not)
        restaurantId: finalRestaurantId,
      });
      await newUserDoc.save({ session });

      // If a new restaurant was created, assign its owner
      if (newRestaurantDoc) {
        newRestaurantDoc.owner = newUserDoc._id as mongoose.Types.ObjectId; // Assert type
        await newRestaurantDoc.save({ session });
      }
      // If staff was created, add them to the restaurant's staff list
      else if (role === "staff" && finalRestaurantId) {
        await Restaurant.findByIdAndUpdate(
          finalRestaurantId,
          { $addToSet: { staff: newUserDoc._id } }, // Use $addToSet to avoid duplicates
          { session, new: true } // `new: true` is optional here
        );
      }

      await session.commitTransaction();

      // Prepare response (exclude password)
      const { password: _, ...userResponse } = newUserDoc.toObject();

      // Generate JWT token
      const payload: AuthPayload = {
        userId: newUserDoc._id as mongoose.Types.ObjectId,
        role: newUserDoc.role,
        restaurantId: newUserDoc.restaurantId,
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
      await session.abortTransaction();
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
    } finally {
      session.endSession(); // Ensure session is always closed
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
      // Find user by email, explicitly select password for comparison
      const user = await User.findOne({ email }).select("+password");

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
        restaurantId: user.restaurantId, // Include restaurantId if present
      };

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

export default router;
