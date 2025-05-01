import mongoose, { Types } from "mongoose";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import Quiz, { IQuiz } from "../models/Quiz";
import User, { IUser } from "../models/User";
import notificationService from "./notificationService"; // Assuming it's in the same directory
import { AppError } from "../utils/errorHandler";

// Interface for the data returned by submitAnswers
interface QuizSubmissionResult {
  message: string;
  score: number;
  totalQuestions: number;
  correctAnswers: (number | undefined)[];
  savedResultId?: Types.ObjectId; // Optionally return the ID of the saved result
}

// Interface for the combined staff view data
interface StaffQuizViewItem {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  numQuestions: number;
  createdAt?: Date;
  score?: number;
  totalQuestions?: number;
  completedAt?: Date | null;
  retakeCount?: number;
  status?: "pending" | "completed" | "in-progress"; // Use specific statuses
}

class QuizResultService {
  /**
   * Handles the submission of quiz answers by a staff member.
   * TODO: Consider wrapping in a transaction.
   */
  static async submitAnswers(
    quizId: string | Types.ObjectId,
    userId: Types.ObjectId,
    userName: string,
    restaurantId: Types.ObjectId,
    answers: number[]
  ): Promise<QuizSubmissionResult> {
    const quizObjectId =
      typeof quizId === "string" ? new Types.ObjectId(quizId) : quizId;

    try {
      // 1. Find Quiz - Fetch full document to ensure _id is ObjectId instance
      const quiz = await Quiz.findOne(
        { _id: quizObjectId, restaurantId: restaurantId },
        "questions title" // Still select only necessary fields
      ); // Removed .lean()

      if (!quiz) {
        throw new AppError("Quiz not found or not accessible", 404);
      }

      // 2. Validate answers length
      if (answers.length !== quiz.questions.length) {
        throw new AppError(
          `Number of answers (${answers.length}) does not match number of questions (${quiz.questions.length})`,
          400
        );
      }

      // 3. Calculate score
      let score = 0;
      const correctAnswers: (number | undefined)[] = [];
      quiz.questions.forEach((question, index) => {
        correctAnswers.push(question.correctAnswer);
        if (answers[index] === question.correctAnswer) {
          score++;
        }
      });

      // 4. Upsert QuizResult
      const savedResult: IQuizResult | null = await QuizResult.findOneAndUpdate(
        { quizId: quiz._id, userId: userId, restaurantId: restaurantId },
        {
          $set: {
            answers: answers,
            score: score,
            totalQuestions: quiz.questions.length,
            status: "completed",
            completedAt: new Date(),
          },
          $inc: { retakeCount: 1 },
        },
        { new: true, upsert: true, runValidators: true }
      );

      if (!savedResult) {
        console.error(
          `Failed to find or create QuizResult for quiz ${quizId}, user ${userId} during submission.`
        );
        throw new AppError("Failed to save quiz result", 500);
      }

      // 5. Trigger notifications
      try {
        const managers: IUser[] = await User.find({
          restaurantId: restaurantId,
          role: "restaurant",
        }).select("_id");

        const notificationPromises = managers.map((manager) => {
          if (!savedResult?._id) {
            console.error("Saved result ID is missing unexpectedly.");
            return Promise.resolve();
          }
          return notificationService.createCompletedTrainingNotification(
            manager._id,
            userId,
            userName,
            quiz._id,
            quiz.title,
            savedResult._id
          );
        });
        Promise.allSettled(notificationPromises).then((results) => {
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              console.error(
                `Failed to create completion notification for manager ${managers[index]._id}:`,
                result.reason
              );
            }
          });
        });
      } catch (notificationError) {
        console.error(
          "Failed to query managers for completion notification:",
          notificationError
        );
      }

      // 6. Return result details
      if (!savedResult?._id) {
        throw new AppError("Saved result ID missing after processing.", 500);
      }
      return {
        message: "Quiz submitted successfully",
        score: score,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctAnswers,
        savedResultId: savedResult._id,
      };
    } catch (error) {
      console.error("Error submitting quiz answers in service:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to submit quiz answers.", 500);
    }
  }

  /**
   * Fetches the combined view of quizzes and their results for a specific staff member.
   */
  static async getStaffQuizView(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<StaffQuizViewItem[]> {
    try {
      // 1. Fetch all quizzes for restaurant (lean)
      // Select fields needed for the view + questions for count
      const availableQuizzes = await Quiz.find(
        { restaurantId },
        "_id title description questions createdAt"
      ).lean();

      // 2. Fetch all results for the user for this restaurant (lean)
      const userResults = await QuizResult.find(
        { userId: userId, restaurantId: restaurantId }, // Filter by restaurant too
        "quizId score totalQuestions completedAt retakeCount status"
      ).lean();

      // 3. Create a map for efficient lookup
      const resultsMap = new Map<string, Partial<IQuizResult>>();
      userResults.forEach((result) => {
        if (result.quizId) {
          // Ensure quizId exists
          resultsMap.set(result.quizId.toString(), result);
        }
      });

      // 4. Merge data
      const combinedView = availableQuizzes.map((quiz) => {
        const result = resultsMap.get(quiz._id.toString());
        const status = result?.status || "pending"; // Default to pending if no result

        return {
          _id: quiz._id as Types.ObjectId, // Cast back to ObjectId
          title: quiz.title,
          description: quiz.description,
          numQuestions: quiz.questions?.length || 0,
          createdAt: quiz.createdAt,
          score: result?.score,
          totalQuestions: result?.totalQuestions,
          completedAt: result?.completedAt,
          retakeCount: result?.retakeCount,
          // Ensure status type matches StaffQuizViewItem
          status: status as StaffQuizViewItem["status"],
        };
      });

      // 5. Sort results: Pending first, then by newest quiz creation date
      combinedView.sort((a, b) => {
        const statusOrder = { pending: 0, completed: 1, "in-progress": 2 }; // Define order
        const statusA = statusOrder[a.status || "pending"] ?? 99;
        const statusB = statusOrder[b.status || "pending"] ?? 99;
        if (statusA !== statusB) return statusA - statusB;
        // If statuses are the same, sort by newest quiz first
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });

      return combinedView;
    } catch (error) {
      console.error("Error fetching staff quiz view in service:", error);
      throw new AppError("Failed to fetch staff quiz view.", 500);
    }
  }

  // Add other methods related to QuizResults if needed, e.g.,
  // static async getResultsForQuiz(quizId: Types.ObjectId, restaurantId: Types.ObjectId) { ... }
  // static async getResultForUser(quizId: Types.ObjectId, userId: Types.ObjectId, restaurantId: Types.ObjectId) { ... }
}

export default QuizResultService;
