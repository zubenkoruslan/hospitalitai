import mongoose, { Types } from "mongoose";
import Quiz, { IQuiz, IQuestion } from "../models/Quiz";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import User from "../models/User"; // Import User model
import notificationService from "./notificationService"; // Import notificationService
// Import other models if needed (e.g., Menu, User, QuizResult)
import { AppError } from "../utils/errorHandler";

// --- Helper Functions (Moved from routes/quiz.ts) ---

// Shuffle array in place (Fisher-Yates algorithm)
// Consider moving to a general utils file if used elsewhere
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
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
   * Generates incorrect choices (distractor strings) for ingredient list questions.
   * Made static as it doesn't rely on instance state, but could be a regular method too.
   * @param correctItems Array of correct ingredient strings.
   * @param restaurantId The ID of the restaurant to scope the search for distractors.
   * @param excludeItemId The ID of the item whose ingredients are correct, to exclude it from distractor generation.
   * @returns Promise<string[]> Array of distractor strings (up to 3).
   */
  private static async generateIngredientDistractors(
    correctItems: string[],
    restaurantId: Types.ObjectId,
    excludeItemId: Types.ObjectId
  ): Promise<string[]> {
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
    shuffleArray(potentialDistractorStrings);
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
        ) {
          distractors.push(currentPlaceholder);
        }
      }
      while (distractors.length < 3) {
        distractors.push(`Placeholder ${distractors.length + 1}`);
      }
    }

    return distractors.slice(0, 3);
  }

  /**
   * Generates quiz questions based on menu items from selected menus.
   * @param title The title for the quiz.
   * @param menuIds Array of menu IDs (as strings) to source items from.
   * @param restaurantId The ID of the restaurant.
   * @returns Promise<GeneratedQuizData> Object containing generated quiz data.
   */
  static async generateQuizQuestions(
    title: string,
    menuIds: string[],
    restaurantId: Types.ObjectId
  ): Promise<GeneratedQuizData> {
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
      if (potentialTypes.length === 0) potentialTypes.push("generic_fallback");

      const randomType =
        potentialTypes[Math.floor(Math.random() * potentialTypes.length)];

      let questionText = "";
      let choices: string[] = [];
      let correctAnswerIndex = -1;
      let questionGenerated = false;

      if (randomType === "ingredients" && currentIngredients.length > 0) {
        questionText = `What are the main ingredients in ${item.name}?`;
        const correctChoice = currentIngredients.sort().join(", "); // Sort for consistent correct answer format
        const distractors = await this.generateIngredientDistractors(
          currentIngredients,
          restaurantId,
          item._id as Types.ObjectId
        );
        choices = shuffleArray([correctChoice, ...distractors]);
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
        shuffleArray(dummyOptions);
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
      if (correctAnswerIndex < 0 || correctAnswerIndex >= finalChoices.length) {
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
  }

  /**
   * Creates and saves a new quiz.
   */
  static async createQuiz(quizData: GeneratedQuizData): Promise<IQuiz> {
    const newQuiz = new Quiz({
      ...quizData, // Spread the generated data
      isAssigned: false, // Default value
    });
    try {
      return await newQuiz.save();
    } catch (error) {
      console.error("Error saving quiz in service:", error);
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      // Handle potential duplicate key errors if title/restaurantId is unique
      if ((error as any).code === 11000) {
        throw new AppError(
          "A quiz with this title already exists for the restaurant.",
          409
        ); // 409 Conflict
      }
      throw error;
    }
  }

  /**
   * Updates an existing quiz.
   */
  static async updateQuiz(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    updateData: Partial<IQuiz> // Expect partial data like title, menuItemIds, questions
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
    } catch (error) {
      console.error("Error updating quiz in service:", error);
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      // Handle potential duplicate key errors if title/restaurantId is unique
      if ((error as any).code === 11000) {
        throw new AppError(
          "A quiz with this title already exists for the restaurant.",
          409
        );
      }
      throw error;
    }
  }

  /**
   * Deletes a quiz and its associated results.
   * TODO: Consider wrapping in a transaction.
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
    } catch (error) {
      console.error("Error deleting quiz in service:", error);
      // Don't expose raw DB errors
      throw new AppError("Failed to delete quiz and associated results.", 500);
    }
  }

  /**
   * Assigns a quiz to specified staff members.
   * Creates pending results and notifications.
   * TODO: Consider wrapping in a transaction.
   */
  static async assignQuizToStaff(
    quizId: Types.ObjectId,
    staffIds: string[], // Keep as string array from request body
    restaurantId: Types.ObjectId
  ): Promise<{ assignedCount: number; results: Partial<IQuizResult>[] }> {
    // Note: Transactions would make this safer.
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

      // 3. Create pending quiz results and notifications
      const quizResults = [];
      const notificationPromises = [];

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
          // Check if result was created/found
          quizResults.push(result);
          // Create notification only if a result was created/pending
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
        } else {
          console.warn(
            `QuizResult skipped for user ${staff._id} (quiz ${quiz._id}) - likely already completed.`
          );
        }
      }

      // Wait for all notifications to potentially be created
      // Note: If a notification fails, the assignment still proceeds
      await Promise.allSettled(notificationPromises);

      // 4. Mark the quiz as assigned (only if successfully assigned to at least one person)
      if (quizResults.length > 0 && !quiz.isAssigned) {
        quiz.isAssigned = true;
        await quiz.save();
      }

      return {
        assignedCount: validStaffMembers.length, // Count attempted assignments
        results: quizResults.map((r) => ({
          // Return minimal info about created/pending results
          _id: r._id,
          userId: r.userId,
          status: r.status,
        })),
      };
    } catch (error) {
      console.error("Error assigning quiz in service:", error);
      // Handle specific errors (like validation) if needed, otherwise generic
      if (error instanceof AppError) throw error; // Re-throw known AppErrors
      throw new AppError("Failed to assign quiz.", 500);
    }
  }

  /**
   * Retrieves a specific quiz for a staff member to take, excluding answers.
   */
  static async getQuizForTaking(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<IQuiz> {
    // Return full IQuiz but without answers
    const quiz = await Quiz.findOne(
      { _id: quizId, restaurantId: restaurantId },
      { "questions.correctAnswer": 0 } // Projection
    ).lean(); // Use lean as we are just reading

    if (!quiz) {
      throw new AppError(
        "Quiz not found or not accessible for this restaurant.",
        404
      );
    }
    // Since lean() returns a plain object, we need to cast it back
    // Be cautious with casting, ensure the projection matches IQuiz structure (minus answers)
    return quiz as IQuiz;
  }

  /**
   * Retrieves all quizzes associated with a restaurant owner.
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
   * Retrieves quizzes available for a staff member, including question count.
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
}

export default QuizService;
