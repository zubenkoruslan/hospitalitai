import { Types } from "mongoose";
import { KnowledgeCategory } from "../models/QuestionModel";

/**
 * Strategy for handling analytics when quizzes are deleted or reset
 */
export enum AnalyticsRetentionStrategy {
  // Archive data for historical analysis
  ARCHIVE = "archive",
  // Soft delete - mark as deleted but keep data
  SOFT_DELETE = "soft_delete",
  // Hard delete - completely remove (compliance only)
  HARD_DELETE = "hard_delete",
  // Aggregate before deletion
  AGGREGATE_THEN_DELETE = "aggregate_then_delete",
}

/**
 * Reason for archiving analytics data
 */
export enum ArchivalReason {
  QUIZ_DELETED = "quiz_deleted",
  QUIZ_RESET = "quiz_reset",
  QUIZ_CONTENT_UPDATED = "quiz_content_updated",
  USER_RESET = "user_reset",
  COMPLIANCE_ARCHIVAL = "compliance_archival",
}

/**
 * Archived quiz analytics when a quiz is deleted
 */
export interface ArchivedQuizAnalytics {
  _id: Types.ObjectId;
  originalQuizId: Types.ObjectId;
  restaurantId: Types.ObjectId;

  // Quiz metadata at time of deletion/archival
  quizTitle: string;
  quizDescription?: string;
  archivedAt: Date;
  archivedBy: Types.ObjectId; // Admin/restaurant who triggered archival
  archivalReason: ArchivalReason;
  notes?: string; // Optional explanation

  // Aggregated analytics to preserve insights
  totalAttempts: number;
  totalParticipants: number;
  averageScore: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallAccuracy: number;

  // Category breakdown
  categoryBreakdown: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
      participantCount: number;
      averageCompletionTime: number;
    };
  };

  // Time-based insights
  activeLifespan: {
    createdAt: Date;
    firstAttempt?: Date;
    lastAttempt?: Date;
    totalActiveDays: number;
    peakUsagePeriod?: {
      start: Date;
      end: Date;
      attemptCount: number;
    };
  };

  // Performance insights to preserve
  performanceStats: {
    highestScore: number;
    lowestScore: number;
    medianScore: number;
    standardDeviation: number;
    completionTimeStats: {
      fastest: number;
      slowest: number;
      average: number;
    };
  };

  // Top performers (anonymized for privacy)
  topPerformances: Array<{
    userId: Types.ObjectId;
    score: number;
    completionTime: number;
    attemptDate: Date;
    knowledgeCategoriesStrong: KnowledgeCategory[];
  }>;

  // Learning outcomes for business intelligence
  learningOutcomes: {
    improvementTrend: number; // % improvement over quiz lifetime
    difficultyAreas: KnowledgeCategory[]; // Categories with low scores
    strongestAreas: KnowledgeCategory[]; // Categories with high scores
    retentionIndicators: {
      repeatTakers: number;
      averageRetakeImprovement: number;
    };
  };
}

/**
 * User's historical performance snapshot when quiz data changes
 */
export interface UserPerformanceSnapshot {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  quizId: Types.ObjectId;
  snapshotDate: Date;
  snapshotReason: ArchivalReason;

  // Performance at time of snapshot
  totalAttempts: number;
  bestScore: number;
  averageScore: number;
  lastAttemptDate: Date;
  firstAttemptDate: Date;

  // Knowledge category contributions
  categoryPerformance: {
    [key in KnowledgeCategory]: {
      questionsAnswered: number;
      correctAnswers: number;
      accuracy: number;
      averageCompletionTime: number;
      improvementTrend: number;
    };
  };

  // Time invested (for ROI calculations)
  totalTimeInvested: number; // seconds
  averageCompletionTime: number;
  fastestCompletion: number;

  // Learning progress indicators
  learningMetrics: {
    consistencyScore: number; // How consistent performance was
    difficultyProgression: number; // Whether they tackled harder questions over time
    knowledgeRetention: number; // Performance consistency across sessions
  };
}

/**
 * Configuration for analytics handling on quiz lifecycle events
 */
export interface AnalyticsRetentionPolicy {
  // How long to keep archived analytics (in months)
  retentionPeriodMonths: number;

  // Whether to preserve individual attempts or just aggregates
  preserveIndividualAttempts: boolean;

  // Minimum data required for business intelligence
  minimumAggregationThreshold: {
    attempts: number; // Don't archive if fewer than X attempts
    participants: number; // Don't archive if fewer than X unique participants
  };

  // Strategy per scenario
  quizDeletion: AnalyticsRetentionStrategy;
  quizReset: AnalyticsRetentionStrategy;
  quizContentUpdate: AnalyticsRetentionStrategy;
  userReset: AnalyticsRetentionStrategy;

  // Privacy settings
  privacy: {
    anonymizeUserData: boolean;
    retainPersonalIdentifiers: boolean;
    complianceMode: "GDPR" | "CCPA" | "STANDARD";
  };
}

/**
 * Archival operation result
 */
export interface ArchivalResult {
  success: boolean;
  archivedQuizAnalytics?: Types.ObjectId;
  userSnapshotsCreated: number;
  attemptsArchived: number;
  aggregatedDataPoints: number;
  errors?: string[];
  preservedInsights: {
    totalParticipants: number;
    totalAttempts: number;
    keyLearningOutcomes: string[];
  };
}

/**
 * Default retention policy for restaurants
 */
export const DEFAULT_RETENTION_POLICY: AnalyticsRetentionPolicy = {
  retentionPeriodMonths: 36, // 3 years for most business needs
  preserveIndividualAttempts: true,
  minimumAggregationThreshold: {
    attempts: 5,
    participants: 2,
  },
  quizDeletion: AnalyticsRetentionStrategy.ARCHIVE,
  quizReset: AnalyticsRetentionStrategy.SOFT_DELETE,
  quizContentUpdate: AnalyticsRetentionStrategy.ARCHIVE,
  userReset: AnalyticsRetentionStrategy.SOFT_DELETE,
  privacy: {
    anonymizeUserData: false,
    retainPersonalIdentifiers: true,
    complianceMode: "STANDARD",
  },
};

// Exports are already defined above with their declarations
