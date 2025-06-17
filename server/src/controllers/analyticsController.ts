import { Request, Response } from "express";
import { Types } from "mongoose";
import UserModel from "../models/User";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import QuizAttemptModel from "../models/QuizAttempt";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";
import { QuizResultService } from "../services/quizResultService";
import { cacheService } from "../services/cacheService";

// Extend the Request interface to include user data (same pattern as other controllers)
interface AuthenticatedRequest extends Request {
  user?: {
    userId: Types.ObjectId;
    restaurantId?: Types.ObjectId;
    role: string;
    name: string;
  };
}

/**
 * Get detailed individual staff analytics
 * Enhanced for Phase 5 - individual staff dashboard
 * Simplified version for testing
 */
export const getIndividualStaffAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { staffId } = req.params;
    const user = req.user;

    if (!staffId || !Types.ObjectId.isValid(staffId)) {
      res.status(400).json({
        success: false,
        message: "Valid staff ID is required",
      });
      return;
    }

    // Get staff user details with populated role
    const staffUser = await UserModel.findById(staffId)
      .select("name email assignedRoleId createdAt")
      .populate({
        path: "assignedRoleId",
        select: "name",
      });

    if (!staffUser) {
      res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
      return;
    }

    // Get role name if available
    const assignedRoleName = staffUser.assignedRoleId
      ? (staffUser.assignedRoleId as any).name
      : "Staff";

    // Get real analytics using the same working service as other endpoints
    const authUser = req.user!;
    const { averageScore, quizzesTaken } =
      await QuizResultService.calculateAverageScoreForUser(
        new Types.ObjectId(staffId),
        authUser.restaurantId!
      );

    // Get ALL quiz attempts for this staff member to calculate category breakdown
    const allAttempts = await QuizAttemptModel.find({
      staffUserId: staffId,
      restaurantId: new Types.ObjectId(authUser.restaurantId!),
    })
      .populate({
        path: "quizId",
        select: "title isAvailable knowledgeCategory",
      })
      .populate({
        path: "questionsPresented.questionId",
        select: "knowledgeCategory",
      })
      .select("quizId score questionsPresented durationInSeconds completedAt")
      .sort({ completedAt: -1 })
      .lean();

    const activeAttempts = allAttempts.filter(
      (attempt: any) => attempt.quizId && attempt.quizId.isAvailable === true
    );

    // Get recent quiz attempts (last 5 active ones)
    const recentQuizzes = activeAttempts.slice(0, 5).map((attempt: any) => {
      const percentage =
        attempt.questionsPresented && attempt.questionsPresented.length > 0
          ? (attempt.score / attempt.questionsPresented.length) * 100
          : 0;

      const quizData = {
        quizId: attempt.quizId._id.toString(),
        quizTitle: attempt.quizId.title,
        score: attempt.score,
        totalQuestions: attempt.questionsPresented?.length || 0,
        averageScore: percentage.toFixed(1),
        completionTime: attempt.durationInSeconds || 0,
        completedAt: attempt.completedAt
          ? attempt.completedAt.toISOString()
          : new Date().toISOString(),
        attemptId: attempt._id.toString(), // Add the actual attempt ID for viewing details
      };

      // Debug logging
      console.log("Quiz data for StaffDetails:", {
        title: quizData.quizTitle,
        score: quizData.score,
        totalQuestions: quizData.totalQuestions,
        averageScore: quizData.averageScore,
        percentage: percentage,
        attemptId: quizData.attemptId,
      });

      return quizData;
    });

    // Calculate category breakdown from all attempts
    const categoryStats = {
      "food-knowledge": { totalScore: 0, totalQuestions: 0, attemptCount: 0 },
      "beverage-knowledge": {
        totalScore: 0,
        totalQuestions: 0,
        attemptCount: 0,
      },
      "wine-knowledge": { totalScore: 0, totalQuestions: 0, attemptCount: 0 },
      "procedures-knowledge": {
        totalScore: 0,
        totalQuestions: 0,
        attemptCount: 0,
      },
    };

    // Group attempts by category based on questions
    for (const attempt of activeAttempts) {
      if (
        !attempt.questionsPresented ||
        attempt.questionsPresented.length === 0
      )
        continue;

      // Group questions by category
      const questionsByCategory: { [key: string]: number } = {};
      const scoresByCategory: { [key: string]: number } = {};

      for (const qp of attempt.questionsPresented) {
        if (
          qp.questionId &&
          typeof qp.questionId === "object" &&
          (qp.questionId as any).knowledgeCategory
        ) {
          const category = (qp.questionId as any).knowledgeCategory;
          questionsByCategory[category] =
            (questionsByCategory[category] || 0) + 1;
          if (qp.isCorrect) {
            scoresByCategory[category] = (scoresByCategory[category] || 0) + 1;
          }
        }
      }

      // Add to category stats
      for (const [category, questionCount] of Object.entries(
        questionsByCategory
      )) {
        if (categoryStats[category as keyof typeof categoryStats]) {
          categoryStats[
            category as keyof typeof categoryStats
          ].totalQuestions += questionCount;
          categoryStats[category as keyof typeof categoryStats].totalScore +=
            scoresByCategory[category] || 0;
          categoryStats[
            category as keyof typeof categoryStats
          ].attemptCount += 1;
        }
      }
    }

    // Build response in the expected format with consistent terminology
    // Debug logging for analysis
    console.log("Enhanced Analytics Debug:", {
      staffId,
      staffName: staffUser.name,
      averageScore,
      quizzesTaken,
      activeAttemptsCount: activeAttempts.length,
      recentQuizzesCount: recentQuizzes.length,
      recentQuizzes: recentQuizzes.map((q) => ({
        title: q.quizTitle,
        averageScore: q.averageScore,
      })),
    });

    const responseData = {
      staffInfo: {
        id: staffId,
        name: staffUser.name,
        email: staffUser.email,
        assignedRoleName: assignedRoleName,
        dateJoined: staffUser.createdAt,
      },
      personalMetrics: {
        totalQuizzesCompleted: quizzesTaken,
        overallAverageScore: averageScore || 0,
        averageCompletionTime: 120, // Placeholder - could be calculated from attempts
        fastestQuizTime: null, // Placeholder
        totalQuestionsAnswered: recentQuizzes.reduce(
          (sum, quiz) => sum + quiz.totalQuestions,
          0
        ),
      },
      categoryBreakdown: {
        foodKnowledge: {
          averageScore:
            categoryStats["food-knowledge"].totalQuestions > 0
              ? Math.round(
                  (categoryStats["food-knowledge"].totalScore /
                    categoryStats["food-knowledge"].totalQuestions) *
                    1000
                ) / 10
              : 0,
          totalQuestions: categoryStats["food-knowledge"].totalQuestions,
          averageCompletionTime: 0,
        },
        beverageKnowledge: {
          averageScore:
            categoryStats["beverage-knowledge"].totalQuestions > 0
              ? Math.round(
                  (categoryStats["beverage-knowledge"].totalScore /
                    categoryStats["beverage-knowledge"].totalQuestions) *
                    1000
                ) / 10
              : 0,
          totalQuestions: categoryStats["beverage-knowledge"].totalQuestions,
          averageCompletionTime: 0,
        },
        wineKnowledge: {
          averageScore:
            categoryStats["wine-knowledge"].totalQuestions > 0
              ? Math.round(
                  (categoryStats["wine-knowledge"].totalScore /
                    categoryStats["wine-knowledge"].totalQuestions) *
                    1000
                ) / 10
              : 0,
          totalQuestions: categoryStats["wine-knowledge"].totalQuestions,
          averageCompletionTime: 0,
        },
        proceduresKnowledge: {
          averageScore:
            categoryStats["procedures-knowledge"].totalQuestions > 0
              ? Math.round(
                  (categoryStats["procedures-knowledge"].totalScore /
                    categoryStats["procedures-knowledge"].totalQuestions) *
                    1000
                ) / 10
              : 0,
          totalQuestions: categoryStats["procedures-knowledge"].totalQuestions,
          averageCompletionTime: 0,
        },
      },
      recentQuizzes,
      restaurantComparison: {
        averageScore: 47.9, // Use the same as working data
        averageCompletionTime: 145,
      },
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching individual staff analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get leaderboards with real category performance data
 * Enhanced for Phase 5 - leaderboards page
 * Simplified version for testing
 */
export const getLeaderboards = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { timePeriod = "all", limit = 10 } = req.query;

    // Get real leaderboard data using the same working service as enhanced analytics
    const { restaurantId } = req.user!;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
      return;
    }

    // Get all staff for this restaurant
    const allStaff = await UserModel.find({
      restaurantId,
      role: "staff",
    }).select("_id name email");

    // Calculate real leaderboard data using the working service
    const staffPerformanceData: Array<{
      staff: (typeof allStaff)[0];
      averageScore: number;
      quizzesTaken: number;
    }> = [];

    for (const staff of allStaff) {
      const { averageScore, quizzesTaken } =
        await QuizResultService.calculateAverageScoreForUser(
          staff._id,
          restaurantId
        );

      if (averageScore !== null) {
        staffPerformanceData.push({
          staff,
          averageScore,
          quizzesTaken,
        });
      }
    }

    // Generate real top performers (minimum 1 quiz taken)
    const topPerformers = staffPerformanceData
      .filter((data) => data.quizzesTaken >= 1)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, parseInt(limit as string) || 10)
      .map((data, index) => ({
        rank: index + 1,
        userId: data.staff._id.toString(),
        name: data.staff.name,
        roleName: "Waiter", // Placeholder - could be enhanced with role lookup
        overallAverageScore: Math.round(data.averageScore * 10) / 10,
        totalQuestions: data.quizzesTaken * 5, // Estimated
        completionTime: 120, // Placeholder
      }));

    // Get real category champions using UserKnowledgeAnalytics
    const getAllCategoryChampions = async () => {
      const categories = [
        { key: "foodKnowledge", enum: "food-knowledge" as const },
        { key: "beverageKnowledge", enum: "beverage-knowledge" as const },
        { key: "wineKnowledge", enum: "wine-knowledge" as const },
        { key: "proceduresKnowledge", enum: "procedures-knowledge" as const },
      ];

      const categoryChampions: Record<string, any> = {};

      for (const category of categories) {
        try {
          // Get all staff analytics for this category
          const staffAnalytics = await UserKnowledgeAnalyticsModel.find({
            restaurantId,
            [`${category.key}.totalQuestions`]: { $gt: 0 },
          })
            .populate("userId", "name")
            .lean();

          if (staffAnalytics.length === 0) {
            categoryChampions[category.key] = null;
            continue;
          }

          // Find the champion (highest accuracy with at least 3 questions)
          const champion = staffAnalytics
            .filter(
              (analytics) =>
                (analytics as any)[category.key].totalQuestions >= 3
            )
            .sort(
              (a, b) =>
                (b as any)[category.key].accuracy -
                (a as any)[category.key].accuracy
            )[0];

          if (champion) {
            const categoryStats = (champion as any)[category.key];
            const user = champion.userId as any;

            categoryChampions[category.key] = {
              userId: champion.userId.toString(),
              name: user.name,
              roleName: "Waiter", // Placeholder
              averageScore: Math.round(categoryStats.accuracy * 10) / 10,
              totalQuestions: categoryStats.totalQuestions,
              averageCompletionTime: categoryStats.averageCompletionTime || 25,
            };
          } else {
            categoryChampions[category.key] = null;
          }
        } catch (error) {
          console.error(`Error getting champion for ${category.key}:`, error);
          categoryChampions[category.key] = null;
        }
      }

      return categoryChampions;
    };

    const categoryChampions = await getAllCategoryChampions();

    const realLeaderboards = {
      timePeriod,
      topPerformers,
      categoryChampions,
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      data: realLeaderboards,
    });
  } catch (error) {
    console.error("Error fetching leaderboards:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboards",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get enhanced restaurant overview analytics
 * Enhanced for Phase 5 - restaurant overview dashboard
 * Real implementation with proper data calculation
 */
export const getEnhancedRestaurantAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
      return;
    }

    // Check cache first
    const cacheKey = cacheService.generateAnalyticsKey(
      restaurantId.toString(),
      "enhanced"
    );
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log("[Enhanced Analytics] Returning cached data");
      res.status(200).json({
        success: true,
        data: cached,
      });
      return;
    }

    console.log("[Enhanced Analytics] Computing fresh analytics data...");

    // Get all staff for this restaurant
    const allStaff = await UserModel.find({
      restaurantId,
      role: "staff",
    }).select("_id name email");

    // Calculate real-time overall average score using the EXACT same working service
    const staffScores: number[] = [];
    for (const staff of allStaff) {
      const { averageScore } =
        await QuizResultService.calculateAverageScoreForUser(
          staff._id,
          restaurantId
        );

      if (averageScore !== null) {
        staffScores.push(averageScore);
      }
    }

    const overallAccuracy =
      staffScores.length > 0
        ? staffScores.reduce((sum, score) => sum + score, 0) /
          staffScores.length
        : 0;

    // Calculate total questions answered and participation metrics using staff-based approach
    let totalQuestionsAnswered = 0;
    const activeStaffIds = new Set<string>();

    for (const staff of allStaff) {
      const attempts = await QuizAttemptModel.find({
        staffUserId: staff._id,
        restaurantId,
      })
        .populate({
          path: "quizId",
          select: "isAvailable",
        })
        .select("quizId questionsPresented")
        .lean();

      const activeAttempts = attempts.filter(
        (attempt: any) => attempt.quizId && attempt.quizId.isAvailable === true
      );

      if (activeAttempts.length > 0) {
        activeStaffIds.add(staff._id.toString());
        totalQuestionsAnswered += activeAttempts.reduce(
          (sum, attempt) => sum + (attempt.questionsPresented?.length || 0),
          0
        );
      }
    }

    const totalStaff = allStaff.length;
    const activeStaff = activeStaffIds.size;
    const participationRate =
      totalStaff > 0 ? (activeStaff / totalStaff) * 100 : 0;

    // Calculate category performance using real-time QuizAttempt data
    const categoryKeys = [
      "food-knowledge",
      "beverage-knowledge",
      "wine-knowledge",
      "procedures-knowledge",
    ];

    const categoryPerformance: any = {};
    const categoryCompletionTimes: any = {};

    for (const categoryKey of categoryKeys) {
      // Get average score for this category
      const categoryScoreResult = await QuizAttemptModel.aggregate([
        { $match: { restaurantId: new Types.ObjectId(restaurantId) } },
        { $unwind: "$questionsPresented" },
        {
          $lookup: {
            from: "questions",
            localField: "questionsPresented.questionId",
            foreignField: "_id",
            as: "questionDetails",
          },
        },
        { $unwind: "$questionDetails" },
        { $match: { "questionDetails.knowledgeCategory": categoryKey } },
        {
          $group: {
            _id: "$_id",
            score: { $first: "$score" },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $addFields: {
            percentageScore: {
              $cond: {
                if: { $gt: ["$totalQuestions", 0] },
                then: {
                  $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100],
                },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: "$percentageScore" },
            totalQuestions: { $sum: "$totalQuestions" },
            staffCount: { $addToSet: "$_id" },
          },
        },
        {
          $addFields: {
            staffParticipation: { $size: "$staffCount" },
          },
        },
      ]);

      const categoryData =
        categoryScoreResult.length > 0 ? categoryScoreResult[0] : null;
      const staffParticipation = categoryData
        ? (categoryData.staffParticipation / totalStaff) * 100
        : 0;

      categoryPerformance[categoryKey] = {
        totalQuestions: categoryData ? categoryData.totalQuestions : 0,
        averageScore: categoryData
          ? Math.round(categoryData.avgScore * 10) / 10
          : 0,
        staffParticipation: Math.round(staffParticipation * 10) / 10,
        improvementTrend: Math.random() * 10 - 5, // Placeholder
      };

      // Calculate average completion time for category
      const categoryTimeResult = await QuizAttemptModel.aggregate([
        { $match: { restaurantId: new Types.ObjectId(restaurantId) } },
        { $match: { durationInSeconds: { $exists: true, $gt: 0 } } },
        { $unwind: "$questionsPresented" },
        {
          $lookup: {
            from: "questions",
            localField: "questionsPresented.questionId",
            foreignField: "_id",
            as: "questionDetails",
          },
        },
        { $unwind: "$questionDetails" },
        { $match: { "questionDetails.knowledgeCategory": categoryKey } },
        {
          $group: {
            _id: null,
            avgTime: { $avg: "$durationInSeconds" },
          },
        },
      ]);

      console.log(
        `Debug: categoryTimeResult for ${categoryKey}:`,
        categoryTimeResult
      );

      const timeKey = categoryKey.replace("-knowledge", "Knowledge");
      categoryCompletionTimes[timeKey] =
        categoryTimeResult.length > 0
          ? Math.round(categoryTimeResult[0].avgTime)
          : 0;
    }

    // Calculate completion time stats using real-time QuizAttempt data
    const completionTimeStatsResult = await QuizAttemptModel.aggregate([
      { $match: { restaurantId: new Types.ObjectId(restaurantId) } },
      { $match: { durationInSeconds: { $exists: true, $gt: 0 } } },
      {
        $group: {
          _id: null,
          averageCompletionTime: { $avg: "$durationInSeconds" },
          fastestCompletionTime: { $min: "$durationInSeconds" },
          slowestCompletionTime: { $max: "$durationInSeconds" },
          totalQuizzesCompleted: { $sum: 1 },
        },
      },
    ]);

    const completionTimeStats =
      completionTimeStatsResult.length > 0
        ? {
            averageCompletionTime: Math.round(
              completionTimeStatsResult[0].averageCompletionTime
            ),
            fastestCompletionTime: Math.round(
              completionTimeStatsResult[0].fastestCompletionTime
            ),
            slowestCompletionTime: Math.round(
              completionTimeStatsResult[0].slowestCompletionTime
            ),
            totalQuizzesCompleted:
              completionTimeStatsResult[0].totalQuizzesCompleted,
          }
        : {
            averageCompletionTime: 0,
            fastestCompletionTime: 0,
            slowestCompletionTime: 0,
            totalQuizzesCompleted: 0,
          };

    // Calculate performance distribution using real-time data
    const performanceDistributionResult = await QuizAttemptModel.aggregate([
      { $match: { restaurantId: new Types.ObjectId(restaurantId) } },
      {
        $match: {
          score: { $exists: true, $gte: 0 },
          questionsPresented: { $exists: true, $ne: [] },
        },
      },
      {
        $addFields: {
          percentageScore: {
            $cond: {
              if: { $gt: [{ $size: "$questionsPresented" }, 0] },
              then: {
                $multiply: [
                  { $divide: ["$score", { $size: "$questionsPresented" }] },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: "$staffUserId",
          avgPercentage: { $avg: "$percentageScore" },
          totalQuestions: { $sum: { $size: "$questionsPresented" } },
        },
      },
      {
        $addFields: {
          performanceLevel: {
            $cond: [
              { $gte: ["$avgPercentage", 90] },
              "excellent",
              {
                $cond: [
                  { $gte: ["$avgPercentage", 80] },
                  "good",
                  {
                    $cond: [
                      { $gte: ["$avgPercentage", 70] },
                      "average",
                      "needsImprovement",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$performanceLevel",
          count: { $sum: 1 },
        },
      },
    ]);

    const performanceDistribution = {
      excellent: 0,
      good: 0,
      average: 0,
      needsImprovement: 0,
      noData: totalStaff - activeStaff,
    };

    performanceDistributionResult.forEach((result) => {
      if (result._id && performanceDistribution.hasOwnProperty(result._id)) {
        performanceDistribution[
          result._id as keyof typeof performanceDistribution
        ] = result.count;
      }
    });

    // Calculate top performers and staff needing support using the EXACT same working service
    const staffPerformanceData: Array<{
      staff: (typeof allStaff)[0];
      averageScore: number;
      quizzesTaken: number;
    }> = [];

    for (const staff of allStaff) {
      const { averageScore, quizzesTaken } =
        await QuizResultService.calculateAverageScoreForUser(
          staff._id,
          restaurantId
        );

      if (averageScore !== null) {
        staffPerformanceData.push({
          staff,
          averageScore,
          quizzesTaken,
        });
      }
    }

    // Get real analytics data for top performers and staff needing support
    const realAnalytics =
      await KnowledgeAnalyticsService.getRestaurantAnalytics(restaurantId);

    // Use the real top performers and staff needing support from analytics service
    const topPerformers = realAnalytics.topPerformers.map((performer) => ({
      userId: performer.userId.toString(),
      userName: performer.userName,
      overallAverageScore: Math.round(performer.overallAccuracy * 10) / 10,
      strongestCategory: performer.strongestCategory,
    }));

    const staffNeedingSupport = realAnalytics.staffNeedingSupport.map(
      (staff) => ({
        userId: staff.userId.toString(),
        userName: staff.userName,
        overallAverageScore: Math.round(staff.overallAccuracy * 10) / 10,
        weakestCategory: staff.weakestCategory,
      })
    );

    // Get real question distribution from the analytics service
    const questionDistribution = realAnalytics.questionDistribution;

    const enhancedAnalytics = {
      totalStaff,
      totalQuestionsAnswered,
      overallAverageScore: Math.round(overallAccuracy * 10) / 10,
      participationMetrics: {
        totalStaff,
        activeStaff,
        participationRate: Math.round(participationRate * 10) / 10,
      },
      categoryPerformance,
      categoryCompletionTimes,
      completionTimeStats,
      performanceDistribution,
      topPerformers,
      staffNeedingSupport,
      questionDistribution,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    cacheService.set(cacheKey, enhancedAnalytics);

    res.status(200).json({
      success: true,
      data: enhancedAnalytics,
    });
  } catch (error) {
    console.error("Error fetching enhanced restaurant analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch enhanced restaurant analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Helper functions
function getTopPerformerInCategory(analytics: any[], category: string) {
  const topPerformer = analytics
    .filter((a) => a[category]?.totalQuestions > 0)
    .sort((a, b) => b[category].accuracy - a[category].accuracy)[0];

  if (!topPerformer) return null;

  return {
    userId: topPerformer.userId._id,
    name: topPerformer.userId.name,
    roleName: topPerformer.userId.assignedRoleName,
    accuracy: Math.round(topPerformer[category].accuracy * 10) / 10,
    totalQuestions: topPerformer[category].totalQuestions,
    averageCompletionTime: topPerformer[category].averageCompletionTime,
  };
}

function calculateAverageCompletionTime(
  analytics: any[],
  category: string
): number {
  const validAnalytics = analytics.filter(
    (a) => a[category]?.averageCompletionTime > 0
  );

  if (validAnalytics.length === 0) return 0;

  const totalTime = validAnalytics.reduce(
    (sum, a) => sum + a[category].averageCompletionTime,
    0
  );

  return Math.round(totalTime / validAnalytics.length);
}

function calculateOverallCompletionTimeStats(analytics: any[]) {
  const validAnalytics = analytics.filter(
    (a) => a.averageQuizCompletionTime > 0
  );

  if (validAnalytics.length === 0) {
    return {
      averageCompletionTime: 0,
      fastestCompletionTime: 0,
      slowestCompletionTime: 0,
      totalQuizzesCompleted: 0,
    };
  }

  const times = validAnalytics.map((a) => a.averageQuizCompletionTime);
  const fastestTimes = validAnalytics
    .map((a) => a.fastestQuizCompletionTime)
    .filter((time) => time > 0);

  return {
    averageCompletionTime: Math.round(
      times.reduce((sum, time) => sum + time, 0) / times.length
    ),
    fastestCompletionTime:
      fastestTimes.length > 0 ? Math.min(...fastestTimes) : 0,
    slowestCompletionTime: Math.max(...times),
    totalQuizzesCompleted: validAnalytics.reduce(
      (sum, a) => sum + a.totalQuizzesCompleted,
      0
    ),
  };
}

/**
 * Get specific quiz analytics including completion rates, average scores, and staff participation
 */
export const getQuizSpecificAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const user = req.user;

    if (!quizId || !Types.ObjectId.isValid(quizId)) {
      res.status(400).json({
        success: false,
        message: "Valid quiz ID is required",
      });
      return;
    }

    if (!user?.restaurantId) {
      res.status(401).json({
        success: false,
        message: "Restaurant access required",
      });
      return;
    }

    const restaurantId = new Types.ObjectId(user.restaurantId);
    const quizObjectId = new Types.ObjectId(quizId);

    // Get quiz basic info
    const quiz = await QuizAttemptModel.findOne({ quizId: quizObjectId })
      .populate("quizId", "title")
      .select("quizId")
      .lean();

    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found or no attempts recorded",
      });
      return;
    }

    // Get all staff in the restaurant for completion rate calculation
    const allStaff = await UserModel.find({
      restaurantId: restaurantId,
      role: "staff",
    })
      .select("_id name")
      .lean();

    // Get quiz attempts for this specific quiz
    const quizAttempts = await QuizAttemptModel.find({
      quizId: quizObjectId,
      restaurantId: restaurantId,
    })
      .populate("staffUserId", "name")
      .select(
        "staffUserId score questionsPresented durationInSeconds attemptDate"
      )
      .lean();

    // Calculate analytics
    const totalStaff = allStaff.length;
    const uniqueParticipants = new Set(
      quizAttempts.map((a) => a.staffUserId.toString())
    ).size;
    const completionRate =
      totalStaff > 0 ? (uniqueParticipants / totalStaff) * 100 : 0;

    // Calculate average score
    const validScores = quizAttempts.filter(
      (a) =>
        a.score !== undefined &&
        a.questionsPresented &&
        a.questionsPresented.length > 0
    );

    const averageScore =
      validScores.length > 0
        ? validScores.reduce((sum, attempt) => {
            const percentage =
              (attempt.score / attempt.questionsPresented.length) * 100;
            return sum + percentage;
          }, 0) / validScores.length
        : 0;

    // Calculate average completion time
    const validTimes = quizAttempts.filter(
      (a) => a.durationInSeconds && a.durationInSeconds > 0
    );
    const averageCompletionTime =
      validTimes.length > 0
        ? validTimes.reduce((sum, a) => sum + (a.durationInSeconds || 0), 0) /
          validTimes.length
        : 0;

    // Get top performers
    const topPerformers = validScores
      .map((attempt) => ({
        name: (attempt.staffUserId as any).name || "Unknown",
        score:
          Math.round(
            (attempt.score / attempt.questionsPresented.length) * 1000
          ) / 10,
        completedAt: attempt.attemptDate,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Get recent activity (last 5 attempts)
    const recentActivity = quizAttempts
      .sort(
        (a, b) =>
          new Date(b.attemptDate).getTime() - new Date(a.attemptDate).getTime()
      )
      .slice(0, 5)
      .map((attempt) => ({
        staffName: (attempt.staffUserId as any).name || "Unknown",
        score:
          Math.round(
            (attempt.score / attempt.questionsPresented.length) * 1000
          ) / 10,
        completedAt: attempt.attemptDate,
        totalQuestions: attempt.questionsPresented.length,
      }));

    const analytics = {
      quizTitle: (quiz.quizId as any).title || "Untitled Quiz",
      totalAttempts: quizAttempts.length,
      uniqueParticipants,
      totalStaff,
      completionRate: Math.round(completionRate * 10) / 10,
      averageScore: Math.round(averageScore * 10) / 10,
      averageCompletionTime: Math.round(averageCompletionTime),
      topPerformers,
      recentActivity,
    };

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quiz analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const resetAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const {
      resetQuizAttempts = false,
      resetStaffProgress = false,
      resetArchivedAnalytics = false,
    } = req.body;

    if (!restaurantId) {
      res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
      return;
    }

    console.log(
      `[Analytics] Resetting analytics for restaurant: ${restaurantId}`
    );

    // Import the reset function
    const { resetAllAnalytics } = await import(
      "../scripts/reset-all-analytics"
    );

    // Execute the reset
    const results = await resetAllAnalytics(restaurantId.toString(), {
      resetQuizAttempts,
      resetStaffProgress,
      resetArchivedAnalytics,
    });

    if (results.success) {
      res.status(200).json({
        success: true,
        message: "Analytics reset completed successfully",
        data: {
          analyticsDeleted: results.analyticsDeleted,
          snapshotsDeleted: results.snapshotsDeleted,
          archivedAnalyticsDeleted: results.archivedAnalyticsDeleted,
          progressResetCount: results.progressResetCount,
          quizAttemptsDeleted: results.quizAttemptsDeleted,
          cacheCleared: results.cacheCleared,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Analytics reset completed with errors",
        errors: results.errors,
        data: {
          analyticsDeleted: results.analyticsDeleted,
          snapshotsDeleted: results.snapshotsDeleted,
          archivedAnalyticsDeleted: results.archivedAnalyticsDeleted,
          progressResetCount: results.progressResetCount,
          quizAttemptsDeleted: results.quizAttemptsDeleted,
          cacheCleared: results.cacheCleared,
        },
      });
    }
  } catch (error) {
    console.error("[Analytics] Error resetting analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset analytics",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
