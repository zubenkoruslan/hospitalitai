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
        "_id name email createdAt" // Select necessary staff fields
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
        if (!resultsByUser.has(userIdStr)) {
          resultsByUser.set(userIdStr, []);
        }
        // Format result slightly before adding
        resultsByUser.get(userIdStr)?.push({
          _id: result._id,
          quizId: (result.quizId as any)?._id,
          quizTitle: (result.quizId as any)?.title || "Quiz Not Found",
          score: result.score,
          totalQuestions: result.totalQuestions,
          completedAt: result.completedAt,
          status: result.status,
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

export default router;
