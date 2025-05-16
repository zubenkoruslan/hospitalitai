// import { Types } from "mongoose"; // Removed unused import

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
}

// Interface for request body when submitting a quiz attempt
export interface SubmitQuizAttemptRequestBody {
  questions: Array<{
    questionId: string;
    answerGiven: any; // Consider making this more specific if possible, e.g., number | string | string[]
  }>;
  durationInSeconds?: number;
}
