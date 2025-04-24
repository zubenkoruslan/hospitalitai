import express, { Express, Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Import route files
import authRoutes from "./routes/auth";
import menuRoutes from "./routes/menus";
import itemRoutes from "./routes/items";
import quizRoutes from "./routes/quiz";
import resultsRoutes from "./routes/quizResult";
import staffRoutes from "./routes/staff";
import { protect } from "./middleware/authMiddleware";
// TODO: Import other route files as needed (e.g., quizzes)

dotenv.config();

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri: string =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hospitality-training";
(async () => {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
})();

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
// TODO: Mount other routes

const PORT: string | number = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
