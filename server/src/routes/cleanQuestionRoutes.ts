import express from "express";
import { cleanQuestionController } from "../controllers/cleanQuestionController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * Clean Question Generation Routes
 *
 * Simple, focused routes for the new AI question generation system.
 * All routes require authentication and use clean controller methods.
 */

// Apply authentication middleware to all routes
router.use(protect);

/**
 * POST /api/clean-questions/generate-menu
 * Generate knowledge-focused questions from menu items
 *
 * Body:
 * - menuId: string (required)
 * - bankId: string (required)
 * - focusArea: "ingredients" | "allergens" | "wine_knowledge" | "preparation" | "service_knowledge" | "safety_protocols" (required)
 * - questionCount: number (1-50, required)
 * - categoriesToFocus?: string[] (optional, filter by menu categories)
 * - difficultyMix?: { easy: number, medium: number, hard: number } (optional)
 */
router.post("/generate-menu", cleanQuestionController.generateMenuQuestions);

/**
 * POST /api/clean-questions/generate-sop
 * Generate procedure-focused questions from SOP content
 *
 * Body:
 * - sopContent: string (required, min 100 chars)
 * - title: string (required, min 3 chars)
 * - focusArea: "safety" | "procedures" | "customer_service" | "compliance" (required)
 * - questionCount: number (1-30, required)
 * - bankId: string (required)
 */
router.post("/generate-sop", cleanQuestionController.generateSopQuestions);

export default router;
