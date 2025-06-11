import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { KnowledgeCategory } from "./QuestionModel";
import {
  UserPerformanceSnapshot,
  ArchivalReason,
} from "../types/analyticsArchivalTypes";

// Extend the interface to include MongoDB Document properties
interface IUserPerformanceSnapshot extends UserPerformanceSnapshot, Document {
  _id: Types.ObjectId;
}

// Schema for category performance tracking
const CategoryPerformanceSchema = new Schema(
  {
    questionsAnswered: { type: Number, default: 0, min: 0 },
    correctAnswers: { type: Number, default: 0, min: 0 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
    averageCompletionTime: { type: Number, default: 0, min: 0 },
    improvementTrend: { type: Number, default: 0 },
  },
  { _id: false }
);

// Schema for learning metrics
const LearningMetricsSchema = new Schema(
  {
    consistencyScore: { type: Number, required: true, min: 0, max: 100 },
    difficultyProgression: { type: Number, required: true },
    knowledgeRetention: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

// Main schema for user performance snapshots
const UserPerformanceSnapshotSchema: Schema<IUserPerformanceSnapshot> =
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
      quizId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      snapshotDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },
      snapshotReason: {
        type: String,
        enum: Object.values(ArchivalReason),
        required: true,
        index: true,
      },

      // Performance metrics at time of snapshot
      totalAttempts: {
        type: Number,
        required: true,
        min: 0,
      },
      bestScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      averageScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      lastAttemptDate: {
        type: Date,
        required: true,
      },
      firstAttemptDate: {
        type: Date,
        required: true,
      },

      // Category performance breakdown
      categoryPerformance: {
        [KnowledgeCategory.FOOD_KNOWLEDGE]: {
          type: CategoryPerformanceSchema,
          default: () => ({
            questionsAnswered: 0,
            correctAnswers: 0,
            accuracy: 0,
            averageCompletionTime: 0,
            improvementTrend: 0,
          }),
        },
        [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
          type: CategoryPerformanceSchema,
          default: () => ({
            questionsAnswered: 0,
            correctAnswers: 0,
            accuracy: 0,
            averageCompletionTime: 0,
            improvementTrend: 0,
          }),
        },
        [KnowledgeCategory.WINE_KNOWLEDGE]: {
          type: CategoryPerformanceSchema,
          default: () => ({
            questionsAnswered: 0,
            correctAnswers: 0,
            accuracy: 0,
            averageCompletionTime: 0,
            improvementTrend: 0,
          }),
        },
        [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
          type: CategoryPerformanceSchema,
          default: () => ({
            questionsAnswered: 0,
            correctAnswers: 0,
            accuracy: 0,
            averageCompletionTime: 0,
            improvementTrend: 0,
          }),
        },
      },

      // Time investment metrics
      totalTimeInvested: {
        type: Number,
        required: true,
        min: 0,
      },
      averageCompletionTime: {
        type: Number,
        required: true,
        min: 0,
      },
      fastestCompletion: {
        type: Number,
        required: true,
        min: 0,
      },

      // Learning progress indicators
      learningMetrics: {
        type: LearningMetricsSchema,
        required: true,
      },
    },
    {
      timestamps: true,
      collection: "user_performance_snapshots",
    }
  );

// Compound indexes for efficient querying
UserPerformanceSnapshotSchema.index({ userId: 1, quizId: 1, snapshotDate: -1 });
UserPerformanceSnapshotSchema.index({ restaurantId: 1, snapshotDate: -1 });
UserPerformanceSnapshotSchema.index({ quizId: 1, snapshotReason: 1 });

// TTL index for automatic cleanup after retention period (3 years default)
UserPerformanceSnapshotSchema.index(
  { snapshotDate: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 * 3 } // 3 years
);

// Methods for performance analysis
UserPerformanceSnapshotSchema.methods.getPerformanceSummary = function (): {
  overallGrade: string;
  strongestCategory: string;
  improvementAreas: string[];
  progressIndicators: string[];
} {
  const categories = Object.entries(this.categoryPerformance) as [
    string,
    any
  ][];

  // Calculate overall grade
  let overallGrade = "Needs Improvement";
  if (this.averageScore >= 90) overallGrade = "Excellent";
  else if (this.averageScore >= 80) overallGrade = "Good";
  else if (this.averageScore >= 70) overallGrade = "Satisfactory";

  // Find strongest category
  const strongest = categories.reduce(
    (max, [key, data]) =>
      data.accuracy > max.accuracy
        ? { category: key, accuracy: data.accuracy }
        : max,
    { category: "", accuracy: 0 }
  );

  // Find improvement areas (accuracy < 75%)
  const improvementAreas = categories
    .filter(([, data]) => data.accuracy < 75 && data.questionsAnswered > 0)
    .map(([key]) => key.replace("-knowledge", ""));

  // Progress indicators
  const progressIndicators: string[] = [];
  if (this.learningMetrics.consistencyScore > 80) {
    progressIndicators.push("Consistent performance");
  }
  if (this.learningMetrics.difficultyProgression > 0) {
    progressIndicators.push("Taking on more challenging questions");
  }
  if (this.totalAttempts > 1 && this.bestScore > this.averageScore * 1.1) {
    progressIndicators.push("Showing improvement over time");
  }

  return {
    overallGrade,
    strongestCategory: strongest.category.replace("-knowledge", "") || "None",
    improvementAreas,
    progressIndicators,
  };
};

// Static methods for analytics queries
UserPerformanceSnapshotSchema.statics.getUserHistoricalProgress =
  async function (
    userId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ) {
    const matchStage: any = { userId };

    if (timeRange) {
      matchStage.snapshotDate = {
        $gte: timeRange.start,
        $lte: timeRange.end,
      };
    }

    return await this.find(matchStage)
      .sort({ snapshotDate: -1 })
      .select(
        "quizId averageScore bestScore snapshotDate snapshotReason categoryPerformance"
      )
      .lean();
  };

UserPerformanceSnapshotSchema.statics.getRestaurantHistoricalPerformance =
  async function (
    restaurantId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ) {
    const matchStage: any = { restaurantId };

    if (timeRange) {
      matchStage.snapshotDate = {
        $gte: timeRange.start,
        $lte: timeRange.end,
      };
    }

    return await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$userId",
          totalSnapshots: { $sum: 1 },
          averagePerformance: { $avg: "$averageScore" },
          bestPerformance: { $max: "$bestScore" },
          totalTimeInvested: { $sum: "$totalTimeInvested" },
          lastSnapshot: { $max: "$snapshotDate" },
          quizzesParticipated: { $addToSet: "$quizId" },
        },
      },
      {
        $addFields: {
          quizParticipationCount: { $size: "$quizzesParticipated" },
        },
      },
      { $sort: { averagePerformance: -1 } },
    ]);
  };

// Define the model interface with static methods
interface IUserPerformanceSnapshotModel
  extends Model<IUserPerformanceSnapshot> {
  getUserHistoricalProgress(
    userId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ): Promise<any>;
  getRestaurantHistoricalPerformance(
    restaurantId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ): Promise<any>;
}

const UserPerformanceSnapshotModel =
  (mongoose.models.UserPerformanceSnapshot as IUserPerformanceSnapshotModel) ||
  mongoose.model<IUserPerformanceSnapshot, IUserPerformanceSnapshotModel>(
    "UserPerformanceSnapshot",
    UserPerformanceSnapshotSchema
  );

export default UserPerformanceSnapshotModel;
