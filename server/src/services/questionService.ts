import mongoose from "mongoose";
// import axios from "axios"; // Removed unused import
import QuestionModel, {
  IQuestion,
  // IOption, // Removed unused IOption import
  QuestionType,
} from "../models/QuestionModel";
import QuestionBankModel from "../models/QuestionBankModel";
import { AppError } from "../utils/errorHandler";

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
}

export const createQuestionService = async (
  data: NewQuestionData
): Promise<IQuestion> => {
  try {
    if (data.questionType === "true-false" && data.options.length !== 2) {
      throw new AppError(
        "True/False questions must have exactly 2 options.",
        400
      );
    }
    if (
      (data.questionType === "multiple-choice-single" ||
        data.questionType === "multiple-choice-multiple") &&
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
      data.questionType === "multiple-choice-single" ||
      data.questionType === "true-false"
    ) {
      if (correctOptionsCount !== 1) {
        throw new AppError(
          "Single-answer multiple choice and True/False questions must have exactly one correct option.",
          400
        );
      }
    } else if (data.questionType === "multiple-choice-multiple") {
      if (correctOptionsCount < 1) {
        throw new AppError(
          "Multiple-answer multiple choice questions must have at least one correct option.",
          400
        );
      }
    }
    const newQuestion = new QuestionModel(data);
    await newQuestion.save();
    return newQuestion;
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }
    const objectQuestionId = new mongoose.Types.ObjectId(questionId);
    const deletedQuestion = await QuestionModel.findOneAndDelete(
      { _id: objectQuestionId, restaurantId: restaurantId },
      { session }
    );
    if (!deletedQuestion) {
      await session.abortTransaction();
      session.endSession();
      return false;
    }
    await QuestionBankModel.updateMany(
      { restaurantId: restaurantId },
      { $pull: { questions: objectQuestionId } },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error deleting question in service:", error);
    throw new AppError("Failed to delete question.", 500);
  }
};

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
}

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
  try {
    const {
      restaurantId,
      menuId,
      bankId,
      itemIds,
      categoriesToFocus,
      numQuestionsPerItem = 1, // Default to 1 question per item if not specified
    } = params;

    // 1. Fetch the Question Bank to get its categories
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
    const bankCategories = questionBank.categories || [];

    // 2. Fetch the Menu and its items
    // TODO: Replace with actual MenuModel and populate items if necessary
    // const menu = await MenuModel.findOne({ _id: menuId, restaurantId }).populate('items');
    // For now, using a placeholder for menu and items.
    // Ensure MenuModel is imported and IMenuDocument/IMenuItemSubDocument match your models.

    // Example: Using a placeholder for menu items for now.
    // You'll need to replace this with actual database fetching and type for MenuModel
    const MenuModel = mongoose.model<IMenuDocument>(
      "Menu",
      new mongoose.Schema({
        name: String,
        restaurantId: mongoose.Schema.Types.ObjectId,
        items: [
          new mongoose.Schema({
            name: String,
            description: String,
            category: String,
          }),
        ],
      })
    ); // Define a placeholder MenuModel if not imported

    const menu = await MenuModel.findOne({ _id: menuId, restaurantId })
      // .populate<{ items: IMenuItemSubDocument[] }>("items") // Example of typed populate
      .exec();

    if (!menu) {
      throw new AppError(
        `Menu with ID ${menuId} not found for this restaurant.`,
        404
      );
    }

    let menuItemsToProcess: IMenuItemSubDocument[] = [];
    if (menu.items && menu.items.length > 0) {
      // Ensure items are populated if they are ObjectIds
      // This check handles if 'items' are already populated objects or need population.
      // This is a simplified check; robust population check might be needed.
      if (menu.items[0] instanceof mongoose.Types.ObjectId) {
        // If items are ObjectIds, you'd need to populate them.
        // This example assumes they are either populated or the schema structure is simpler.
        // For a real scenario: await menu.populate('items');
        // menuItemsToProcess = menu.items as IMenuItemSubDocument[]; // after population
        throw new AppError(
          "Menu items are not populated. Implement population for MenuModel.",
          500
        );
      } else {
        menuItemsToProcess = menu.items as IMenuItemSubDocument[];
      }
    }

    // Filter items if itemIds or categoriesToFocus are provided
    if (itemIds && itemIds.length > 0) {
      const selectedItemIds = new Set(itemIds);
      menuItemsToProcess = menuItemsToProcess.filter((item) =>
        selectedItemIds.has(item._id.toString())
      );
    } else if (categoriesToFocus && categoriesToFocus.length > 0) {
      const selectedMenuCategories = new Set(categoriesToFocus);
      menuItemsToProcess = menuItemsToProcess.filter(
        (item) => item.category && selectedMenuCategories.has(item.category)
      );
    }

    if (menuItemsToProcess.length === 0) {
      // No items to process, maybe return empty or throw error
      // For now, returning empty array as no questions can be generated
      return [];
      // Or: throw new AppError("No menu items found matching the criteria for AI generation.", 404);
    }

    const allGeneratedQuestionsData: NewQuestionData[] = [];

    // 3. Iterate through selected menu items and generate questions
    for (const menuItem of menuItemsToProcess) {
      // Prepare context for AI based on menuItem
      // let _aiContext = `Menu Item: ${menuItem.name}. Description: ${ // Removed unused variable declaration
      //   menuItem.description || "N/A"
      // }. Category: ${menuItem.category || "N/A"}.`;

      // Simulate AI Call - Placeholder for actual Gemini API call
      // TODO: Replace this section with your actual AI question generation logic
      // The AI should ideally return: questionText, questionType, options, and its derived category (menuItem.category)
      // For each item, generate 'numQuestionsPerItem' questions
      for (let i = 0; i < numQuestionsPerItem; i++) {
        // --- Placeholder AI Generation Start ---
        const aiGeneratedContent: AiGeneratedQuestionContent = {
          questionText: `What is special about ${menuItem.name}? (Variation ${
            i + 1
          })`,
          questionType: "multiple-choice-single", // Example
          options: [
            { text: "Option A for " + menuItem.name, isCorrect: true },
            { text: "Option B for " + menuItem.name, isCorrect: false },
            { text: "Option C for " + menuItem.name, isCorrect: false },
          ],
          category: menuItem.category || "General", // AI should determine this from context or be told
          difficulty: "medium",
        };
        // --- Placeholder AI Generation End ---

        // Merge categories: menuItem's category + bank's categories
        const combinedCategories = new Set<string>();
        if (menuItem.category) {
          combinedCategories.add(menuItem.category);
        }
        bankCategories.forEach((cat) => combinedCategories.add(cat));

        const questionData: NewQuestionData = {
          questionText: aiGeneratedContent.questionText,
          questionType: aiGeneratedContent.questionType,
          options: aiGeneratedContent.options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })), // Ensure options have _id removed if it's part of AiGeneratedQuestionContent
          categories: Array.from(combinedCategories),
          restaurantId: restaurantId,
          createdBy: "ai",
          difficulty: aiGeneratedContent.difficulty || "medium",
        };
        allGeneratedQuestionsData.push(questionData);
      }
    }

    // 4. Bulk create questions
    if (allGeneratedQuestionsData.length === 0) {
      return []; // Or throw error if no questions could be formed
    }

    const createdQuestions = await QuestionModel.insertMany(
      allGeneratedQuestionsData
    );
    return createdQuestions as unknown as IQuestion[]; // Asserting the type via unknown
  } catch (error) {
    console.error("Error in generateAiQuestionsService:", error);
    if (error instanceof AppError) {
      throw error;
    }
    // Check for Mongoose validation error specifically for insertMany, if applicable
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(
        `Validation Error during question creation: ${error.message}`,
        400
      );
    }
    throw new AppError("Failed to generate AI questions.", 500);
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
