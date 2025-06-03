import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { KnowledgeCategory } from "./QuestionModel";

export interface ICategoryStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number; // Percentage
  averageScore: number;
  lastAttemptDate?: Date;

  // Completion time tracking
  totalCompletionTime: number; // Total time in seconds
  averageCompletionTime: number; // Average time per question in seconds
  fastestCompletionTime?: number; // Fastest single question time
  slowestCompletionTime?: number; // Slowest single question time

  // Subcategory breakdown
  subcategoryStats: Map<
    string,
    {
      correct: number;
      total: number;
      accuracy: number;
    }
  >;

  // Difficulty breakdown
  difficultyStats: {
    basic: { correct: number; total: number; accuracy: number };
    intermediate: { correct: number; total: number; accuracy: number };
    advanced: { correct: number; total: number; accuracy: number };
  };
}

export interface ICategoryTrendData {
  dailyAccuracy: Array<{
    date: Date;
    accuracy: number;
    questionsAnswered: number;
  }>;
  weeklyImprovement: number; // Percentage change
  streakDays: number;
}

export interface IUserKnowledgeAnalytics extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;

  // Knowledge category statistics
  foodKnowledge: ICategoryStats;
  beverageKnowledge: ICategoryStats;
  wineKnowledge: ICategoryStats;
  proceduresKnowledge: ICategoryStats;

  // Overall analytics
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  lastUpdated: Date;

  // Overall completion time tracking
  totalQuizzesCompleted: number;
  totalQuizCompletionTime: number; // Total time for all quizzes in seconds
  averageQuizCompletionTime: number; // Average time per quiz in seconds
  fastestQuizCompletionTime?: number; // Fastest complete quiz time
  slowestQuizCompletionTime?: number; // Slowest complete quiz time

  // Trending data (last 30 days)
  last30Days: {
    foodKnowledge: ICategoryTrendData;
    beverageKnowledge: ICategoryTrendData;
    wineKnowledge: ICategoryTrendData;
    proceduresKnowledge: ICategoryTrendData;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

// Schema for category statistics
const CategoryStatsSchema = new Schema(
  {
    totalQuestions: { type: Number, default: 0, min: 0 },
    correctAnswers: { type: Number, default: 0, min: 0 },
    incorrectAnswers: { type: Number, default: 0, min: 0 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
    averageScore: { type: Number, default: 0, min: 0, max: 100 },
    lastAttemptDate: { type: Date, required: false },

    // Completion time tracking
    totalCompletionTime: { type: Number, default: 0, min: 0 },
    averageCompletionTime: { type: Number, default: 0, min: 0 },
    fastestCompletionTime: { type: Number, required: false },
    slowestCompletionTime: { type: Number, required: false },

    subcategoryStats: {
      type: Map,
      of: {
        correct: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
        accuracy: { type: Number, default: 0, min: 0, max: 100 },
      },
      default: new Map(),
    },

    difficultyStats: {
      basic: {
        correct: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
        accuracy: { type: Number, default: 0, min: 0, max: 100 },
      },
      intermediate: {
        correct: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
        accuracy: { type: Number, default: 0, min: 0, max: 100 },
      },
      advanced: {
        correct: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
        accuracy: { type: Number, default: 0, min: 0, max: 100 },
      },
    },
  },
  { _id: false }
);

// Schema for trend data
const CategoryTrendDataSchema = new Schema(
  {
    dailyAccuracy: [
      {
        date: { type: Date, required: true },
        accuracy: { type: Number, min: 0, max: 100, default: 0 },
        questionsAnswered: { type: Number, min: 0, default: 0 },
      },
    ],
    weeklyImprovement: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const UserKnowledgeAnalyticsSchema: Schema<IUserKnowledgeAnalytics> =
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      restaurantId: {
        type: Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
        index: true,
      },

      // Knowledge category statistics
      foodKnowledge: {
        type: CategoryStatsSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          accuracy: 0,
          averageScore: 0,
          subcategoryStats: new Map(),
          difficultyStats: {
            basic: { correct: 0, total: 0, accuracy: 0 },
            intermediate: { correct: 0, total: 0, accuracy: 0 },
            advanced: { correct: 0, total: 0, accuracy: 0 },
          },
        }),
      },
      beverageKnowledge: {
        type: CategoryStatsSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          accuracy: 0,
          averageScore: 0,
          subcategoryStats: new Map(),
          difficultyStats: {
            basic: { correct: 0, total: 0, accuracy: 0 },
            intermediate: { correct: 0, total: 0, accuracy: 0 },
            advanced: { correct: 0, total: 0, accuracy: 0 },
          },
        }),
      },
      wineKnowledge: {
        type: CategoryStatsSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          accuracy: 0,
          averageScore: 0,
          subcategoryStats: new Map(),
          difficultyStats: {
            basic: { correct: 0, total: 0, accuracy: 0 },
            intermediate: { correct: 0, total: 0, accuracy: 0 },
            advanced: { correct: 0, total: 0, accuracy: 0 },
          },
        }),
      },
      proceduresKnowledge: {
        type: CategoryStatsSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          accuracy: 0,
          averageScore: 0,
          subcategoryStats: new Map(),
          difficultyStats: {
            basic: { correct: 0, total: 0, accuracy: 0 },
            intermediate: { correct: 0, total: 0, accuracy: 0 },
            advanced: { correct: 0, total: 0, accuracy: 0 },
          },
        }),
      },

      // Overall analytics
      totalQuestionsAnswered: {
        type: Number,
        default: 0,
        min: 0,
      },
      overallAccuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
        required: true,
      },

      // Overall completion time tracking
      totalQuizzesCompleted: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalQuizCompletionTime: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageQuizCompletionTime: {
        type: Number,
        default: 0,
        min: 0,
      },
      fastestQuizCompletionTime: {
        type: Number,
        required: false,
      },
      slowestQuizCompletionTime: {
        type: Number,
        required: false,
      },

      // Trending data (last 30 days)
      last30Days: {
        foodKnowledge: {
          type: CategoryTrendDataSchema,
          default: () => ({
            dailyAccuracy: [],
            weeklyImprovement: 0,
            streakDays: 0,
          }),
        },
        beverageKnowledge: {
          type: CategoryTrendDataSchema,
          default: () => ({
            dailyAccuracy: [],
            weeklyImprovement: 0,
            streakDays: 0,
          }),
        },
        wineKnowledge: {
          type: CategoryTrendDataSchema,
          default: () => ({
            dailyAccuracy: [],
            weeklyImprovement: 0,
            streakDays: 0,
          }),
        },
        proceduresKnowledge: {
          type: CategoryTrendDataSchema,
          default: () => ({
            dailyAccuracy: [],
            weeklyImprovement: 0,
            streakDays: 0,
          }),
        },
      },
    },
    {
      timestamps: true,
      // Add compound indexes for efficient queries
      indexes: [
        { userId: 1, restaurantId: 1 }, // Unique per user per restaurant
      ],
    }
  );

// Add unique compound index
UserKnowledgeAnalyticsSchema.index(
  { userId: 1, restaurantId: 1 },
  { unique: true }
);

// Instance methods for calculating and updating analytics
UserKnowledgeAnalyticsSchema.methods.updateCategoryStats = function (
  category: KnowledgeCategory,
  isCorrect: boolean,
  subcategories?: string[],
  difficulty: "basic" | "intermediate" | "advanced" = "basic"
) {
  const categoryField = this.getCategoryField(category);
  const stats = this[categoryField];

  // Update basic stats
  stats.totalQuestions++;
  if (isCorrect) {
    stats.correctAnswers++;
  } else {
    stats.incorrectAnswers++;
  }

  // Recalculate accuracy
  stats.accuracy = (stats.correctAnswers / stats.totalQuestions) * 100;
  stats.lastAttemptDate = new Date();

  // Update subcategory stats
  if (subcategories) {
    for (const subcategory of subcategories) {
      const subStats = stats.subcategoryStats.get(subcategory) || {
        correct: 0,
        total: 0,
        accuracy: 0,
      };

      subStats.total++;
      if (isCorrect) subStats.correct++;
      subStats.accuracy = (subStats.correct / subStats.total) * 100;

      stats.subcategoryStats.set(subcategory, subStats);
    }
  }

  // Update difficulty stats
  const diffStats = stats.difficultyStats[difficulty];
  diffStats.total++;
  if (isCorrect) diffStats.correct++;
  diffStats.accuracy = (diffStats.correct / diffStats.total) * 100;

  // Update overall stats
  this.totalQuestionsAnswered++;
  this.overallAccuracy = this.calculateOverallAccuracy();
  this.lastUpdated = new Date();
};

UserKnowledgeAnalyticsSchema.methods.getCategoryField = function (
  category: KnowledgeCategory
): string {
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
};

UserKnowledgeAnalyticsSchema.methods.calculateOverallAccuracy =
  function (): number {
    const categories = [
      this.foodKnowledge,
      this.beverageKnowledge,
      this.wineKnowledge,
      this.proceduresKnowledge,
    ];
    let totalCorrect = 0;
    let totalQuestions = 0;

    categories.forEach((category) => {
      totalCorrect += category.correctAnswers;
      totalQuestions += category.totalQuestions;
    });

    return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  };

const UserKnowledgeAnalyticsModel: Model<IUserKnowledgeAnalytics> =
  mongoose.models.UserKnowledgeAnalytics ||
  mongoose.model<IUserKnowledgeAnalytics>(
    "UserKnowledgeAnalytics",
    UserKnowledgeAnalyticsSchema
  );

export default UserKnowledgeAnalyticsModel;
