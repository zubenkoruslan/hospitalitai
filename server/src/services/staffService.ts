import mongoose, { Types } from "mongoose";
import User, { IUser } from "../models/User";
import QuizResult from "../models/QuizResult";
import Quiz, { IQuiz } from "../models/Quiz";
import { IQuestion } from "../models/QuestionModel";
import QuizResultService from "./quizResultService";
import { AppError } from "../utils/errorHandler";
import StaffQuizProgress, {
  IStaffQuizProgress,
} from "../models/StaffQuizProgress";
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";

// Define interfaces for return types to improve clarity

// NEW interface for individual quiz progress summary
interface QuizProgressSummary {
  quizId: Types.ObjectId;
  quizTitle: string;
  overallProgressPercentage: number;
  isCompletedOverall: boolean;
  lastAttemptTimestamp?: Date | null;
  averageScoreForQuiz?: number | null;
}

// MODIFIED: This interface now reflects the new data structure
interface StaffMemberWithQuizProgress {
  _id: Types.ObjectId;
  name: string;
  email: string;
  createdAt?: Date;
  professionalRole?: string;
  averageScore: number | null; // Overall average score from QuizResultService.calculateAverageScoreForUser
  quizzesTaken: number; // Count of unique quizzes with attempts by this staff member
  quizProgressSummaries: QuizProgressSummary[]; // REPLACES resultsSummary
}

interface IncorrectQuestionDetail {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
}

interface QuizResultDetails {
  _id: Types.ObjectId;
  quizId: Types.ObjectId;
  quizTitle: string;
  completedAt?: Date;
  score: number;
  totalQuestions: number;
  retakeCount: number;
  incorrectQuestions: IncorrectQuestionDetail[];
}

interface StaffMemberDetails {
  _id: Types.ObjectId;
  name: string;
  email: string;
  createdAt?: Date;
  professionalRole?: string;
  restaurantId?: Types.ObjectId;
  role: string;
  quizResults: QuizResultDetails[];
  averageScore: number | null;
}

interface StaffUpdateResponse {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  professionalRole?: string;
  restaurantId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper within the service scope
const getChoiceTextFromOptions = (
  options: Array<{ text: string; isCorrect?: boolean }> | undefined,
  index: number | null | undefined
): string => {
  if (
    options &&
    index !== null &&
    index !== undefined &&
    index >= 0 &&
    index < options.length
  ) {
    return options[index]?.text || "N/A";
  }
  return "N/A";
};

class StaffService {
  /**
   * Retrieves a list of staff members for a specific restaurant,
   * including their overall average quiz score and detailed progress on each quiz.
   *
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an array of staff member objects with detailed quiz progress.
   * @throws {AppError} If any database error occurs (500).
   */
  static async getStaffListWithAverages(
    restaurantId: Types.ObjectId
  ): Promise<StaffMemberWithQuizProgress[]> {
    try {
      // 1. Fetch all staff members (lean for performance)
      const staffList = await User.find(
        { restaurantId: restaurantId, role: "staff" },
        "_id name email createdAt professionalRole"
      ).lean<IUser[]>();

      // 2. For each staff member, calculate overall average and fetch detailed quiz progress
      const staffWithDataPromises = staffList.map(async (staff) => {
        const staffObjectId = staff._id as Types.ObjectId;

        // Calculate overall average score (this now uses QuizAttempts and filters by active quizzes)
        const { averageScore, quizzesTaken } =
          await QuizResultService.calculateAverageScoreForUser(
            staffObjectId,
            restaurantId
          );

        // Fetch all StaffQuizProgress records for this staff member, populating quiz active status
        let staffProgressRecords = await StaffQuizProgress.find({
          staffUserId: staffObjectId,
          restaurantId: restaurantId,
        })
          .populate<{
            quizId: Pick<
              IQuiz,
              | "_id"
              | "title"
              | "totalUniqueQuestionsInSourceSnapshot"
              | "isAvailable"
            > | null;
          }>({
            path: "quizId",
            select: "title totalUniqueQuestionsInSourceSnapshot isAvailable",
          })
          .lean<
            Array<
              IStaffQuizProgress & {
                quizId: Pick<
                  IQuiz,
                  | "_id"
                  | "title"
                  | "totalUniqueQuestionsInSourceSnapshot"
                  | "isAvailable"
                > | null;
              }
            >
          >();

        // LOGGING BEFORE FILTER
        if (staff.name === "Misha Demenchak") {
          console.log(
            `[StaffService] Misha - BEFORE filter - All staffProgressRecords:`,
            staffProgressRecords.map((p) => ({
              quizTitle: p.quizId?.title,
              quizIsAvailable: p.quizId?.isAvailable,
              progressId: p._id,
            }))
          );
          console.log(
            `[StaffService] Misha - BEFORE filter - staffProgressRecords for test2:`,
            staffProgressRecords
              .filter((p) => p.quizId && p.quizId.title === "test2")
              .map((p) => ({
                title: p.quizId.title,
                isAvailable: p.quizId.isAvailable,
              }))
          );
        }

        // Filter out progress records for quizzes that are deleted or not available
        staffProgressRecords = staffProgressRecords.filter(
          (sp) =>
            sp.quizId &&
            (sp.quizId as Pick<IQuiz, "isAvailable">).isAvailable === true
        );

        // LOGGING AFTER FILTER
        if (staff.name === "Misha Demenchak") {
          console.log(
            `[StaffService] Misha - AFTER filter - staffProgressRecords (should be empty for test2 if it was false):`,
            staffProgressRecords
              .filter((p) => p.quizId && p.quizId.title === "test2")
              .map((p) => ({
                title: p.quizId.title,
                isAvailable: p.quizId.isAvailable,
              }))
          );
        }

        // Deduplicate and select the latest progress for each quiz
        const latestProgressByQuiz: {
          [key: string]: IStaffQuizProgress & {
            quizId: Pick<
              IQuiz,
              | "_id"
              | "title"
              | "totalUniqueQuestionsInSourceSnapshot"
              | "isAvailable"
            > | null;
          };
        } = {};

        for (const sp of staffProgressRecords) {
          if (!sp.quizId?._id) continue;

          const quizIdString = sp.quizId._id.toString();
          const existingRecord = latestProgressByQuiz[quizIdString];

          if (!existingRecord) {
            latestProgressByQuiz[quizIdString] = sp;
          } else {
            // Prioritize records with a more recent lastAttemptTimestamp
            const spHasTimestamp = !!sp.lastAttemptTimestamp;
            const existingHasTimestamp = !!existingRecord.lastAttemptTimestamp;

            if (spHasTimestamp && existingHasTimestamp) {
              if (
                sp.lastAttemptTimestamp! > existingRecord.lastAttemptTimestamp!
              ) {
                latestProgressByQuiz[quizIdString] = sp;
              } else if (
                sp.lastAttemptTimestamp!.getTime() ===
                existingRecord.lastAttemptTimestamp!.getTime()
              ) {
                // Timestamps are identical, prefer completed over incomplete
                if (
                  sp.isCompletedOverall &&
                  !existingRecord.isCompletedOverall
                ) {
                  latestProgressByQuiz[quizIdString] = sp;
                }
              }
            } else if (spHasTimestamp && !existingHasTimestamp) {
              // Current has timestamp, existing doesn't - prefer current
              latestProgressByQuiz[quizIdString] = sp;
            } else if (!spHasTimestamp && !existingHasTimestamp) {
              // Neither has a timestamp, prefer completed over incomplete
              if (sp.isCompletedOverall && !existingRecord.isCompletedOverall) {
                latestProgressByQuiz[quizIdString] = sp;
              }
            }
            // If one has timestamp and other doesn't, the one with timestamp is implicitly preferred
            // by the structure of these conditions (e.g. if sp doesn't have timestamp but existing does, no change happens here).
          }
        }
        const uniqueStaffProgressRecords = Object.values(latestProgressByQuiz);

        // LOGGING before generating summaries for Misha
        if (staff.name === "Misha Demenchak") {
          console.log(
            `[StaffService] Misha - BEFORE generating summaries - uniqueStaffProgressRecords mapped:`,
            uniqueStaffProgressRecords.map((p) => ({
              title: p.quizId?.title,
              isAvailable: p.quizId?.isAvailable,
              progress_isCompletedOverall: p.isCompletedOverall,
            }))
          );
        }

        // Map unique progress records to summaries, now including average score for each quiz
        const quizProgressSummariesPromises = uniqueStaffProgressRecords.map(
          async (sp) => {
            // sp.quizId is guaranteed to be non-null and active here
            const quizDoc = sp.quizId!; // Non-null assertion

            const totalUnique =
              quizDoc.totalUniqueQuestionsInSourceSnapshot || 0;
            const seenCount = sp.seenQuestionIds?.length || 0;

            const overallProgressPercentage =
              totalUnique > 0 ? Math.round((seenCount / totalUnique) * 100) : 0;

            // Calculate average score for this specific quiz (quizDoc._id) by this staff member (staffObjectId)
            let averageScoreForQuiz: number | null = null;
            const quizAttemptsForThisQuiz = await QuizAttempt.find({
              staffUserId: staffObjectId,
              quizId: quizDoc._id, // Use the specific quiz ID from quizDoc
              restaurantId: restaurantId,
            })
              .select("score questionsPresented")
              .lean<Pick<IQuizAttempt, "score" | "questionsPresented">[]>();

            if (quizAttemptsForThisQuiz.length > 0) {
              let totalPercentageSum = 0;
              let validAttemptsCount = 0;
              quizAttemptsForThisQuiz.forEach((attempt) => {
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

            return {
              quizId: quizDoc._id as Types.ObjectId,
              quizTitle: quizDoc.title || "[Deleted Quiz]",
              overallProgressPercentage: overallProgressPercentage,
              isCompletedOverall: sp.isCompletedOverall || false,
              lastAttemptTimestamp: sp.lastAttemptTimestamp || null,
              averageScoreForQuiz: averageScoreForQuiz,
            };
          }
        );

        const quizProgressSummaries = await Promise.all(
          quizProgressSummariesPromises
        );

        quizProgressSummaries.sort((a, b) => {
          if (a.lastAttemptTimestamp && b.lastAttemptTimestamp) {
            return (
              b.lastAttemptTimestamp.getTime() -
              a.lastAttemptTimestamp.getTime()
            );
          }
          if (a.lastAttemptTimestamp) return -1;
          if (b.lastAttemptTimestamp) return 1;
          return a.quizTitle.localeCompare(b.quizTitle);
        });

        return {
          _id: staffObjectId,
          name: staff.name,
          email: staff.email,
          createdAt: staff.createdAt,
          professionalRole: staff.professionalRole,
          averageScore: averageScore,
          quizzesTaken: quizzesTaken,
          quizProgressSummaries: quizProgressSummaries,
        } as StaffMemberWithQuizProgress;
      });

      const staffWithData = await Promise.all(staffWithDataPromises);

      return staffWithData;
    } catch (error: any) {
      console.error(
        "Error fetching staff list with detailed quiz progress in service:",
        error
      );
      throw new AppError(
        "Failed to retrieve staff list with detailed progress.",
        500
      );
    }
  }

  /**
   * Retrieves detailed information for a specific staff member,
   * including processed quiz results with incorrect answer details and average score.
   *
   * @param staffId - The ID of the staff member.
   * @param restaurantId - The ID of the restaurant (used for authorization scope).
   * @returns A promise resolving to a detailed staff member object.
   * @throws {AppError} If the staff member is not found or doesn't belong to the restaurant (404),
   *                    if the staffId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async getStaffMemberDetails(
    staffId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<StaffMemberDetails> {
    const staffObjectId =
      typeof staffId === "string" ? new Types.ObjectId(staffId) : staffId;

    try {
      // 1. Fetch the staff member
      const staffMember = await User.findOne(
        {
          _id: staffObjectId,
          restaurantId: restaurantId,
          role: "staff",
        },
        "name email createdAt professionalRole restaurantId role"
      ).lean<IUser>();

      if (!staffMember) {
        throw new AppError(
          "Staff member not found or does not belong to this restaurant.",
          404
        );
      }

      // 2. Fetch their quiz results, populating quiz details including isAvailable
      let quizResults = await QuizResult.find({
        userId: staffObjectId,
        restaurantId: restaurantId,
      })
        .populate<{
          quizId: Pick<IQuiz, "_id" | "title" | "isAvailable"> | null;
        }>({
          path: "quizId",
          select: "title isAvailable",
        })
        .sort({ completedAt: -1 })
        .lean();

      // Filter out results for quizzes that are deleted or not available
      quizResults = quizResults.filter(
        (result) =>
          result.quizId &&
          (result.quizId as Pick<IQuiz, "isAvailable">).isAvailable === true
      );

      // 3. Calculate average score (already considers active quizzes due to QuizResultService update)
      const { averageScore } =
        await QuizResultService.calculateAverageScoreForUser(
          staffObjectId,
          restaurantId
        );

      // 4. Process results to get incorrect answer details
      const processedResults: QuizResultDetails[] = quizResults.map(
        (result) => {
          const incorrectQuestions: IncorrectQuestionDetail[] = [];
          const quizData = result.quizId;

          return {
            _id: result._id as Types.ObjectId,
            quizId: quizData?._id as Types.ObjectId,
            quizTitle: quizData?.title || "[Deleted Quiz]",
            completedAt: result.completedAt,
            score: result.score ?? 0,
            totalQuestions: result.totalQuestions ?? 0,
            retakeCount: result.retakeCount ?? 0,
            incorrectQuestions: incorrectQuestions,
          };
        }
      );

      return {
        _id: staffMember._id as Types.ObjectId,
        name: staffMember.name,
        email: staffMember.email,
        createdAt: staffMember.createdAt,
        professionalRole: staffMember.professionalRole,
        restaurantId: staffMember.restaurantId,
        role: staffMember.role,
        quizResults: processedResults,
        averageScore: averageScore,
      };
    } catch (error: any) {
      console.error("Error fetching staff member details in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "CastError" && error.path === "_id") {
        throw new AppError("Invalid Staff ID format.", 400);
      }
      throw new AppError("Failed to fetch staff member details.", 500);
    }
  }

  /**
   * Updates the professional role designation for a specific staff member.
   *
   * @param staffId - The ID of the staff member to update.
   * @param professionalRole - The new professional role string.
   * @param restaurantId - The ID of the restaurant (used for authorization scope).
   * @returns A promise resolving to the updated staff member's data (excluding password).
   * @throws {AppError} If the professionalRole is empty (400),
   *                    if the staff member is not found or doesn't belong to the restaurant (404),
   *                    if Mongoose validation fails (400),
   *                    if the staffId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async updateStaffMemberRole(
    staffId: string | Types.ObjectId,
    professionalRole: string,
    restaurantId: Types.ObjectId
  ): Promise<StaffUpdateResponse> {
    const staffObjectId =
      typeof staffId === "string" ? new Types.ObjectId(staffId) : staffId;

    if (!professionalRole || professionalRole.trim() === "") {
      throw new AppError("Professional role cannot be empty.", 400);
    }

    try {
      const updatedStaff = await User.findOneAndUpdate(
        {
          _id: staffObjectId,
          restaurantId: restaurantId,
          role: "staff",
        },
        { $set: { professionalRole: professionalRole.trim() } },
        { new: true, runValidators: true }
      ).lean<IUser>();

      if (!updatedStaff) {
        throw new AppError(
          "Staff member not found, not part of this restaurant, or not a staff role.",
          404
        );
      }

      return {
        _id: updatedStaff._id as Types.ObjectId,
        name: updatedStaff.name,
        email: updatedStaff.email,
        role: updatedStaff.role,
        professionalRole: updatedStaff.professionalRole,
        restaurantId: updatedStaff.restaurantId,
        createdAt: updatedStaff.createdAt,
        updatedAt: updatedStaff.updatedAt,
      };
    } catch (error: any) {
      console.error("Error updating staff member role in service:", error);
      if (error instanceof AppError) throw error;
      if (error instanceof mongoose.Error.ValidationError) {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      if (error.name === "CastError" && error.path === "_id") {
        throw new AppError("Invalid Staff ID format.", 400);
      }
      throw new AppError("Failed to update staff member role.", 500);
    }
  }

  /**
   * Deletes a staff member and all of their associated quiz results.
   *
   * @param staffId - The ID of the staff member to delete.
   * @param restaurantId - The ID of the restaurant (used for authorization scope).
   * @returns A promise that resolves when the deletion is complete.
   * @throws {AppError} If the staff member is not found or doesn't belong to the restaurant (404),
   *                    if the staffId format is invalid (400),
   *                    or if any database deletion operation fails (500).
   */
  static async deleteStaffMember(
    staffId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<void> {
    const staffObjectId =
      typeof staffId === "string" ? new Types.ObjectId(staffId) : staffId;

    // In a real application, consider implications:
    // - What happens to their QuizAttempts, StaffQuizProgress, QuizResults?
    // - Should these be soft-deleted, anonymized, or hard-deleted?
    // - For now, this is a hard delete of the User document only. Associated quiz data remains.

    try {
      const result = await User.deleteOne({
        _id: staffObjectId,
        restaurantId: restaurantId,
        role: "staff",
      });

      if (result.deletedCount === 0) {
        throw new AppError(
          "Staff member not found, not part of this restaurant, or not a staff role.",
          404
        );
      }
      // No return value needed for a successful deletion
    } catch (error: any) {
      console.error("Error deleting staff member in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "CastError" && error.path === "_id") {
        throw new AppError("Invalid Staff ID format.", 400);
      }
      throw new AppError("Failed to delete staff member.", 500);
    }
  }
}

export default StaffService;
