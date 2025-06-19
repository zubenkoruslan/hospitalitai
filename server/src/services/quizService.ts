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
import SopDocumentModel, { ISopDocument } from "../models/SopDocumentModel"; // Added SOP Document Model import
import { AnalyticsArchivalService } from "./analyticsArchivalService"; // ADDED: Analytics archival support
import {
  ArchivalReason,
  ArchivalResult,
} from "../types/analyticsArchivalTypes"; // ADDED: Archival types

// Define a type for Quiz with populated targetRoles
export interface IPopulatedQuiz extends Omit<IQuiz, "targetRoles"> {
  targetRoles?: IRole[];
}

// Define a type for Quiz with populated targetRoles AND sopDocument
export interface IPopulatedQuizWithSop
  extends Omit<IQuiz, "targetRoles" | "sopDocumentId"> {
  targetRoles?: IRole[];
  sopDocumentId?: Pick<ISopDocument, "_id" | "title"> | null; // For populated SOP doc
  // We will manually map sopDocumentId.title to sopDocumentTitle for the client.
}

// Plain interface for lean Quiz objects
export interface PlainIQuiz {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  restaurantId: Types.ObjectId;
  sourceQuestionBankIds: Types.ObjectId[];
  totalUniqueQuestionsInSourceSnapshot: number;
  numberOfQuestionsPerAttempt: number;
  isAvailable?: boolean;
  averageScore?: number | null;
  targetRoles?: Types.ObjectId[];
  retakeCooldownHours: number;
  createdAt: Date;
  updatedAt: Date;
  // Ensure all data fields from IQuiz are here, without Document methods
}

// ADDED: Interface for creating quiz from banks
export interface CreateQuizFromBanksData {
  title: string;
  description?: string;
  restaurantId: Types.ObjectId;
  questionBankIds?: string[]; // Made optional, one of bankIds or sopDocId is needed
  sourceSopDocumentId?: string; // Added for SOP source
  numberOfQuestionsPerAttempt: number;
  targetRoles?: Types.ObjectId[];
  retakeCooldownHours?: number; // Added field
}

// New interface for progress with average score
export interface IStaffQuizProgressWithAverageScore extends IStaffQuizProgress {
  averageScore?: number | null;
}

// Plain interface for lean StaffQuizProgress objects
export interface PlainIStaffQuizProgress {
  _id: Types.ObjectId;
  staffUserId: Types.ObjectId | IUser;
  quizId: Types.ObjectId | IQuiz;
  restaurantId: Types.ObjectId | IUser;
  seenQuestionIds: Types.ObjectId[] | QuestionDocument[];
  totalUniqueQuestionsInSource: number;
  isCompletedOverall: boolean;
  lastAttemptCompletedAt?: Date;
  averageScore?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// ADDED: Interface for the new service method's return value
export interface IncorrectQuestionDetailForAttempt {
  questionText: string;
  userAnswer: string; // Textual representation of user's answer
  correctAnswer: string; // Textual representation of correct answer
  explanation?: string; // Added explanation field
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
    | "lastAttemptCompletedAt"
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
  numQuestions: number; // This is numberOfQuestionsPerAttempt from IQuiz
  // averageScore?: number | null; // Decided to remove as it's not reliably calculated here for this list view
  retakeCooldownHours: number;
  nextAvailableAt?: string | null; // ISO string
  lastAttemptCompletedAt?: string | null; // ISO string
}

// Interface for data submitted by the client for a quiz attempt
export interface QuizAttemptSubmitData {
  questions: Array<{
    questionId: string; // ID of the IQuestion
    answerGiven: any; // User's answer, type depends on questionType
  }>;
  durationInSeconds?: number; // Optional: time taken for the quiz
  isPracticeMode?: boolean; // Optional: whether this is a practice attempt
}

// Define a type for the questions being sent to the client for an attempt
export interface QuestionForQuizAttempt {
  _id: Types.ObjectId;
  questionText: string;
  questionType: string; // Ideally, this would be the QuestionType enum
  options: Array<{ _id: Types.ObjectId; text: string }>;
  categories?: string[];
  // difficulty?: string; // REMOVED
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
    restaurantId: Types.ObjectId,
    deletedBy?: Types.ObjectId,
    notes?: string
  ): Promise<{
    deletedQuizCount: number;
    deletedProgressCount: number;
    deletedAttemptsCount: number;
    archivalResult?: ArchivalResult;
  }> {
    const quiz = await QuizModel.findOne({ _id: quizId, restaurantId });
    if (!quiz) {
      throw new AppError(
        "Quiz not found or you do not have permission to delete it.",
        404
      );
    }

    let archivalResult: ArchivalResult | undefined;

    // Step 1: Archive analytics data before deletion (if deletedBy is provided)
    if (deletedBy) {
      try {
        console.log(`🗂️ Archiving analytics before deleting quiz ${quizId}...`);
        archivalResult =
          await AnalyticsArchivalService.archiveQuizBeforeDeletion(
            quizId,
            deletedBy,
            ArchivalReason.QUIZ_DELETED,
            notes
          );

        if (archivalResult.success) {
          console.log(`✅ Analytics archived successfully:`, {
            participants: archivalResult.preservedInsights.totalParticipants,
            attempts: archivalResult.preservedInsights.totalAttempts,
            snapshots: archivalResult.userSnapshotsCreated,
          });
        } else {
          console.warn(`⚠️ Analytics archival failed:`, archivalResult.errors);
        }
      } catch (error) {
        console.error(`❌ Analytics archival error for quiz ${quizId}:`, error);
        // Continue with deletion even if archival fails
        archivalResult = {
          success: false,
          userSnapshotsCreated: 0,
          attemptsArchived: 0,
          aggregatedDataPoints: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          preservedInsights: {
            totalParticipants: 0,
            totalAttempts: 0,
            keyLearningOutcomes: [],
          },
        };
      }
    }

    // Step 2: Delete all staff quiz progress associated with this quiz
    const progressDeletionResult = await StaffQuizProgress.deleteMany({
      quizId,
      restaurantId,
    });

    // Step 3: Delete quiz attempts (if not archived or archival failed)
    let attemptsDeletionResult;
    if (!archivalResult?.success || !archivalResult.attemptsArchived) {
      // Only hard delete attempts if they weren't successfully archived
      attemptsDeletionResult = await QuizAttempt.deleteMany({
        quizId,
        restaurantId,
      });
    } else {
      // Attempts were archived (marked as archived), count them as "deleted" for consistency
      attemptsDeletionResult = {
        deletedCount: archivalResult.attemptsArchived,
      };
    }

    // Step 4: Delete the quiz itself
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
      archivalResult,
    };
  }

  /**
   * Resets all progress for a specific quiz for all staff members in a restaurant.
   * This includes clearing seen questions, completion status, and archiving/deleting all associated quiz attempts.
   *
   * @param quizId - The ID of the quiz to reset.
   * @param restaurantId - The ID of the restaurant.
   * @param resetBy - The ID of the user performing the reset (for analytics archival).
   * @param notes - Optional notes about why the reset is being performed.
   * @returns A promise resolving to an object with counts of updated/deleted documents and archival results.
   * @throws {AppError} If the quiz is not found (404) or database operations fail (500).
   */
  static async resetQuizProgressForEveryone(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    resetBy?: Types.ObjectId,
    notes?: string
  ): Promise<{
    updatedProgressCount: number;
    deletedAttemptsCount: number;
    archivalResult?: ArchivalResult;
  }> {
    // Verify the quiz exists and belongs to the restaurant
    const quiz = await QuizModel.findOne({ _id: quizId, restaurantId }).lean();
    if (!quiz) {
      throw new AppError("Quiz not found for this restaurant.", 404);
    }

    let archivalResult: ArchivalResult | undefined;

    // Step 1: Archive analytics data before reset (if resetBy is provided)
    if (resetBy) {
      try {
        console.log(
          `🗂️ Archiving analytics before resetting quiz ${quizId}...`
        );
        archivalResult = await AnalyticsArchivalService.handleQuizReset(
          quizId,
          resetBy,
          notes || "Quiz reset - clearing all progress"
        );

        if (archivalResult.success) {
          console.log(`✅ Analytics archived for quiz reset:`, {
            participants: archivalResult.preservedInsights.totalParticipants,
            attempts: archivalResult.preservedInsights.totalAttempts,
            snapshots: archivalResult.userSnapshotsCreated,
          });
        } else {
          console.warn(
            `⚠️ Analytics archival failed for quiz reset:`,
            archivalResult.errors
          );
        }
      } catch (error) {
        console.error(
          `❌ Analytics archival error for quiz reset ${quizId}:`,
          error
        );
        // Continue with reset even if archival fails
        archivalResult = {
          success: false,
          userSnapshotsCreated: 0,
          attemptsArchived: 0,
          aggregatedDataPoints: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          preservedInsights: {
            totalParticipants: 0,
            totalAttempts: 0,
            keyLearningOutcomes: [],
          },
        };
      }
    }

    // Step 2: Reset StaffQuizProgress: clear seenQuestionIds, set isCompletedOverall to false
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

    // Step 3: Handle quiz attempts based on archival success
    let attemptsDeletionResult;
    if (!archivalResult?.success || !archivalResult.attemptsArchived) {
      // Only hard delete attempts if they weren't successfully archived
      attemptsDeletionResult = await QuizAttempt.deleteMany({
        quizId,
        restaurantId,
      });
    } else {
      // Attempts were archived (marked as archived), count them as "deleted" for consistency
      attemptsDeletionResult = {
        deletedCount: archivalResult.attemptsArchived,
      };
    }

    return {
      updatedProgressCount: progressUpdateResult.modifiedCount || 0,
      deletedAttemptsCount: attemptsDeletionResult.deletedCount || 0,
      archivalResult,
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
  ): Promise<PlainIQuiz> {
    try {
      const quiz = await QuizModel.findOne({
        _id: quizId,
        restaurantId: restaurantId,
        isAvailable: true, // Staff should only be able to take available quizzes
      }).lean<PlainIQuiz>(); // Specify lean type

      if (!quiz) {
        throw new AppError(
          "Quiz not found, is not available, or access denied.",
          404
        );
      }
      // The service now returns the quiz definition.
      // The actual questions for the attempt will be selected by startQuizAttemptService.
      return quiz; // No cast needed, quiz is PlainIQuiz
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
  ): Promise<any[]> {
    // Return type will be IQuiz + sopDocumentTitle manually added
    try {
      const quizzes = await QuizModel.find({ restaurantId })
        .populate<{ targetRoles: IRole[] }>({
          path: "targetRoles",
          select: "_id name description",
        })
        .populate<{
          sopDocumentId: Pick<ISopDocument, "_id" | "title"> | null;
        }>({
          path: "sopDocumentId",
          select: "_id title", // Select only id and title of the SOP Document
        })
        .lean<IPopulatedQuizWithSop[]>(); // Use new lean type

      // Manually map sopDocumentId.title to sopDocumentTitle for client compatibility
      return quizzes.map((quiz) => {
        const clientQuiz = { ...quiz } as any; // Start with the lean quiz object
        if (quiz.sopDocumentId && quiz.sopDocumentId.title) {
          clientQuiz.sopDocumentTitle = quiz.sopDocumentId.title;
          // Keep sopDocumentId as an ID string for the client if needed
          clientQuiz.sopDocumentId = quiz.sopDocumentId._id.toString();
        } else if (quiz.sopDocumentId) {
          // If sopDocumentId was an ID but didn't populate (e.g. doc deleted)
          clientQuiz.sopDocumentId = quiz.sopDocumentId.toString();
        }
        return clientQuiz;
      });
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
        .lean<Pick<IUser, "assignedRoleId" | "_id">>(); // Added _id for logging
      if (!staffUser) {
        console.warn(
          `[QuizService.getAvailableQuizzesForStaff] Staff user ${staffUserId} not found when fetching available quizzes.`
        );
        return [];
      }

      const staffAssignedRoleId = staffUser.assignedRoleId;

      const queryConditions: any = {
        restaurantId: restaurantId,
        isAvailable: true,
      };

      if (staffAssignedRoleId) {
        queryConditions.$or = [
          { targetRoles: { $exists: false } },
          { targetRoles: { $size: 0 } },
          { targetRoles: staffAssignedRoleId },
        ];
      } else {
        queryConditions.$or = [
          { targetRoles: { $exists: false } },
          { targetRoles: { $size: 0 } },
        ];
      }

      const quizzes = await QuizModel.find(queryConditions)
        .select(
          "_id title description createdAt numberOfQuestionsPerAttempt retakeCooldownHours restaurantId" // Ensure restaurantId is selected
        )
        .sort({ createdAt: -1 })
        .lean<PlainIQuiz[]>(); // Use PlainIQuiz as it has retakeCooldownHours

      const availableQuizzesInfo: AvailableQuizInfo[] = [];

      for (const quiz of quizzes) {
        let nextAvailableAt: string | null = null;
        let lastAttemptCompletedAtStr: string | null = null;

        // SERVER-SIDE DEBUGGING LOGS
        if (quiz.title === "SOP Quiz") {
          // Or use quiz._id.toString() if more reliable
          console.log(
            `[quizService.getAvailableQuizzesForStaff] Processing quiz: ${quiz.title} (ID: ${quiz._id})`
          );
          console.log(
            `[quizService.getAvailableQuizzesForStaff]   - quiz.retakeCooldownHours: ${quiz.retakeCooldownHours}`
          );
          console.log(
            `[quizService.getAvailableQuizzesForStaff]   - staffUser._id for SQP query: ${staffUser._id}`
          );
          console.log(
            `[quizService.getAvailableQuizzesForStaff]   - quiz._id for SQP query: ${quiz._id}`
          );
          console.log(
            `[quizService.getAvailableQuizzesForStaff]   - quiz.restaurantId for SQP query: ${quiz.restaurantId}`
          );
        }
        // END SERVER-SIDE DEBUGGING LOGS

        if (quiz.retakeCooldownHours > 0) {
          const progress = await StaffQuizProgress.findOne({
            staffUserId: staffUser._id, // Use staffUser._id from fetched staffUser
            quizId: quiz._id,
            restaurantId: quiz.restaurantId, // ensure restaurantId is part of query for specificity
          }).lean<PlainIStaffQuizProgress>();

          // SERVER-SIDE DEBUGGING LOGS
          if (quiz.title === "SOP Quiz") {
            console.log(
              "[quizService.getAvailableQuizzesForStaff]   - SQP findOne result (progress):",
              progress
            );
            if (progress) {
              console.log(
                "[quizService.getAvailableQuizzesForStaff]     - progress.lastAttemptCompletedAt:",
                progress.lastAttemptCompletedAt
              );
            }
          }
          // END SERVER-SIDE DEBUGGING LOGS

          if (progress && progress.lastAttemptCompletedAt) {
            lastAttemptCompletedAtStr =
              progress.lastAttemptCompletedAt.toISOString();
            const cooldownEndTime = new Date(
              progress.lastAttemptCompletedAt.getTime() +
                quiz.retakeCooldownHours * 60 * 60 * 1000
            );

            // SERVER-SIDE DEBUGGING LOGS
            if (quiz.title === "SOP Quiz") {
              console.log(
                "[quizService.getAvailableQuizzesForStaff]     - calculated cooldownEndTime:",
                cooldownEndTime.toISOString()
              );
              console.log(
                "[quizService.getAvailableQuizzesForStaff]     - new Date() < cooldownEndTime:",
                new Date() < cooldownEndTime
              );
            }
            // END SERVER-SIDE DEBUGGING LOGS

            if (new Date() < cooldownEndTime) {
              nextAvailableAt = cooldownEndTime.toISOString();
            }
          }
        }

        // SERVER-SIDE DEBUGGING LOGS
        if (quiz.title === "SOP Quiz") {
          console.log(
            `[quizService.getAvailableQuizzesForStaff]   - final nextAvailableAt for this quiz: ${nextAvailableAt}`
          );
        }
        // END SERVER-SIDE DEBUGGING LOGS

        availableQuizzesInfo.push({
          _id: quiz._id.toString(),
          title: quiz.title,
          description: quiz.description,
          createdAt: quiz.createdAt,
          numQuestions: quiz.numberOfQuestionsPerAttempt,
          retakeCooldownHours: quiz.retakeCooldownHours,
          nextAvailableAt,
          lastAttemptCompletedAt: lastAttemptCompletedAtStr,
        });
      }

      return availableQuizzesInfo;
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
      sourceSopDocumentId,
      numberOfQuestionsPerAttempt,
      targetRoles,
      retakeCooldownHours, // Added field
    } = data;

    // Validate that at least one source is provided
    if (
      (!questionBankIds || questionBankIds.length === 0) &&
      !sourceSopDocumentId
    ) {
      throw new AppError(
        "Quiz creation requires either questionBankIds or a sourceSopDocumentId.",
        400
      );
    }
    if (questionBankIds && questionBankIds.length > 0 && sourceSopDocumentId) {
      throw new AppError(
        "Quiz creation can be from banks OR an SOP document, not both.",
        400
      );
    }

    let questionIds: Types.ObjectId[] = [];
    let sourceSnapshotCount = 0;
    let finalSourceType: "QUESTION_BANKS" | "SOP_DOCUMENT" = "QUESTION_BANKS";
    let finalSopDocumentId: Types.ObjectId | undefined = undefined;

    if (sourceSopDocumentId) {
      if (!mongoose.Types.ObjectId.isValid(sourceSopDocumentId)) {
        throw new AppError("Invalid SOP Document ID format.", 400);
      }
      const sopDocObjectId = new Types.ObjectId(sourceSopDocumentId);
      const sopDoc = await SopDocumentModel.findById(sopDocObjectId).lean();
      if (
        !sopDoc ||
        sopDoc.restaurantId.toString() !== restaurantId.toString()
      ) {
        throw new AppError(
          "SOP Document not found or does not belong to this restaurant.",
          404
        );
      }
      if (!sopDoc.questionBankId) {
        throw new AppError(
          "The selected SOP Document does not have an associated Question Bank to source questions from.",
          400
        );
      }
      // Use the question bank linked to the SOP
      const sopLinkedBank = await QuestionBankModel.findById(
        sopDoc.questionBankId
      ).lean();
      if (
        !sopLinkedBank ||
        !sopLinkedBank.questions ||
        sopLinkedBank.questions.length === 0
      ) {
        throw new AppError(
          "The Question Bank linked to the SOP Document has no questions.",
          400
        );
      }
      questionIds = sopLinkedBank.questions.map((id) => new Types.ObjectId(id));
      sourceSnapshotCount = questionIds.length;
      finalSourceType = "SOP_DOCUMENT";
      finalSopDocumentId = sopDocObjectId;
    } else if (questionBankIds && questionBankIds.length > 0) {
      const bankObjectIds = questionBankIds.map((id) => new Types.ObjectId(id));
      questionIds = await getUniqueValidQuestionIdsFromQuestionBanks(
        bankObjectIds,
        restaurantId
      );
      sourceSnapshotCount = questionIds.length;
      finalSourceType = "QUESTION_BANKS";
    }

    if (questionIds.length === 0) {
      throw new AppError(
        "No valid questions found in the selected sources for this restaurant.",
        400
      );
    }
    if (numberOfQuestionsPerAttempt > questionIds.length) {
      throw new AppError(
        `Number of questions per attempt (${numberOfQuestionsPerAttempt}) cannot exceed the total unique questions available (${questionIds.length}).`,
        400
      );
    }

    const newQuiz = new QuizModel({
      title,
      description,
      restaurantId,
      sourceQuestionBankIds:
        finalSourceType === "QUESTION_BANKS" && questionBankIds
          ? questionBankIds.map((id) => new Types.ObjectId(id))
          : [],
      sourceSopDocumentId: finalSopDocumentId,
      sourceType: finalSourceType,
      totalUniqueQuestionsInSourceSnapshot: sourceSnapshotCount,
      numberOfQuestionsPerAttempt,
      isAvailable: false, // Default to draft (inactive)
      targetRoles: targetRoles || [], // Ensure targetRoles is an array
      retakeCooldownHours: retakeCooldownHours || 0, // Added field, default to 0
    });

    try {
      await newQuiz.save();
      return newQuiz;
    } catch (error: any) {
      // Handle potential duplicate key error for title within the same restaurant
      if (error.code === 11000) {
        // Assuming a unique compound index on (title, restaurantId)
        throw new AppError(
          `A quiz with the title "${title}" already exists for this restaurant.`,
          409 // Conflict
        );
      }
      throw new AppError("Failed to save the new quiz.", 500);
    }
  }

  /**
   * Starts a quiz attempt for a staff member.
   * - Finds or creates staff quiz progress.
   * - Selects a new set of questions for the attempt.
   *
   * @param staffUserId - The ID of the staff user.
   * @param quizId - The ID of the quiz definition.
   * @returns A promise resolving to an object with quiz title and questions for the attempt.
   * @throws {AppError} If quiz not found, or other issues occur.
   */
  static async startQuizAttempt(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<{ quizTitle: string; questions: QuestionForQuizAttempt[] }> {
    // 1. Fetch the Quiz definition
    const quiz = await QuizModel.findById(quizId).lean<PlainIQuiz>();

    if (!quiz || !quiz.isAvailable) {
      console.error(
        `[QuizService.startQuizAttempt] Quiz not found or not available. Quiz ID: ${quizId}`
      );
      throw new AppError("Quiz not found or is not currently available.", 404);
    }

    // ADDED: Cooldown Logic Start
    if (quiz.retakeCooldownHours > 0) {
      const progress = await StaffQuizProgress.findOne({
        staffUserId,
        quizId,
        restaurantId: quiz.restaurantId, // ensure restaurantId is part of query for specificity
      }).lean<PlainIStaffQuizProgress>(); // PlainIStaffQuizProgress has lastAttemptCompletedAt

      if (progress && progress.lastAttemptCompletedAt) {
        const cooldownEndTime = new Date(
          progress.lastAttemptCompletedAt.getTime() +
            quiz.retakeCooldownHours * 60 * 60 * 1000
        );

        if (new Date() < cooldownEndTime) {
          throw new AppError(
            "This quiz is currently on cooldown for you.",
            403,
            {
              nextAvailableAt: cooldownEndTime.toISOString(),
              reason: "COOLDOWN_ACTIVE",
            }
          );
        }
      }
    }
    // ADDED: Cooldown Logic End

    // 2. Find or create StaffQuizProgress
    let staffProgress = await StaffQuizProgress.findOne({
      staffUserId,
      quizId,
      restaurantId: quiz.restaurantId,
    });

    if (!staffProgress) {
      staffProgress = await StaffQuizProgress.create({
        staffUserId,
        quizId,
        restaurantId: quiz.restaurantId,
        seenQuestionIds: [],
        totalUniqueQuestionsInSource: quiz.totalUniqueQuestionsInSourceSnapshot,
        isCompletedOverall: false,
      });
    }

    // 3. If already completed, return empty array
    if (staffProgress.isCompletedOverall) {
      return { quizTitle: quiz.title, questions: [] };
    }

    // 4. Fetch all unique, active question IDs from the Quiz's source question banks
    const allQuestionIdsInSource =
      await getUniqueValidQuestionIdsFromQuestionBanks(
        quiz.sourceQuestionBankIds,
        quiz.restaurantId
      );

    // 5. Filter out seen questions
    const seenQuestionIdsSet = new Set(
      staffProgress.seenQuestionIds.map((id) => id.toString())
    );

    const availablePoolIds = allQuestionIdsInSource.filter(
      (id) => !seenQuestionIdsSet.has(id.toString())
    );

    // 6. If availablePool is empty, mark as completed and return empty
    if (availablePoolIds.length === 0) {
      staffProgress.isCompletedOverall = true;
      await staffProgress.save();
      return { quizTitle: quiz.title, questions: [] };
    }

    // 7. Randomly select N questions from availablePoolIds
    _shuffleArray(availablePoolIds); // Shuffle in place
    const questionsToPresentIds = availablePoolIds.slice(
      0,
      quiz.numberOfQuestionsPerAttempt
    );

    if (
      questionsToPresentIds.length === 0 &&
      quiz.numberOfQuestionsPerAttempt > 0
    ) {
      console.warn(
        `[QuizService.startQuizAttempt] WARNING: Selected 0 questions to present, but numberOfQuestionsPerAttempt is ${quiz.numberOfQuestionsPerAttempt}. This implies availablePoolIds was empty or smaller than N.`
      );
      return { quizTitle: quiz.title, questions: [] }; // Explicitly return empty if nothing was selected to present
    }

    // 8. Fetch full question objects for these IDs
    const questionsForAttempt = await QuestionModel.find({
      _id: { $in: questionsToPresentIds },
    })
      .select("_id questionText questionType options categories")
      .lean<QuestionForQuizAttempt[]>();

    const orderedQuestions = questionsToPresentIds
      .map((idToFind) =>
        questionsForAttempt.find(
          (q: QuestionForQuizAttempt) =>
            q._id.toString() === idToFind.toString()
        )
      )
      .filter((q) => q !== undefined) as QuestionForQuizAttempt[];

    // 9. Randomize the order of options for each question to prevent pattern recognition
    const questionsWithRandomizedOptions = orderedQuestions.map((question) => {
      if (
        question.questionType === "multiple-choice-single" ||
        question.questionType === "multiple-choice-multiple"
      ) {
        // Create a copy of the options array and shuffle it
        const shuffledOptions = [...question.options];
        _shuffleArray(shuffledOptions);

        return {
          ...question,
          options: shuffledOptions,
        };
      }
      // For true-false questions, keep original order (True/False is standard)
      return question;
    });

    return { quizTitle: quiz.title, questions: questionsWithRandomizedOptions };
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
    const quiz = await QuizModel.findById(quizId).lean<PlainIQuiz>();
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
        explanation: fullQuestion.explanation,
      });
    }

    // 3. Create QuizAttempt document (skip for practice mode)
    let newAttempt;
    if (!attemptData.isPracticeMode) {
      newAttempt = await QuizAttempt.create({
        staffUserId,
        quizId,
        restaurantId: quiz.restaurantId,
        questionsPresented: attemptQuestionsProcessedForDB,
        score,
        attemptDate: new Date(),
        durationInSeconds: attemptData.durationInSeconds,
      });

      // 4. Update StaffQuizProgress (skip for practice mode)
      staffProgress.seenQuestionIds = [
        ...new Set([
          ...staffProgress.seenQuestionIds.map((id) => id.toString()),
          ...presentedQuestionIds.map((id) => id.toString()),
        ]),
      ].map((idStr) => new Types.ObjectId(idStr));

      staffProgress.lastAttemptCompletedAt = newAttempt.attemptDate;

      if (
        staffProgress.seenQuestionIds.length >=
        staffProgress.totalUniqueQuestionsInSource
      ) {
        staffProgress.isCompletedOverall = true;
      }

      await staffProgress.save();
    } else {
      // For practice mode, create a temporary attempt object for response
      newAttempt = {
        _id: new Types.ObjectId(),
        attemptDate: new Date(),
        durationInSeconds: attemptData.durationInSeconds,
      };
    }

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
    const progress = await StaffQuizProgress.findOne({
      staffUserId,
      quizId,
    })
      .populate<{ staffUserId: IUser }>("staffUserId", "name email _id")
      .populate<{ quizId: IQuiz }>("quizId")
      .lean<PlainIStaffQuizProgress & { staffUserId: IUser; quizId: IQuiz }>();

    if (!progress) {
      const quiz = await QuizModel.findById(quizId).lean<IQuiz>();
      if (!quiz) return null;
      const user = await User.findById(staffUserId).lean<IUser>();
      if (!user) return null;

      return {
        _id: new mongoose.Types.ObjectId(),
        staffUserId: user,
        quizId: quiz,
        restaurantId: quiz.restaurantId,
        seenQuestionIds: [],
        totalUniqueQuestionsInSource:
          quiz.totalUniqueQuestionsInSourceSnapshot || 0,
        isCompletedOverall: false,
        lastAttemptCompletedAt: undefined,
        averageScore: null,
        createdAt: undefined,
        updatedAt: undefined,
        attempts: [],
      } as IStaffQuizProgressWithAttempts;
    }

    let averageScoreForThisQuiz: number | null = null;
    const attemptDocs = await QuizAttempt.find({
      staffUserId,
      quizId,
      restaurantId: (progress.quizId as IQuiz).restaurantId,
    })
      .select("_id score questionsPresented attemptDate")
      .sort({ attemptDate: -1 })
      .lean<IQuizAttempt[]>();

    const attemptSummaries: IQuizAttemptSummary[] = attemptDocs.map(
      (attempt) => {
        const totalQuestionsInAttempt = attempt.questionsPresented?.length || 0;
        return {
          _id: (attempt._id as Types.ObjectId).toString(),
          score: attempt.score,
          totalQuestions: totalQuestionsInAttempt,
          attemptDate: attempt.attemptDate,
          hasIncorrectAnswers:
            totalQuestionsInAttempt > 0 &&
            attempt.score < totalQuestionsInAttempt,
        };
      }
    );

    if (attemptDocs.length > 0) {
      let totalPercentageSum = 0;
      let validAttemptsCount = 0;
      attemptDocs.forEach((attempt) => {
        const totalQuestionsInAttempt = attempt.questionsPresented?.length || 0;
        if (totalQuestionsInAttempt > 0) {
          totalPercentageSum += attempt.score / totalQuestionsInAttempt;
          validAttemptsCount++;
        }
      });
      if (validAttemptsCount > 0) {
        averageScoreForThisQuiz = parseFloat(
          ((totalPercentageSum / validAttemptsCount) * 100).toFixed(1)
        );
      }
    }

    // Explicitly construct the return object to match IStaffQuizProgressWithAttempts
    return {
      _id: progress._id,
      staffUserId: progress.staffUserId, // progress.staffUserId is IUser due to lean type
      quizId: progress.quizId, // progress.quizId is IQuiz due to lean type
      restaurantId: progress.restaurantId, // Ensure this is on PlainIStaffQuizProgress or IQuiz
      seenQuestionIds: progress.seenQuestionIds,
      totalUniqueQuestionsInSource: progress.totalUniqueQuestionsInSource,
      isCompletedOverall: progress.isCompletedOverall,
      lastAttemptCompletedAt: progress.lastAttemptCompletedAt,
      averageScore:
        progress.averageScore !== undefined
          ? progress.averageScore
          : averageScoreForThisQuiz,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
      attempts: attemptSummaries,
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
      .select("_id name email assignedRoleId") // Ensure assignedRoleId is fetched
      .lean<Pick<IUser, "_id" | "name" | "email" | "assignedRoleId">[]>();

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
        | "lastAttemptCompletedAt"
      > | null = staffProgressDoc
        ? {
            isCompletedOverall: staffProgressDoc.isCompletedOverall,
            seenQuestionIds: staffProgressDoc.seenQuestionIds,
            totalUniqueQuestionsInSource:
              staffProgressDoc.totalUniqueQuestionsInSource,
            lastAttemptCompletedAt: staffProgressDoc.lastAttemptCompletedAt,
          }
        : null;

      allStaffProgressDetails.push({
        staffMember: {
          _id: staff._id as Types.ObjectId, // Cast as IUser already has ObjectId _id
          name: staff.name,
          email: staff.email,
          // professionalRole: staff.professionalRole, // Remove this line
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
      throw new AppError("Invalid attempt ID format", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserIdString)) {
      throw new AppError("Invalid user ID format", 400);
    }

    const attemptObjectId = new Types.ObjectId(attemptId);
    const requestingUserId = new Types.ObjectId(requestingUserIdString);

    const attempt = await QuizAttempt.findById(attemptObjectId)
      .populate<{ quizId: Pick<IQuiz, "_id" | "title" | "restaurantId"> }>({
        path: "quizId",
        select: "_id title restaurantId",
      })
      .lean<IQuizAttempt>();

    if (!attempt) {
      return null;
    }

    // Populate the role for the requesting user
    const requestingUser = await User.findById(requestingUserId)
      .populate<{ assignedRoleId: IRole }>("assignedRoleId") // Populate the 'assignedRoleId' field
      .select("role restaurantId assignedRoleId") // Ensure assignedRoleId is selected
      .lean<
        Pick<IUser, "_id" | "role" | "restaurantId" | "assignedRoleId"> & {
          assignedRoleId?: IRole;
        }
      >(); // Adjust lean type

    if (!requestingUser) {
      throw new AppError("Requesting user not found", 404);
    }

    const quizData = attempt.quizId as Pick<
      IQuiz,
      "_id" | "title" | "restaurantId"
    >;

    // Authorization check
    let isAuthorized = false;
    if (
      requestingUser._id.toString() ===
      (attempt.staffUserId as Types.ObjectId).toString()
    ) {
      isAuthorized = true;
    }

    // Use the populated role name for authorization
    // The `requestingUser.role` is the general role string ('staff', 'restaurant')
    // The `requestingUser.assignedRoleId` is the populated specific role from RoleModel
    const specificRoleName = requestingUser.assignedRoleId?.name;

    if (
      requestingUser.role === "restaurant" ||
      specificRoleName === "restaurantAdmin" ||
      specificRoleName === "manager"
    ) {
      if (
        quizData &&
        requestingUser.restaurantId &&
        quizData.restaurantId.equals(requestingUser.restaurantId)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new AppError(
        "You are not authorized to view this quiz attempt.",
        403
      );
    }

    const incorrectQuestionDetails: IncorrectQuestionDetailForAttempt[] = [];

    if (attempt.questionsPresented && attempt.questionsPresented.length > 0) {
      for (const presentedQ of attempt.questionsPresented) {
        if (!presentedQ.isCorrect) {
          const questionDoc = await QuestionModel.findById(
            presentedQ.questionId
          ).lean<QuestionDocument>();

          let questionText: string;
          let userAnswerText: string;
          let correctAnswerText: string;
          let explanation: string | undefined = undefined;

          if (questionDoc) {
            questionText = questionDoc.questionText;
            explanation = questionDoc.explanation;

            if (questionDoc.questionType === "true-false") {
              const userAnswerGivenStr = String(presentedQ.answerGiven);
              const answeredOption = questionDoc.options.find(
                (opt) => opt._id.toString() === userAnswerGivenStr
              );
              userAnswerText = answeredOption?.text || "Not answered";
              const correctOpt = questionDoc.options.find(
                (opt) => opt.isCorrect
              );
              correctAnswerText = correctOpt?.text || "Error: Correct N/A";
            } else if (
              questionDoc.questionType === "multiple-choice-single" ||
              questionDoc.questionType === "multiple-choice-multiple"
            ) {
              const getOptionTextById = (optionIdToFind: any) => {
                const optionIdStr = String(optionIdToFind);
                const opt = questionDoc.options.find(
                  (o) => o._id.toString() === optionIdStr
                );
                return opt?.text;
              };

              if (Array.isArray(presentedQ.answerGiven)) {
                userAnswerText = presentedQ.answerGiven
                  .map((id) => getOptionTextById(id))
                  .filter(Boolean)
                  .join(", ");
                if (!userAnswerText && presentedQ.answerGiven.length > 0) {
                  userAnswerText = "Invalid Option(s) ID";
                } else if (!userAnswerText) {
                  userAnswerText = "No selection";
                }
              } else if (
                presentedQ.answerGiven !== null &&
                presentedQ.answerGiven !== undefined
              ) {
                userAnswerText =
                  getOptionTextById(presentedQ.answerGiven) ||
                  "Invalid Option ID";
              } else {
                userAnswerText = "Not answered";
              }

              correctAnswerText = questionDoc.options
                .filter((opt) => opt.isCorrect)
                .map((opt) => opt.text)
                .join(", ");
            } else {
              userAnswerText =
                "Answered (format not recognized for this question type)";
              correctAnswerText =
                "Correct answer (format not recognized for this question type)";
            }
          } else {
            // questionDoc is null
            questionText =
              "Question data unavailable (it may have been deleted or is invalid).";
            if (
              presentedQ.answerGiven !== null &&
              presentedQ.answerGiven !== undefined
            ) {
              userAnswerText =
                "User's answer (details unavailable as original question data is missing).";
            } else {
              userAnswerText =
                "Not answered (original question data is missing).";
            }
            correctAnswerText =
              "Correct answer (details unavailable as original question data is missing).";
            // explanation remains undefined
          }

          incorrectQuestionDetails.push({
            questionText: questionText,
            userAnswer: userAnswerText,
            correctAnswer: correctAnswerText,
            explanation: explanation,
          });
        }
      }
    }

    return {
      _id: attempt._id.toString(),
      quizId: quizData._id.toString(),
      quizTitle: quizData.title || "Quiz Title Not Found",
      staffUserId: (attempt.staffUserId as Types.ObjectId).toString(),
      score: attempt.score,
      totalQuestions: attempt.questionsPresented.length,
      attemptDate: attempt.attemptDate,
      incorrectQuestions: incorrectQuestionDetails,
    };
  }

  /**
   * Gets all incorrect answers across all quiz attempts for a specific staff member
   *
   * @param staffUserId - The ID of the staff member
   * @param requestingUserIdString - The ID of the requesting user (for authorization)
   * @param quizId - Optional: If provided, only get incorrect answers for this specific quiz
   * @returns A promise resolving to aggregated incorrect question details
   * @throws {AppError} If user is not authorized or other errors occur
   */
  static async getAllIncorrectAnswersForStaff(
    staffUserId: Types.ObjectId,
    requestingUserIdString: string,
    quizId?: Types.ObjectId
  ): Promise<{
    staffInfo: {
      id: string;
      name: string;
      email: string;
    };
    incorrectQuestions: Array<
      IncorrectQuestionDetailForAttempt & {
        quizTitle: string;
        attemptDate: Date;
        attemptId: string;
        timesIncorrect: number; // How many times this question was answered incorrectly
      }
    >;
    summary: {
      totalAttempts: number;
      totalIncorrectQuestions: number;
      uniqueIncorrectQuestions: number;
      mostMissedQuestion?: {
        questionText: string;
        timesIncorrect: number;
      };
    };
  } | null> {
    if (!Types.ObjectId.isValid(staffUserId)) {
      throw new AppError("Invalid staff user ID", 400);
    }

    if (!Types.ObjectId.isValid(requestingUserIdString)) {
      throw new AppError("Invalid requesting user ID", 400);
    }

    const requestingUserId = new Types.ObjectId(requestingUserIdString);

    // Get staff user details
    const staffUser = await User.findById(staffUserId)
      .select("name email restaurantId")
      .lean<Pick<IUser, "_id" | "name" | "email" | "restaurantId">>();

    if (!staffUser) {
      throw new AppError("Staff member not found", 404);
    }

    // Populate the role for the requesting user
    const requestingUser = await User.findById(requestingUserId)
      .populate<{ assignedRoleId: IRole }>("assignedRoleId")
      .select("role restaurantId assignedRoleId")
      .lean<
        Pick<IUser, "_id" | "role" | "restaurantId" | "assignedRoleId"> & {
          assignedRoleId?: IRole;
        }
      >();

    if (!requestingUser) {
      throw new AppError("Requesting user not found", 404);
    }

    // Authorization check
    let isAuthorized = false;
    if (requestingUserId.toString() === staffUserId.toString()) {
      isAuthorized = true;
    }

    const specificRoleName = requestingUser.assignedRoleId?.name;

    if (
      requestingUser.role === "restaurant" ||
      specificRoleName === "restaurantAdmin" ||
      specificRoleName === "manager"
    ) {
      if (
        requestingUser.restaurantId &&
        staffUser.restaurantId &&
        requestingUser.restaurantId.equals(staffUser.restaurantId)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new AppError(
        "You are not authorized to view this staff member's quiz data.",
        403
      );
    }

    // Build the query for attempts
    const attemptQuery: any = {
      staffUserId: staffUserId,
      restaurantId: staffUser.restaurantId,
    };

    if (quizId) {
      attemptQuery.quizId = quizId;
    }

    // Get all quiz attempts for this staff member
    const attempts = await QuizAttempt.find(attemptQuery)
      .populate<{ quizId: Pick<IQuiz, "_id" | "title" | "isAvailable"> }>({
        path: "quizId",
        select: "_id title isAvailable",
      })
      .select("quizId questionsPresented attemptDate score")
      .sort({ attemptDate: -1 })
      .lean<
        Array<
          IQuizAttempt & {
            quizId: Pick<IQuiz, "_id" | "title" | "isAvailable">;
          }
        >
      >();

    // Filter to only include attempts from available quizzes
    const activeAttempts = attempts.filter(
      (attempt) => attempt.quizId && attempt.quizId.isAvailable === true
    );

    const allIncorrectQuestions: Array<
      IncorrectQuestionDetailForAttempt & {
        quizTitle: string;
        attemptDate: Date;
        attemptId: string;
        timesIncorrect: number;
      }
    > = [];

    // Track question frequency for summary
    const questionFrequency = new Map<
      string,
      {
        count: number;
        questionText: string;
      }
    >();

    // Process each attempt
    for (const attempt of activeAttempts) {
      if (
        !attempt.questionsPresented ||
        attempt.questionsPresented.length === 0
      ) {
        continue;
      }

      for (const presentedQ of attempt.questionsPresented) {
        if (!presentedQ.isCorrect) {
          const questionDoc = await QuestionModel.findById(
            presentedQ.questionId
          ).lean<QuestionDocument>();

          let questionText: string;
          let userAnswerText: string;
          let correctAnswerText: string;
          let explanation: string | undefined = undefined;

          if (questionDoc) {
            questionText = questionDoc.questionText;
            explanation = questionDoc.explanation;

            if (questionDoc.questionType === "true-false") {
              const userAnswerGivenStr = String(presentedQ.answerGiven);
              const answeredOption = questionDoc.options.find(
                (opt) => opt._id.toString() === userAnswerGivenStr
              );
              userAnswerText = answeredOption?.text || "Not answered";
              const correctOpt = questionDoc.options.find(
                (opt) => opt.isCorrect
              );
              correctAnswerText = correctOpt?.text || "Error: Correct N/A";
            } else if (
              questionDoc.questionType === "multiple-choice-single" ||
              questionDoc.questionType === "multiple-choice-multiple"
            ) {
              const getOptionTextById = (optionIdToFind: any) => {
                const optionIdStr = String(optionIdToFind);
                const opt = questionDoc.options.find(
                  (o) => o._id.toString() === optionIdStr
                );
                return opt?.text;
              };

              if (Array.isArray(presentedQ.answerGiven)) {
                userAnswerText = presentedQ.answerGiven
                  .map((id) => getOptionTextById(id))
                  .filter(Boolean)
                  .join(", ");
                if (!userAnswerText && presentedQ.answerGiven.length > 0) {
                  userAnswerText = "Invalid Option(s) ID";
                } else if (!userAnswerText) {
                  userAnswerText = "No selection";
                }
              } else if (
                presentedQ.answerGiven !== null &&
                presentedQ.answerGiven !== undefined
              ) {
                userAnswerText =
                  getOptionTextById(presentedQ.answerGiven) ||
                  "Invalid Option ID";
              } else {
                userAnswerText = "Not answered";
              }

              correctAnswerText = questionDoc.options
                .filter((opt) => opt.isCorrect)
                .map((opt) => opt.text)
                .join(", ");
            } else {
              userAnswerText =
                "Answered (format not recognized for this question type)";
              correctAnswerText =
                "Correct answer (format not recognized for this question type)";
            }
          } else {
            questionText =
              "Question data unavailable (it may have been deleted or is invalid).";
            if (
              presentedQ.answerGiven !== null &&
              presentedQ.answerGiven !== undefined
            ) {
              userAnswerText =
                "User's answer (details unavailable as original question data is missing).";
            } else {
              userAnswerText =
                "Not answered (original question data is missing).";
            }
            correctAnswerText =
              "Correct answer (details unavailable as original question data is missing).";
          }

          // Track question frequency
          const questionKey = presentedQ.questionId.toString();
          const existing = questionFrequency.get(questionKey);
          if (existing) {
            existing.count++;
          } else {
            questionFrequency.set(questionKey, {
              count: 1,
              questionText: questionText,
            });
          }

          allIncorrectQuestions.push({
            questionText: questionText,
            userAnswer: userAnswerText,
            correctAnswer: correctAnswerText,
            explanation: explanation,
            quizTitle: attempt.quizId.title || "Quiz Title Not Found",
            attemptDate: attempt.attemptDate,
            attemptId: attempt._id.toString(),
            timesIncorrect: questionFrequency.get(questionKey)?.count || 1,
          });
        }
      }
    }

    // Calculate summary statistics
    const totalAttempts = activeAttempts.length;
    const totalIncorrectQuestions = allIncorrectQuestions.length;
    const uniqueIncorrectQuestions = questionFrequency.size;

    // Find most missed question
    let mostMissedQuestion:
      | {
          questionText: string;
          timesIncorrect: number;
        }
      | undefined;

    let maxCount = 0;
    for (const [, { count, questionText }] of questionFrequency) {
      if (count > maxCount) {
        maxCount = count;
        mostMissedQuestion = {
          questionText,
          timesIncorrect: count,
        };
      }
    }

    // Update timesIncorrect for each question based on frequency map
    allIncorrectQuestions.forEach((question) => {
      // Find the question ID from the original attempt that matches this question
      const matchingEntry = Array.from(questionFrequency.entries()).find(
        ([, { questionText }]) => questionText === question.questionText
      );
      if (matchingEntry) {
        question.timesIncorrect = matchingEntry[1].count;
      }
    });

    return {
      staffInfo: {
        id: staffUser._id.toString(),
        name: staffUser.name,
        email: staffUser.email,
      },
      incorrectQuestions: allIncorrectQuestions,
      summary: {
        totalAttempts,
        totalIncorrectQuestions,
        uniqueIncorrectQuestions,
        mostMissedQuestion,
      },
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

  /**
   * Updates the totalUniqueQuestionsInSourceSnapshot for all quizzes that use the specified question banks
   *
   * @param questionBankIds - Array of question bank IDs that have been updated
   * @param restaurantId - Restaurant ID to scope the update
   * @returns Promise resolving to the number of quizzes updated
   */
  static async updateQuizSnapshotsForQuestionBanks(
    questionBankIds: Types.ObjectId[],
    restaurantId: Types.ObjectId
  ): Promise<number> {
    try {
      // Find all quizzes that source from these question banks
      // Include quizzes with sourceType "QUESTION_BANKS" OR undefined (legacy quizzes)
      const affectedQuizzes = await QuizModel.find({
        restaurantId,
        sourceQuestionBankIds: { $in: questionBankIds },
        $or: [
          { sourceType: "QUESTION_BANKS" },
          { sourceType: { $exists: false } }, // undefined/null sourceType
          { sourceType: null },
        ],
      });

      if (affectedQuizzes.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      for (const quiz of affectedQuizzes) {
        try {
          // Get current count of unique questions from this quiz's source banks
          const currentQuestionIds =
            await getUniqueValidQuestionIdsFromQuestionBanks(
              quiz.sourceQuestionBankIds,
              restaurantId
            );

          const newSnapshotCount = currentQuestionIds.length;
          const oldSnapshotCount = quiz.totalUniqueQuestionsInSourceSnapshot;

          if (newSnapshotCount !== oldSnapshotCount) {
            // Update the quiz with the new snapshot count
            // Also set sourceType to "QUESTION_BANKS" if it's undefined (legacy fix)
            const updateFields: any = {
              totalUniqueQuestionsInSourceSnapshot: newSnapshotCount,
            };

            if (!quiz.sourceType) {
              updateFields.sourceType = "QUESTION_BANKS";
            }

            await QuizModel.findByIdAndUpdate(quiz._id, {
              $set: updateFields,
            });

            updatedCount++;
          }
        } catch (quizError) {
          console.error(
            `Failed to update snapshot for quiz "${quiz.title}":`,
            quizError
          );
          // Continue with other quizzes even if one fails
        }
      }

      return updatedCount;
    } catch (error) {
      console.error(
        `Failed to update quiz snapshots for question banks:`,
        error
      );
      // Don't throw error as this is a background update operation
      return 0;
    }
  }
}
