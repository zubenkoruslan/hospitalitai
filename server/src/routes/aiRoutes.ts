import express from "express";
import { generateAiQuestionsHandler } from "../controllers/aiController";
import { protect, restrictTo } from "../middleware/authMiddleware"; // Assuming auth middleware exists

const router = express.Router();

// POST /api/ai/generate-questions
router.post(
  "/generate-questions",
  protect, // Ensures user is logged in
  restrictTo("restaurant", "admin"), // Ensures user is a restaurant owner/admin or a general admin
  generateAiQuestionsHandler
);

export default router;
