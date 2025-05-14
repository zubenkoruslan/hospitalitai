import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/errorHandler";
import * as QuestionService from "./../services/questionService"; // Adjusted path

export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionText, questionType, options, categories, difficulty } =
      req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId;

    // Basic validation for required fields from the client
    if (!questionText || !questionType || !options || !categories) {
      return next(
        new AppError(
          "Missing required fields: questionText, questionType, options, categories.",
          400
        )
      );
    }
    if (!Array.isArray(options) || options.length === 0) {
      return next(new AppError("Options must be a non-empty array.", 400));
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      return next(new AppError("Categories must be a non-empty array.", 400));
    }

    const questionData: QuestionService.NewQuestionData = {
      questionText,
      questionType,
      options,
      categories,
      restaurantId,
      createdBy: "manual", // Questions created via this endpoint are manually created
      difficulty,
    };

    const newQuestion = await QuestionService.createQuestionService(
      questionData
    );

    res.status(201).json({
      status: "success",
      message: "Question created successfully.",
      data: newQuestion,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuestionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionId } = req.params;
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId;

    // Service will handle invalid questionId format and throw AppError
    const question = await QuestionService.getQuestionByIdService(
      questionId,
      restaurantId
    );

    if (!question) {
      return next(
        new AppError(
          `Question not found with ID: ${questionId} for your restaurant.`,
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId;

    // TODO: Pass query params from req.query to the service for pagination/filtering
    const questions = await QuestionService.getAllQuestionsService(
      restaurantId,
      req.query
    );

    res.status(200).json({
      status: "success",
      results: questions.length,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionId } = req.params;
    const { questionText, questionType, options, categories, difficulty } =
      req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId;

    const updateData: QuestionService.UpdateQuestionData = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (questionType !== undefined) updateData.questionType = questionType;
    if (options !== undefined) updateData.options = options;
    if (categories !== undefined) updateData.categories = categories;
    if (difficulty !== undefined) updateData.difficulty = difficulty;

    if (Object.keys(updateData).length === 0) {
      return next(new AppError("No fields provided for update.", 400));
    }

    // Validate options array structure if provided, before sending to service
    if (updateData.options && !Array.isArray(updateData.options)) {
      // Mongoose will validate content further
      return next(new AppError("If provided, options must be an array.", 400));
    }
    if (
      updateData.categories &&
      (!Array.isArray(updateData.categories) ||
        updateData.categories.length === 0)
    ) {
      return next(
        new AppError("If provided, categories must be a non-empty array.", 400)
      );
    }

    const updatedQuestion = await QuestionService.updateQuestionService(
      questionId,
      restaurantId,
      updateData
    );

    // Service throws AppError if not found (which we check via existingQuestion fetch now)
    // or if other pre-validations fail.

    res.status(200).json({
      status: "success",
      message: "Question updated successfully.",
      data: updatedQuestion,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionId } = req.params;
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId;

    // Service will handle invalid questionId format
    const wasDeleted = await QuestionService.deleteQuestionService(
      questionId,
      restaurantId
    );

    if (!wasDeleted) {
      return next(
        new AppError(
          `Question not found with ID: ${questionId} for your restaurant, or delete failed.`,
          404
        )
      );
    }

    res.status(204).json({
      // 204 No Content is typical for successful DELETE operations
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const generateAiQuestionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Destructure based on AiGenerationClientParams from frontend / AiGenerationParams in service
    const {
      menuId,
      bankId,
      itemIds,
      categoriesToFocus,
      numQuestionsPerItem,
      // geminiModelName, // If you decide to use it, ensure it's in AiGenerationParams
    } = req.body as QuestionService.AiGenerationParams; // Using service's AiGenerationParams for type safety

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    // Ensure restaurantId is converted to mongoose.Types.ObjectId if it isn't already
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

    // Basic validation for required fields
    if (!menuId || !bankId) {
      return next(
        new AppError(
          "Missing required fields: menuId and bankId are required for AI question generation from a menu.",
          400
        )
      );
    }

    const generatedQuestions = await QuestionService.generateAiQuestionsService(
      {
        restaurantId,
        menuId,
        bankId,
        itemIds, // Pass through optional params
        categoriesToFocus,
        numQuestionsPerItem,
        // geminiModelName, // Pass through if used
      }
    );

    if (!generatedQuestions || generatedQuestions.length === 0) {
      // Handle case where service returns empty array (e.g., no matching menu items)
      // Or if service throws an error for this, this check might not be hit often.
      res.status(200).json({
        status: "success",
        message: "No questions were generated based on the provided criteria.",
        data: [],
      });
      return; // Exit after sending response
    }

    res.status(201).json({
      status: "success",
      message: "AI questions generated successfully from menu.",
      results: generatedQuestions.length,
      data: generatedQuestions,
    });
  } catch (error) {
    // The service should throw AppError for known issues, which will be handled by global error handler
    // Log unexpected errors before passing to next
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in generateAiQuestionsController:",
        error
      );
    }
    next(error);
  }
};
