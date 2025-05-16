import mongoose, { Types } from "mongoose";
import Quiz, { IQuiz } from "../models/Quiz";
import { IQuestion } from "../models/QuestionModel";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import User, { IUser } from "../models/User"; // Import User model AND IUser interface
import Restaurant from "../models/Restaurant"; // ADDED: Import Restaurant model
// Import other models if needed (e.g., Menu, User, QuizResult)
import { AppError } from "../utils/errorHandler";
import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import StaffQuizProgress, {
  IStaffQuizProgress,
} from "../models/StaffQuizProgress";
import QuestionModel, {
  IQuestion as QuestionDocument,
  IOption as QuestionModelIOption,
} from "../models/QuestionModel"; // Renamed to avoid conflict with IQuestion from QuestionBankModel if any
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";
import { getUniqueValidQuestionIdsFromQuestionBanks } from "./questionBankService"; // Added import
import { IQuizAttemptSummary } from "../types/quizTypes"; // Ensured import

// ADDED: Interface for creating quiz from banks
export interface CreateQuizFromBanksData {
  title: string;
  description?: string;
  restaurantId: Types.ObjectId;
  questionBankIds: string[]; // or Types.ObjectId[] depending on what the service expects
  numberOfQuestionsPerAttempt: number;
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
  ): Promise<IQuiz> {
    const allowedUpdateKeys: (keyof IQuiz)[] = [
      "title",
      "description",
      "sourceQuestionBankIds",
      "numberOfQuestionsPerAttempt",
      "isAvailable",
      // "isAssigned", // REMOVED from allowed keys
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
    // if (quiz.isAvailable && !oldIsAvailable) { // REMOVED Block for isAssigned logic
    //   console.log(
    //     `Quiz ${quizId} is being made available. Mass assignment logic would trigger here.`
    //   );
    //   // await _assignQuizToAllRestaurantStaff(quiz._id, quiz.restaurantId, quiz.title, quiz.numberOfQuestionsPerAttempt);
    //   // quiz.isAssigned = true; // Potentially set based on assignment outcome
    // }

    // If the quiz is being DEACTIVATED (was available, now is not)
    // Reset progress for all staff for this quiz.
    if (oldIsAvailable === true && quiz.isAvailable === false) {
      console.log(
        `Quiz ${quizId} is being DEACTIVATED. Resetting progress for everyone.`
      );
      try {
        // Assuming resetQuizProgressForEveryone handles its own transaction or can be called standalone.
        await QuizService.resetQuizProgressForEveryone(
          quiz._id,
          quiz.restaurantId
        );
        console.log(
          `Successfully reset progress for quiz ${quizId} during deactivation.`
        );
      } catch (resetError: any) {
        // Log the error, but decide if this should prevent the quiz from being saved as deactivated.
        // For now, we'll log and continue, as the primary action is deactivation.
        // A more robust solution might involve transactions spanning both operations.
        console.error(
          `Error resetting progress for quiz ${quizId} during deactivation:`,
          resetError
        );
        // Optionally, re-throw if progress reset is critical for deactivation to proceed
        // throw new AppError(`Failed to reset quiz progress during deactivation: ${resetError.message}`, 500);
      }
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
    restaurantId: Types.ObjectId,
    staffUserId: Types.ObjectId
  ): Promise<AvailableQuizInfo[]> {
    try {
      // 1. Fetch all quizzes for the restaurant that are marked isAvailable: true
      const allAvailableQuizzesInRestaurant = await Quiz.find({
        restaurantId: restaurantId,
        isAvailable: true,
      })
        .select("_id title description createdAt numberOfQuestionsPerAttempt")
        .lean<
          Pick<
            IQuiz,
            | "_id"
            | "title"
            | "description"
            | "createdAt"
            | "numberOfQuestionsPerAttempt"
          >[]
        >();

      if (!allAvailableQuizzesInRestaurant.length) {
        return []; // No available quizzes in this restaurant
      }

      // 2. For each available quiz, fetch the specific staff member's progress and calculate their average score.
      const availableQuizzesWithStaffDataPromises =
        allAvailableQuizzesInRestaurant.map(async (quizDef) => {
          // Fetch staff progress for this specific quiz
          const staffProgress = await StaffQuizProgress.findOne({
            staffUserId: staffUserId,
            quizId: quizDef._id,
            restaurantId: restaurantId, // Ensure restaurant context for progress
          }).lean<IStaffQuizProgress | null>();

          // Calculate average score for this staff member on this quiz
          let averageScore: number | null = null;
          if (staffProgress) {
            // Only calculate if progress exists
            const quizAttemptsForThisQuiz = await QuizAttempt.find({
              staffUserId: staffUserId,
              quizId: quizDef._id,
              restaurantId: restaurantId,
            })
              .select("score questionsPresented attemptDate") // Ensure attemptDate is selected
              .lean<
                Pick<
                  IQuizAttempt,
                  "score" | "questionsPresented" | "attemptDate"
                >[]
              >();

            if (quizAttemptsForThisQuiz.length > 0) {
              let totalPercentageSum = 0;
              let validAttemptsCount = 0;
              quizAttemptsForThisQuiz.forEach((attempt) => {
                // ADD LOGGING HERE
                console.log(
                  `[QuizService.getAvailableQuizzesForStaff] User: ${staffUserId}, Quiz: ${quizDef._id} - Averaging Attempt -- Score: ${attempt.score}, TotalQ: ${attempt.questionsPresented?.length}, Date: ${attempt.attemptDate}`
                );

                if (
                  attempt.score !== undefined &&
                  attempt.questionsPresented &&
                  attempt.questionsPresented.length > 0
                ) {
                  totalPercentageSum +=
                    attempt.score / attempt.questionsPresented.length;
                  validAttemptsCount++;
                }
              });
              if (validAttemptsCount > 0) {
                averageScore = parseFloat(
                  ((totalPercentageSum / validAttemptsCount) * 100).toFixed(1)
                );
                console.log(
                  `[QuizService.getAvailableQuizzesForStaff] User: ${staffUserId}, Quiz: ${quizDef._id} - Calculated Avg: ${averageScore}% from ${validAttemptsCount} attempts.`
                );
              }
            }
          }

          return {
            _id: quizDef._id.toString(),
            title: quizDef.title,
            description: quizDef.description,
            createdAt: quizDef.createdAt,
            numQuestions: quizDef.numberOfQuestionsPerAttempt,
            averageScore: averageScore, // This will be null if no progress or no attempts
            // Include progress-specific details if needed by the frontend, e.g.:
            // isCompletedOverall: staffProgress?.isCompletedOverall || false,
            // seenQuestionsCount: staffProgress?.seenQuestionIds?.length || 0,
            // totalUniqueQuestionsInSource: staffProgress?.totalUniqueQuestionsInSource,
          };
        });

      const availableQuizzesInfo = await Promise.all(
        availableQuizzesWithStaffDataPromises
      );

      // Sort by creation date, newest first, or other criteria as needed
      availableQuizzesInfo.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        if (a.createdAt) return -1;
        if (b.createdAt) return 1;
        return 0;
      });

      return availableQuizzesInfo;
    } catch (error: any) {
      console.error(
        `Error fetching available quizzes for staff ${staffUserId} in restaurant ${restaurantId}:`,
        error
      );
      throw new AppError("Failed to fetch available quizzes for staff.", 500);
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
      const count = await Quiz.countDocuments({
        restaurantId,
        isAvailable: true,
      });
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
    let session: mongoose.ClientSession | null = null;
    // Transaction only in production/staging, not development to simplify debugging
    if (
      process.env.NODE_ENV !== "development" &&
      process.env.NODE_ENV !== "test"
    ) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // 1. Validate quiz and user
      const quiz = await Quiz.findById(quizId).session(session).lean();
      if (!quiz) {
        throw new AppError("Quiz not found.", 404);
      }
      console.log(
        `[QuizService.startQuizAttempt] Quiz ID: ${quizId}, numberOfQuestionsPerAttempt: ${quiz.numberOfQuestionsPerAttempt}, totalUniqueInSnapshot: ${quiz.totalUniqueQuestionsInSourceSnapshot}`
      );
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

      let isNewProgress = false;
      let updated = false; // Flag to track if an existing progress document is modified

      if (!staffProgress) {
        isNewProgress = true;
        staffProgress = new StaffQuizProgress({
          staffUserId,
          quizId,
          restaurantId: quiz.restaurantId,
          seenQuestionIds: [],
          totalUniqueQuestionsInSource:
            quiz.totalUniqueQuestionsInSourceSnapshot || 0,
          isCompletedOverall: false,
        });
      } else {
        console.log(
          `[QuizService.startQuizAttempt] Existing progress found. isCompletedOverall: ${staffProgress.isCompletedOverall}`
        );
        // Sync totalUniqueQuestionsInSource from quiz model in case it changed
        if (
          quiz.totalUniqueQuestionsInSourceSnapshot !== undefined &&
          quiz.totalUniqueQuestionsInSourceSnapshot !==
            staffProgress.totalUniqueQuestionsInSource
        ) {
          staffProgress.totalUniqueQuestionsInSource =
            quiz.totalUniqueQuestionsInSourceSnapshot;
          updated = true; // Mark existing document as updated
        }
      }

      if (staffProgress) {
        console.log(
          `[QuizService.startQuizAttempt] StaffProgress for User: ${staffUserId}, Quiz: ${quizId} - Seen IDs: ${staffProgress.seenQuestionIds?.join(
            ", "
          )}`
        );
      }

      // 3. Fetch all unique, valid, active question IDs from the quiz's source banks
      const allActiveQuestionIdsInBanks =
        await getUniqueValidQuestionIdsFromQuestionBanks(
          quiz.sourceQuestionBankIds as Types.ObjectId[], // Cast needed if sourceQuestionBankIds is not strictly ObjectId[]
          quiz.restaurantId
        );
      console.log(
        `[QuizService.startQuizAttempt] All Active Question IDs from Banks (${quiz.sourceQuestionBankIds?.join(
          ", "
        )}): ${allActiveQuestionIdsInBanks.join(", ")} (Count: ${
          allActiveQuestionIdsInBanks.length
        })`
      );

      if (allActiveQuestionIdsInBanks.length === 0) {
        // This means the source banks are empty or questions were deleted.
        // Update staff progress if necessary.
        staffProgress.isCompletedOverall = true; // No questions to attempt
        await staffProgress.save({ session });
        if (session) {
          await session.commitTransaction();
        }
        throw new AppError(
          "No questions available for this quiz at the moment.",
          404
        );
      }

      // 4. Filter out already seen questions
      const seenQuestionIdsSet = new Set(
        (staffProgress.seenQuestionIds as Types.ObjectId[]).map((id) =>
          id.toString()
        )
      );
      let availableUnseenQuestionIds = allActiveQuestionIdsInBanks.filter(
        (id) => !seenQuestionIdsSet.has(id.toString())
      );
      console.log(
        `[QuizService.startQuizAttempt] Available (unseen) Question IDs: ${availableUnseenQuestionIds.join(
          ", "
        )} (Count: ${availableUnseenQuestionIds.length})`
      );

      // 5. Determine questions for the current attempt
      let finalQuestionIdsForAttempt: Types.ObjectId[];
      let questionsToAttemptCountActual: number;

      if (availableUnseenQuestionIds.length > 0) {
        // Scenario 1: Still unseen questions available
        console.log("[QuizService.startQuizAttempt] Serving UNSEEN questions.");
        _shuffleArray(availableUnseenQuestionIds);
        questionsToAttemptCountActual = Math.min(
          availableUnseenQuestionIds.length,
          quiz.numberOfQuestionsPerAttempt
        );
        finalQuestionIdsForAttempt = availableUnseenQuestionIds.slice(
          0,
          questionsToAttemptCountActual
        );
      } else {
        // Scenario 2: All unique questions have been seen at least once. Allow retake from full pool.
        console.log(
          "[QuizService.startQuizAttempt] All unique questions previously seen. Allowing retake from full active pool."
        );
        // REMOVED: Premature update of isCompletedOverall and 'updated' flag.
        // This state will be handled by submitQuizAttempt.

        if (allActiveQuestionIdsInBanks.length === 0) {
          // This case should ideally be caught earlier if banks become empty.
          // If somehow reached, it implies no questions to serve even for a retake.
          if (session) {
            await session.commitTransaction(); // Commit any pending staffProgress changes if any
          }
          throw new AppError(
            "No questions available in the source banks for this quiz (retake attempt).",
            404
          );
        }

        // Select from the entire pool of active questions for the retake
        _shuffleArray(allActiveQuestionIdsInBanks);
        questionsToAttemptCountActual = Math.min(
          allActiveQuestionIdsInBanks.length,
          quiz.numberOfQuestionsPerAttempt
        );
        finalQuestionIdsForAttempt = allActiveQuestionIdsInBanks.slice(
          0,
          questionsToAttemptCountActual
        );

        if (
          finalQuestionIdsForAttempt.length === 0 &&
          quiz.numberOfQuestionsPerAttempt > 0
        ) {
          // This could happen if numberOfQuestionsPerAttempt is > 0 but allActiveQuestionIdsInBanks became empty just now.
          // Or if allActiveQuestionIdsInBanks.length < quiz.numberOfQuestionsPerAttempt and slicing results in 0 (unlikely with Math.min)
          if (session) {
            await session.commitTransaction();
          }
          throw new AppError(
            "Failed to select questions for retake attempt, pool might be empty.",
            404
          );
        }
      }

      console.log(
        `[QuizService.startQuizAttempt] Calculated actual questionsToAttemptCount: ${questionsToAttemptCountActual} (quizSetting: ${quiz.numberOfQuestionsPerAttempt})`
      );
      console.log(
        `[QuizService.startQuizAttempt] Final Question IDs selected for attempt: ${finalQuestionIdsForAttempt.join(
          ", "
        )} (Count: ${finalQuestionIdsForAttempt.length})`
      );

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
          if (session) {
            await session.commitTransaction();
          }
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

      // REMOVED: Block for section "9. Update seen questions in StaffQuizProgress"
      // The logic to update staffProgress.seenQuestionIds and staffProgress.isCompletedOverall
      // has been removed from startQuizAttempt. These updates will be handled by submitQuizAttempt.
      // The 'updated' flag will now only be true if 'totalUniqueQuestionsInSource' was synced
      // for an existing staffProgress record.

      if (updated || isNewProgress) {
        // Save if new, or if totalUniqueQuestionsInSource changed for an existing record
        await staffProgress.save({ session });
      }

      if (session) {
        await session.commitTransaction();
      }
      return questionsForClient;
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      if (error instanceof AppError) throw error;
      console.error("Error in startQuizAttemptService:", error);
      throw new AppError("Failed to start quiz attempt.", 500);
    } finally {
      if (session) {
        session.endSession();
      }
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

    // Log the received staffUserId robustly
    if (staffUserId && typeof staffUserId.toString === "function") {
      console.log(
        `[QuizService.submitQuizAttempt] Received staffUserId: ${staffUserId.toString()} (type: ObjectId) for quizId: ${quizId.toString()}`
      );
    } else {
      console.error(
        `[QuizService.submitQuizAttempt] Received staffUserId is problematic: ${staffUserId} (type: ${typeof staffUserId})`
      );
    }

    let quiz: IQuiz | null = null; // To store fetched quiz
    let actualQuestionsMap: Map<string, QuestionDocument> = new Map();

    try {
      // 1. Fetch Quiz and User
      quiz = await Quiz.findById(quizId).session(session);
      const staffUser = await User.findById(staffUserId).session(session);

      if (!quiz) {
        throw new AppError("Quiz not found.", 404);
      }
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
        // This case should ideally be prevented by startQuizAttempt creating progress
        // or by UI flow ensuring quiz is started.
        console.error(
          `[QuizService.submitQuizAttempt] CRITICAL: StaffQuizProgress not found for User: ${staffUserId}, Quiz: ${quizId}. An attempt was made without progress record.`
        );
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

      actualQuestionsMap = new Map(
        actualQuestions.map((q) => [q._id.toString(), q as QuestionDocument])
      );

      for (const attemptedQuestion of attemptData.questions) {
        const questionDoc = actualQuestionsMap.get(
          attemptedQuestion.questionId
        );
        let isCorrect = false;

        if (questionDoc) {
          console.log(
            `[QuizService.submitQuizAttempt] Grading Q: ${questionDoc._id}, Type: ${questionDoc.questionType}, User: ${staffUserId}`
          ); // Log question being graded

          const correctAnswerDetails = {
            optionId: undefined as string | undefined, // For single choice
            optionIds: [] as string[], // For multiple choice
            text: "", // For single choice text display
            texts: [] as string[], // For multiple choice text display
          };

          if (
            questionDoc.questionType === "multiple-choice-single" ||
            questionDoc.questionType === "true-false"
          ) {
            const correctOption = questionDoc.options.find(
              (opt) => opt.isCorrect
            );
            if (correctOption) {
              console.log(
                `[QuizService.submitQuizAttempt] Q: ${
                  questionDoc._id
                } (Single/TF) - Correct Opt ID: ${correctOption._id.toString()}, User Ans: ${
                  attemptedQuestion.answerGiven
                }`
              );
              isCorrect =
                correctOption._id.toString() === attemptedQuestion.answerGiven;
              correctAnswerDetails.optionId = correctOption._id.toString();
              correctAnswerDetails.text = correctOption.text;
            } else {
              // No correct option defined by author, so user cannot be correct.
              console.warn(
                `[QuizService.submitQuizAttempt] Q: ${questionDoc._id} (Single/TF) - No correct option defined by author. Marking incorrect.`
              );
              isCorrect = false;
              correctAnswerDetails.text = "No correct answer defined";
            }
          } else if (questionDoc.questionType === "multiple-choice-multiple") {
            const correctOptionIds = new Set(
              questionDoc.options
                .filter((opt) => opt.isCorrect)
                .map((opt) => opt._id.toString())
            );
            const userAnswerOptionIds = new Set(
              attemptedQuestion.answerGiven as string[] // Assuming answerGiven is string[]
            );

            console.log(
              `[QuizService.submitQuizAttempt] Q: ${
                questionDoc._id
              } (Multiple) - Correct Opt IDs: [${Array.from(
                correctOptionIds
              ).join(", ")}], User Ans IDs: [${Array.from(
                userAnswerOptionIds
              ).join(", ")}]`
            );

            // Strict equality: all correct options must be chosen, and no incorrect ones.
            if (correctOptionIds.size === 0) {
              // If there are no correct options defined by the author,
              // the question is marked incorrect if the user selected anything.
              // If the user also selected nothing, it was previously marked correct.
              // Change: If no correct options, user must select nothing to be "correct" (or rather, not penalised).
              // However, for simplicity and to encourage authoring, if no correct options are set, mark incorrect.
              isCorrect = false;
              console.warn(
                `[QuizService.submitQuizAttempt] Q: ${questionDoc._id} (Multiple) - No correct options defined by author. Marking incorrect.`
              );
              correctAnswerDetails.texts = ["No correct answer defined"];
            } else {
              isCorrect =
                userAnswerOptionIds.size === correctOptionIds.size &&
                Array.from(userAnswerOptionIds).every((id) =>
                  correctOptionIds.has(id)
                );
            }

            questionDoc.options.forEach((opt) => {
              if (opt.isCorrect) {
                correctAnswerDetails.optionIds.push(opt._id.toString());
                correctAnswerDetails.texts.push(opt.text);
              }
            });
            if (correctAnswerDetails.texts.length === 0) {
              // This case is handled by the size === 0 check above, but as fallback:
              correctAnswerDetails.texts = ["No correct answer defined"];
            }
          } else if (questionDoc.questionType === "short-answer") {
            const correctOption = questionDoc.options.find(
              (opt) => opt.isCorrect
            );
            // Trim whitespace from the stored correct answer. Default to empty string if no correct option/text.
            const correctAnswerText = correctOption
              ? (correctOption.text || "").trim()
              : "";

            let userAnswerText = "";
            if (typeof attemptedQuestion.answerGiven === "string") {
              userAnswerText = attemptedQuestion.answerGiven.trim(); // Trim user's answer
            }
            // If attemptedQuestion.answerGiven is null or undefined, userAnswerText remains ""

            // Logic for correctness:
            if (correctAnswerText === "") {
              // If the defined correct answer is an empty string,
              // the user's answer must also be an empty string to be correct.
              isCorrect = userAnswerText === "";
            } else {
              // If the defined correct answer is not empty,
              // compare case-insensitively. An empty user answer will be incorrect here.
              isCorrect =
                userAnswerText.toLowerCase() ===
                correctAnswerText.toLowerCase();
            }

            correctAnswerDetails.text = correctOption
              ? correctOption.text
              : "N/A"; // Store original correct text (untrimmed) for display
            console.log(
              `[QuizService.submitQuizAttempt] Q: ${questionDoc._id} (Short Ans) - Correct: "${correctAnswerText}" (trimmed), User: "${userAnswerText}" (trimmed), Match: ${isCorrect}`
            );
          }
          // TODO: Add grading for other question types if they exist (e.g., fill-in-the-blanks)

          if (isCorrect) {
            score++;
          }
          gradedQuestionsDetails.push({
            questionId: questionDoc._id,
            answerGiven: attemptedQuestion.answerGiven, // Store raw answer
            isCorrect: isCorrect,
            correctAnswer: correctAnswerDetails, // Storing structured correct answer
            questionText: questionDoc.questionText, // Store question text for QuizResult
          });
        } else {
          console.warn(
            `[QuizService.submitQuizAttempt] Question ID ${attemptedQuestion.questionId} from attempt not found in DB. Skipping grading for this question.`
          );
          gradedQuestionsDetails.push({
            questionId: new Types.ObjectId(attemptedQuestion.questionId),
            answerGiven: attemptedQuestion.answerGiven,
            isCorrect: false, // Cannot be correct if not found
            correctAnswer: { text: "Question not found" },
            questionText: "Question data missing",
          });
        }
      }

      // 4. Create QuizAttempt document
      const newQuizAttempt = new QuizAttempt({
        quizId: quizId,
        staffUserId: staffUserId,
        restaurantId: quiz.restaurantId,

        // Populate 'answers' array based on the error path "answers.0"
        answers: gradedQuestionsDetails.map((q) => ({
          questionId: q.questionId, // ObjectId
          answerGiven: q.answerGiven, // Mixed
          isCorrect: q.isCorrect, // Boolean
        })),

        // Populate 'questionsPresented' with an array of objects, each containing a questionId
        questionsPresented: gradedQuestionsDetails.map((q) => ({
          questionId: q.questionId,
          answerGiven: q.answerGiven, // Store the answer given by the user
          isCorrect: q.isCorrect, // Store whether the answer was correct
          // sortOrder: q.sortOrder, // Optional: if you have sortOrder in gradedQuestionsDetails
        })),

        score: score,
        attemptDate: new Date(),
        durationInSeconds: attemptData.durationInSeconds,
      });

      console.log(
        "[QuizService.submitQuizAttempt] Data for new QuizAttempt before save:",
        {
          staffUserId: staffUserId ? staffUserId.toString() : "MISSING/INVALID",
          quizId: quizId ? quizId.toString() : "MISSING/INVALID",
          restaurantId: quiz.restaurantId
            ? quiz.restaurantId.toString()
            : "MISSING/INVALID",

          answers: gradedQuestionsDetails.map((q) => ({
            // Log new 'answers' structure
            questionId: q.questionId.toString(),
            answerGiven: q.answerGiven,
            isCorrect: q.isCorrect,
          })),
          // Log the actual questionsPresented array structure
          questionsPresented: gradedQuestionsDetails.map((q) => ({
            questionId: q.questionId.toString(),
          })),
          score: score,
        }
      );

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
      // const currentDateStrForDailyReset = newQuizAttempt.attemptDate // REMOVED Logic Block
      //   .toISOString()
      //   .split("T")[0];
      // if (
      //   staffProgress.lastActivityDateForDailyReset
      //     ?.toISOString()
      //     .split("T")[0] === currentDateStrForDailyReset
      // ) {
      //   staffProgress.questionsAnsweredToday =
      //     (staffProgress.questionsAnsweredToday ?? 0) +
      //     gradedQuestionsDetails.length;
      // } else {
      //   staffProgress.questionsAnsweredToday = gradedQuestionsDetails.length;
      // }
      // staffProgress.lastActivityDateForDailyReset = newQuizAttempt.attemptDate; // REMOVED Logic Block

      if (
        staffProgress.totalUniqueQuestionsInSource > 0 &&
        staffProgress.seenQuestionIds.length >=
          staffProgress.totalUniqueQuestionsInSource
      ) {
        staffProgress.isCompletedOverall = true;
      }
      await staffProgress.save({ session });

      // --- BEGIN ADDING/UPDATING QuizResult ---
      console.log(
        `[QuizService.submitQuizAttempt] About to upsert QuizResult for User: ${staffUserId}, Quiz: ${quizId}, Restaurant: ${quiz.restaurantId}`
      );

      // Construct incorrectQuestions array
      const incorrectQuestionsList: {
        questionText: string;
        userAnswer: string;
        correctAnswer: string;
      }[] = [];
      for (const detail of gradedQuestionsDetails) {
        if (!detail.isCorrect) {
          const questionDoc = actualQuestionsMap.get(
            detail.questionId.toString()
          );
          if (questionDoc) {
            let userAnswerText = "N/A";
            // Determine user's answer text
            if (
              questionDoc.questionType === "multiple-choice-single" ||
              questionDoc.questionType === "true-false"
            ) {
              const userAnswerOption = questionDoc.options.find(
                // Ensure detail.answerGiven is treated as a string for comparison
                (opt) => opt._id.toString() === String(detail.answerGiven)
              );
              userAnswerText = userAnswerOption
                ? userAnswerOption.text
                : detail.answerGiven !== undefined &&
                  detail.answerGiven !== null &&
                  String(detail.answerGiven).trim() !== ""
                ? `Selected: ID "${String(detail.answerGiven)}"`
                : "Not answered";
            } else if (
              questionDoc.questionType === "multiple-choice-multiple"
            ) {
              if (
                Array.isArray(detail.answerGiven) &&
                detail.answerGiven.length > 0
              ) {
                userAnswerText = detail.answerGiven
                  .map((ansId: string) => {
                    const opt = questionDoc.options.find(
                      (o) => o._id.toString() === ansId
                    );
                    return opt ? opt.text : `ID "${ansId}"`;
                  })
                  .join(", ");
              } else {
                userAnswerText = "Not answered";
              }
            } else if (questionDoc.questionType === "short-answer") {
              userAnswerText = detail.answerGiven
                ? String(detail.answerGiven)
                : "Not answered";
            }

            let correctAnswerText = "N/A";
            if (
              questionDoc.questionType === "multiple-choice-single" ||
              questionDoc.questionType === "true-false"
            ) {
              const correctOpt = questionDoc.options.find(
                (opt) => opt.isCorrect
              );
              correctAnswerText = correctOpt
                ? correctOpt.text
                : "Correct answer not set by author";
            } else if (
              questionDoc.questionType === "multiple-choice-multiple"
            ) {
              correctAnswerText = questionDoc.options
                .filter((opt) => opt.isCorrect)
                .map((opt) => opt.text)
                .join(", ");
              if (!correctAnswerText)
                correctAnswerText = "Correct answer(s) not set by author";
            } else if (questionDoc.questionType === "short-answer") {
              const correctOpt = questionDoc.options.find(
                (opt) => opt.isCorrect
              );
              correctAnswerText = correctOpt
                ? correctOpt.text
                : "Correct answer not set by author";
            }

            incorrectQuestionsList.push({
              questionText: questionDoc.questionText,
              userAnswer: userAnswerText,
              correctAnswer: correctAnswerText,
            });
          }
        }
      }

      const quizResultData = {
        userId: staffUserId,
        quizId: quizId,
        restaurantId: quiz.restaurantId,
        score: score,
        totalQuestions: gradedQuestionsDetails.length,
        answers: gradedQuestionsDetails.map((q) => ({
          questionId: q.questionId,
          answerGiven: q.answerGiven,
          isCorrect: q.isCorrect,
        })),
        completedAt: newQuizAttempt.attemptDate,
        status: "completed", // Mark as completed since an attempt was submitted
        quizTitle: quiz.title, // Denormalize quiz title for easier lookup
        incorrectQuestions: incorrectQuestionsList, // ADDED
        attemptId: newQuizAttempt._id, // Link to the QuizAttempt document
      };

      // Upsert QuizResult: Update if exists for this user/quiz, otherwise insert.
      // This replaces any previous result for this specific quiz by this user.
      const updatedQuizResult = await QuizResult.findOneAndUpdate(
        {
          userId: staffUserId,
          quizId: quizId,
          restaurantId: quiz.restaurantId,
        },
        quizResultData,
        {
          new: true, // Return the modified document
          upsert: true, // Create if it doesn't exist
          session: session,
          setDefaultsOnInsert: true, // Ensure schema defaults are applied on insert
        }
      );

      console.log(
        `[QuizService.submitQuizAttempt] Upserted QuizResult ID: ${updatedQuizResult?._id} for User: ${staffUserId}, Quiz: ${quizId}`
      );

      // --- END ADDING/UPDATING QuizResult ---

      // Recalculate average score based on ALL attempts for this quiz
      const allAttempts = await QuizAttempt.find({
        userId: staffUserId,
        quizId: quizId,
      })
        .select("score questionsPresented")
        .lean();

      let totalPercentageSum = 0;
      let validAttemptsCount = 0;
      allAttempts.forEach((attempt) => {
        if (
          attempt.score !== undefined &&
          attempt.questionsPresented &&
          attempt.questionsPresented.length > 0
        ) {
          totalPercentageSum +=
            attempt.score / attempt.questionsPresented.length;
          validAttemptsCount++;
        }
      });

      if (validAttemptsCount > 0) {
        const averageScorePercent =
          (totalPercentageSum / validAttemptsCount) * 100;
        // Optionally update staffProgress or another summary model with this average
        // For now, it's calculated on demand or stored on QuizResult if needed for single latest display
        console.log(
          `[QuizService.submitQuizAttempt] Calculated average score for User ${staffUserId}, Quiz ${quizId} across ${validAttemptsCount} attempts: ${averageScorePercent.toFixed(
            1
          )}%`
        );
      }

      await session.commitTransaction();
      console.log(
        `[QuizService.submitQuizAttempt] Transaction committed for User: ${staffUserId}, Quiz: ${quizId}`
      );

      return {
        score: score,
        totalQuestionsAttempted: gradedQuestionsDetails.length,
        attemptId: newQuizAttempt._id,
        questions: gradedQuestionsDetails.map((q) => ({
          questionId: q.questionId.toString(),
          answerGiven: q.answerGiven,
          isCorrect: q.isCorrect,
          correctAnswer: q.correctAnswer,
        })),
      };
    } catch (error: any) {
      await session.abortTransaction();
      console.error(
        `[QuizService.submitQuizAttempt] Transaction aborted for User: ${staffUserId}, Quiz: ${quizId}. Error: ${error.message}`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to submit quiz attempt: ${error.message}`,
        500
      );
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieves a specific staff member's progress for a specific quiz,
   * including a summary of all their attempts and overall average score.
   * @param staffUserId The ID of the staff user.
   * @param quizId The ID of the quiz.
   * @returns Promise<IStaffQuizProgressWithAttempts | null>
   */
  static async getStaffQuizProgress(
    staffUserId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<IStaffQuizProgressWithAttempts | null> {
    try {
      const progress = await StaffQuizProgress.findOne({
        staffUserId: staffUserId,
        quizId: quizId,
      })
        .populate<{ staffUserId: IUser }>(
          "staffUserId",
          "name email professionalRole _id"
        )
        .populate<{ quizId: IQuiz }>(
          "quizId",
          "title description numberOfQuestionsPerAttempt _id"
        )
        .lean<PlainIStaffQuizProgress>();

      if (!progress) {
        console.log(
          `No StaffQuizProgress found for user ${staffUserId}, quiz ${quizId}`
        );
        return null;
      }

      // Safely access restaurantId from progress, considering it might be populated or just an ObjectId
      let restaurantIdForQuery: Types.ObjectId;
      if (progress.restaurantId && (progress.restaurantId as IUser)._id) {
        // Check if populated IUser
        restaurantIdForQuery = (progress.restaurantId as IUser)._id;
      } else {
        restaurantIdForQuery = progress.restaurantId as Types.ObjectId; // Assume it's an ObjectId
      }

      const allAttemptsFromDb = await QuizAttempt.find({
        staffUserId: staffUserId,
        quizId: quizId,
        restaurantId: restaurantIdForQuery,
      })
        .select("_id score questionsPresented attemptDate")
        .sort({ attemptDate: -1 })
        .lean<
          Pick<
            IQuizAttempt,
            "_id" | "score" | "questionsPresented" | "attemptDate"
          >[]
        >();

      const attemptSummaries: IQuizAttemptSummary[] = allAttemptsFromDb.map(
        (attempt) => {
          const totalQuestions = attempt.questionsPresented?.length || 0;
          return {
            _id: attempt._id.toString(),
            score: attempt.score,
            totalQuestions: totalQuestions,
            attemptDate: attempt.attemptDate,
            hasIncorrectAnswers:
              totalQuestions > 0 && attempt.score < totalQuestions,
          };
        }
      );

      let averageScore: number | null = null;
      if (allAttemptsFromDb.length > 0) {
        let totalPercentageSum = 0;
        let validAttemptsCount = 0;
        allAttemptsFromDb.forEach((attempt) => {
          if (
            attempt.score !== undefined &&
            attempt.questionsPresented &&
            attempt.questionsPresented.length > 0
          ) {
            totalPercentageSum +=
              attempt.score / attempt.questionsPresented.length;
            validAttemptsCount++;
          }
        });
        if (validAttemptsCount > 0) {
          averageScore = parseFloat(
            ((totalPercentageSum / validAttemptsCount) * 100).toFixed(1)
          );
        }
      }

      const populatedStaffUser = progress.staffUserId as IUser;
      const populatedQuiz = progress.quizId as IQuiz;

      const result: IStaffQuizProgressWithAttempts = {
        ...(progress as Required<PlainIStaffQuizProgress>),
        staffUserId: populatedStaffUser,
        quizId: populatedQuiz,
        averageScore: averageScore,
        attempts: attemptSummaries,
      };
      return result;
    } catch (error: any) {
      console.error(
        `Error fetching staff quiz progress for user ${staffUserId}, quiz ${quizId}:`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch staff quiz progress.", 500);
    }
  }

  /**
   * Retrieves full details for a single quiz attempt, including incorrect answers.
   * @param attemptId The ID of the QuizAttempt.
   * @param requestingUserId The ID of the user making the request (for authorization).
   * @returns Promise<QuizAttemptDetailsWithIncorrects>
   * @throws {AppError} If attempt not found, or user not authorized.
   */
  public static async getQuizAttemptDetails(
    attemptId: string,
    requestingUserId: string
  ): Promise<QuizAttemptDetailsWithIncorrects> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw new AppError("Invalid attempt ID format.", 400);
    }

    const attemptObjectId = new mongoose.Types.ObjectId(attemptId);

    const attempt = await QuizAttempt.findById(attemptObjectId)
      .populate<{ quizId: IQuiz }>("quizId", "title") // Populate quiz title
      .populate<{ staffUserId: IUser }>("staffUserId", "_id name restaurantId") // Populate staffUserId, including restaurantId for the staff member
      .lean<
        IQuizAttempt & {
          quizId: Pick<IQuiz, "_id" | "title">;
          staffUserId: Pick<IUser, "_id" | "name" | "restaurantId">; // Ensure restaurantId is picked for staffUser
        }
      >();

    if (!attempt) {
      throw new AppError("Quiz attempt not found.", 404);
    }

    // Authorization: Ensure the requesting user is the one who took the quiz
    // or if the requesting user is a manager of the same restaurant
    const requestingUserInfo = await User.findById(
      requestingUserId
    ).lean<IUser>();
    if (!requestingUserInfo) {
      throw new AppError("Requesting user not found.", 404);
    }

    if (!attempt.staffUserId || !attempt.staffUserId._id) {
      throw new AppError("Staff user details missing for this attempt.", 500);
    }

    const isOwnerOfAttempt =
      attempt.staffUserId._id.toString() === requestingUserId;
    let isManagerOfSameRestaurant = false;

    if (requestingUserInfo.role === "restaurant") {
      // Find the restaurant owned by the requesting "restaurant" role user
      const ownedRestaurant = await Restaurant.findOne({
        owner: requestingUserInfo._id,
      }).lean();
      if (ownedRestaurant && attempt.restaurantId) {
        // Ensure attempt.restaurantId exists
        // attempt.restaurantId is already an ObjectId or a populated object with _id
        const attemptRestaurantIdString =
          typeof attempt.restaurantId === "string"
            ? attempt.restaurantId
            : (attempt.restaurantId as Types.ObjectId)?.toString() ||
              (attempt.restaurantId as any)?._id?.toString();

        if (ownedRestaurant._id.toString() === attemptRestaurantIdString) {
          isManagerOfSameRestaurant = true;
        }
      }
    }

    if (!isOwnerOfAttempt && !isManagerOfSameRestaurant) {
      throw new AppError(
        "You are not authorized to view this quiz attempt.",
        403
      );
    }

    if (!attempt.quizId || typeof attempt.quizId.title !== "string") {
      throw new AppError(
        "Quiz details could not be retrieved for this attempt.",
        500
      );
    }

    const incorrectQuestions: IncorrectQuestionDetailForAttempt[] = [];
    if (attempt.questionsPresented && attempt.questionsPresented.length > 0) {
      const questionIds = attempt.questionsPresented.map((q) => q.questionId);
      const questionsData = await QuestionModel.find({
        _id: { $in: questionIds },
      }).lean<QuestionDocument[]>();
      const questionsMap = new Map(
        questionsData.map((q: QuestionDocument) => [
          (q._id as mongoose.Types.ObjectId).toString(),
          q,
        ])
      ); // Cast q._id to ObjectId

      for (const presentedQuestion of attempt.questionsPresented) {
        if (!presentedQuestion.isCorrect) {
          const fullQuestion = questionsMap.get(
            presentedQuestion.questionId.toString()
          );
          if (fullQuestion) {
            let userAnswerText = "N/A";
            const givenAnswer = presentedQuestion.answerGiven;

            if (
              fullQuestion.questionType === "multiple-choice-single" ||
              fullQuestion.questionType === "true-false"
            ) {
              const option = fullQuestion.options.find(
                (opt) => opt._id?.toString() === givenAnswer
              );
              userAnswerText = option
                ? option.text
                : typeof givenAnswer === "string" && givenAnswer.trim() !== ""
                ? `Selected: ID "${givenAnswer}"`
                : "Not answered";
            } else if (
              fullQuestion.questionType === "multiple-choice-multiple"
            ) {
              if (Array.isArray(givenAnswer) && givenAnswer.length > 0) {
                userAnswerText = givenAnswer
                  .map((ansId) => {
                    const option = fullQuestion.options.find(
                      (opt) => opt._id?.toString() === ansId
                    );
                    return option ? option.text : `ID "${ansId}"`;
                  })
                  .join(", ");
              } else {
                userAnswerText = "Not answered";
              }
            } else if (fullQuestion.questionType === "short-answer") {
              userAnswerText =
                typeof givenAnswer === "string" && givenAnswer.trim() !== ""
                  ? givenAnswer
                  : "Not answered";
            }
            // Fallback for other types or if answerGiven is complex
            else if (typeof givenAnswer === "object" && givenAnswer !== null) {
              userAnswerText = JSON.stringify(givenAnswer);
            } else if (givenAnswer !== undefined && givenAnswer !== null) {
              userAnswerText = String(givenAnswer);
            }

            let correctAnswerText = "N/A";
            if (
              fullQuestion.questionType === "multiple-choice-single" ||
              fullQuestion.questionType === "true-false"
            ) {
              const correctOption = fullQuestion.options.find(
                (opt) => opt.isCorrect
              );
              correctAnswerText = correctOption
                ? correctOption.text
                : "Correct answer not set";
            } else if (
              fullQuestion.questionType === "multiple-choice-multiple"
            ) {
              correctAnswerText = fullQuestion.options
                .filter((opt) => opt.isCorrect)
                .map((opt) => opt.text)
                .join(", ");
              if (!correctAnswerText)
                correctAnswerText = "Correct answer(s) not set";
            } else if (fullQuestion.questionType === "short-answer") {
              const correctOpt = fullQuestion.options.find(
                (opt) => opt.isCorrect
              );
              correctAnswerText = correctOpt
                ? correctOpt.text
                : "Correct answer not set";
            }

            incorrectQuestions.push({
              questionText: fullQuestion.questionText,
              userAnswer: userAnswerText,
              correctAnswer: correctAnswerText,
            });
          }
        }
      }
    }

    return {
      _id: attempt._id.toString(),
      quizId: attempt.quizId._id.toString(),
      quizTitle: attempt.quizId.title,
      staffUserId: attempt.staffUserId._id.toString(), // Changed from attempt.userId
      score: attempt.score,
      totalQuestions: attempt.questionsPresented?.length || 0,
      attemptDate: attempt.attemptDate,
      incorrectQuestions: incorrectQuestions,
    };
  }

  public static async generateQuizFromBanksService(
    data: CreateQuizFromBanksData
  ): Promise<IQuiz> {
    const {
      title,
      description,
      restaurantId,
      questionBankIds,
      numberOfQuestionsPerAttempt,
    } = data;

    if (!title || title.trim() === "") {
      throw new AppError("Quiz title is required.", 400);
    }
    if (!questionBankIds || questionBankIds.length === 0) {
      throw new AppError("At least one question bank must be selected.", 400);
    }
    if (numberOfQuestionsPerAttempt <= 0) {
      throw new AppError(
        "Number of questions per attempt must be positive.",
        400
      );
    }

    const objectQuestionBankIds = questionBankIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Fetch banks and validate they belong to the restaurant
    const banks = await QuestionBankModel.find({
      _id: { $in: objectQuestionBankIds },
      restaurantId: restaurantId,
    }).populate<{ questions: QuestionDocument[] }>("questions");

    if (banks.length !== objectQuestionBankIds.length) {
      throw new AppError(
        "One or more question banks not found or do not belong to this restaurant.",
        404
      );
    }

    const uniqueQuestionIdSet = new Set<string>();
    banks.forEach((bank) => {
      if (bank.questions && Array.isArray(bank.questions)) {
        (bank.questions as QuestionDocument[]).forEach((question) => {
          // Assuming all questions in a bank are active for snapshot purposes for now
          // Add filter here if questions have an 'isActive' flag: e.g. if (question.isActive)
          if (question && question._id) {
            uniqueQuestionIdSet.add(question._id.toString());
          }
        });
      }
    });

    const totalUniqueQuestionsInSourceSnapshot = uniqueQuestionIdSet.size;

    if (numberOfQuestionsPerAttempt > totalUniqueQuestionsInSourceSnapshot) {
      throw new AppError(
        `Number of questions per attempt (${numberOfQuestionsPerAttempt}) cannot exceed the total number of unique questions available in the selected banks (${totalUniqueQuestionsInSourceSnapshot}).`,
        400
      );
    }

    const newQuiz = new Quiz({
      title: title.trim(),
      description: description?.trim(),
      restaurantId,
      sourceQuestionBankIds: objectQuestionBankIds,
      numberOfQuestionsPerAttempt,
      totalUniqueQuestionsInSourceSnapshot,
      isAvailable: false, // Default to not available
      isAssigned: false, // Default to not assigned
      // createdBy: data.createdBy, // If you add this field
    });

    try {
      await newQuiz.save();
      return newQuiz;
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error (e.g. title + restaurantId unique index)
        throw new AppError(
          "A quiz with this title already exists for your restaurant.",
          409
        );
      }
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      console.error("Error saving new quiz from banks:", error);
      throw new AppError("Failed to create quiz from question banks.", 500);
    }
  }

  public static async getRestaurantQuizStaffProgress(
    restaurantId: Types.ObjectId,
    quizId: Types.ObjectId
  ): Promise<IStaffMemberQuizProgressDetails[]> {
    // 1. Validate Quiz
    const quiz = await Quiz.findOne({
      _id: quizId,
      restaurantId: restaurantId,
    }).lean<IQuiz>();

    if (!quiz) {
      throw new AppError(
        "Quiz not found or does not belong to this restaurant.",
        404
      );
    }

    // 2. Fetch all staff for the restaurant
    const staffMembers = await User.find({
      restaurantId: restaurantId,
      role: "staff",
    })
      .select("_id name email professionalRole")
      .lean<IUser[]>();

    if (staffMembers.length === 0) {
      return []; // No staff members in the restaurant
    }

    const results: IStaffMemberQuizProgressDetails[] = [];

    for (const staff of staffMembers) {
      const staffObjectId = staff._id as Types.ObjectId;

      // 3. Fetch StaffQuizProgress for this staff member and quiz
      const staffProgressDoc = await StaffQuizProgress.findOne({
        staffUserId: staffObjectId,
        quizId: quizId,
        restaurantId: restaurantId, // Ensure restaurant context
      }).lean<PlainIStaffQuizProgress | null>();

      // 4. Fetch all QuizAttempts for this staff member and quiz
      const allAttemptsFromDb = await QuizAttempt.find({
        staffUserId: staffObjectId,
        quizId: quizId,
        restaurantId: restaurantId,
      })
        .select("_id score questionsPresented attemptDate")
        .sort({ attemptDate: -1 })
        .lean<
          Pick<
            IQuizAttempt,
            "_id" | "score" | "questionsPresented" | "attemptDate"
          >[]
        >();

      const attemptSummaries: IQuizAttemptSummary[] = allAttemptsFromDb.map(
        (attempt) => {
          const totalQuestions = attempt.questionsPresented?.length || 0;
          return {
            _id: attempt._id.toString(),
            score: attempt.score,
            totalQuestions: totalQuestions,
            attemptDate: attempt.attemptDate,
            hasIncorrectAnswers:
              totalQuestions > 0 && attempt.score < totalQuestions,
          };
        }
      );

      let averageScoreForQuiz: number | null = null;
      if (allAttemptsFromDb.length > 0) {
        let totalPercentageSum = 0;
        let validAttemptsCount = 0;
        allAttemptsFromDb.forEach((attempt) => {
          if (
            attempt.score !== undefined &&
            attempt.questionsPresented &&
            attempt.questionsPresented.length > 0
          ) {
            totalPercentageSum +=
              attempt.score / attempt.questionsPresented.length;
            validAttemptsCount++;
          }
        });
        if (validAttemptsCount > 0) {
          averageScoreForQuiz = parseFloat(
            ((totalPercentageSum / validAttemptsCount) * 100).toFixed(1)
          );
        }
      }

      results.push({
        staffMember: {
          _id: staffObjectId,
          name: staff.name,
          email: staff.email,
          professionalRole: staff.professionalRole,
        },
        quizTitle: quiz.title,
        progress: staffProgressDoc
          ? {
              isCompletedOverall: staffProgressDoc.isCompletedOverall,
              seenQuestionIds: staffProgressDoc.seenQuestionIds,
              totalUniqueQuestionsInSource:
                staffProgressDoc.totalUniqueQuestionsInSource,
              lastAttemptTimestamp: staffProgressDoc.lastAttemptTimestamp,
            }
          : null,
        averageScoreForQuiz: averageScoreForQuiz,
        attempts: attemptSummaries,
        numberOfAttempts: allAttemptsFromDb.length,
      });
    }
    return results;
  }

  public static async resetQuizProgressForEveryone(
    quizId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ resetAttemptsCount: number; resetProgressCount: number }> {
    // 1. Validate Quiz
    const quiz = await Quiz.findOne({
      _id: quizId,
      restaurantId: restaurantId,
    }).lean<Pick<IQuiz, "totalUniqueQuestionsInSourceSnapshot">>(); // Only need snapshot for reset

    if (!quiz) {
      throw new AppError(
        "Quiz not found or does not belong to this restaurant.",
        404
      );
    }

    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // 2. Delete all QuizAttempts for this quiz and restaurant
      const attemptDeletionResult = await QuizAttempt.deleteMany(
        { quizId: quizId, restaurantId: restaurantId },
        { session }
      );
      const resetAttemptsCount = attemptDeletionResult.deletedCount || 0;

      // 3. Reset StaffQuizProgress for this quiz and restaurant
      // Fetch totalUniqueQuestionsInSource from the quiz definition for reset
      const totalUniqueInSource =
        quiz.totalUniqueQuestionsInSourceSnapshot || 0;

      const progressUpdateResult = await StaffQuizProgress.updateMany(
        { quizId: quizId, restaurantId: restaurantId },
        {
          $set: {
            seenQuestionIds: [],
            isCompletedOverall: false,
            totalUniqueQuestionsInSource: totalUniqueInSource, // Resync with quiz definition
            // questionsAnsweredToday: 0, // REMOVED
          },
          $unset: {
            lastAttemptTimestamp: "",
            // lastActivityDateForDailyReset: "", // REMOVED
          },
        },
        { session }
      );
      const resetProgressCount = progressUpdateResult.modifiedCount || 0;
      // Note: updateMany returns matchedCount and modifiedCount.
      // modifiedCount is more relevant for "reset" operations.

      await session.commitTransaction();
      return { resetAttemptsCount, resetProgressCount };
    } catch (error: any) {
      if (session) {
        await session.abortTransaction();
      }
      console.error(
        `Error resetting quiz progress for quiz ${quizId}, restaurant ${restaurantId}:`,
        error
      );
      throw new AppError("Failed to reset quiz progress.", 500);
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
}
