import express, { Express, Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Import route files
import authRoutes from "./routes/auth";
import menuRoutes from "./routes/menus";
import itemRoutes from "./routes/items";
import { router as quizRoutes } from "./routes/quiz";
import resultsRoutes from "./routes/quizResult";
import staffRoutes from "./routes/staff";
import notificationRoutes from "./routes/notifications";
import { protect } from "./middleware/authMiddleware";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri: string =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hospitality-training";

// Only connect if not in a test environment (vitest sets process.env.VITEST)
if (!process.env.VITEST) {
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
app.use("/api/menus", menuRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/notifications", notificationRoutes);

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
