import { Types } from "mongoose";
import mongoose from "mongoose";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import QuizModel, { IQuiz } from "../models/QuizModel";
import User from "../models/User";
import { AppError } from "../utils/errorHandler";
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";

// Copied from quizService.ts - TODO: Move to a shared types file
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
  createdAt: Date;
  updatedAt: Date;
}

// Interface for the data returned by submitAnswers
interface _QuizSubmissionResult {
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
  latestResultId?: string; // Added field for the specific result ID
}

export class QuizResultService {
  /**
   * Fetches a combined view of all quizzes available to a restaurant
   * merged with the specific staff member's results for those quizzes.
   * THIS FUNCTION STILL USES QuizResult and may need re-evaluation if QuizResult is fully deprecated for view purposes.
   */
  static async getStaffQuizView(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<StaffQuizViewItem[]> {
    try {
      const availableQuizzes = await QuizModel.find(
        { restaurantId, isAvailable: true },
        "_id title description createdAt numberOfQuestionsPerAttempt"
      )
        .sort({ createdAt: -1 })
        .lean<PlainIQuiz[]>();

      const userResults = await QuizResult.find(
        // Still uses QuizResult
        { userId: userId, restaurantId: restaurantId },
        "_id quizId score totalQuestions completedAt retakeCount status"
      )
        .sort({ completedAt: -1 })
        .lean();

      const resultsMap = new Map<
        string,
        Partial<IQuizResult> & { _id: Types.ObjectId }
      >();
      userResults.forEach((result) => {
        if (result.quizId && !resultsMap.has(result.quizId.toString())) {
          resultsMap.set(result.quizId.toString(), {
            ...result,
            _id: result._id as Types.ObjectId,
          });
        }
      });

      const combinedView = availableQuizzes.map((quiz) => {
        const result = resultsMap.get(quiz._id.toString());
        const status = result?.status || "pending";
        return {
          _id: quiz._id as Types.ObjectId,
          title: quiz.title,
          description: quiz.description,
          numQuestions: quiz.numberOfQuestionsPerAttempt || 0,
          createdAt: quiz.createdAt,
          score: result?.score,
          totalQuestions: result?.totalQuestions,
          completedAt: result?.completedAt,
          retakeCount: result?.retakeCount,
          status: status as StaffQuizViewItem["status"],
          latestResultId: result?._id?.toString(),
        };
      });

      combinedView.sort((a, b) => {
        const statusOrder = { pending: 0, "in-progress": 1, completed: 2 };
        const statusA = statusOrder[a.status || "pending"] ?? 99;
        const statusB = statusOrder[b.status || "pending"] ?? 99;
        if (statusA !== statusB) return statusA - statusB;
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });

      return combinedView;
    } catch (error) {
      console.error("Error fetching staff quiz view in service:", error);
      throw new AppError("Failed to fetch staff quiz view.", 500);
    }
  }

  /**
   * Calculates the overall average quiz score (as a percentage) for a staff user
   * based on their QuizAttempt records.
   * The average is calculated as: (Sum of (Average % score for each unique quiz taken)) / (Number of unique quizzes taken with attempts)
   *
   * @param userId - The ID of the staff user.
   * @param restaurantId - The ID of the restaurant to scope the results.
   * @returns A promise resolving to an object containing the average score (percentage, 0-100) and the count of unique quizzes attempted.
   *          Returns null for averageScore if no attempts are found.
   */
  static async calculateAverageScoreForUser(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ averageScore: number | null; quizzesTaken: number }> {
    const mishaIdForDebug = "MISHA_USER_ID_PLACEHOLDER"; // Keep Misha debug logic if desired
    const isDebuggingMisha = userId.toString() === mishaIdForDebug;

    // Simplified test debugging condition
    const isDebuggingTestUser = !process.env.VITEST;

    if (isDebuggingTestUser) {
      console.log(
        `[TEST_DEBUG] Service: Calculating average for user ${userId}`
      );
    }
    // ... (Misha log if active)

    try {
      const userAttempts = await QuizAttempt.find({
        staffUserId: userId,
        restaurantId: restaurantId,
      })
        .populate<{
          quizId: Pick<IQuiz, "_id" | "isAvailable" | "title"> | null;
        }>({
          path: "quizId",
          select: "isAvailable title", // Restore original select
        })
        .select("quizId score questionsPresented") // quizId is needed for population, score & qP for logic
        .lean<
          Array<
            IQuizAttempt & {
              quizId: Pick<IQuiz, "_id" | "isAvailable" | "title"> | null;
            }
          >
        >();

      if (isDebuggingTestUser) {
        console.log(
          `[TEST_DEBUG] Service: User ${userId} - ALL attempts (after populate & lean):`,
          userAttempts.map((a) => ({
            quizIdObj: a.quizId, // Log the whole populated quizId object
            isAvailable: a.quizId?.isAvailable,
            title: a.quizId?.title,
            score: a.score,
            qsPres: a.questionsPresented?.length,
          }))
        );
      }

      // ... (Misha log for all attempts if active)

      if (!userAttempts || userAttempts.length === 0) {
        if (isDebuggingTestUser)
          console.log(
            `[TEST_DEBUG] Service: User ${userId} - NO attempts at all.`
          );
        return { averageScore: null, quizzesTaken: 0 };
      }

      const activeUserAttempts = userAttempts.filter((attempt) => {
        const isActive = attempt.quizId && attempt.quizId.isAvailable === true;
        return isActive;
      });

      if (isDebuggingTestUser) {
        console.log(
          `[TEST_DEBUG] Service: User ${userId} - ACTIVE attempts (after filtering):`,
          activeUserAttempts.map((a) => ({
            title: a.quizId?.title,
            isAvailable: a.quizId?.isAvailable,
            score: a.score,
            qsPres: a.questionsPresented?.length,
          }))
        );
      }

      // ... (Misha log for active attempts if active)

      if (activeUserAttempts.length === 0) {
        if (isDebuggingTestUser)
          console.log(
            `[TEST_DEBUG] Service: User ${userId} - NO ACTIVE attempts after filtering.`
          );
        return { averageScore: null, quizzesTaken: 0 };
      }

      const attemptsByQuiz: {
        [quizId: string]: Array<
          IQuizAttempt & {
            quizId: Pick<IQuiz, "_id" | "isAvailable" | "title">; // quizId here should be populated and asserted as non-null
          }
        >;
      } = {};

      activeUserAttempts.forEach((attempt) => {
        // activeUserAttempts are filtered, so attempt.quizId should be populated and non-null
        const populatedQuizId = attempt.quizId!;
        const quizIdStr = populatedQuizId._id.toString();
        if (!attemptsByQuiz[quizIdStr]) {
          attemptsByQuiz[quizIdStr] = [];
        }
        attemptsByQuiz[quizIdStr].push(
          attempt as IQuizAttempt & {
            quizId: Pick<IQuiz, "_id" | "isAvailable" | "title">;
          }
        );
      });

      if (isDebuggingTestUser) {
        console.log(
          `[TEST_DEBUG] Service: User ${userId} - Attempts grouped by ACTIVE quiz:`,
          Object.keys(attemptsByQuiz).map((quizId_str) => ({
            quizId: quizId_str,
            title: attemptsByQuiz[quizId_str][0]?.quizId?.title,
            numAttempts: attemptsByQuiz[quizId_str].length,
            scoresAndPresented: attemptsByQuiz[quizId_str].map((a) => ({
              score: a.score,
              presented: a.questionsPresented?.length,
            })),
          }))
        );
      }

      // ... (rest of the logic: perQuizAveragePercentages calculation, etc.)
      // This part should be fine if attemptsByQuiz is correctly populated.
      const perQuizAveragePercentages: number[] = [];
      let uniqueQuizzesAttemptedCount = 0;

      for (const quizIdStr in attemptsByQuiz) {
        const attemptsForThisQuiz = attemptsByQuiz[quizIdStr];
        if (attemptsForThisQuiz.length > 0) {
          let totalPercentageScoreForThisQuiz = 0;
          let validAttemptsForThisQuizCount = 0;

          attemptsForThisQuiz.forEach((attempt) => {
            if (
              attempt.score !== undefined &&
              attempt.questionsPresented &&
              attempt.questionsPresented.length > 0
            ) {
              totalPercentageScoreForThisQuiz +=
                attempt.score / attempt.questionsPresented.length;
              validAttemptsForThisQuizCount++;
            }
          });

          if (validAttemptsForThisQuizCount > 0) {
            const averagePercentageForThisQuiz =
              (totalPercentageScoreForThisQuiz /
                validAttemptsForThisQuizCount) *
              100;
            perQuizAveragePercentages.push(averagePercentageForThisQuiz);
          }
          uniqueQuizzesAttemptedCount++;
        }
      }

      if (isDebuggingTestUser)
        console.log(
          `[TEST_DEBUG] Service: User ${userId} - Final perQuizAveragePercentages: [${perQuizAveragePercentages
            .map((p) => p.toFixed(2))
            .join(
              ", "
            )}], uniqueQuizzesAttemptedCount: ${uniqueQuizzesAttemptedCount}`
        );

      if (perQuizAveragePercentages.length === 0) {
        if (isDebuggingTestUser)
          console.log(
            `[TEST_DEBUG] Service: User ${userId} - No per-quiz averages calculated. Returning null score.`
          );
        return { averageScore: null, quizzesTaken: 0 }; // quizzesTaken is 0 if no avg score
      }

      const overallAverageScore =
        perQuizAveragePercentages.reduce((sum, avg) => sum + avg, 0) /
        perQuizAveragePercentages.length;

      if (isDebuggingTestUser)
        console.log(
          `[TEST_DEBUG] Service: User ${userId} - Final overallAverageScore=${overallAverageScore.toFixed(
            1
          )}, quizzesTaken=${uniqueQuizzesAttemptedCount}`
        );

      return {
        averageScore: parseFloat(overallAverageScore.toFixed(1)),
        quizzesTaken: uniqueQuizzesAttemptedCount,
      };
    } catch (error) {
      // ... error logging ...
      if (isDebuggingTestUser)
        console.error(
          `[TEST_DEBUG] Service: User ${userId} - Error in calculateAverageScoreForUser:`,
          error
        );
      else if (isDebuggingMisha)
        console.error(
          "[AvgScoreDebug] Misha - Error in calculateAverageScoreForUser:",
          error
        );
      else
        console.error(
          `Error calculating average score for user ${userId}:`,
          error
        );
      throw new AppError("Failed to calculate average score.", 500);
    }
  }

  /**
   * Fetches ranking data for a staff member within their restaurant.
   * Now uses calculateAverageScoreForUser which is based on QuizAttempts.
   */
  static async getStaffRankingData(
    requestingUserId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{
    myAverageScore: number | null;
    myRank: number | null;
    totalRankedStaff: number;
  }> {
    try {
      const staffInRestaurant = await User.find(
        { restaurantId: restaurantId, role: "staff" },
        "_id"
      ).lean();

      if (staffInRestaurant.length === 0) {
        return { myAverageScore: null, myRank: null, totalRankedStaff: 0 };
      }

      const userAverages: { userId: string; averageScore: number }[] = [];

      for (const staff of staffInRestaurant) {
        const { averageScore } =
          await QuizResultService.calculateAverageScoreForUser(
            staff._id as Types.ObjectId, // Ensure staff._id is treated as ObjectId
            restaurantId
          );

        if (averageScore !== null) {
          userAverages.push({ userId: staff._id.toString(), averageScore });
        }
      }

      userAverages.sort((a, b) => b.averageScore - a.averageScore);

      let myRank: number | null = null;
      let myAverageScore: number | null = null;
      const requestingUserIdStr = requestingUserId.toString();

      for (let i = 0; i < userAverages.length; i++) {
        if (userAverages[i].userId === requestingUserIdStr) {
          myRank = i + 1;
          myAverageScore = userAverages[i].averageScore;
          break;
        }
      }

      return {
        myAverageScore: myAverageScore,
        myRank: myRank,
        totalRankedStaff: userAverages.length,
      };
    } catch (error: any) {
      console.error("Error fetching staff ranking data in service:", error);
      throw new AppError("Failed to fetch staff ranking data.", 500);
    }
  }

  /**
   * Fetches quiz results for a specific staff member, formatted for display.
   * STILL USES QuizResult.
   */
  static async getMyResults(userId: Types.ObjectId): Promise<any[]> {
    try {
      const results = await QuizResult.find({ userId: userId })
        .populate<{ quizId: Pick<IQuiz, "_id" | "title"> | null }>({
          path: "quizId",
          select: "title",
        })
        .sort({ completedAt: -1 })
        .lean();

      const formattedResults = results
        .filter((result) => result.quizId)
        .map((result) => {
          const quiz = result.quizId;
          return {
            _id: result._id,
            quizId: quiz?._id,
            quizTitle: quiz?.title,
            score: result.score,
            totalQuestions: result.totalQuestions,
            completedAt: result.completedAt,
            status:
              result.status.charAt(0).toUpperCase() + result.status.slice(1),
            retakeCount: result.retakeCount,
          };
        });

      return formattedResults;
    } catch (error: any) {
      console.error("Error fetching my results in service:", error);
      throw new AppError("Failed to fetch quiz results.", 500);
    }
  }

  /**
   * Fetches detailed information for a single quiz result, including question text, choices, user answer, and correct answer.
   * STILL USES QuizResult.
   */
  static async getResultDetails(
    resultId: string | Types.ObjectId,
    requestingUserId: Types.ObjectId,
    requestingUserRole: string,
    restaurantId: Types.ObjectId
  ): Promise<any> {
    const resultObjectId =
      typeof resultId === "string" ? new Types.ObjectId(resultId) : resultId;

    try {
      const result = await QuizResult.findById(resultObjectId).populate<{
        quizId: Pick<IQuiz, "_id" | "title"> | null;
      }>({
        path: "quizId",
        select: "title",
      });

      if (!result) {
        throw new AppError("Quiz result not found", 404);
      }

      if (requestingUserRole === "staff") {
        if (result.userId.toString() !== requestingUserId.toString()) {
          throw new AppError("You are not authorized to view this result", 403);
        }
      } else if (requestingUserRole === "restaurant") {
        if (result.restaurantId.toString() !== restaurantId.toString()) {
          throw new AppError(
            "You are not authorized to view this result (wrong restaurant)",
            403
          );
        }
      } else {
        throw new AppError("Unauthorized role for accessing results", 403);
      }

      const quiz = result.quizId;
      if (!quiz) {
        throw new AppError(
          "The quiz associated with this result no longer exists",
          404
        );
      }

      const formattedQuestions: any[] = [];

      return {
        _id: result._id,
        quizId: quiz._id,
        quizTitle: quiz.title,
        score: result.score,
        totalQuestions: result.totalQuestions,
        completedAt: result.completedAt,
        status: result.status.charAt(0).toUpperCase() + result.status.slice(1),
        retakeCount: result.retakeCount,
        questions: formattedQuestions,
      };
    } catch (error: any) {
      console.error("Error fetching detailed quiz result in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "CastError") {
        throw new AppError("Invalid Result ID format.", 400);
      }
      throw new AppError("Failed to fetch detailed quiz result.", 500);
    }
  }
}
