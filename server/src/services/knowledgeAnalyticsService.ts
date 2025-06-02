import mongoose, { Types } from "mongoose";
import UserKnowledgeAnalyticsModel, {
  IUserKnowledgeAnalytics,
  ICategoryStats,
} from "../models/UserKnowledgeAnalytics";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel";
import QuizAttempt from "../models/QuizAttempt";
import User from "../models/User";

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

export class KnowledgeAnalyticsService {
  /**
   * Get comprehensive analytics for a restaurant
   */
  static async getRestaurantAnalytics(
    restaurantId: Types.ObjectId
  ): Promise<RestaurantKnowledgeAnalytics> {
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

    return {
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

    return {
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
      strongestCategory: this.getStrongestCategory(
        analytics as IUserKnowledgeAnalytics
      ),
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
      weakestCategory: this.getWeakestCategory(analytics),
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
}
