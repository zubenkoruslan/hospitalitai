import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import Restaurant from "../models/Restaurant";
import QuizResult from "../models/QuizResult";
import QuizModel from "../models/QuizModel";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel";

// Simple in-memory cache for analytics data
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const analyticsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache utility functions
const getCacheKey = (endpoint: string, params?: any): string => {
  const paramString = params ? JSON.stringify(params) : "";
  return `${endpoint}:${paramString}`;
};

const getFromCache = (key: string): any | null => {
  const entry = analyticsCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    analyticsCache.delete(key);
    return null;
  }

  return entry.data;
};

const setCache = (key: string, data: any, ttl: number = CACHE_TTL): void => {
  analyticsCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

// Clear cache for specific patterns
const clearCachePattern = (pattern: string): void => {
  for (const key of analyticsCache.keys()) {
    if (key.includes(pattern)) {
      analyticsCache.delete(key);
    }
  }
};

// Type definitions for analytics data
interface GrowthDataPoint {
  date: string;
  restaurants: number;
  staff: number;
  total: number;
  newRestaurants: number;
  newStaff: number;
  newTotal: number;
  growthRate?: number;
}

interface CohortRetentionData {
  cohort: string;
  month0: number;
  month1: number;
  month3: number;
  month6: number;
  month12: number;
}

/**
 * Calculate cohort retention analysis
 */
async function calculateCohortRetention(): Promise<CohortRetentionData[]> {
  try {
    const cohortData: CohortRetentionData[] = [];
    const now = new Date();

    // Analyze cohorts from the last 12 months
    for (let i = 12; i >= 0; i--) {
      const cohortDate = new Date();
      cohortDate.setMonth(cohortDate.getMonth() - i);
      const startOfMonth = new Date(
        cohortDate.getFullYear(),
        cohortDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        cohortDate.getFullYear(),
        cohortDate.getMonth() + 1,
        0
      );

      // Get users who signed up in this cohort month
      const cohortUsers = await User.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      })
        .select("_id")
        .lean();

      if (cohortUsers.length === 0) {
        continue; // Skip months with no new users
      }

      const cohortUserIds = cohortUsers.map((u) => u._id);
      const month0 = cohortUsers.length;

      // Calculate retention for different time periods
      const calculateRetention = async (
        monthsLater: number
      ): Promise<number> => {
        const checkDate = new Date(startOfMonth);
        checkDate.setMonth(checkDate.getMonth() + monthsLater);

        if (checkDate > now) return 0; // Can't check future retention

        const activeUsers = await QuizResult.distinct("userId", {
          userId: { $in: cohortUserIds },
          completedAt: {
            $gte: checkDate,
            $lt: new Date(checkDate.getTime() + 30 * 24 * 60 * 60 * 1000), // Within 30 days of check date
          },
        });

        return Math.round((activeUsers.length / month0) * 100 * 100) / 100;
      };

      const month1 = await calculateRetention(1);
      const month3 = await calculateRetention(3);
      const month6 = await calculateRetention(6);
      const month12 = await calculateRetention(12);

      cohortData.push({
        cohort: startOfMonth.toISOString().split("T")[0],
        month0: 100, // All users start at 100%
        month1,
        month3,
        month6,
        month12,
      });
    }

    return cohortData;
  } catch (error) {
    console.error("Error calculating cohort retention:", error);
    return [];
  }
}

/**
 * Calculate user retention by month
 */
async function calculateUserRetentionByMonth(): Promise<
  Array<{
    month: string;
    totalUsers: number;
    activeUsers: number;
    retentionRate: number;
  }>
> {
  try {
    const retentionData = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Total users registered up to this month
      const totalUsers = await User.countDocuments({
        createdAt: { $lte: endOfMonth },
      });

      // Active users in this month (took at least one quiz)
      const activeUsers = await QuizResult.distinct("userId", {
        completedAt: { $gte: startOfMonth, $lte: endOfMonth },
      }).then((users) => users.length);

      const retentionRate =
        totalUsers > 0
          ? Math.round((activeUsers / totalUsers) * 100 * 100) / 100
          : 0;

      retentionData.push({
        month: startOfMonth.toISOString().split("T")[0],
        totalUsers,
        activeUsers,
        retentionRate,
      });
    }

    return retentionData;
  } catch (error) {
    console.error("Error calculating user retention by month:", error);
    return [];
  }
}

/**
 * Calculate restaurant retention by month
 */
async function calculateRestaurantRetentionByMonth(): Promise<
  Array<{
    month: string;
    totalRestaurants: number;
    activeRestaurants: number;
    retentionRate: number;
  }>
> {
  try {
    const retentionData = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Total restaurants registered up to this month
      const totalRestaurants = await Restaurant.countDocuments({
        createdAt: { $lte: endOfMonth },
      });

      // Active restaurants in this month (had staff take quizzes)
      const activeRestaurantIds = await QuizResult.distinct("restaurantId", {
        completedAt: { $gte: startOfMonth, $lte: endOfMonth },
      });
      const activeRestaurants = activeRestaurantIds.length;

      const retentionRate =
        totalRestaurants > 0
          ? Math.round((activeRestaurants / totalRestaurants) * 100 * 100) / 100
          : 0;

      retentionData.push({
        month: startOfMonth.toISOString().split("T")[0],
        totalRestaurants,
        activeRestaurants,
        retentionRate,
      });
    }

    return retentionData;
  } catch (error) {
    console.error("Error calculating restaurant retention by month:", error);
    return [];
  }
}

/**
 * Get platform overview metrics for admin dashboard
 */
export const getPlatformOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cacheKey = getCacheKey("platform-overview");

    // Check cache first
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }
    // Get current date for time-based queries
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Get total counts
    const totalRestaurants = await Restaurant.countDocuments();
    const totalStaffUsers = await User.countDocuments({ role: "staff" });
    const totalUsers = await User.countDocuments();

    // Get active restaurants (those with staff who have taken quizzes in last 30 days)
    const activeRestaurantIds = await QuizResult.distinct("restaurantId", {
      completedAt: { $gte: thirtyDaysAgo },
    });
    const activeRestaurants = activeRestaurantIds.length;

    // Get quiz metrics
    const totalQuizzesTaken = await QuizResult.countDocuments({
      status: "completed",
    });

    const recentQuizzesTaken = await QuizResult.countDocuments({
      status: "completed",
      completedAt: { $gte: thirtyDaysAgo },
    });

    // Calculate average score
    const averageScoreResult = await QuizResult.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: { $divide: ["$score", "$totalQuestions"] } },
        },
      },
    ]);

    const averageScore =
      averageScoreResult.length > 0
        ? Math.round(averageScoreResult[0].avgScore * 100 * 100) / 100 // Round to 2 decimal places
        : 0;

    // Calculate growth rate (users added in last 30 days vs previous 30 days)
    const usersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const usersPrevious30Days = await User.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    });

    const growthRate =
      usersPrevious30Days > 0
        ? Math.round(
            ((usersLast30Days - usersPrevious30Days) / usersPrevious30Days) *
              100 *
              100
          ) / 100
        : 0;

    // Calculate retention rate (users who signed up 30 days ago and are still active)
    const usersFrom30DaysAgo = await User.countDocuments({
      createdAt: {
        $gte: new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000),
        $lt: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const activeUsersFrom30DaysAgo = await QuizResult.distinct("userId", {
      userId: {
        $in: await User.find({
          createdAt: {
            $gte: new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000),
            $lt: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000),
          },
        }).distinct("_id"),
      },
      completedAt: { $gte: thirtyDaysAgo },
    });

    const retentionRate =
      usersFrom30DaysAgo > 0
        ? Math.round(
            (activeUsersFrom30DaysAgo.length / usersFrom30DaysAgo) * 100 * 100
          ) / 100
        : 0;

    const platformMetrics = {
      totalUsers,
      totalRestaurants,
      activeRestaurants,
      totalStaffUsers,
      quizzesTaken: totalQuizzesTaken,
      recentQuizzesTaken,
      averageScore,
      monthlyRecurringRevenue: 0, // Placeholder - implement based on your billing system
      retentionRate,
      growthRate,
      timeframe: "last_30_days",
    };

    // Cache the results
    setCache(cacheKey, platformMetrics, CACHE_TTL);

    res.status(200).json({
      success: true,
      data: platformMetrics,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching platform overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform overview",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get growth metrics for admin dashboard
 */
export const getGrowthMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { timeframe = "month" } = req.query;
    const cacheKey = getCacheKey("growth-metrics", { timeframe });

    // Check cache first
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }

    // Enhanced user growth data for the last 12 months
    const monthsAgo = 12;
    const growthData: GrowthDataPoint[] = [];
    const now = new Date();

    // Build cumulative growth data
    for (let i = monthsAgo; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Get cumulative counts up to this month
      const restaurants = await Restaurant.countDocuments({
        createdAt: { $lte: endOfMonth },
      });

      const staff = await User.countDocuments({
        role: "staff",
        createdAt: { $lte: endOfMonth },
      });

      // Get new additions this month
      const newRestaurants = await Restaurant.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      });

      const newStaff = await User.countDocuments({
        role: "staff",
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      });

      growthData.push({
        date: startOfMonth.toISOString().split("T")[0],
        restaurants,
        staff,
        total: restaurants + staff,
        newRestaurants,
        newStaff,
        newTotal: newRestaurants + newStaff,
      });
    }

    // Calculate month-over-month growth rates
    const growthWithRates = growthData.map((item, index) => {
      if (index === 0) {
        return { ...item, growthRate: 0 }; // First month has no previous month
      }

      const prevMonth = growthData[index - 1];
      const growthRate =
        prevMonth.newTotal > 0
          ? Math.round(
              ((item.newTotal - prevMonth.newTotal) / prevMonth.newTotal) *
                100 *
                100
            ) / 100
          : 0;

      return { ...item, growthRate };
    });

    // Calculate user and restaurant retention data
    const userRetention = await calculateUserRetentionByMonth();
    const restaurantRetention = await calculateRestaurantRetentionByMonth();

    const metrics = {
      growthData: growthWithRates,
      userRetention,
      restaurantRetention,
      summary: {
        totalGrowth: growthWithRates[growthWithRates.length - 1]?.total || 0,
        averageMonthlyGrowth:
          growthWithRates.reduce(
            (acc, item) => acc + (item.growthRate || 0),
            0
          ) / growthWithRates.length,
        currentUserRetention:
          userRetention[userRetention.length - 1]?.retentionRate || 0,
        currentRestaurantRetention:
          restaurantRetention[restaurantRetention.length - 1]?.retentionRate ||
          0,
      },
    };

    // Cache the results
    setCache(cacheKey, metrics, CACHE_TTL);

    res.status(200).json({
      success: true,
      data: metrics,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching growth metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch growth metrics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get engagement statistics for admin dashboard
 */
export const getEngagementStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Daily Active Users (users who took quizzes in last 24 hours)
    const dailyActiveUsers = await QuizResult.distinct("userId", {
      completedAt: { $gte: oneDayAgo },
    }).then((users) => users.length);

    // Weekly Active Users
    const weeklyActiveUsers = await QuizResult.distinct("userId", {
      completedAt: { $gte: oneWeekAgo },
    }).then((users) => users.length);

    // Monthly Active Users
    const monthlyActiveUsers = await QuizResult.distinct("userId", {
      completedAt: { $gte: oneMonthAgo },
    }).then((users) => users.length);

    // Quiz activity metrics
    const dailyQuizzes = await QuizResult.countDocuments({
      completedAt: { $gte: oneDayAgo },
      status: "completed",
    });

    const weeklyQuizzes = await QuizResult.countDocuments({
      completedAt: { $gte: oneWeekAgo },
      status: "completed",
    });

    const monthlyQuizzes = await QuizResult.countDocuments({
      completedAt: { $gte: oneMonthAgo },
      status: "completed",
    });

    // Average session duration (mock data - implement based on your tracking)
    const avgSessionDuration = 25; // minutes

    // Feature adoption rates
    const totalUsers = await User.countDocuments({ role: "staff" });
    const usersWhoTookQuizzes = await QuizResult.distinct("userId").then(
      (users) => users.length
    );
    const quizAdoptionRate =
      totalUsers > 0
        ? Math.round((usersWhoTookQuizzes / totalUsers) * 100 * 100) / 100
        : 0;

    // Knowledge category performance
    const categoryPerformance = await QuizResult.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: oneMonthAgo },
        },
      },
      {
        $lookup: {
          from: "questions",
          localField: "answers.questionId",
          foreignField: "_id",
          as: "questions",
        },
      },
      {
        $unwind: "$questions",
      },
      {
        $group: {
          _id: "$questions.knowledgeCategory",
          totalAttempts: { $sum: 1 },
          avgScore: {
            $avg: { $divide: ["$score", "$totalQuestions"] },
          },
        },
      },
      {
        $project: {
          category: "$_id",
          totalAttempts: 1,
          averageScore: { $round: [{ $multiply: ["$avgScore", 100] }, 2] },
        },
      },
    ]);

    // Active participants by restaurant
    const activeParticipants = await QuizResult.aggregate([
      {
        $match: {
          completedAt: { $gte: oneMonthAgo },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$restaurantId",
          activeUsers: { $addToSet: "$userId" },
        },
      },
      {
        $project: {
          restaurantId: "$_id",
          activeUserCount: { $size: "$activeUsers" },
        },
      },
    ]);

    const engagementMetrics = {
      activeUsers: {
        daily: dailyActiveUsers,
        weekly: weeklyActiveUsers,
        monthly: monthlyActiveUsers,
      },
      quizActivity: {
        daily: dailyQuizzes,
        weekly: weeklyQuizzes,
        monthly: monthlyQuizzes,
      },
      engagement: {
        avgSessionDuration,
        quizAdoptionRate,
        dailyToWeeklyRatio:
          weeklyActiveUsers > 0
            ? Math.round((dailyActiveUsers / weeklyActiveUsers) * 100 * 100) /
              100
            : 0,
        weeklyToMonthlyRatio:
          monthlyActiveUsers > 0
            ? Math.round((weeklyActiveUsers / monthlyActiveUsers) * 100 * 100) /
              100
            : 0,
      },
      categoryPerformance,
      activeParticipants: activeParticipants.length,
      timeframe: "last_30_days",
    };

    res.status(200).json({
      success: true,
      data: engagementMetrics,
    });
  } catch (error) {
    console.error("Error fetching engagement stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch engagement statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get revenue metrics for admin dashboard
 */
export const getRevenueMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Placeholder implementation - will be expanded in Phase 3
    const revenueMetrics = {
      monthlyRecurringRevenue: 0,
      annualRecurringRevenue: 0,
      customerLifetimeValue: 0,
      churnRate: 0,
      averageRevenuePerUser: 0,
      message: "Revenue metrics will be implemented in Phase 3",
    };

    res.status(200).json({
      success: true,
      data: revenueMetrics,
    });
  } catch (error) {
    console.error("Error fetching revenue metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue metrics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get cohort analysis for admin dashboard
 */
export const getCohortAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { timeframe = "month" } = req.query;
    const cacheKey = getCacheKey("cohort-analysis", { timeframe });

    // Check cache first
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }

    const cohortData = await calculateCohortRetention();

    const cohortMetrics = {
      cohorts: cohortData,
      summary: {
        totalCohorts: cohortData.length,
        averageRetention: {
          month1:
            cohortData.reduce((acc, cohort) => acc + cohort.month1, 0) /
              cohortData.length || 0,
          month3:
            cohortData.reduce((acc, cohort) => acc + cohort.month3, 0) /
              cohortData.length || 0,
          month6:
            cohortData.reduce((acc, cohort) => acc + cohort.month6, 0) /
              cohortData.length || 0,
          month12:
            cohortData.reduce((acc, cohort) => acc + cohort.month12, 0) /
              cohortData.length || 0,
        },
      },
      timeframe,
    };

    // Cache the results
    setCache(cacheKey, cohortMetrics, CACHE_TTL);

    res.status(200).json({
      success: true,
      data: cohortMetrics,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching cohort analysis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cohort analysis",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Generate investor report (PDF)
 */
export const generateInvestorReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Placeholder implementation - will be expanded in Phase 3
    const report = {
      generatedAt: new Date().toISOString(),
      format: "PDF",
      status: "pending",
      message: "PDF report generation will be implemented in Phase 3",
    };

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error generating investor report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate investor report",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
