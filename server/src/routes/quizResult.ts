import express, { Request, Response, Router, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { ensureRestaurantAssociation } from "../middleware/restaurantMiddleware";
import QuizResult from "../models/QuizResult"; // Import the QuizResult model
import User from "../models/User"; // Needed for service method auth checks
import Quiz from "../models/Quiz"; // Needed for service method population
import QuizResultService from "../services/quizResultService"; // Import the service
import { AppError } from "../utils/errorHandler"; // Import AppError

const router: Router = express.Router();

// === Middleware ===
router.use(protect); // All results routes require login

/**
 * @route   GET /api/quiz-results/my-results
 * @desc    Get results for the logged-in staff member
 * @access  Private (Staff Role)
 */
router.get(
  "/my-results",
  restrictTo("staff"),
  ensureRestaurantAssociation,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId as mongoose.Types.ObjectId;

    try {
      const results = await QuizResultService.getMyResults(userId);
      res.status(200).json({ results });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz-results/staff-ranking
 * @desc    Get average score and rank for the logged-in staff member
 * @access  Private (Staff Role)
 */
router.get(
  "/staff-ranking",
  restrictTo("staff"),
  ensureRestaurantAssociation,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId as mongoose.Types.ObjectId;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!userId || !restaurantId) {
      return next(
        new AppError("User ID or Restaurant ID missing in token", 403)
      );
    }

    try {
      const rankingData = await QuizResultService.getStaffRankingData(
        userId,
        restaurantId
      );
      res.status(200).json(rankingData);
    } catch (error) {
      console.error(
        "Error in GET /api/quiz-results/staff-ranking route:",
        error
      );
      next(error);
    }
  }
);

/**
 * @route   GET /api/results/:resultId/detail
 * @desc    Get detailed quiz result with user answers and correct answers
 * @access  Private (Staff or Restaurant Role)
 */
router.get(
  "/:resultId/detail",
  // No specific role restriction here, service handles authorization
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { resultId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const restaurantId = req.user?.restaurantId; // Needed for owner check

    // Basic validation checks
    if (!userId || !userRole || !restaurantId) {
      return next(
        new AppError("User information incomplete in token payload", 400)
      );
    }
    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      return next(new AppError("Invalid result ID format", 400));
    }

    try {
      // Delegate logic and authorization check to the service
      const detailedResult = await QuizResultService.getResultDetails(
        resultId,
        userId,
        userRole,
        restaurantId
      );
      res.status(200).json({ result: detailedResult });
    } catch (error) {
      // Service handles errors (not found, unauthorized, etc.)
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz-results/:resultId
 * @desc    Get detailed results for a specific quiz attempt
 * @access  Private (Staff viewing own, Restaurant viewing own staff)
 */
// Removed example route section

export { router as quizResultRouter }; // Export with a unique name
