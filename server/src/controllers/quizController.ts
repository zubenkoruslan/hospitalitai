import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import * as QuizService from "../services/quizService"; // Assuming functions are exported from quizService
import { AppError } from "../utils/errorHandler"; // For error handling

// Interface for expected request body (can be refined with validation library later)
interface GenerateQuizFromBanksRequestBody {
  title: string;
  description?: string;
  questionBankIds: string[];
  numberOfQuestions: number;
}

export const generateQuizFromBanksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, questionBankIds, numberOfQuestions } =
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
    if (typeof numberOfQuestions !== "number" || numberOfQuestions <= 0) {
      return next(
        new AppError("numberOfQuestions must be a positive number.", 400)
      );
    }

    const quizData: QuizService.CreateQuizFromBanksData = {
      title,
      description,
      restaurantId,
      questionBankIds,
      numberOfQuestions,
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
