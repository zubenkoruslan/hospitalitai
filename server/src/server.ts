import dotenv from "dotenv";
import path from "path"; // Import the path module

// Configure dotenv to load .env file from the server directory AT THE VERY TOP
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// --- TEMPORARY DEBUGGING REMOVED ---
// console.log(
//   "[DEBUG] GEMINI_API_KEY from process.env (after dotenv.config()):",
//   process.env.GEMINI_API_KEY
// );
// --- TEMPORARY DEBUGGING REMOVED ---

import express, { Express, Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Import route files
import authRoutes from "./routes/auth";
import menuRoutes from "./routes/menus";
import cleanMenuRoutes from "./routes/cleanMenus"; // New clean menu routes
import cleanQuestionRoutes from "./routes/cleanQuestionRoutes"; // New clean question routes
import itemRoutes from "./routes/items";
import quizRoutes from "./routes/quiz";
import { quizResultRouter } from "./routes/quizResult";
import staffRoutes from "./routes/staff";
import questionBankRoutes from "./routes/questionBankRoutes";
import questionRoutes from "./routes/questionRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { roleRouter } from "./routes/roleRoutes";
import aiRoutes from "./routes/aiRoutes";
import restaurantRoutes from "./routes/restaurantRoutes";
import sopDocumentRoutes from "./routes/sopDocumentRoutes";
import sopDocumentEditRoutes from "./routes/sopDocumentEditRoutes"; // Import new edit routes
import invitationRoutes from "./routes/invitation"; // Import invitation routes
import passwordResetRoutes from "./routes/passwordReset"; // Import password reset routes
import notificationRoutes from "./routes/notifications"; // Import notification routes
import analyticsRoutes from "./routes/analyticsRoutes"; // Import analytics routes
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes"; // Import admin analytics routes
import debugRoutes from "./routes/debugRoutes"; // Import debug routes
import templateRoutes from "./routes/templates"; // Import template routes

// Import and start the menu import worker
// Legacy menu import worker removed - using clean upload system now

const app: Express = express();

// === Middleware ===

// CORS Configuration (Adjust origin in production!)
app.use(
  cors({
    // Use environment variable for production, but specific origin for dev
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : "http://localhost:5173", // Allow Vite dev server
    credentials: true,
  })
);

// Helmet for security headers
app.use(helmet());

// HTTP request logger (for development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate Limiting (Apply before routes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `windowMs`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes", // Custom message
});
// app.use(limiter); // Rate limiting disabled for development

// Body Parsing - Increased limits for menu and document uploads
app.use(express.json({ limit: "10mb" })); // For parsing application/json
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const uri: string =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hospitality-training";

// ONLY FOR DEBUGGING - Log the URI being used
console.log("Attempting to connect to MongoDB with URI:", uri);

// Only connect if not in a test environment
if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      await mongoose.connect(uri);
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB connection error:", error);
    }
  })();
}

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("Server is running");
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordResetRoutes); // Mount password reset routes under /api/auth
app.use("/api/menus", menuRoutes);
app.use("/api/upload", cleanMenuRoutes); // Upload routes (formerly clean menu routes)
app.use("/api/clean-questions", cleanQuestionRoutes); // Clean AI question generation routes
app.use("/api/items", itemRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/quiz-results", quizResultRouter);
app.use("/api/staff", staffRoutes);
app.use("/api/question-banks", questionBankRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/roles", roleRouter);
app.use("/api/ai", aiRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/sop-documents", sopDocumentRoutes);
app.use("/api/sop-documents", sopDocumentEditRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/templates", templateRoutes);

// Global error handler - must be after all routes
app.use(errorHandler);

const PORT: string | number = process.env.PORT || 3000;

// Only listen when not in test environment (vitest or general test)
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app instance for testing
export default app;
