import express, { Request, Response, NextFunction } from "express";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";
import { protect } from "../middleware/authMiddleware";
import { Types } from "mongoose";
import { KnowledgeCategory } from "../models/QuestionModel";
import ReportGenerationService from "../services/reportGenerationService";
import UserModel from "../models/User";
import QuizAttemptModel from "../models/QuizAttempt";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import {
  getEnhancedRestaurantAnalytics,
  getIndividualStaffAnalytics,
  getLeaderboards,
} from "../controllers/analyticsController";

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
 * Enhanced for Phase 5 - individual staff dashboard
 */
router.get("/staff/:staffId", getIndividualStaffAnalytics);

// Note: /leaderboards endpoint is defined later in this file with proper implementation

/**
 * GET /api/analytics/category/:category
 * Get comprehensive analytics for a specific knowledge category
 */
router.get(
  "/category/:category",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = req as any;
      const { category } = req.params;

      // Validate category
      if (
        !Object.values(KnowledgeCategory).includes(
          category as KnowledgeCategory
        )
      ) {
        res.status(400).json({
          status: "error",
          message: "Invalid knowledge category",
          validCategories: Object.values(KnowledgeCategory),
        });
        return;
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
  }
);

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
router.post(
  "/update-on-quiz-completion",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, restaurantId, quizAttemptId } = req.body;

      // Validate required fields
      if (!userId || !restaurantId || !quizAttemptId) {
        res.status(400).json({
          status: "error",
          message:
            "Missing required fields: userId, restaurantId, quizAttemptId",
        });
        return;
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
  }
);

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

/**
 * POST /api/analytics/generate-report
 * Generate PDF or HTML reports for analytics data
 * Body: { reportType, category?, timeframe?, format? }
 */
router.post(
  "/generate-report",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as any;
      const { reportType, category, timeframe, format = "pdf" } = req.body;

      if (!reportType) {
        res.status(400).json({
          status: "error",
          message: "reportType is required",
        });
        return;
      }

      const validReportTypes = ["comprehensive", "category", "comparative"];
      if (!validReportTypes.includes(reportType)) {
        res.status(400).json({
          status: "error",
          message:
            "Invalid report type. Must be one of: comprehensive, category, comparative",
        });
        return;
      }

      if (reportType === "category" && !category) {
        res.status(400).json({
          status: "error",
          message: "category is required for category reports",
        });
        return;
      }

      if (
        category &&
        !Object.values(KnowledgeCategory).includes(
          category as KnowledgeCategory
        )
      ) {
        res.status(400).json({
          status: "error",
          message: "Invalid knowledge category",
          validCategories: Object.values(KnowledgeCategory),
        });
        return;
      }

      const restaurantId = new Types.ObjectId(user.restaurantId);

      const reportOptions = {
        restaurantId,
        reportType,
        category: category as KnowledgeCategory,
        timeframe: timeframe || "month",
        format,
      };

      const report = await ReportGenerationService.generateReport(
        reportOptions
      );

      if (format === "html") {
        res.setHeader("Content-Type", "text/html");
        res.send(report);
      } else {
        // PDF format
        const filename = `${reportType}-analytics-report-${
          new Date().toISOString().split("T")[0]
        }.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        res.setHeader("Content-Length", (report as Buffer).length.toString());

        res.send(report);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to generate report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// PHASE 5: ADVANCED ANALYTICS ENDPOINTS

/**
 * GET /api/analytics/time-range
 * Get analytics for a custom time range
 * Query params: startDate, endDate (ISO date strings)
 */
router.get(
  "/time-range",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as any;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          status: "error",
          message: "Both startDate and endDate query parameters are required",
        });
        return;
      }

      const restaurantId = new Types.ObjectId(user.restaurantId);
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          status: "error",
          message: "Invalid date format. Please use ISO date strings.",
        });
        return;
      }

      if (start >= end) {
        res.status(400).json({
          status: "error",
          message: "Start date must be before end date",
        });
        return;
      }

      const analytics = await KnowledgeAnalyticsService.getTimeRangeAnalytics(
        restaurantId,
        start,
        end
      );

      res.status(200).json({
        status: "success",
        data: analytics,
      });
    } catch (error) {
      console.error("Error fetching time range analytics:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch time range analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/analytics/comparative
 * Get comparative analytics between time periods
 * Query params: timeframe ("week" | "month" | "quarter" | "year")
 */
router.get(
  "/comparative",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as any;
      const { timeframe = "month" } = req.query;

      const validTimeframes = ["week", "month", "quarter", "year"];
      if (!validTimeframes.includes(timeframe as string)) {
        res.status(400).json({
          status: "error",
          message:
            "Invalid timeframe. Must be one of: week, month, quarter, year",
        });
        return;
      }

      const restaurantId = new Types.ObjectId(user.restaurantId);

      const analytics = await KnowledgeAnalyticsService.getComparativeAnalytics(
        restaurantId,
        timeframe as "week" | "month" | "quarter" | "year"
      );

      res.status(200).json({
        status: "success",
        data: analytics,
      });
    } catch (error) {
      console.error("Error fetching comparative analytics:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch comparative analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/analytics/predictive-insights
 * Get predictive insights and recommendations
 */
router.get(
  "/predictive-insights",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as any;
      const restaurantId = new Types.ObjectId(user.restaurantId);

      const insights = await KnowledgeAnalyticsService.getPredictiveInsights(
        restaurantId
      );

      res.status(200).json({
        status: "success",
        data: insights,
      });
    } catch (error) {
      console.error("Error fetching predictive insights:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch predictive insights",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/analytics/performance-trends
 * Get performance trends over time with granular data points
 * Query params: category?, days? (default 30)
 */
router.get(
  "/performance-trends",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as any;
      const { category, days = "30" } = req.query;
      const restaurantId = new Types.ObjectId(user.restaurantId);

      // Validate category if provided
      if (
        category &&
        !Object.values(KnowledgeCategory).includes(
          category as KnowledgeCategory
        )
      ) {
        res.status(400).json({
          status: "error",
          message: "Invalid knowledge category",
          validCategories: Object.values(KnowledgeCategory),
        });
        return;
      }

      const daysNum = parseInt(days as string);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        res.status(400).json({
          status: "error",
          message: "Days must be a number between 1 and 365",
        });
        return;
      }

      // Generate trend data points
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - daysNum * 24 * 60 * 60 * 1000
      );

      // For simplicity, we'll generate weekly data points
      const trendData = [];
      const intervalDays = Math.max(1, Math.floor(daysNum / 10)); // Up to 10 data points

      for (let i = 0; i < daysNum; i += intervalDays) {
        const periodStart = new Date(
          startDate.getTime() + i * 24 * 60 * 60 * 1000
        );
        const periodEnd = new Date(
          Math.min(
            periodStart.getTime() + intervalDays * 24 * 60 * 60 * 1000,
            endDate.getTime()
          )
        );

        const periodAnalytics =
          await KnowledgeAnalyticsService.getTimeRangeAnalytics(
            restaurantId,
            periodStart,
            periodEnd
          );

        trendData.push({
          date: periodStart.toISOString().split("T")[0],
          ...periodAnalytics,
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          category: category || "all",
          period: `${daysNum} days`,
          dataPoints: trendData,
        },
      });
    } catch (error) {
      console.error("Error fetching performance trends:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch performance trends",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/analytics/leaderboards
 * Get leaderboard data for different metrics
 * Enhanced for Phase 5 - leaderboards page
 * Query params: timePeriod? ("week" | "month" | "all"), limit? (default 10)
 */
router.get(
  "/leaderboards",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as any;
      const { timePeriod = "all", limit = "10" } = req.query;
      const restaurantId = new Types.ObjectId(user.restaurantId);

      // Validate time period
      const validTimePeriods = ["week", "month", "all"];
      if (!validTimePeriods.includes(timePeriod as string)) {
        res.status(400).json({
          status: "error",
          message: "Invalid time period. Must be one of: week, month, all",
        });
        return;
      }

      // Get all staff with analytics data for this restaurant
      const analyticsData = await UserKnowledgeAnalyticsModel.find({
        restaurantId,
      }).populate("userId", "name email assignedRoleId");

      // Get user role information
      const usersWithRoles = await Promise.all(
        analyticsData.map(async (analytics) => {
          const userDetails = await UserModel.findById(
            analytics.userId._id
          ).populate("assignedRoleId", "name");
          return {
            ...analytics.toObject(),
            userDetails,
          };
        })
      );

      // Calculate Top Performers (based on overall accuracy with minimum questions threshold)
      const topPerformers = usersWithRoles
        .filter((analytics) => analytics.totalQuestionsAnswered >= 10) // Minimum 10 questions
        .sort((a, b) => b.overallAccuracy - a.overallAccuracy)
        .slice(0, 10)
        .map((analytics, index) => ({
          rank: index + 1,
          userId: analytics.userId._id.toString(),
          name: (analytics.userId as any).name,
          roleName:
            (analytics.userDetails?.assignedRoleId as any)?.name || "Staff",
          overallAccuracy: analytics.overallAccuracy,
          totalQuestions: analytics.totalQuestionsAnswered,
          completionTime: analytics.averageQuizCompletionTime || 0,
        }));

      // Calculate Category Champions
      const categories = [
        "foodKnowledge",
        "beverageKnowledge",
        "wineKnowledge",
        "proceduresKnowledge",
      ];
      const categoryChampions: any = {};

      categories.forEach((category) => {
        const categoryKey = category.replace("Knowledge", "-knowledge");
        const champion = usersWithRoles
          .filter(
            (analytics: any) =>
              analytics[category]?.totalQuestions >= 5 && // Minimum 5 questions in category
              analytics[category]?.accuracy > 0
          )
          .sort(
            (a: any, b: any) => b[category].accuracy - a[category].accuracy
          )[0];

        if (champion) {
          const championAny = champion as any;
          categoryChampions[category] = {
            userId: championAny.userId._id.toString(),
            name: championAny.userId.name,
            roleName: championAny.userDetails?.assignedRoleId?.name || "Staff",
            averageScore: championAny[category].accuracy, // Changed from 'accuracy' to 'averageScore'
            totalQuestions: championAny[category].totalQuestions,
            averageCompletionTime:
              championAny[category].averageCompletionTime > 0
                ? championAny[category].averageCompletionTime
                : undefined,
          };
        } else {
          categoryChampions[category] = null;
        }
      });

      const leaderboards = {
        timePeriod,
        topPerformers,
        categoryChampions,
        lastUpdated: new Date().toISOString(),
      };

      res.status(200).json({
        status: "success",
        data: leaderboards,
      });
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch leaderboards",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/analytics/restaurant/enhanced
 * Get enhanced restaurant overview analytics
 * Enhanced for Phase 5 - restaurant overview dashboard
 */
router.get("/restaurant/enhanced", protect, getEnhancedRestaurantAnalytics);

export default router;
