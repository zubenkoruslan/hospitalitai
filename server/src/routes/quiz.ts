import express, { Request, Response, Router, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import Quiz, { IQuiz } from "../models/Quiz";
import { IQuestion } from "../models/QuestionModel";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import Menu from "../models/Menu"; // Import Menu model if needed for fetching items by menu
import User from "../models/User"; // Assuming User model exists and stores restaurantId for staff
import QuizService from "../services/quizService";
import {
  handleValidationErrors,
  validateQuizIdParam,
  validateAutoGenerateQuiz,
  validateQuizBody,
  validateSubmitAnswers,
  validateAssignQuiz,
  validateQuizStatusUpdate,
} from "../middleware/validationMiddleware"; // Import quiz validators
import { AppError } from "../utils/errorHandler";
import QuizResultService from "../services/quizResultService"; // Import QuizResultService
import { ensureRestaurantAssociation } from "../middleware/restaurantMiddleware"; // Re-added this import
import { generateQuizFromBanksController } from "../controllers/quizController";

const router: Router = express.Router();

// === Middleware ===
router.use(protect); // All quiz routes require login
router.use(ensureRestaurantAssociation); // Ensure user is linked to a restaurant for most routes

// === Routes ===

/**
 * @route   GET /api/quiz
 * @desc    Get all quizzes for the restaurant owner (for management)
 * @access  Private (Restaurant Role)
 */
router.get(
  "/",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const quizzes = await QuizService.getAllQuizzesForRestaurant(
        restaurantId
      );
      res.status(200).json({ quizzes });
    } catch (error) {
      // Service handles errors
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!restaurantId) {
      return next(
        new AppError("Restaurant association not found for user.", 400)
      );
    }

    try {
      // Delegate counting to the service
      const count = await QuizService.countQuizzes(restaurantId);
      res.status(200).json({ count });
    } catch (error) {
      // Service handles errors
      next(error);
    }
  }
);

/**
 * @route   POST /api/quiz/auto
 * @desc    Generate quiz questions based on selected menus (Likely deprecated by from-banks)
 * @access  Private (Restaurant Role)
 */
/*
// Temporarily commenting out the /api/quiz/auto route as it uses the old QuizService.generateQuizQuestions
router.post(
  "/auto",
  restrictTo("restaurant"),
  validateAutoGenerateQuiz,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { menuIds, title } = req.body;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const generatedQuizData = await QuizService.generateQuizQuestions(
        title,
        menuIds,
        restaurantId
      );
      res.status(200).json({ quiz: generatedQuizData });
    } catch (error) {
      // Service handles errors
      next(error);
    }
  }
);
*/

/**
 * @route   POST /api/quiz
 * @desc    Save a quiz (Likely deprecated by from-banks)
 * @access  Private (Restaurant Role)
 */
/*
// Temporarily commenting out the /api/quiz route as it uses the old QuizService.createQuiz
router.post(
  "/",
  restrictTo("restaurant"),
  validateQuizBody,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { title, menuItemIds, questions } = req.body;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      // Construct the data payload for the service
      const quizData = {
        title,
        menuItemIds: menuItemIds.map((id: string) => new Types.ObjectId(id)), // Ensure ObjectIds
        questions, // Assuming questions structure matches IQuestion
        restaurantId,
      };
      const savedQuiz = await QuizService.createQuiz(quizData);
      res.status(201).json({ quiz: savedQuiz });
    } catch (error) {
      console.error("Error in POST /api/quiz route:", error);
      next(error);
    }
  }
);
*/

/**
 * @route   PUT /api/quiz/:quizId
 * @desc    Update an existing quiz
 * @access  Private (Restaurant Role)
 */
router.put(
  "/:quizId",
  restrictTo("restaurant"),
  validateQuizIdParam,
  validateQuizBody, // Use same validation as create for updatable fields
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId } = req.params;
    // Extract only the fields allowed for update from the body
    const { title, menuItemIds, questions, isAvailable } = req.body;
    const updateData: Partial<IQuiz> = {};
    if (title !== undefined) updateData.title = title;
    if (menuItemIds !== undefined) updateData.menuItemIds = menuItemIds;
    if (questions !== undefined) updateData.questions = questions;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const updatedQuiz = await QuizService.updateQuiz(
        new Types.ObjectId(quizId),
        restaurantId,
        updateData // Pass only the allowed update fields
      );
      res.status(200).json({
        message: "Quiz updated successfully",
        quiz: updatedQuiz,
      });
    } catch (error) {
      console.error("Error in PUT /api/quiz/:quizId route:", error);
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/quiz/:quizId
 * @desc    Partially update a quiz (e.g., activate/deactivate)
 * @access  Private (Restaurant Role)
 */
router.patch(
  "/:quizId",
  restrictTo("restaurant"),
  validateQuizIdParam,
  validateQuizStatusUpdate, // Use the new minimal validator
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId } = req.params;
    const { isAvailable } = req.body;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    // Prepare only the fields being patched
    const updateData: Partial<IQuiz> = {};
    if (isAvailable !== undefined) {
      updateData.isAvailable = isAvailable;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return next(new AppError("No valid fields provided for update", 400));
    }

    try {
      // Use the same update service method
      const updatedQuiz = await QuizService.updateQuiz(
        new Types.ObjectId(quizId),
        restaurantId,
        updateData // Pass only the validated patch data
      );
      res.status(200).json({
        message: "Quiz status updated successfully",
        quiz: updatedQuiz,
      });
    } catch (error) {
      console.error("Error in PATCH /api/quiz/:quizId route:", error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/quiz/:quizId
 * @desc    Delete a specific quiz and results
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:quizId",
  restrictTo("restaurant"),
  validateQuizIdParam,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const result = await QuizService.deleteQuiz(
        new Types.ObjectId(quizId),
        restaurantId
      );
      res.status(200).json({
        message: "Quiz deleted successfully",
        deletedResultsCount: result.deletedResultsCount,
      });
    } catch (error) {
      console.error("Error in DELETE /api/quiz/:quizId route:", error);
      next(error);
    }
  }
);

// --- Staff Routes ---

/**
 * @route   GET /api/quiz/available
 * @desc    Get quizzes available for the logged-in staff member's restaurant
 * @access  Private (Staff Role)
 */
router.get(
  "/available",
  restrictTo("staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const quizzes = await QuizService.getAvailableQuizzesForStaff(
        restaurantId
      );
      res.status(200).json({ quizzes });
    } catch (error) {
      console.error("Error in GET /api/quiz/available route:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz/:quizId/take
 * @desc    Get quiz details for taking (no answers)
 * @access  Private (Staff Role)
 */
router.get(
  "/:quizId/take",
  restrictTo("staff"),
  validateQuizIdParam,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const quiz = await QuizService.getQuizForTaking(
        new Types.ObjectId(quizId),
        restaurantId
      );
      res.status(200).json({ quiz });
    } catch (error) {
      console.error("Error in GET /api/quiz/:quizId/take route:", error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/quiz/:quizId/submit
 * @desc    Submit quiz answers
 * @access  Private (Staff Role)
 */
router.post(
  "/:quizId/submit",
  restrictTo("staff"),
  validateSubmitAnswers,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user?.userId as mongoose.Types.ObjectId;
    const userName = req.user?.name as string;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;
    // Extract the optional cancelled flag (defaults to false if not provided)
    const cancelled = req.body.cancelled === true;

    try {
      const result = await QuizResultService.submitAnswers(
        quizId, // Pass quizId directly (service handles string/ObjectId)
        userId,
        userName,
        restaurantId,
        answers,
        cancelled // Pass the cancelled flag to the service
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in POST /api/quiz/:quizId/submit route:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz/staff-view
 * @desc    Get combined quizzes and results for logged-in staff
 * @access  Private (Staff Role)
 */
router.get(
  "/staff-view",
  restrictTo("staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId as mongoose.Types.ObjectId;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!userId || !restaurantId) {
      return next(new AppError("User or Restaurant ID missing in token", 403));
    }

    try {
      const quizzes = await QuizResultService.getStaffQuizView(
        userId,
        restaurantId
      );
      res.status(200).json({ quizzes });
    } catch (error) {
      console.error("Error in GET /api/quiz/staff-view route:", error);
      next(error);
    }
  }
);

// NEW ROUTE for generating quiz from question banks
router.post(
  "/from-banks",
  restrictTo("restaurant"),
  // TODO: Add validation middleware if one is created for this payload
  generateQuizFromBanksController
);

export { router };
