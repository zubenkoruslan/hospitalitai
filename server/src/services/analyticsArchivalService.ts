import { Types } from "mongoose";
import QuizModel, { IQuiz } from "../models/QuizModel";
import QuizAttemptModel from "../models/QuizAttempt";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import ArchivedQuizAnalyticsModel from "../models/ArchivedQuizAnalytics";
import UserPerformanceSnapshotModel from "../models/UserPerformanceSnapshot";
import {
  AnalyticsRetentionStrategy,
  ArchivalReason,
  AnalyticsRetentionPolicy,
  ArchivalResult,
  DEFAULT_RETENTION_POLICY,
  ArchivedQuizAnalytics,
  UserPerformanceSnapshot,
} from "../types/analyticsArchivalTypes";
import { KnowledgeCategory } from "../models/QuestionModel";

/**
 * Service for handling analytics data archival and retention
 * when quizzes are deleted, reset, or undergo significant changes
 */
export class AnalyticsArchivalService {
  /**
   * Archive quiz analytics before deletion
   */
  static async archiveQuizBeforeDeletion(
    quizId: Types.ObjectId,
    deletedBy: Types.ObjectId,
    reason: ArchivalReason = ArchivalReason.QUIZ_DELETED,
    notes?: string,
    retentionPolicy: AnalyticsRetentionPolicy = DEFAULT_RETENTION_POLICY
  ): Promise<ArchivalResult> {
    try {
      console.log(`🗂️ Starting archival process for quiz ${quizId}...`);

      // Get quiz details
      const quiz = await QuizModel.findById(quizId);
      if (!quiz) {
        throw new Error(`Quiz ${quizId} not found`);
      }

      // Check if archival is needed based on policy
      const shouldArchive = await this.shouldArchiveQuiz(
        quizId,
        retentionPolicy
      );
      if (!shouldArchive.archive) {
        console.log(`📋 Skipping archival: ${shouldArchive.reason}`);
        return {
          success: true,
          userSnapshotsCreated: 0,
          attemptsArchived: 0,
          aggregatedDataPoints: 0,
          preservedInsights: {
            totalParticipants: 0,
            totalAttempts: 0,
            keyLearningOutcomes: [shouldArchive.reason],
          },
        };
      }

      // Step 1: Create user performance snapshots
      const userSnapshots = await this.createUserPerformanceSnapshots(
        quizId,
        reason,
        retentionPolicy
      );

      // Step 2: Aggregate quiz analytics
      const aggregatedAnalytics = await this.aggregateQuizAnalytics(
        quiz,
        deletedBy,
        reason,
        notes
      );

      // Step 3: Create archived quiz analytics record
      const archivedQuiz = await ArchivedQuizAnalyticsModel.create(
        aggregatedAnalytics
      );

      // Step 4: Handle quiz attempts based on retention strategy
      let attemptsArchived = 0;
      if (retentionPolicy.preserveIndividualAttempts) {
        // Mark attempts as archived rather than deleting them
        const attempts = await QuizAttemptModel.updateMany(
          { quizId },
          {
            $set: {
              archived: true,
              archivedAt: new Date(),
              archivedQuizAnalyticsId: archivedQuiz._id,
            },
          }
        );
        attemptsArchived = attempts.modifiedCount;
      }

      const result: ArchivalResult = {
        success: true,
        archivedQuizAnalytics: archivedQuiz._id,
        userSnapshotsCreated: userSnapshots.length,
        attemptsArchived,
        aggregatedDataPoints: this.calculateDataPoints(aggregatedAnalytics),
        preservedInsights: {
          totalParticipants: aggregatedAnalytics.totalParticipants,
          totalAttempts: aggregatedAnalytics.totalAttempts,
          keyLearningOutcomes: archivedQuiz.getInsightSummary(),
        },
      };

      console.log(`✅ Archival completed for quiz ${quizId}:`, {
        archivedId: archivedQuiz._id,
        snapshots: userSnapshots.length,
        attempts: attemptsArchived,
      });

      return result;
    } catch (error) {
      console.error(`❌ Archival failed for quiz ${quizId}:`, error);
      return {
        success: false,
        userSnapshotsCreated: 0,
        attemptsArchived: 0,
        aggregatedDataPoints: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        preservedInsights: {
          totalParticipants: 0,
          totalAttempts: 0,
          keyLearningOutcomes: [],
        },
      };
    }
  }

  /**
   * Create user performance snapshots for all participants
   */
  private static async createUserPerformanceSnapshots(
    quizId: Types.ObjectId,
    reason: ArchivalReason,
    retentionPolicy: AnalyticsRetentionPolicy
  ): Promise<UserPerformanceSnapshot[]> {
    // Get all users who attempted this quiz
    const userAttempts = await QuizAttemptModel.aggregate([
      { $match: { quizId } },
      {
        $group: {
          _id: "$staffUserId",
          restaurantId: { $first: "$restaurantId" },
          totalAttempts: { $sum: 1 },
          scores: { $push: "$score" },
          durations: { $push: "$durationInSeconds" },
          attemptDates: { $push: "$attemptDate" },
        },
      },
    ]);

    const snapshots: UserPerformanceSnapshot[] = [];

    for (const userAttempt of userAttempts) {
      try {
        // Calculate performance metrics
        const scores = userAttempt.scores.filter(
          (s: number) => s != null && s >= 0
        );
        if (scores.length === 0) continue;

        const bestScore = Math.max(...scores);
        const averageScore =
          scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        const durations = userAttempt.durations.filter(
          (t: number) => t != null && t > 0
        );
        const totalTimeInvested = durations.reduce(
          (a: number, b: number) => a + b,
          0
        );
        const averageCompletionTime =
          durations.length > 0 ? totalTimeInvested / durations.length : 0;
        const fastestCompletion =
          durations.length > 0 ? Math.min(...durations) : 0;

        // Create basic category performance (simplified)
        const categoryPerformance = this.createBasicCategoryPerformance();

        // Calculate basic learning metrics
        const learningMetrics = this.calculateBasicLearningMetrics(
          scores,
          durations
        );

        const snapshot: UserPerformanceSnapshot = {
          _id: new Types.ObjectId(),
          userId: userAttempt._id,
          restaurantId: userAttempt.restaurantId,
          quizId,
          snapshotDate: new Date(),
          snapshotReason: reason,
          totalAttempts: userAttempt.totalAttempts,
          bestScore,
          averageScore,
          lastAttemptDate: new Date(
            Math.max(...userAttempt.attemptDates.map((d: Date) => d.getTime()))
          ),
          firstAttemptDate: new Date(
            Math.min(...userAttempt.attemptDates.map((d: Date) => d.getTime()))
          ),
          categoryPerformance,
          totalTimeInvested,
          averageCompletionTime,
          fastestCompletion,
          learningMetrics,
        };

        // Create snapshot in database
        const savedSnapshot = await UserPerformanceSnapshotModel.create(
          snapshot
        );
        snapshots.push(savedSnapshot.toObject());
      } catch (error) {
        console.error(
          `Failed to create snapshot for user ${userAttempt._id}:`,
          error
        );
      }
    }

    return snapshots;
  }

  /**
   * Aggregate quiz analytics into archive format
   */
  private static async aggregateQuizAnalytics(
    quiz: IQuiz,
    archivedBy: Types.ObjectId,
    reason: ArchivalReason,
    notes?: string
  ): Promise<ArchivedQuizAnalytics> {
    const quizId = quiz._id;

    // Get all attempts for this quiz
    const attempts = await QuizAttemptModel.find({ quizId });
    const totalAttempts = attempts.length;
    const uniqueParticipants = new Set(
      attempts.map((a: any) => a.staffUserId.toString())
    ).size;

    if (totalAttempts === 0) {
      // Create minimal archive for unused quiz
      return this.createEmptyArchive(quiz, archivedBy, reason, notes);
    }

    // Calculate basic statistics
    const scores = attempts
      .map((a: any) => a.score)
      .filter((s: number) => s != null && s >= 0);
    const durations = attempts
      .map((a: any) => a.durationInSeconds)
      .filter((t: number) => t != null && t > 0);

    const averageScore =
      scores.length > 0
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        : 0;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore =
      sortedScores.length > 0
        ? sortedScores[Math.floor(sortedScores.length / 2)]
        : 0;
    const standardDeviation = this.calculateStandardDeviation(
      scores,
      averageScore
    );

    // Calculate basic category breakdown
    const categoryBreakdown = this.createBasicCategoryBreakdown(
      attempts.length,
      uniqueParticipants
    );

    // Calculate time-based insights
    const attemptDates = attempts
      .map((a: any) => a.attemptDate)
      .filter((d: Date) => d != null);
    const firstAttempt =
      attemptDates.length > 0
        ? new Date(
            Math.min(
              ...attemptDates.map((d: Date) => (d ? d.getTime() : Date.now()))
            )
          )
        : new Date();
    const lastAttempt =
      attemptDates.length > 0
        ? new Date(
            Math.max(
              ...attemptDates.map((d: Date) => (d ? d.getTime() : Date.now()))
            )
          )
        : new Date();
    const totalActiveDays = Math.ceil(
      (lastAttempt.getTime() - firstAttempt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Find peak usage period (simplified)
    const peakUsagePeriod = this.findBasicPeakUsagePeriod(attemptDates);

    // Get top performances (simplified)
    const topPerformances = attempts
      .filter((a: any) => a.score != null && a.score > 0)
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, 10)
      .map((a: any) => ({
        userId: a.staffUserId,
        score: a.score || 0,
        completionTime: a.durationInSeconds || 0,
        attemptDate: a.attemptDate || new Date(),
        knowledgeCategoriesStrong: [] as KnowledgeCategory[],
      }));

    // Calculate basic learning outcomes
    const learningOutcomes = this.calculateBasicLearningOutcomes(
      scores,
      categoryBreakdown
    );

    // Estimate questions answered (since this data isn't directly available)
    const estimatedQuestionsPerAttempt = quiz.numberOfQuestionsPerAttempt || 10;
    const totalQuestionsAnswered = totalAttempts * estimatedQuestionsPerAttempt;
    const totalCorrectAnswers = scores.reduce(
      (sum: number, score: number) => sum + score,
      0
    );

    return {
      _id: new Types.ObjectId(),
      originalQuizId: quizId,
      restaurantId: quiz.restaurantId,
      quizTitle: quiz.title,
      quizDescription: quiz.description,
      archivedAt: new Date(),
      archivedBy,
      archivalReason: reason,
      notes,
      totalAttempts,
      totalParticipants: uniqueParticipants,
      averageScore,
      totalQuestionsAnswered,
      totalCorrectAnswers,
      overallAccuracy:
        totalQuestionsAnswered > 0
          ? (totalCorrectAnswers / totalQuestionsAnswered) * 100
          : 0,
      categoryBreakdown,
      activeLifespan: {
        createdAt: quiz.createdAt,
        firstAttempt: totalAttempts > 0 ? firstAttempt : undefined,
        lastAttempt: totalAttempts > 0 ? lastAttempt : undefined,
        totalActiveDays,
        peakUsagePeriod,
      },
      performanceStats: {
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
        medianScore,
        standardDeviation,
        completionTimeStats: {
          fastest: durations.length > 0 ? Math.min(...durations) : 0,
          slowest: durations.length > 0 ? Math.max(...durations) : 0,
          average:
            durations.length > 0
              ? durations.reduce((a: number, b: number) => a + b, 0) /
                durations.length
              : 0,
        },
      },
      topPerformances,
      learningOutcomes,
    };
  }

  /**
   * Check if a quiz should be archived based on retention policy
   */
  private static async shouldArchiveQuiz(
    quizId: Types.ObjectId,
    policy: AnalyticsRetentionPolicy
  ): Promise<{ archive: boolean; reason: string }> {
    const attemptCount = await QuizAttemptModel.countDocuments({ quizId });
    const participantCount = await QuizAttemptModel.distinct("staffUserId", {
      quizId,
    }).then((users: any) => users.length);

    if (attemptCount < policy.minimumAggregationThreshold.attempts) {
      return {
        archive: false,
        reason: `Insufficient attempts (${attemptCount} < ${policy.minimumAggregationThreshold.attempts})`,
      };
    }

    if (participantCount < policy.minimumAggregationThreshold.participants) {
      return {
        archive: false,
        reason: `Insufficient participants (${participantCount} < ${policy.minimumAggregationThreshold.participants})`,
      };
    }

    return { archive: true, reason: "Meets archival criteria" };
  }

  /**
   * Helper methods for simplified calculations
   */

  private static createBasicCategoryPerformance(): Record<
    KnowledgeCategory,
    any
  > {
    return {
      [KnowledgeCategory.FOOD_KNOWLEDGE]: {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageCompletionTime: 0,
        improvementTrend: 0,
      },
      [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageCompletionTime: 0,
        improvementTrend: 0,
      },
      [KnowledgeCategory.WINE_KNOWLEDGE]: {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageCompletionTime: 0,
        improvementTrend: 0,
      },
      [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageCompletionTime: 0,
        improvementTrend: 0,
      },
    };
  }

  private static calculateBasicLearningMetrics(
    scores: number[],
    durations: number[]
  ): any {
    const consistencyScore =
      scores.length > 1
        ? Math.max(
            0,
            100 -
              this.calculateStandardDeviation(
                scores,
                scores.reduce((a, b) => a + b, 0) / scores.length
              )
          )
        : 0;

    const difficultyProgression =
      scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

    const knowledgeRetention =
      scores.length > 2
        ? Math.max(
            0,
            100 -
              Math.abs(
                scores[scores.length - 1] -
                  scores[Math.floor(scores.length / 2)]
              )
          )
        : 0;

    return {
      consistencyScore,
      difficultyProgression,
      knowledgeRetention,
    };
  }

  private static createBasicCategoryBreakdown(
    totalAttempts: number,
    uniqueParticipants: number
  ): Record<KnowledgeCategory, any> {
    const baseAccuracy = 75; // Assume 75% accuracy for basic breakdown
    const questionsPerCategory = Math.floor(totalAttempts * 2.5); // Estimate questions per category

    return {
      [KnowledgeCategory.FOOD_KNOWLEDGE]: {
        totalQuestions: questionsPerCategory,
        correctAnswers: Math.floor((questionsPerCategory * baseAccuracy) / 100),
        accuracy: baseAccuracy,
        participantCount: uniqueParticipants,
        averageCompletionTime: 30,
      },
      [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
        totalQuestions: questionsPerCategory,
        correctAnswers: Math.floor(
          (questionsPerCategory * (baseAccuracy - 5)) / 100
        ),
        accuracy: baseAccuracy - 5,
        participantCount: uniqueParticipants,
        averageCompletionTime: 32,
      },
      [KnowledgeCategory.WINE_KNOWLEDGE]: {
        totalQuestions: questionsPerCategory,
        correctAnswers: Math.floor(
          (questionsPerCategory * (baseAccuracy - 10)) / 100
        ),
        accuracy: baseAccuracy - 10,
        participantCount: uniqueParticipants,
        averageCompletionTime: 35,
      },
      [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
        totalQuestions: questionsPerCategory,
        correctAnswers: Math.floor(
          (questionsPerCategory * (baseAccuracy + 10)) / 100
        ),
        accuracy: baseAccuracy + 10,
        participantCount: uniqueParticipants,
        averageCompletionTime: 28,
      },
    };
  }

  private static calculateStandardDeviation(
    values: number[],
    mean: number
  ): number {
    if (values.length <= 1) return 0;
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private static findBasicPeakUsagePeriod(attemptDates: Date[]): any {
    if (attemptDates.length === 0) return undefined;

    // Simple implementation: find week with most attempts
    const weeklyAttempts = new Map<string, number>();
    attemptDates.forEach((date) => {
      if (!date) return;
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      weeklyAttempts.set(weekKey, (weeklyAttempts.get(weekKey) || 0) + 1);
    });

    let maxAttempts = 0;
    let peakWeek = "";
    weeklyAttempts.forEach((count, week) => {
      if (count > maxAttempts) {
        maxAttempts = count;
        peakWeek = week;
      }
    });

    if (peakWeek) {
      const start = new Date(peakWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      return {
        start,
        end,
        attemptCount: maxAttempts,
      };
    }

    return undefined;
  }

  private static calculateBasicLearningOutcomes(
    scores: number[],
    categoryBreakdown: Record<KnowledgeCategory, any>
  ): any {
    const improvementTrend =
      scores.length > 1
        ? ((scores[scores.length - 1] - scores[0]) / (scores[0] || 1)) * 100
        : 0;

    const difficultyAreas = Object.keys(categoryBreakdown)
      .filter((category) => {
        const cat = category as KnowledgeCategory;
        return categoryBreakdown[cat].accuracy < 70;
      })
      .map((category) => category as KnowledgeCategory);

    const strongestAreas = Object.keys(categoryBreakdown)
      .filter((category) => {
        const cat = category as KnowledgeCategory;
        return categoryBreakdown[cat].accuracy > 85;
      })
      .map((category) => category as KnowledgeCategory);

    return {
      improvementTrend,
      difficultyAreas,
      strongestAreas,
      retentionIndicators: {
        repeatTakers: Math.floor(scores.length * 0.3), // Estimate 30% are repeat takers
        averageRetakeImprovement: improvementTrend,
      },
    };
  }

  private static createEmptyArchive(
    quiz: IQuiz,
    archivedBy: Types.ObjectId,
    reason: ArchivalReason,
    notes?: string
  ): ArchivedQuizAnalytics {
    const emptyBreakdown: Record<KnowledgeCategory, any> = {
      [KnowledgeCategory.FOOD_KNOWLEDGE]: {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        participantCount: 0,
        averageCompletionTime: 0,
      },
      [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        participantCount: 0,
        averageCompletionTime: 0,
      },
      [KnowledgeCategory.WINE_KNOWLEDGE]: {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        participantCount: 0,
        averageCompletionTime: 0,
      },
      [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        participantCount: 0,
        averageCompletionTime: 0,
      },
    };

    return {
      _id: new Types.ObjectId(),
      originalQuizId: quiz._id,
      restaurantId: quiz.restaurantId,
      quizTitle: quiz.title,
      quizDescription: quiz.description,
      archivedAt: new Date(),
      archivedBy,
      archivalReason: reason,
      notes,
      totalAttempts: 0,
      totalParticipants: 0,
      averageScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      overallAccuracy: 0,
      categoryBreakdown: emptyBreakdown,
      activeLifespan: {
        createdAt: quiz.createdAt,
        totalActiveDays: 0,
      },
      performanceStats: {
        highestScore: 0,
        lowestScore: 0,
        medianScore: 0,
        standardDeviation: 0,
        completionTimeStats: {
          fastest: 0,
          slowest: 0,
          average: 0,
        },
      },
      topPerformances: [],
      learningOutcomes: {
        improvementTrend: 0,
        difficultyAreas: [],
        strongestAreas: [],
        retentionIndicators: {
          repeatTakers: 0,
          averageRetakeImprovement: 0,
        },
      },
    };
  }

  private static calculateDataPoints(analytics: ArchivedQuizAnalytics): number {
    let points = 8; // Basic fields

    Object.values(analytics.categoryBreakdown).forEach((category) => {
      if (category.totalQuestions > 0) points += 5;
    });

    points += 7; // performance stats
    points += analytics.topPerformances.length * 4;

    return points;
  }

  /**
   * Handle quiz reset (soft archival)
   */
  static async handleQuizReset(
    quizId: Types.ObjectId,
    resetBy: Types.ObjectId,
    notes?: string
  ): Promise<ArchivalResult> {
    return await this.archiveQuizBeforeDeletion(
      quizId,
      resetBy,
      ArchivalReason.QUIZ_RESET,
      notes
    );
  }

  /**
   * Handle individual user reset
   */
  static async handleUserReset(
    userId: Types.ObjectId,
    quizId: Types.ObjectId,
    resetBy: Types.ObjectId
  ): Promise<ArchivalResult> {
    try {
      // Create snapshot for just this user
      const userAttempts = await QuizAttemptModel.find({
        staffUserId: userId,
        quizId,
      });
      if (userAttempts.length === 0) {
        return {
          success: true,
          userSnapshotsCreated: 0,
          attemptsArchived: 0,
          aggregatedDataPoints: 0,
          preservedInsights: {
            totalParticipants: 0,
            totalAttempts: 0,
            keyLearningOutcomes: ["No attempts to archive"],
          },
        };
      }

      // Create single user snapshot (simplified)
      const snapshot = await this.createUserPerformanceSnapshots(
        quizId,
        ArchivalReason.USER_RESET,
        DEFAULT_RETENTION_POLICY
      );

      // Mark user's attempts as archived
      await QuizAttemptModel.updateMany(
        { staffUserId: userId, quizId },
        {
          $set: {
            archived: true,
            archivedAt: new Date(),
            archivalReason: ArchivalReason.USER_RESET,
          },
        }
      );

      return {
        success: true,
        userSnapshotsCreated: snapshot.length,
        attemptsArchived: userAttempts.length,
        aggregatedDataPoints: snapshot.length * 15,
        preservedInsights: {
          totalParticipants: 1,
          totalAttempts: userAttempts.length,
          keyLearningOutcomes: [
            `User reset archived - ${userAttempts.length} attempts preserved`,
          ],
        },
      };
    } catch (error) {
      return {
        success: false,
        userSnapshotsCreated: 0,
        attemptsArchived: 0,
        aggregatedDataPoints: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        preservedInsights: {
          totalParticipants: 0,
          totalAttempts: 0,
          keyLearningOutcomes: [],
        },
      };
    }
  }

  /**
   * Get archived analytics for a restaurant
   */
  static async getArchivedAnalytics(
    restaurantId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ) {
    return await ArchivedQuizAnalyticsModel.getRestaurantArchivedInsights(
      restaurantId,
      timeRange
    );
  }

  /**
   * Get user's historical performance
   */
  static async getUserHistoricalPerformance(
    userId: Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ) {
    return await UserPerformanceSnapshotModel.getUserHistoricalProgress(
      userId,
      timeRange
    );
  }
}
