import express, { Request, Response, NextFunction } from "express";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";
import { protect } from "../middleware/authMiddleware";
import { Types } from "mongoose";
import { KnowledgeCategory } from "../models/QuestionModel";

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

/**
 * GET /api/analytics/restaurant
 * Get comprehensive analytics for the restaurant
 */
router.get(
  "/restaurant",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as any;
      const restaurantId = new Types.ObjectId(user.restaurantId);

      const analytics = await KnowledgeAnalyticsService.getRestaurantAnalytics(
        restaurantId
      );

      res.status(200).json({
        status: "success",
        data: analytics,
      });
    } catch (error) {
      console.error("Error fetching restaurant analytics:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch restaurant analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/analytics/staff/:staffId
 * Get detailed knowledge profile for a specific staff member
 */
router.get(
  "/staff/:staffId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as any;
      const { staffId } = req.params;

      const restaurantId = new Types.ObjectId(user.restaurantId);
      const userId = new Types.ObjectId(staffId);

      const profile = await KnowledgeAnalyticsService.getStaffKnowledgeProfile(
        userId,
        restaurantId
      );

      if (!profile) {
        return res.status(404).json({
          status: "error",
          message: "Staff knowledge profile not found",
        });
      }

      res.status(200).json({
        status: "success",
        data: profile,
      });
    } catch (error) {
      console.error("Error fetching staff knowledge profile:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch staff knowledge profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/analytics/category/:category
 * Get comprehensive analytics for a specific knowledge category
 */
router.get("/category/:category", async (req, res) => {
  try {
    const { user } = req as any;
    const { category } = req.params;

    // Validate category
    if (
      !Object.values(KnowledgeCategory).includes(category as KnowledgeCategory)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid knowledge category",
        validCategories: Object.values(KnowledgeCategory),
      });
    }

    const restaurantId = new Types.ObjectId(user.restaurantId);
    const knowledgeCategory = category as KnowledgeCategory;

    const categoryAnalytics =
      await KnowledgeAnalyticsService.getCategoryAnalytics(
        restaurantId,
        knowledgeCategory
      );

    res.status(200).json({
      status: "success",
      data: categoryAnalytics,
    });
  } catch (error) {
    console.error("Error fetching category analytics:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch category analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/analytics/categories
 * Get performance summary for all knowledge categories
 */
router.get("/categories", async (req, res) => {
  try {
    const { user } = req as any;
    const restaurantId = new Types.ObjectId(user.restaurantId);

    // Get analytics for all categories
    const categoriesData = await Promise.all(
      Object.values(KnowledgeCategory).map(async (category) => {
        const analytics = await KnowledgeAnalyticsService.getCategoryAnalytics(
          restaurantId,
          category
        );
        return analytics;
      })
    );

    res.status(200).json({
      status: "success",
      data: categoriesData,
    });
  } catch (error) {
    console.error("Error fetching categories analytics:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch categories analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/analytics/update-on-quiz-completion
 * Update analytics when a quiz is completed (internal API)
 */
router.post("/update-on-quiz-completion", async (req, res) => {
  try {
    const { userId, restaurantId, quizAttemptId } = req.body;

    // Validate required fields
    if (!userId || !restaurantId || !quizAttemptId) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: userId, restaurantId, quizAttemptId",
      });
    }

    await KnowledgeAnalyticsService.updateAnalyticsOnQuizCompletion(
      new Types.ObjectId(userId),
      new Types.ObjectId(restaurantId),
      new Types.ObjectId(quizAttemptId)
    );

    res.status(200).json({
      status: "success",
      message: "Analytics updated successfully",
    });
  } catch (error) {
    console.error("Error updating analytics on quiz completion:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/analytics/dashboard-summary
 * Get dashboard summary data for quick overview
 */
router.get("/dashboard-summary", async (req, res) => {
  try {
    const { user } = req as any;
    const restaurantId = new Types.ObjectId(user.restaurantId);

    const analytics = await KnowledgeAnalyticsService.getRestaurantAnalytics(
      restaurantId
    );

    // Create a summary for dashboard cards
    const summary = {
      totalStaff: analytics.totalStaff,
      totalQuestionsAnswered: analytics.totalQuestionsAnswered,
      overallAccuracy: Math.round(analytics.overallAccuracy * 10) / 10, // Round to 1 decimal

      // Category summaries
      categories: Object.entries(analytics.categoryPerformance).map(
        ([category, performance]) => ({
          category,
          accuracy: Math.round(performance.averageAccuracy * 10) / 10,
          participation: Math.round(performance.staffParticipation * 10) / 10,
          trend: performance.improvementTrend,
        })
      ),

      // Top performers (first 3)
      topPerformers: analytics.topPerformers.slice(0, 3),

      // Staff needing support count
      staffNeedingSupport: analytics.staffNeedingSupport.length,

      // Question distribution summary
      totalQuestions: Object.values(analytics.questionDistribution).reduce(
        (sum, dist) => sum + dist.totalQuestions,
        0
      ),
      aiGeneratedQuestions: Object.values(
        analytics.questionDistribution
      ).reduce((sum, dist) => sum + dist.aiGenerated, 0),
      manualQuestions: Object.values(analytics.questionDistribution).reduce(
        (sum, dist) => sum + dist.manuallyCreated,
        0
      ),

      lastUpdated: analytics.lastUpdated,
    };

    res.status(200).json({
      status: "success",
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dashboard summary",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
