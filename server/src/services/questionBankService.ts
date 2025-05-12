import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import QuestionModel, { IQuestion } from "../models/QuestionModel";
import MenuItemModel, { IMenuItem } from "../models/MenuItem";
import {
  generateAiQuestionsService,
  AiGenerationParams,
} from "./questionService";
import { AppError } from "../utils/errorHandler";
import mongoose from "mongoose";

// Define an interface for the data expected by createQuestionBankService
// This should align with what the controller will pass from req.body
export interface CreateQuestionBankData {
  name: string;
  description?: string;
  categories?: string[]; // Made categories optional
  // targetQuestionCount?: number; // Removed targetQuestionCount, not relevant for bank creation
  restaurantId: mongoose.Types.ObjectId; // Assuming restaurantId will be passed by controller
}

// Define an interface for the data expected by updateQuestionBankService
export interface UpdateQuestionBankData {
  name?: string;
  description?: string;
  // categories and questions will be handled by separate dedicated functions usually
}

// Interface for the data needed for creating a question bank from a menu
export interface CreateQuestionBankFromMenuData {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  menuId: mongoose.Types.ObjectId;
  selectedCategoryNames: string[]; // Categories from the menu to associate with the bank
  generateAiQuestions?: boolean; // Flag to trigger AI question generation
  aiParams?: Omit<
    AiGenerationParams,
    "restaurantId" | "categories" | "menuContext"
  >; // AI parameters like targetQuestionCount, geminiModelName
}

// Placeholder for createQuestionBankService
export const createQuestionBankService = async (
  data: CreateQuestionBankData
): Promise<IQuestionBank> => {
  try {
    const newQuestionBank = new QuestionBankModel({
      ...data,
      // questions will be empty by default on creation
      // restaurantId is already in data
    });
    await newQuestionBank.save();
    return newQuestionBank;
  } catch (error) {
    // Log the error for server-side visibility
    console.error("Error creating question bank in service:", error);
    // It's good practice to throw a more specific error or handle it
    // For now, rethrowing or throwing an AppError if it's a known validation error etc.
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(`Validation Error: ${error.message}`, 400);
    }
    throw new AppError("Failed to create question bank in service.", 500);
  }
};

// Placeholder for getAllQuestionBanksService
export const getAllQuestionBanksService = async (
  restaurantId: mongoose.Types.ObjectId
): Promise<IQuestionBank[]> => {
  try {
    const banks = await QuestionBankModel.find({ restaurantId });
    return banks;
  } catch (error) {
    console.error("Error fetching all question banks in service:", error);
    throw new AppError(
      "Failed to fetch question banks for this restaurant.",
      500
    );
  }
};

// Placeholder for getQuestionBankByIdService
export const getQuestionBankByIdService = async (
  bankId: string,
  restaurantId: mongoose.Types.ObjectId
): Promise<IQuestionBank | null> => {
  try {
    // Ensure bankId is a valid ObjectId before querying if not already handled by controller
    // However, controller should ideally validate this.
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      // Or throw an AppError, or return null based on desired handling
      console.warn(`Invalid bankId format in service: ${bankId}`);
      return null;
    }

    const bank = await QuestionBankModel.findOne({
      _id: bankId,
      restaurantId: restaurantId,
    }).populate("questions");
    return bank; // This will be null if not found
  } catch (error) {
    console.error("Error fetching question bank by ID in service:", error);
    // Depending on how you want to handle errors, you might throw an AppError
    // or let the controller decide based on a null return.
    // For now, rethrowing a generic error. Controller should catch and respond.
    throw new AppError(
      "Failed to fetch question bank by ID from service.",
      500
    );
  }
};

// Placeholder for updateQuestionBankService
export const updateQuestionBankService = async (
  bankId: string,
  restaurantId: mongoose.Types.ObjectId,
  data: UpdateQuestionBankData
): Promise<IQuestionBank | null> => {
  try {
    // Controller should have already validated bankId format
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      console.warn(`Invalid bankId format in service for update: ${bankId}`);
      return null; // Or throw AppError
    }

    const updatedBank = await QuestionBankModel.findOneAndUpdate(
      { _id: bankId, restaurantId: restaurantId }, // Query to find the document
      { $set: data }, // The update operations to apply
      { new: true, runValidators: true } // Options: return updated doc, run schema validators
    );

    return updatedBank; // Will be null if no document matched the query
  } catch (error) {
    console.error("Error updating question bank in service:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(`Validation Error: ${error.message}`, 400);
    }
    // Consider if other specific Mongoose errors should be handled differently
    throw new AppError("Failed to update question bank in service.", 500);
  }
};

// Placeholder for deleteQuestionBankService
export const deleteQuestionBankService = async (
  bankId: string,
  restaurantId: mongoose.Types.ObjectId
): Promise<boolean> => {
  try {
    // Controller should have validated bankId format
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      console.warn(`Invalid bankId format in service for delete: ${bankId}`);
      return false; // Or throw AppError
    }

    const result = await QuestionBankModel.findOneAndDelete({
      _id: bankId,
      restaurantId: restaurantId,
    });

    return !!result; // Returns true if a document was found and deleted, false otherwise
  } catch (error) {
    console.error("Error deleting question bank in service:", error);
    // Depending on error handling strategy, you might want to throw an AppError
    // For now, just rethrowing a generic one so controller can catch it.
    throw new AppError("Failed to delete question bank in service.", 500);
  }
};

// Service to add an existing question (by ID) to a specific question bank
export const addQuestionToBankService = async (
  bankId: string,
  restaurantId: mongoose.Types.ObjectId,
  questionId: string // Assuming questionId comes as string from controller
): Promise<IQuestionBank | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw new AppError(`Invalid bank ID format: ${bankId}`, 400);
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }

    // 1. Verify the question exists and belongs to the restaurant
    const question = await QuestionModel.findOne({
      _id: questionId,
      restaurantId,
    });
    if (!question) {
      throw new AppError(
        `Question with ID: ${questionId} not found or does not belong to this restaurant.`,
        404
      );
    }

    // 2. Find the question bank
    const bank = await QuestionBankModel.findById(bankId);
    if (!bank) {
      throw new AppError(`Question bank not found with ID: ${bankId}.`, 404);
    }

    // 3. Check if bank belongs to the same restaurant (additional safeguard)
    if (!bank.restaurantId.equals(restaurantId)) {
      throw new AppError(
        `Question bank with ID: ${bankId} does not belong to this restaurant.`,
        403
      );
    }

    // 4. Check if question is already in the bank
    // The questions array stores ObjectIds. new Types.ObjectId(questionId) ensures comparison of ObjectId instances.
    if (
      bank.questions.find((qId) =>
        qId.equals(new mongoose.Types.ObjectId(questionId))
      )
    ) {
      // Question already exists, return current bank or throw specific error
      // For now, let's consider this a no-op and return the bank
      // Or throw: new AppError(`Question with ID: ${questionId} already exists in this bank.`, 409);
      return bank;
    }

    // 5. Add questionId to the bank
    bank.questions.push(new mongoose.Types.ObjectId(questionId));

    await bank.save();
    return bank;
  } catch (error) {
    console.error("Error adding question ID to bank in service:", error);
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(`Validation Error: ${error.message}`, 400);
    }
    throw new AppError("Failed to add question to bank.", 500);
  }
};

// Service to remove a question (by ID) from a specific question bank
export const removeQuestionFromBankService = async (
  bankId: string,
  restaurantId: mongoose.Types.ObjectId,
  questionId: string // Assuming questionId comes as string from controller
): Promise<IQuestionBank | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw new AppError(`Invalid bank ID format: ${bankId}`, 400);
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }

    const objectQuestionId = new mongoose.Types.ObjectId(questionId);

    // Find the bank and ensure it belongs to the restaurant, then update it
    // Using findOneAndUpdate with $pull operator ensures atomicity for the find and update part.
    const updatedBank = await QuestionBankModel.findOneAndUpdate(
      { _id: bankId, restaurantId: restaurantId }, // Query to find the correct bank
      { $pull: { questions: objectQuestionId } }, // Operation to remove the questionId from the array
      { new: true } // Options: return the modified document
    );

    if (!updatedBank) {
      // This could mean the bank was not found for that restaurant, or the question was already not in the bank (though $pull wouldn't error).
      // To be more specific, we might need a separate check first if the bank exists.
      // For now, if updatedBank is null, we assume bank not found or not owned.
      throw new AppError(
        `Question bank not found with ID: ${bankId} for this restaurant, or question ${questionId} not in bank.`,
        404
      );
    }

    return updatedBank;
  } catch (error) {
    console.error("Error removing question ID from bank in service:", error);
    if (error instanceof AppError) {
      throw error;
    }
    // No specific mongoose.Error.ValidationError expected for $pull usually unless schema on array itself is violated.
    throw new AppError("Failed to remove question from bank.", 500);
  }
};

export const createQuestionBankFromMenuService = async (
  data: CreateQuestionBankFromMenuData
): Promise<IQuestionBank> => {
  const {
    name,
    description,
    restaurantId,
    menuId,
    selectedCategoryNames,
    generateAiQuestions,
    aiParams,
  } = data;

  if (!name || name.trim() === "") {
    throw new AppError("Question bank name is required.", 400);
  }
  if (!menuId) {
    throw new AppError("Menu ID is required to create a bank from menu.", 400);
  }
  if (!selectedCategoryNames || selectedCategoryNames.length === 0) {
    throw new AppError(
      "At least one menu category must be selected for the question bank.",
      400
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newBank = new QuestionBankModel({
      name,
      description: description || "",
      restaurantId,
      categories: selectedCategoryNames, // Set categories from selected menu categories
      questions: [], // Initialize with no questions
      createdBy: restaurantId, // Assuming the user creating it owns the restaurant
    });

    await newBank.save({ session });

    if (generateAiQuestions && aiParams && aiParams.targetQuestionCount > 0) {
      // 1. Fetch menu items for context based on menuId and selectedCategoryNames
      const menuItemsForContext: IMenuItem[] = await MenuItemModel.find({
        menuId,
        restaurantId, // Ensure items belong to the same restaurant
        category: { $in: selectedCategoryNames }, // Filter by selected categories
      })
        .limit(50) // Limit context size for performance/token limits
        .session(session)
        .lean(); // Use lean for performance as we only need data

      let menuContextString = "";
      if (menuItemsForContext.length > 0) {
        menuContextString = menuItemsForContext
          .map(
            (item) =>
              `Item: ${item.name}, Type: ${item.itemType}, Category: ${
                item.category
              }, Description: ${item.description || "N/A"}, Ingredients: ${
                item.ingredients?.join(", ") || "N/A"
              }`
          )
          .join("\n---\n");
      } else {
        // Fallback if no menu items found for selected categories,
        // use just category names as context.
        menuContextString = `General knowledge questions about: ${selectedCategoryNames.join(
          ", "
        )}`;
      }

      // 2. Call generateAiQuestionsService
      const aiGenParams: AiGenerationParams = {
        restaurantId,
        categories: selectedCategoryNames, // Use the bank's categories for AI generation
        targetQuestionCount: aiParams.targetQuestionCount,
        menuContext: menuContextString,
        geminiModelName: aiParams.geminiModelName, // Optional
      };

      const generatedQuestions = await generateAiQuestionsService(aiGenParams); // This function does not take session

      if (generatedQuestions && generatedQuestions.length > 0) {
        const questionIds = generatedQuestions.map(
          (q) => q._id as mongoose.Types.ObjectId
        ); // Ensure _id is treated as ObjectId
        newBank.questions.push(...questionIds);
        await newBank.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();
    return newBank;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error creating question bank from menu in service:", error);
    throw new AppError("Failed to create question bank from menu.", 500);
  }
};
