import mongoose, { Types } from "mongoose";
import User, { IUser } from "../models/User";
import QuizResult from "../models/QuizResult";
import Quiz, { IQuiz } from "../models/Quiz";
import { IQuestion } from "../models/QuestionModel";
import QuizResultService from "./quizResultService";
import { AppError } from "../utils/errorHandler";

// Define interfaces for return types to improve clarity
interface StaffMemberWithAverage {
  _id: Types.ObjectId;
  name: string;
  email: string;
  createdAt?: Date;
  professionalRole?: string;
  averageScore: number | null;
  quizzesTaken: number;
  resultsSummary: any[]; // Make resultsSummary required
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
   * including their calculated average quiz score and number of quizzes taken.
   *
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an array of staff member objects with average scores.
   * @throws {AppError} If any database error occurs (500).
   */
  static async getStaffListWithAverages(
    restaurantId: Types.ObjectId
  ): Promise<StaffMemberWithAverage[]> {
    try {
      // 1. Fetch all staff members (lean for performance)
      const staffList = await User.find(
        { restaurantId: restaurantId, role: "staff" },
        "_id name email createdAt professionalRole"
      ).lean<IUser[]>();

      // 2. Calculate average score and fetch summary for each staff member
      const staffWithData = await Promise.all(
        staffList.map(async (staff) => {
          const staffObjectId = staff._id as Types.ObjectId;

          // Call the QuizResultService to calculate the average score
          const { averageScore, quizzesTaken } =
            await QuizResultService.calculateAverageScoreForUser(
              staffObjectId,
              restaurantId
            );

          // Fetch the results summary
          const resultsSummary = await QuizResult.find(
            { userId: staffObjectId, restaurantId: restaurantId },
            "_id quizId score totalQuestions completedAt status retakeCount"
          )
            .populate<{ quizId: { title: string } | null }>({
              path: "quizId",
              select: "title",
            })
            .sort({ completedAt: -1 })
            .lean();

          // Map results to include the populated title
          const processedSummary = resultsSummary.map((result) => {
            // Keep original quizId (ObjectId)
            const originalQuizId = result.quizId;
            // Get title from the populated object
            const quizTitle = (result.quizId as any)?.title ?? "[Deleted Quiz]";

            return {
              ...result,
              quizId: originalQuizId, // Ensure quizId remains the ObjectId/string
              quizTitle: quizTitle, // Add the populated title
            };
          });

          // Construct the return object explicitly matching the interface
          return {
            _id: staffObjectId,
            name: staff.name,
            email: staff.email,
            createdAt: staff.createdAt,
            professionalRole: staff.professionalRole,
            averageScore: averageScore,
            quizzesTaken: quizzesTaken,
            resultsSummary: processedSummary,
          } as StaffMemberWithAverage;
        })
      );

      return staffWithData;
    } catch (error: any) {
      console.error(
        "Error fetching staff list with averages in service:",
        error
      );
      throw new AppError("Failed to retrieve staff list.", 500);
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

      // 2. Fetch their quiz results, populating quiz questions for analysis
      const quizResults = await QuizResult.find({
        userId: staffObjectId,
        restaurantId: restaurantId,
      })
        .populate<{
          quizId: Pick<IQuiz, "_id" | "title" | "questions"> | null;
        }>({
          path: "quizId",
          select: "title questions",
        })
        .sort({ completedAt: -1 })
        .lean();

      // 3. Calculate average score
      const {
        averageScore,
      } = // quizzesTaken not needed for detail view
        await QuizResultService.calculateAverageScoreForUser(
          staffObjectId,
          restaurantId
        );

      // 4. Process results to get incorrect answer details
      const processedResults: QuizResultDetails[] = quizResults
        .filter((result) => result.quizId)
        .map((result) => {
          const incorrectQuestions: IncorrectQuestionDetail[] = [];
          const quizData = result.quizId;

          if (quizData && quizData.questions && Array.isArray(result.answers)) {
            quizData.questions.forEach((question: IQuestion, index: number) => {
              const userAnswerIndex = result.answers[index];

              // Find the correct answer's index from the options array
              const correctOptionIndex = question.options?.findIndex(
                (opt) => opt.isCorrect
              );

              // Check if the user's answer is incorrect
              let isIncorrect = false;
              if (userAnswerIndex !== null && userAnswerIndex !== undefined) {
                if (
                  correctOptionIndex === undefined ||
                  userAnswerIndex !== correctOptionIndex
                ) {
                  isIncorrect = true;
                }
              }

              if (isIncorrect) {
                incorrectQuestions.push({
                  questionText: question.questionText,
                  userAnswer: getChoiceTextFromOptions(
                    question.options,
                    userAnswerIndex
                  ),
                  correctAnswer: getChoiceTextFromOptions(
                    question.options,
                    correctOptionIndex
                  ),
                });
              }
            });
          }

          return {
            _id: result._id as Types.ObjectId,
            quizId: quizData?._id as Types.ObjectId,
            quizTitle: quizData?.title ?? "[Deleted Quiz]",
            completedAt: result.completedAt,
            score: result.score ?? 0,
            totalQuestions: result.totalQuestions ?? 0,
            retakeCount: result.retakeCount ?? 0,
            incorrectQuestions: incorrectQuestions,
          };
        });

      // 5. Combine into final response object
      const responseData: StaffMemberDetails = {
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
      return responseData;
    } catch (error: any) {
      console.error(
        `Error fetching staff details for ID ${staffId} in service:`,
        error
      );
      if (error instanceof AppError) throw error;
      if (error.name === "CastError") {
        throw new AppError("Invalid Staff ID format.", 400);
      }
      throw new AppError("Failed to retrieve staff details.", 500);
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

    if (
      !professionalRole ||
      typeof professionalRole !== "string" ||
      professionalRole.trim().length === 0
    ) {
      throw new AppError("Professional role cannot be empty.", 400);
    }

    try {
      // Use findOne and save() to ensure middleware/hooks run
      const staffMember = await User.findOne({
        _id: staffObjectId,
        restaurantId: restaurantId,
        role: "staff",
      });

      if (!staffMember) {
        throw new AppError(
          "Staff member not found or you do not have permission to edit.",
          404
        );
      }

      staffMember.professionalRole = professionalRole.trim();
      const updatedStaff = await staffMember.save(); // Validation is run by save()

      // Prepare response using the new interface
      const staffResponse: StaffUpdateResponse = {
        _id: updatedStaff._id,
        name: updatedStaff.name,
        email: updatedStaff.email,
        role: updatedStaff.role,
        professionalRole: updatedStaff.professionalRole,
        restaurantId: updatedStaff.restaurantId,
        createdAt: updatedStaff.createdAt,
        updatedAt: updatedStaff.updatedAt,
      };
      return staffResponse;
    } catch (error: any) {
      console.error(
        `Error updating staff role for ID ${staffId} in service:`,
        error
      );
      if (error instanceof AppError) throw error;
      if (error.name === "ValidationError") {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      if (error.name === "CastError") {
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

    // TODO: Consider transaction
    try {
      // 1. Verify the staff member exists and belongs to the restaurant
      const staffMember = await User.findOne(
        { _id: staffObjectId, restaurantId: restaurantId, role: "staff" },
        "_id" // Only need ID for verification
      );

      if (!staffMember) {
        throw new AppError(
          "Staff member not found or does not belong to this restaurant.",
          404
        );
      }

      // 2. Delete associated quiz results
      await QuizResult.deleteMany({
        userId: staffObjectId,
        restaurantId: restaurantId, // Ensure correct restaurant scope
      });

      // 3. Delete the staff user itself
      const deleteUserResult = await User.deleteOne({ _id: staffObjectId });

      if (deleteUserResult.deletedCount === 0) {
        // This should ideally not happen if findOne succeeded, but acts as a safeguard
        console.warn(
          `Staff member ${staffObjectId} found but deletion failed.`
        );
        throw new AppError("Failed to delete staff member user record.", 500);
      }

      // Optional: Remove staff member ID from restaurant's staff array
      // await Restaurant.findByIdAndUpdate(restaurantId, { $pull: { staff: staffObjectId } });
    } catch (error: any) {
      console.error(
        `Error deleting staff member ${staffId} in service:`,
        error
      );
      if (error instanceof AppError) throw error;
      if (error.name === "CastError") {
        throw new AppError("Invalid Staff ID format.", 400);
      }
      throw new AppError("Failed to delete staff member.", 500);
    }
  }
}

export default StaffService;
