import mongoose, { Types } from "mongoose";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import Quiz, { IQuiz } from "../models/Quiz";
import User, { IUser } from "../models/User";
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
   * Submits answers for a quiz attempt, calculates the score, saves the result,
   * and notifies relevant managers.
   *
   * @param quizId - The ID of the quiz being submitted.
   * @param userId - The ID of the staff member submitting the answers.
   * @param userName - The name of the staff member (for notifications).
   * @param restaurantId - The ID of the restaurant.
   * @param answers - An array of numbers representing the chosen answer indices.
   * @param cancelled - Indicates whether the quiz was cancelled.
   * @returns A promise resolving to an object containing the submission message, score, total questions, correct answer indices, and the saved result ID.
   * @throws {AppError} If the quiz is not found (404), if the answer count mismatch (400),
   *                    if saving the result fails (500), or for other unexpected errors (500).
   */
  static async submitAnswers(
    quizId: string | Types.ObjectId,
    userId: Types.ObjectId,
    userName: string,
    restaurantId: Types.ObjectId,
    answers: (number | undefined | null)[],
    cancelled: boolean = false
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
          `Number of answers provided (${answers.length}) does not match number of questions (${quiz.questions.length})`,
          400
        );
      }

      // 3. Calculate score - treat undefined/null answers as incorrect
      let score = 0;
      const correctAnswers: (number | undefined)[] = [];
      const processedAnswers: (number | null)[] = [];

      quiz.questions.forEach((question, index) => {
        correctAnswers.push(question.correctAnswer);
        const userAnswer = answers[index];
        processedAnswers.push(userAnswer === undefined ? null : userAnswer);

        if (
          userAnswer !== undefined &&
          userAnswer !== null &&
          userAnswer === question.correctAnswer
        ) {
          score++;
        }
      });

      // 4. Upsert QuizResult
      const status = "completed";

      const savedResult: IQuizResult | null = await QuizResult.findOneAndUpdate(
        { quizId: quiz._id, userId: userId, restaurantId: restaurantId },
        {
          $set: {
            answers: processedAnswers,
            score: score,
            totalQuestions: quiz.questions.length,
            status: status,
            completedAt: new Date(),
            wasCancelled: cancelled,
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
   * Fetches a combined view of all quizzes available to a restaurant
   * merged with the specific staff member's results for those quizzes.
   *
   * @param userId - The ID of the staff user whose results are needed.
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an array of StaffQuizViewItem objects, sorted by status (pending first) and then by newest quiz.
   * @throws {AppError} If any database error occurs during lookup (500).
   */
  static async getStaffQuizView(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<StaffQuizViewItem[]> {
    try {
      // 1. Fetch only ACTIVE quizzes for restaurant (lean)
      // Select fields needed for the view + questions for count
      const availableQuizzes = await Quiz.find(
        { restaurantId, isAvailable: true }, // Filter by isAvailable
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

  /**
   * Calculates the overall average quiz score (as a percentage) for a staff user.
   * The average is calculated based on the average percentage score achieved for each unique quiz taken.
   * Formula: Sum of (Score on Quiz / Total Questions on Quiz) / Number of Unique Quizzes Completed
   *
   * @param userId - The ID of the staff user.
   * @param restaurantId - The ID of the restaurant to scope the results.
   * @returns A promise resolving to an object containing the average score (percentage, 0-100) and the count of unique quizzes taken.
   *          Returns null for averageScore if no completed quizzes are found.
   * @throws {AppError} If any database error occurs during lookup (500).
   */
  static async calculateAverageScoreForUser(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ averageScore: number | null; quizzesTaken: number }> {
    try {
      // 1. Fetch all completed quiz results for the user/restaurant
      const results = await QuizResult.find({
        userId: userId,
        restaurantId: restaurantId,
        status: "completed",
      })
        .select("quizId score totalQuestions")
        .lean();

      if (results.length === 0) {
        return { averageScore: null, quizzesTaken: 0 };
      }

      // 2. Group results by quizId
      const scoresByQuiz: {
        [quizId: string]: { scoreSum: number; totalPossibleScore: number };
      } = {};
      results.forEach((result) => {
        const quizIdStr = result.quizId.toString();
        if (!scoresByQuiz[quizIdStr]) {
          scoresByQuiz[quizIdStr] = { scoreSum: 0, totalPossibleScore: 0 };
        }
        scoresByQuiz[quizIdStr].scoreSum += result.score ?? 0;
        scoresByQuiz[quizIdStr].totalPossibleScore +=
          result.totalQuestions ?? 0;
      });

      // 3. Calculate average percentage for each quiz and sum them
      let sumOfQuizPercentages = 0;
      const uniqueQuizzesTaken = Object.keys(scoresByQuiz).length;

      for (const quizIdStr in scoresByQuiz) {
        const quizData = scoresByQuiz[quizIdStr];
        if (quizData.totalPossibleScore > 0) {
          const percentageForQuiz =
            (quizData.scoreSum / quizData.totalPossibleScore) * 100;
          sumOfQuizPercentages += percentageForQuiz;
        } else {
          console.warn(
            `Quiz ${quizIdStr} has results but zero total possible score. Treating as 0% for average calculation.`
          );
        }
      }

      // 4. Calculate final average
      const finalAveragePercentage =
        uniqueQuizzesTaken > 0 ? sumOfQuizPercentages / uniqueQuizzesTaken : 0;

      return {
        averageScore: finalAveragePercentage,
        quizzesTaken: uniqueQuizzesTaken,
      };
    } catch (error: any) {
      console.error(
        `Error calculating average score for user ${userId}:`,
        error
      );
      throw new AppError("Failed to calculate average score.", 500);
    }
  }

  /**
   * Calculates the average score for a single user based on their completed quizzes.
   * Helper function for getStaffRankingData.
   *
   * @param userResults - Array of completed quiz results for a single user.
   * @returns The average score percentage (0-100) or null if no valid results.
   */
  private static calculateUserAverage(
    userResults: IQuizResult[]
  ): number | null {
    if (!userResults || userResults.length === 0) {
      return null;
    }

    // Group results by unique quizId to average percentages correctly
    const scoresByQuiz: {
      [quizId: string]: {
        scoreSum: number;
        count: number;
        totalPossibleScore: number;
      };
    } = {};
    userResults.forEach((result) => {
      // Only consider results with valid score and totalQuestions > 0
      if (
        result.score !== undefined &&
        result.totalQuestions !== undefined &&
        result.totalQuestions > 0 &&
        result.quizId
      ) {
        const quizIdStr = result.quizId.toString();
        if (!scoresByQuiz[quizIdStr]) {
          scoresByQuiz[quizIdStr] = {
            scoreSum: 0,
            count: 0,
            totalPossibleScore: 0,
          };
        }
        // Use the latest attempt for calculating the average for that specific quiz
        // For simplicity now, let's average all attempts for a quiz (could be refined)
        // Or, let's just take the score / totalQuestions for the *first* valid result found for each quiz? Needs clarification.
        // Let's refine: Calculate average percentage for each unique quiz, then average those percentages.
        scoresByQuiz[quizIdStr].scoreSum += result.score;
        scoresByQuiz[quizIdStr].count += 1;
        scoresByQuiz[quizIdStr].totalPossibleScore += result.totalQuestions;
      }
    });

    let sumOfQuizPercentages = 0;
    let uniqueQuizzesCount = 0;

    for (const quizIdStr in scoresByQuiz) {
      const quizData = scoresByQuiz[quizIdStr];
      if (quizData.totalPossibleScore > 0) {
        // Avoid division by zero if count > 0 but totalPossible is 0
        // Average score for *this specific quiz* across attempts
        const averageScoreForQuiz = quizData.scoreSum / quizData.count;
        const averageTotalForQuiz =
          quizData.totalPossibleScore / quizData.count;
        if (averageTotalForQuiz > 0) {
          const percentageForQuiz =
            (averageScoreForQuiz / averageTotalForQuiz) * 100;
          sumOfQuizPercentages += percentageForQuiz;
          uniqueQuizzesCount++;
        }
      } else {
        console.warn(
          `Quiz ${quizIdStr} has results but zero total possible score averaged across attempts.`
        );
      }
    }

    if (uniqueQuizzesCount === 0) {
      return null; // No valid quizzes to calculate average from
    }

    return sumOfQuizPercentages / uniqueQuizzesCount;
  }

  /**
   * Fetches ranking data for a staff member within their restaurant.
   *
   * @param requestingUserId - The ID of the staff user requesting their rank.
   * @param restaurantId - The ID of the restaurant.
   * @returns A promise resolving to an object { myAverageScore, myRank, totalRankedStaff }.
   * @throws {AppError} If any database error occurs (500).
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
      // 1. Fetch all completed results for the entire restaurant
      const allResults = await QuizResult.find(
        { restaurantId: restaurantId, status: "completed" },
        "userId score totalQuestions quizId" // Include quizId
      ).lean();

      if (allResults.length === 0) {
        return { myAverageScore: null, myRank: null, totalRankedStaff: 0 };
      }

      // 2. Group results by userId
      const resultsByUser: { [userId: string]: IQuizResult[] } = {};
      allResults.forEach((result) => {
        const userIdStr = result.userId.toString();
        if (!resultsByUser[userIdStr]) {
          resultsByUser[userIdStr] = [];
        }
        resultsByUser[userIdStr].push(result as IQuizResult);
      });

      // 3. Calculate average score for each user
      const userAverages: { userId: string; averageScore: number }[] = [];
      for (const userIdStr in resultsByUser) {
        const userAvg = QuizResultService.calculateUserAverage(
          resultsByUser[userIdStr]
        );
        if (userAvg !== null) {
          userAverages.push({ userId: userIdStr, averageScore: userAvg });
        }
      }

      // 4. Sort users by average score (descending)
      userAverages.sort((a, b) => b.averageScore - a.averageScore);

      // 5. Find rank and score for the requesting user
      let myRank: number | null = null;
      let myAverageScore: number | null = null;
      const requestingUserIdStr = requestingUserId.toString();

      for (let i = 0; i < userAverages.length; i++) {
        if (userAverages[i].userId === requestingUserIdStr) {
          myRank = i + 1; // Rank is 1-based index
          myAverageScore = userAverages[i].averageScore;
          break;
        }
      }

      // 6. Return results
      return {
        myAverageScore: myAverageScore,
        myRank: myRank,
        totalRankedStaff: userAverages.length, // Total number of staff with a calculated average
      };
    } catch (error: any) {
      console.error("Error fetching staff ranking data in service:", error);
      throw new AppError("Failed to fetch staff ranking data.", 500);
    }
  }

  /**
   * Fetches quiz results for a specific staff member, formatted for display.
   *
   * @param userId - The ID of the staff user.
   * @returns A promise resolving to an array of the user's quiz results, formatted for display.
   *          Includes quiz title. Results are sorted by most recent completion.
   * @throws {AppError} If any database error occurs during lookup (500).
   */
  static async getMyResults(userId: Types.ObjectId): Promise<any[]> {
    try {
      const results = await QuizResult.find({ userId: userId })
        .populate<{ quizId: Pick<IQuiz, "_id" | "title"> | null }>({
          path: "quizId",
          select: "title",
        })
        .sort({ completedAt: -1 })
        .lean(); // Add .lean() to get plain JS objects

      // Map results and filter out those with deleted quizzes
      const formattedResults = results
        .filter((result) => result.quizId) // Skip results where quiz doesn't exist
        .map((result) => {
          const quiz = result.quizId; // Already populated and typed

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
   *
   * @param resultId - The ID of the QuizResult to fetch.
   * @param requestingUserId - The ID of the user requesting the details.
   * @param requestingUserRole - The role ('staff' or 'restaurant') of the requesting user.
   * @param restaurantId - The restaurant ID of the requesting user (used for manager authorization).
   * @returns A promise resolving to an object containing detailed quiz result information.
   * @throws {AppError} If the result is not found (404),
   *                    if the requesting user is not authorized to view the result (403),
   *                    if the associated quiz no longer exists (404),
   *                    if the resultId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async getResultDetails(
    resultId: string | Types.ObjectId,
    requestingUserId: Types.ObjectId,
    requestingUserRole: string,
    restaurantId: Types.ObjectId
  ): Promise<any> {
    // Define a specific return type later
    const resultObjectId =
      typeof resultId === "string" ? new Types.ObjectId(resultId) : resultId;

    try {
      const result = await QuizResult.findById(resultObjectId).populate<{
        quizId: Pick<IQuiz, "_id" | "title" | "questions"> | null;
      }>({
        path: "quizId",
        select: "title questions", // Need questions and title
      });

      if (!result) {
        throw new AppError("Quiz result not found", 404);
      }

      // Authorization Check
      if (requestingUserRole === "staff") {
        if (result.userId.toString() !== requestingUserId.toString()) {
          throw new AppError("You are not authorized to view this result", 403);
        }
      } else if (requestingUserRole === "restaurant") {
        // Ensure the result belongs to the requesting owner's restaurant
        if (result.restaurantId.toString() !== restaurantId.toString()) {
          throw new AppError(
            "You are not authorized to view this result (wrong restaurant)",
            403
          );
        }
      } else {
        // Should not happen if roles are properly managed
        throw new AppError("Unauthorized role for accessing results", 403);
      }

      const quiz = result.quizId;
      if (!quiz) {
        throw new AppError(
          "The quiz associated with this result no longer exists",
          404
        );
      }

      // Helper to safely get choice text
      const getChoiceText = (
        choices: string[] | undefined,
        index: number
      ): string => {
        return choices && index >= 0 && index < choices.length
          ? choices[index]
          : "N/A";
      };

      // Process details
      const detailedResult = {
        _id: result._id,
        quizId: quiz._id,
        quizTitle: quiz.title,
        score: result.score,
        totalQuestions: result.totalQuestions,
        completedAt: result.completedAt,
        status: result.status.charAt(0).toUpperCase() + result.status.slice(1),
        retakeCount: result.retakeCount,
        questions: quiz.questions.map((question, index) => {
          const userAnswerIndex = result.answers[index];
          return {
            text: question.text,
            choices: question.choices,
            userAnswerIndex: userAnswerIndex,
            userAnswer: getChoiceText(question.choices, userAnswerIndex),
            correctAnswerIndex: question.correctAnswer,
            correctAnswer: getChoiceText(
              question.choices,
              question.correctAnswer
            ),
            isCorrect: userAnswerIndex === question.correctAnswer,
          };
        }),
      };

      return detailedResult;
    } catch (error: any) {
      console.error("Error fetching detailed quiz result in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "CastError") {
        throw new AppError("Invalid Result ID format.", 400);
      }
      throw new AppError("Failed to fetch detailed quiz result.", 500);
    }
  }

  // Add other methods related to QuizResults if needed, e.g.,
  // static async getResultsForQuiz(quizId: Types.ObjectId, restaurantId: Types.ObjectId) { ... }
  // static async getResultForUser(quizId: Types.ObjectId, userId: Types.ObjectId, restaurantId: Types.ObjectId) { ... }
}

export default QuizResultService;
