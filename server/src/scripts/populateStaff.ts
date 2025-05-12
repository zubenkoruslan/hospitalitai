import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User"; // Adjust path if your User model is elsewhere
import { Types } from "mongoose";

// Load environment variables (ensure MONGODB_URI is set in your .env file)
dotenv.config({ path: "./server/.env" }); // Adjust path to .env if it's in project root or server root

const MONGODB_URI = process.env.MONGODB_URI;
const RESTAURANT_ID = "680cc041a5063e15878bd0fd";
const DEFAULT_PASSWORD = "staff123";
const NUM_STAFF = 10;
const PROFESSIONAL_ROLES = ["Waiter", "Senior Waiter"];

async function populateStaff() {
  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env file");
    process.exit(1);
  }

  if (!Types.ObjectId.isValid(RESTAURANT_ID)) {
    console.error(`Error: Invalid RESTAURANT_ID: ${RESTAURANT_ID}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for staff population");

    const restaurantObjectId = new Types.ObjectId(RESTAURANT_ID);

    for (let i = 0; i < NUM_STAFF; i++) {
      const staffName = `Staff User ${i + 1}`;
      // Using a generic domain. Consider if emails need to be truly unique/functional
      const staffEmail = `staff${i + 1}@example.com`;
      const professionalRole =
        PROFESSIONAL_ROLES[i % PROFESSIONAL_ROLES.length];

      // Check if email already exists to prevent duplicate key errors
      const existingUser = await User.findOne({ email: staffEmail });
      if (existingUser) {
        console.log(`User with email ${staffEmail} already exists. Skipping.`);
        continue;
      }

      const newStaff = new User({
        name: staffName,
        email: staffEmail,
        password: DEFAULT_PASSWORD, // Password will be hashed by the pre-save hook
        role: "staff",
        professionalRole: professionalRole,
        restaurantId: restaurantObjectId,
      });

      await newStaff.save();
      console.log(
        `Created staff: ${staffName} (${staffEmail}) - ${professionalRole}`
      );
    }

    console.log("\nStaff population complete!");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error populating staff data:", error.message);
      console.error(error.stack);
    } else {
      console.error(
        "An unknown error occurred during staff population:",
        error
      );
    }
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

populateStaff();
