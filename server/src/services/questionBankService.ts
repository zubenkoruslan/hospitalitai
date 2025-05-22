import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import QuestionModel from "../models/QuestionModel";
// import MenuItemModel, { IMenuItem } from "../models/MenuItem"; // This line should be removed
// import { // This block should be removed
//   generateAiQuestionsService,
//   AiGenerationParams,
// } from "./questionService";
import { AppError } from "../utils/errorHandler";
import mongoose from "mongoose";
import MenuModel from "../models/MenuModel"; // Import MenuModel

// Define an interface for the data expected by createQuestionBankService
// This should align with what the controller will pass from req.body
export interface CreateQuestionBankData {
  name: string;
  description?: string;
  categories?: string[]; // Made categories optional
  targetQuestionCount?: number; // Added targetQuestionCount
  restaurantId: mongoose.Types.ObjectId; // Assuming restaurantId will be passed by controller
}

// Define an interface for the data expected by updateQuestionBankService
export interface UpdateQuestionBankData {
  name?: string;
  description?: string;
  targetQuestionCount?: number; // Added targetQuestionCount
  // categories and questions will be handled by separate dedicated functions usually
}

interface MenuSpecificAiParams {
  targetQuestionCount?: number; // This is what the client sends for "create bank from menu"
  geminiModelName?: string; // If client sends this
}

// Interface for the data needed for creating a question bank from a menu
export interface CreateQuestionBankFromMenuData {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  menuId: mongoose.Types.ObjectId;
  selectedCategoryNames: string[]; // Categories from the menu to associate with the bank
  generateAiQuestions?: boolean; // Flag to trigger AI question generation
  aiParams?: MenuSpecificAiParams; // Use the new specific interface
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

    // data will now include targetQuestionCount if provided by controller
    const updatedBank = await QuestionBankModel.findOneAndUpdate(
      { _id: bankId, restaurantId: restaurantId },
      { $set: data },
      { new: true, runValidators: true }
    );

    return updatedBank;
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

    // 2. Find the question bank and ensure it belongs to the restaurant
    const bank = await QuestionBankModel.findOne({
      _id: bankId,
      restaurantId: restaurantId,
    });
    if (!bank) {
      throw new AppError(
        `Question bank not found with ID: ${bankId} for this restaurant.`,
        404
      );
    }

    // 4. Check if question is already in the bank
    const objectQuestionId = new mongoose.Types.ObjectId(questionId);
    if (bank.questions.find((qId) => qId.equals(objectQuestionId))) {
      // Question already exists, return current bank (idempotent behavior for POST), populated.
      return bank.populate("questions");
    }

    // 5. Add questionId to the bank
    bank.questions.push(objectQuestionId);

    await bank.save();
    return bank.populate("questions"); // Populate questions before returning
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
    ).populate("questions"); // Populate questions to return the updated list

    if (!updatedBank) {
      // This implies bank not found for that restaurant.
      throw new AppError(
        `Question bank not found with ID: ${bankId} for this restaurant.`,
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
    generateAiQuestions: _generateAiQuestions, // Renamed to avoid conflict
    aiParams: _aiParams, // Renamed to avoid conflict
  } = data;

  // Validate basic inputs
  if (!name || name.trim() === "") {
    throw new AppError("Question bank name is required.", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(menuId)) {
    throw new AppError("Invalid Menu ID format.", 400);
  }

  // === BEGIN ADDED VALIDATION ===
  const menu = await MenuModel.findOne({
    _id: menuId,
    restaurantId: restaurantId,
    isActive: true,
  }).lean();

  if (!menu) {
    throw new AppError(
      `Active menu with ID ${menuId} not found for restaurant ${restaurantId}. Cannot create question bank.`,
      404
    );
  }
  // === END ADDED VALIDATION ===

  const useTransactions = process.env.NODE_ENV !== "development"; // Example condition
  let session: mongoose.ClientSession | null = null;

  if (useTransactions) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const newBank = new QuestionBankModel({
      name,
      description: description || "",
      restaurantId,
      categories: selectedCategoryNames, // Set categories from selected menu categories
      questions: [], // Initialize with no questions
      createdBy: restaurantId, // Assuming the user creating it owns the restaurant
    });

    await newBank.save(session ? { session } : undefined); // Pass session only if it exists

    /*
    // Temporarily commented out AI Question Generation
    if (
      generateAiQuestions &&
      aiParams &&
      aiParams.targetQuestionCount &&
      aiParams.targetQuestionCount > 0
    ) {
      const serviceParams: AiGenerationParams = { // Using the imported AiGenerationParams directly
        restaurantId: data.restaurantId,
        menuId: data.menuId.toString(),
        bankId: newBank._id.toString(), // newBank._id should be available after save
        numQuestionsPerItem: aiParams.targetQuestionCount, 
        // geminiModelName: aiParams.geminiModelName, // Add if AiGenerationParams in questionService supports it
      };
      const generatedQuestions =
        await generateAiQuestionsService(serviceParams); // Calling the imported function directly

      if (generatedQuestions && generatedQuestions.length > 0) {
        const questionIds = generatedQuestions.map(
          (q: IQuestion) => q._id as mongoose.Types.ObjectId // Added IQuestion type for q
        ); 
        newBank.questions.push(...questionIds);
        await newBank.save(session ? { session } : undefined); // Pass session only if it exists
      }
    }
    */

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
    return newBank;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error creating question bank from menu in service:", error);
    throw new AppError("Failed to create question bank from menu.", 500);
  }
};

// Service to add a category to a specific question bank
export const addCategoryToQuestionBankService = async (
  bankId: string,
  restaurantId: mongoose.Types.ObjectId,
  categoryName: string
): Promise<IQuestionBank | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw new AppError(`Invalid bank ID format: ${bankId}`, 400);
    }
    if (
      !categoryName ||
      typeof categoryName !== "string" ||
      categoryName.trim() === ""
    ) {
      throw new AppError("Category name must be a non-empty string.", 400);
    }

    const updatedBank = await QuestionBankModel.findOneAndUpdate(
      { _id: bankId, restaurantId },
      { $addToSet: { categories: categoryName.trim() } },
      { new: true, runValidators: true }
    );

    if (!updatedBank) {
      // This could mean bank not found or doesn't belong to restaurant
      throw new AppError(
        `Question bank not found with ID: ${bankId} for this restaurant, or category update failed.`,
        404
      );
    }
    return updatedBank;
  } catch (error) {
    console.error("Error adding category to question bank in service:", error);
    if (error instanceof AppError) throw error;
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(`Validation Error: ${error.message}`, 400);
    }
    throw new AppError("Failed to add category to question bank.", 500);
  }
};

// Service to remove a category from a specific question bank
export const removeCategoryFromQuestionBankService = async (
  bankId: string,
  restaurantId: mongoose.Types.ObjectId,
  categoryName: string
): Promise<IQuestionBank | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw new AppError(`Invalid bank ID format: ${bankId}`, 400);
    }
    if (
      !categoryName ||
      typeof categoryName !== "string" ||
      categoryName.trim() === ""
    ) {
      throw new AppError("Category name must be a non-empty string.", 400);
    }

    const updatedBank = await QuestionBankModel.findOneAndUpdate(
      { _id: bankId, restaurantId },
      { $pull: { categories: categoryName.trim() } },
      { new: true, runValidators: true } // runValidators might not be strictly necessary for $pull on string array but good practice
    );

    if (!updatedBank) {
      // This could mean bank not found or doesn't belong to restaurant
      // Or category was not in the array (though $pull doesn't error for non-existent items)
      // To be more precise, one might check if the category was actually present before $pull
      // For now, not finding the bank is the primary concern for a 404
      throw new AppError(
        `Question bank not found with ID: ${bankId} for this restaurant, or category removal failed.`,
        404
      );
    }
    return updatedBank;
  } catch (error) {
    console.error(
      "Error removing category from question bank in service:",
      error
    );
    if (error instanceof AppError) throw error;
    if (error instanceof mongoose.Error.ValidationError) {
      // Less likely for $pull of string
      throw new AppError(`Validation Error: ${error.message}`, 400);
    }
    throw new AppError("Failed to remove category from question bank.", 500);
  }
};

// New service to get unique, valid question IDs from a list of bank IDs
export const getUniqueValidQuestionIdsFromQuestionBanks = async (
  bankIds: mongoose.Types.ObjectId[],
  restaurantId: mongoose.Types.ObjectId // Added restaurantId for scoping bank and question lookups
): Promise<mongoose.Types.ObjectId[]> => {
  if (!bankIds || bankIds.length === 0) {
    return [];
  }

  try {
    const questionBanks = await QuestionBankModel.find({
      _id: { $in: bankIds },
      restaurantId: restaurantId, // Ensure banks belong to the restaurant
    })
      .select("questions")
      .lean();

    const allQuestionIdsFromBanks: mongoose.Types.ObjectId[] = [];
    questionBanks.forEach((bank) => {
      if (bank.questions && bank.questions.length > 0) {
        // Assuming bank.questions are already ObjectIds or can be cast
        allQuestionIdsFromBanks.push(
          ...bank.questions.map((qId) => new mongoose.Types.ObjectId(qId))
        );
      }
    });

    if (allQuestionIdsFromBanks.length === 0) {
      return [];
    }

    // Deduplicate
    const uniqueQuestionIdStrings = [
      ...new Set(allQuestionIdsFromBanks.map((id) => id.toString())),
    ];
    const uniqueQuestionIds = uniqueQuestionIdStrings.map(
      (idStr) => new mongoose.Types.ObjectId(idStr)
    );

    // Validate that these questions actually exist and belong to the restaurant
    const validQuestions = await QuestionModel.find({
      _id: { $in: uniqueQuestionIds },
      restaurantId: restaurantId, // Ensure questions also belong to the restaurant
      status: "active", // Changed from isActive: true
    })
      .select("_id")
      .lean();

    return validQuestions.map((q) => new mongoose.Types.ObjectId(q._id as any)); // Explicitly cast to ObjectId
  } catch (error) {
    console.error(
      "Error in getUniqueValidQuestionIdsFromQuestionBanks:",
      error
    );
    // Depending on how critical this is, either throw or return empty/handle upstream
    throw new AppError(
      "Failed to retrieve unique question IDs from banks.",
      500
    );
  }
};
