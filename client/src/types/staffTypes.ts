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

// Additional detail for incorrect answers within a quiz result
export interface IncorrectQuestionDetail {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
}

// Detailed interface for a single quiz result (often used on details pages)
export interface QuizResultDetails {
  _id: string; // Use string for frontend consistency
  quizId: string;
  quizTitle: string;
  completedAt?: string;
  score: number;
  totalQuestions: number;
  retakeCount?: number;
  questions?: {
    text: string;
    choices: string[];
    userAnswerIndex: number;
    userAnswer: string;
    correctAnswerIndex: number;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
  incorrectQuestions?: IncorrectQuestionDetail[];
}

// Interface for a staff member with their results
export interface StaffMemberWithData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  professionalRole?: string;
  resultsSummary: ResultSummary[];
  averageScore: number | null;
  quizzesTaken: number;
}

// Detailed interface for a staff member including full quiz result details
export interface StaffDetailsData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  professionalRole?: string;
  quizResults: QuizResultDetails[]; // Use the detailed quiz result type
  averageScore: number | null; // This might be calculated or come from API
  // Add other fields returned by /api/staff/:id if necessary
}

// Sort types
export type SortField =
  | "name"
  | "role"
  | "quizzesTaken"
  | "averageScore"
  | "joined";
export type SortDirection = "asc" | "desc";

// Filter types
export interface Filters {
  name: string;
  role: string;
}
