// Question Validation Utilities
// This file contains functions to validate question quality and detect answer leakage

import {
  ANSWER_LEAKAGE_PATTERNS,
  QUESTION_GENERATION_CONFIG,
} from "./questionGenerationConstants";

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  score: number; // 0-100 quality score
  recommendations: string[];
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
}

export interface QuestionGenerationContext {
  categoryName: string;
  items: SimplifiedMenuItem[];
  targetCount: number;
}

/**
 * Main function to validate generated questions
 */
export const validateGeneratedQuestions = (
  questions: RawAiGeneratedQuestion[],
  originalItems: SimplifiedMenuItem[],
  context: QuestionGenerationContext
): ValidationResult => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let totalScore = 0;

  questions.forEach((q, index) => {
    let questionScore = 100;

    // Check if question references actual menu items BY NAME (stricter requirement)
    // Exception: "Which dish contains these ingredients" format is asking about the dish name, so doesn't need to mention it
    const isReverseIngredientQuestion =
      /^Which dish contains these ingredients:/i.test(q.questionText);

    const mentionsSpecificMenuItem =
      isReverseIngredientQuestion ||
      originalItems.some((item) =>
        q.questionText.toLowerCase().includes(item.name.toLowerCase())
      );

    const usesVagueReference =
      /\bthe\s+(side\s+dish|dish|item|wine|beverage)\s+(that|which|with|featuring)/i.test(
        q.questionText
      ) ||
      /\bthis\s+(side\s+dish|dish|item|wine|beverage|preparation)/i.test(
        q.questionText
      );

    if (!mentionsSpecificMenuItem) {
      if (usesVagueReference) {
        issues.push(
          `Question ${
            index + 1
          }: Uses vague reference instead of specific menu item name (e.g., "the dish that features..." instead of actual item name)`
        );
        questionScore -= 35; // Heavy penalty for vague references
      } else {
        issues.push(`Question ${index + 1}: No clear menu item reference`);
        questionScore -= 30;
      }
    }

    // Check distractor quality
    const correctOption = q.options.find((opt) => opt.isCorrect);
    const incorrectOptions = q.options.filter((opt) => !opt.isCorrect);

    // More specific distractor count error message
    if (
      incorrectOptions.length !==
      QUESTION_GENERATION_CONFIG.REQUIRED_DISTRACTOR_COUNT
    ) {
      issues.push(
        `Question ${index + 1}: Must have exactly ${
          QUESTION_GENERATION_CONFIG.REQUIRED_DISTRACTOR_COUNT
        } distractors (has ${incorrectOptions.length}, needs ${
          QUESTION_GENERATION_CONFIG.REQUIRED_DISTRACTOR_COUNT -
          incorrectOptions.length
        } more)`
      );
      questionScore -= 25;
    }

    // Check if there's at least one correct option
    if (!correctOption) {
      issues.push(`Question ${index + 1}: No correct answer provided`);
      questionScore -= 30;
    }

    // Check for duplicate options
    const optionTexts = q.options.map((opt) => opt.text.toLowerCase());
    const uniqueOptions = new Set(optionTexts);
    if (uniqueOptions.size !== optionTexts.length) {
      issues.push(`Question ${index + 1}: Contains duplicate options`);
      questionScore -= 20;
    }

    // Check if distractors are plausible
    const obviouslyWrongDistractors = incorrectOptions.filter((opt) =>
      isObviouslyWrongAnswer(opt.text, correctOption?.text || "", context)
    );

    if (obviouslyWrongDistractors.length > 1) {
      issues.push(
        `Question ${index + 1}: Contains obviously wrong distractors`
      );
      questionScore -= 15;
    }

    // Check question specificity
    if (
      q.questionText.length < QUESTION_GENERATION_CONFIG.MIN_QUESTION_LENGTH ||
      q.questionText.split(" ").length < 5
    ) {
      issues.push(`Question ${index + 1}: Too vague or short`);
      questionScore -= 10;
    }

    // Check explanation quality
    if (!q.explanation || q.explanation.length < 10) {
      issues.push(`Question ${index + 1}: Poor or missing explanation`);
      questionScore -= 10;
    }

    // NEW: Check if food questions follow simplified formats
    if (q.category === "Food" || q.focus === "ingredients") {
      const followsSimplifiedFormat =
        /^What ingredients does the .+ contain\?$/i.test(q.questionText) ||
        /^Which dish contains these ingredients: .+\?$/i.test(q.questionText) ||
        /^Does the .+ contain these ingredients: .+\?$/i.test(q.questionText);

      if (!followsSimplifiedFormat) {
        issues.push(
          `Question ${
            index + 1
          }: Food question does not follow simplified format (must use: "What ingredients does X contain?", "Which dish contains these ingredients: Y?", or "Does X contain these ingredients: Y?")`
        );
        questionScore -= 20;
      }
    }

    // CRITICAL: Check for answer leakage in question text
    const answerLeakageIssues = detectAnswerLeakage(q);
    if (answerLeakageIssues.length > 0) {
      issues.push(`Question ${index + 1}: ${answerLeakageIssues.join(", ")}`);
      questionScore -=
        QUESTION_GENERATION_CONFIG.ANSWER_LEAKAGE_PREVENTION.SANITIZATION_RULES
          .heavyPenaltyForLeakage;
    }

    totalScore += Math.max(0, questionScore);
  });

  const averageScore = questions.length > 0 ? totalScore / questions.length : 0;

  // Generate recommendations
  if (averageScore < QUESTION_GENERATION_CONFIG.MIN_QUALITY_SCORE) {
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
      "Ensure questions explicitly mention menu item names or characteristics"
    );
  }
  if (
    issues.some(
      (issue) =>
        issue.includes("answer leaked") || issue.includes("visible in question")
    )
  ) {
    recommendations.push(
      "CRITICAL: Review answer leakage prevention - questions contain answer hints"
    );
  }

  return {
    isValid:
      issues.length === 0 &&
      averageScore >= QUESTION_GENERATION_CONFIG.MIN_QUALITY_SCORE,
    issues,
    score: Math.round(averageScore),
    recommendations,
  };
};

/**
 * Check if a question is relevant to a menu item even if it doesn't mention the name directly
 */
const isRelevantToItem = (
  questionText: string,
  item: SimplifiedMenuItem
): boolean => {
  const questionLower = questionText.toLowerCase();

  // Check if question mentions ingredients, allergens, or other characteristics
  const itemCharacteristics = [
    ...item.keyIngredients,
    ...item.allergens,
    item.category,
    ...(item.wineDetails
      ? [
          item.wineDetails.grapeVariety,
          item.wineDetails.region,
          item.wineDetails.producer,
        ].filter(Boolean)
      : []),
  ];

  return itemCharacteristics.some(
    (characteristic) =>
      characteristic && questionLower.includes(characteristic.toLowerCase())
  );
};

/**
 * Check if a distractor answer is obviously wrong
 */
const isObviouslyWrongAnswer = (
  distractorText: string,
  correctText: string,
  context: QuestionGenerationContext
): boolean => {
  // Check if distractor is completely unrelated to the context
  const contextTerms = context.items
    .flatMap((item) => [
      ...item.keyIngredients,
      item.category,
      ...(item.wineDetails
        ? [item.wineDetails.grapeVariety, item.wineDetails.region].filter(
            Boolean
          )
        : []),
    ])
    .map((term) => term?.toLowerCase())
    .filter(Boolean);

  const distractorWords = distractorText.toLowerCase().split(" ");
  const hasContextRelevance = distractorWords.some((word) =>
    contextTerms.some((term) => term!.includes(word) || word.includes(term!))
  );

  return !hasContextRelevance;
};

/**
 * CRITICAL: Function to detect answer leakage in questions
 */
export const detectAnswerLeakage = (
  question: RawAiGeneratedQuestion
): string[] => {
  const issues: string[] = [];
  const questionTextLower = question.questionText.toLowerCase();
  const correctOption = question.options.find((opt) => opt.isCorrect);

  if (!correctOption) return issues;

  const correctAnswerLower = correctOption.text.toLowerCase();

  // Check if the complete correct answer appears in the question
  if (questionTextLower.includes(correctAnswerLower)) {
    issues.push("Complete answer visible in question text");
  }

  // Check for partial word matches (for compound answers)
  const answerWords = correctAnswerLower
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const questionWords = questionTextLower.split(/\s+/);

  answerWords.forEach((answerWord) => {
    if (
      questionWords.some(
        (qWord) => qWord.includes(answerWord) || answerWord.includes(qWord)
      )
    ) {
      issues.push(`Answer word "${answerWord}" found in question`);
    }
  });

  // Special checks for wine-related questions
  if (
    question.focus &&
    /wine|vintage|grape|region|producer/i.test(question.focus)
  ) {
    issues.push(
      ...detectWineAnswerLeakage(questionTextLower, correctAnswerLower)
    );
  }

  // Special checks for food-related questions
  if (
    question.focus &&
    /food|ingredient|allergen|cooking|preparation|cuisine/i.test(question.focus)
  ) {
    issues.push(
      ...detectFoodAnswerLeakage(questionTextLower, correctAnswerLower)
    );
  }

  // Special checks for beverage-related questions
  if (
    question.focus &&
    /beverage|cocktail|drink|spirit|mixer/i.test(question.focus)
  ) {
    issues.push(
      ...detectBeverageAnswerLeakage(questionTextLower, correctAnswerLower)
    );
  }

  return issues;
};

/**
 * Specialized detection for wine question answer leakage
 */
const detectWineAnswerLeakage = (
  questionText: string,
  correctAnswer: string
): string[] => {
  const issues: string[] = [];

  ANSWER_LEAKAGE_PATTERNS.WINE.forEach((pattern, index) => {
    const questionMatches = questionText.match(pattern);
    const answerMatches = correctAnswer.match(pattern);

    if (questionMatches && answerMatches) {
      const overlap = questionMatches.filter((qMatch) =>
        answerMatches.some(
          (aMatch) => qMatch.toLowerCase() === aMatch.toLowerCase()
        )
      );

      if (overlap.length > 0) {
        const patternType = [
          "vintage year",
          "region name",
          "producer name",
          "grape variety",
        ][index];
        issues.push(`Wine ${patternType} leaked: "${overlap[0]}"`);
      }
    }
  });

  return issues;
};

/**
 * Specialized detection for food question answer leakage
 */
const detectFoodAnswerLeakage = (
  questionText: string,
  correctAnswer: string
): string[] => {
  const issues: string[] = [];

  ANSWER_LEAKAGE_PATTERNS.FOOD.forEach((pattern, index) => {
    const questionMatches = questionText.match(pattern);
    const answerMatches = correctAnswer.match(pattern);

    if (questionMatches && answerMatches) {
      const overlap = questionMatches.filter((qMatch) =>
        answerMatches.some(
          (aMatch) => qMatch.toLowerCase() === aMatch.toLowerCase()
        )
      );

      if (overlap.length > 0) {
        const patternType = [
          "ingredient name",
          "cooking method",
          "protein type",
          "allergen reference",
          "cuisine style",
        ][index];
        issues.push(`Food ${patternType} leaked: "${overlap[0]}"`);
      }
    }
  });

  return issues;
};

/**
 * Specialized detection for beverage question answer leakage
 */
const detectBeverageAnswerLeakage = (
  questionText: string,
  correctAnswer: string
): string[] => {
  const issues: string[] = [];

  ANSWER_LEAKAGE_PATTERNS.BEVERAGE.forEach((pattern, index) => {
    const questionMatches = questionText.match(pattern);
    const answerMatches = correctAnswer.match(pattern);

    if (questionMatches && answerMatches) {
      const overlap = questionMatches.filter((qMatch) =>
        answerMatches.some(
          (aMatch) => qMatch.toLowerCase() === aMatch.toLowerCase()
        )
      );

      if (overlap.length > 0) {
        const patternType = ["spirit type", "mixer type", "garnish type"][
          index
        ];
        issues.push(`Beverage ${patternType} leaked: "${overlap[0]}"`);
      }
    }
  });

  return issues;
};

/**
 * Helper function to get question quality recommendations
 */
export const getQualityRecommendations = (
  validationResult: ValidationResult
): string[] => {
  const recommendations: string[] = [...validationResult.recommendations];

  if (validationResult.score < 50) {
    recommendations.push("Consider complete regeneration - quality is too low");
  } else if (validationResult.score < 70) {
    recommendations.push("Improve prompt specificity and context quality");
  }

  return recommendations;
};

export default {
  validateGeneratedQuestions,
  detectAnswerLeakage,
  getQualityRecommendations,
};
