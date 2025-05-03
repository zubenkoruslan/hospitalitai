import mongoose, { Types } from "mongoose";
import Quiz, { IQuiz, IQuestion } from "../models/Quiz";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import User from "../models/User"; // Import User model
// Import other models if needed (e.g., Menu, User, QuizResult)
import { AppError } from "../utils/errorHandler";

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

        questions.push({
          text: questionText,
          choices: finalChoices, // Already sliced/padded to 4
          correctAnswer: correctAnswerIndex,
          menuItemId: item._id as Types.ObjectId,
        });
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
  static async createQuiz(quizData: GeneratedQuizData): Promise<IQuiz> {
    const newQuiz = new Quiz({
      ...quizData, // Spread the generated data
      isAssigned: false, // Default value
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
      // Use findOne + save() to ensure hooks and full validation run
      const quiz = await Quiz.findOne({
        _id: quizId,
        restaurantId: restaurantId,
      });

      if (!quiz) {
        throw new AppError("Quiz not found or access denied", 404);
      }

      // Apply updates - check which fields are allowed to be updated
      if (updateData.title !== undefined) quiz.title = updateData.title;
      if (updateData.menuItemIds !== undefined)
        quiz.menuItemIds = updateData.menuItemIds as Types.ObjectId[];
      if (updateData.questions !== undefined)
        quiz.questions = updateData.questions;
      // Do not allow updating restaurantId or isAssigned directly here

      const updatedQuiz = await quiz.save();
      return updatedQuiz;
    } catch (error: any) {
      console.error("Error updating quiz in service:", error);
      if (error instanceof AppError) throw error; // Re-throw 404
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
   * Assigns a quiz to specified staff members by creating pending QuizResult entries.
   *
   * @param quizId - The ID of the quiz to assign.
   * @param staffIds - An array of staff user IDs (as strings) to assign the quiz to.
   * @param restaurantId - The ID of the restaurant performing the assignment.
   * @returns A promise resolving to an object containing the count of successful assignments and details of the created/pending results.
   * @throws {AppError} If the quiz is not found (404), if any staff ID is invalid or staff doesn't belong to restaurant (400),
   *                    if Mongoose validation fails (400), or for other unexpected database errors (500).
   */
  static async assignQuizToStaff(
    quizId: Types.ObjectId,
    staffIds: string[],
    restaurantId: Types.ObjectId
  ): Promise<{ assignedCount: number; results: Partial<IQuizResult>[] }> {
    try {
      // 1. Verify the quiz exists and belongs to this restaurant
      const quiz = await Quiz.findOne({
        _id: quizId,
        restaurantId: restaurantId,
      });

      if (!quiz) {
        throw new AppError(
          "Quiz not found or not accessible for this restaurant",
          404
        );
      }

      // Convert staffIds strings to ObjectIds for DB query
      const staffObjectIds = staffIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      // 2. Verify all staff members belong to this restaurant
      const validStaffMembers = await User.find({
        _id: { $in: staffObjectIds },
        restaurantId: restaurantId,
        role: "staff",
      })
        .select("_id name")
        .lean();

      if (validStaffMembers.length !== staffIds.length) {
        const requestedSet = new Set(staffIds);
        const validSet = new Set(
          validStaffMembers.map((s) => s._id.toString())
        );
        const invalidIds = staffIds.filter((id: string) => !validSet.has(id));
        throw new AppError(
          `One or more staff members do not exist or do not belong to this restaurant. Invalid IDs: ${invalidIds.join(
            ", "
          )}`,
          400
        );
      }

      // 3. Create pending quiz results (Notifications Removed)
      const quizResults = [];
      // const notificationPromises = []; // Removed

      for (const staff of validStaffMembers) {
        // Upsert: Create result if not exists and status isn't completed
        const result = await QuizResult.findOneAndUpdate(
          {
            quizId: quiz._id,
            userId: staff._id,
            restaurantId: restaurantId,
            status: { $ne: "completed" },
          },
          {
            $setOnInsert: {
              // Only set these fields on insert
              status: "pending",
              startedAt: null,
              answers: [],
              score: 0,
              totalQuestions: quiz.questions.length,
              restaurantId: restaurantId, // Redundant but ensures consistency
              retakeCount: 0,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );

        if (result) {
          quizResults.push(result);
          // Create notification (REMOVED)
          /*
          try {
            const notification =
              notificationService.createAssignmentNotification(
                staff._id as mongoose.Types.ObjectId,
                quiz._id as mongoose.Types.ObjectId,
                quiz.title
              );
            notificationPromises.push(notification);
          } catch (notificationError) {
            console.error(
              "Failed to create assignment notification for staff",
              staff._id,
              ":",
              notificationError
            );
          }
          */
        } else {
          console.warn(
            `QuizResult skipped for user ${staff._id} (quiz ${quiz._id}) - likely already completed.`
          );
        }
      }

      // Wait for notifications (REMOVED)
      // await Promise.allSettled(notificationPromises);

      // 4. Mark the quiz as assigned (only if successfully assigned to at least one person)
      if (quizResults.length > 0 && !quiz.isAssigned) {
        quiz.isAssigned = true;
        await quiz.save();
      }

      return {
        assignedCount: validStaffMembers.length,
        results: quizResults.map((r) => ({
          _id: r._id,
          userId: r.userId,
          status: r.status,
        })),
      };
    } catch (error: any) {
      console.error("Error assigning quiz in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "CastError") {
        throw new AppError("One or more staff IDs are invalid.", 400);
      }
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(
          `Validation failed during result creation: ${error.message}`,
          400
        );
      }
      throw new AppError("Failed to assign quiz.", 500);
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
      const availableQuizzes = await Quiz.find(
        { restaurantId },
        "_id title description createdAt questions"
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
