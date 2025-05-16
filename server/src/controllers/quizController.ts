import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { QuizService, CreateQuizFromBanksData } from "../services/quizService"; // Import CreateQuizFromBanksData
import { AppError } from "../utils/errorHandler"; // For error handling
import {
  GenerateQuizFromBanksRequestBody,
  SubmitQuizAttemptRequestBody,
  UpdateQuizRequestBody, // Added UpdateQuizRequestBody import
} from "../types/quizTypes"; // Added import
import { IQuiz } from "../models/QuizModel"; // Added IQuiz import

// Removed local GenerateQuizFromBanksRequestBody interface
// Removed local SubmitQuizAttemptRequestBody interface

export const generateQuizFromBanksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title,
      description,
      questionBankIds,
      numberOfQuestionsPerAttempt,
      targetRoles,
    } = req.body as GenerateQuizFromBanksRequestBody;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing.", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    // Validation for body fields (title, questionBankIds, numberOfQuestionsPerAttempt)
    // is assumed to be handled by validateGenerateQuizFromBanksBody in the routes file.

    const quizData: CreateQuizFromBanksData = {
      title,
      description,
      restaurantId,
      questionBankIds,
      numberOfQuestionsPerAttempt,
      targetRoles: targetRoles
        ? targetRoles.map((id) => new mongoose.Types.ObjectId(id))
        : undefined,
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
    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const questions = await QuizService.startQuizAttempt(
      staffUserId,
      quizObjectId
    );

    if (questions.length === 0) {
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
    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.
    // attemptData validation is assumed to be handled by validateSubmitQuizAttemptBody in the routes file.

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
    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const progress = await QuizService.getStaffQuizProgress(
      staffUserId,
      quizObjectId
    );

    // Note: Service now returns IStaffQuizProgressWithAttemptDetails | null
    // which might need adjustment if we are moving to a list of attempts here.
    // For now, this controller remains as is, focusing on adding the new one.

    res.status(200).json({
      status: "success",
      data: progress, // Could be null if no progress found
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

export const getQuizAttemptDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const requestingUserId = req.user?.userId?.toString(); // req.user.userId should be string per AuthPayload

    if (!requestingUserId) {
      return next(
        new AppError("User not authenticated or user ID missing.", 401)
      );
    }
    // attemptId validation (e.g. isMongoId using validateObjectId('attemptId'))
    // is assumed to be handled in the routes file.

    const attemptDetails = await QuizService.getQuizAttemptDetails(
      attemptId, // attemptId will be a string from req.params
      requestingUserId
    );

    res.status(200).json({
      status: "success",
      data: attemptDetails,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in getQuizAttemptDetailsController:",
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
    const { quizId } = req.params;
    const restaurantIdFromParams = req.params.restaurantId; // This is optional in some route definitions

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError(
          "User not authenticated or restaurant association missing.",
          401
        )
      );
    }

    let restaurantObjectId: mongoose.Types.ObjectId;

    // restaurantIdFromParams validation (isMongoId using validateObjectId('restaurantId'))
    // is assumed to be handled in the routes file IF this param is mandatory for the route.
    // If the route allows restaurantId to be optional in params, then this logic is fine.
    if (restaurantIdFromParams) {
      // Authorization check:
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
      restaurantObjectId = new mongoose.Types.ObjectId(req.user.restaurantId);
    }

    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.
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

export const resetQuizProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing.", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const result = await QuizService.resetQuizProgressForEveryone(
      quizObjectId,
      restaurantId
    );

    res.status(200).json({
      status: "success",
      message: "Quiz progress reset successfully for all staff.",
      data: {
        updatedProgressCount: result.updatedProgressCount,
        deletedAttemptsCount: result.deletedAttemptsCount,
      },
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in resetQuizProgressController:", error);
    }
    next(error);
  }
};

export const updateQuizController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const {
      title,
      description,
      questionBankIds,
      numberOfQuestionsPerAttempt,
      isAvailable,
      targetRoles,
    } = req.body as UpdateQuizRequestBody;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing.", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const serviceUpdateData: Partial<IQuiz> = {};

    if (title !== undefined) serviceUpdateData.title = title;
    if (description !== undefined) serviceUpdateData.description = description;
    if (numberOfQuestionsPerAttempt !== undefined)
      serviceUpdateData.numberOfQuestionsPerAttempt =
        numberOfQuestionsPerAttempt;
    if (isAvailable !== undefined) serviceUpdateData.isAvailable = isAvailable;

    if (targetRoles) {
      serviceUpdateData.targetRoles = targetRoles.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }
    if (questionBankIds) {
      serviceUpdateData.sourceQuestionBankIds = questionBankIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    const updatedQuiz = await QuizService.updateQuiz(
      quizObjectId,
      restaurantId,
      serviceUpdateData
    );

    res.status(200).json({
      status: "success",
      message: "Quiz updated successfully.",
      data: updatedQuiz,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in updateQuizController:", error);
    }
    next(error);
  }
};
