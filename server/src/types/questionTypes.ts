import { Types } from "mongoose";

// Option for a question, as sent to or from the server
export interface ServerQuestionOption {
  _id: string; // Typically Types.ObjectId as string
  text: string;
  // isCorrect?: boolean; // This might be part of a more detailed server-side model but not always sent to client as-is
}

// Structure for a question when it's part of a quiz attempt being sent to the client
export interface ServerQuestionForAttempt {
  _id: string; // Typically Types.ObjectId as string
  questionText: string;
  questionType: string; // e.g., 'multiple-choice-single', 'true-false'
  options: ServerQuestionOption[];
  categories?: string[];
  difficulty?: string;
}
