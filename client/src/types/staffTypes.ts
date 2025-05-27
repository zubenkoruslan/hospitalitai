// client/src/types/staffTypes.ts

// Interface for a single result belonging to a staff member
export interface ResultSummary {
  _id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  completedAt?: string;
  status: string;
}

// NEW: Interface for individual quiz progress summary from backend
export interface ClientQuizProgressSummary {
  quizId: string;
  quizTitle: string;
  overallProgressPercentage: number;
  isCompletedOverall: boolean;
  lastAttemptTimestamp?: string | null; // Dates are often strings from JSON
  averageScoreForQuiz?: number | null; // ADDED: Average score for this specific quiz
}

// Additional detail for incorrect answers within a quiz result
// REMOVED IncorrectQuestionDetail interface definition
// export interface IncorrectQuestionDetail {
//   questionText: string;
//   userAnswer: string;
//   correctAnswer: string;
// }

// This interface is used by ViewIncorrectAnswersModal and constructed by StaffDashboard
// It needs to be exported and match the structure used.
export interface QuizResultDetails {
  _id: string; // Can be the ID of the progress document or a relevant attempt ID
  quizId: string;
  quizTitle: string;
  userId: string; // ID of the user who took the quiz
  score: number;
  totalQuestions: number;
  completedAt?: string; // Date as string
  incorrectQuestions?: IncorrectQuestionDetail[]; // This is primarily used by the modal
  // The complex 'questions' array from the old definition is removed as it's not used by this flow.
}

// ADDED: Client-side representation of a quiz attempt summary
export interface ClientQuizAttemptSummary {
  _id: string; // Attempt ID
  score: number;
  totalQuestions: number;
  attemptDate: string; // Dates as strings from JSON
  hasIncorrectAnswers: boolean;
}

// MODIFIED: AggregatedQuizPerformanceSummary to include a list of attempts
export interface AggregatedQuizPerformanceSummary {
  quizId: string;
  quizTitle: string;
  numberOfAttempts: number;
  averageScorePercent: number | null;
  lastCompletedAt?: string; // Date of the latest attempt for this quiz
  attempts: ClientQuizAttemptSummary[]; // NEW: List of all attempt summaries
  // Removed: _id (latest QuizResult ID), score, totalQuestions, incorrectQuestions (from latest result)
}

// Interface for a staff member with their results
export interface StaffMemberWithData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  professionalRole?: string;
  assignedRoleId?: string;
  quizProgressSummaries: ClientQuizProgressSummary[];
  averageScore: number | null;
  quizzesTaken: number;
  assignableQuizzesCount?: number; // ADDED: Count of quizzes assignable to this staff member's role
}

// Detailed interface for a staff member including full quiz result details
// This is the primary type for the StaffDetails page, now using aggregated data.
export interface StaffDetailsData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  assignedRoleName?: string;
  aggregatedQuizPerformance: AggregatedQuizPerformanceSummary[]; // This now uses the updated version
  averageScore: number | null;
}

// Sort types
export type SortField =
  | "name"
  | "email"
  | "averageScore"
  | "completionRate"
  | "createdAt";
export type SortDirection = "asc" | "desc";

// Filter types
export interface Filters {
  name: string;
  role: string;
}

// === Types moved from api.ts ===

// From api.ts: ClientUserMinimal (This should be imported from ./user.ts if already moved there)
// For now, defining it here if it's specifically for staff context or assuming it will be imported.
// import { ClientUserMinimal } from './user'; // Assuming user.ts exports this

// From api.ts: ClientIQuiz (This should be imported from ./quizTypes.ts if already moved there)
// For now, defining a minimal version here or assuming it will be imported.
// import { ClientIQuiz } from './quizTypes'; // Assuming quizTypes.ts exports this

// Placeholder imports - replace with actual imports once types are centralized
import { ClientUserMinimal } from "./user"; // Assuming ClientUserMinimal is in user.ts
import { ClientIQuiz } from "./quizTypes"; // Assuming ClientIQuiz is in quizTypes.ts
import { IncorrectQuestionDetail } from "./quizTypes"; // REMOVED ClientIQuizAttemptSummary from this import

// From api.ts: ClientStaffQuizProgress
export interface ClientStaffQuizProgress {
  _id: string;
  staffUserId: ClientUserMinimal;
  quizId: string;
  restaurantId: string;
  seenQuestionIds: string[];
  totalUniqueQuestionsInSource: number;
  isCompletedOverall: boolean;
  lastAttemptTimestamp?: string;
  // questionsAnsweredToday: number; // REMOVED - field was removed from backend StaffQuizProgress model
  // lastActivityDateForDailyReset?: string; // REMOVED - field was removed from backend StaffQuizProgress model
  createdAt?: string;
  updatedAt?: string;
  averageScore?: number | null;
}

// ADDED: Client-side representation of the detailed progress data from the backend for the restaurant view
export interface ClientStaffMemberQuizProgressDetails {
  _id?: string; // Represents the unique ID for this progress entry, could be StaffQuizProgress._id or staffUser._id if used as key
  staffMember: ClientUserMinimal;
  // quizTitle: string; // Quiz title is usually passed as a separate prop to the modal
  progress?: {
    isCompletedOverall: boolean;
    seenQuestionIds: string[];
    totalUniqueQuestionsInSource: number;
    lastAttemptTimestamp?: string; // ISO string
  } | null;
  averageScoreForQuiz: number | null;
  attempts: ClientQuizAttemptSummary[]; // This will now correctly refer to the interface above
  numberOfAttempts: number;
}

// From api.ts: ClientStaffQuizProgressWithAttempts
// This type relies on ClientStaffQuizProgress, ClientUserMinimal, and ClientIQuiz.
export interface ClientStaffQuizProgressWithAttempts
  extends Omit<
    ClientStaffQuizProgress,
    "staffUserId" | "quizId" | "lastAttemptTimestamp"
    // Omitted fields are already removed from ClientStaffQuizProgress directly
    // | "questionsAnsweredToday"
    // | "lastActivityDateForDailyReset"
  > {
  staffUserId: ClientUserMinimal;
  quizId: ClientIQuiz;
  averageScore?: number | null;
  attempts: ClientQuizAttemptSummary[];
}
