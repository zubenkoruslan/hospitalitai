import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { KnowledgeCategory } from "./QuestionModel";
import {
  ArchivedQuizAnalytics,
  ArchivalReason,
} from "../types/analyticsArchivalTypes";

// Extend the interface to include MongoDB Document properties
export interface IArchivedQuizAnalytics
  extends ArchivedQuizAnalytics,
    Document {
  _id: Types.ObjectId;
  getInsightSummary(): string[];
}

// Schema for category breakdown
const CategoryBreakdownSchema = new Schema(
  {
    totalQuestions: { type: Number, default: 0, min: 0 },
    correctAnswers: { type: Number, default: 0, min: 0 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
    participantCount: { type: Number, default: 0, min: 0 },
    averageCompletionTime: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Schema for performance statistics
const PerformanceStatsSchema = new Schema(
  {
    highestScore: { type: Number, required: true, min: 0 },
    lowestScore: { type: Number, required: true, min: 0 },
    medianScore: { type: Number, required: true, min: 0 },
    standardDeviation: { type: Number, required: true, min: 0 },
    completionTimeStats: {
      fastest: { type: Number, required: true, min: 0 },
      slowest: { type: Number, required: true, min: 0 },
      average: { type: Number, required: true, min: 0 },
    },
  },
  { _id: false }
);

// Schema for active lifespan tracking
const ActiveLifespanSchema = new Schema(
  {
    createdAt: { type: Date, required: true },
    firstAttempt: { type: Date },
    lastAttempt: { type: Date },
    totalActiveDays: { type: Number, required: true, min: 0 },
    peakUsagePeriod: {
      start: { type: Date },
      end: { type: Date },
      attemptCount: { type: Number, min: 0 },
    },
  },
  { _id: false }
);

// Schema for top performances
const TopPerformanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true, min: 0 },
    completionTime: { type: Number, required: true, min: 0 },
    attemptDate: { type: Date, required: true },
    knowledgeCategoriesStrong: [
      {
        type: String,
        enum: Object.values(KnowledgeCategory),
      },
    ],
  },
  { _id: false }
);

// Schema for learning outcomes
const LearningOutcomesSchema = new Schema(
  {
    improvementTrend: { type: Number, required: true },
    difficultyAreas: [
      {
        type: String,
        enum: Object.values(KnowledgeCategory),
      },
    ],
    strongestAreas: [
      {
        type: String,
        enum: Object.values(KnowledgeCategory),
      },
    ],
    retentionIndicators: {
      repeatTakers: { type: Number, required: true, min: 0 },
      averageRetakeImprovement: { type: Number, required: true },
    },
  },
  { _id: false }
);

// Main schema for archived quiz analytics
const ArchivedQuizAnalyticsSchema: Schema<IArchivedQuizAnalytics> = new Schema(
  {
    originalQuizId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    // Quiz metadata at time of archival
    quizTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    quizDescription: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    archivedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    archivalReason: {
      type: String,
      enum: Object.values(ArchivalReason),
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Aggregated analytics
    totalAttempts: {
      type: Number,
      required: true,
      min: 0,
    },
    totalParticipants: {
      type: Number,
      required: true,
      min: 0,
    },
    averageScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    totalQuestionsAnswered: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCorrectAnswers: {
      type: Number,
      required: true,
      min: 0,
    },
    overallAccuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Category breakdown
    categoryBreakdown: {
      [KnowledgeCategory.FOOD_KNOWLEDGE]: {
        type: CategoryBreakdownSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          participantCount: 0,
          averageCompletionTime: 0,
        }),
      },
      [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
        type: CategoryBreakdownSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          participantCount: 0,
          averageCompletionTime: 0,
        }),
      },
      [KnowledgeCategory.WINE_KNOWLEDGE]: {
        type: CategoryBreakdownSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          participantCount: 0,
          averageCompletionTime: 0,
        }),
      },
      [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
        type: CategoryBreakdownSchema,
        default: () => ({
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          participantCount: 0,
          averageCompletionTime: 0,
        }),
      },
    },

    // Time-based insights
    activeLifespan: {
      type: ActiveLifespanSchema,
      required: true,
    },

    // Performance insights
    performanceStats: {
      type: PerformanceStatsSchema,
      required: true,
    },

    // Top performers
    topPerformances: [TopPerformanceSchema],

    // Learning outcomes
    learningOutcomes: {
      type: LearningOutcomesSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "archived_quiz_analytics",
  }
);

// Indexes for efficient querying
ArchivedQuizAnalyticsSchema.index({ restaurantId: 1, archivedAt: -1 });
ArchivedQuizAnalyticsSchema.index({ originalQuizId: 1 });
ArchivedQuizAnalyticsSchema.index({ archivalReason: 1, archivedAt: -1 });
ArchivedQuizAnalyticsSchema.index({ "activeLifespan.createdAt": 1 });

// TTL index for automatic cleanup after retention period (3 years default)
ArchivedQuizAnalyticsSchema.index(
  { archivedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 * 3 } // 3 years
);

// Methods for analytics calculations
ArchivedQuizAnalyticsSchema.methods.getInsightSummary = function (): string[] {
  const insights: string[] = [];

  if (this.totalAttempts > 0) {
    insights.push(
      `${this.totalParticipants} staff members completed ${this.totalAttempts} total attempts`
    );
    insights.push(`Overall accuracy: ${this.overallAccuracy.toFixed(1)}%`);

    // Find strongest and weakest categories
    const categories = Object.entries(this.categoryBreakdown) as [
      string,
      any
    ][];
    const strongest = categories.reduce(
      (max, [key, data]) =>
        data.accuracy > max.accuracy
          ? { category: key, accuracy: data.accuracy }
          : max,
      { category: "", accuracy: 0 }
    );
    const weakest = categories.reduce(
      (min, [key, data]) =>
        data.accuracy < min.accuracy && data.accuracy > 0
          ? { category: key, accuracy: data.accuracy }
          : min,
      { category: "", accuracy: 100 }
    );

    if (strongest.category) {
      insights.push(
        `Strongest area: ${strongest.category.replace(
          "-knowledge",
          ""
        )} (${strongest.accuracy.toFixed(1)}%)`
      );
    }
    if (weakest.category && weakest.accuracy < 100) {
      insights.push(
        `Area for improvement: ${weakest.category.replace(
          "-knowledge",
          ""
        )} (${weakest.accuracy.toFixed(1)}%)`
      );
    }
  }

  return insights;
};

// Static methods for analytics queries
ArchivedQuizAnalyticsSchema.statics.getRestaurantArchivedInsights =
  async function (
    restaurantId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ) {
    const matchStage: any = { restaurantId };

    if (timeRange) {
      matchStage.archivedAt = {
        $gte: timeRange.start,
        $lte: timeRange.end,
      };
    }

    return await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalArchivedQuizzes: { $sum: 1 },
          totalHistoricalAttempts: { $sum: "$totalAttempts" },
          totalHistoricalParticipants: { $sum: "$totalParticipants" },
          averageHistoricalAccuracy: { $avg: "$overallAccuracy" },
          archivalReasons: { $push: "$archivalReason" },
        },
      },
    ]);
  };

// Define the model interface with static methods
interface IArchivedQuizAnalyticsModel extends Model<IArchivedQuizAnalytics> {
  getRestaurantArchivedInsights(
    restaurantId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ): Promise<any>;
}

const ArchivedQuizAnalyticsModel =
  (mongoose.models.ArchivedQuizAnalytics as IArchivedQuizAnalyticsModel) ||
  mongoose.model<IArchivedQuizAnalytics, IArchivedQuizAnalyticsModel>(
    "ArchivedQuizAnalytics",
    ArchivedQuizAnalyticsSchema
  );

export default ArchivedQuizAnalyticsModel;
