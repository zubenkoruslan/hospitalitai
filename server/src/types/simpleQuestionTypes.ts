// Simplified AI Question Generation Types
// Clean, minimal interfaces - no over-engineering

export interface SimpleMenuItem {
  name: string;
  description: string;
  ingredients?: string[];
  allergens?: string[];
  category: string;
  // Wine-specific fields
  grape?: string;
  region?: string;
  vintage?: string;
  producer?: string;
}

export interface SimpleMenuQuestionRequest {
  menuItems: SimpleMenuItem[];
  questionCount: number;
  focusArea: "ingredients" | "allergens" | "wine" | "preparation" | "general";
  knowledgeCategory:
    | "food-knowledge"
    | "beverage-knowledge"
    | "wine-knowledge"
    | "procedures-knowledge";
}

export interface SimpleSopQuestionRequest {
  sopContent: string;
  sopCategoryName: string;
  questionCount: number;
}

export interface GeneratedQuestion {
  questionText: string;
  questionType: "multiple-choice-single" | "true-false";
  options: Array<{ text: string; isCorrect: boolean }>;
  explanation: string;
  category: string;
  focusArea: string;
}

// Raw response from AI (before processing)
export interface RawAiQuestion {
  questionText: string;
  questionType: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  explanation?: string;
}
