// Question Validation Utilities
// This file contains functions to validate question quality and detect answer leakage

import {
  QUESTION_GENERATION_CONFIG,
  QUALITY_THRESHOLDS,
} from "./questionGenerationConstants";

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  score: number; // 0-100 quality score
  recommendations: string[];
  answerLeakageDetected: boolean;
  detailedAnalysis: {
    hasValidReference: boolean;
    hasCorrectOptionCount: boolean;
    hasUniqueOptions: boolean;
    hasRealisticDistractors: boolean;
    hasGoodExplanation: boolean;
    answerLeakageIssues: string[];
  };
}

export interface RawAiGeneratedQuestion {
  questionText: string;
  questionType: string;
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  explanation?: string;
  focus?: string;
  category?: string;
}

export interface SimplifiedMenuItem {
  name: string;
  description: string;
  keyIngredients: string[];
  allergens: string[];
  category: string;
  wineDetails?: {
    wineStyle?: string;
    grapeVariety?: string;
    region?: string;
    producer?: string;
    vintage?: string;
  };
  itemType?: string;
}

export interface QuestionGenerationContext {
  categoryName: string;
  items: SimplifiedMenuItem[];
  targetCount: number;
}

/**
 * Enhanced validation function for generated questions with 0-100 quality scoring
 */
export const validateGeneratedQuestions = (
  questions: RawAiGeneratedQuestion[],
  originalItems: SimplifiedMenuItem[],
  categoryName: string
): ValidationResult => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let totalScore = 0;
  let answerLeakageDetected = false;

  if (questions.length === 0) {
    return {
      isValid: false,
      issues: ["No questions provided for validation"],
      score: 0,
      recommendations: ["Generate at least one question"],
      answerLeakageDetected: false,
      detailedAnalysis: {
        hasValidReference: false,
        hasCorrectOptionCount: false,
        hasUniqueOptions: false,
        hasRealisticDistractors: false,
        hasGoodExplanation: false,
        answerLeakageIssues: [],
      },
    };
  }

  questions.forEach((q, index) => {
    let questionScore = 100;
    const questionNumber = index + 1;

    // 1. Check if question references actual menu items
    const referencesValidItem = originalItems.some(
      (item) =>
        q.questionText.toLowerCase().includes(item.name.toLowerCase()) ||
        isValidGenericReference(q.questionText, item, categoryName)
    );

    if (!referencesValidItem) {
      issues.push(`Question ${questionNumber}: No clear menu item reference`);
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.NO_MENU_REFERENCE;
    }

    // 2. Check option count and structure
    const correctOption = q.options.find((opt) => opt.isCorrect);
    const incorrectOptions = q.options.filter((opt) => !opt.isCorrect);

    if (q.options.length !== 4) {
      issues.push(
        `Question ${questionNumber}: Must have exactly 4 options (has ${q.options.length})`
      );
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.DUPLICATE_OPTIONS;
    }

    if (!correctOption) {
      issues.push(`Question ${questionNumber}: No correct answer marked`);
      questionScore -= 25;
    }

    if (incorrectOptions.length !== 3) {
      issues.push(
        `Question ${questionNumber}: Must have exactly 3 distractors (has ${incorrectOptions.length})`
      );
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.DUPLICATE_OPTIONS;
    }

    // 3. Check for duplicate options
    const optionTexts = q.options.map((opt) => opt.text.toLowerCase());
    const uniqueOptions = new Set(optionTexts);
    if (uniqueOptions.size !== optionTexts.length) {
      issues.push(`Question ${questionNumber}: Contains duplicate options`);
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.DUPLICATE_OPTIONS;
    }

    // 4. Check question specificity and length
    if (
      q.questionText.length < QUESTION_GENERATION_CONFIG.MIN_QUESTION_LENGTH
    ) {
      issues.push(
        `Question ${questionNumber}: Too short or vague (${q.questionText.length} chars)`
      );
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.TOO_SHORT;
    }

    if (q.questionText.split(" ").length < 5) {
      issues.push(`Question ${questionNumber}: Question too simple or unclear`);
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.VAGUE_QUESTION;
    }

    // 5. Check explanation quality
    if (!q.explanation || q.explanation.length < 10) {
      issues.push(`Question ${questionNumber}: Poor or missing explanation`);
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.NO_EXPLANATION;
    } else if (
      q.explanation.length > QUESTION_GENERATION_CONFIG.MAX_EXPLANATION_LENGTH
    ) {
      issues.push(
        `Question ${questionNumber}: Explanation too long (${q.explanation.length} chars)`
      );
      questionScore -= 5;
    }

    // 6. CRITICAL: Check for answer leakage in question text
    const answerLeakageIssues = detectAnswerLeakage(q);
    if (answerLeakageIssues.length > 0) {
      issues.push(
        `Question ${questionNumber}: ANSWER LEAKAGE - ${answerLeakageIssues.join(
          ", "
        )}`
      );
      questionScore -= QUALITY_THRESHOLDS.PENALTIES.ANSWER_LEAKAGE; // Heavy penalty
      answerLeakageDetected = true;
    }

    // 7. Check distractor quality
    if (correctOption) {
      const poorDistractors = incorrectOptions.filter((opt) =>
        isObviouslyWrongAnswer(
          opt.text,
          correctOption.text,
          categoryName,
          originalItems
        )
      );

      if (poorDistractors.length > 1) {
        issues.push(
          `Question ${questionNumber}: Contains obviously wrong distractors`
        );
        questionScore -= QUALITY_THRESHOLDS.PENALTIES.POOR_DISTRACTORS;
      }
    }

    // 8. Apply bonuses for quality features
    if (referencesValidItem) {
      questionScore += QUALITY_THRESHOLDS.BONUSES.CLEAR_MENU_REFERENCE;
    }

    if (
      q.explanation &&
      q.explanation.length >= 50 &&
      q.explanation.length <= 150
    ) {
      questionScore += QUALITY_THRESHOLDS.BONUSES.EDUCATIONAL_EXPLANATION;
    }

    if (isSafetyFocused(q, categoryName)) {
      questionScore += QUALITY_THRESHOLDS.BONUSES.SAFETY_FOCUSED;
    }

    if (isPracticalKnowledge(q, categoryName)) {
      questionScore += QUALITY_THRESHOLDS.BONUSES.PRACTICAL_KNOWLEDGE;
    }

    totalScore += Math.max(0, questionScore);
  });

  const averageScore = questions.length > 0 ? totalScore / questions.length : 0;

  // Generate recommendations based on issues
  if (averageScore < QUALITY_THRESHOLDS.ACCEPTABLE) {
    recommendations.push(
      "Consider regenerating questions with more specific prompts"
    );
  }
  if (issues.some((issue) => issue.includes("duplicate options"))) {
    recommendations.push(
      "Improve distractor generation with more diverse context"
    );
  }
  if (issues.some((issue) => issue.includes("No clear menu item reference"))) {
    recommendations.push(
      "Ensure questions explicitly mention menu item names or use clear generic references"
    );
  }
  if (answerLeakageDetected) {
    recommendations.push(
      "CRITICAL: Review questions for answer leakage - answers should not be visible in question text"
    );
    recommendations.push(
      "Use generic descriptions instead of specific item names when asking about item attributes"
    );
  }

  return {
    isValid:
      issues.length === 0 && averageScore >= QUALITY_THRESHOLDS.ACCEPTABLE,
    issues,
    score: Math.round(averageScore),
    recommendations,
    answerLeakageDetected,
    detailedAnalysis: {
      hasValidReference:
        issues.filter((i) => i.includes("No clear menu item reference"))
          .length === 0,
      hasCorrectOptionCount:
        issues.filter((i) => i.includes("Must have exactly 4 options"))
          .length === 0,
      hasUniqueOptions:
        issues.filter((i) => i.includes("duplicate options")).length === 0,
      hasRealisticDistractors:
        issues.filter((i) => i.includes("obviously wrong distractors"))
          .length === 0,
      hasGoodExplanation:
        issues.filter((i) => i.includes("Poor or missing explanation"))
          .length === 0,
      answerLeakageIssues: issues.filter((i) => i.includes("ANSWER LEAKAGE")),
    },
  };
};

/**
 * Critical function to detect answer leakage in questions
 */
export const detectAnswerLeakage = (
  question: RawAiGeneratedQuestion
): string[] => {
  const issues: string[] = [];
  const questionTextLower = question.questionText.toLowerCase();
  const correctOption = question.options.find((opt) => opt.isCorrect);

  if (!correctOption) return issues;

  const correctAnswerLower = correctOption.text.toLowerCase();

  // 1. Check if the complete correct answer appears in the question
  if (questionTextLower.includes(correctAnswerLower)) {
    issues.push(
      `Complete answer "${correctOption.text}" visible in question text`
    );
  }

  // 2. Check for partial word matches (for compound answers)
  const answerWords = correctAnswerLower
    .split(/\s+/)
    .filter((word) => word.length > 3); // Only check significant words

  answerWords.forEach((answerWord) => {
    if (questionTextLower.includes(answerWord)) {
      issues.push(`Answer word "${answerWord}" found in question`);
    }
  });

  // 3. Special checks for wine-related questions
  if (
    question.focus &&
    /wine|vintage|grape|region|producer/i.test(question.focus)
  ) {
    issues.push(
      ...detectWineAnswerLeakage(questionTextLower, correctAnswerLower)
    );
  }

  // 4. Special checks for food-related questions
  if (
    question.focus &&
    /food|ingredient|allergen|cooking|preparation|cuisine/i.test(question.focus)
  ) {
    issues.push(
      ...detectFoodAnswerLeakage(questionTextLower, correctAnswerLower)
    );
  }

  // 5. Check against dangerous patterns from config
  QUESTION_GENERATION_CONFIG.ANSWER_LEAKAGE_PREVENTION.DANGEROUS_PATTERNS.forEach(
    (pattern, index) => {
      const questionMatches = questionTextLower.match(pattern);
      const answerMatches = correctAnswerLower.match(pattern);

      if (questionMatches && answerMatches) {
        const overlap = questionMatches.filter((qMatch) =>
          answerMatches.some(
            (aMatch) => qMatch.toLowerCase() === aMatch.toLowerCase()
          )
        );

        if (overlap.length > 0) {
          issues.push(`Pattern leakage detected: "${overlap[0]}"`);
        }
      }
    }
  );

  return issues;
};

/**
 * Specialized detection for wine question answer leakage
 */
export const detectWineAnswerLeakage = (
  questionText: string,
  correctAnswer: string
): string[] => {
  const issues: string[] = [];

  // Common wine answer leakage patterns
  const winePatterns = [
    { pattern: /(\d{4})/g, type: "vintage year" },
    {
      pattern:
        /(barolo|chianti|bordeaux|burgundy|napa|sonoma|tuscany|piedmont)/gi,
      type: "region name",
    },
    {
      pattern:
        /(dom\s+perignon|opus\s+one|screaming\s+eagle|château|domaine)/gi,
      type: "producer name",
    },
    {
      pattern:
        /(chardonnay|pinot\s+noir|cabernet|merlot|sauvignon|riesling|syrah)/gi,
      type: "grape variety",
    },
  ];

  winePatterns.forEach(({ pattern, type }) => {
    const questionMatches = questionText.match(pattern);
    const answerMatches = correctAnswer.match(pattern);

    if (questionMatches && answerMatches) {
      const overlap = questionMatches.filter((qMatch) =>
        answerMatches.some(
          (aMatch) => qMatch.toLowerCase() === aMatch.toLowerCase()
        )
      );

      if (overlap.length > 0) {
        issues.push(`Wine ${type} leaked: "${overlap[0]}"`);
      }
    }
  });

  return issues;
};

/**
 * Specialized detection for food question answer leakage
 */
export const detectFoodAnswerLeakage = (
  questionText: string,
  correctAnswer: string
): string[] => {
  const issues: string[] = [];

  // Common food answer leakage patterns
  const foodPatterns = [
    {
      pattern: /(parmesan|mozzarella|cheddar|goat\s+cheese|feta|brie)/gi,
      type: "ingredient name",
    },
    {
      pattern:
        /(grilled|baked|fried|sautéed|roasted|braised|steamed|poached|pan-seared|smoked)/gi,
      type: "cooking method",
    },
    {
      pattern:
        /(chicken|beef|pork|lamb|salmon|fish|duck|turkey|tofu|shrimp|lobster)/gi,
      type: "protein type",
    },
    {
      pattern: /(peanut|nut|dairy|gluten|wheat|shellfish|sesame|soy|egg)/gi,
      type: "allergen reference",
    },
    {
      pattern:
        /(thai|chinese|japanese|italian|french|mexican|indian|greek|mediterranean)/gi,
      type: "cuisine style",
    },
  ];

  foodPatterns.forEach(({ pattern, type }) => {
    const questionMatches = questionText.match(pattern);
    const answerMatches = correctAnswer.match(pattern);

    if (questionMatches && answerMatches) {
      const overlap = questionMatches.filter((qMatch) =>
        answerMatches.some(
          (aMatch) => qMatch.toLowerCase() === aMatch.toLowerCase()
        )
      );

      if (overlap.length > 0) {
        issues.push(`Food ${type} leaked: "${overlap[0]}"`);
      }
    }
  });

  return issues;
};

/**
 * Check if a distractor is obviously wrong for the context
 */
const isObviouslyWrongAnswer = (
  distractorText: string,
  correctText: string,
  categoryName: string,
  items: SimplifiedMenuItem[]
): boolean => {
  // Check if distractor is completely unrelated to the context
  const contextTerms = [
    ...items.flatMap((item) => item.keyIngredients),
    ...items.map((item) => item.name),
    ...items.flatMap((item) => item.allergens),
  ].map((term) => term.toLowerCase());

  const distractorWords = distractorText.toLowerCase().split(/\s+/);
  const hasContextRelevance = distractorWords.some((word) =>
    contextTerms.some((term) => term.includes(word) || word.includes(term))
  );

  // If it has no relevance to the menu context, it's obviously wrong
  if (!hasContextRelevance) {
    return true;
  }

  // Category-specific obvious wrong checks
  if (categoryName.toLowerCase().includes("wine")) {
    // For wine questions, food ingredients as answers are obviously wrong
    const foodIngredients = ["chicken", "beef", "pasta", "bread", "salad"];
    return foodIngredients.some((food) =>
      distractorText.toLowerCase().includes(food)
    );
  }

  if (categoryName.toLowerCase().includes("food")) {
    // For food questions, wine terms as ingredients are obviously wrong
    const wineTerms = ["vintage", "appellation", "tannin", "decanting"];
    return wineTerms.some((wine) =>
      distractorText.toLowerCase().includes(wine)
    );
  }

  return false;
};

/**
 * Check if question uses valid generic reference when not naming item directly
 */
const isValidGenericReference = (
  questionText: string,
  item: SimplifiedMenuItem,
  categoryName: string
): boolean => {
  const questionLower = questionText.toLowerCase();

  // Check for valid generic references based on category
  if (categoryName.toLowerCase().includes("wine")) {
    const wineDescriptors = [
      "wine",
      "red wine",
      "white wine",
      "sparkling wine",
      "italian wine",
      "french wine",
    ];
    return wineDescriptors.some((desc) => questionLower.includes(desc));
  }

  if (categoryName.toLowerCase().includes("food")) {
    const foodDescriptors = [
      "dish",
      "salad",
      "pasta",
      "soup",
      "entree",
      "appetizer",
    ];
    return foodDescriptors.some((desc) => questionLower.includes(desc));
  }

  if (categoryName.toLowerCase().includes("beverage")) {
    const beverageDescriptors = [
      "cocktail",
      "drink",
      "beverage",
      "coffee",
      "tea",
    ];
    return beverageDescriptors.some((desc) => questionLower.includes(desc));
  }

  return false;
};

/**
 * Check if question focuses on safety-related knowledge
 */
const isSafetyFocused = (
  question: RawAiGeneratedQuestion,
  categoryName: string
): boolean => {
  const safetyKeywords = [
    "allergen",
    "allergy",
    "safety",
    "gluten",
    "dairy",
    "nut",
    "shellfish",
    "temperature",
    "hygiene",
  ];
  const questionLower = question.questionText.toLowerCase();

  return safetyKeywords.some((keyword) => questionLower.includes(keyword));
};

/**
 * Check if question tests practical knowledge staff need
 */
const isPracticalKnowledge = (
  question: RawAiGeneratedQuestion,
  categoryName: string
): boolean => {
  const practicalKeywords = [
    "ingredient",
    "preparation",
    "service",
    "pairing",
    "temperature",
    "glassware",
    "garnish",
  ];
  const questionLower = question.questionText.toLowerCase();

  return practicalKeywords.some((keyword) => questionLower.includes(keyword));
};

export default {
  validateGeneratedQuestions,
  detectAnswerLeakage,
  detectWineAnswerLeakage,
  detectFoodAnswerLeakage,
};
