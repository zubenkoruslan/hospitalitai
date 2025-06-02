import express, { Request, Response } from "express";
import User from "../models/User";
import QuizAttempt from "../models/QuizAttempt";
import QuestionModel from "../models/QuestionModel";
import QuizModel from "../models/QuizModel";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";

const router = express.Router();

/**
 * GET /api/debug/database-stats
 * Debug endpoint to check what data exists in the database
 */
router.get("/database-stats", async (req: Request, res: Response) => {
  try {
    const stats = {
      users: {
        total: await User.countDocuments(),
        restaurants: await User.countDocuments({ role: "restaurant" }),
        staff: await User.countDocuments({ role: "staff" }),
      },
      quizzes: {
        total: await QuizModel.countDocuments(),
      },
      questions: {
        total: await QuestionModel.countDocuments(),
        withKnowledgeCategories: await QuestionModel.countDocuments({
          knowledgeCategory: { $exists: true },
        }),
        categoryBreakdown: await QuestionModel.aggregate([
          { $match: { knowledgeCategory: { $exists: true } } },
          { $group: { _id: "$knowledgeCategory", count: { $sum: 1 } } },
        ]),
      },
      quizAttempts: {
        total: await QuizAttempt.countDocuments(),
        byRestaurant: await QuizAttempt.aggregate([
          { $group: { _id: "$restaurantId", count: { $sum: 1 } } },
        ]),
      },
      analytics: {
        total: await UserKnowledgeAnalyticsModel.countDocuments(),
        withData: await UserKnowledgeAnalyticsModel.countDocuments({
          totalQuestionsAnswered: { $gt: 0 },
        }),
      },
    };

    // Get sample data
    const sampleRestaurant = await User.findOne({ role: "restaurant" });
    const sampleQuizAttempt = await QuizAttempt.findOne().populate({
      path: "questionsPresented.questionId",
      select: "knowledgeCategory questionText",
    });

    res.status(200).json({
      status: "success",
      data: {
        stats,
        samples: {
          restaurant: sampleRestaurant
            ? {
                id: sampleRestaurant.restaurantId,
                name: sampleRestaurant.name,
                email: sampleRestaurant.email,
              }
            : null,
          quizAttempt: sampleQuizAttempt
            ? {
                id: sampleQuizAttempt._id,
                staffUserId: sampleQuizAttempt.staffUserId,
                restaurantId: sampleQuizAttempt.restaurantId,
                questionsCount: sampleQuizAttempt.questionsPresented.length,
                score: sampleQuizAttempt.score,
                questionsWithCategories:
                  sampleQuizAttempt.questionsPresented.filter(
                    (q: any) => q.questionId?.knowledgeCategory
                  ).length,
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("Error in database stats endpoint:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get database stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/debug/quiz-attempts-analysis
 * Debug endpoint to analyze quiz attempts and their question categories
 */
router.get("/quiz-attempts-analysis", async (req: Request, res: Response) => {
  try {
    // Get all quiz attempts with populated question data
    const quizAttempts = await QuizAttempt.find({})
      .populate({
        path: "questionsPresented.questionId",
        select: "knowledgeCategory questionText",
      })
      .lean();

    const analysis = {
      totalAttempts: quizAttempts.length,
      attemptsByUser: {} as any,
      categoriesInAttempts: {} as any,
    };

    // Analyze each attempt
    quizAttempts.forEach((attempt) => {
      const userId = attempt.staffUserId.toString();

      if (!analysis.attemptsByUser[userId]) {
        analysis.attemptsByUser[userId] = {
          totalAttempts: 0,
          totalQuestions: 0,
          categoriesAnswered: {} as any,
        };
      }

      analysis.attemptsByUser[userId].totalAttempts++;
      analysis.attemptsByUser[userId].totalQuestions +=
        attempt.questionsPresented.length;

      // Analyze questions in this attempt
      attempt.questionsPresented.forEach((questionAttempt: any) => {
        const question = questionAttempt.questionId;
        if (question && question.knowledgeCategory) {
          const category = question.knowledgeCategory;

          // Track categories across all attempts
          if (!analysis.categoriesInAttempts[category]) {
            analysis.categoriesInAttempts[category] = {
              totalQuestions: 0,
              totalCorrect: 0,
              inAttempts: 0,
            };
          }
          analysis.categoriesInAttempts[category].totalQuestions++;
          analysis.categoriesInAttempts[category].inAttempts++;
          if (questionAttempt.isCorrect) {
            analysis.categoriesInAttempts[category].totalCorrect++;
          }

          // Track categories by user
          if (!analysis.attemptsByUser[userId].categoriesAnswered[category]) {
            analysis.attemptsByUser[userId].categoriesAnswered[category] = {
              totalQuestions: 0,
              correctAnswers: 0,
            };
          }
          analysis.attemptsByUser[userId].categoriesAnswered[category]
            .totalQuestions++;
          if (questionAttempt.isCorrect) {
            analysis.attemptsByUser[userId].categoriesAnswered[category]
              .correctAnswers++;
          }
        }
      });
    });

    // Get analytics data for comparison
    const analyticsRecords = await UserKnowledgeAnalyticsModel.find({}).lean();

    res.status(200).json({
      status: "success",
      data: {
        analysis,
        analyticsRecords: analyticsRecords.map((record) => ({
          userId: record.userId,
          totalQuestionsAnswered: record.totalQuestionsAnswered,
          overallAccuracy: record.overallAccuracy,
          categories: {
            foodKnowledge: {
              totalQuestions: record.foodKnowledge.totalQuestions,
              accuracy: record.foodKnowledge.accuracy,
            },
            beverageKnowledge: {
              totalQuestions: record.beverageKnowledge.totalQuestions,
              accuracy: record.beverageKnowledge.accuracy,
            },
            wineKnowledge: {
              totalQuestions: record.wineKnowledge.totalQuestions,
              accuracy: record.wineKnowledge.accuracy,
            },
            proceduresKnowledge: {
              totalQuestions: record.proceduresKnowledge.totalQuestions,
              accuracy: record.proceduresKnowledge.accuracy,
            },
          },
        })),
      },
    });
  } catch (error) {
    console.error("Error in quiz attempts analysis endpoint:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to analyze quiz attempts",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
