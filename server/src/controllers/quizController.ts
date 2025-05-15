import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import * as QuizService from "../services/quizService"; // Assuming functions are exported from quizService
import { AppError } from "../utils/errorHandler"; // For error handling

// Interface for expected request body (can be refined with validation library later)
interface GenerateQuizFromBanksRequestBody {
  title: string;
  description?: string;
  questionBankIds: string[];
  numberOfQuestionsPerAttempt: number;
}

export const generateQuizFromBanksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, questionBankIds, numberOfQuestionsPerAttempt } =
      req.body as GenerateQuizFromBanksRequestBody;

    if (!req.user || !req.user.restaurantId) {
      // This check should ideally be covered by protect and ensureRestaurantAssociation middleware
      return next(
        new AppError("User not authenticated or restaurantId missing.", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    // const createdBy = new mongoose.Types.ObjectId(req.user._id); // If you add createdBy to QuizModel & service data

    // Basic validation (more robust validation should be in dedicated middleware)
    if (!title || title.trim() === "") {
      return next(new AppError("Title is required.", 400));
    }
    if (
      !questionBankIds ||
      !Array.isArray(questionBankIds) ||
      questionBankIds.length === 0
    ) {
      return next(
        new AppError(
          "questionBankIds must be a non-empty array of strings.",
          400
        )
      );
    }
    if (
      typeof numberOfQuestionsPerAttempt !== "number" ||
      numberOfQuestionsPerAttempt <= 0
    ) {
      return next(
        new AppError(
          "numberOfQuestionsPerAttempt must be a positive number.",
          400
        )
      );
    }

    const quizData: QuizService.CreateQuizFromBanksData = {
      title,
      description,
      restaurantId,
      questionBankIds,
      numberOfQuestionsPerAttempt,
      // createdBy, // Pass if your service and model support it
    };

    const newQuiz = await QuizService.generateQuizFromBanksService(quizData);

    res.status(201).json({
      status: "success",
      message: "Quiz generated successfully from question banks.",
      data: newQuiz,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in generateQuizFromBanksController:",
        error
      );
    }
    next(error);
  }
};

// Add other quiz controller functions here as needed

export const startQuizAttemptController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated.", 401));
    }
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return next(new AppError("Valid Quiz ID is required.", 400));
    }

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const questions = await QuizService.startQuizAttempt(
      staffUserId,
      quizObjectId
    );

    if (questions.length === 0) {
      // This could mean the quiz is completed or no questions available
      // The service might throw an error for "completed" or return specific status.
      // For now, sending a specific message if empty.
      res.status(200).json({
        status: "success",
        message: "No new questions available for this quiz, or quiz completed.",
        data: [],
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Quiz attempt started successfully.",
      data: questions,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in startQuizAttemptController:", error);
    }
    next(error);
  }
};

interface SubmitQuizAttemptRequestBody {
  questions: Array<{
    questionId: string;
    answerGiven: any;
  }>;
  durationInSeconds?: number;
}

export const submitQuizAttemptController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const attemptData = req.body as SubmitQuizAttemptRequestBody;

    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated.", 401));
    }
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return next(new AppError("Valid Quiz ID is required.", 400));
    }
    if (
      !attemptData.questions ||
      !Array.isArray(attemptData.questions) ||
      attemptData.questions.length === 0
    ) {
      return next(
        new AppError("Attempt data with questions is required.", 400)
      );
    }
    // Further validation of each question in attemptData.questions can be added here

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const result = await QuizService.submitQuizAttempt(
      staffUserId,
      quizObjectId,
      attemptData
    );

    res.status(200).json({
      status: "success",
      message: "Quiz attempt submitted successfully.",
      data: result,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in submitQuizAttemptController:", error);
    }
    next(error);
  }
};

export const getStaffQuizProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated.", 401));
    }
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return next(new AppError("Valid Quiz ID is required.", 400));
    }

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const progress = await QuizService.getStaffQuizProgress(
      staffUserId,
      quizObjectId
    );

    if (!progress) {
      return next(
        new AppError("No progress found for this staff and quiz.", 404)
      );
    }

    res.status(200).json({
      status: "success",
      data: progress,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in getStaffQuizProgressController:",
        error
      );
    }
    next(error);
  }
};

export const getRestaurantQuizStaffProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params; // restaurantId might not be in params depending on route
    const restaurantIdFromParams = req.params.restaurantId;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError(
          "User not authenticated or restaurant association missing.",
          401
        )
      );
    }

    let restaurantObjectId: mongoose.Types.ObjectId;

    if (restaurantIdFromParams) {
      if (!mongoose.Types.ObjectId.isValid(restaurantIdFromParams)) {
        return next(
          new AppError(
            "Valid Restaurant ID in params is required if provided.",
            400
          )
        );
      }
      // Ensure the requesting user (restaurant owner) is accessing their own restaurant's data
      if (req.user.restaurantId.toString() !== restaurantIdFromParams) {
        return next(
          new AppError(
            "Forbidden: You do not have access to this restaurant's data.",
            403
          )
        );
      }
      restaurantObjectId = new mongoose.Types.ObjectId(restaurantIdFromParams);
    } else {
      // If restaurantId is not in params, use the logged-in user's restaurantId.
      // This relies on restrictTo('restaurant') middleware ensuring req.user.restaurantId is set and valid.
      restaurantObjectId = new mongoose.Types.ObjectId(req.user.restaurantId);
    }

    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return next(new AppError("Valid Quiz ID is required.", 400));
    }

    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const progressList = await QuizService.getRestaurantQuizStaffProgress(
      restaurantObjectId,
      quizObjectId
    );

    res.status(200).json({
      status: "success",
      data: progressList,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in getRestaurantQuizStaffProgressController:",
        error
      );
    }
    next(error);
  }
};
