// Types related to individual questions, especially in the context of quiz attempts.

// From api.ts: ClientQuestionOption (lines 527-530)
export interface ClientQuestionOption {
  _id: string; // Option ID
  text: string;
}

// From api.ts: ClientQuestionForAttempt (lines 532-539)
export interface ClientQuestionForAttempt {
  _id: string; // Question ID
  questionText: string;
  questionType: string; // e.g., "multiple-choice-single", "true-false"
  options: ClientQuestionOption[];
  categories?: string[];
}
