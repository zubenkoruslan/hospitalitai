import express, { Request, Response, Router, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import User from "../models/User"; // Staff and Restaurant are Users
import QuizResult from "../models/QuizResult";
import Quiz from "../models/Quiz";

const router: Router = express.Router();

// --- Middleware: Apply to all routes in this file ---
router.use(protect); // Ensure user is logged in
router.use(restrictTo("restaurant")); // Ensure user is a restaurant owner

// --- Helper Functions ---

// Helper to safely get choice text from index
const getChoiceText = (
  choices: string[] | undefined,
  index: number
): string => {
  return choices && index >= 0 && index < choices.length
    ? choices[index]
    : "Invalid Choice Index";
};

// --- Routes ---

/**
 * @route   GET /api/staff
 * @desc    Get all staff members for the logged-in restaurant owner WITH quiz result summaries
 * @access  Private (Restaurant Role)
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    // Determine restaurantId (owner might have it directly or use their own userId)
    const restaurantId = req.user?.restaurantId || req.user?.userId;

    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID could not be determined for user." });
    }

    try {
      // 1. Fetch all staff members for the restaurant
      const staffList = await User.find(
        { restaurantId: restaurantId, role: "staff" },
        "_id name email createdAt"
      ).lean();

      // 2. Fetch all relevant results for this restaurant to aggregate
      const allResults = await QuizResult.find({ restaurantId: restaurantId })
        .populate({ path: "quizId", select: "title" }) // Populate quiz title for summary
        .select(
          "userId quizId score totalQuestions completedAt retakeCount status"
        ) // Select necessary fields
        .lean();

      // 3. Group results by userId for efficient mapping
      const resultsByUser = new Map<string, any[]>();
      allResults.forEach((result) => {
        const userIdStr = result.userId.toString();
        if (!resultsByUser.has(userIdStr)) {
          resultsByUser.set(userIdStr, []);
        }
        resultsByUser.get(userIdStr)?.push({
          _id: result._id,
          quizId: (result.quizId as any)?._id,
          quizTitle: (result.quizId as any)?.title || "Quiz Not Found",
          score: result.score,
          totalQuestions: result.totalQuestions,
          completedAt: result.completedAt,
          retakeCount: result.retakeCount,
          status: result.status,
        });
      });

      // 4. Combine staff with their results array
      const staffWithResults = staffList.map((staff) => {
        const staffIdStr = staff._id.toString();
        return {
          ...staff,
          results: resultsByUser.get(staffIdStr) || [], // Attach the array of result summaries
        };
      });

      res.status(200).json({ staff: staffWithResults });
    } catch (error) {
      console.error("Error fetching staff list with results:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/staff/:id
 * @desc    Get details for a specific staff member, including quiz results and analysis
 * @access  Private (Restaurant Role)
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId || req.user?.userId;
    const { id: staffId } = req.params;

    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID could not be determined for user." });
    }

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid Staff ID format." });
    }

    try {
      const staffMember = await User.findOne(
        {
          _id: new mongoose.Types.ObjectId(staffId),
          restaurantId: restaurantId,
          role: "staff",
        },
        "name email createdAt"
      ).lean();

      if (!staffMember) {
        return res.status(404).json({
          message:
            "Staff member not found or does not belong to this restaurant.",
        });
      }

      const quizResults = await QuizResult.find({
        userId: staffMember._id,
        restaurantId: restaurantId,
      })
        .populate({
          path: "quizId",
          select: "title questions", // Need questions for incorrect answer analysis
          model: Quiz,
        })
        .sort({ completedAt: -1 })
        .lean();

      const processedResults = quizResults.map((result) => {
        const incorrectQuestions: any[] = [];
        const quizData = result.quizId as any;

        if (quizData && quizData.questions && Array.isArray(result.answers)) {
          quizData.questions.forEach((question: any, index: number) => {
            const userAnswerIndex = result.answers[index];
            if (userAnswerIndex !== question.correctAnswer) {
              incorrectQuestions.push({
                questionText: question.text,
                userAnswer: getChoiceText(question.choices, userAnswerIndex),
                correctAnswer: getChoiceText(
                  question.choices,
                  question.correctAnswer
                ),
              });
            }
          });
        }

        return {
          _id: result._id,
          quizId: quizData?._id,
          quizTitle: quizData?.title || "Quiz Not Found",
          completedAt: result.completedAt,
          score: result.score,
          totalQuestions: result.totalQuestions,
          retakeCount: result.retakeCount,
          incorrectQuestions: incorrectQuestions,
        };
      });

      const responseData = {
        ...staffMember,
        quizResults: processedResults,
      };
      res.status(200).json({ staff: responseData });
    } catch (error) {
      console.error(`Error fetching staff details for ID ${staffId}:`, error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/staff/:id
 * @desc    Delete a specific staff member and their associated quiz results
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId || req.user?.userId;
    const { id: staffId } = req.params;

    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID could not be determined for user." });
    }
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid Staff ID format." });
    }

    const staffObjectId = new mongoose.Types.ObjectId(staffId);

    try {
      // 1. Find the staff user to ensure they belong to the restaurant before deleting
      const staffMember = await User.findOne(
        { _id: staffObjectId, restaurantId: restaurantId, role: "staff" },
        "_id" // Only need the ID for verification
      ).lean();

      if (!staffMember) {
        return res
          .status(404)
          .json({
            message:
              "Staff member not found or does not belong to this restaurant.",
          });
      }

      // 2. Delete the staff user
      const deleteUserResult = await User.deleteOne({ _id: staffObjectId });

      if (deleteUserResult.deletedCount === 0) {
        // Should not happen if findOne succeeded, but good practice to check
        return res
          .status(404)
          .json({ message: "Staff member could not be deleted." });
      }

      // 3. Delete associated quiz results (optional, but good for cleanup)
      await QuizResult.deleteMany({
        userId: staffObjectId,
        restaurantId: restaurantId,
      });

      res.status(200).json({ message: "Staff member deleted successfully." });
    } catch (error) {
      console.error(`Error deleting staff member with ID ${staffId}:`, error);
      next(error);
    }
  }
);

export default router;
