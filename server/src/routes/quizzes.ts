import express, { Request, Response, Router, NextFunction } from "express";
import Quiz, { IQuiz } from "../models/Quiz";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import mongoose from "mongoose";

const router: Router = express.Router();

// Extend Express Request interface to include user from auth middleware
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    restaurantId?: string;
  };
}

// === Middleware specific to this router ===
router.use(authenticateToken); // All quiz routes require authentication

// === Routes ===

/**
 * @route   POST /api/quizzes
 * @desc    Create a new quiz
 * @access  Private (Restaurant Role)
 */
router.post(
  "/",
  authorizeRole(["restaurant"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { title, description, associatedMenus, questions } = req.body;
    const restaurantId = req.user?.restaurantId;
    const createdBy = req.user?.userId;

    if (
      !title ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      res
        .status(400)
        .json({ message: "Title and at least one question are required" });
      return;
    }
    if (!restaurantId || !createdBy) {
      res
        .status(400)
        .json({ message: "User restaurant or ID not found in token" });
      return;
    }

    try {
      const newQuizData: Partial<IQuiz> = {
        title,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        createdBy: new mongoose.Types.ObjectId(createdBy),
        questions,
      };
      if (description) newQuizData.description = description;
      if (associatedMenus && Array.isArray(associatedMenus)) {
        // Ensure IDs are valid ObjectIds
        newQuizData.associatedMenus = associatedMenus
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
      }

      const quiz = new Quiz(newQuizData);
      await quiz.save();
      res.status(201).json(quiz);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        res
          .status(400)
          .json({ message: "Quiz validation failed", errors: error.errors });
      } else {
        console.error("Error creating quiz:", error);
        next(error);
      }
    }
  }
);

/**
 * @route   GET /api/quizzes
 * @desc    Get all quizzes for the user's restaurant
 * @access  Private (Restaurant or Staff)
 */
router.get(
  "/",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      // Exclude questions array from list view for brevity?
      const quizzes = await Quiz.find({ restaurantId }).select("-questions"); // Example: exclude questions
      // Or include everything: const quizzes = await Quiz.find({ restaurantId });
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/quizzes/:quizId
 * @desc    Get a single quiz by ID (including questions)
 * @access  Private (Restaurant or Staff)
 */
router.get(
  "/:quizId",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { quizId } = req.params;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      res.status(400).json({ message: "Invalid Quiz ID format" });
      return;
    }
    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      const quiz = await Quiz.findOne({ _id: quizId, restaurantId });

      if (!quiz) {
        res.status(404).json({ message: "Quiz not found or access denied" });
        return;
      }
      res.json(quiz);
    } catch (error) {
      console.error("Error fetching single quiz:", error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/quizzes/:quizId
 * @desc    Update a quiz
 * @access  Private (Restaurant Role)
 */
router.put(
  "/:quizId",
  authorizeRole(["restaurant"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { quizId } = req.params;
    const { title, description, associatedMenus, questions } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      res.status(400).json({ message: "Invalid Quiz ID format" });
      return;
    }
    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    const updateData: Partial<IQuiz> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (associatedMenus !== undefined && Array.isArray(associatedMenus)) {
      updateData.associatedMenus = associatedMenus
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    } else if (associatedMenus !== undefined) {
      // Handle case where it's provided but not an array (e.g., clear it)
      updateData.associatedMenus = [];
    }
    // Replace questions array entirely
    if (questions !== undefined && Array.isArray(questions)) {
      updateData.questions = questions;
    } else if (questions !== undefined) {
      res.status(400).json({ message: "Questions must be an array" });
      return;
    }

    try {
      const updatedQuiz = await Quiz.findOneAndUpdate(
        { _id: quizId, restaurantId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedQuiz) {
        res.status(404).json({ message: "Quiz not found or access denied" });
        return;
      }
      res.json(updatedQuiz);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        res
          .status(400)
          .json({ message: "Quiz validation failed", errors: error.errors });
      } else {
        console.error("Error updating quiz:", error);
        next(error);
      }
    }
  }
);

/**
 * @route   DELETE /api/quizzes/:quizId
 * @desc    Delete a quiz
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:quizId",
  authorizeRole(["restaurant"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { quizId } = req.params;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      res.status(400).json({ message: "Invalid Quiz ID format" });
      return;
    }
    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      // TODO: Consider implications - delete related QuizResults?
      const result = await Quiz.deleteOne({ _id: quizId, restaurantId });

      if (result.deletedCount === 0) {
        res.status(404).json({ message: "Quiz not found or access denied" });
        return;
      }
      res.status(200).json({ message: "Quiz deleted successfully" });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      next(error);
    }
  }
);

// TODO: Add routes for assigning quizzes and retrieving results (likely in a separate results route)

export default router;
