import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError } from "../utils/errorHandler";
import {
  SIMPLE_SYSTEM_PROMPTS,
  buildMenuPrompt,
  buildSopPrompt,
} from "../utils/simplePrompts";
import {
  SimpleMenuItem,
  SimpleMenuQuestionRequest,
  SimpleSopQuestionRequest,
  GeneratedQuestion,
  RawAiQuestion,
} from "../types/simpleQuestionTypes";

/**
 * Simplified AI Question Generation Service
 *
 * Clean, focused approach that generates human-like questions
 * without the complexity of the previous 3,300+ line system.
 */
export class SimpleAiQuestionService {
  private static readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  private static genAI: GoogleGenerativeAI | null = null;

  static {
    if (this.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(this.GEMINI_API_KEY);
    } else {
      console.error(
        "GEMINI_API_KEY is not set. AI question generation will not function."
      );
    }
  }

  /**
   * Generate natural, conversational questions for menu items
   */
  static async generateMenuQuestions(
    request: SimpleMenuQuestionRequest
  ): Promise<GeneratedQuestion[]> {
    this.validateMenuRequest(request);

    const prompt = buildMenuPrompt(
      request.menuItems,
      request.questionCount,
      request.focusArea
    );
    console.log(
      `[SimpleAI] Generating ${request.questionCount} ${request.focusArea} questions for ${request.menuItems.length} items`
    );

    const response = await this.callAI(prompt, "MENU_TRAINING");
    return this.parseResponse(
      response,
      request.knowledgeCategory,
      request.focusArea
    );
  }

  /**
   * Generate questions for SOP content
   */
  static async generateSopQuestions(
    request: SimpleSopQuestionRequest
  ): Promise<GeneratedQuestion[]> {
    this.validateSopRequest(request);

    const prompt = buildSopPrompt(request.sopContent, request.questionCount);
    console.log(
      `[SimpleAI] Generating ${request.questionCount} SOP questions for category: ${request.sopCategoryName}`
    );

    const response = await this.callAI(prompt, "SOP_TRAINING");
    return this.parseResponse(response, "procedures-knowledge", "procedures");
  }

  /**
   * Call Gemini AI with simple, direct configuration
   */
  private static async callAI(
    prompt: string,
    systemType: "MENU_TRAINING" | "SOP_TRAINING"
  ): Promise<string> {
    if (!this.genAI) {
      throw new AppError(
        "AI service not configured. Check GEMINI_API_KEY.",
        500
      );
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      const chat = model.startChat({
        systemInstruction: {
          parts: [{ text: SIMPLE_SYSTEM_PROMPTS[systemType] }],
          role: "system",
        },
      });

      console.log(
        `[SimpleAI] Sending prompt to AI (${prompt.length} characters)`
      );
      const result = await chat.sendMessage(prompt);
      const responseText = result.response.text();

      console.log(
        `[SimpleAI] AI response received (${responseText.length} characters)`
      );
      return responseText;
    } catch (error: any) {
      console.error(`[SimpleAI] AI call failed:`, error.message);
      throw new AppError(
        `AI question generation failed: ${error.message}`,
        500
      );
    }
  }

  /**
   * Parse AI response and add metadata
   */
  private static parseResponse(
    response: string,
    category: string,
    focusArea: string
  ): GeneratedQuestion[] {
    try {
      const rawQuestions: RawAiQuestion[] = JSON.parse(response);

      if (!Array.isArray(rawQuestions)) {
        throw new Error("AI response is not an array");
      }

      const validQuestions: GeneratedQuestion[] = [];
      const errors: string[] = [];

      rawQuestions.forEach((q, index) => {
        try {
          // Validate question structure
          this.validateQuestionStructure(q, index);

          validQuestions.push({
            questionText: q.questionText,
            questionType: q.questionType as
              | "multiple-choice-single"
              | "true-false",
            options: q.options,
            explanation: q.explanation || "No explanation provided.",
            category,
            focusArea,
          });
        } catch (validationError: any) {
          errors.push(`Question ${index + 1}: ${validationError.message}`);
          console.warn(
            `[SimpleAI] Skipping invalid question ${index + 1}:`,
            validationError.message
          );
          console.warn(`[SimpleAI] Question data:`, JSON.stringify(q, null, 2));
        }
      });

      if (validQuestions.length === 0) {
        console.error("[SimpleAI] No valid questions generated. Errors:");
        errors.forEach((error) => console.error(`  - ${error}`));
        console.error("[SimpleAI] Raw response:", response);
        throw new Error(
          `No valid questions generated. Errors: ${errors.join("; ")}`
        );
      }

      if (errors.length > 0) {
        console.warn(
          `[SimpleAI] Generated ${validQuestions.length} valid questions, skipped ${errors.length} invalid ones`
        );
      } else {
        console.log(
          `[SimpleAI] Successfully parsed ${validQuestions.length} questions`
        );
      }

      return validQuestions;
    } catch (error: any) {
      console.error("[SimpleAI] Failed to parse AI response:", error.message);
      console.error("[SimpleAI] Raw response:", response.substring(0, 1000));
      throw new AppError(`AI returned invalid response: ${error.message}`, 500);
    }
  }

  /**
   * Simple validation for menu requests
   */
  private static validateMenuRequest(request: SimpleMenuQuestionRequest): void {
    if (!request.menuItems || request.menuItems.length === 0) {
      throw new AppError("Menu items are required", 400);
    }
    if (request.questionCount <= 0) {
      throw new AppError("Question count must be positive", 400);
    }
    if (request.questionCount > 50) {
      throw new AppError("Question count cannot exceed 50 per request", 400);
    }
  }

  /**
   * Simple validation for SOP requests
   */
  private static validateSopRequest(request: SimpleSopQuestionRequest): void {
    if (!request.sopContent || request.sopContent.trim().length === 0) {
      throw new AppError("SOP content is required", 400);
    }
    if (request.questionCount <= 0) {
      throw new AppError("Question count must be positive", 400);
    }
    if (request.questionCount > 20) {
      throw new AppError(
        "Question count cannot exceed 20 for SOP requests",
        400
      );
    }
  }

  /**
   * Validate individual question structure
   */
  private static validateQuestionStructure(
    question: RawAiQuestion,
    index: number
  ): void {
    if (!question.questionText) {
      throw new Error(`Question ${index + 1}: Missing question text`);
    }

    if (!question.options || !Array.isArray(question.options)) {
      throw new Error(`Question ${index + 1}: Missing or invalid options`);
    }

    if (
      question.questionType === "multiple-choice-single" &&
      question.options.length !== 4
    ) {
      throw new Error(
        `Question ${
          index + 1
        }: Multiple choice questions must have exactly 4 options`
      );
    }

    if (
      question.questionType === "true-false" &&
      question.options.length !== 2
    ) {
      throw new Error(
        `Question ${
          index + 1
        }: True/false questions must have exactly 2 options`
      );
    }

    const correctAnswers = question.options.filter((opt) => opt.isCorrect);
    if (correctAnswers.length !== 1) {
      throw new Error(
        `Question ${index + 1}: Must have exactly one correct answer`
      );
    }
  }
}

/**
 * Helper functions for mapping menu categories to focus areas and knowledge categories
 */
export function determineFocusArea(
  menuCategory: string
): "ingredients" | "allergens" | "wine" | "preparation" | "general" {
  const category = menuCategory.toLowerCase();

  if (category.includes("wine") || category.includes("vino")) {
    return "wine";
  }

  if (
    category.includes("drink") ||
    category.includes("beverage") ||
    category.includes("cocktail")
  ) {
    return "preparation";
  }

  // Default to ingredients for food items
  return "ingredients";
}

export function mapToKnowledgeCategory(
  menuCategory: string
):
  | "food-knowledge"
  | "beverage-knowledge"
  | "wine-knowledge"
  | "procedures-knowledge" {
  const category = menuCategory.toLowerCase();

  if (category.includes("wine") || category.includes("vino")) {
    return "wine-knowledge";
  }

  if (
    category.includes("drink") ||
    category.includes("beverage") ||
    category.includes("cocktail")
  ) {
    return "beverage-knowledge";
  }

  // Default to food knowledge
  return "food-knowledge";
}
