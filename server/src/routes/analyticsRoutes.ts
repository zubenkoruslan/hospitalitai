import express, { Request, Response, NextFunction } from "express";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";
import { protect } from "../middleware/authMiddleware";
import { Types } from "mongoose";
import { KnowledgeCategory } from "../models/QuestionModel";
import ReportGenerationService from "../services/reportGenerationService";

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
        res.status(404).json({
          status: "error",
          message: "Staff knowledge profile not found",
        });
        return;
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

export default router;
