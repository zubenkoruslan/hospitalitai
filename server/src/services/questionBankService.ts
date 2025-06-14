import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import QuestionModel, {
  IQuestion,
  QuestionType,
  IOption,
} from "../models/QuestionModel";
// import MenuItemModel, { IMenuItem } from "../models/MenuItem"; // This line should be removed
// import { // This block should be removed
//   generateAiQuestionsService,
//   AiGenerationParams,
// } from "./questionService";
import { AppError } from "../utils/errorHandler";
import mongoose from "mongoose";
import MenuModel, { IMenu } from "../models/MenuModel"; // Added IMenu import
import SopDocumentModel, {
  ISopDocument,
  QuestionGenerationStatus,
} from "../models/SopDocumentModel"; // Added import for SopDocumentModel
import { generateQuestionsFromSopText, IGeneratedQuestion } from "./aiService";

// Import QuizService for updating quiz snapshots when question banks change
import type { QuizService } from "./quizService";

// Define an interface for the data expected by createQuestionBankService
// This should align with what the controller will pass from req.body
export interface CreateQuestionBankData {
  name: string;
  description?: string;
  categories?: string[]; // Made categories optional
  targetQuestionCount?: number; // Added targetQuestionCount
  restaurantId: mongoose.Types.ObjectId; // Assuming restaurantId will be passed by controller
  sourceType?: "MANUAL" | "SOP" | "MENU"; // Added optional sourceType
}

// Define an interface for the data expected by updateQuestionBankService
export interface UpdateQuestionBankData {
  name?: string;
  description?: string;
  targetQuestionCount?: number; // Added targetQuestionCount
  categories?: string[]; // ADDED: categories field
  // questions will be handled by separate dedicated functions usually
  questions?: mongoose.Types.ObjectId[]; // ADDED: questions field for clearing questions

  // ADDED: Menu connection change fields
  sourceMenuId?: mongoose.Types.ObjectId | null;
  sourceMenuName?: string;
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
  selectedCategories: string[]; // ADDED: Main/non-beverage categories
  selectedBeverageCategories: string[]; // ADDED: Beverage categories
  generateAiQuestions?: boolean; // Flag to trigger AI question generation
  aiParams?: MenuSpecificAiParams; // Use the new specific interface
}

// ADDED: Interface for creating a question bank from an SOP document
export interface CreateQuestionBankFromSopData {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  sopDocumentId: mongoose.Types.ObjectId;
  selectedCategoryNames: string[]; // Names of categories from the SOP document
  // aiParams could be added here if AI generation directly from bank creation is desired
}

// Interface for data passed to createQuestionBankFromSOP
interface BankDetails {
  name: string;
  description?: string;
  categories?: string[];
  restaurantId: string;
}

// Interface for the structure of options when creating new questions
interface NewOption {
  text: string;
  isCorrect: boolean;
  _id?: mongoose.Types.ObjectId;
}

// Interface for the structure of questions when creating new questions
interface NewQuestion {
  questionText: string;
  options: NewOption[];
  questionType: QuestionType;
  categories: string[];
  restaurantId: mongoose.Types.ObjectId;
  questionBankId: mongoose.Types.ObjectId;
  createdBy: "ai" | "manual";
  status: "active" | "pending_review" | "rejected";
  explanation?: string;
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

    // Get the current bank to check its source type
    const currentBank = await QuestionBankModel.findOne({
      _id: bankId,
      restaurantId: restaurantId,
    });

    if (!currentBank) {
      throw new AppError(
        `Question bank not found with ID: ${bankId} for this restaurant.`,
        404
      );
    }

    // If changing menu connection, validate the new menu and clear existing questions
    if (data.sourceMenuId !== undefined) {
      if (data.sourceMenuId === null) {
        // Removing menu connection
        data.sourceMenuName = undefined;

        // Clear existing questions when removing menu connection
        console.log(
          `[QuestionBank] Removing menu connection for bank ${bankId} - clearing existing questions`
        );

        // Delete all questions associated with this bank
        await QuestionModel.deleteMany({
          questionBankId: bankId,
          restaurantId: restaurantId,
        });

        // Clear the questions array in the bank
        data.questions = [];
      } else {
        // Changing to a new menu - validate it exists and belongs to restaurant
        const menu = await MenuModel.findOne({
          _id: data.sourceMenuId,
          restaurantId: restaurantId,
        });

        if (!menu) {
          throw new AppError(
            `Menu with ID: ${data.sourceMenuId} not found or does not belong to this restaurant.`,
            404
          );
        }

        // Update the menu name for denormalization
        data.sourceMenuName = menu.name;

        console.log(
          `[QuestionBank] Updating bank ${bankId} to connect to menu: ${menu.name} (${data.sourceMenuId}) - clearing existing questions`
        );

        // Clear existing questions when changing menu connection
        // This ensures the quiz won't use questions from the old menu
        await QuestionModel.deleteMany({
          questionBankId: bankId,
          restaurantId: restaurantId,
        });

        // Clear the questions array in the bank
        data.questions = [];
      }
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
    if (error instanceof AppError) {
      throw error;
    }
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

    // 6. Update quiz snapshots asynchronously (don't await to avoid blocking the response)
    setImmediate(async () => {
      try {
        const { QuizService } = await import("./quizService");
        await QuizService.updateQuizSnapshotsForQuestionBanks(
          [new mongoose.Types.ObjectId(bankId)],
          restaurantId
        );
      } catch (error) {
        console.error(
          "Failed to update quiz snapshots after adding question to bank:",
          error
        );
      }
    });

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

// Service to create a new question bank from a specific menu
export const createQuestionBankFromMenuService = async (
  data: CreateQuestionBankFromMenuData
): Promise<IQuestionBank> => {
  const {
    name,
    description,
    restaurantId,
    menuId,
    selectedCategories,
    selectedBeverageCategories,
    generateAiQuestions,
    aiParams,
  } = data;

  try {
    // 1. Verify the menu exists and belongs to the restaurant
    const menu = await MenuModel.findOne({
      _id: menuId,
      restaurantId: restaurantId,
    });

    if (!menu) {
      throw new AppError(
        `Menu with ID: ${menuId} not found or does not belong to this restaurant.`,
        404
      );
    }

    // Combine all selected categories for the bank's main 'categories' field
    const allSelectedBankCategories = [
      ...(selectedCategories || []),
      ...(selectedBeverageCategories || []),
    ];
    // Ensure uniqueness if there was any overlap (though UI logic should prevent it)
    const uniqueBankCategories = Array.from(new Set(allSelectedBankCategories));

    // 2. Create the new question bank
    const newQuestionBank = new QuestionBankModel({
      name,
      description,
      restaurantId,
      sourceType: "MENU",
      sourceMenuId: menuId,
      sourceMenuName: menu.name, // Store menu name for easy display
      categories: uniqueBankCategories, // Use the combined and unique categories
      questions: [], // Questions will be added if AI generation is triggered
    });

    await newQuestionBank.save();

    // 3. Optionally, trigger AI question generation
    // This part would need to be fleshed out similar to SOP AI generation
    // It would involve:
    // - Identifying menu items from the selected categories (selectedCategories and selectedBeverageCategories)
    // - Preparing prompts for those items/categories
    // - Calling an AI service (e.g., AiQuestionService.generateRawQuestionsFromMenuContent)
    // - Saving generated questions as pending review, linked to this new bank.

    if (generateAiQuestions) {
      console.log(
        `Placeholder: AI Question generation for menu ${menuId} bank ${newQuestionBank._id} would be triggered here.`
      );
      console.log("Selected Main Categories:", selectedCategories);
      console.log("Selected Beverage Categories:", selectedBeverageCategories);
      console.log("AI Params:", aiParams);
      // TODO: Implement AI question generation logic for menu-based banks
      // This might involve fetching menu items based on the combined categories,
      // then passing them to a service similar to how SOP questions are generated,
      // or to AiQuestionService.generateRawQuestionsFromMenuContent
      // and then AiQuestionService.saveGeneratedQuestionsAsPendingReview
    }

    return newQuestionBank;
  } catch (error) {
    console.error("Error creating question bank from menu in service:", error);
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(`Validation Error: ${error.message}`, 400);
    }
    throw new AppError(
      "Failed to create question bank from menu in service.",
      500
    );
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

// Service method to create a Question Bank from an SOP Document
export const createBankFromSopDocumentService = async (
  data: CreateQuestionBankFromSopData
): Promise<IQuestionBank> => {
  const {
    name,
    description,
    restaurantId,
    sopDocumentId,
    selectedCategoryNames,
  } = data;

  // 1. Validate SopDocument exists and belongs to the restaurant
  const sopDocument = await SopDocumentModel.findOne({
    _id: sopDocumentId,
    restaurantId: restaurantId,
  }).lean<ISopDocument>();

  if (!sopDocument) {
    throw new AppError(
      `SOP Document with ID ${sopDocumentId} not found or does not belong to this restaurant.`,
      404
    );
  }

  // 2. Validate selectedCategoryNames against the document's categories
  const docCategoryNames = sopDocument.categories.map((cat) => cat.name);
  for (const selectedName of selectedCategoryNames) {
    if (!docCategoryNames.includes(selectedName)) {
      throw new AppError(
        `Category "${selectedName}" not found in SOP Document ${sopDocumentId}. Available categories: ${docCategoryNames.join(
          ", "
        )}`,
        400
      );
    }
  }

  // 3. Create the new question bank
  try {
    const newQuestionBank = new QuestionBankModel({
      name,
      description,
      restaurantId,
      sourceType: "SOP",
      sourceSopDocumentId: sopDocumentId,
      categories: selectedCategoryNames,
      questions: [], // Initially no questions
      questionCount: 0,
    });

    await newQuestionBank.save();
    return newQuestionBank;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError(
        `A question bank with the name "${name}" already exists for this restaurant.`,
        409
      );
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new AppError(`Validation Error: ${error.message}`, 400);
    }
    console.error("Error creating question bank from SOP document:", error);
    throw new AppError(
      "Failed to create question bank from SOP document.",
      500
    );
  }
};

/**
 * Processes the AI question generation asynchronously.
 * This function is intended to be called without awaiting its completion from the main request flow.
 */
async function processAiQuestionGeneration(
  questionBank: IQuestionBank,
  sopDocument: ISopDocument,
  numberOfQuestions: number = 10
) {
  try {
    if (!sopDocument.extractedText) {
      console.error(`SOP document ${sopDocument._id} has no extracted text.`);
      // Ensure sopDocument is saved if modified before throwing
      sopDocument.questionGenerationStatus = QuestionGenerationStatus.FAILED;
      sopDocument.errorMessage =
        "SOP document has no extracted text for question generation.";
      await sopDocument.save();
      throw new AppError(
        "SOP document has no extracted text for question generation.",
        400
      );
    }

    const generatedAiQuestions: IGeneratedQuestion[] =
      await generateQuestionsFromSopText(
        sopDocument.extractedText,
        numberOfQuestions
      );

    if (generatedAiQuestions && generatedAiQuestions.length > 0) {
      const questionsToCreate: NewQuestion[] = generatedAiQuestions.map(
        (gq) => ({
          questionText: gq.questionText,
          // Ensure options are plain objects, Mongoose handles _id for subdocuments if not provided
          options: gq.options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
          questionType: "multiple-choice-single",
          categories: questionBank.categories || [], // Use categories from the bank
          restaurantId: new mongoose.Types.ObjectId(
            questionBank.restaurantId.toString()
          ),
          questionBankId: questionBank._id,
          createdBy: "ai",
          status: "active",
        })
      );

      await QuestionModel.insertMany(questionsToCreate);

      // Fetch the bank again to ensure we have the latest version and correct Mongoose instance
      const bankToUpdate = await QuestionBankModel.findById(questionBank._id);
      if (bankToUpdate) {
        // updateQuestionCount is defined in QuestionBankModel.ts and should be available
        await bankToUpdate.updateQuestionCount();
      } else {
        console.error(
          `Failed to find question bank ${questionBank._id} for updating count after AI generation`
        );
        // If bank cannot be found, it's a critical issue, SOP status might remain PENDING incorrectly.
        // Consider how to handle this scenario. For now, the SOP status update below will proceed.
      }
    } else {
      console.log(
        `AI generated no questions for SOP: ${sopDocument.title}, Bank: ${questionBank.name}`
      );
      // If no questions are generated, it might still be considered 'COMPLETED' in terms of process,
      // but the bank will be empty. This depends on desired behavior.
    }

    // Update SOP document status regardless of whether questions were generated (if process didn't error out)
    sopDocument.questionGenerationStatus = QuestionGenerationStatus.COMPLETED;
    sopDocument.errorMessage = undefined; // Clear previous error message if any
    await sopDocument.save();
    console.log(
      `AI Question generation process finished for SOP: ${sopDocument.title}, Bank: ${questionBank.name}. Status: ${sopDocument.questionGenerationStatus}`
    );
  } catch (error) {
    console.error(
      `Error during AI question generation for SOP ${sopDocument._id} (Bank ${questionBank._id}):`,
      error
    );

    // Ensure sopDocument is a Mongoose document before trying to save
    const currentSopDoc = await SopDocumentModel.findById(sopDocument._id);
    if (currentSopDoc) {
      currentSopDoc.questionGenerationStatus = QuestionGenerationStatus.FAILED;
      if (error instanceof AppError) {
        currentSopDoc.errorMessage = `AI Generation Error: ${error.message}`;
      } else if (error instanceof Error) {
        currentSopDoc.errorMessage = `AI Generation Error: ${error.message}`;
      } else {
        currentSopDoc.errorMessage =
          "An unknown error occurred during AI question generation.";
      }
      await currentSopDoc.save();
    } else {
      console.error(
        `Failed to find SOP document ${sopDocument._id} to mark as FAILED after AI error.`
      );
    }
  }
}

export const createQuestionBankFromSOP = async (
  bankDetails: BankDetails,
  sopDocumentId: string,
  generationMethod: "AI" | "MANUAL" = "MANUAL"
): Promise<IQuestionBank> => {
  const sopDocument = await SopDocumentModel.findById(sopDocumentId);
  if (!sopDocument) {
    throw new AppError(`SOP Document with ID ${sopDocumentId} not found`, 404);
  }

  if (
    sopDocument.questionBankId &&
    (sopDocument.questionGenerationStatus ===
      QuestionGenerationStatus.PENDING ||
      sopDocument.questionGenerationStatus ===
        QuestionGenerationStatus.COMPLETED)
  ) {
    throw new AppError(
      `SOP ${sopDocument.title} is already linked to an active or completed question bank (${sopDocument.questionBankId}). Please resolve or use a different SOP.`,
      409
    );
  }

  const questionBank = new QuestionBankModel({
    name: bankDetails.name,
    description: bankDetails.description,
    restaurantId: bankDetails.restaurantId,
    sourceType: "SOP",
    sourceSopDocumentId: sopDocument._id,
    sourceSopDocumentTitle: sopDocument.title,
    categories: bankDetails.categories || [],
    questions: [],
    questionCount: 0,
  });

  await questionBank.save();

  sopDocument.questionBankId = questionBank._id;
  sopDocument.errorMessage = undefined; // Clear any previous errors

  if (generationMethod === "AI") {
    sopDocument.questionGenerationStatus = QuestionGenerationStatus.PENDING;
    await sopDocument.save();

    // Intentionally not awaiting processAiQuestionGeneration
    processAiQuestionGeneration(questionBank, sopDocument).catch(
      async (initiationError) => {
        console.error(
          `Critical failure initiating AI question generation for SOP ${sopDocument._id}, Bank ${questionBank._id}:`,
          initiationError
        );
        // This catch is for errors in processAiQuestionGeneration *itself* or its immediate invocation,
        // not for errors *within* the async AI process (which handles its own SOP status updates).
        // However, if the initiation fails so badly that processAiQuestionGeneration doesn't even start to update status,
        // we should mark the SOP as FAILED here.
        try {
          const freshSopDoc = await SopDocumentModel.findById(sopDocument._id);
          if (
            freshSopDoc &&
            freshSopDoc.questionGenerationStatus ===
              QuestionGenerationStatus.PENDING
          ) {
            freshSopDoc.questionGenerationStatus =
              QuestionGenerationStatus.FAILED;
            freshSopDoc.errorMessage =
              "Failed to start AI question generation process due to an unexpected error.";
            await freshSopDoc.save();
          }
        } catch (saveErr) {
          console.error(
            `Error saving SOP document ${sopDocument._id} after AI initiation failure:`,
            saveErr
          );
        }
      }
    );

    return questionBank;
  } else if (generationMethod === "MANUAL") {
    sopDocument.questionGenerationStatus = QuestionGenerationStatus.NONE;
    await sopDocument.save();
    return questionBank;
  }

  // This should ideally not be reached if generationMethod is validated at route level
  throw new AppError("Invalid question generation method specified.", 400);
};
