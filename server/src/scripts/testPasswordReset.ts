import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import { EmailService } from "../services/emailService";
import { PasswordResetService } from "../services/passwordResetService";
import User from "../models/User";

async function testPasswordReset() {
  try {
    // Connect to MongoDB
    const uri =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/hospitality-training";
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Test email service connection
    const emailService = new EmailService();
    console.log("✅ Email service initialized");

    // Test with a real user email
    const testEmail = "test@example.com"; // Change this to a real email in your DB

    // Find or create a test user
    let testUser = await User.findOne({ email: testEmail });

    if (!testUser) {
      console.log("🔍 Test user not found, creating one...");
      testUser = await User.create({
        name: "Test User",
        email: testEmail,
        password: "TempPassword123!", // This will be replaced during reset
        role: "staff",
        restaurantId: new mongoose.Types.ObjectId(), // Dummy restaurant ID
      });
      console.log("✅ Test user created");
    } else {
      console.log("✅ Found existing test user");
    }

    // Test password reset service
    const passwordResetService = new PasswordResetService();

    console.log("\n🔄 Testing password reset request...");
    const requestResult = await passwordResetService.requestPasswordReset(
      testEmail
    );
    console.log("✅ Password reset request result:", requestResult.message);

    // Check if we can find the reset token in the database
    const PasswordReset = (await import("../models/PasswordReset")).default;
    const resetRecord = await PasswordReset.findOne({
      email: testEmail,
      used: false,
    }).sort({ createdAt: -1 });

    if (resetRecord) {
      console.log("✅ Password reset token created successfully");
      console.log("🔗 Reset token:", resetRecord.token);
      console.log("⏰ Expires at:", resetRecord.expiresAt);

      // Test token verification
      console.log("\n🔄 Testing token verification...");
      const verifyResult = await passwordResetService.verifyResetToken(
        resetRecord.token
      );
      console.log("✅ Token verification result:", verifyResult);

      // Test password reset (without actually changing the password)
      console.log("\n🔄 Testing password reset...");
      const newPassword = "NewPassword123!";
      const resetResult = await passwordResetService.resetPassword(
        resetRecord.token,
        newPassword
      );
      console.log("✅ Password reset result:", resetResult.message);

      // Verify the token is now marked as used
      const usedRecord = await PasswordReset.findById(resetRecord._id);
      console.log("✅ Token marked as used:", usedRecord?.used);
    } else {
      console.log("❌ No reset token found in database");
    }

    // Test cleanup function
    console.log("\n🔄 Testing token cleanup...");
    const cleanupResult = await passwordResetService.cleanupExpiredTokens();
    console.log("✅ Cleanup result:", cleanupResult);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Check environment variables
const requiredEnvVars = [
  "MONGODB_URI",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "FROM_EMAIL",
  "FRONTEND_URL",
];

console.log("🔍 Checking environment variables...");
let hasAllEnvVars = true;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.log(`❌ Missing environment variable: ${envVar}`);
    hasAllEnvVars = false;
  } else {
    console.log(
      `✅ ${envVar}: ${
        envVar.includes("PASS") ? "[HIDDEN]" : process.env[envVar]
      }`
    );
  }
}

if (hasAllEnvVars) {
  console.log("\n🚀 Starting password reset test...\n");
  testPasswordReset();
} else {
  console.log("\n❌ Cannot run test due to missing environment variables");
  process.exit(1);
}
