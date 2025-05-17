// import { Types } from "mongoose"; // Removed unused import
import { ServerQuestionOption } from "./questionTypes"; // ADDED IMPORT

// Summary of a single quiz attempt, often used in lists or aggregated views.
export interface IQuizAttemptSummary {
  _id: string; // Attempt ID (usually Types.ObjectId as string)
  score: number;
  totalQuestions: number;
  attemptDate: Date;
  hasIncorrectAnswers: boolean; // Derived: true if score < totalQuestions and totalQuestions > 0
}

// Interface for request body when generating a quiz from question banks
export interface GenerateQuizFromBanksRequestBody {
  title: string;
  description?: string;
  questionBankIds: string[];
  numberOfQuestionsPerAttempt: number;
  targetRoles?: string[];
}

// Interface for request body when updating a quiz
export interface UpdateQuizRequestBody {
  title?: string;
  description?: string;
  questionBankIds?: string[];
  numberOfQuestionsPerAttempt?: number;
  isAvailable?: boolean;
  targetRoles?: string[]; // Optional: array of role IDs, empty array means for all
}

// Interface for request body when submitting a quiz attempt
export interface SubmitQuizAttemptRequestBody {
  questions: Array<{
    questionId: string;
    answerGiven: any; // Consider making this more specific if possible, e.g., number | string | string[]
  }>;
  durationInSeconds?: number;
}

// ADDED: Details of a correct answer for the quiz review
export interface ServerCorrectAnswerDetails {
  text?: string; // For True/False, or single correct option text
  texts?: string[]; // For multiple correct option texts
  optionId?: string; // ID of the correct option (if single)
  optionIds?: string[]; // IDs of correct options (if multiple)
}

// ADDED: Structure for a single graded question in the submission response
export interface ServerGradedQuestion {
  questionId: string;
  questionText?: string;
  answerGiven: any;
  isCorrect: boolean;
  correctAnswer?: ServerCorrectAnswerDetails;
  options?: ServerQuestionOption[]; // The original options for this question
}

// ADDED: Response structure for a submitted quiz attempt
export interface ServerSubmitAttemptResponse {
  attemptId: string;
  score: number;
  totalQuestionsAttempted: number;
  questions: ServerGradedQuestion[];
  quizId: string;
  staffUserId: string;
  attemptDate: string; // ISO Date string
  durationInSeconds?: number;
}
