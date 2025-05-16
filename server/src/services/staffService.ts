import mongoose, { Types } from "mongoose";
import User, { IUser } from "../models/User";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import Quiz, { IQuiz } from "../models/Quiz";
import { IQuestion } from "../models/QuestionModel";
import QuizResultService from "./quizResultService";
import { AppError } from "../utils/errorHandler";
import StaffQuizProgress, {
  IStaffQuizProgress,
} from "../models/StaffQuizProgress";
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";
import { IQuizAttemptSummary } from "../types/quizTypes";

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

// NEW: Interface for aggregated quiz performance summary
interface AggregatedQuizPerformanceSummary {
  quizId: Types.ObjectId;
  quizTitle: string;
  numberOfAttempts: number;
  averageScorePercent: number | null;
  lastCompletedAt?: Date;
  attempts: IQuizAttemptSummary[];
}

interface StaffMemberDetails {
  _id: Types.ObjectId;
  name: string;
  email: string;
  createdAt?: Date;
  professionalRole?: string;
  restaurantId?: Types.ObjectId;
  role: string;
  aggregatedQuizPerformance: AggregatedQuizPerformanceSummary[];
  averageScore: number | null; // Overall average score across all quizzes
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

        // Filter out progress records for quizzes that are deleted or not available
        staffProgressRecords = staffProgressRecords.filter(
          (sp) =>
            sp.quizId &&
            (sp.quizId as Pick<IQuiz, "isAvailable">).isAvailable === true
        );

        const quizProgressSummaries: QuizProgressSummary[] = [];
        for (const progressRecord of staffProgressRecords) {
          // Iterate directly over filtered records
          if (!progressRecord.quizId?._id || !progressRecord.quizId.title) {
            // Should not happen if quizId is populated and filtered correctly
            console.warn(
              `[StaffService] Skipping progress record due to missing quizId or title for staff ${staffObjectId}`
            );
            continue;
          }

          const totalSourceQuestions =
            progressRecord.quizId.totalUniqueQuestionsInSourceSnapshot ?? 0;
          const seenQuestionsCount =
            progressRecord.seenQuestionIds?.length || 0;

          let overallProgressPercentage = 0;
          if (totalSourceQuestions > 0) {
            overallProgressPercentage = Math.round(
              (seenQuestionsCount / totalSourceQuestions) * 100
            );
          }

          // Fetch attempts for this specific quiz to calculate average score
          const attemptsForThisQuiz = await QuizAttempt.find({
            staffUserId: staffObjectId,
            quizId: progressRecord.quizId._id,
            restaurantId: restaurantId,
          })
            .select("score questionsPresented")
            .lean<Pick<IQuizAttempt, "score" | "questionsPresented">[]>();

          let averageScoreForThisQuiz: number | null = null;
          if (attemptsForThisQuiz.length > 0) {
            let totalPercentageSum = 0;
            let validAttemptsCount = 0;
            attemptsForThisQuiz.forEach((attempt) => {
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
              averageScoreForThisQuiz = parseFloat(
                ((totalPercentageSum / validAttemptsCount) * 100).toFixed(1)
              );
            }
          }

          quizProgressSummaries.push({
            quizId: progressRecord.quizId._id,
            quizTitle: progressRecord.quizId.title,
            overallProgressPercentage: overallProgressPercentage,
            isCompletedOverall: progressRecord.isCompletedOverall,
            lastAttemptTimestamp: progressRecord.lastAttemptTimestamp || null,
            averageScoreForQuiz: averageScoreForThisQuiz,
          });
        }

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

    const user = await User.findById(staffObjectId).lean<IUser>();
    if (!user || user.restaurantId?.toString() !== restaurantId.toString()) {
      // It's possible a staff member might not have a restaurantId if the system allows it,
      // but the query implies a restaurant context. Adjust if staff can exist without restaurantId.
      throw new AppError(
        "Staff member not found or does not belong to this restaurant.",
        404
      );
    }

    const { averageScore: overallAverageScore } =
      await QuizResultService.calculateAverageScoreForUser(
        staffObjectId,
        restaurantId
      );

    const allUserAttempts = await QuizAttempt.find({
      staffUserId: staffObjectId,
      restaurantId: restaurantId,
    })
      .populate<{ quizId: Pick<IQuiz, "_id" | "title"> }>("quizId", "_id title")
      .sort({ quizId: 1, attemptDate: -1 })
      .lean<Array<IQuizAttempt & { quizId: Pick<IQuiz, "_id" | "title"> }>>();

    const attemptsByQuiz = new Map<
      string,
      Array<IQuizAttempt & { quizId: Pick<IQuiz, "_id" | "title"> }>
    >();
    for (const attempt of allUserAttempts) {
      if (attempt.quizId?._id) {
        const quizIdStr = attempt.quizId._id.toString();
        if (!attemptsByQuiz.has(quizIdStr)) {
          attemptsByQuiz.set(quizIdStr, []);
        }
        // Ensure non-null assertion is safe or handle undefined explicitly
        const attemptsList = attemptsByQuiz.get(quizIdStr);
        if (attemptsList) {
          attemptsList.push(attempt);
        }
      }
    }

    const aggregatedPerformanceList: AggregatedQuizPerformanceSummary[] = [];

    for (const [quizIdStr, attemptsForQuiz] of attemptsByQuiz.entries()) {
      if (attemptsForQuiz.length === 0) continue;

      const currentQuizInfo = attemptsForQuiz[0].quizId;
      const quizTitle = currentQuizInfo.title;
      const numberOfAttempts = attemptsForQuiz.length;
      const lastCompletedAt = attemptsForQuiz[0].attemptDate;

      let totalPercentageSum = 0;
      let validAttemptsForAverageCount = 0;
      attemptsForQuiz.forEach((att) => {
        if (
          att.score !== undefined &&
          att.questionsPresented &&
          att.questionsPresented.length > 0
        ) {
          totalPercentageSum += att.score / att.questionsPresented.length;
          validAttemptsForAverageCount++;
        }
      });

      const averageScorePercent =
        validAttemptsForAverageCount > 0
          ? parseFloat(
              (
                (totalPercentageSum / validAttemptsForAverageCount) *
                100
              ).toFixed(1)
            )
          : null;

      const attemptSummaries: IQuizAttemptSummary[] = attemptsForQuiz
        .map((att) => {
          const totalQuestions = att.questionsPresented?.length || 0;
          return {
            _id: att._id.toString(),
            score: att.score,
            totalQuestions: totalQuestions,
            attemptDate: att.attemptDate,
            hasIncorrectAnswers:
              totalQuestions > 0 && att.score < totalQuestions,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.attemptDate).getTime() -
            new Date(a.attemptDate).getTime()
        ); // Sort attempts newest first

      aggregatedPerformanceList.push({
        quizId: new Types.ObjectId(quizIdStr),
        quizTitle: quizTitle,
        numberOfAttempts: numberOfAttempts,
        averageScorePercent: averageScorePercent,
        lastCompletedAt: lastCompletedAt,
        attempts: attemptSummaries,
      });
    }

    aggregatedPerformanceList.sort((a, b) =>
      a.quizTitle.localeCompare(b.quizTitle)
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      professionalRole: user.professionalRole,
      restaurantId: user.restaurantId,
      role: user.role,
      aggregatedQuizPerformance: aggregatedPerformanceList,
      averageScore: overallAverageScore,
    };
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
    restaurantId: Types.ObjectId // restaurantId of the establishment, for authorization
  ): Promise<void> {
    const staffObjectId =
      typeof staffId === "string" ? new Types.ObjectId(staffId) : staffId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Verify the staff member exists and belongs to the specified restaurant.
      const staffMember = await User.findOne({
        _id: staffObjectId,
        restaurantId: restaurantId, // User's restaurantId must match the one provided for auth
        role: "staff",
      }).session(session);

      if (!staffMember) {
        throw new AppError(
          "Staff member not found, not part of this restaurant, or not a staff role.",
          404
        );
      }

      // 2. Delete associated data from other collections.
      // Note: QuizResult uses `userId` for the staff member.
      // All these operations should use the staffObjectId and also restaurantId for scoping where appropriate.
      await QuizAttempt.deleteMany(
        { staffUserId: staffObjectId, restaurantId: restaurantId },
        { session }
      );
      await StaffQuizProgress.deleteMany(
        { staffUserId: staffObjectId, restaurantId: restaurantId },
        { session }
      );
      await QuizResult.deleteMany(
        { userId: staffObjectId, restaurantId: restaurantId },
        { session }
      );

      // 3. Delete the User document itself.
      await User.deleteOne({
        _id: staffObjectId,
        restaurantId: restaurantId,
        role: "staff",
      }).session(session);

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error deleting staff member in service:", error);
      if (error instanceof AppError) {
        throw error; // Re-throw AppError directly
      }
      // Handle potential CastError if staffId is invalid format, though type check helps
      if (error.name === "CastError" && error.path === "_id") {
        throw new AppError("Invalid Staff ID format.", 400);
      }
      throw new AppError(
        "Failed to delete staff member and associated data.",
        500
      );
    } finally {
      session.endSession();
    }
  }
}

export default StaffService;
