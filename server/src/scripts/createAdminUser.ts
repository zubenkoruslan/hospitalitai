import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import User from "../models/User";

// Configure dotenv
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    const uri =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/hospitality-training";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: "admin@qcrunch.com" });

    if (existingAdmin) {
      console.log("Admin user already exists");

      // Update the role to admin if it's not already
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log("Updated existing user role to admin");
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        name: "Admin User",
        email: "admin@qcrunch.com",
        password: "admin123", // Will be hashed by the pre-save hook
        role: "admin",
        // Admin users don't need a restaurantId
      });

      await adminUser.save();
      console.log("Admin user created successfully");
    }

    console.log("Admin user details:");
    console.log("Email: admin@qcrunch.com");
    console.log("Password: admin123");
    console.log("Role: admin");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the script
createAdminUser();
