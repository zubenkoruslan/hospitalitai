import express, { Request, Response, Router, NextFunction } from "express";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import Quiz, { IQuiz } from "../models/Quiz";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import mongoose from "mongoose";

const router: Router = express.Router();

// Extend Express Request interface
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    restaurantId?: string;
  };
}

// === Middleware ===
router.use(authenticateToken); // All result routes require auth

// === Routes ===

/**
 * @route   POST /api/results/start/:quizId
 * @desc    Start a quiz attempt for the logged-in staff user
 * @access  Private (Staff Role)
 */
router.post(
  "/start/:quizId",
  authorizeRole(["staff"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { quizId } = req.params;
    const userId = req.user?.userId;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      res.status(400).json({ message: "Invalid Quiz ID" });
      return;
    }
    if (!userId || !restaurantId) {
      res
        .status(400)
        .json({ message: "User or Restaurant ID not found in token" });
      return;
    }

    try {
      // Check if the quiz exists and belongs to the user's restaurant
      const quiz = await Quiz.findOne({ _id: quizId, restaurantId });
      if (!quiz) {
        res.status(404).json({
          message: "Quiz not found or not available for this restaurant",
        });
        return;
      }

      // Check if an attempt already exists (or is in progress)
      // Add logic here based on whether re-takes are allowed or if only one in-progress is permitted
      const existingAttempt = await QuizResult.findOne({
        quizId,
        userId,
        // status: { $ne: 'completed' } // Example: prevent starting if already completed/in-progress
      });

      if (existingAttempt) {
        // Depending on rules, could return existing attempt or an error
        res.status(409).json({
          message: "Quiz attempt already exists or is in progress",
          attemptId: existingAttempt._id,
        });
        return;
      }

      // Create a new QuizResult record
      const newAttempt = new QuizResult({
        quizId,
        userId,
        restaurantId,
        answers: [],
        score: 0, // Initial score
        totalQuestions: quiz.questions.length,
        status: "inProgress", // Set status to inProgress
        startedAt: new Date(),
      });

      await newAttempt.save();

      // Return the attempt ID and maybe the quiz questions (or just ID to fetch separately)
      res.status(201).json({
        message: "Quiz attempt started",
        attemptId: newAttempt._id,
        // Optionally return quiz details needed to start taking it
        // quizData: { title: quiz.title, questions: quiz.questions } // Be careful about sending correct answers
      });
    } catch (error: any) {
      console.error("Error starting quiz attempt:", error);
      if (error.name === "ValidationError") {
        res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        next(error);
      }
    }
  }
);

/**
 * @route   POST /api/results/submit/:attemptId
 * @desc    Submit answers for a quiz attempt
 * @access  Private (Staff Role)
 */
router.post(
  "/submit/:attemptId",
  authorizeRole(["staff"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { attemptId } = req.params;
    const { answers } = req.body; // Expecting array: [{ questionId: string, answerGiven: string }]
    const userId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      res.status(400).json({ message: "Invalid Attempt ID" });
      return;
    }
    if (!userId) {
      res.status(400).json({ message: "User ID not found in token" });
      return;
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      res
        .status(400)
        .json({ message: "Answers array is required and cannot be empty" });
      return;
    }

    try {
      // Find the attempt, ensure it belongs to the user and is in progress
      const attempt = await QuizResult.findOne({
        _id: attemptId,
        userId,
        status: "inProgress",
      });

      if (!attempt) {
        res.status(404).json({
          message: "Quiz attempt not found, not yours, or already completed",
        });
        return;
      }

      // Fetch the original quiz to get correct answers
      const quiz = await Quiz.findById(attempt.quizId);
      if (!quiz) {
        res
          .status(404)
          .json({ message: "Original quiz not found for this attempt" });
        return;
      }

      // --- Score Calculation ---
      let score = 0;
      const processedAnswers: IQuizResult["answers"] = [];

      // Create a map for quick lookup of correct answers
      const correctAnswersMap = new Map<string, string>();
      quiz.questions.forEach((q) => {
        if (q._id) {
          // Ensure question subdocument has an ID
          correctAnswersMap.set(q._id.toString(), q.correctAnswer);
        }
      });

      for (const userAnswer of answers) {
        if (!userAnswer.questionId || userAnswer.answerGiven === undefined) {
          // Optionally skip invalid answer submissions or return error
          console.warn("Skipping invalid answer format:", userAnswer);
          continue;
        }

        const questionIdStr = userAnswer.questionId.toString();
        const correctAnswer = correctAnswersMap.get(questionIdStr);
        const isCorrect =
          correctAnswer !== undefined &&
          userAnswer.answerGiven === correctAnswer;

        if (isCorrect) {
          score++;
        }

        processedAnswers.push({
          questionId: new mongoose.Types.ObjectId(userAnswer.questionId),
          answerGiven: userAnswer.answerGiven,
          isCorrect: isCorrect,
        });
      }
      // -----------------------

      // Update the attempt
      attempt.answers = processedAnswers;
      attempt.score = score;
      attempt.status = "completed";
      attempt.completedAt = new Date();
      attempt.totalQuestions = quiz.questions.length; // Update in case quiz changed (though ideally it shouldn't)

      await attempt.save();

      // Return final result/score
      res.status(200).json({
        message: "Quiz submitted successfully",
        attemptId: attempt._id,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
      });
    } catch (error: any) {
      console.error("Error submitting quiz attempt:", error);
      if (error.name === "ValidationError") {
        res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        next(error);
      }
    }
  }
);

/**
 * @route   GET /api/results
 * @desc    Get results (all for restaurant, own for staff)
 * @access  Private (Restaurant or Staff)
 */
router.get(
  "/",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    const restaurantId = req.user?.restaurantId;

    if (!userId || !userRole || !restaurantId) {
      res.status(400).json({ message: "User details not found in token" });
      return;
    }

    try {
      let query = {};
      if (userRole === "restaurant") {
        // Restaurant managers see all results for their restaurant
        query = { restaurantId };
      } else if (userRole === "staff") {
        // Staff see only their own results
        query = { userId, restaurantId };
      } else {
        res.status(403).json({ message: "Unauthorized role" }); // Should not happen
        return;
      }

      const results = await QuizResult.find(query)
        .populate("quizId", "title description") // Populate quiz title
        .populate("userId", "name email"); // Populate user name/email
      // Exclude detailed answers from list view?
      // .select('-answers');

      res.json(results);
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/results/:resultId
 * @desc    Get a single quiz result by its ID (with answers)
 * @access  Private (Owner of result or Restaurant Manager)
 */
router.get(
  "/:resultId",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { resultId } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      res.status(400).json({ message: "Invalid Result ID format" });
      return;
    }
    if (!userId || !userRole || !restaurantId) {
      res.status(400).json({ message: "User details not found in token" });
      return;
    }

    try {
      const result = await QuizResult.findById(resultId)
        .populate("quizId", "title description") // Populate quiz details
        .populate("userId", "name email"); // Populate user details

      if (!result) {
        res.status(404).json({ message: "Quiz result not found" });
        return;
      }

      // Authorization check: User must own the result OR be a manager of the restaurant
      if (
        result.userId.toString() !== userId &&
        (userRole !== "restaurant" ||
          result.restaurantId.toString() !== restaurantId)
      ) {
        res.status(403).json({
          message: "Forbidden: You do not have permission to view this result",
        });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching single quiz result:", error);
      next(error);
    }
  }
);

export default router;
