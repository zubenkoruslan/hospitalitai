import express, { Request, Response, Router, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { QuizService } from "../services/quizService";
import {
  handleValidationErrors,
  validateQuizIdParam,
  validateQuizStatusUpdate,
  validateGenerateQuizFromBanksBody,
  validateSubmitQuizAttemptBody,
  validateObjectId,
  validateUpdateQuizBody,
} from "../middleware/validationMiddleware";
import { AppError as _AppError } from "../utils/errorHandler";
import { ensureRestaurantAssociation } from "../middleware/restaurantMiddleware";
import {
  generateQuizFromBanksController,
  startQuizAttemptController,
  submitQuizAttemptController,
  getStaffQuizProgressController,
  getQuizAttemptDetailsController,
  getRestaurantQuizStaffProgressController,
  resetQuizProgressController,
  updateQuizController,
  getAllIncorrectAnswersForStaffController,
  updateQuizSnapshots,
} from "../controllers/quizController";

const router: Router = express.Router();

// === Middleware ===
router.use(protect); // All quiz routes require login
router.use(ensureRestaurantAssociation);

// === Routes using QuizService directly (Management) ===

/**
 * @route   GET /api/quiz
 * @desc    Get all quizzes for the restaurant owner (for management)
 * @access  Private (Restaurant Role)
 */
router.get(
  "/",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const quizzes = await QuizService.getAllQuizzesForRestaurant(
        restaurantId
      );
      res.status(200).json({ quizzes });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz/count
 * @desc    Get the total number of quizzes for the associated restaurant
 * @access  Private (Authenticated users associated with a restaurant)
 */
router.get(
  "/count",
  restrictTo("restaurantAdmin", "manager", "restaurant", "staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const count = await QuizService.countQuizzes(restaurantId);
      res.status(200).json({ count });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/quiz/update-snapshots
 * @desc    Manually update quiz snapshots when question banks have changed
 * @access  Private (Restaurant Role)
 */
router.post(
  "/update-snapshots",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  updateQuizSnapshots
);

/**
 * @route   PUT /api/quiz/:quizId
 * @desc    Update an existing quiz (details, banks, numbers, availability)
 * @access  Private (Restaurant Role)
 */
router.put(
  "/:quizId",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateQuizIdParam,
  validateUpdateQuizBody,
  handleValidationErrors,
  updateQuizController
);

/**
 * @route   PATCH /api/quiz/:quizId/status
 * @desc    Partially update a quiz (e.g., activate/deactivate only)
 * @access  Private (Restaurant Role)
 */
router.patch(
  "/:quizId/status",
  restrictTo("restaurant"),
  validateQuizIdParam,
  validateQuizStatusUpdate,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId } = req.params;
    const { isAvailable } = req.body;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const updatedQuiz = await QuizService.updateQuiz(
        new Types.ObjectId(quizId),
        restaurantId,
        { isAvailable }
      );
      res.status(200).json({
        message: "Quiz status updated successfully",
        quiz: updatedQuiz,
      });
    } catch (error) {
      console.error("Error in PATCH /api/quiz/:quizId/status route:", error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/quiz/:quizId
 * @desc    Delete a quiz
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:quizId",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateQuizIdParam,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;
    try {
      const success = await QuizService.deleteQuiz(
        new mongoose.Types.ObjectId(quizId),
        restaurantId
      );
      if (!success) {
        return next(
          new _AppError(
            "Quiz not found or you do not have permission to delete it.",
            404
          )
        );
      }
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz/available-for-staff
 * @desc    Get all quizzes available for the logged-in staff member based on their role.
 * @access  Private (Staff Role)
 */
router.get(
  "/available-for-staff",
  restrictTo("staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;
    const staffUserId = req.user?.userId as mongoose.Types.ObjectId;

    if (!restaurantId || !staffUserId) {
      return next(
        new _AppError("User restaurant or ID not found on request.", 400)
      );
    }

    try {
      const quizzes = await QuizService.getAvailableQuizzesForStaff(
        restaurantId,
        staffUserId
      );
      res.status(200).json({ quizzes }); // Ensure consistent response structure { quizzes: [] }
    } catch (error) {
      next(error);
    }
  }
);

// === Routes using Quiz Controllers ===

/**
 * @route   POST /api/quiz/from-banks
 * @desc    Generate a new quiz from specified question banks.
 * @access  Private (Restaurant Role)
 */
router.post(
  "/from-banks",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateGenerateQuizFromBanksBody,
  handleValidationErrors,
  generateQuizFromBanksController
);

/**
 * @route   POST /api/quiz/:quizId/start-attempt
 * @desc    Allow a staff member to start a quiz attempt.
 * @access  Private (Staff Role primarily, but available to any authenticated user with restaurantId)
 */
router.post(
  "/:quizId/start-attempt",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  validateQuizIdParam,
  handleValidationErrors,
  startQuizAttemptController
);

/**
 * @route   POST /api/quiz/:quizId/submit-attempt
 * @desc    Allow a staff member to submit their answers for a quiz attempt.
 * @access  Private (Staff Role primarily)
 */
router.post(
  "/:quizId/submit-attempt",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  validateQuizIdParam,
  validateSubmitQuizAttemptBody,
  handleValidationErrors,
  submitQuizAttemptController
);

/**
 * @route   GET /api/quiz/:quizId/my-progress
 * @desc    Get the current staff member's progress for a specific quiz.
 * @access  Private (Staff Role primarily)
 */
router.get(
  "/:quizId/my-progress",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  validateQuizIdParam,
  handleValidationErrors,
  getStaffQuizProgressController
);

/**
 * @route   GET /api/quiz/attempts/:attemptId
 * @desc    Get details of a specific quiz attempt.
 * @access  Private (User who took the attempt, or Restaurant Owner)
 */
router.get(
  "/attempts/:attemptId",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  validateObjectId("attemptId"),
  handleValidationErrors,
  getQuizAttemptDetailsController
);

/**
 * @route   GET /api/quiz/:quizId/restaurant-progress
 * @desc    Get all staff progress for a specific quiz (Restaurant Owner).
 *          The controller handles if restaurantId is from params or logged-in user.
 * @access  Private (Restaurant Role)
 */
router.get(
  "/:quizId/restaurant-progress",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateQuizIdParam,
  handleValidationErrors,
  getRestaurantQuizStaffProgressController
);

/**
 * @route   POST /api/quiz/:quizId/reset-progress
 * @desc    Reset all progress for a quiz for all staff in the restaurant.
 * @access  Private (Restaurant Role)
 */
router.post(
  "/:quizId/reset-progress",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateQuizIdParam,
  handleValidationErrors,
  resetQuizProgressController
);

/**
 * @route   GET /api/quiz/staff/:staffId/all-incorrect-answers
 * @desc    Get all incorrect answers across all quiz attempts for a specific staff member
 * @access  Private (Staff member themselves, or Restaurant managers)
 * @query   quizId - Optional: Filter incorrect answers for a specific quiz
 */
router.get(
  "/staff/:staffId/all-incorrect-answers",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  validateObjectId("staffId"),
  handleValidationErrors,
  getAllIncorrectAnswersForStaffController
);

export default router;
