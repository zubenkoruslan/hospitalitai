import { Request, Response } from "express";
import {
  CleanAiQuestionService,
  MenuItem,
  QuestionGenerationRequest,
  SopQuestionRequest,
} from "../services/CleanAiQuestionService";
import { AppError } from "../utils/errorHandler";
import QuestionBankModel from "../models/QuestionBankModel";
import MenuItemModel from "../models/MenuItemModel";
import MenuModel from "../models/MenuModel";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel";
import mongoose from "mongoose";

/**
 * Clean Question Generation Controller
 *
 * Simple, focused controller for the new clean AI question generation system.
 * Follows the same principles as CleanMenuController - direct processing,
 * conservative validation, clear error handling.
 */

interface GenerateMenuQuestionsRequest {
  menuId: string;
  bankId: string;
  focusArea:
    | "ingredients"
    | "allergens"
    | "wine_knowledge"
    | "preparation"
    | "service_knowledge"
    | "safety_protocols";
  questionCount: number;
  categoriesToFocus?: string[];
  difficultyMix?: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface GenerateSopQuestionsRequest {
  sopContent: string;
  title: string;
  focusArea: "safety" | "procedures" | "customer_service" | "compliance";
  questionCount: number;
  bankId: string;
}

export class CleanQuestionController {
  private questionService: CleanAiQuestionService;

  constructor() {
    this.questionService = new CleanAiQuestionService();
  }

  /**
   * Generate knowledge-focused questions from menu items
   */
  generateMenuQuestions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        menuId,
        bankId,
        focusArea,
        questionCount,
        categoriesToFocus,
        difficultyMix,
      } = req.body as GenerateMenuQuestionsRequest;

      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        throw new AppError("Restaurant ID is required", 400);
      }

      console.log(
        `🧠 [CleanQuestionController] Starting menu question generation:`,
        {
          menuId,
          bankId,
          focusArea,
          questionCount,
          categoriesToFocus: categoriesToFocus?.length || 0,
          restaurantId: restaurantId.toString(),
        }
      );

      // Validate inputs
      this.validateMenuQuestionRequest({
        menuId,
        bankId,
        focusArea,
        questionCount,
      });

      // Fetch and validate menu
      const menu = await MenuModel.findOne({ _id: menuId, restaurantId });
      if (!menu) {
        throw new AppError(`Menu not found: ${menuId}`, 404);
      }

      // Fetch and validate question bank
      const questionBank = await QuestionBankModel.findOne({
        _id: bankId,
        restaurantId,
      });
      if (!questionBank) {
        throw new AppError(`Question bank not found: ${bankId}`, 404);
      }

      // Fetch menu items
      const menuItemQuery: any = {
        menuId,
        restaurantId,
        isActive: true,
      };

      if (categoriesToFocus && categoriesToFocus.length > 0) {
        menuItemQuery.category = { $in: categoriesToFocus };
      }

      const rawMenuItems = await MenuItemModel.find(menuItemQuery);

      if (rawMenuItems.length === 0) {
        throw new AppError("No menu items found matching criteria", 404);
      }

      console.log(`📋 Found ${rawMenuItems.length} menu items to process`);

      // Convert to clean format
      const menuItems: MenuItem[] = rawMenuItems.map((item) => ({
        name: item.name,
        description: item.description || undefined,
        category: item.category,
        itemType: item.itemType as "food" | "beverage" | "wine",
        ingredients: item.ingredients || undefined,
        allergens: item.allergens || undefined,
        price: item.price || undefined,

        // Wine-specific
        vintage: item.vintage || undefined,
        producer: item.producer || undefined,
        region: item.region || undefined,
        grapeVariety: item.grapeVariety || undefined,
        wineStyle: item.wineStyle || undefined,

        // Beverage-specific
        spiritType: item.spiritType || undefined,
        alcoholContent: item.alcoholContent || undefined,
        temperature: item.temperature || undefined,

        // Food-specific
        cookingMethods: item.cookingMethods || undefined,
        isSpicy: item.isSpicy || undefined,
      }));

      // Generate questions
      const request: QuestionGenerationRequest = {
        menuItems,
        focusArea,
        questionCount,
        difficultyMix,
      };

      const result = await this.questionService.generateMenuQuestions(request);

      if (!result.success) {
        throw new AppError(
          `Question generation failed: ${result.errors.join(", ")}`,
          500
        );
      }

      console.log(`✅ Generated ${result.questions.length} valid questions`);

      // Save questions to database
      const savedQuestions = await this.saveQuestionsToDatabase(
        result.questions,
        restaurantId,
        bankId,
        menuItems.map((item) => item.category)
      );

      res.json({
        success: true,
        data: {
          questions: savedQuestions,
          stats: result.stats,
          errors: result.errors,
          processing: {
            menuItemsProcessed: menuItems.length,
            questionsGenerated: result.questions.length,
            questionsSaved: savedQuestions.length,
            focusArea,
            menu: {
              id: menu._id,
              name: menu.name,
            },
            questionBank: {
              id: questionBank._id,
              name: questionBank.name,
            },
          },
        },
      });
    } catch (error: any) {
      console.error("❌ Menu question generation failed:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Internal server error during question generation",
        });
      }
    }
  };

  /**
   * Generate procedure-focused questions from SOP content
   */
  generateSopQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sopContent, title, focusArea, questionCount, bankId } =
        req.body as GenerateSopQuestionsRequest;

      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        throw new AppError("Restaurant ID is required", 400);
      }

      console.log(
        `📋 [CleanQuestionController] Starting SOP question generation:`,
        {
          title,
          focusArea,
          questionCount,
          bankId,
          contentLength: sopContent?.length || 0,
        }
      );

      // Validate inputs
      this.validateSopQuestionRequest({
        sopContent,
        title,
        focusArea,
        questionCount,
        bankId,
      });

      // Fetch and validate question bank
      const questionBank = await QuestionBankModel.findOne({
        _id: bankId,
        restaurantId,
      });
      if (!questionBank) {
        throw new AppError(`Question bank not found: ${bankId}`, 404);
      }

      // Generate questions
      const request: SopQuestionRequest = {
        sopContent,
        title,
        focusArea,
        questionCount,
      };

      const result = await this.questionService.generateSopQuestions(request);

      if (!result.success) {
        throw new AppError(
          `SOP question generation failed: ${result.errors.join(", ")}`,
          500
        );
      }

      console.log(
        `✅ Generated ${result.questions.length} valid SOP questions`
      );

      // Save questions to database
      const savedQuestions = await this.saveQuestionsToDatabase(
        result.questions,
        restaurantId,
        bankId,
        ["procedures"] // SOP questions go into procedures category
      );

      res.json({
        success: true,
        data: {
          questions: savedQuestions,
          errors: result.errors,
          processing: {
            questionsGenerated: result.questions.length,
            questionsSaved: savedQuestions.length,
            focusArea,
            sopTitle: title,
            questionBank: {
              id: questionBank._id,
              name: questionBank.name,
            },
          },
        },
      });
    } catch (error: any) {
      console.error("❌ SOP question generation failed:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Internal server error during SOP question generation",
        });
      }
    }
  };

  /**
   * Validate menu question generation request
   */
  private validateMenuQuestionRequest(
    request: Partial<GenerateMenuQuestionsRequest>
  ): void {
    if (!request.menuId || !mongoose.Types.ObjectId.isValid(request.menuId)) {
      throw new AppError("Valid menu ID is required", 400);
    }

    if (!request.bankId || !mongoose.Types.ObjectId.isValid(request.bankId)) {
      throw new AppError("Valid question bank ID is required", 400);
    }

    if (!request.focusArea) {
      throw new AppError("Focus area is required", 400);
    }

    const validFocusAreas = [
      "ingredients",
      "allergens",
      "wine_knowledge",
      "preparation",
      "service_knowledge",
      "safety_protocols",
    ];
    if (!validFocusAreas.includes(request.focusArea)) {
      throw new AppError(
        `Invalid focus area. Must be one of: ${validFocusAreas.join(", ")}`,
        400
      );
    }

    if (
      !request.questionCount ||
      request.questionCount < 1 ||
      request.questionCount > 50
    ) {
      throw new AppError("Question count must be between 1 and 50", 400);
    }
  }

  /**
   * Validate SOP question generation request
   */
  private validateSopQuestionRequest(
    request: Partial<GenerateSopQuestionsRequest>
  ): void {
    if (!request.sopContent || request.sopContent.trim().length < 100) {
      throw new AppError("SOP content must be at least 100 characters", 400);
    }

    if (!request.title || request.title.trim().length < 3) {
      throw new AppError("SOP title is required (minimum 3 characters)", 400);
    }

    if (!request.bankId || !mongoose.Types.ObjectId.isValid(request.bankId)) {
      throw new AppError("Valid question bank ID is required", 400);
    }

    if (!request.focusArea) {
      throw new AppError("Focus area is required", 400);
    }

    const validFocusAreas = [
      "safety",
      "procedures",
      "customer_service",
      "compliance",
    ];
    if (!validFocusAreas.includes(request.focusArea)) {
      throw new AppError(
        `Invalid focus area. Must be one of: ${validFocusAreas.join(", ")}`,
        400
      );
    }

    if (
      !request.questionCount ||
      request.questionCount < 1 ||
      request.questionCount > 30
    ) {
      throw new AppError("Question count must be between 1 and 30", 400);
    }
  }

  /**
   * Save generated questions to database with proper categorization
   */
  private async saveQuestionsToDatabase(
    generatedQuestions: any[],
    restaurantId: mongoose.Types.ObjectId,
    bankId: string,
    menuCategories: string[]
  ): Promise<any[]> {
    const savedQuestions = [];

    for (const genQuestion of generatedQuestions) {
      try {
        const question = new QuestionModel({
          questionText: genQuestion.questionText,
          questionType: genQuestion.questionType,
          options: genQuestion.options.map((opt: any) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            _id: new mongoose.Types.ObjectId(),
          })),
          categories: menuCategories.length > 0 ? menuCategories : ["general"],
          restaurantId,
          questionBankId: bankId,
          createdBy: "ai",
          status: "pending_review", // New questions require review
          explanation: genQuestion.explanation,
          knowledgeCategory: genQuestion.knowledgeCategory,
          knowledgeCategoryAssignedBy: "ai",
          knowledgeCategoryAssignedAt: new Date(),
        });

        const saved = await question.save();
        savedQuestions.push({
          _id: saved._id,
          questionText: saved.questionText,
          questionType: saved.questionType,
          options: saved.options,
          knowledgeCategory: saved.knowledgeCategory,
          difficulty: genQuestion.difficulty,
          realWorldContext: genQuestion.realWorldContext,
          explanation: saved.explanation,
          status: saved.status,
          createdAt: saved.createdAt,
        });
      } catch (error: any) {
        console.error(
          `❌ Failed to save question: ${genQuestion.questionText}`,
          error
        );
        // Continue with other questions rather than failing completely
      }
    }

    console.log(
      `💾 Saved ${savedQuestions.length}/${generatedQuestions.length} questions to database`
    );
    return savedQuestions;
  }
}

// Export controller instance
export const cleanQuestionController = new CleanQuestionController();
