import express, { Request, Response, Router, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import QuizResult from "../models/QuizResult"; // Import the QuizResult model
import User from "../models/User"; // Need User model to populate staff name
import Quiz from "../models/Quiz"; // Need Quiz model to populate quiz title

const router: Router = express.Router();

// === Middleware ===
router.use(protect); // All results routes require login

/**
 * @route   GET /api/results/restaurant-view
 * @desc    Get all quiz results for staff belonging to the logged-in restaurant owner
 * @access  Private (Restaurant Role)
 */
router.get(
  "/restaurant-view",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      return res
        .status(400)
        .json({ message: "Restaurant ID not found for user" });
    }

    try {
      // 1. Fetch all staff members for the restaurant
      const staffMembers = await User.find(
        { restaurantId: restaurantId, role: "staff" },
        "_id name email createdAt professionalRole" // Added professionalRole
      ).lean();

      // 2. Fetch all results for this restaurant
      const results = await QuizResult.find({ restaurantId: restaurantId })
        .populate({
          path: "quizId",
          select: "title", // Select the title from the Quiz model
        })
        // Do not populate userId here, we'll group manually
        .sort({ completedAt: -1 }); // Sort by most recent first

      // +++. Fetch total number of quizzes for the restaurant
      const totalAvailableQuizzes = await Quiz.countDocuments({
        restaurantId: restaurantId,
      });

      // 3. Group results by userId
      const resultsByUser = new Map<string, any[]>();
      results.forEach((result) => {
        const userIdStr = result.userId.toString();
        // Skip results where the quiz is deleted (quizId doesn't resolve to a document)
        if (!result.quizId) {
          console.log(`Skipping result ${result._id} with deleted quiz`);
          return;
        }

        if (!resultsByUser.has(userIdStr)) {
          resultsByUser.set(userIdStr, []);
        }
        // Format result slightly before adding
        resultsByUser.get(userIdStr)?.push({
          _id: result._id,
          quizId: (result.quizId as any)?._id,
          quizTitle: (result.quizId as any)?.title,
          score: result.score,
          totalQuestions: result.totalQuestions,
          completedAt: result.completedAt,
          // Capitalize the status to match frontend expectations
          status:
            result.status.charAt(0).toUpperCase() + result.status.slice(1),
          retakeCount: result.retakeCount,
        });
      });

      // 4. Combine staff with their results
      const staffWithResults = staffMembers.map((staff) => {
        const staffIdStr = staff._id.toString();
        return {
          ...staff, // Include all staff member fields (_id, name, email, createdAt)
          results: resultsByUser.get(staffIdStr) || [], // Assign results array (empty if none)
        };
      });

      // Return the combined list of staff members AND the total quiz count
      res.status(200).json({
        staff: staffWithResults,
        totalAvailableQuizzes: totalAvailableQuizzes,
      });
    } catch (error) {
      console.error("Error fetching staff quiz results for restaurant:", error);
      next(error); // Pass error to the global error handler
    }
  }
);

/**
 * @route   GET /api/results/my-results
 * @desc    Get all quiz results for the logged-in staff member
 * @access  Private (Staff Role)
 */
router.get(
  "/my-results",
  restrictTo("staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    // Use req.user.userId from the AuthPayload interface
    const userId = req.user?.userId;

    if (!userId) {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      // If user exists but userId doesn't (shouldn't happen with valid token)
      return res
        .status(400)
        .json({ message: "User ID not found in token payload" });
    }

    try {
      const results = await QuizResult.find({ userId: userId })
        .populate({
          path: "quizId",
          select: "title settings.allowRetake", // Select title and retake setting
        })
        .sort({ completedAt: -1 }); // Sort by most recent first

      // Map results to include the canRetake flag based on quiz settings
      // Filter out results where the quiz no longer exists
      const formattedResults = results
        .filter((result) => result.quizId) // Skip results where quiz doesn't exist
        .map((result) => {
          const quiz = result.quizId as any; // Cast for easier access
          const canRetakeSetting = quiz?.settings?.allowRetake ?? false; // Default to false if setting missing

          // Ensure consistent status comparison (assuming DB uses lowercase)
          const isCompleted = result.status === "completed";

          return {
            _id: result._id,
            quizId: quiz?._id, // Use populated quiz ID
            quizTitle: quiz?.title,
            score: result.score,
            totalQuestions: result.totalQuestions,
            completedAt: result.completedAt,
            // Ensure the status sent back matches frontend expectations (e.g., capitalized)
            status:
              result.status.charAt(0).toUpperCase() + result.status.slice(1),
            retakeCount: result.retakeCount,
            // Only allow retake if quiz setting allows AND result is completed
            canRetake: canRetakeSetting && isCompleted,
          };
        });

      res.status(200).json({ results: formattedResults });
    } catch (error) {
      console.error("Error fetching quiz results for staff:", error);
      next(error); // Pass error to the global error handler
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
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { resultId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    try {
      // Validate resultId
      if (!mongoose.Types.ObjectId.isValid(resultId)) {
        return res.status(400).json({ message: "Invalid result ID format" });
      }

      // Find the quiz result
      const result = await QuizResult.findById(resultId).populate({
        path: "quizId",
        select: "title questions", // We need questions to compare with user answers
      });

      if (!result) {
        return res.status(404).json({ message: "Quiz result not found" });
      }

      // Security check: Staff can only view their own results
      // Restaurant owners can view results for their restaurant
      if (
        userRole === "staff" &&
        result.userId.toString() !== userId.toString()
      ) {
        return res.status(403).json({
          message: "You are not authorized to view this result",
        });
      }

      // Get the quiz from the populated result
      const quiz = result.quizId as any;

      if (!quiz) {
        return res.status(404).json({
          message: "The quiz associated with this result no longer exists",
        });
      }

      // Process the result to include question text, user answers, and correct answers
      const detailedResult = {
        _id: result._id,
        quizId: quiz._id,
        quizTitle: quiz.title,
        score: result.score,
        totalQuestions: result.totalQuestions,
        completedAt: result.completedAt,
        status: result.status.charAt(0).toUpperCase() + result.status.slice(1),
        retakeCount: result.retakeCount,
        questions: quiz.questions.map((question: any, index: number) => {
          const userAnswer = result.answers[index];
          return {
            text: question.text,
            choices: question.choices,
            userAnswerIndex: userAnswer,
            userAnswer: question.choices[userAnswer],
            correctAnswerIndex: question.correctAnswer,
            correctAnswer: question.choices[question.correctAnswer],
            isCorrect: userAnswer === question.correctAnswer,
          };
        }),
      };

      res.status(200).json({ result: detailedResult });
    } catch (error) {
      console.error("Error fetching detailed quiz result:", error);
      next(error);
    }
  }
);

export default router;
