import mongoose, { Types } from "mongoose";
import UserKnowledgeAnalyticsModel, {
  IUserKnowledgeAnalytics,
  ICategoryStats,
} from "../models/UserKnowledgeAnalytics";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel";
import QuizAttempt from "../models/QuizAttempt";
import User from "../models/User";
import { cacheService } from "./cacheService";

// Interfaces for analytics data
export interface RestaurantKnowledgeAnalytics {
  restaurantId: Types.ObjectId;
  totalStaff: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;

  // Category performance
  categoryPerformance: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      averageAccuracy: number;
      staffParticipation: number; // Percentage of staff who answered questions in this category
      improvementTrend: number; // Percentage change in the last 30 days
    };
  };

  // Staff insights
  topPerformers: Array<{
    userId: Types.ObjectId;
    userName: string;
    overallAccuracy: number;
    strongestCategory: KnowledgeCategory;
  }>;

  staffNeedingSupport: Array<{
    userId: Types.ObjectId;
    userName: string;
    overallAccuracy: number;
    weakestCategory: KnowledgeCategory;
  }>;

  // Question distribution
  questionDistribution: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      aiGenerated: number;
      manuallyCreated: number;
    };
  };

  lastUpdated: Date;
}

export interface StaffKnowledgeProfile {
  userId: Types.ObjectId;
  userName: string;
  restaurantId: Types.ObjectId;
  overallAccuracy: number;
  totalQuestionsAnswered: number;

  categoryPerformance: {
    [key in KnowledgeCategory]: {
      accuracy: number;
      questionsAnswered: number;
      lastAttempt?: Date;
      trend: "improving" | "declining" | "stable";
      strengthLevel: "strong" | "average" | "needs_work";
    };
  };

  recommendations: Array<{
    category: KnowledgeCategory;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;

  last30DaysTrend: {
    accuracyChange: number;
    questionsAnswered: number;
    mostActiveCategory: KnowledgeCategory;
  };
}

export interface CategoryAnalyticsInsights {
  category: KnowledgeCategory;
  restaurantId: Types.ObjectId;

  // Performance metrics
  averageAccuracy: number;
  totalQuestions: number;
  totalStaffParticipating: number;

  // Trends
  last30DaysAccuracy: number;
  accuracyTrend: number; // Percentage change

  // Staff breakdown
  staffPerformanceLevels: {
    strong: number; // Count of staff performing well (80%+)
    average: number; // Count of staff performing average (60-79%)
    needsWork: number; // Count of staff needing support (<60%)
  };

  // Question insights
  questionStats: {
    totalAvailable: number;
    aiGenerated: number;
    manuallyCreated: number;
    averageDifficulty: string;
  };

  // Recommendations
  trainingRecommendations: string[];

  lastUpdated: Date;
}

// Enhanced interfaces for Phase 5 - Advanced Analytics
export interface TimeRangeAnalytics {
  startDate: Date;
  endDate: Date;
  totalQuestions: number;
  averageAccuracy: number;
  staffParticipation: number;
  categoryBreakdown: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      averageAccuracy: number;
      improvement: number; // Percentage change from previous period
    };
  };
}

export interface ComparativeAnalytics {
  restaurantId: Types.ObjectId;
  timeframe: "week" | "month" | "quarter" | "year";
  currentPeriod: TimeRangeAnalytics;
  previousPeriod: TimeRangeAnalytics;
  improvement: {
    overall: number;
    byCategory: {
      [key in KnowledgeCategory]: number;
    };
  };
  benchmarks: {
    industryAverage?: number;
    topPerformerThreshold: number;
    improvementGoals: {
      [key in KnowledgeCategory]: number;
    };
  };
}

export interface PredictiveInsights {
  restaurantId: Types.ObjectId;
  staffAtRisk: Array<{
    userId: Types.ObjectId;
    userName: string;
    riskLevel: "low" | "medium" | "high";
    categories: KnowledgeCategory[];
    recommendedActions: string[];
  }>;
  categoryForecasts: {
    [key in KnowledgeCategory]: {
      predicted30DayAccuracy: number;
      confidence: number;
      trendDirection: "improving" | "declining" | "stable";
    };
  };
  trainingPriorities: Array<{
    category: KnowledgeCategory;
    priority: "high" | "medium" | "low";
    estimatedImpact: number;
  }>;
}

export class KnowledgeAnalyticsService {
  /**
   * Get comprehensive analytics for a restaurant
   */
  static async getRestaurantAnalytics(
    restaurantId: Types.ObjectId
  ): Promise<RestaurantKnowledgeAnalytics> {
    // Check cache first
    const cacheKey = cacheService.generateAnalyticsKey(
      restaurantId.toString(),
      "restaurant"
    );
    const cached = cacheService.get<RestaurantKnowledgeAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }
    // Get all staff analytics for this restaurant
    const staffAnalytics = await UserKnowledgeAnalyticsModel.find({
      restaurantId,
    })
      .populate("userId", "name email")
      .lean();

    const totalStaff = staffAnalytics.length;

    if (totalStaff === 0) {
      return this.getEmptyRestaurantAnalytics(restaurantId);
    }

    // Calculate overall metrics
    const totalQuestionsAnswered = staffAnalytics.reduce(
      (sum, analytics) => sum + analytics.totalQuestionsAnswered,
      0
    );

    const overallAccuracy =
      totalQuestionsAnswered > 0
        ? staffAnalytics.reduce(
            (sum, analytics) =>
              sum +
              analytics.overallAccuracy * analytics.totalQuestionsAnswered,
            0
          ) / totalQuestionsAnswered
        : 0;

    // Calculate category performance
    const categoryPerformance =
      {} as RestaurantKnowledgeAnalytics["categoryPerformance"];

    for (const category of Object.values(KnowledgeCategory)) {
      const categoryField = this.getCategoryField(category);
      const staffWithCategoryData = staffAnalytics.filter(
        (analytics) => (analytics as any)[categoryField].totalQuestions > 0
      );

      const totalCategoryQuestions = staffWithCategoryData.reduce(
        (sum, analytics) =>
          sum + (analytics as any)[categoryField].totalQuestions,
        0
      );

      const averageAccuracy =
        staffWithCategoryData.length > 0
          ? staffWithCategoryData.reduce(
              (sum, analytics) =>
                sum + (analytics as any)[categoryField].accuracy,
              0
            ) / staffWithCategoryData.length
          : 0;

      const staffParticipation =
        (staffWithCategoryData.length / totalStaff) * 100;

      // Calculate 30-day trend
      const improvementTrend = await this.calculateCategoryTrend(
        restaurantId,
        category,
        30
      );

      categoryPerformance[category] = {
        totalQuestions: totalCategoryQuestions,
        averageAccuracy,
        staffParticipation,
        improvementTrend,
      };
    }

    // Get top performers and staff needing support
    const topPerformers = await this.getTopPerformers(restaurantId, 5);
    const staffNeedingSupport = await this.getStaffNeedingSupport(
      restaurantId,
      5
    );

    // Get question distribution
    const questionDistribution = await this.getQuestionDistribution(
      restaurantId
    );

    const result = {
      restaurantId,
      totalStaff,
      totalQuestionsAnswered,
      overallAccuracy,
      categoryPerformance,
      topPerformers,
      staffNeedingSupport,
      questionDistribution,
      lastUpdated: new Date(),
    };

    // Cache the result for 5 minutes
    cacheService.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }

  /**
   * Get detailed knowledge profile for a specific staff member
   */
  static async getStaffKnowledgeProfile(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<StaffKnowledgeProfile | null> {
    const userAnalytics = await UserKnowledgeAnalyticsModel.findOne({
      userId,
      restaurantId,
    })
      .populate("userId", "name")
      .lean();

    if (!userAnalytics) {
      return null;
    }

    // Build category performance data
    const categoryPerformance =
      {} as StaffKnowledgeProfile["categoryPerformance"];

    for (const category of Object.values(KnowledgeCategory)) {
      const categoryField = this.getCategoryField(category);
      const categoryStats = (userAnalytics as any)[categoryField];

      const trend = await this.calculateUserCategoryTrend(
        userId,
        restaurantId,
        category,
        30
      );

      const strengthLevel = this.getStrengthLevel(categoryStats.accuracy);

      categoryPerformance[category] = {
        accuracy: categoryStats.accuracy,
        questionsAnswered: categoryStats.totalQuestions,
        lastAttempt: categoryStats.lastAttemptDate,
        trend,
        strengthLevel,
      };
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(categoryPerformance);

    // Calculate 30-day trend
    const last30DaysTrend = await this.calculateUser30DayTrend(
      userId,
      restaurantId
    );

    return {
      userId,
      userName: (userAnalytics.userId as any).name,
      restaurantId,
      overallAccuracy: userAnalytics.overallAccuracy,
      totalQuestionsAnswered: userAnalytics.totalQuestionsAnswered,
      categoryPerformance,
      recommendations,
      last30DaysTrend,
    };
  }

  /**
   * Get comprehensive analytics for a specific knowledge category
   */
  static async getCategoryAnalytics(
    restaurantId: Types.ObjectId,
    category: KnowledgeCategory
  ): Promise<CategoryAnalyticsInsights> {
    // Check cache first
    const cacheKey = cacheService.generateAnalyticsKey(
      restaurantId.toString(),
      "category",
      { category }
    );
    const cached = cacheService.get<CategoryAnalyticsInsights>(cacheKey);
    if (cached) {
      return cached;
    }
    const categoryField = this.getCategoryField(category);

    // Get all staff analytics for this category
    const staffAnalytics = await UserKnowledgeAnalyticsModel.find({
      restaurantId,
      [`${categoryField}.totalQuestions`]: { $gt: 0 },
    }).lean();

    const totalStaffParticipating = staffAnalytics.length;

    // Calculate performance metrics
    const totalQuestions = staffAnalytics.reduce(
      (sum, analytics) =>
        sum + (analytics as any)[categoryField].totalQuestions,
      0
    );

    const averageAccuracy =
      totalStaffParticipating > 0
        ? staffAnalytics.reduce(
            (sum, analytics) =>
              sum + (analytics as any)[categoryField].accuracy,
            0
          ) / totalStaffParticipating
        : 0;

    // Calculate trends
    const last30DaysAccuracy = await this.calculateCategoryAverage30Days(
      restaurantId,
      category
    );
    const accuracyTrend =
      last30DaysAccuracy > 0
        ? ((averageAccuracy - last30DaysAccuracy) / last30DaysAccuracy) * 100
        : 0;

    // Calculate staff performance levels
    const staffPerformanceLevels = {
      strong: staffAnalytics.filter(
        (a) => (a as any)[categoryField].accuracy >= 80
      ).length,
      average: staffAnalytics.filter(
        (a) =>
          (a as any)[categoryField].accuracy >= 60 &&
          (a as any)[categoryField].accuracy < 80
      ).length,
      needsWork: staffAnalytics.filter(
        (a) => (a as any)[categoryField].accuracy < 60
      ).length,
    };

    // Get question statistics
    const questionStats = await this.getCategoryQuestionStats(
      restaurantId,
      category
    );

    // Generate training recommendations
    const trainingRecommendations =
      this.generateCategoryTrainingRecommendations(
        category,
        averageAccuracy,
        staffPerformanceLevels
      );

    const result = {
      category,
      restaurantId,
      averageAccuracy,
      totalQuestions,
      totalStaffParticipating,
      last30DaysAccuracy,
      accuracyTrend,
      staffPerformanceLevels,
      questionStats,
      trainingRecommendations,
      lastUpdated: new Date(),
    };

    // Cache the result for 10 minutes
    cacheService.set(cacheKey, result, 10 * 60 * 1000);

    return result;
  }

  /**
   * Update analytics when a quiz is completed
   */
  static async updateAnalyticsOnQuizCompletion(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    quizAttemptId: Types.ObjectId
  ): Promise<void> {
    // Get the quiz attempt with question details
    const quizAttempt = await QuizAttempt.findById(quizAttemptId)
      .populate({
        path: "questionsPresented.questionId",
        select: "knowledgeCategory",
      })
      .lean();

    if (!quizAttempt || !quizAttempt.questionsPresented) {
      return;
    }

    // Find or create user analytics record
    let userAnalytics = await UserKnowledgeAnalyticsModel.findOne({
      userId,
      restaurantId,
    });

    if (!userAnalytics) {
      userAnalytics = new UserKnowledgeAnalyticsModel({
        userId,
        restaurantId,
      });
    }

    // Process each question in the attempt
    for (const questionAttempt of quizAttempt.questionsPresented) {
      const question = questionAttempt.questionId as any;
      if (!question?.knowledgeCategory) continue;

      const isCorrect = questionAttempt.isCorrect;

      // Update category stats using the model method
      (userAnalytics as any).updateCategoryStats(
        question.knowledgeCategory,
        isCorrect,
        undefined, // No subcategories in simplified version
        "basic" // Default difficulty for now
      );
    }

    await userAnalytics.save();
  }

  // Helper methods
  private static getCategoryField(category: KnowledgeCategory): string {
    switch (category) {
      case KnowledgeCategory.FOOD_KNOWLEDGE:
        return "foodKnowledge";
      case KnowledgeCategory.BEVERAGE_KNOWLEDGE:
        return "beverageKnowledge";
      case KnowledgeCategory.WINE_KNOWLEDGE:
        return "wineKnowledge";
      case KnowledgeCategory.PROCEDURES_KNOWLEDGE:
        return "proceduresKnowledge";
      default:
        return "foodKnowledge";
    }
  }

  private static getEmptyRestaurantAnalytics(
    restaurantId: Types.ObjectId
  ): RestaurantKnowledgeAnalytics {
    const emptyCategoryPerformance = {} as any;
    const emptyQuestionDistribution = {} as any;

    for (const category of Object.values(KnowledgeCategory)) {
      emptyCategoryPerformance[category] = {
        totalQuestions: 0,
        averageAccuracy: 0,
        staffParticipation: 0,
        improvementTrend: 0,
      };

      emptyQuestionDistribution[category] = {
        totalQuestions: 0,
        aiGenerated: 0,
        manuallyCreated: 0,
      };
    }

    return {
      restaurantId,
      totalStaff: 0,
      totalQuestionsAnswered: 0,
      overallAccuracy: 0,
      categoryPerformance: emptyCategoryPerformance,
      topPerformers: [],
      staffNeedingSupport: [],
      questionDistribution: emptyQuestionDistribution,
      lastUpdated: new Date(),
    };
  }

  private static async calculateCategoryTrend(
    restaurantId: Types.ObjectId,
    category: KnowledgeCategory,
    days: number
  ): Promise<number> {
    // Calculate trend based on daily accuracy changes
    // This would involve complex aggregation - simplified for now
    return 0; // Placeholder - implement based on daily accuracy tracking
  }

  private static async getTopPerformers(
    restaurantId: Types.ObjectId,
    limit: number
  ): Promise<RestaurantKnowledgeAnalytics["topPerformers"]> {
    const topPerformers = await UserKnowledgeAnalyticsModel.find({
      restaurantId,
    })
      .populate("userId", "name")
      .sort({ overallAccuracy: -1 })
      .limit(limit)
      .lean();

    return topPerformers.map((analytics) => ({
      userId: analytics.userId,
      userName: (analytics.userId as any).name,
      overallAccuracy: analytics.overallAccuracy,
      strongestCategory: this.getStrongestCategory(analytics as any),
    }));
  }

  private static async getStaffNeedingSupport(
    restaurantId: Types.ObjectId,
    limit: number
  ): Promise<RestaurantKnowledgeAnalytics["staffNeedingSupport"]> {
    const staffNeedingSupport = await UserKnowledgeAnalyticsModel.find({
      restaurantId,
      overallAccuracy: { $lt: 70 }, // Below 70% accuracy
    })
      .populate("userId", "name")
      .sort({ overallAccuracy: 1 })
      .limit(limit)
      .lean();

    return staffNeedingSupport.map((analytics) => ({
      userId: analytics.userId,
      userName: (analytics.userId as any).name,
      overallAccuracy: analytics.overallAccuracy,
      weakestCategory: this.getWeakestCategory(analytics as any),
    }));
  }

  private static async getQuestionDistribution(
    restaurantId: Types.ObjectId
  ): Promise<RestaurantKnowledgeAnalytics["questionDistribution"]> {
    const distribution = {} as any;

    for (const category of Object.values(KnowledgeCategory)) {
      const questions = await QuestionModel.find({
        restaurantId,
        knowledgeCategory: category,
      }).lean();

      const aiGenerated = questions.filter((q) => q.createdBy === "ai").length;
      const manuallyCreated = questions.filter(
        (q) => q.createdBy === "manual"
      ).length;

      distribution[category] = {
        totalQuestions: questions.length,
        aiGenerated,
        manuallyCreated,
      };
    }

    return distribution;
  }

  private static getStrongestCategory(
    analytics: IUserKnowledgeAnalytics
  ): KnowledgeCategory {
    const categories = [
      {
        category: KnowledgeCategory.FOOD_KNOWLEDGE,
        accuracy: analytics.foodKnowledge.accuracy,
      },
      {
        category: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
        accuracy: analytics.beverageKnowledge.accuracy,
      },
      {
        category: KnowledgeCategory.WINE_KNOWLEDGE,
        accuracy: analytics.wineKnowledge.accuracy,
      },
      {
        category: KnowledgeCategory.PROCEDURES_KNOWLEDGE,
        accuracy: analytics.proceduresKnowledge.accuracy,
      },
    ];

    return categories.reduce((max, current) =>
      current.accuracy > max.accuracy ? current : max
    ).category;
  }

  private static getWeakestCategory(
    analytics: IUserKnowledgeAnalytics
  ): KnowledgeCategory {
    const categories = [
      {
        category: KnowledgeCategory.FOOD_KNOWLEDGE,
        accuracy: analytics.foodKnowledge.accuracy,
      },
      {
        category: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
        accuracy: analytics.beverageKnowledge.accuracy,
      },
      {
        category: KnowledgeCategory.WINE_KNOWLEDGE,
        accuracy: analytics.wineKnowledge.accuracy,
      },
      {
        category: KnowledgeCategory.PROCEDURES_KNOWLEDGE,
        accuracy: analytics.proceduresKnowledge.accuracy,
      },
    ];

    // Filter out categories with no questions answered
    const activCategories = categories.filter((c) => c.accuracy > 0);
    if (activCategories.length === 0) return KnowledgeCategory.FOOD_KNOWLEDGE;

    return activCategories.reduce((min, current) =>
      current.accuracy < min.accuracy ? current : min
    ).category;
  }

  private static async calculateUserCategoryTrend(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    category: KnowledgeCategory,
    days: number
  ): Promise<"improving" | "declining" | "stable"> {
    // Simplified trend calculation - implement based on daily tracking
    return "stable";
  }

  private static getStrengthLevel(
    accuracy: number
  ): "strong" | "average" | "needs_work" {
    if (accuracy >= 80) return "strong";
    if (accuracy >= 60) return "average";
    return "needs_work";
  }

  private static generateRecommendations(
    categoryPerformance: StaffKnowledgeProfile["categoryPerformance"]
  ): StaffKnowledgeProfile["recommendations"] {
    const recommendations: StaffKnowledgeProfile["recommendations"] = [];

    for (const [category, performance] of Object.entries(categoryPerformance)) {
      if (performance.strengthLevel === "needs_work") {
        recommendations.push({
          category: category as KnowledgeCategory,
          suggestion: `Focus on improving ${category.replace(
            "-",
            " "
          )} skills through additional practice`,
          priority: "high",
        });
      } else if (
        performance.strengthLevel === "average" &&
        performance.trend === "declining"
      ) {
        recommendations.push({
          category: category as KnowledgeCategory,
          suggestion: `Review recent ${category.replace(
            "-",
            " "
          )} materials to maintain performance`,
          priority: "medium",
        });
      }
    }

    return recommendations;
  }

  private static async calculateUser30DayTrend(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<StaffKnowledgeProfile["last30DaysTrend"]> {
    // Simplified implementation - expand based on daily tracking
    return {
      accuracyChange: 0,
      questionsAnswered: 0,
      mostActiveCategory: KnowledgeCategory.FOOD_KNOWLEDGE,
    };
  }

  private static async calculateCategoryAverage30Days(
    restaurantId: Types.ObjectId,
    category: KnowledgeCategory
  ): Promise<number> {
    // Simplified implementation - expand based on daily tracking
    return 0;
  }

  private static async getCategoryQuestionStats(
    restaurantId: Types.ObjectId,
    category: KnowledgeCategory
  ) {
    const questions = await QuestionModel.find({
      restaurantId,
      knowledgeCategory: category,
    }).lean();

    return {
      totalAvailable: questions.length,
      aiGenerated: questions.filter((q) => q.createdBy === "ai").length,
      manuallyCreated: questions.filter((q) => q.createdBy === "manual").length,
      averageDifficulty: "Medium", // Simplified - implement difficulty calculation
    };
  }

  private static generateCategoryTrainingRecommendations(
    category: KnowledgeCategory,
    averageAccuracy: number,
    staffPerformanceLevels: CategoryAnalyticsInsights["staffPerformanceLevels"]
  ): string[] {
    const recommendations: string[] = [];

    if (averageAccuracy < 70) {
      recommendations.push(
        `Team-wide training needed for ${category.replace("-", " ")}`
      );
    }

    if (staffPerformanceLevels.needsWork > staffPerformanceLevels.strong) {
      recommendations.push(
        `Focus on fundamentals in ${category.replace("-", " ")}`
      );
    }

    if (staffPerformanceLevels.strong > 0) {
      recommendations.push(
        `Leverage high-performers as mentors for ${category.replace("-", " ")}`
      );
    }

    return recommendations;
  }

  // PHASE 5: ADVANCED ANALYTICS METHODS

  /**
   * Get analytics for a custom time range
   */
  static async getTimeRangeAnalytics(
    restaurantId: Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<TimeRangeAnalytics> {
    // Get quiz attempts within the time range
    const quizAttempts = await QuizAttempt.find({
      restaurantId,
      attemptDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("staffUserId", "name")
      .populate({
        path: "questionsPresented.questionId",
        select: "knowledgeCategory",
      })
      .lean();

    if (quizAttempts.length === 0) {
      return this.getEmptyTimeRangeAnalytics(startDate, endDate);
    }

    // Calculate overall metrics
    const totalQuestions = quizAttempts.reduce(
      (sum, attempt) => sum + attempt.questionsPresented.length,
      0
    );

    const correctAnswers = quizAttempts.reduce(
      (sum, attempt) =>
        sum + attempt.questionsPresented.filter((q: any) => q.isCorrect).length,
      0
    );

    const averageAccuracy = (correctAnswers / totalQuestions) * 100;

    // Get unique staff who participated
    const uniqueStaff = new Set(
      quizAttempts.map((attempt) => attempt.staffUserId.toString())
    );
    const staffParticipation = uniqueStaff.size;

    // Calculate category breakdown
    const categoryBreakdown = {} as TimeRangeAnalytics["categoryBreakdown"];

    for (const category of Object.values(KnowledgeCategory)) {
      const categoryResponses = quizAttempts
        .flatMap((attempt) => attempt.questionsPresented)
        .filter(
          (question: any) =>
            (question.questionId as any)?.knowledgeCategory === category
        );

      const categoryTotalQuestions = categoryResponses.length;
      const categoryCorrectAnswers = categoryResponses.filter(
        (q: any) => q.isCorrect
      ).length;
      const categoryAccuracy =
        categoryTotalQuestions > 0
          ? (categoryCorrectAnswers / categoryTotalQuestions) * 100
          : 0;

      // Calculate improvement (placeholder - would compare with previous period)
      const improvement = 0; // TODO: Implement comparison with previous period

      categoryBreakdown[category] = {
        totalQuestions: categoryTotalQuestions,
        averageAccuracy: categoryAccuracy,
        improvement,
      };
    }

    return {
      startDate,
      endDate,
      totalQuestions,
      averageAccuracy,
      staffParticipation,
      categoryBreakdown,
    };
  }

  /**
   * Get comparative analytics between two time periods
   */
  static async getComparativeAnalytics(
    restaurantId: Types.ObjectId,
    timeframe: "week" | "month" | "quarter" | "year"
  ): Promise<ComparativeAnalytics> {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date;

    // Calculate date ranges based on timeframe
    switch (timeframe) {
      case "week":
        currentEnd = now;
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStart = new Date(
          currentStart.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case "month":
        currentEnd = now;
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case "quarter":
        currentEnd = now;
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        previousStart = new Date(
          now.getFullYear(),
          (currentQuarter - 1) * 3,
          1
        );
        break;
      case "year":
        currentEnd = now;
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        break;
    }

    const previousEnd = new Date(currentStart.getTime() - 1);

    // Get analytics for both periods
    const currentPeriod = await this.getTimeRangeAnalytics(
      restaurantId,
      currentStart,
      currentEnd
    );
    const previousPeriod = await this.getTimeRangeAnalytics(
      restaurantId,
      previousStart,
      previousEnd
    );

    // Calculate improvements
    const overall =
      previousPeriod.averageAccuracy > 0
        ? ((currentPeriod.averageAccuracy - previousPeriod.averageAccuracy) /
            previousPeriod.averageAccuracy) *
          100
        : 0;

    const byCategory = {} as ComparativeAnalytics["improvement"]["byCategory"];
    for (const category of Object.values(KnowledgeCategory)) {
      const currentAcc =
        currentPeriod.categoryBreakdown[category].averageAccuracy;
      const previousAcc =
        previousPeriod.categoryBreakdown[category].averageAccuracy;
      byCategory[category] =
        previousAcc > 0 ? ((currentAcc - previousAcc) / previousAcc) * 100 : 0;
    }

    // Define benchmarks
    const benchmarks = {
      topPerformerThreshold: 85,
      improvementGoals: {
        [KnowledgeCategory.FOOD_KNOWLEDGE]: 80,
        [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: 75,
        [KnowledgeCategory.WINE_KNOWLEDGE]: 70,
        [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: 85,
      },
    };

    return {
      restaurantId,
      timeframe,
      currentPeriod,
      previousPeriod,
      improvement: { overall, byCategory },
      benchmarks,
    };
  }

  /**
   * Generate predictive insights and recommendations
   */
  static async getPredictiveInsights(
    restaurantId: Types.ObjectId
  ): Promise<PredictiveInsights> {
    // Get all staff analytics
    const allStaffAnalytics = await UserKnowledgeAnalyticsModel.find({
      restaurantId,
    })
      .populate("userId", "name")
      .lean();

    // Identify staff at risk
    const staffAtRisk = allStaffAnalytics
      .filter((analytics) => {
        const overallAccuracy = analytics.overallAccuracy;
        const hasDeclinePattern = this.hasDeclinePattern(analytics);
        return overallAccuracy < 70 || hasDeclinePattern;
      })
      .map((analytics) => {
        const weakCategories = this.getWeakCategories(analytics);
        const riskLevel = this.calculateRiskLevel(analytics);
        const recommendedActions = this.getRecommendedActions(
          analytics,
          weakCategories
        );

        return {
          userId: analytics.userId,
          userName: (analytics.userId as any).name,
          riskLevel,
          categories: weakCategories,
          recommendedActions,
        };
      });

    // Generate category forecasts
    const categoryForecasts = {} as PredictiveInsights["categoryForecasts"];
    for (const category of Object.values(KnowledgeCategory)) {
      const forecast = await this.forecastCategoryPerformance(
        restaurantId,
        category
      );
      categoryForecasts[category] = forecast;
    }

    // Determine training priorities
    const trainingPriorities =
      this.calculateTrainingPriorities(allStaffAnalytics);

    return {
      restaurantId,
      staffAtRisk,
      categoryForecasts,
      trainingPriorities,
    };
  }

  // Helper methods for predictive analytics

  private static hasDeclinePattern(analytics: any): boolean {
    // Check if there's a declining trend in the last 30 days
    // This is a simplified implementation - in production, you'd analyze historical data
    const categories = [
      analytics.foodKnowledge,
      analytics.beverageKnowledge,
      analytics.wineKnowledge,
      analytics.proceduresKnowledge,
    ];

    const decliningCategories = categories.filter(
      (cat) => cat.accuracy < 60 && cat.totalQuestions > 5
    );

    return decliningCategories.length >= 2;
  }

  private static getWeakCategories(analytics: any): KnowledgeCategory[] {
    const categories = [
      {
        category: KnowledgeCategory.FOOD_KNOWLEDGE,
        accuracy: analytics.foodKnowledge.accuracy,
        questions: analytics.foodKnowledge.totalQuestions,
      },
      {
        category: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
        accuracy: analytics.beverageKnowledge.accuracy,
        questions: analytics.beverageKnowledge.totalQuestions,
      },
      {
        category: KnowledgeCategory.WINE_KNOWLEDGE,
        accuracy: analytics.wineKnowledge.accuracy,
        questions: analytics.wineKnowledge.totalQuestions,
      },
      {
        category: KnowledgeCategory.PROCEDURES_KNOWLEDGE,
        accuracy: analytics.proceduresKnowledge.accuracy,
        questions: analytics.proceduresKnowledge.totalQuestions,
      },
    ];

    return categories
      .filter((cat) => cat.accuracy < 65 && cat.questions > 3)
      .map((cat) => cat.category);
  }

  private static calculateRiskLevel(analytics: any): "low" | "medium" | "high" {
    const accuracy = analytics.overallAccuracy;
    const totalQuestions = analytics.totalQuestionsAnswered;

    if (accuracy < 50 || (accuracy < 60 && totalQuestions > 20)) {
      return "high";
    } else if (accuracy < 70 || this.hasDeclinePattern(analytics)) {
      return "medium";
    }
    return "low";
  }

  private static getRecommendedActions(
    analytics: any,
    weakCategories: KnowledgeCategory[]
  ): string[] {
    const actions: string[] = [];

    if (analytics.overallAccuracy < 60) {
      actions.push("Schedule immediate one-on-one training session");
    }

    weakCategories.forEach((category) => {
      switch (category) {
        case KnowledgeCategory.FOOD_KNOWLEDGE:
          actions.push("Review menu items and ingredient knowledge");
          break;
        case KnowledgeCategory.BEVERAGE_KNOWLEDGE:
          actions.push("Practice drink preparation and cocktail recipes");
          break;
        case KnowledgeCategory.WINE_KNOWLEDGE:
          actions.push("Study wine varieties and pairing recommendations");
          break;
        case KnowledgeCategory.PROCEDURES_KNOWLEDGE:
          actions.push("Review SOPs and safety protocols");
          break;
      }
    });

    if (analytics.totalQuestionsAnswered < 10) {
      actions.push("Encourage more frequent quiz participation");
    }

    return actions;
  }

  private static async forecastCategoryPerformance(
    restaurantId: Types.ObjectId,
    category: KnowledgeCategory
  ): Promise<{
    predicted30DayAccuracy: number;
    confidence: number;
    trendDirection: "improving" | "declining" | "stable";
  }> {
    // Simplified forecasting - in production, this would use machine learning
    const currentAnalytics = await this.getCategoryAnalytics(
      restaurantId,
      category
    );

    const currentAccuracy = currentAnalytics.averageAccuracy;
    const trend = currentAnalytics.accuracyTrend;

    let predicted30DayAccuracy = currentAccuracy;
    let trendDirection: "improving" | "declining" | "stable" = "stable";

    if (trend > 5) {
      predicted30DayAccuracy = Math.min(100, currentAccuracy + trend * 0.3);
      trendDirection = "improving";
    } else if (trend < -5) {
      predicted30DayAccuracy = Math.max(0, currentAccuracy + trend * 0.3);
      trendDirection = "declining";
    }

    const confidence = Math.min(
      90,
      60 + currentAnalytics.totalStaffParticipating * 2
    );

    return {
      predicted30DayAccuracy,
      confidence,
      trendDirection,
    };
  }

  private static calculateTrainingPriorities(allStaffAnalytics: any[]): Array<{
    category: KnowledgeCategory;
    priority: "high" | "medium" | "low";
    estimatedImpact: number;
  }> {
    const priorities: Array<{
      category: KnowledgeCategory;
      priority: "high" | "medium" | "low";
      estimatedImpact: number;
    }> = [];

    for (const category of Object.values(KnowledgeCategory)) {
      const categoryField = this.getCategoryField(category);
      const staffWithData = allStaffAnalytics.filter(
        (analytics) => (analytics as any)[categoryField].totalQuestions > 0
      );

      if (staffWithData.length === 0) continue;

      const averageAccuracy =
        staffWithData.reduce(
          (sum, analytics) => sum + (analytics as any)[categoryField].accuracy,
          0
        ) / staffWithData.length;

      const staffBelowThreshold = staffWithData.filter(
        (analytics) => (analytics as any)[categoryField].accuracy < 70
      ).length;

      const impactPercentage =
        (staffBelowThreshold / staffWithData.length) * 100;

      let priority: "high" | "medium" | "low" = "low";
      if (averageAccuracy < 60 || impactPercentage > 50) {
        priority = "high";
      } else if (averageAccuracy < 75 || impactPercentage > 25) {
        priority = "medium";
      }

      priorities.push({
        category,
        priority,
        estimatedImpact: Math.round(impactPercentage),
      });
    }

    return priorities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private static getEmptyTimeRangeAnalytics(
    startDate: Date,
    endDate: Date
  ): TimeRangeAnalytics {
    const categoryBreakdown = {} as TimeRangeAnalytics["categoryBreakdown"];

    for (const category of Object.values(KnowledgeCategory)) {
      categoryBreakdown[category] = {
        totalQuestions: 0,
        averageAccuracy: 0,
        improvement: 0,
      };
    }

    return {
      startDate,
      endDate,
      totalQuestions: 0,
      averageAccuracy: 0,
      staffParticipation: 0,
      categoryBreakdown,
    };
  }
}
