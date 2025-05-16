import { IncorrectQuestionDetail } from "./staffTypes"; // If needed for ClientQuizAttemptDetails
import { ClientUserMinimal } from "./user"; // Changed from userTypes.ts to user.ts

// From api.ts: ClientIQuiz (lines 326-339)
export interface ClientIQuiz {
  _id: string;
  title: string;
  description?: string;
  restaurantId: string;
  sourceQuestionBankIds: string[];
  totalUniqueQuestionsInSourceSnapshot?: number;
  numberOfQuestionsPerAttempt: number;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  averageScore?: number | null;
}

// From api.ts: GenerateQuizFromBanksClientData (lines 342-347)
export interface GenerateQuizFromBanksClientData {
  title: string;
  description?: string;
  questionBankIds: string[];
  numberOfQuestionsPerAttempt: number;
}

// From api.ts: ClientAvailableQuiz (lines 413-423)
export interface ClientAvailableQuiz {
  _id: string;
  title: string;
  description?: string;
  createdAt?: string;
  numberOfQuestionsPerAttempt: number;
  totalUniqueQuestionsInSourceSnapshot?: number;
  isAvailable?: boolean;
}

// From api.ts: ClientQuizAttemptDetails (lines 443-451)
export interface ClientQuizAttemptDetails {
  _id: string; // Attempt ID
  quizId: string;
  quizTitle: string;
  userId: string;
  score: number;
  totalQuestions: number;
  attemptDate: string;
  incorrectQuestions: IncorrectQuestionDetail[]; // Assumes IncorrectQuestionDetail is in staffTypes or here
}

// From api.ts: ClientAnswerForSubmission (lines 541-544)
export interface ClientAnswerForSubmission {
  questionId: string;
  answerGiven: any; // Consider making this more specific based on question types if possible
}

// From api.ts: ClientQuizAttemptSubmitData (lines 546-549)
export interface ClientQuizAttemptSubmitData {
  questions: ClientAnswerForSubmission[];
  durationInSeconds?: number;
}

// From api.ts: ClientGradedQuestion (lines 551-556)
export interface ClientGradedQuestion {
  questionId: string;
  answerGiven: any;
  isCorrect: boolean;
  correctAnswer?: any;
}

// From api.ts: ClientSubmitAttemptResponse (lines 558-563)
export interface ClientSubmitAttemptResponse {
  score: number;
  totalQuestionsAttempted: number;
  attemptId: string;
  questions: ClientGradedQuestion[];
}
