import mongoose from "mongoose";
// import axios from "axios"; // Removed unused import
import QuestionModel, {
  IQuestion,
  // IOption, // Removed unused IOption import
  QuestionType,
  KnowledgeCategory,
} from "../models/QuestionModel";
import QuestionBankModel from "../models/QuestionBankModel";
import { AppError } from "../utils/errorHandler";
import MenuItemModel, { IMenuItem } from "../models/MenuItemModel";
import MenuModel, { IMenu } from "../models/MenuModel";
import LegacyAiQuestionService, {
  RawAiGeneratedQuestion,
} from "./LegacyAiQuestionService";
import {
  CleanAiQuestionService,
  MenuItem,
  QuestionGenerationRequest,
} from "./CleanAiQuestionService";

import { KnowledgeAnalyticsService } from "./knowledgeAnalyticsService";

// Interface for the data needed to create a new question
export interface NewQuestionData {
  questionText: string;
  questionType: QuestionType;
  options: Array<{
    text: string;
    isCorrect: boolean;
    _id?: mongoose.Types.ObjectId;
  }>;
  categories: string[];
  restaurantId: mongoose.Types.ObjectId;
  createdBy: "ai" | "manual";
  difficulty?: "easy" | "medium" | "hard";
  questionBankId: mongoose.Types.ObjectId;

  // Knowledge Analytics fields
  knowledgeCategory?: string;
  knowledgeSubcategories?: string[];
  knowledgeCategoryAssignedBy?: "manual" | "ai" | "restaurant_edit";
  knowledgeCategoryAssignedAt?: Date;
}

// Interface for the data allowed when updating an existing question
export interface UpdateQuestionData {
  questionText?: string;
  questionType?: QuestionType;
  options?: Array<{
    text: string;
    isCorrect: boolean;
    _id?: mongoose.Types.ObjectId;
  }>;
  categories?: string[];
  difficulty?: "easy" | "medium" | "hard";
  explanation?: string;

  // Knowledge Analytics fields
  knowledgeCategory?: string;
  knowledgeSubcategories?: string[];
}

export const createQuestionService = async (
  data: NewQuestionData
): Promise<IQuestion> => {
  try {
    // Validate options based on questionType (Basic validation)
    if (data.questionType === "multiple-choice-single") {
      if (!data.options || data.options.length < 2) {
        throw new AppError(
          "Multiple choice questions require at least 2 options.",
          400
        );
      }
      const correctAnswers = data.options.filter((opt) => opt.isCorrect);
      if (correctAnswers.length !== 1) {
        throw new AppError(
          "Multiple choice (single) questions must have exactly 1 correct answer.",
          400
        );
      }
    } else if (data.questionType === "multiple-choice-multiple") {
      if (!data.options || data.options.length < 2) {
        throw new AppError(
          "Multiple choice questions require at least 2 options.",
          400
        );
      }
      const correctAnswers = data.options.filter((opt) => opt.isCorrect);
      if (correctAnswers.length < 1) {
        throw new AppError(
          "Multiple choice (multiple) questions must have at least 1 correct answer.",
          400
        );
      }
    } else if (data.questionType === "true-false") {
      if (!data.options || data.options.length !== 2) {
        throw new AppError(
          "True/False questions must have exactly 2 options.",
          400
        );
      }
      const correctAnswers = data.options.filter((opt) => opt.isCorrect);
      if (correctAnswers.length !== 1) {
        throw new AppError(
          "True/False questions must have exactly 1 correct answer.",
          400
        );
      }
    }

    // Ensure required fields are always present with defaults
    const questionDataWithDefaults = {
      ...data,
      knowledgeCategory:
        data.knowledgeCategory || KnowledgeCategory.FOOD_KNOWLEDGE, // Default category
      knowledgeCategoryAssignedBy:
        data.knowledgeCategoryAssignedBy || data.createdBy, // Use createdBy as default
      knowledgeCategoryAssignedAt:
        data.knowledgeCategoryAssignedAt || new Date(),
    };

    const newQuestion = new QuestionModel(questionDataWithDefaults);
    const savedQuestion = await newQuestion.save();

    // CRITICAL FIX: Add the question to the specified question bank
    if (data.questionBankId) {
      // Import addQuestionToBankService dynamically to avoid circular dependencies
      const { addQuestionToBankService } = await import(
        "./questionBankService"
      );

      try {
        await addQuestionToBankService(
          data.questionBankId.toString(),
          data.restaurantId,
          savedQuestion._id.toString()
        );
      } catch (bankError) {
        console.error(`Failed to add question to bank:`, bankError);
        // Don't throw here - question was created successfully, bank linking failed
        // Log the error but return the created question
      }
    }

    // Invalidate analytics cache since a new question affects question distribution
    await KnowledgeAnalyticsService.invalidateAnalyticsCache(data.restaurantId);

    return savedQuestion;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      throw new AppError(`Validation Error: ${messages.join(", ")}`, 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error creating question in service:", error);
    throw new AppError("Failed to create question.", 500);
  }
};

export const getQuestionByIdService = async (
  questionId: string,
  restaurantId: mongoose.Types.ObjectId
): Promise<IQuestion | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }
    const question = await QuestionModel.findOne({
      _id: questionId,
      restaurantId: restaurantId,
      isActive: true,
    });
    return question;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error fetching question by ID in service:", error);
    throw new AppError("Failed to fetch question by ID.", 500);
  }
};

export const getAllQuestionsService = async (
  restaurantId: mongoose.Types.ObjectId,
  queryParams?: { isActive?: boolean }
): Promise<IQuestion[]> => {
  try {
    const filter: any = { restaurantId: restaurantId };
    if (queryParams && typeof queryParams.isActive === "boolean") {
      filter.isActive = queryParams.isActive;
    } else {
      filter.isActive = true;
    }
    const questions = await QuestionModel.find(filter);
    return questions;
  } catch (error) {
    console.error(
      "Error fetching all questions for restaurant in service:",
      error
    );
    throw new AppError("Failed to fetch questions for this restaurant.", 500);
  }
};

export const updateQuestionService = async (
  questionId: string,
  restaurantId: mongoose.Types.ObjectId,
  data: UpdateQuestionData
): Promise<IQuestion | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }

    const existingQuestion = await QuestionModel.findOne({
      _id: questionId,
      restaurantId,
    });

    if (!existingQuestion) {
      throw new AppError(
        `Question not found with ID: ${questionId} for this restaurant.`,
        404
      );
    }

    // Check if knowledge category is being updated
    const isKnowledgeCategoryUpdated =
      data.knowledgeCategory &&
      data.knowledgeCategory !== existingQuestion.knowledgeCategory;

    // Determine the question type to use for option validation
    let typeForValidation: QuestionType = existingQuestion.questionType;
    if (
      data.questionType &&
      data.questionType !== existingQuestion.questionType
    ) {
      typeForValidation = data.questionType;
      // If question type is changing, options MUST be provided and valid for the new type.
      if (!data.options) {
        throw new AppError(
          "Options must be provided when changing the question type.",
          400
        );
      }
    }

    // Validate options if they are being updated or if type is changing (which requires options)
    if (data.options) {
      // Use typeForValidation for all option checks
      if (typeForValidation === "true-false" && data.options.length !== 2) {
        throw new AppError(
          "True/False questions must have exactly 2 options.",
          400
        );
      }
      if (
        (typeForValidation === "multiple-choice-single" ||
          typeForValidation === "multiple-choice-multiple") &&
        (data.options.length < 2 || data.options.length > 6)
      ) {
        throw new AppError(
          "Multiple choice questions must have between 2 and 6 options.",
          400
        );
      }

      const correctOptionsCount = data.options.filter(
        (opt) => opt.isCorrect
      ).length;

      if (
        typeForValidation === "multiple-choice-single" ||
        typeForValidation === "true-false"
      ) {
        if (correctOptionsCount !== 1) {
          throw new AppError(
            "Single-answer multiple choice and True/False questions must have exactly one correct option.",
            400
          );
        }
      } else if (typeForValidation === "multiple-choice-multiple") {
        if (correctOptionsCount < 1) {
          throw new AppError(
            "Multiple-answer multiple choice questions must have at least one correct option.",
            400
          );
        }
      }
    } else if (
      data.questionType &&
      data.questionType !== existingQuestion.questionType
    ) {
      // This case is already handled above by throwing an error if options are not provided when type changes.
      // This explicit check is redundant if the above logic is correct, but kept for clarity during dev.
      throw new AppError(
        "Internal Server Error: Options should have been validated if question type changed.",
        500
      );
    }

    // If we reach here, data is considered valid for update
    const updatedQuestion = await QuestionModel.findOneAndUpdate(
      { _id: questionId, restaurantId: restaurantId }, // Ensure ownership
      { $set: data }, // This will update all fields in data, including questionType if present
      { new: true, runValidators: true } // Return new doc, run schema validators
    );

    // findOneAndUpdate returns null if no document matched the query.
    // We already checked for existingQuestion, so this implies an issue with the update itself if null.
    if (!updatedQuestion) {
      throw new AppError(
        `Question update failed for ID: ${questionId}. The document might have been deleted or an unknown issue occurred.`,
        404 // Or 500, depending on expected cause
      );
    }

    // Invalidate analytics cache if knowledge category was updated
    if (isKnowledgeCategoryUpdated) {
      console.log(
        `[Question Update] Knowledge category changed for question ${questionId}, invalidating analytics cache`
      );
      await KnowledgeAnalyticsService.invalidateAnalyticsCache(restaurantId);
    }

    return updatedQuestion;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      throw new AppError(`Validation Error: ${messages.join(", ")}`, 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating question in service:", error);
    throw new AppError(
      "Failed to update question due to an unexpected error.",
      500
    );
  }
};

export const deleteQuestionService = async (
  questionId: string,
  restaurantId: mongoose.Types.ObjectId
): Promise<boolean> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }

    const existingQuestion = await QuestionModel.findOne({
      _id: questionId,
      restaurantId: restaurantId,
    });

    if (!existingQuestion) {
      throw new AppError(
        `Question not found with ID: ${questionId} for this restaurant.`,
        404
      );
    }

    // Soft delete by setting isActive to false
    const deletedQuestion = await QuestionModel.findOneAndUpdate(
      { _id: questionId, restaurantId: restaurantId },
      { $set: { isActive: false } }, // Soft delete
      { new: true }
    );

    if (!deletedQuestion) {
      return false; // Deletion failed
    }

    // Invalidate analytics cache since question deletion affects question distribution
    console.log(
      `[Question Delete] Question deleted, invalidating analytics cache`
    );
    await KnowledgeAnalyticsService.invalidateAnalyticsCache(restaurantId);

    return true; // Deletion successful
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error deleting question in service:", error);
    throw new AppError("Failed to delete question.", 500);
  }
};

// New AiGenerationParams to align with client and new logic
export interface AiGenerationParams {
  restaurantId: mongoose.Types.ObjectId;
  menuId: string;
  bankId: string;
  itemIds?: string[]; // Optional: specific menu items to focus on
  categoriesToFocus?: string[]; // Optional: specific categories from the menu to focus on
  numQuestionsPerItem?: number; // Optional: number of questions to generate per item/category
  // geminiModelName?: string; // Keep if used by actual AI call
}

interface AiGeneratedQuestionContent {
  // Renamed from AiGeneratedQuestion to avoid conflict if IQuestion uses it
  questionText: string;
  questionType: QuestionType;
  options: Array<{ text: string; isCorrect: boolean }>;
  category: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
}

// Placeholder for MenuModel and MenuItem, replace with actual imports and interfaces
interface IMenuItemSubDocument {
  // Assuming menu items might be subdocuments or populated
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category?: string; // Category of the menu item itself
  // other relevant fields for AI context
}

interface IMenuDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  items: mongoose.Types.ObjectId[] | IMenuItemSubDocument[]; // Or just IMenuItemSubDocument[] if always populated
  // other fields
}

export const generateAiQuestionsService = async (
  params: AiGenerationParams
): Promise<IQuestion[]> => {
  console.log("[SimpleAI] Starting question generation with params:", {
    restaurantId: params.restaurantId,
    menuId: params.menuId,
    bankId: params.bankId,
    categoriesToFocus: params.categoriesToFocus,
    numQuestionsPerItem: params.numQuestionsPerItem,
  });

  try {
    const {
      restaurantId,
      menuId,
      bankId,
      itemIds,
      categoriesToFocus,
      numQuestionsPerItem = 2,
    } = params;

    // 1. Fetch the Question Bank
    const questionBank = await QuestionBankModel.findOne({
      _id: bankId,
      restaurantId,
    });
    if (!questionBank) {
      throw new AppError(
        `Question Bank with ID ${bankId} not found for this restaurant.`,
        404
      );
    }

    // 2. Fetch the Menu
    const menu = await MenuModel.findOne({
      _id: menuId,
      restaurantId,
    });
    if (!menu) {
      throw new AppError(
        `Menu with ID ${menuId} not found for this restaurant.`,
        404
      );
    }

    console.log(`[SimpleAI] Using menu: ${menu.name}`);

    // 3. Fetch menu items (simplified)
    let menuItemsToProcess: IMenuItem[] = [];

    if (itemIds && itemIds.length > 0) {
      menuItemsToProcess = await MenuItemModel.find({
        _id: { $in: itemIds },
        restaurantId,
        isActive: true,
      });
    } else if (categoriesToFocus && categoriesToFocus.length > 0) {
      menuItemsToProcess = await MenuItemModel.find({
        menuId: menuId,
        restaurantId,
        category: { $in: categoriesToFocus },
        isActive: true,
      });
    } else {
      menuItemsToProcess = await MenuItemModel.find({
        menuId: menuId,
        restaurantId,
        isActive: true,
      });
    }

    if (menuItemsToProcess.length === 0) {
      console.log("[SimpleAI] No items found matching criteria");
      return [];
    }

    console.log(
      `[SimpleAI] Processing ${menuItemsToProcess.length} menu items`
    );

    // 4. Convert to clean format for new service
    const menuItems: MenuItem[] = menuItemsToProcess.map((item) => ({
      name: item.name,
      description: item.description || undefined,
      category: item.category,
      itemType:
        item.itemType === "beverage"
          ? "beverage"
          : item.category.toLowerCase().includes("wine")
          ? "wine"
          : "food",
      ingredients: item.ingredients || undefined,
      allergens: item.allergens || undefined,
      price: item.price || undefined,
    }));

    // 5. Generate questions with clean service
    const cleanService = new CleanAiQuestionService();
    const allGeneratedQuestions: any[] = [];
    const categoriesToProcess = categoriesToFocus || [
      ...new Set(menuItems.map((item) => item.category)),
    ];

    for (const category of categoriesToProcess) {
      const categoryItems = menuItems.filter(
        (item) => item.category === category
      );
      if (categoryItems.length === 0) continue;

      const oldFocusArea = determineFocusArea(category);
      // Map old focus areas to new clean service focus areas
      const focusArea:
        | "ingredients"
        | "allergens"
        | "wine_knowledge"
        | "preparation"
        | "service_knowledge"
        | "safety_protocols" =
        oldFocusArea === "wine"
          ? "wine_knowledge"
          : oldFocusArea === "allergens"
          ? "allergens"
          : oldFocusArea === "preparation"
          ? "preparation"
          : "ingredients";

      const questionCount = categoryItems.length * numQuestionsPerItem;

      console.log(
        `[CleanAI] Generating ${questionCount} questions for category: ${category} (focus: ${focusArea})`
      );

      const request: QuestionGenerationRequest = {
        menuItems: categoryItems,
        focusArea,
        questionCount,
      };

      const result = await cleanService.generateMenuQuestions(request);

      if (result.success) {
        // Convert to legacy format for compatibility
        const legacyQuestions = result.questions.map((q) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          category: category,
          explanation: q.explanation,
          focus: focusArea,
        }));
        allGeneratedQuestions.push(...legacyQuestions);
      } else {
        console.warn(
          `[CleanAI] Failed to generate questions for category ${category}:`,
          result.errors
        );
      }
    }

    console.log(
      `[SimpleAI] Generated ${allGeneratedQuestions.length} total questions`
    );

    if (allGeneratedQuestions.length === 0) {
      return [];
    }

    // 6. Save questions to database (reuse existing save logic)
    const savedQuestions: IQuestion[] =
      await LegacyAiQuestionService.saveGeneratedQuestionsAsPendingReview(
        allGeneratedQuestions,
        restaurantId.toString(),
        bankId,
        {
          menuCategories: categoriesToProcess,
          existingCategories: questionBank.categories || [],
        }
      );

    console.log(
      `[SimpleAI] Successfully saved ${savedQuestions.length} questions as pending review`
    );

    // 7. Update quiz snapshots asynchronously (don't await to avoid blocking the response)
    setImmediate(async () => {
      try {
        const { QuizService } = await import("./quizService");
        await QuizService.updateQuizSnapshotsForQuestionBanks(
          [new mongoose.Types.ObjectId(bankId)],
          restaurantId
        );
      } catch (error) {
        console.error(
          "Failed to update quiz snapshots after AI question generation:",
          error
        );
      }
    });

    return savedQuestions;
  } catch (error) {
    console.error("Error in simplified AI question generation:", error);
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(
        `Validation Error during question creation: ${error.message}`,
        400
      );
    }
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    throw new AppError(
      "Failed to generate AI questions with simplified service.",
      500
    );
  }
};

// New service to get multiple questions by their IDs
export const getQuestionsByIdsService = async (
  questionIds: mongoose.Types.ObjectId[],
  restaurantId: mongoose.Types.ObjectId
): Promise<IQuestion[]> => {
  if (!questionIds || questionIds.length === 0) {
    return [];
  }

  try {
    const questions = await QuestionModel.find({
      _id: { $in: questionIds },
      restaurantId: restaurantId,
      isActive: true, // Ensure questions are active
    });
    return questions;
  } catch (error) {
    console.error("Error fetching questions by IDs in service:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to fetch questions by IDs.", 500);
  }
};

// Helper functions for the simplified AI service
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

// Simple wine info extraction helper
function extractWineInfo(
  text: string,
  type: "grape" | "region" | "vintage" | "producer"
): string | undefined {
  if (!text) return undefined;

  const lowerText = text.toLowerCase();

  // Basic patterns for wine info extraction
  switch (type) {
    case "vintage":
      const yearMatch = text.match(/\b(19|20)\d{2}\b/);
      return yearMatch ? yearMatch[0] : undefined;

    case "grape":
      const grapes = [
        "chardonnay",
        "pinot noir",
        "cabernet",
        "merlot",
        "sauvignon",
        "riesling",
        "syrah",
        "nebbiolo",
      ];
      for (const grape of grapes) {
        if (lowerText.includes(grape)) return grape;
      }
      return undefined;

    case "region":
      const regions = [
        "napa",
        "sonoma",
        "bordeaux",
        "burgundy",
        "tuscany",
        "piedmont",
        "barolo",
        "chianti",
      ];
      for (const region of regions) {
        if (lowerText.includes(region)) return region;
      }
      return undefined;

    case "producer":
      // Simple producer extraction - look for capitalized words that might be producers
      const producerMatch = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/);
      return producerMatch ? producerMatch[0] : undefined;

    default:
      return undefined;
  }
}
