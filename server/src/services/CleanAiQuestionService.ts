/**
 * Clean AI Question Generation Service
 *
 * Simple, efficient, human-like question generation that actually tests knowledge.
 * Mirrors the approach of CleanMenuParserService - direct AI communication,
 * conservative validation, and real-world focus.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError } from "../utils/errorHandler";
import { KnowledgeCategory } from "../models/QuestionModel";

// Clean, focused interfaces
export interface MenuItem {
  name: string;
  description?: string;
  category: string;
  itemType: "food" | "beverage" | "wine";
  ingredients?: string[];
  allergens?: string[];
  price?: number;

  // Wine-specific
  vintage?: number;
  producer?: string;
  region?: string;
  grapeVariety?: string[];
  wineStyle?: string;

  // Beverage-specific
  spiritType?: string;
  alcoholContent?: string;
  temperature?: string;

  // Food-specific
  cookingMethods?: string[];
  isSpicy?: boolean;
}

export interface GeneratedQuestion {
  questionText: string;
  questionType: "multiple-choice-single" | "true-false";
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  knowledgeCategory: KnowledgeCategory;
  difficulty: "easy" | "medium" | "hard";
  realWorldContext: string; // What situation this knowledge applies to
}

export interface QuestionGenerationRequest {
  menuItems: MenuItem[];
  focusArea:
    | "ingredients"
    | "allergens"
    | "wine_knowledge"
    | "preparation"
    | "service_knowledge"
    | "safety_protocols";
  questionCount: number;
  difficultyMix?: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface SopQuestionRequest {
  sopContent: string;
  title: string;
  questionCount: number;
  focusArea: "safety" | "procedures" | "customer_service" | "compliance";
}

export class CleanAiQuestionService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate knowledge-focused questions from menu items
   */
  async generateMenuQuestions(request: QuestionGenerationRequest): Promise<{
    success: boolean;
    questions: GeneratedQuestion[];
    errors: string[];
    stats: {
      requestedCount: number;
      generatedCount: number;
      validCount: number;
      byDifficulty: Record<string, number>;
    };
  }> {
    const errors: string[] = [];

    try {
      console.log(
        `🧠 Generating ${request.questionCount} ${request.focusArea} questions for ${request.menuItems.length} menu items`
      );

      // Build focused prompt based on knowledge area
      const prompt = this.buildMenuQuestionPrompt(request);

      // Call AI with conservative config
      const response = await this.callAI(prompt, "menu");

      // Parse and validate response
      const parseResult = this.parseQuestionResponse(response);

      if (!parseResult.success) {
        return {
          success: false,
          questions: [],
          errors: parseResult.errors,
          stats: {
            requestedCount: request.questionCount,
            generatedCount: 0,
            validCount: 0,
            byDifficulty: {},
          },
        };
      }

      const validQuestions = parseResult.questions.filter((q) =>
        this.validateQuestion(q)
      );

      return {
        success: true,
        questions: validQuestions,
        errors: parseResult.errors,
        stats: {
          requestedCount: request.questionCount,
          generatedCount: parseResult.questions.length,
          validCount: validQuestions.length,
          byDifficulty: this.calculateDifficultyStats(validQuestions),
        },
      };
    } catch (error: any) {
      console.error("❌ Question generation failed:", error);
      return {
        success: false,
        questions: [],
        errors: [`Question generation failed: ${error.message}`],
        stats: {
          requestedCount: request.questionCount,
          generatedCount: 0,
          validCount: 0,
          byDifficulty: {},
        },
      };
    }
  }

  /**
   * Generate procedure-focused questions from SOP content
   */
  async generateSopQuestions(request: SopQuestionRequest): Promise<{
    success: boolean;
    questions: GeneratedQuestion[];
    errors: string[];
  }> {
    try {
      console.log(
        `📋 Generating ${request.questionCount} ${request.focusArea} questions from SOP: ${request.title}`
      );

      const prompt = this.buildSopQuestionPrompt(request);
      const response = await this.callAI(prompt, "sop");
      const parseResult = this.parseQuestionResponse(response);

      if (!parseResult.success) {
        return {
          success: false,
          questions: [],
          errors: parseResult.errors,
        };
      }

      const validQuestions = parseResult.questions.filter((q) =>
        this.validateQuestion(q)
      );

      return {
        success: true,
        questions: validQuestions,
        errors: parseResult.errors,
      };
    } catch (error: any) {
      console.error("❌ SOP question generation failed:", error);
      return {
        success: false,
        questions: [],
        errors: [`SOP question generation failed: ${error.message}`],
      };
    }
  }

  /**
   * Build knowledge-focused menu question prompt
   */
  private buildMenuQuestionPrompt(request: QuestionGenerationRequest): string {
    const { menuItems, focusArea, questionCount } = request;

    // Focus instructions based on real hospitality knowledge needs
    const focusInstructions = {
      ingredients: `Create questions that test staff knowledge of what's actually IN each dish. Staff need to know this to:
- Answer customer questions about ingredients
- Identify allergens and dietary restrictions
- Explain dish components to customers
- Handle special dietary requests`,

      allergens: `Create questions about allergens and dietary restrictions. Staff need this knowledge to:
- Keep customers safe from allergic reactions
- Accurately inform customers about dietary options
- Handle special dietary requests professionally
- Comply with food safety regulations`,

      wine_knowledge: `Create questions about wine knowledge that servers actually need. Focus on:
- Grape varieties and flavor profiles
- Wine regions and characteristics  
- Food pairing recommendations
- Proper wine service techniques
- Vintage and quality indicators`,

      preparation: `Create questions about how dishes are prepared. Staff need this to:
- Explain cooking methods to customers
- Describe texture and flavor profiles
- Handle modification requests
- Explain timing for special preparations`,

      service_knowledge: `Create questions about proper service for these items. Focus on:
- Proper serving temperatures
- Presentation standards
- Accompaniments and garnishes
- Service timing and coordination
- Customer interaction techniques`,

      safety_protocols: `Create questions about food safety related to these items. Focus on:
- Temperature requirements
- Cross-contamination prevention
- Allergen handling procedures
- Proper storage and handling
- Health and safety compliance`,
    };

    const menuItemsText = menuItems
      .map((item) => {
        let itemText = `• ${item.name}`;
        if (item.description) itemText += ` - ${item.description}`;
        if (item.ingredients?.length)
          itemText += `\n  Key ingredients: ${item.ingredients.join(", ")}`;
        if (item.allergens?.length)
          itemText += `\n  Contains allergens: ${item.allergens.join(", ")}`;
        if (item.price) itemText += `\n  Price: £${item.price}`;

        // Wine-specific details
        if (item.itemType === "wine") {
          if (item.grapeVariety?.length)
            itemText += `\n  Grape variety: ${item.grapeVariety.join(", ")}`;
          if (item.region) itemText += `\n  Region: ${item.region}`;
          if (item.vintage) itemText += `\n  Vintage: ${item.vintage}`;
          if (item.producer) itemText += `\n  Producer: ${item.producer}`;
        }

        // Food-specific details
        if (item.itemType === "food") {
          if (item.cookingMethods?.length)
            itemText += `\n  Preparation: ${item.cookingMethods.join(", ")}`;
          if (item.isSpicy) itemText += `\n  Spice level: Spicy`;
        }

        // Beverage-specific details
        if (item.itemType === "beverage") {
          if (item.spiritType)
            itemText += `\n  Spirit type: ${item.spiritType}`;
          if (item.alcoholContent)
            itemText += `\n  Alcohol content: ${item.alcoholContent}`;
          if (item.temperature) itemText += `\n  Served: ${item.temperature}`;
        }

        return itemText;
      })
      .join("\n\n");

    return `You are an experienced restaurant trainer creating quiz questions for new staff members.

${focusInstructions[focusArea]}

MENU ITEMS TO FOCUS ON:
${menuItemsText}

QUESTION REQUIREMENTS:
- Create exactly ${questionCount} questions
- Make questions conversational and natural - like a manager would ask
- Test practical knowledge staff will actually use on the job
- Include realistic wrong answers that sound plausible
- Provide clear explanations that help staff understand WHY

DIFFICULTY LEVELS:
- Easy: Basic facts anyone should know after reading the menu
- Medium: Knowledge that comes from training and experience  
- Hard: Expert knowledge that demonstrates real expertise

RESPONSE FORMAT:
Return ONLY a JSON array with this exact structure:

[
  {
    "questionText": "What's the main protein in our Pan-Seared Salmon?",
    "questionType": "multiple-choice-single",
    "options": [
      {"text": "Atlantic Salmon", "isCorrect": true},
      {"text": "Pacific Cod", "isCorrect": false},
      {"text": "Sea Bass", "isCorrect": false},
      {"text": "Halibut", "isCorrect": false}
    ],
    "explanation": "The dish name clearly indicates salmon as the main protein, and it's specifically Atlantic salmon sourced from sustainable farms.",
    "knowledgeCategory": "food-knowledge",
    "difficulty": "easy",
    "realWorldContext": "Customer asks about the type of fish in the salmon dish"
  }
]

CRITICAL RULES:
- Multiple choice questions: exactly 4 options, 1 correct
- True/false questions: exactly 2 options, 1 correct  
- Questions must be specific to OUR menu items
- Use realistic scenarios staff encounter
- Return valid JSON only - no explanations outside the JSON`;
  }

  /**
   * Build SOP-focused question prompt
   */
  private buildSopQuestionPrompt(request: SopQuestionRequest): string {
    const focusInstructions = {
      safety: `Create questions about safety procedures and protocols that staff must follow to keep everyone safe.`,
      procedures: `Create questions about operational procedures that ensure smooth restaurant operations.`,
      customer_service: `Create questions about customer service standards and how to handle different situations.`,
      compliance: `Create questions about regulatory compliance and legal requirements.`,
    };

    return `You are a restaurant operations trainer creating quiz questions about procedures and protocols.

${focusInstructions[request.focusArea]}

SOP CONTENT:
Title: ${request.title}
---
${request.sopContent}
---

Create exactly ${
      request.questionCount
    } practical questions that test important operational knowledge.

Focus on:
- Key procedures staff must follow
- Critical safety requirements
- When and how to escalate issues
- Specific steps and sequences
- Compliance requirements

Make questions realistic - test knowledge they'll actually need on the job.

RESPONSE FORMAT:
Return ONLY a JSON array with this exact structure:

[
  {
    "questionText": "What temperature must hot food be maintained at during service?",
    "questionType": "multiple-choice-single",
    "options": [
      {"text": "140°F (60°C) or above", "isCorrect": true},
      {"text": "120°F (49°C) or above", "isCorrect": false},
      {"text": "160°F (71°C) or above", "isCorrect": false},
      {"text": "180°F (82°C) or above", "isCorrect": false}
    ],
    "explanation": "According to food safety protocols, hot food must be maintained at 140°F or above to prevent bacterial growth in the temperature danger zone.",
    "knowledgeCategory": "procedures-knowledge",
    "difficulty": "medium",
    "realWorldContext": "Staff checking hot holding temperatures during service"
  }
]

CRITICAL RULES:
- Multiple choice questions: exactly 4 options, 1 correct
- True/false questions: exactly 2 options, 1 correct
- Questions must be based on the provided SOP content
- Use realistic workplace scenarios
- Set knowledgeCategory to "procedures-knowledge"
- Return valid JSON only - no explanations outside the JSON`;
  }

  /**
   * Call AI with clean, direct configuration
   */
  private async callAI(prompt: string, type: "menu" | "sop"): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7, // Balanced creativity
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      });

      const systemInstruction =
        type === "menu"
          ? "You are an expert restaurant trainer who creates practical, knowledge-focused quiz questions for staff training. Always return valid JSON arrays."
          : "You are an expert restaurant operations trainer who creates practical procedure and safety questions. Always return valid JSON arrays.";

      const chat = model.startChat({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
          role: "system",
        },
      });

      console.log(`🤖 Sending prompt to AI (${prompt.length} characters)`);
      const result = await chat.sendMessage(prompt);
      const responseText = result.response.text();

      console.log(
        `✅ AI response received (${responseText.length} characters)`
      );
      return responseText;
    } catch (error: any) {
      console.error(`❌ AI call failed:`, error);
      throw new AppError(
        `AI question generation failed: ${error.message}`,
        500
      );
    }
  }

  /**
   * Parse AI response with conservative validation
   */
  private parseQuestionResponse(response: string): {
    success: boolean;
    questions: GeneratedQuestion[];
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(response);

      if (!Array.isArray(parsed)) {
        return {
          success: false,
          questions: [],
          errors: ["AI response is not an array"],
        };
      }

      const questions: GeneratedQuestion[] = [];

      parsed.forEach((item, index) => {
        try {
          const question = this.validateAndNormalizeQuestion(item, index);
          if (question) {
            questions.push(question);
          }
        } catch (error: any) {
          errors.push(`Question ${index + 1}: ${error.message}`);
        }
      });

      return {
        success: questions.length > 0,
        questions,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        questions: [],
        errors: [`Failed to parse AI response: ${error.message}`],
      };
    }
  }

  /**
   * Validate and normalize individual question
   */
  private validateAndNormalizeQuestion(
    item: any,
    index: number
  ): GeneratedQuestion | null {
    if (!item.questionText || typeof item.questionText !== "string") {
      throw new Error("Missing or invalid question text");
    }

    if (
      !item.questionType ||
      !["multiple-choice-single", "true-false"].includes(item.questionType)
    ) {
      throw new Error("Invalid question type");
    }

    if (!Array.isArray(item.options)) {
      throw new Error("Missing or invalid options array");
    }

    // Validate option count
    const expectedOptionCount = item.questionType === "true-false" ? 2 : 4;
    if (item.options.length !== expectedOptionCount) {
      throw new Error(
        `${item.questionType} questions must have exactly ${expectedOptionCount} options`
      );
    }

    // Validate options structure
    const correctCount = item.options.filter(
      (opt: any) => opt.isCorrect === true
    ).length;
    if (correctCount !== 1) {
      throw new Error("Must have exactly one correct answer");
    }

    // Normalize knowledge category
    const knowledgeCategory = this.normalizeKnowledgeCategory(
      item.knowledgeCategory
    );

    return {
      questionText: item.questionText.trim(),
      questionType: item.questionType,
      options: item.options.map((opt: any) => ({
        text: opt.text?.trim() || "",
        isCorrect: opt.isCorrect === true,
      })),
      explanation: item.explanation?.trim() || "No explanation provided.",
      knowledgeCategory,
      difficulty: this.normalizeDifficulty(item.difficulty),
      realWorldContext:
        item.realWorldContext?.trim() || "General restaurant knowledge",
    };
  }

  /**
   * Normalize knowledge category to enum value
   */
  private normalizeKnowledgeCategory(category: any): KnowledgeCategory {
    const categoryMap: Record<string, KnowledgeCategory> = {
      "food-knowledge": KnowledgeCategory.FOOD_KNOWLEDGE,
      food_knowledge: KnowledgeCategory.FOOD_KNOWLEDGE,
      "beverage-knowledge": KnowledgeCategory.BEVERAGE_KNOWLEDGE,
      beverage_knowledge: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
      "wine-knowledge": KnowledgeCategory.WINE_KNOWLEDGE,
      wine_knowledge: KnowledgeCategory.WINE_KNOWLEDGE,
      "procedures-knowledge": KnowledgeCategory.PROCEDURES_KNOWLEDGE,
      procedures_knowledge: KnowledgeCategory.PROCEDURES_KNOWLEDGE,
    };

    return categoryMap[category] || KnowledgeCategory.FOOD_KNOWLEDGE;
  }

  /**
   * Normalize difficulty level
   */
  private normalizeDifficulty(difficulty: any): "easy" | "medium" | "hard" {
    if (["easy", "medium", "hard"].includes(difficulty)) {
      return difficulty;
    }
    return "medium"; // Default
  }

  /**
   * Validate final question structure
   */
  private validateQuestion(question: GeneratedQuestion): boolean {
    try {
      return (
        question.questionText.length > 0 &&
        question.options.length > 0 &&
        question.options.filter((opt) => opt.isCorrect).length === 1 &&
        question.explanation.length > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * Calculate difficulty statistics
   */
  private calculateDifficultyStats(
    questions: GeneratedQuestion[]
  ): Record<string, number> {
    const stats = { easy: 0, medium: 0, hard: 0 };
    questions.forEach((q) => {
      stats[q.difficulty] = (stats[q.difficulty] || 0) + 1;
    });
    return stats;
  }
}
