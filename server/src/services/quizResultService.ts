import mongoose, { Types } from "mongoose";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import Quiz, { IQuiz } from "../models/Quiz";
import User, { IUser } from "../models/User";
import { AppError } from "../utils/errorHandler";
import QuizAttempt, { IQuizAttempt } from "../models/QuizAttempt";

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
  latestResultId?: string; // Added field for the specific result ID
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
        "title numberOfQuestionsPerAttempt" // MODIFIED: Removed 'questions', added 'numberOfQuestionsPerAttempt'
      ); // Removed .lean()

      if (!quiz) {
        throw new AppError("Quiz not found or not accessible", 404);
      }

      // 2. Validate answers length
      if (answers.length !== quiz.numberOfQuestionsPerAttempt) {
        throw new AppError(
          `Number of answers provided (${answers.length}) does not match number of questions (${quiz.numberOfQuestionsPerAttempt})`,
          400
        );
      }

      // 3. Calculate score - treat undefined/null answers as incorrect
      let score = 0;
      const correctAnswers: (number | undefined)[] = [];
      const processedAnswers: (number | null)[] = [];

      // MODIFIED: The scoring logic is now handled in QuizService.submitQuizAttempt
      // This function's responsibility for QuizResult is mainly to store what's passed or calculated elsewhere.
      // For now, we will process answers as given, but without detailed scoring here.
      answers.forEach((ans) => {
        // Removed index as it's not used
        processedAnswers.push(ans === undefined ? null : ans);
      });
      // Score calculation should occur in QuizService.submitQuizAttempt and be passed if needed,
      // or this function's QuizResult.score should be set based on what QuizService passes to it.
      // For this refactor, we assume `score` is passed or correctly determined before this stage if it were still primary.
      // However, QuizService.submitQuizAttempt already calculates and saves score in QuizAttempt.
      // The QuizResult score here might become redundant or simplified.

      // 4. Upsert QuizResult
      const status = "completed";

      const savedResult: IQuizResult | null = await QuizResult.findOneAndUpdate(
        { quizId: quiz._id, userId: userId, restaurantId: restaurantId },
        {
          $set: {
            answers: processedAnswers, // Storing raw answers as received by this legacy function
            score: score, // This score is 0 based on current logic here. Should align with QuizService.submitQuizAttempt.
            totalQuestions: quiz.numberOfQuestionsPerAttempt,
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

      if (!savedResult?._id) {
        throw new AppError("Saved result ID missing after processing.", 500);
      }
      return {
        message: "Quiz submitted successfully",
        score: score, // This score is 0 from this function's perspective
        totalQuestions: quiz.numberOfQuestionsPerAttempt,
        correctAnswers: correctAnswers, // Will be empty
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
   * THIS FUNCTION STILL USES QuizResult and may need re-evaluation if QuizResult is fully deprecated for view purposes.
   */
  static async getStaffQuizView(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<StaffQuizViewItem[]> {
    try {
      const availableQuizzes = await Quiz.find(
        { restaurantId, isAvailable: true },
        "_id title description createdAt numberOfQuestionsPerAttempt"
      )
        .sort({ createdAt: -1 })
        .lean();

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
    // Temporary: Replace with Misha's actual ObjectId for specific debugging
    const mishaIdForDebug = "MISHA_USER_ID_PLACEHOLDER";
    const isDebuggingMisha = userId.toString() === mishaIdForDebug;

    if (isDebuggingMisha) {
      console.log(
        `[AvgScoreDebug] Calculating average for Misha (ID: ${userId})`
      );
    }

    try {
      const userAttempts = await QuizAttempt.find({
        staffUserId: userId,
        restaurantId: restaurantId,
      })
        .populate<{
          quizId: Pick<IQuiz, "_id" | "isAvailable" | "title"> | null;
        }>({
          path: "quizId",
          select: "isAvailable title",
        })
        .select("quizId score questionsPresented")
        .lean<
          Array<
            IQuizAttempt & {
              quizId: Pick<IQuiz, "_id" | "isAvailable" | "title"> | null;
            }
          >
        >();

      if (isDebuggingMisha) {
        console.log(
          "[AvgScoreDebug] Misha's ALL attempts (before filtering by isAvailable):",
          userAttempts.map((a) => ({
            quizId: a.quizId?._id?.toString(),
            quizTitle: a.quizId?.title,
            quizIsAvailable: a.quizId?.isAvailable,
            score: a.score,
            qsPresented: a.questionsPresented?.length,
          }))
        );
      }

      if (!userAttempts || userAttempts.length === 0) {
        if (isDebuggingMisha)
          console.log("[AvgScoreDebug] Misha has NO attempts at all.");
        return { averageScore: null, quizzesTaken: 0 };
      }

      const activeUserAttempts = userAttempts.filter((attempt) => {
        const isActive = attempt.quizId && attempt.quizId.isAvailable === true;
        return isActive;
      });

      if (isDebuggingMisha) {
        console.log(
          "[AvgScoreDebug] Misha's ACTIVE attempts (after filtering by isAvailable):",
          activeUserAttempts.map((a) => ({
            quizId: a.quizId?._id?.toString(),
            quizTitle: a.quizId?.title,
            score: a.score,
            qsPresented: a.questionsPresented?.length,
          }))
        );
      }

      if (activeUserAttempts.length === 0) {
        if (isDebuggingMisha)
          console.log(
            "[AvgScoreDebug] Misha has NO ACTIVE attempts after filtering."
          );
        return { averageScore: null, quizzesTaken: 0 };
      }

      // Explicitly type attemptsByQuiz value arrays
      const attemptsByQuiz: {
        [quizId: string]: Array<
          IQuizAttempt & {
            quizId: Pick<IQuiz, "_id" | "isAvailable" | "title">;
          }
        >;
      } = {};
      activeUserAttempts.forEach((attempt) => {
        if (attempt.quizId) {
          // Ensure quizId is not null
          const quizIdStr = attempt.quizId._id.toString();
          if (!attemptsByQuiz[quizIdStr]) {
            attemptsByQuiz[quizIdStr] = [];
          }
          // Cast attempt to ensure the quizId has the title for later use in logging
          attemptsByQuiz[quizIdStr].push(
            attempt as IQuizAttempt & {
              quizId: Pick<IQuiz, "_id" | "isAvailable" | "title">;
            }
          );
        }
      });

      const perQuizAveragePercentages: number[] = [];
      let uniqueQuizzesAttemptedCount = 0;

      if (isDebuggingMisha) {
        console.log(
          "[AvgScoreDebug] Misha's attempts grouped by ACTIVE quiz (IDs shown):",
          Object.keys(attemptsByQuiz).map((quizId_str) => ({
            quizId: quizId_str,
            // Access title from the first attempt in the group, which has the populated quizId
            quizTitle: attemptsByQuiz[quizId_str][0]?.quizId?.title,
            numAttempts: attemptsByQuiz[quizId_str].length,
            scoresAndPresented: attemptsByQuiz[quizId_str].map((a) => ({
              score: a.score,
              presented: a.questionsPresented?.length,
            })),
          }))
        );
      }

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
            // Ensure quizId and title exist before logging
            if (isDebuggingMisha && attemptsForThisQuiz[0].quizId?.title) {
              console.log(
                `[AvgScoreDebug] Misha - For Quiz '${
                  attemptsForThisQuiz[0].quizId.title
                }' (ID: ${quizIdStr}): Avg Percentage = ${averagePercentageForThisQuiz.toFixed(
                  2
                )}% (from ${validAttemptsForThisQuizCount} attempts)`
              );
            }
          }
          uniqueQuizzesAttemptedCount++;
        }
      }

      if (perQuizAveragePercentages.length === 0) {
        if (isDebuggingMisha)
          console.log(
            "[AvgScoreDebug] Misha - No per-quiz averages were calculated (possibly all active attempts had 0 questions presented or other issues)."
          );
        // If no per-quiz averages, quizzesTaken should also be 0, unless we define "taken" differently (e.g. just having an active attempt regardless of validity for scoring)
        // For now, aligning quizzesTaken with scorable quizzes.
        return { averageScore: null, quizzesTaken: 0 };
      }

      const overallAverageScore =
        perQuizAveragePercentages.reduce((sum, avg) => sum + avg, 0) /
        perQuizAveragePercentages.length;

      if (isDebuggingMisha) {
        console.log(
          `[AvgScoreDebug] Misha - Per-quiz averages that went into final calculation: [${perQuizAveragePercentages
            .map((p) => p.toFixed(2))
            .join(", ")}]`
        );
        console.log(
          `[AvgScoreDebug] Misha - Final Calculated Average: ${overallAverageScore.toFixed(
            1
          )}%, Quizzes Taken (active with valid attempts): ${uniqueQuizzesAttemptedCount}`
        );
      }

      return {
        averageScore: parseFloat(overallAverageScore.toFixed(1)),
        quizzesTaken: uniqueQuizzesAttemptedCount,
      };
    } catch (error) {
      if (isDebuggingMisha)
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

export default QuizResultService;
