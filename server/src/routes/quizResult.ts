import express, { Request, Response, Router, NextFunction } from "express";
import mongoose from "mongoose"; // Removed Types import as it's part of mongoose default
import { protect, restrictTo } from "../middleware/authMiddleware";
import { ensureRestaurantAssociation } from "../middleware/restaurantMiddleware";
// QuizResult, User, Quiz models are used by QuizResultService, keep if service methods are used.
// For now, assuming service methods called below (getMyResults, getStaffRankingData) handle their own model interactions.
// If these routes were to directly use models, imports would be needed.
import { QuizResultService } from "../services/quizResultService"; // Changed to named import
import { AppError as _AppError } from "../utils/errorHandler"; // Aliased
// Removed: validateObjectId from here as the route using it is being removed.
// import { handleValidationErrors, validateObjectId } from "../middleware/validationMiddleware";

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
  ensureRestaurantAssociation, // Ensures restaurantId is on req.user
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId as mongoose.Types.ObjectId;
    // ensureRestaurantAssociation and restrictTo should prevent userId from being null

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
  ensureRestaurantAssociation, // Ensures restaurantId and userId are on req.user
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId as mongoose.Types.ObjectId;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    // Redundant check if ensureRestaurantAssociation and restrictTo work as expected
    // if (!userId || !restaurantId) {
    //   return next(
    //     new AppError("User ID or Restaurant ID missing in token", 403)
    //   );
    // }

    try {
      const rankingData = await QuizResultService.getStaffRankingData(
        userId,
        restaurantId
      );
      res.status(200).json(rankingData);
    } catch (error) {
      // console.error(
      //   "Error in GET /api/quiz-results/staff-ranking route:",
      //   error
      // ); // Keep if specific logging is needed, else global handler catches
      next(error);
    }
  }
);

// Removed GET /:resultId/detail route as it's redundant with GET /api/quiz/attempts/:attemptId

export { router as quizResultRouter }; // Export with a unique name
