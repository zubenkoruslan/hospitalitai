import mongoose, { Types } from "mongoose";
import User, { IUser } from "../models/User";
import QuizResult from "../models/QuizResult";
import { IQuiz } from "../models/QuizModel";
import QuizModel from "../models/QuizModel";
import { QuizResultService } from "./quizResultService";
import { AppError } from "../utils/errorHandler";
import StaffQuizProgress, {
  IStaffQuizProgress,
} from "../models/StaffQuizProgress";
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";
import { IQuizAttemptSummary } from "../types/quizTypes";
import RoleModel, { IRole } from "../models/RoleModel";

// Define interfaces for return types to improve clarity

// Plain interface for lean Role objects
export interface PlainIRole {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  restaurantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Ensure all data fields from IRole are here, without Document methods
}

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
  assignedRoleName?: string;
  assignedRoleId?: Types.ObjectId;
  averageScore: number | null; // Overall average score from QuizResultService.calculateAverageScoreForUser
  quizzesTaken: number; // Count of unique quizzes with attempts by this staff member
  assignableQuizzesCount: number; // ADDED: Count of quizzes assignable to this staff member's role
  quizProgressSummaries: QuizProgressSummary[]; // REPLACES resultsSummary
}

interface _IncorrectQuestionDetail {
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
  assignedRoleName?: string;
  restaurantId?: Types.ObjectId;
  role: string;
  aggregatedQuizPerformance: AggregatedQuizPerformanceSummary[];
  averageScore: number | null; // Overall average score across all quizzes
}

interface StaffUpdateResponse {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string; // This 'role' is the general user role (e.g., 'staff', 'admin'), not the professional role.
  restaurantId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  assignedRoleId?: Types.ObjectId; // Changed from roles: Types.ObjectId[]
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
        "_id name email createdAt assignedRoleId"
      ).lean<Array<IUser & { assignedRoleId?: Types.ObjectId }>>();

      // 2. For each staff member, process roles and calculate quiz progress
      const staffWithDataPromises = staffList.map(async (staffMember) => {
        let displayAssignedRoleName: string | undefined = undefined;

        // If a formal role is assigned, use its name.
        if (staffMember.assignedRoleId) {
          const roleDoc = await RoleModel.findById(staffMember.assignedRoleId)
            .select("name")
            .lean<PlainIRole>();
          if (roleDoc && roleDoc.name) {
            displayAssignedRoleName = roleDoc.name;
          }
        }

        const staffObjectId = staffMember._id as Types.ObjectId;

        // Calculate overall average score (this now uses QuizAttempts and filters by active quizzes)
        const { averageScore, quizzesTaken } =
          await QuizResultService.calculateAverageScoreForUser(
            staffObjectId,
            restaurantId
          );

        // ADDED: Calculate assignableQuizzesCount
        let assignableQuizzesCount = 0;
        const queryConditionsForAssignableQuizzes: mongoose.FilterQuery<IQuiz> =
          {
            restaurantId: restaurantId,
            isAvailable: true,
          };

        if (staffMember.assignedRoleId) {
          queryConditionsForAssignableQuizzes.$or = [
            { targetRoles: { $exists: false } },
            { targetRoles: { $size: 0 } },
            { targetRoles: staffMember.assignedRoleId },
          ];
        } else {
          queryConditionsForAssignableQuizzes.$or = [
            { targetRoles: { $exists: false } },
            { targetRoles: { $size: 0 } },
          ];
        }
        assignableQuizzesCount = await QuizModel.countDocuments(
          queryConditionsForAssignableQuizzes
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
          name: staffMember.name,
          email: staffMember.email,
          createdAt: staffMember.createdAt,
          assignedRoleName: displayAssignedRoleName,
          assignedRoleId: staffMember.assignedRoleId,
          averageScore: averageScore,
          quizzesTaken: quizzesTaken,
          assignableQuizzesCount: assignableQuizzesCount,
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
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      throw new AppError("Invalid staff ID format", 400);
    }

    const staffObjectId = new Types.ObjectId(staffId);

    // 1. Fetch staff member basic details
    const staffMember = await User.findOne({
      _id: staffObjectId,
      restaurantId: restaurantId,
      role: "staff",
    })
      .select("_id name email createdAt restaurantId role assignedRoleId")
      .lean<
        Pick<
          IUser,
          | "_id"
          | "name"
          | "email"
          | "createdAt"
          | "restaurantId"
          | "role"
          | "assignedRoleId"
        >
      >();

    if (!staffMember) {
      throw new AppError(
        "Staff member not found or not part of the restaurant.",
        404
      );
    }

    let displayAssignedRoleName: string | undefined = undefined;
    if (staffMember.assignedRoleId) {
      const roleDoc = await RoleModel.findById(staffMember.assignedRoleId)
        .select("name")
        .lean<PlainIRole>();
      if (roleDoc && roleDoc.name) {
        displayAssignedRoleName = roleDoc.name;
      }
    }

    // 2. Fetch all quiz attempts for the staff member
    // We need to populate quiz titles for the summary
    const quizAttempts = await QuizAttempt.find({
      staffUserId: staffObjectId,
      restaurantId: restaurantId,
      // isCompleted: true, // Filter for completed attempts if 'isCompleted' field exists and is relevant.
      // IQuizAttempt does not have isCompleted, attemptDate signifies completion.
    })
      .populate<{ quizId: Pick<IQuiz, "_id" | "title"> }>({
        path: "quizId",
        select: "_id title", // Select only necessary fields from Quiz
      })
      .sort({ attemptDate: -1 }) // Changed from completedAt to attemptDate
      .lean<Array<IQuizAttempt & { quizId: Pick<IQuiz, "_id" | "title"> }>>();

    // 3. Aggregate quiz performance
    const aggregatedPerformance: Record<
      string,
      AggregatedQuizPerformanceSummary
    > = {};

    for (const attempt of quizAttempts) {
      if (!attempt.quizId || !attempt.quizId._id) continue; // Skip if quizId is not populated

      const quizIdStr = attempt.quizId._id.toString();

      if (!aggregatedPerformance[quizIdStr]) {
        aggregatedPerformance[quizIdStr] = {
          quizId: attempt.quizId._id,
          quizTitle: attempt.quizId.title || "Untitled Quiz",
          numberOfAttempts: 0,
          averageScorePercent: 0, // Initialize with 0, will be updated
          attempts: [],
          lastCompletedAt: undefined, // Will be updated with the latest attemptDate
        };
      }

      const perfSummary = aggregatedPerformance[quizIdStr];
      perfSummary.numberOfAttempts++;

      const questionsPresentedCount = attempt.questionsPresented?.length ?? 0;
      const attemptScorePercent =
        questionsPresentedCount > 0
          ? (attempt.score / questionsPresentedCount) * 100
          : 0;

      // Sum of percentages to calculate average later
      // Handle potential null by using 0 if it's the first attempt in summary
      perfSummary.averageScorePercent =
        ((perfSummary.averageScorePercent || 0) *
          (perfSummary.numberOfAttempts - 1) + // Coalesce null to 0
          attemptScorePercent) /
        perfSummary.numberOfAttempts;

      // Update lastCompletedAt with the most recent attemptDate for this quiz
      if (attempt.attemptDate) {
        // Check if attemptDate exists
        if (
          !perfSummary.lastCompletedAt ||
          attempt.attemptDate > perfSummary.lastCompletedAt
        ) {
          perfSummary.lastCompletedAt = attempt.attemptDate; // Use attemptDate
        }
      }

      // Ensure this matches IQuizAttemptSummary from server/src/types/quizTypes.ts
      const hasIncorrectAnswers =
        questionsPresentedCount > 0 && attempt.score < questionsPresentedCount;
      perfSummary.attempts.push({
        _id: attempt._id.toString(), // Changed from attemptId
        score: attempt.score,
        totalQuestions: questionsPresentedCount,
        attemptDate: attempt.attemptDate, // Changed from completedAt
        hasIncorrectAnswers: hasIncorrectAnswers, // Added required field
        // percentageScore and questions: [] were removed as they are not in IQuizAttemptSummary
      });
    }

    // Convert record to array and round average scores
    const aggregatedQuizPerformanceArray = Object.values(
      aggregatedPerformance
    ).map((summary) => ({
      ...summary,
      averageScorePercent: summary.averageScorePercent
        ? parseFloat(summary.averageScorePercent.toFixed(1))
        : null,
    }));

    // 4. Calculate overall average score
    const { averageScore } =
      await QuizResultService.calculateAverageScoreForUser(
        staffObjectId,
        restaurantId
      );

    return {
      _id: staffMember._id as Types.ObjectId,
      name: staffMember.name,
      email: staffMember.email,
      createdAt: staffMember.createdAt,
      assignedRoleName: displayAssignedRoleName,
      restaurantId: staffMember.restaurantId,
      role: staffMember.role,
      aggregatedQuizPerformance: aggregatedQuizPerformanceArray,
      averageScore: averageScore,
    };
  }

  /**
   * Updates a staff member's professional role ONLY.
   * For assigning a formal Role entity, use updateStaffAssignedRole.
   *
   * @param staffId - The ID of the staff member.
   * @param professionalRole - The new professional role string.
   * @param restaurantId - The ID of the restaurant for authorization.
   * @returns A promise resolving to the updated staff member object.
   * @throws {AppError} If staff member not found (404) or on database error (500).
   */
  // static async updateStaffMemberRole(
  //   staffId: string | Types.ObjectId,
  //   professionalRoleInput: string, // Renamed to avoid conflict if IUser had professionalRole
  //   restaurantId: Types.ObjectId
  // ): Promise<StaffUpdateResponse> {
  //   try {
  //     const updatedUser = await User.findOneAndUpdate(
  //       { _id: staffId, restaurantId: restaurantId, role: "staff" },
  //       // { $set: { professionalRole: professionalRoleInput } }, // This field no longer exists on User
  //       { $set: { } }, // Example: Update other fields if this method is repurposed
  //       { new: true, runValidators: true }
  //     ).lean<IUser>(); // IUser no longer has professionalRole

  //     if (!updatedUser) {
  //       throw new AppError(
  //         "Staff member not found or you do not have permission to update.",
  //         404
  //       );
  //     }

  //     // Destructure user object; professionalRole is not on updatedUser as it's not in IUser
  //     const { password, ...userWithoutSensitiveFields } = updatedUser.toObject ? updatedUser.toObject() : updatedUser;

  //     // StaffUpdateResponse also no longer has professionalRole
  //     return {
  //       ...userWithoutSensitiveFields,
  //       _id: userWithoutSensitiveFields._id as Types.ObjectId,
  //       // professionalRole: undefined, // Explicitly ensure it's not returned
  //       // Map other fields for StaffUpdateResponse as needed
  //     };
  //   } catch (error: any) {
  //     console.error("Error updating staff member role in service:", error);
  //     if (error instanceof AppError) throw error;
  //     throw new AppError("Failed to update staff member role.", 500);
  //   }
  // }

  /**
   * Assigns or unassigns a specific Role to a staff member.
   * If assignedRoleId is null, the role is unassigned.
   *
   * @param staffId - The ID of the staff member.
   * @param assignedRoleId - The ObjectId of the Role to assign, or null to unassign.
   * @param restaurantId - The ID of the restaurant for authorization.
   * @returns A promise resolving to the updated staff member object (excluding password).
   * @throws {AppError} If staff member not found (404) or on database error (500).
   */
  static async updateStaffAssignedRole(
    staffId: string | Types.ObjectId,
    assignedRoleId: Types.ObjectId | null,
    restaurantId: Types.ObjectId
  ): Promise<Omit<IUser, "password"> | null> {
    const staffObjectId =
      typeof staffId === "string" ? new Types.ObjectId(staffId) : staffId;

    try {
      const staffMember = await User.findOne({
        _id: staffObjectId,
        restaurantId: restaurantId,
      });

      if (!staffMember) {
        throw new AppError("Staff member not found in this restaurant.", 404);
      }

      staffMember.assignedRoleId = assignedRoleId || undefined; // Set to ObjectId or undefined if null

      const updatedStaff = await staffMember.save();

      // Return a lean version of the user object, excluding the password
      const { password, ...staffDetailsWithoutPassword } =
        updatedStaff.toObject() as IUser;
      return staffDetailsWithoutPassword as Omit<IUser, "password">;
    } catch (error) {
      console.error("Error updating staff assigned role in service:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update staff member's assigned role.", 500);
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
