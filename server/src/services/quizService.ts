import mongoose, { Types } from "mongoose";
import QuizModel from "../models/QuizModel"; // Default import
import { IQuiz } from "../models/QuizModel"; // Named import for interface
import { IQuestion } from "../models/QuestionModel";
import MenuItem from "../models/MenuItem"; // Removed IMenuItem
import QuizResult from "../models/QuizResult"; // Removed IQuizResult
import User, { IUser } from "../models/User"; // Import User model AND IUser interface
import Restaurant from "../models/Restaurant"; // ADDED: Import Restaurant model
import { IRole } from "../models/RoleModel"; // ADDED: Import IRole for populate type
// Import other models if needed (e.g., Menu, User, QuizResult)
import { AppError } from "../utils/errorHandler";
import QuestionBankModel from "../models/QuestionBankModel"; // Removed IQuestionBank
import StaffQuizProgress, {
  IStaffQuizProgress,
} from "../models/StaffQuizProgress";
import QuestionModel, {
  IQuestion as QuestionDocument,
} from "../models/QuestionModel"; // Renamed to avoid conflict with IQuestion from QuestionBankModel if any
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";
import { getUniqueValidQuestionIdsFromQuestionBanks } from "./questionBankService"; // Added import
import {
  IQuizAttemptSummary,
  ServerSubmitAttemptResponse,
  ServerGradedQuestion,
  ServerCorrectAnswerDetails,
} from "../types/quizTypes"; // Ensured import
import { ServerQuestionOption } from "../types/questionTypes"; // CHANGED

// Define a type for Quiz with populated targetRoles
export interface IPopulatedQuiz extends Omit<IQuiz, "targetRoles"> {
  targetRoles?: IRole[];
}

// ADDED: Interface for creating quiz from banks
export interface CreateQuizFromBanksData {
  title: string;
  description?: string;
  restaurantId: Types.ObjectId;
  questionBankIds: string[]; // or Types.ObjectId[] depending on what the service expects
  numberOfQuestionsPerAttempt: number;
  targetRoles?: Types.ObjectId[]; // ADDED: For assigning roles during quiz creation
  // createdBy?: Types.ObjectId; // Optional
}

// New interface for progress with average score
export interface IStaffQuizProgressWithAverageScore extends IStaffQuizProgress {
  averageScore?: number | null;
}

// Plain interface for lean StaffQuizProgress objects
export interface PlainIStaffQuizProgress {
  _id: Types.ObjectId;
  staffUserId: Types.ObjectId | IUser; // Could be IUser if populated
  quizId: Types.ObjectId | IQuiz; // Could be IQuiz if populated
  restaurantId: Types.ObjectId | IUser; // Could be IUser if populated
  seenQuestionIds: Types.ObjectId[] | QuestionDocument[]; // Corrected IQuestion to QuestionDocument
  totalUniqueQuestionsInSource: number;
  isCompletedOverall: boolean;
  lastAttemptTimestamp?: Date;
  // questionsAnsweredToday?: number; // REMOVED
  // lastActivityDateForDailyReset?: Date; // REMOVED
  createdAt?: Date;
  updatedAt?: Date;
}

// ADDED: Interface for the new service method's return value
export interface IncorrectQuestionDetailForAttempt {
  questionText: string;
  userAnswer: string; // Textual representation of user's answer
  correctAnswer: string; // Textual representation of correct answer
}

export interface QuizAttemptDetailsWithIncorrects {
  _id: string; // Attempt ID
  quizId: string;
  quizTitle: string;
  staffUserId: string; // Changed from userId
  score: number;
  totalQuestions: number;
  attemptDate: Date;
  incorrectQuestions: IncorrectQuestionDetailForAttempt[];
}

// ADDED: New return type for getStaffQuizProgress
export interface IStaffQuizProgressWithAttempts
  extends PlainIStaffQuizProgress {
  averageScore: number | null;
  attempts: IQuizAttemptSummary[];
  staffUserId: IUser; // Ensure populated type
  quizId: IQuiz; // Ensure populated type
}

// ADDED: Interface for individual attempt summary

// ADDED: Interface for individual staff member's progress on a quiz (for restaurant view)
export interface IStaffMemberQuizProgressDetails {
  staffMember: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    professionalRole?: string;
  };
  quizTitle: string; // From the specific quiz being queried
  progress?: Pick<
    PlainIStaffQuizProgress,
    | "isCompletedOverall"
    | "seenQuestionIds"
    | "totalUniqueQuestionsInSource"
    | "lastAttemptTimestamp"
  > | null;
  averageScoreForQuiz: number | null;
  attempts: IQuizAttemptSummary[];
  numberOfAttempts: number;
}

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
interface _GeneratedQuizData {
  // Prefixed GeneratedQuizData
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
  averageScore?: number | null;
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

export class QuizService {
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
  ): Promise<IPopulatedQuiz | null> {
    // 0. Fetch the quiz before update to check its current state
    const quizBeforeUpdate = await QuizModel.findOne({
      _id: quizId,
      restaurantId,
    }).lean<IQuiz>();

    if (!quizBeforeUpdate) {
      throw new AppError("Quiz not found to update.", 404);
    }

    // 1. Additional validation/transformation for updateData
    if (updateData.sourceQuestionBankIds) {
      const uniqueQuestionIdsFromSource =
        await getUniqueValidQuestionIdsFromQuestionBanks(
          updateData.sourceQuestionBankIds,
          restaurantId
        );
      updateData.totalUniqueQuestionsInSourceSnapshot =
        uniqueQuestionIdsFromSource.length;

      if (
        updateData.numberOfQuestionsPerAttempt &&
        updateData.numberOfQuestionsPerAttempt >
          updateData.totalUniqueQuestionsInSourceSnapshot
      ) {
        throw new AppError(
          `Number of questions per attempt (${updateData.numberOfQuestionsPerAttempt}) cannot exceed the total unique questions (${updateData.totalUniqueQuestionsInSourceSnapshot}) in the new source banks.`,
          400
        );
      }
    }

    // 2. Perform the update
    const partiallyUpdatedQuiz = await QuizModel.findOneAndUpdate(
      { _id: quizId, restaurantId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean<IQuiz>(); // Get the plain object with IDs first

    if (!partiallyUpdatedQuiz) {
      throw new AppError("Quiz not found or failed to update.", 404);
    }

    // Check if quiz was deactivated and reset progress if so
    if (
      quizBeforeUpdate.isAvailable === true &&
      updateData.isAvailable === false
    ) {
      try {
        await QuizService.resetQuizProgressForEveryone(quizId, restaurantId);
        console.log(
          `Quiz ${quizId} deactivated. Progress reset for restaurant ${restaurantId}.`
        );
      } catch (resetError: any) {
        // Log the error but don't let it fail the entire update operation
        // The quiz update itself was successful.
        console.error(
          `Error resetting progress for deactivated quiz ${quizId}:`,
          resetError
        );
        // Optionally, you might want to notify an admin or handle this more robustly
      }
    }

    // 3. Fetch the updated quiz again to populate targetRoles
    const populatedQuiz = await QuizModel.findById(partiallyUpdatedQuiz._id)
      .populate<{ targetRoles: IRole[] }>({
        path: "targetRoles",
        select: "_id name description", // Select fields for IRole
      })
      .lean<IPopulatedQuiz>(); // Lean to get the populated plain object

    return populatedQuiz; // This will be IPopulatedQuiz or null if the findById fails (shouldn't happen if findOneAndUpdate succeeded)
  }

  /**
   * Deletes a quiz and all associated progress and attempts.
   *
   * @param quizId - The ID of the quiz to delete.
   * @param restaurantId - The ID of the restaurant owning the quiz.
   * @returns A promise resolving to an object with counts of deleted documents.
   * @throws {AppError} If the quiz is not found or doesn't belong to the restaurant (404),
   *                    or if the database delete operation fails (500).
   */
  static async deleteQuiz(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{
    deletedQuizCount: number;
    deletedProgressCount: number;
    deletedAttemptsCount: number;
  }> {
    const quiz = await QuizModel.findOne({ _id: quizId, restaurantId });
    if (!quiz) {
      throw new AppError(
        "Quiz not found or you do not have permission to delete it.",
        404
      );
    }

    // Delete all staff quiz progress associated with this quiz
    const progressDeletionResult = await StaffQuizProgress.deleteMany({
      quizId,
      restaurantId,
    });

    // Delete all quiz attempts associated with this quiz
    const attemptsDeletionResult = await QuizAttempt.deleteMany({
      quizId,
      restaurantId,
    });

    // Delete the quiz itself
    const quizDeletionResult = await QuizModel.deleteOne({
      _id: quizId,
      restaurantId,
    });

    if (quizDeletionResult.deletedCount === 0) {
      // Should not happen if the findOne check passed, but as a safeguard
      throw new AppError("Quiz deletion failed.", 500);
    }

    return {
      deletedQuizCount: quizDeletionResult.deletedCount || 0,
      deletedProgressCount: progressDeletionResult.deletedCount || 0,
      deletedAttemptsCount: attemptsDeletionResult.deletedCount || 0,
    };
  }

  /**
   * Resets all progress for a specific quiz for all staff members in a restaurant.
   * This includes clearing seen questions, completion status, and deleting all associated quiz attempts.
   *
   * @param quizId - The ID of the quiz to reset.
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an object with counts of updated/deleted documents.
   * @throws {AppError} If the quiz is not found (404) or database operations fail (500).
   */
  static async resetQuizProgressForEveryone(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{
    updatedProgressCount: number;
    deletedAttemptsCount: number;
  }> {
    // Verify the quiz exists and belongs to the restaurant
    const quiz = await QuizModel.findOne({ _id: quizId, restaurantId }).lean();
    if (!quiz) {
      throw new AppError("Quiz not found for this restaurant.", 404);
    }

    // Reset StaffQuizProgress: clear seenQuestionIds, set isCompletedOverall to false
    const progressUpdateResult = await StaffQuizProgress.updateMany(
      { quizId, restaurantId },
      {
        $set: {
          seenQuestionIds: [],
          isCompletedOverall: false,
          // lastAttemptTimestamp: undefined, // Optional: decide if this should be cleared
        },
        // $unset: { lastAttemptTimestamp: "" } // Alternative to set to undefined
      }
    );

    // Delete all QuizAttempts for this quiz and restaurant
    const attemptsDeletionResult = await QuizAttempt.deleteMany({
      quizId,
      restaurantId,
    });

    return {
      updatedProgressCount: progressUpdateResult.modifiedCount || 0,
      deletedAttemptsCount: attemptsDeletionResult.deletedCount || 0,
    };
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
      const quiz = await QuizModel.findOne({
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
  ): Promise<IPopulatedQuiz[]> {
    try {
      return await QuizModel.find({ restaurantId })
        .populate<{ targetRoles: IRole[] }>({
          path: "targetRoles",
          select: "_id name description", // Ensure _id is selected for IRole
        })
        .lean<IPopulatedQuiz[]>(); // Use lean with the new type
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
    restaurantId: Types.ObjectId,
    staffUserId: Types.ObjectId
  ): Promise<AvailableQuizInfo[]> {
    try {
      const staffUser = await User.findById(staffUserId)
        .select("assignedRoleId")
        .lean<Pick<IUser, "assignedRoleId">>();
      if (!staffUser) {
        // Or handle as an error, but returning empty might be safer if staff not found shouldn't halt all quiz display
        console.warn(
          `[QuizService] Staff user ${staffUserId} not found when fetching available quizzes.`
        );
        return [];
      }

      const staffAssignedRoleId = staffUser.assignedRoleId; // This could be ObjectId or undefined

      const queryConditions: any = {
        restaurantId: restaurantId,
        isAvailable: true,
      };

      if (staffAssignedRoleId) {
        queryConditions.$or = [
          { targetRoles: { $exists: false } }, // For older quizzes without targetRoles field
          { targetRoles: { $size: 0 } }, // Quiz is for everyone (empty array)
          { targetRoles: staffAssignedRoleId }, // Quiz targets the role this staff member has (using $in implicitly due to array field)
        ];
      } else {
        // If staff has no assigned role, they only see quizzes for everyone
        queryConditions.$or = [
          { targetRoles: { $exists: false } },
          { targetRoles: { $size: 0 } },
        ];
      }

      const quizzes = await QuizModel.find(queryConditions)
        .select("_id title description createdAt numberOfQuestionsPerAttempt") // Removed averageScore for now
        .sort({ createdAt: -1 })
        .lean<IQuiz[]>(); // Ensure it's an array of IQuiz

      // Transform to AvailableQuizInfo
      // Consider calculating averageScore here if needed, or ensure it's on IQuiz model
      return quizzes.map((quiz) => ({
        _id: quiz._id.toString(), // Convert ObjectId to string
        title: quiz.title,
        description: quiz.description,
        createdAt: quiz.createdAt,
        numQuestions: quiz.numberOfQuestionsPerAttempt, // Direct mapping from IQuiz
        // averageScore: quiz.averageScore, // Assuming averageScore is part of IQuiz (if not, needs calculation or removal)
      }));
    } catch (error: any) {
      console.error(
        "Error fetching available quizzes for staff in service:",
        error
      );
      throw new AppError("Failed to fetch available quizzes.", 500);
    }
  }

  /**
   * Generates a new quiz from specified question banks.
   *
   * @param data - Data for creating the quiz from banks.
   * @returns A promise resolving to the new quiz document.
   * @throws {AppError} If validation fails (e.g., question banks not found, question count mismatch)
   *                    or if database save operation fails.
   */
  static async generateQuizFromBanksService(
    data: CreateQuizFromBanksData
  ): Promise<IQuiz> {
    const {
      title,
      description,
      restaurantId,
      questionBankIds,
      numberOfQuestionsPerAttempt,
      targetRoles,
    } = data;

    // 1. Validate questionBankIds and fetch them to ensure they exist and belong to the restaurant
    const banks = await QuestionBankModel.find({
      _id: {
        $in: questionBankIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
      restaurantId: restaurantId,
    }).populate<{ questions: QuestionDocument[] }>("questions");

    if (!banks || banks.length !== questionBankIds.length) {
      throw new AppError(
        "One or more question banks not found or do not belong to this restaurant.",
        404
      );
    }

    // 2. Calculate totalUniqueQuestionsInSourceSnapshot
    const uniqueQuestionIdsFromSource =
      await getUniqueValidQuestionIdsFromQuestionBanks(
        questionBankIds.map((id) => new mongoose.Types.ObjectId(id)),
        restaurantId
      );
    const totalUniqueQuestionsInSourceSnapshot =
      uniqueQuestionIdsFromSource.length;

    // 3. Validate numberOfQuestionsPerAttempt against totalUniqueQuestionsInSourceSnapshot
    if (numberOfQuestionsPerAttempt > totalUniqueQuestionsInSourceSnapshot) {
      throw new AppError(
        `Number of questions per attempt (${numberOfQuestionsPerAttempt}) cannot exceed the total number of unique active questions available in the selected banks (${totalUniqueQuestionsInSourceSnapshot}).`,
        400
      );
    }
    if (numberOfQuestionsPerAttempt <= 0) {
      throw new AppError(
        "Number of questions per attempt must be greater than 0.",
        400
      );
    }

    // 4. Create the new quiz
    const newQuiz = new QuizModel({
      title,
      description,
      restaurantId,
      sourceQuestionBankIds: questionBankIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
      numberOfQuestionsPerAttempt,
      totalUniqueQuestionsInSourceSnapshot,
      isAvailable: false, // CHANGED: Default to not available
      targetRoles: targetRoles
        ? targetRoles.map((id) => new mongoose.Types.ObjectId(id))
        : [], // Ensure targetRoles is an array
    });

    try {
      await newQuiz.save();
      return newQuiz;
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error (e.g. if unique index on title + restaurantId)
        throw new AppError(
          "A quiz with this title already exists for your restaurant.",
          409
        );
      }
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(`Validation Error: ${error.message}`, 400);
      }
      console.error(
        "Error saving new quiz in generateQuizFromBanksService:",
        error
      );
      throw new AppError("Failed to create quiz from question banks.", 500);
    }
  }

  /**
   * Starts a quiz attempt for a staff member.
   * - Finds or creates staff quiz progress.
   * - Selects a new set of questions for the attempt.
   *
   * @param staffUserId - The ID of the staff user.
   * @param quizId - The ID of the quiz definition.
   * @returns A promise resolving to an array of questions for the attempt (QuestionForQuizAttempt[]).
   * @throws {AppError} If quiz not found, or other issues occur.
   */
  static async startQuizAttempt(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<QuestionForQuizAttempt[]> {
    console.log(
      `[QuizService.startQuizAttempt] Called for staff: ${staffUserId}, quiz: ${quizId}`
    ); // LOG 1
    // 1. Fetch the Quiz definition
    const quiz = await QuizModel.findById(quizId).lean();
    console.log(
      `[QuizService.startQuizAttempt] Fetched quiz definition: ${
        quiz ? quiz.title : "NOT FOUND"
      }, Available: ${quiz?.isAvailable}`
    ); // LOG 2

    if (!quiz || !quiz.isAvailable) {
      console.error(
        `[QuizService.startQuizAttempt] Quiz not found or not available. Quiz ID: ${quizId}`
      );
      throw new AppError("Quiz not found or is not currently available.", 404);
    }

    // 2. Find or create StaffQuizProgress
    let staffProgress = await StaffQuizProgress.findOne({
      staffUserId,
      quizId,
      restaurantId: quiz.restaurantId,
    });
    console.log(
      `[QuizService.startQuizAttempt] Found staff progress: ${!!staffProgress}`
    ); // LOG 3

    if (!staffProgress) {
      staffProgress = await StaffQuizProgress.create({
        staffUserId,
        quizId,
        restaurantId: quiz.restaurantId,
        seenQuestionIds: [],
        totalUniqueQuestionsInSource: quiz.totalUniqueQuestionsInSourceSnapshot,
        isCompletedOverall: false,
      });
      console.log(
        `[QuizService.startQuizAttempt] Created new staff progress. CompletedOverall: ${staffProgress.isCompletedOverall}`
      ); // LOG 4
    } else {
      console.log(
        `[QuizService.startQuizAttempt] Existing staff progress. CompletedOverall: ${staffProgress.isCompletedOverall}, Seen IDs: ${staffProgress.seenQuestionIds?.length}`
      ); // LOG 5
    }

    // 3. If already completed, return empty array
    if (staffProgress.isCompletedOverall) {
      console.log(
        `[QuizService.startQuizAttempt] Staff has already completed this quiz overall.`
      ); // LOG 6
      return [];
    }

    // 4. Fetch all unique, active question IDs from the Quiz's source question banks
    console.log(
      `[QuizService.startQuizAttempt] Fetching unique valid question IDs from banks: ${quiz.sourceQuestionBankIds}`
    ); // LOG 7
    const allQuestionIdsInSource =
      await getUniqueValidQuestionIdsFromQuestionBanks(
        quiz.sourceQuestionBankIds,
        quiz.restaurantId
      );
    console.log(
      `[QuizService.startQuizAttempt] Got ${allQuestionIdsInSource.length} unique valid question IDs from source banks.`
    ); // LOG 8

    // 5. Filter out seen questions
    const seenQuestionIdsSet = new Set(
      staffProgress.seenQuestionIds.map((id) => id.toString())
    );
    console.log(
      `[QuizService.startQuizAttempt] User has seen ${seenQuestionIdsSet.size} questions previously.`
    ); // LOG 9

    const availablePoolIds = allQuestionIdsInSource.filter(
      (id) => !seenQuestionIdsSet.has(id.toString())
    );
    console.log(
      `[QuizService.startQuizAttempt] Available pool size after filtering seen questions: ${availablePoolIds.length}`
    ); // LOG 10

    // 6. If availablePool is empty, mark as completed and return empty
    if (availablePoolIds.length === 0) {
      console.log(
        `[QuizService.startQuizAttempt] No questions in available pool. Marking quiz as completed for user.`
      ); // LOG 11
      staffProgress.isCompletedOverall = true;
      await staffProgress.save();
      return [];
    }

    // 7. Randomly select N questions from availablePoolIds
    _shuffleArray(availablePoolIds); // Shuffle in place
    const questionsToPresentIds = availablePoolIds.slice(
      0,
      quiz.numberOfQuestionsPerAttempt
    );
    console.log(
      `[QuizService.startQuizAttempt] Selected ${questionsToPresentIds.length} questions to present (numberOfQuestionsPerAttempt: ${quiz.numberOfQuestionsPerAttempt})`
    ); // LOG 12

    if (
      questionsToPresentIds.length === 0 &&
      quiz.numberOfQuestionsPerAttempt > 0
    ) {
      console.warn(
        `[QuizService.startQuizAttempt] WARNING: Selected 0 questions to present, but numberOfQuestionsPerAttempt is ${quiz.numberOfQuestionsPerAttempt}. This implies availablePoolIds was empty or smaller than N.`
      );
      // This might be redundant if the check at LOG 11 already caught availablePoolIds.length === 0
      // but useful if slice results in empty for other reasons.
      return []; // Explicitly return empty if nothing was selected to present
    }

    // 8. Fetch full question objects for these IDs
    const questionsForAttempt = await QuestionModel.find({
      _id: { $in: questionsToPresentIds },
    })
      .select("_id questionText questionType options categories difficulty")
      .lean<QuestionForQuizAttempt[]>();

    const orderedQuestions = questionsToPresentIds
      .map((idToFind) =>
        questionsForAttempt.find(
          (q: QuestionForQuizAttempt) =>
            q._id.toString() === idToFind.toString()
        )
      )
      .filter((q) => q !== undefined) as QuestionForQuizAttempt[];

    return orderedQuestions;
  }

  /**
   * Submits a staff member's quiz attempt, grades it, and updates progress.
   *
   * @param staffUserId - The ID of the staff user.
   * @param quizId - The ID of the quiz definition.
   * @param attemptData - The data submitted for the attempt (questions and answers).
   * @returns A promise resolving to the created QuizAttempt document.
   * @throws {AppError} If quiz/staff progress not found, or other issues.
   */
  static async submitQuizAttempt(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId,
    attemptData: QuizAttemptSubmitData // Defined in QuizService or quizTypes.ts
  ): Promise<ServerSubmitAttemptResponse> {
    // 1. Fetch Quiz and StaffQuizProgress
    const quiz = await QuizModel.findById(quizId).lean();
    if (!quiz) {
      throw new AppError("Quiz definition not found.", 404);
    }

    const staffProgress = await StaffQuizProgress.findOne({
      staffUserId,
      quizId,
      restaurantId: quiz.restaurantId,
    });

    if (!staffProgress) {
      throw new AppError(
        "Staff quiz progress not found. Please start the quiz first.",
        404
      );
    }

    // 2. Grade the attempt
    let score = 0;
    const submittedQuestionData = attemptData.questions;
    const presentedQuestionIds = submittedQuestionData.map(
      (q) => new Types.ObjectId(q.questionId)
    );
    const presentedQuestionsFull = await QuestionModel.find({
      _id: { $in: presentedQuestionIds },
    }).lean<QuestionDocument[]>();

    const gradedQuestionsClient: ServerGradedQuestion[] = [];
    const attemptQuestionsProcessedForDB: IQuizAttempt["questionsPresented"] =
      [];

    for (const submittedQ of submittedQuestionData) {
      const fullQuestion = presentedQuestionsFull.find(
        (q: QuestionDocument) => q._id.toString() === submittedQ.questionId
      );
      if (!fullQuestion) continue;

      let isCorrect = false;
      const correctAnswerDetails: ServerCorrectAnswerDetails = {};
      const clientOptions: ServerQuestionOption[] = fullQuestion.options.map(
        (opt) => ({ _id: opt._id.toString(), text: opt.text })
      );

      if (fullQuestion.questionType === "true-false") {
        const correctOption = fullQuestion.options.find(
          (opt) => opt.isCorrect === true
        );
        if (correctOption) {
          correctAnswerDetails.optionId = correctOption._id.toString();
          correctAnswerDetails.text = correctOption.text;
          // Client sends option._id as answerGiven for true/false questions as well
          if (submittedQ.answerGiven === correctOption._id.toString()) {
            isCorrect = true;
          }
        }
      } else if (fullQuestion.questionType === "multiple-choice-single") {
        const correctOption = fullQuestion.options.find(
          (opt) => opt.isCorrect === true
        );
        if (correctOption) {
          correctAnswerDetails.optionId = correctOption._id.toString();
          correctAnswerDetails.text = correctOption.text;
          // User answer is expected to be the option._id for MCQs based on QuizTakingPage
          if (submittedQ.answerGiven === correctOption._id.toString()) {
            isCorrect = true;
          }
        }
      } else if (fullQuestion.questionType === "multiple-choice-multiple") {
        const correctOptions = fullQuestion.options.filter(
          (opt) => opt.isCorrect === true
        );
        correctAnswerDetails.optionIds = correctOptions.map((opt) =>
          opt._id.toString()
        );
        correctAnswerDetails.texts = correctOptions.map((opt) => opt.text);

        const submittedAnswerIds = Array.isArray(submittedQ.answerGiven)
          ? (submittedQ.answerGiven as string[]).sort()
          : [];
        const correctOptionIdsSorted = (
          correctAnswerDetails.optionIds || []
        ).sort();

        if (
          submittedAnswerIds.length === correctOptionIdsSorted.length &&
          submittedAnswerIds.every(
            (id, index) => id === correctOptionIdsSorted[index]
          )
        ) {
          isCorrect = true;
        }
      }
      // TODO: Add grading for other potential future question types

      if (isCorrect) {
        score++;
      }

      attemptQuestionsProcessedForDB.push({
        questionId: fullQuestion._id as Types.ObjectId,
        answerGiven: submittedQ.answerGiven, // Store the raw answer given by user
        isCorrect,
      });

      gradedQuestionsClient.push({
        questionId: fullQuestion._id.toString(),
        questionText: fullQuestion.questionText,
        options: clientOptions,
        answerGiven: submittedQ.answerGiven,
        isCorrect,
        correctAnswer: correctAnswerDetails,
      });
    }

    // 3. Create QuizAttempt document
    const newAttempt = await QuizAttempt.create({
      staffUserId,
      quizId,
      restaurantId: quiz.restaurantId,
      questionsPresented: attemptQuestionsProcessedForDB, // Use the DB formatted array
      score,
      attemptDate: new Date(),
      durationInSeconds: attemptData.durationInSeconds,
    });

    // 4. Update StaffQuizProgress
    staffProgress.seenQuestionIds = [
      ...new Set([
        ...staffProgress.seenQuestionIds.map((id) => id.toString()),
        ...presentedQuestionIds.map((id) => id.toString()),
      ]),
    ].map((idStr) => new Types.ObjectId(idStr));

    staffProgress.lastAttemptTimestamp = new Date();

    if (
      staffProgress.seenQuestionIds.length >=
      staffProgress.totalUniqueQuestionsInSource
    ) {
      staffProgress.isCompletedOverall = true;
    }

    await staffProgress.save();

    // 5. Return the detailed response for the client
    return {
      attemptId: newAttempt._id.toString(),
      quizId: quiz._id.toString(),
      staffUserId: staffUserId.toString(),
      score,
      totalQuestionsAttempted: submittedQuestionData.length, // or presentedQuestionsFull.length
      questions: gradedQuestionsClient,
      attemptDate: newAttempt.attemptDate.toISOString(),
      durationInSeconds: newAttempt.durationInSeconds,
    };
  }

  /**
   * Retrieves a staff member's progress for a specific quiz, including attempts and average score.
   *
   * @param staffUserId - The ID of the staff user.
   * @param quizId - The ID of the quiz.
   * @returns A promise resolving to staff quiz progress with attempts details, or null if not found.
   * @throws {AppError} If database errors occur.
   */
  static async getStaffQuizProgress(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<IStaffQuizProgressWithAttempts | null> {
    const staffProgress = await StaffQuizProgress.findOne({
      staffUserId,
      quizId,
    })
      .populate<{ staffUserId: IUser }>({
        path: "staffUserId",
        select: "name email professionalRole",
      })
      .populate<{ quizId: IQuiz }>({
        path: "quizId",
        select: "title description numberOfQuestionsPerAttempt restaurantId",
      })
      .lean<PlainIStaffQuizProgress | null>(); // Use PlainIStaffQuizProgress for lean base type

    if (!staffProgress) {
      return null;
    }

    const attempts = await QuizAttempt.find({
      staffUserId,
      quizId,
      restaurantId: (staffProgress.quizId as IQuiz).restaurantId, // Get restaurantId from populated quiz
    })
      .select("_id score questionsPresented attemptDate") // Select fields for IQuizAttemptSummary
      .sort({ attemptDate: -1 })
      .lean<IQuizAttempt[]>();

    let averageScore: number | null = null;
    const attemptSummaries: IQuizAttemptSummary[] = [];

    if (attempts.length > 0) {
      let totalPercentageSum = 0;
      let validAttemptsCount = 0;
      attempts.forEach((attempt) => {
        const totalQuestionsInAttempt = attempt.questionsPresented?.length || 0;
        if (totalQuestionsInAttempt > 0) {
          totalPercentageSum += attempt.score / totalQuestionsInAttempt;
          validAttemptsCount++;
        }
        attemptSummaries.push({
          _id: (attempt._id as Types.ObjectId).toString(),
          score: attempt.score,
          totalQuestions: totalQuestionsInAttempt,
          attemptDate: attempt.attemptDate,
          hasIncorrectAnswers:
            totalQuestionsInAttempt > 0 &&
            attempt.score < totalQuestionsInAttempt,
        });
      });
      if (validAttemptsCount > 0) {
        averageScore = parseFloat(
          ((totalPercentageSum / validAttemptsCount) * 100).toFixed(1)
        );
      }
    }

    // Assertions for populated fields after lean
    const populatedStaffProgress =
      staffProgress as unknown as IStaffQuizProgressWithAttempts;
    populatedStaffProgress.staffUserId = staffProgress.staffUserId as IUser;
    populatedStaffProgress.quizId = staffProgress.quizId as IQuiz;

    return {
      ...populatedStaffProgress,
      attempts: attemptSummaries,
      averageScore,
    };
  }

  /**
   * Retrieves progress for all staff members in a restaurant for a specific quiz.
   *
   * @param restaurantId - The ID of the restaurant.
   * @param quizId - The ID of the quiz.
   * @returns A promise resolving to an array of staff quiz progress details.
   * @throws {AppError} If database errors occur.
   */
  static async getRestaurantQuizStaffProgress(
    restaurantId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<IStaffMemberQuizProgressDetails[]> {
    // 1. Fetch the quiz to get its title AND targetRoles
    const quiz = await QuizModel.findById(quizId)
      .select("title targetRoles") // Added targetRoles
      .lean<Pick<IQuiz, "title" | "targetRoles"> | null>();

    if (!quiz) {
      throw new AppError("Quiz not found.", 404);
    }
    const quizTitle = quiz.title;
    const quizTargetRoles = quiz.targetRoles || []; // Default to empty array if undefined

    // 2. Fetch relevant staff members for the restaurant
    const staffQueryConditions: mongoose.FilterQuery<IUser> = {
      restaurantId,
      role: "staff",
    };

    // If the quiz has specific target roles, filter staff by those roles
    if (quizTargetRoles.length > 0) {
      staffQueryConditions.assignedRoleId = { $in: quizTargetRoles };
    }

    const staffInRestaurant = await User.find(staffQueryConditions)
      .select("_id name email professionalRole assignedRoleId") // Ensure assignedRoleId is fetched if needed for display or further logic, though professionalRole might be sufficient from User model now
      .lean<
        Pick<
          IUser,
          "_id" | "name" | "email" | "professionalRole" | "assignedRoleId"
        >[]
      >();

    if (!staffInRestaurant || staffInRestaurant.length === 0) {
      return []; // No staff in restaurant, so no progress to show
    }

    // 3. For each staff member, fetch their progress and attempts for this quiz
    const allStaffProgressDetails: IStaffMemberQuizProgressDetails[] = [];

    for (const staff of staffInRestaurant) {
      const staffProgressDoc = await StaffQuizProgress.findOne({
        staffUserId: staff._id,
        quizId,
        restaurantId,
      }).lean<PlainIStaffQuizProgress | null>();

      const attempts = await QuizAttempt.find({
        staffUserId: staff._id,
        quizId,
        restaurantId,
      })
        .select("_id score questionsPresented attemptDate")
        .sort({ attemptDate: -1 })
        .lean<IQuizAttempt[]>();

      let averageScoreForQuiz: number | null = null;
      const attemptSummaries: IQuizAttemptSummary[] = [];
      let numberOfAttempts = 0;

      if (attempts.length > 0) {
        numberOfAttempts = attempts.length;
        let totalPercentageSum = 0;
        let validAttemptsCount = 0;
        attempts.forEach((attempt) => {
          const totalQuestionsInAttempt =
            attempt.questionsPresented?.length || 0;
          if (totalQuestionsInAttempt > 0) {
            totalPercentageSum += attempt.score / totalQuestionsInAttempt;
            validAttemptsCount++;
          }
          attemptSummaries.push({
            _id: (attempt._id as Types.ObjectId).toString(),
            score: attempt.score,
            totalQuestions: totalQuestionsInAttempt,
            attemptDate: attempt.attemptDate,
            hasIncorrectAnswers:
              totalQuestionsInAttempt > 0 &&
              attempt.score < totalQuestionsInAttempt,
          });
        });
        if (validAttemptsCount > 0) {
          averageScoreForQuiz = parseFloat(
            ((totalPercentageSum / validAttemptsCount) * 100).toFixed(1)
          );
        }
      }

      const progressDetails: Pick<
        PlainIStaffQuizProgress,
        | "isCompletedOverall"
        | "seenQuestionIds"
        | "totalUniqueQuestionsInSource"
        | "lastAttemptTimestamp"
      > | null = staffProgressDoc
        ? {
            isCompletedOverall: staffProgressDoc.isCompletedOverall,
            seenQuestionIds: staffProgressDoc.seenQuestionIds,
            totalUniqueQuestionsInSource:
              staffProgressDoc.totalUniqueQuestionsInSource,
            lastAttemptTimestamp: staffProgressDoc.lastAttemptTimestamp,
          }
        : null;

      allStaffProgressDetails.push({
        staffMember: {
          _id: staff._id as Types.ObjectId, // Cast as IUser already has ObjectId _id
          name: staff.name,
          email: staff.email,
          professionalRole: staff.professionalRole,
        },
        quizTitle,
        progress: progressDetails,
        averageScoreForQuiz,
        attempts: attemptSummaries,
        numberOfAttempts,
      });
    }
    return allStaffProgressDetails;
  }

  /**
   * Retrieves details of a specific quiz attempt, including incorrect questions and answers.
   *
   * @param attemptId - The ID of the quiz attempt.
   * @param requestingUserIdString - The ID of the user requesting the details (string).
   * @returns A promise resolving to the quiz attempt details, or null if not found/authorized.
   * @throws {AppError} If database errors occur.
   */
  static async getQuizAttemptDetails(
    attemptId: string,
    requestingUserIdString: string
  ): Promise<QuizAttemptDetailsWithIncorrects | null> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new AppError("Invalid attempt ID format.", 400);
    }
    const attemptObjectId = new Types.ObjectId(attemptId);
    const requestingUserId = new Types.ObjectId(requestingUserIdString);

    const attempt = await QuizAttempt.findById(attemptObjectId)
      .populate<{ quizId: Pick<IQuiz, "_id" | "title" | "restaurantId"> }>({
        path: "quizId",
        select: "_id title restaurantId",
      })
      .lean<IQuizAttempt | null>();

    if (!attempt) {
      console.log(
        `[QuizService.getQuizAttemptDetails] Attempt ${attemptId} not found.`
      );
      return null;
    }
    console.log(
      `[QuizService.getQuizAttemptDetails] Processing attempt ${attemptId}. Full attempt data:`,
      JSON.stringify(attempt, null, 2)
    );

    // Authorization check: User must be the one who took the attempt or a restaurant admin of that restaurant
    const restaurantIdOfAttempt = (
      attempt.quizId as Pick<IQuiz, "restaurantId">
    ).restaurantId;
    const requestingUser = await User.findById(requestingUserId)
      .select("role restaurantId")
      .lean<Pick<IUser, "role" | "restaurantId"> | null>();

    if (!requestingUser) {
      throw new AppError("Requesting user not found.", 404);
    }

    const isOwnerOfAttempt =
      attempt.staffUserId.toString() === requestingUserIdString;
    const isAdminOfRestaurant =
      requestingUser.role === "restaurant" &&
      requestingUser.restaurantId?.toString() ===
        restaurantIdOfAttempt.toString();

    if (!isOwnerOfAttempt && !isAdminOfRestaurant) {
      throw new AppError(
        "You are not authorized to view this quiz attempt.",
        403
      );
    }

    const incorrectQuestionsDetails: IncorrectQuestionDetailForAttempt[] = [];
    if (attempt.questionsPresented && attempt.questionsPresented.length > 0) {
      console.log(
        `[QuizService.getQuizAttemptDetails] Attempt ${attemptId} has ${attempt.questionsPresented.length} presented questions. Iterating...`
      );
      for (const presentedQ of attempt.questionsPresented) {
        console.log(
          `[QuizService.getQuizAttemptDetails] Checking presentedQ: ${JSON.stringify(
            presentedQ
          )}. IsCorrect: ${presentedQ.isCorrect}`
        );
        if (!presentedQ.isCorrect) {
          console.log(
            `[QuizService.getQuizAttemptDetails] Found an incorrect question: ${presentedQ.questionId}`
          );
          const questionDoc = await QuestionModel.findById(
            presentedQ.questionId
          )
            .select("questionText options questionType")
            .lean<Pick<
              IQuestion,
              "questionText" | "options" | "questionType"
            > | null>();
          if (questionDoc) {
            console.log(
              `[QuizService.getQuizAttemptDetails] Found questionDoc for ${presentedQ.questionId}: ${questionDoc.questionText}`
            );
            let correctAnswerText = "N/A";
            const correctOption = questionDoc.options.find(
              (opt) => opt.isCorrect
            );
            if (correctOption) {
              correctAnswerText = correctOption.text;
            } else if (
              questionDoc.questionType === "true-false" &&
              questionDoc.options.length === 2
            ) {
              // Fallback logic for true/false if isCorrect is not explicitly on options
              // This part might need refinement based on actual data structure.
            }

            let userAnswerText = String(presentedQ.answerGiven); // Default to the ID if lookup fails
            if (questionDoc.options && presentedQ.answerGiven) {
              if (Array.isArray(presentedQ.answerGiven)) {
                // Handle multiple-choice-multiple if answerGiven is an array of IDs
                const selectedOptionsTexts = presentedQ.answerGiven.map(
                  (ansId) => {
                    const opt = questionDoc.options.find(
                      (o) => o._id.toString() === String(ansId)
                    );
                    return opt ? opt.text : String(ansId); // Fallback to ID if option not found
                  }
                );
                userAnswerText = selectedOptionsTexts.join(", ");
              } else {
                // Handle single-select (true-false, multiple-choice-single)
                const userAnswerOption = questionDoc.options.find(
                  (opt) => opt._id.toString() === String(presentedQ.answerGiven)
                );
                if (userAnswerOption) {
                  userAnswerText = userAnswerOption.text;
                }
              }
            }
            console.log(
              `[QuizService.getQuizAttemptDetails] User answer given (raw): ${presentedQ.answerGiven}, Resolved text: ${userAnswerText}`
            );

            incorrectQuestionsDetails.push({
              questionText: questionDoc.questionText,
              userAnswer: userAnswerText, // Use the resolved text
              correctAnswer: correctAnswerText,
            });
          } else {
            console.error(
              `[QuizService.getQuizAttemptDetails] Question ${presentedQ.questionId} (marked incorrect in attempt) NOT FOUND in QuestionModel for attempt ${attempt._id}`
            );
          }
        }
      }
    } else {
      console.log(
        `[QuizService.getQuizAttemptDetails] Attempt ${attemptId} has no questionsPresented or it's empty.`
      );
    }
    console.log(
      `[QuizService.getQuizAttemptDetails] Finished processing. Found ${
        incorrectQuestionsDetails.length
      } incorrect questions for client for attempt ${attemptId}. Details: ${JSON.stringify(
        incorrectQuestionsDetails
      )}`
    );

    return {
      _id: (attempt._id as Types.ObjectId).toString(),
      quizId: (attempt.quizId as { _id: Types.ObjectId })._id.toString(),
      quizTitle: (attempt.quizId as { title: string }).title,
      staffUserId: attempt.staffUserId.toString(),
      score: attempt.score,
      totalQuestions: attempt.questionsPresented?.length || 0,
      attemptDate: attempt.attemptDate,
      incorrectQuestions: incorrectQuestionsDetails,
    };
  }

  /**
   * Counts the total number of quizzes for a specific restaurant.
   *
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to the total count of quizzes.
   * @throws {AppError} If any database error occurs.
   */
  static async countQuizzes(restaurantId: Types.ObjectId): Promise<number> {
    try {
      const count = await QuizModel.countDocuments({ restaurantId });
      return count;
    } catch (error: any) {
      console.error("Error counting quizzes for restaurant:", error);
      throw new AppError("Failed to count quizzes.", 500);
    }
  }
}
