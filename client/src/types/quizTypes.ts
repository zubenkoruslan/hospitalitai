import { IRole } from "./roleTypes"; // Added import
// import { IncorrectQuestionDetail } from "./staffTypes"; // REMOVED IMPORT
// import { ClientUserMinimal } from "./user"; // Changed from userTypes.ts to user.ts - THIS WILL BE REMOVED

// ADDED: Definition for IncorrectQuestionDetail
export interface IncorrectQuestionDetail {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
}

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
  targetRoles?: IRole[]; // Added targetRoles
}

// From api.ts: GenerateQuizFromBanksClientData (lines 342-347)
export interface GenerateQuizFromBanksClientData {
  title: string;
  description?: string;
  questionBankIds: string[];
  numberOfQuestionsPerAttempt: number;
  targetRoles?: string[]; // Added for target roles selection
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

// From client/src/components/quiz/QuestionDisplay.tsx
// Represents a question format for display and interaction within quiz components.
export interface QuizDisplayQuestion {
  _id?: string; // Optional: might be an existing question from DB or a new one being built
  text: string;
  choices: string[];
  correctAnswer: number; // Index of the correct choice in the choices array
  menuItemId?: string; // Optional: if the question is related to a specific menu item
  // This field was present in the original local type. Keeping it as optional.
}

// From client/src/components/quiz/QuizResultsModal.tsx
// Represents the quiz structure with embedded questions for display in results.
export interface ClientQuizDataForDisplay {
  _id?: string;
  title: string;
  questions: QuizDisplayQuestion[]; // Uses the existing QuizDisplayQuestion
  restaurantId?: string; // Kept optional as per original local type in modal
}

// From client/src/components/quiz/QuizResultsModal.tsx
// Represents the overall quiz result structure for display.
export interface ClientQuizResultForDisplay {
  score: number;
  totalQuestions: number;
  userAnswers: (number | undefined)[]; // Array of selected choice indices by the user
  quizData: ClientQuizDataForDisplay;
}

// From client/src/components/quiz/QuizEditorModal.tsx
// Represents a quiz structure that is actively being edited, including its questions.
export interface ClientQuizEditable {
  _id?: string;
  title: string;
  // Based on QuizEditorModal's getInitialMenuItemIdForNewQuestion, this field is used.
  // It can be an array of strings (IDs) or objects with _id and name.
  menuItemIds?: string[] | { _id: string; name: string }[];
  questions: QuizDisplayQuestion[];
  restaurantId: string; // Aligning with ClientIQuiz, assuming it's essential.
  isAvailable: boolean; // Non-optional as per original local type in modal
  isAssigned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Interface for request body when updating a quiz (client-side specific)
export interface UpdateQuizClientData {
  title?: string;
  description?: string;
  sourceQuestionBankIds?: string[];
  numberOfQuestionsPerAttempt?: number;
  isAvailable?: boolean;
  targetRoles?: string[];
}
