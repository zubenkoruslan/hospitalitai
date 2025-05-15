import mongoose, { Types } from "mongoose";
import Quiz, { IQuiz } from "../models/Quiz";
import { IQuestion } from "../models/QuestionModel";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import User, { IUser } from "../models/User"; // Import User model AND IUser interface
// Import other models if needed (e.g., Menu, User, QuizResult)
import { AppError } from "../utils/errorHandler";
import QuestionBankModel from "../models/QuestionBankModel";
import StaffQuizProgress, {
  IStaffQuizProgress,
} from "../models/StaffQuizProgress";
import QuestionModel, {
  IQuestion as QuestionDocument,
  IOption as QuestionModelIOption,
} from "../models/QuestionModel"; // Renamed to avoid conflict with IQuestion from QuestionBankModel if any
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";
import { getUniqueValidQuestionIdsFromQuestionBanks } from "./questionBankService"; // Added import

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

// Interface for data submitted by the client for a quiz attempt
export interface QuizAttemptSubmitData {
  questions: Array<{
    questionId: string; // ID of the IQuestion
    answerGiven: any; // User's answer, type depends on questionType
  }>;
  durationInSeconds?: number; // Optional: time taken for the quiz
}

// Define a type for the questions being sent to the client for an attempt
export interface QuestionForQuizAttempt {
  _id: Types.ObjectId;
  questionText: string;
  questionType: string; // Ideally, this would be the QuestionType enum
  options: Array<{ _id: Types.ObjectId; text: string }>;
  categories?: string[];
  difficulty?: string; // Ideally, this would be the Difficulty enum
  // include other fields as necessary for the client to render the question
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
    const allowedUpdateKeys: (keyof IQuiz)[] = [
      "title",
      "description",
      "sourceQuestionBankIds",
      "numberOfQuestionsPerAttempt",
      "isAvailable",
      "isAssigned",
      // totalUniqueQuestionsInSourceSnapshot is calculated, not directly updated by client.
    ];

    const sanitizedUpdateData: Partial<IQuiz> = {};
    for (const key of allowedUpdateKeys) {
      if (updateData.hasOwnProperty(key)) {
        (sanitizedUpdateData as any)[key] = (updateData as any)[key];
      }
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      restaurantId: restaurantId,
    });

    if (!quiz) {
      throw new AppError("Quiz not found or access denied.", 404);
    }

    const oldIsAvailable = quiz.isAvailable;

    // Apply allowed updates
    Object.assign(quiz, sanitizedUpdateData);

    // If sourceQuestionBankIds or numberOfQuestionsPerAttempt are changing,
    // we must recalculate totalUniqueQuestionsInSourceSnapshot.
    if (
      sanitizedUpdateData.sourceQuestionBankIds ||
      sanitizedUpdateData.numberOfQuestionsPerAttempt
    ) {
      if (
        !quiz.sourceQuestionBankIds ||
        quiz.sourceQuestionBankIds.length === 0
      ) {
        // This case should ideally be prevented by validation if sourceQuestionBankIds becomes empty
        quiz.totalUniqueQuestionsInSourceSnapshot = 0;
      } else {
        const banks = await QuestionBankModel.find({
          _id: {
            $in: quiz.sourceQuestionBankIds.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
          restaurantId: quiz.restaurantId, // Ensure banks belong to the same restaurant
        }).populate<{ questions: IQuestion[] }>("questions");

        if (!banks) {
          // This implies a DB error or an issue with bank IDs if they were just set.
          // Or, if some sourceQuestionBankIds were invalid and resulted in no banks found.
          throw new AppError(
            "Error fetching question banks for snapshot recalculation during update.",
            500
          );
        }

        const uniqueQuestionIdSet = new Set<string>();
        banks.forEach((bank) => {
          if (bank.questions && Array.isArray(bank.questions)) {
            (bank.questions as IQuestion[]).forEach((question) => {
              // Assuming all questions in a bank are active for snapshot purposes
              if (
                question &&
                question._id &&
                !uniqueQuestionIdSet.has(question._id.toString())
              ) {
                uniqueQuestionIdSet.add(question._id.toString());
              }
            });
          }
        });
        quiz.totalUniqueQuestionsInSourceSnapshot = uniqueQuestionIdSet.size;
      }

      // Validate again after recalculation
      if (
        quiz.numberOfQuestionsPerAttempt >
        (quiz.totalUniqueQuestionsInSourceSnapshot ?? 0)
      ) {
        throw new AppError(
          `Update Error: Number of questions per attempt (${
            quiz.numberOfQuestionsPerAttempt
          }) cannot exceed the total number of unique active questions available in the selected banks (${
            quiz.totalUniqueQuestionsInSourceSnapshot ?? 0
          }).`,
          400
        );
      }
    }

    // Mass assignment logic if quiz is becoming available
    // This part needs careful review and likely complete rewrite due to StaffQuizProgress model and QuizResult deprecation plan.
    // Commenting out the actual call for now.
    if (quiz.isAvailable && !oldIsAvailable) {
      console.log(
        `Quiz ${quizId} is being made available. Mass assignment logic would trigger here.`
      );
      // await _assignQuizToAllRestaurantStaff(quiz._id, quiz.restaurantId, quiz.title, quiz.numberOfQuestionsPerAttempt);
      // quiz.isAssigned = true; // Potentially set based on assignment outcome
    }

    try {
      await quiz.save();
      return quiz;
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
  ): Promise<{
    deletedQuizCount: number;
    deletedProgressCount: number;
    deletedAttemptsCount: number;
  }> {
    const useTransactions = process.env.NODE_ENV !== "development";
    let session: mongoose.ClientSession | null = null;

    try {
      if (useTransactions) {
        session = await mongoose.startSession();
        session.startTransaction();
      }

      const quizToDelete = await Quiz.findOne({
        _id: quizId,
        restaurantId: restaurantId,
      }).session(session);

      if (!quizToDelete) {
        throw new AppError(
          "Quiz not found or you do not have permission to delete it.",
          404
        );
      }

      // Delete associated StaffQuizProgress records
      const progressDeletion = await StaffQuizProgress.deleteMany(
        { quizId: quizId, restaurantId: restaurantId },
        { session: session ?? undefined } // Pass session if it exists, else undefined
      );

      // Delete associated QuizAttempt records
      const attemptsDeletion = await QuizAttempt.deleteMany(
        { quizId: quizId, restaurantId: restaurantId },
        { session: session ?? undefined } // Pass session if it exists, else undefined
      );

      // Delete the Quiz itself
      const quizDeletionResult = await Quiz.deleteOne(
        { _id: quizId, restaurantId: restaurantId },
        { session: session ?? undefined } // Pass session if it exists, else undefined
      );

      if (session) {
        await session.commitTransaction();
      }

      return {
        deletedQuizCount: quizDeletionResult.deletedCount || 0,
        deletedProgressCount: progressDeletion.deletedCount || 0,
        deletedAttemptsCount: attemptsDeletion.deletedCount || 0,
      };
    } catch (error: any) {
      if (session) {
        await session.abortTransaction();
      }
      console.error("Error deleting quiz in service:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete quiz and associated data.", 500);
    } finally {
      if (session) {
        session.endSession();
      }
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
      const quiz = await Quiz.findOne({
        _id: quizId,
        restaurantId: restaurantId,
        isAvailable: true, // Staff should only be able to take available quizzes
      })
        // .populate("questions") // REMOVED: Questions are not stored directly in Quiz definition
        .lean();

      if (!quiz) {
        throw new AppError(
          "Quiz not found, is not available, or access denied.",
          404
        );
      }
      // The service now returns the quiz definition.
      // The actual questions for the attempt will be selected by startQuizAttemptService.
      return quiz as IQuiz; // Cast as IQuiz after lean
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
      return await Quiz.find({ restaurantId }).lean(); // Use lean
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
      const availableQuizzes = await Quiz.find(
        { restaurantId: restaurantId, isAvailable: true },
        "_id title description createdAt numberOfQuestionsPerAttempt totalUniqueQuestionsInSourceSnapshot" // Keep this selection
      )
        .sort({ createdAt: -1 })
        .lean();

      const quizzesWithCounts = availableQuizzes.map((q) => ({
        _id: q._id.toString(),
        title: q.title,
        description: q.description,
        createdAt: q.createdAt,
        numQuestions:
          q.totalUniqueQuestionsInSourceSnapshot ??
          q.numberOfQuestionsPerAttempt ??
          0, // Prefer snapshot, fallback to perAttempt
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

  /**
   * Starts a quiz attempt for a staff member.
   * Fetches or creates staff progress, checks daily attempt limits, selects questions.
   * @param staffUserId - The ID of the staff user.
   * @param quizId - The ID of the Quiz definition.
   * @returns Promise<QuestionForQuizAttempt[]> Array of full question objects for the attempt.
   * @throws {AppError} If quiz not found, user not found, daily limit reached, no questions available, etc.
   */
  static async startQuizAttempt(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<QuestionForQuizAttempt[]> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Validate quiz and user
      const quiz = await Quiz.findById(quizId).session(session).lean();
      if (!quiz) {
        throw new AppError("Quiz not found.", 404);
      }
      if (!quiz.isAvailable) {
        throw new AppError("This quiz is currently not available.", 403);
      }

      const staffUser = await User.findById(staffUserId)
        .session(session)
        .lean();
      if (
        !staffUser ||
        staffUser.restaurantId?.toString() !== quiz.restaurantId.toString()
      ) {
        throw new AppError(
          "Staff member not found or not associated with this quiz's restaurant.",
          404
        );
      }
      if (staffUser.role !== "staff") {
        throw new AppError("Only staff members can take quizzes.", 403);
      }

      // 2. Find or create StaffQuizProgress
      let staffProgress = await StaffQuizProgress.findOne({
        staffUserId,
        quizId,
        restaurantId: quiz.restaurantId,
      }).session(session);

      if (!staffProgress) {
        staffProgress = new StaffQuizProgress({
          staffUserId,
          quizId,
          restaurantId: quiz.restaurantId,
          seenQuestionIds: [],
          totalUniqueQuestionsInSource:
            quiz.totalUniqueQuestionsInSourceSnapshot || 0,
          isCompletedOverall: false,
          // questionsAnsweredToday and lastActivityDateForDailyReset will be updated on submission
        });
      } else {
        // If progress exists, check if they've already seen all questions
        if (staffProgress.isCompletedOverall) {
          throw new AppError(
            "You have already completed all unique questions for this quiz.",
            403
          );
        }
      }

      // Refresh totalUniqueQuestionsInSource from quiz model in case it changed
      // This ensures progress reflects the current state of the quiz definition
      if (
        quiz.totalUniqueQuestionsInSourceSnapshot !==
        staffProgress.totalUniqueQuestionsInSource
      ) {
        staffProgress.totalUniqueQuestionsInSource =
          quiz.totalUniqueQuestionsInSourceSnapshot || 0;
        // If the total number of questions decreased, we might need to re-evaluate isCompletedOverall
        // For now, this is implicitly handled by checking against the new total below.
      }

      // 3. Fetch all unique, valid, active question IDs from the quiz's source banks
      const allActiveQuestionIdsInBanks =
        await getUniqueValidQuestionIdsFromQuestionBanks(
          quiz.sourceQuestionBankIds as Types.ObjectId[], // Cast needed if sourceQuestionBankIds is not strictly ObjectId[]
          quiz.restaurantId
        );

      if (allActiveQuestionIdsInBanks.length === 0) {
        // This means the source banks are empty or questions were deleted.
        // Update staff progress if necessary.
        staffProgress.isCompletedOverall = true; // No questions to attempt
        await staffProgress.save({ session });
        await session.commitTransaction();
        session.endSession();
        throw new AppError(
          "No questions available for this quiz at the moment.",
          404
        );
      }

      // 4. Filter out already seen questions
      const seenQuestionIdsSet = new Set(
        staffProgress.seenQuestionIds.map((id) => id.toString())
      );
      let availableQuestionIds = allActiveQuestionIdsInBanks.filter(
        (id) => !seenQuestionIdsSet.has(id.toString())
      );

      // 5. Handle case where all unique questions have been seen
      if (availableQuestionIds.length === 0) {
        staffProgress.isCompletedOverall = true;
        await staffProgress.save({ session });
        await session.commitTransaction();
        session.endSession();
        // User has seen all questions from the current pool
        throw new AppError(
          "You have seen all available questions for this quiz. Congratulations!",
          403
        );
      }

      // 6. Randomly select questions for the attempt
      _shuffleArray(availableQuestionIds); // Shuffle in place
      const questionsToAttemptCount = Math.min(
        availableQuestionIds.length,
        quiz.numberOfQuestionsPerAttempt
      );
      const finalQuestionIdsForAttempt = availableQuestionIds.slice(
        0,
        questionsToAttemptCount
      );

      if (
        finalQuestionIdsForAttempt.length === 0 &&
        quiz.numberOfQuestionsPerAttempt > 0
      ) {
        // This case should ideally be caught by earlier checks (allActive or availableQuestionIds being empty)
        staffProgress.isCompletedOverall = true; // Mark as completed if truly no questions can be served
        await staffProgress.save({ session });
        await session.commitTransaction();
        session.endSession();
        throw new AppError(
          "No new questions available for this attempt, quiz marked as completed.",
          403
        );
      }

      // 7. Fetch full question data for the selected IDs
      const selectedQuestionsData = await QuestionModel.find({
        _id: { $in: finalQuestionIdsForAttempt },
        restaurantId: quiz.restaurantId, // Ensure questions belong to the same restaurant
      })
        .populate("categories") // If categories are ObjectIds referencing another model
        .session(session)
        .lean(); // Use lean for performance and easier manipulation

      // Ensure the number of questions found matches the number of IDs
      if (selectedQuestionsData.length !== finalQuestionIdsForAttempt.length) {
        // This might indicate some selected question IDs were invalid or deleted recently
        // Log this discrepancy for investigation
        console.warn(
          `Mismatch in fetched questions for quiz ${quizId}. Expected ${finalQuestionIdsForAttempt.length}, got ${selectedQuestionsData.length}`
        );
        // Proceed with fetched questions, or throw error if critical
        if (
          selectedQuestionsData.length === 0 &&
          quiz.numberOfQuestionsPerAttempt > 0
        ) {
          staffProgress.isCompletedOverall = true;
          await staffProgress.save({ session });
          await session.commitTransaction();
          session.endSession();
          throw new AppError(
            "Could not retrieve questions for the attempt. Please try again later.",
            500
          );
        }
      }

      // 8. Prepare questions for the client (strip sensitive data like isCorrect from options)
      const questionsForClient: QuestionForQuizAttempt[] =
        selectedQuestionsData.map((qDoc) => {
          // qDoc is of type QuestionDocument (IQuestion) due to .lean() and model typing
          // Mongoose subdocuments in arrays (like options) will have _id
          const optionsForClient = qDoc.options.map((opt) => ({
            _id: opt._id as Types.ObjectId, // opt._id is definitely an ObjectId here
            text: opt.text,
          }));

          return {
            _id: qDoc._id as Types.ObjectId,
            questionText: qDoc.questionText,
            questionType: qDoc.questionType,
            options: optionsForClient,
            categories: qDoc.categories?.map((c) =>
              typeof c === "string" ? c : (c as any).name || String(c)
            ), // Handle populated or string categories
            difficulty: qDoc.difficulty,
            // Add other fields as needed by client, e.g., question number/order for display
          };
        });

      // Note: We are NOT creating a QuizAttempt record here.
      // That happens in submitQuizAttemptService.
      // We also don't add to seenQuestionIds here; that also happens upon submission.
      // This service is only for fetching the questions for a new attempt.

      await session.commitTransaction();
      session.endSession();
      return questionsForClient;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      if (error instanceof AppError) throw error;
      console.error("Error in startQuizAttemptService:", error);
      throw new AppError("Failed to start quiz attempt.", 500);
    }
  }

  /**
   * Submits a staff member's quiz attempt, grades it, and updates progress.
   * @param staffUserId - The ID of the staff user.
   * @param quizId - The ID of the Quiz definition.
   * @param attemptData - The data submitted for the attempt, including answers.
   * @returns Promise<{ score: number; totalQuestionsAttempted: number; questions: Array<{ questionId: string; isCorrect: boolean; correctAnswer?: any }> }>
   * @throws {AppError} If quiz/user invalid, or other processing errors.
   */
  static async submitQuizAttempt(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId,
    attemptData: QuizAttemptSubmitData
  ): Promise<{
    score: number;
    totalQuestionsAttempted: number;
    attemptId: Types.ObjectId;
    questions: Array<{
      questionId: string;
      answerGiven: any;
      isCorrect: boolean;
      correctAnswer?: any; // Optionally return correct answer for review
    }>;
  }> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Validate Quiz and User (similar to startQuizAttempt, but quiz doesn't need to be available to submit)
      const quiz = await Quiz.findById(quizId).session(session).lean();
      if (!quiz) {
        throw new AppError("Quiz not found.", 404);
      }
      const staffUser = await User.findById(staffUserId)
        .session(session)
        .lean();
      if (
        !staffUser ||
        staffUser.role !== "staff" ||
        staffUser.restaurantId?.toString() !== quiz.restaurantId.toString()
      ) {
        throw new AppError(
          "Staff user not found or not authorized for this quiz.",
          403
        );
      }

      // 2. Fetch StaffQuizProgress (must exist if they started an attempt)
      const staffProgress = await StaffQuizProgress.findOne({
        staffUserId: staffUserId,
        quizId: quizId,
        restaurantId: quiz.restaurantId,
      }).session(session);

      if (!staffProgress) {
        throw new AppError(
          "Quiz progress not found. Please start the quiz first.",
          404
        );
      }

      // 3. Grade the attempt
      let score = 0;
      const gradedQuestionsDetails: any[] = [];
      const questionIdsInAttempt = attemptData.questions.map(
        (q) => new Types.ObjectId(q.questionId)
      );

      // Fetch actual questions from DB to get correct answers for grading
      const actualQuestions = await QuestionModel.find({
        _id: { $in: questionIdsInAttempt },
      })
        .session(session)
        .lean();

      const actualQuestionsMap = new Map(
        actualQuestions.map((q) => [q._id.toString(), q as QuestionDocument])
      );

      for (const attemptedQuestion of attemptData.questions) {
        const questionDoc = actualQuestionsMap.get(
          attemptedQuestion.questionId
        );
        let isCorrect = false;
        // let correctAnswerForClient: string | string[] | undefined = undefined; // More flexible for MCM

        if (questionDoc) {
          // TODO: Make grading more robust, especially for different answerGiven formats (e.g., index vs text).
          const correctAnswerDetails = {
            text: "",
            texts: [] as string[],
          };

          if (
            questionDoc.questionType === "multiple-choice-single" ||
            questionDoc.questionType === "true-false"
          ) {
            const correctOption = questionDoc.options.find(
              (opt) => opt.isCorrect
            );
            if (correctOption) {
              isCorrect = attemptedQuestion.answerGiven === correctOption.text;
              correctAnswerDetails.text = correctOption.text;
            } else {
              console.warn(
                `Question ${questionDoc._id} (type: ${questionDoc.questionType}) has no correct option.`
              );
            }
          } else if (questionDoc.questionType === "multiple-choice-multiple") {
            const correctOptions = questionDoc.options.filter(
              (opt) => opt.isCorrect
            );
            correctAnswerDetails.texts = correctOptions.map((opt) => opt.text);
            if (
              Array.isArray(attemptedQuestion.answerGiven) &&
              correctAnswerDetails.texts.length > 0
            ) {
              const givenAnswersSet = new Set(
                attemptedQuestion.answerGiven.map(String)
              );
              const correctAnswersSet = new Set(correctAnswerDetails.texts);
              isCorrect =
                givenAnswersSet.size === correctAnswersSet.size &&
                [...givenAnswersSet].every((answer) =>
                  correctAnswersSet.has(answer)
                );
            } else if (
              correctAnswerDetails.texts.length === 0 &&
              (!attemptedQuestion.answerGiven ||
                (Array.isArray(attemptedQuestion.answerGiven) &&
                  attemptedQuestion.answerGiven.length === 0))
            ) {
              // If no correct options and no answer given, consider it correct (e.g. "select none that are correct" scenario if that was a thing)
              // Or, more likely, this case means an ill-defined question. For now, let's say not correct unless explicitly matched.
              isCorrect = false; // Or true if empty answer for empty correct set is valid.
            }
          }

          if (isCorrect) score++;
          gradedQuestionsDetails.push({
            questionId: questionDoc._id,
            answerGiven: attemptedQuestion.answerGiven,
            isCorrect: isCorrect,
            // Storing correct answer texts for later use in response preparation
            _correctAnswerText: correctAnswerDetails.text,
            _correctAnswerTexts: correctAnswerDetails.texts,
          });
        } else {
          console.warn(
            `Question ID ${attemptedQuestion.questionId} from attempt not found in DB.`
          );
          gradedQuestionsDetails.push({
            questionId: new Types.ObjectId(attemptedQuestion.questionId),
            answerGiven: attemptedQuestion.answerGiven,
            isCorrect: false,
            _correctAnswerText: undefined,
            _correctAnswerTexts: [],
          });
        }
      }

      // 4. Create QuizAttempt document
      const newQuizAttempt = new QuizAttempt({
        staffUserId: staffUserId,
        quizId: quizId,
        restaurantId: quiz.restaurantId,
        questionsPresented: gradedQuestionsDetails, // These are already {questionId, answerGiven, isCorrect}
        score: score,
        attemptDate: new Date(), // Submission time
        durationInSeconds: attemptData.durationInSeconds,
      });
      await newQuizAttempt.save({ session });

      // 5. Update StaffQuizProgress
      staffProgress.seenQuestionIds = Array.from(
        new Set([
          ...staffProgress.seenQuestionIds.map((id) => id.toString()),
          ...gradedQuestionsDetails.map((q) => q.questionId.toString()),
        ])
      ).map((id) => new Types.ObjectId(id));

      staffProgress.lastAttemptTimestamp = newQuizAttempt.attemptDate;

      // Update daily answered questions (re-evaluate if needed based on strict one-attempt-per-day)
      const currentDateStrForDailyReset = newQuizAttempt.attemptDate
        .toISOString()
        .split("T")[0];
      if (
        staffProgress.lastActivityDateForDailyReset
          ?.toISOString()
          .split("T")[0] === currentDateStrForDailyReset
      ) {
        staffProgress.questionsAnsweredToday =
          (staffProgress.questionsAnsweredToday ?? 0) +
          gradedQuestionsDetails.length;
      } else {
        staffProgress.questionsAnsweredToday = gradedQuestionsDetails.length;
      }
      staffProgress.lastActivityDateForDailyReset = newQuizAttempt.attemptDate;

      if (
        staffProgress.totalUniqueQuestionsInSource > 0 &&
        staffProgress.seenQuestionIds.length >=
          staffProgress.totalUniqueQuestionsInSource
      ) {
        staffProgress.isCompletedOverall = true;
      }
      await staffProgress.save({ session });

      await session.commitTransaction();

      // 6. Prepare and return results
      // For client review, map gradedQuestionsDetails to include correct answers if desired
      const clientResponseQuestions = gradedQuestionsDetails.map((detail) => {
        let correctAnswerResponse: string | string[] | undefined = undefined;
        const questionDoc = actualQuestionsMap.get(
          detail.questionId.toString()
        );
        if (questionDoc) {
          if (
            questionDoc.questionType === "multiple-choice-single" ||
            questionDoc.questionType === "true-false"
          ) {
            correctAnswerResponse = detail._correctAnswerText;
          } else if (questionDoc.questionType === "multiple-choice-multiple") {
            correctAnswerResponse = detail._correctAnswerTexts;
            if (
              Array.isArray(correctAnswerResponse) &&
              correctAnswerResponse.length === 0
            ) {
              correctAnswerResponse = undefined; // Don't send empty array for no correct answers
            }
          }
        }
        return {
          questionId: detail.questionId.toString(),
          answerGiven: detail.answerGiven,
          isCorrect: detail.isCorrect,
          correctAnswer: correctAnswerResponse,
        };
      });

      return {
        score: score,
        totalQuestionsAttempted: gradedQuestionsDetails.length,
        attemptId: newQuizAttempt._id,
        questions: clientResponseQuestions,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      if (error instanceof AppError) throw error;
      console.error("Error in submitQuizAttemptService:", error);
      throw new AppError("Failed to submit quiz attempt.", 500);
    }
  }

  /**
   * Retrieves the quiz progress for a specific staff member on a specific quiz.
   * @param staffUserId - The ID of the staff user.
   * @param quizId - The ID of the Quiz definition.
   * @returns Promise<IStaffQuizProgress | null> The staff quiz progress document, or null if not found.
   * @throws {AppError} If database query fails.
   */
  static async getStaffQuizProgress(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<IStaffQuizProgress | null> {
    try {
      const staffProgress = await StaffQuizProgress.findOne({
        staffUserId: staffUserId,
        quizId: quizId,
      })
        // Optionally populate fields if needed by the dashboard:
        // .populate("staffUserId", "name email") // Example
        // .populate("quizId", "title description") // Example
        .lean(); // Use lean for performance if not modifying the doc

      if (!staffProgress) {
        // It's not necessarily an error if progress doesn't exist yet,
        // client can interpret null as "not started".
        return null;
      }
      return staffProgress as IStaffQuizProgress;
    } catch (error: any) {
      console.error(
        `Error fetching staff quiz progress for user ${staffUserId}, quiz ${quizId}:`,
        error
      );
      throw new AppError("Failed to fetch staff quiz progress.", 500);
    }
  }

  /**
   * Retrieves all staff quiz progress records for a specific quiz within a restaurant.
   * @param restaurantId - The ID of the restaurant.
   * @param quizId - The ID of the Quiz definition.
   * @returns Promise<IStaffQuizProgress[]> An array of staff quiz progress documents.
   * @throws {AppError} If database query fails.
   */
  static async getRestaurantQuizStaffProgress(
    restaurantId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<IStaffQuizProgress[]> {
    try {
      const allStaffProgress = await StaffQuizProgress.find({
        restaurantId: restaurantId,
        quizId: quizId,
      })
        .populate<{ staffUserId: IUser }>({
          path: "staffUserId",
          select: "firstName lastName email", // Select fields needed for display
        })
        // Optionally populate quizId if quiz details are needed alongside progress
        // .populate("quizId", "title")
        .sort({ "staffUserId.lastName": 1, "staffUserId.firstName": 1 }) // Sort by staff name
        .lean();

      return allStaffProgress as IStaffQuizProgress[];
    } catch (error: any) {
      console.error(
        `Error fetching all staff progress for quiz ${quizId} in restaurant ${restaurantId}:`,
        error
      );
      throw new AppError("Failed to fetch staff progress for the quiz.", 500);
    }
  }
}

export default QuizService;

export interface CreateQuizFromBanksData {
  title: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  questionBankIds: string[]; // Array of QuestionBank IDs
  numberOfQuestionsPerAttempt: number; // RENAMED from numberOfQuestions
  createdBy?: mongoose.Types.ObjectId; // If tracking user who initiated creation, made optional
  isAvailable?: boolean; // Added to allow setting availability on creation
}

export const generateQuizFromBanksService = async (
  data: CreateQuizFromBanksData
): Promise<IQuiz> => {
  const {
    title,
    description,
    restaurantId,
    questionBankIds,
    numberOfQuestionsPerAttempt, // UPDATED
    createdBy,
    isAvailable, // ADDED
  } = data;

  if (!title || title.trim() === "") {
    throw new AppError("Quiz title is required.", 400);
  }
  if (!questionBankIds || questionBankIds.length === 0) {
    throw new AppError("At least one question bank must be selected.", 400);
  }
  if (numberOfQuestionsPerAttempt <= 0) {
    throw new AppError(
      "Number of questions per attempt must be greater than zero.",
      400
    );
  }

  // 1. Fetch validated Question Banks
  // We don't need to populate questions here anymore for the quiz definition itself,
  // but we do need to access their questions to count them for the snapshot.
  const banks = await QuestionBankModel.find({
    _id: { $in: questionBankIds.map((id) => new mongoose.Types.ObjectId(id)) },
    restaurantId: restaurantId,
  }).populate<{ questions: IQuestion[] }>("questions"); // Populate questions to calculate snapshot

  if (!banks || banks.length === 0) {
    throw new AppError(
      "No valid question banks found for the provided IDs and restaurant.",
      404
    );
  }
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

  // 2. Calculate totalUniqueQuestionsInSourceSnapshot
  let totalUniqueActiveQuestions = 0;
  const uniqueQuestionIdSet = new Set<string>();

  banks.forEach((bank) => {
    if (bank.questions && Array.isArray(bank.questions)) {
      (bank.questions as IQuestion[]).forEach((question) => {
        // Assuming IQuestion has an isActive field, or consider all questions active by default
        // For now, let's assume all questions in fetched banks are usable/active
        // Or add a check like: if (question && question._id && question.isActive && !uniqueQuestionIdSet.has(question._id.toString())) {
        if (
          question &&
          question._id &&
          !uniqueQuestionIdSet.has(question._id.toString())
        ) {
          uniqueQuestionIdSet.add(question._id.toString());
        }
      });
    }
  });
  totalUniqueActiveQuestions = uniqueQuestionIdSet.size;

  if (totalUniqueActiveQuestions === 0) {
    throw new AppError(
      "The selected question banks do not contain any unique (active) questions.",
      400
    );
  }

  // Validate if numberOfQuestionsPerAttempt exceeds available unique questions
  if (totalUniqueActiveQuestions < numberOfQuestionsPerAttempt) {
    throw new AppError(
      `Number of questions per attempt (${numberOfQuestionsPerAttempt}) cannot exceed the total number of unique active questions available in the selected banks (${totalUniqueActiveQuestions}).`,
      400
    );
  }

  // 3. Create and save the new quiz document (Quiz Definition)
  const newQuizData: Partial<IQuiz> = {
    title,
    description: description || undefined, // Use undefined if empty for cleaner DB entry
    restaurantId,
    sourceQuestionBankIds: banks.map(
      (bank) => bank._id as mongoose.Types.ObjectId
    ),
    numberOfQuestionsPerAttempt: numberOfQuestionsPerAttempt, // Use the input value directly
    totalUniqueQuestionsInSourceSnapshot: totalUniqueActiveQuestions, // Store the calculated snapshot
    isAssigned: false, // Default for a new quiz definition
    isAvailable: isAvailable !== undefined ? isAvailable : false, // Default to false if not provided
  };

  // createdBy logic can be added here if QuizModel is updated to support it
  // if (createdBy) {
  //   newQuizData.createdBy = createdBy;
  // }

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

// Export static methods from QuizService class as standalone functions
// This matches the naming convention from the refactor plan (e.g., startQuizAttemptService)
// and how generateQuizFromBanksService is exported.

// Ensure the QuizService class is defined above these exports
// class QuizService { ... static methods ... }

export const startQuizAttempt = QuizService.startQuizAttempt;
export const submitQuizAttempt = QuizService.submitQuizAttempt;
export const getStaffQuizProgress = QuizService.getStaffQuizProgress;
export const getRestaurantQuizStaffProgress =
  QuizService.getRestaurantQuizStaffProgress;
// Add any other static methods from QuizService that need to be exported similarly
