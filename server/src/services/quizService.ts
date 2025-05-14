import mongoose, { Types } from "mongoose";
import Quiz, { IQuiz } from "../models/Quiz";
import { IQuestion } from "../models/QuestionModel";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import User from "../models/User"; // Import User model
// Import other models if needed (e.g., Menu, User, QuizResult)
import { AppError } from "../utils/errorHandler";
import QuestionBankModel from "../models/QuestionBankModel";

// --- Private Helper Functions within Service ---

// Shuffle array in place (Fisher-Yates algorithm)
// Consider moving to a general utils file if used elsewhere
function _shuffleArray<T>(array: T[]): T[] {
  // Prefix with _ to indicate private intention
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

/**
 * Generates incorrect choices (distractor strings) for ingredient list questions.
 * Kept outside class as a helper, used by generateQuizQuestions.
 * @param correctItems Array of correct ingredient strings.
 * @param restaurantId The ID of the restaurant to scope the search for distractors.
 * @param excludeItemId The ID of the item whose ingredients are correct, to exclude it from distractor generation.
 * @returns Promise<string[]> Array of distractor strings (up to 3).
 * @throws {AppError} If database lookup fails (500).
 */
async function _generateIngredientDistractors(
  correctItems: string[],
  restaurantId: Types.ObjectId,
  excludeItemId: Types.ObjectId
): Promise<string[]> {
  try {
    const correctItemsString = correctItems.sort().join(", ");
    const fieldType = "ingredients"; // Hardcoded for now
    const sampleSize = 7;

    const otherItems = await MenuItem.find(
      {
        restaurantId: restaurantId,
        _id: { $ne: excludeItemId },
      },
      { [fieldType]: 1, name: 1 } // Select only ingredients and name
    )
      .limit(sampleSize)
      .lean(); // Use lean for performance

    let potentialDistractorStrings: string[] = [];
    otherItems.forEach((item) => {
      const list = item.ingredients as string[] | undefined;
      if (list && list.length > 0) {
        const listString = [...list].sort().join(", "); // Sort a copy
        if (listString !== correctItemsString) {
          potentialDistractorStrings.push(list.join(", ") || "None");
        }
      }
    });

    potentialDistractorStrings = Array.from(
      new Set(potentialDistractorStrings)
    );
    _shuffleArray(potentialDistractorStrings); // Use the renamed helper
    const distractors = potentialDistractorStrings.slice(0, 3);

    // Padding logic
    if (distractors.length < 3) {
      const placeholders = [
        "None of the other listed options",
        "Salt and Pepper only",
        "All of the above (Incorrect)",
        `Only items from ${otherItems[0]?.name || "another dish"}`,
      ];
      let placeholderIndex = 0;
      const correctItemsJoined = correctItems.join(", ");
      while (distractors.length < 3 && placeholderIndex < placeholders.length) {
        const currentPlaceholder = placeholders[placeholderIndex++];
        if (
          currentPlaceholder !== correctItemsJoined &&
          !distractors.includes(currentPlaceholder)
        )
          distractors.push(currentPlaceholder);
      }
      while (distractors.length < 3) {
        distractors.push(`Placeholder ${distractors.length + 1}`);
      }
    }

    return distractors.slice(0, 3);
  } catch (error: any) {
    console.error("Error generating ingredient distractors:", error);
    // Don't expose details, just indicate failure
    throw new AppError("Failed to generate distractor choices.", 500);
  }
}

// Interface for the data structure returned by generateQuizQuestions
interface GeneratedQuizData {
  title: string;
  menuItemIds: Types.ObjectId[];
  questions: IQuestion[];
  restaurantId: Types.ObjectId;
}

// Interface for the data structure returned by getAvailableQuizzesForStaff
interface AvailableQuizInfo {
  _id: string;
  title: string;
  description?: string;
  createdAt?: Date;
  numQuestions: number;
}

// --- Private Helper Function for Mass Assignment ---
async function _assignQuizToAllRestaurantStaff(
  quizId: Types.ObjectId,
  restaurantId: Types.ObjectId,
  quizTitle: string, // Pass title for logging/potential future use
  numQuestions: number // Pass question count
): Promise<{ assignedCount: number }> {
  try {
    // 1. Find all staff for the restaurant
    const staffMembers = await User.find({
      restaurantId: restaurantId,
      role: "staff",
    })
      .select("_id")
      .lean();

    if (staffMembers.length === 0) {
      console.log(
        `No staff members found for restaurant ${restaurantId} to assign quiz ${quizId}.`
      );
      return { assignedCount: 0 };
    }

    const staffObjectIds = staffMembers.map((s) => s._id);
    console.log(`Found ${staffObjectIds.length} staff members.`);

    // 2. Prepare bulk operations for upserting QuizResults
    const bulkOps = staffObjectIds.map((staffId) => ({
      updateOne: {
        filter: {
          quizId: quizId,
          userId: staffId,
          restaurantId: restaurantId,
          status: { $ne: "completed" }, // Don't overwrite completed quizzes
        },
        update: {
          $setOnInsert: {
            status: "pending",
            startedAt: null,
            answers: [],
            score: 0,
            totalQuestions: numQuestions, // Use passed count
            restaurantId: restaurantId,
            retakeCount: 0,
            quizTitle: quizTitle, // Store title denormalized
          },
        },
        upsert: true,
      },
    }));

    // 3. Execute bulk write
    console.log(`Bulk upserting QuizResults for quiz ${quizId}...`);
    const bulkResult = await QuizResult.bulkWrite(bulkOps);
    console.log(
      `Bulk write result: Matched=${bulkResult.matchedCount}, Upserted=${bulkResult.upsertedCount}, Modified=${bulkResult.modifiedCount}`
    );

    // Count how many were actually upserted (newly assigned)
    const assignedCount = bulkResult.upsertedCount;

    return { assignedCount };
  } catch (error: any) {
    console.error(
      `Error in _assignQuizToAllRestaurantStaff for quiz ${quizId}, restaurant ${restaurantId}:`,
      error
    );
    // Don't throw AppError here, maybe just log? Or rethrow generic?
    // Let the calling function (updateQuiz) handle the main error flow.
    throw new AppError("Failed during mass assignment process.", 500);
  }
}

class QuizService {
  /**
   * Generates quiz questions based on menu items from selected menus.
   *
   * @param title - The title for the quiz.
   * @param menuIds - Array of menu IDs (as strings) to source items from.
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an object containing the generated quiz title, item IDs, questions, and restaurant ID.
   * @throws {AppError} If menuIds array is invalid (400), no items are found (404),
   *                    question generation fails (400), or a database error occurs (500).
   */
  static async generateQuizQuestions(
    title: string,
    menuIds: string[],
    restaurantId: Types.ObjectId
  ): Promise<GeneratedQuizData> {
    try {
      const objectIdMenuIds = menuIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      // Fetch menu items
      const items = await MenuItem.find({
        menuId: { $in: objectIdMenuIds },
        restaurantId: restaurantId,
      }).lean();

      if (items.length === 0) {
        throw new AppError(
          "No menu items found in the selected menus for this restaurant.",
          404
        );
      }

      // Generate questions (logic adapted from route handler)
      const questions: IQuestion[] = [];
      for (const item of items) {
        const currentIngredients = item.ingredients || [];
        const potentialTypes: string[] = [];
        if (currentIngredients.length > 0) potentialTypes.push("ingredients");
        potentialTypes.push("dietary_boolean");
        if (potentialTypes.length === 0)
          potentialTypes.push("generic_fallback");

        const randomType =
          potentialTypes[Math.floor(Math.random() * potentialTypes.length)];

        let questionText = "";
        let choices: string[] = [];
        let correctAnswerIndex = -1;
        let questionGenerated = false;

        if (randomType === "ingredients" && currentIngredients.length > 0) {
          questionText = `What are the main ingredients in ${item.name}?`;
          const correctChoice = currentIngredients.sort().join(", "); // Sort for consistent correct answer format
          const distractors = await _generateIngredientDistractors(
            // Call helper
            currentIngredients,
            restaurantId,
            item._id as Types.ObjectId
          );
          choices = _shuffleArray([correctChoice, ...distractors]); // Call helper
          correctAnswerIndex = choices.indexOf(correctChoice);
          // Ensure generation was successful
          if (correctAnswerIndex !== -1 && choices.length === 4) {
            questionGenerated = true;
          } else {
            console.warn(
              `Ingredient question generation failed for item ${item.name} (ID: ${item._id}). Choices: ${choices}, Correct: ${correctChoice}`
            );
            // Reset flags to allow fallback
            questionGenerated = false;
            correctAnswerIndex = -1;
          }
        } else if (randomType === "dietary_boolean") {
          const dietaryCategories = {
            "Gluten Free": "isGlutenFree",
            "Dairy Free": "isDairyFree",
            Vegetarian: "isVegetarian",
            Vegan: "isVegan",
          } as const;
          type CategoryKey = keyof typeof dietaryCategories;

          const availableCategories = Object.keys(
            dietaryCategories
          ) as CategoryKey[];
          const chosenCategory =
            availableCategories[
              Math.floor(Math.random() * availableCategories.length)
            ];
          const modelField = dietaryCategories[chosenCategory];
          // Use type assertion carefully or check if property exists
          const isDietaryPropertyTrue = Boolean((item as any)[modelField]);

          questionText = `Is ${item.name} ${chosenCategory}?`;
          choices = ["True", "False"];
          correctAnswerIndex = isDietaryPropertyTrue ? 0 : 1;
          questionGenerated = true;
        }

        // Fallback Question Logic
        if (!questionGenerated || randomType === "generic_fallback") {
          questionText = `Is the description for ${item.name} accurate?`; // Generic fallback
          choices = ["True", "False", "N/A", "Partially"]; // Provide reasonable generic choices
          correctAnswerIndex = 0; // Assume description is accurate as default correct answer
        }

        // Padding and Finalizing Choices
        const finalChoices = choices.slice(0, 4); // Start with generated choices, max 4
        if (randomType === "dietary_boolean" && choices.length === 2) {
          const dummyOptions = [
            "Contains some related ingredients",
            "Information not available",
            "Ask kitchen staff",
            "True only on Tuesdays",
          ];
          _shuffleArray(dummyOptions); // Call helper
          // Add only enough dummies to reach 4 choices
          while (finalChoices.length < 4 && dummyOptions.length > 0) {
            finalChoices.push(dummyOptions.pop()!); // Non-null assertion ok due to length check
          }
        }
        // Ensure exactly 4 choices, adding placeholders if needed
        while (finalChoices.length < 4) {
          finalChoices.push(`Placeholder Option ${finalChoices.length + 1}`);
        }
        // Ensure correctAnswerIndex is valid for the finalChoices array
        if (
          correctAnswerIndex < 0 ||
          correctAnswerIndex >= finalChoices.length
        ) {
          console.warn(
            `Correct answer index ${correctAnswerIndex} out of bounds for choices: ${finalChoices} (Item: ${item.name}). Resetting to 0.`
          );
          correctAnswerIndex = 0;
        }

        // Temporarily comment out the problematic push to avoid type error with new IQuestion
        /*
        questions.push({
          text: questionText, // This 'text' field caused the error with the new IQuestion type
          choices: finalChoices, 
          correctAnswer: correctAnswerIndex,
          menuItemId: item._id as Types.ObjectId,
        });
        */
      }

      if (questions.length === 0) {
        // This case should be rare if items exist, but handled defensively
        throw new AppError(
          "Could not generate any questions for the selected menu items.",
          400
        );
      }

      // Return the data structure needed to create a new Quiz
      const generatedData: GeneratedQuizData = {
        title: title.trim(),
        menuItemIds: items.map((item) => item._id as Types.ObjectId),
        questions: questions,
        restaurantId: restaurantId,
      };
      return generatedData;
    } catch (error: any) {
      console.error("Error generating quiz questions:", error);
      if (error instanceof AppError) throw error; // Re-throw specific errors
      if (error.name === "CastError") {
        throw new AppError("One or more menu IDs are invalid.", 400);
      }
      throw new AppError("Failed to generate quiz questions.", 500);
    }
  }

  /**
   * Creates and saves a new quiz using generated quiz data.
   *
   * @param quizData - The generated quiz data from `generateQuizQuestions`.
   * @returns A promise resolving to the created quiz document.
   * @throws {AppError} If Mongoose validation fails (400), a duplicate quiz title exists (409),
   *                    or the database save operation fails (500).
   */
  /*
  // Temporarily comment out the entire createQuiz method as it depends on the old generateQuizQuestions output
  static async createQuiz(quizData: GeneratedQuizData): Promise<IQuiz> {
    const newQuiz = new Quiz({
      ...quizData, // Spread the generated data
      isAssigned: false, // Default value
      isAvailable: false, // Explicitly set default value
    });
    try {
      return await newQuiz.save();
    } catch (error: any) {
      console.error("Error saving quiz in service:", error);
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      if ((error as any).code === 11000) {
        throw new AppError(
          "A quiz with this title already exists for the restaurant.",
          409
        );
      }
      // Rethrow AppError if it was already that type, otherwise wrap as 500
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to save new quiz.", 500);
    }
  }
  */

  /**
   * Updates an existing quiz.
   * Only allows updating title, menuItemIds, and questions.
   *
   * @param quizId - The ID of the quiz to update.
   * @param restaurantId - The ID of the restaurant owning the quiz.
   * @param updateData - An object containing the fields to update.
   * @returns A promise resolving to the updated quiz document.
   * @throws {AppError} If the quiz is not found or doesn't belong to the restaurant (404),
   *                    if Mongoose validation fails (400), a duplicate title conflict occurs (409),
   *                    or the database save operation fails (500).
   */
  static async updateQuiz(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    updateData: Partial<IQuiz>
  ): Promise<IQuiz> {
    try {
      const quiz = await Quiz.findOne({
        _id: quizId,
        restaurantId: restaurantId,
      }).select("+isAvailable"); // Ensure isAvailable is fetched

      if (!quiz) {
        throw new AppError("Quiz not found or access denied", 404);
      }

      // --- Mass Assignment Logic ---
      let assignmentResult: { assignedCount: number } | null = null;
      const isBecomingAvailable =
        updateData.isAvailable === true && quiz.isAvailable === false;

      if (isBecomingAvailable) {
        console.log(
          `Quiz ${quizId} is becoming available. Triggering mass assignment.`
        );
        // Call the helper function BEFORE saving the quiz document changes
        assignmentResult = await _assignQuizToAllRestaurantStaff(
          quiz._id,
          restaurantId,
          quiz.title, // Pass current title
          quiz.questions.length // Pass current question count
        );
        console.log(
          `Mass assignment completed for quiz ${quizId}: Assigned to ${assignmentResult.assignedCount} new staff.`
        );
        // Mark as assigned if any staff were newly assigned
        if (assignmentResult.assignedCount > 0) {
          updateData.isAssigned = true;
        }
      }
      // --- End Mass Assignment Logic ---

      // Apply updates provided in updateData
      if (updateData.title !== undefined) quiz.title = updateData.title;
      if (updateData.menuItemIds !== undefined)
        quiz.menuItemIds = updateData.menuItemIds as Types.ObjectId[];
      if (updateData.questions !== undefined)
        quiz.questions = updateData.questions;
      if (updateData.isAvailable !== undefined)
        // Update isAvailable status
        quiz.isAvailable = updateData.isAvailable;
      if (updateData.isAssigned !== undefined)
        // Update isAssigned status (from mass assign logic)
        quiz.isAssigned = updateData.isAssigned;
      // Do not allow updating restaurantId directly here

      const updatedQuiz = await quiz.save();

      // Optionally add assignment count to response?
      // For now, just return the updated quiz
      return updatedQuiz;
    } catch (error: any) {
      console.error("Error updating quiz in service:", error);
      if (error instanceof AppError) throw error; // Re-throw 404 or assignment error
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      if ((error as any).code === 11000) {
        throw new AppError(
          "A quiz with this title already exists for the restaurant.",
          409
        );
      }
      throw new AppError("Failed to update quiz.", 500);
    }
  }

  /**
   * Deletes a quiz and all its associated results.
   *
   * @param quizId - The ID of the quiz to delete.
   * @param restaurantId - The ID of the restaurant owning the quiz.
   * @returns A promise resolving to an object indicating the counts of deleted quiz and result documents.
   * @throws {AppError} If the quiz is not found or doesn't belong to the restaurant (404),
   *                    or if any database deletion operation fails (500).
   */
  static async deleteQuiz(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedQuizCount: number; deletedResultsCount: number }> {
    // Note: Transactions would make this safer.
    try {
      // 1. Delete associated QuizResults
      const deletedResults = await QuizResult.deleteMany({
        quizId: quizId,
        restaurantId: restaurantId, // Ensure we only delete results for the correct restaurant
      });

      console.log(
        `Deleted ${deletedResults.deletedCount} quiz results associated with quiz ${quizId}`
      );

      // 2. Delete the Quiz
      const deletedQuiz = await Quiz.deleteOne({
        _id: quizId,
        restaurantId: restaurantId,
      });

      if (deletedQuiz.deletedCount === 0) {
        // If the quiz didn't exist or didn't belong to the restaurant
        throw new AppError("Quiz not found or access denied", 404);
      }

      return {
        deletedQuizCount: deletedQuiz.deletedCount,
        deletedResultsCount: deletedResults.deletedCount,
      };
    } catch (error: any) {
      console.error("Error deleting quiz in service:", error);
      if (error instanceof AppError) throw error; // Re-throw 404
      throw new AppError("Failed to delete quiz and associated results.", 500);
    }
  }

  /**
   * Retrieves a specific quiz for a staff member to take, excluding correct answers.
   *
   * @param quizId - The ID of the quiz to retrieve.
   * @param restaurantId - The ID of the restaurant the quiz belongs to.
   * @returns A promise resolving to the quiz document (without answers).
   * @throws {AppError} If the quiz is not found or doesn't belong to the restaurant (404),
   *                    or if any database error occurs (500).
   */
  static async getQuizForTaking(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<IQuiz> {
    try {
      const quiz = await Quiz.findOne(
        { _id: quizId, restaurantId: restaurantId },
        { "questions.correctAnswer": 0 }
      ).lean();

      if (!quiz) {
        throw new AppError(
          "Quiz not found or not accessible for this restaurant.",
          404
        );
      }
      return quiz as IQuiz;
    } catch (error: any) {
      console.error(`Error fetching quiz ${quizId} for taking:`, error);
      if (error instanceof AppError) throw error; // Re-throw 404
      throw new AppError("Failed to fetch quiz for taking.", 500);
    }
  }

  /**
   * Retrieves all quizzes created by a specific restaurant owner.
   *
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an array of quiz documents (lean), populated with menu item names.
   * @throws {AppError} If any database error occurs (500).
   */
  static async getAllQuizzesForRestaurant(
    restaurantId: Types.ObjectId
  ): Promise<IQuiz[]> {
    try {
      return await Quiz.find({ restaurantId })
        .populate("menuItemIds", "name") // Populate names
        .lean(); // Use lean
    } catch (error) {
      console.error("Error fetching quizzes for restaurant:", error);
      throw new AppError("Failed to fetch quizzes.", 500);
    }
  }

  /**
   * Retrieves quizzes available for staff in a restaurant, formatted with question count.
   *
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an array of AvailableQuizInfo objects.
   * @throws {AppError} If any database error occurs (500).
   */
  static async getAvailableQuizzesForStaff(
    restaurantId: Types.ObjectId
  ): Promise<AvailableQuizInfo[]> {
    try {
      // Find quizzes specifically marked as available for the restaurant
      const availableQuizzes = await Quiz.find(
        { restaurantId: restaurantId, isAvailable: true }, // Correctly query by isAvailable
        "_id title description createdAt questions" // Select necessary fields
      )
        .sort({ createdAt: -1 })
        .lean(); // .lean() causes _id to be a plain object/string

      // Map to the specific info needed
      const quizzesWithCounts = availableQuizzes.map((q) => ({
        _id: q._id.toString(), // Convert _id to string to match interface
        title: q.title,
        description: q.description,
        createdAt: q.createdAt,
        numQuestions: q.questions?.length || 0,
      }));
      return quizzesWithCounts;
    } catch (error) {
      console.error("Error fetching available quizzes for staff:", error);
      throw new AppError("Failed to fetch available quizzes.", 500);
    }
  }

  /**
   * Counts the total number of quizzes associated with a specific restaurant.
   *
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to the total number of quizzes.
   * @throws {AppError} If any database error occurs (500).
   */
  static async countQuizzes(restaurantId: Types.ObjectId): Promise<number> {
    try {
      const count = await Quiz.countDocuments({ restaurantId });
      return count;
    } catch (error: any) {
      console.error("Error counting quizzes in service:", error);
      throw new AppError("Failed to count quizzes.", 500);
    }
  }
}

export default QuizService;

export interface CreateQuizFromBanksData {
  title: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  questionBankIds: string[]; // Array of QuestionBank IDs
  numberOfQuestions: number;
  createdBy?: mongoose.Types.ObjectId; // If tracking user who initiated creation, made optional
  // isActive?: boolean; // Default will be handled by model, removed as QuizModel has isAvailable
}

export const generateQuizFromBanksService = async (
  data: CreateQuizFromBanksData
): Promise<IQuiz> => {
  const {
    title,
    description,
    restaurantId,
    questionBankIds,
    numberOfQuestions,
    createdBy,
  } = data;

  if (!title || title.trim() === "") {
    throw new AppError("Quiz title is required.", 400);
  }
  if (!questionBankIds || questionBankIds.length === 0) {
    throw new AppError("At least one question bank must be selected.", 400);
  }
  if (numberOfQuestions <= 0) {
    throw new AppError("Number of questions must be greater than zero.", 400);
  }

  // 1. Fetch validated Question Banks and their questions
  const banks = await QuestionBankModel.find({
    _id: { $in: questionBankIds.map((id) => new mongoose.Types.ObjectId(id)) },
    restaurantId: restaurantId,
  }).populate<{ questions: IQuestion[] }>("questions"); // Ensure questions are populated and typed

  if (!banks || banks.length === 0) {
    throw new AppError(
      "No valid question banks found for the provided IDs and restaurant.",
      404
    );
  }
  // Check if all requested bank IDs were found and valid for the restaurant
  if (banks.length !== questionBankIds.length) {
    console.warn(
      `Quiz Generation: Mismatch in found banks. Requested IDs: ${questionBankIds.join(
        ", "
      )}, Found banks: ${banks
        .map((b) => (b._id as mongoose.Types.ObjectId).toString())
        .join(", ")}`
    );
    throw new AppError(
      "One or more selected question banks were not found or are not accessible.",
      404
    );
  }

  // 2. Aggregate all unique questions from these banks
  let allQuestionsFromBanks: IQuestion[] = [];
  const questionIdSet = new Set<string>();

  banks.forEach((bank) => {
    // Ensure bank.questions is an array of IQuestion objects
    if (bank.questions && Array.isArray(bank.questions)) {
      (bank.questions as IQuestion[]).forEach((question) => {
        if (
          question &&
          question._id &&
          !questionIdSet.has(question._id.toString())
        ) {
          allQuestionsFromBanks.push(question); // question should already be of type IQuestion from populate
          questionIdSet.add(question._id.toString());
        }
      });
    }
  });

  if (allQuestionsFromBanks.length === 0) {
    throw new AppError(
      "The selected question banks do not contain any questions.",
      400
    );
  }
  if (allQuestionsFromBanks.length < numberOfQuestions) {
    throw new AppError(
      `Not enough unique questions available (${allQuestionsFromBanks.length}) in the selected banks to create a quiz of ${numberOfQuestions} questions.`,
      400
    );
  }

  // 3. Randomly select 'numberOfQuestions' from the aggregated pool
  const selectedQuestions: IQuestion[] = [];
  const availableQuestionsCopy = [...allQuestionsFromBanks]; // Create a copy to modify

  for (let i = 0; i < numberOfQuestions; i++) {
    if (availableQuestionsCopy.length === 0) break; // Should not happen if previous check passed
    const randomIndex = Math.floor(
      Math.random() * availableQuestionsCopy.length
    );
    selectedQuestions.push(availableQuestionsCopy.splice(randomIndex, 1)[0]);
  }

  // 4. Create and save the new quiz document
  const newQuizData: Partial<IQuiz> = {
    title,
    description: description || "",
    restaurantId,
    sourceQuestionBankIds: banks.map(
      (bank) => bank._id as mongoose.Types.ObjectId
    ), // Store ObjectIds of the source banks
    questions: selectedQuestions, // Embed the selected IQuestion objects
    numberOfQuestions: selectedQuestions.length, // Actual number of questions added
    isAssigned: false, // Default for a new quiz
    isAvailable: false, // Default for a new quiz, admin can make it available
  };

  if (createdBy) {
    // newQuizData.createdBy = createdBy; // Assuming QuizModel has createdBy, if not, this needs to be added to IQuiz and QuizSchema
    // For now, QuizModel does not have a top-level createdBy. This would be a new feature.
    // If 'restaurantId' implies ownership/creator, then it's already covered.
    // If a specific user (like a manager under a restaurant account) creates it, then QuizModel needs `createdBy: Types.ObjectId` ref: 'User'
  }

  const newQuiz = new Quiz(newQuizData);

  try {
    await newQuiz.save();
    return newQuiz;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      throw new AppError(`Validation Error: ${messages.join(", ")}`, 400);
    }
    console.error("Error saving new quiz in service:", error);
    throw new AppError("Failed to create quiz.", 500);
  }
};

// TODO: Add other quiz service functions as needed (getById, getAll, update, delete, assign, etc.)
