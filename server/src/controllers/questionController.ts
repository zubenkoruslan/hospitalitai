import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/errorHandler";
import * as QuestionService from "./../services/questionService"; // Adjusted path
import QuestionModel, { IQuestion } from "../models/QuestionModel"; // Import QuestionModel and IQuestion
import { QuestionTaggingService } from "../services/questionTaggingService";

export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      questionText,
      questionType,
      options,
      categories,
      difficulty,
      questionBankId,
      knowledgeCategory,
      knowledgeSubcategories,
    } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId;

    // Validation for body fields (questionText, questionType, options, categories)
    // is assumed to be handled by validateCreateQuestionBody in the routes file.

    const questionData: QuestionService.NewQuestionData = {
      questionText,
      questionType,
      options,
      categories,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      createdBy: "manual",
      difficulty,
      questionBankId: new mongoose.Types.ObjectId(questionBankId),
      knowledgeCategory,
      knowledgeSubcategories,
    };

    // Validate questionBankId presence (moved from service for early check)
    if (!questionBankId) {
      return next(
        new AppError("Question bank ID is required to create a question.", 400)
      );
    }
    if (!mongoose.Types.ObjectId.isValid(questionBankId)) {
      return next(new AppError("Invalid Question Bank ID format.", 400));
    }

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

    // Validation for questionId is assumed to be handled by validateObjectId('questionId') in routes.
    // Validation for body fields is assumed to be handled by validateUpdateQuestionBody in routes.

    const updateData: QuestionService.UpdateQuestionData = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (questionType !== undefined) updateData.questionType = questionType;
    if (options !== undefined) updateData.options = options;
    if (categories !== undefined) updateData.categories = categories;
    if (difficulty !== undefined) updateData.difficulty = difficulty;

    // The check for empty updateData is now part of validateUpdateQuestionBody.

    const updatedQuestion = await QuestionService.updateQuestionService(
      questionId,
      restaurantId,
      updateData
    );

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

export const getPendingReviewQuestionsHandler = async (
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
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

    // Optional bankId query parameter if you want to filter pending questions by a temporary bank link
    // const { bankId } = req.query;
    // const query: any = { restaurantId, status: 'pending_review' };
    // if (bankId && typeof bankId === 'string') {
    //   query.tempBankId = new mongoose.Types.ObjectId(bankId); // Assuming a field like tempBankId
    // }

    const pendingQuestions = await QuestionModel.find({
      restaurantId: restaurantId,
      status: "pending_review",
      createdBy: "ai", // Explicitly fetch AI-created pending questions
    }).sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      status: "success",
      results: pendingQuestions.length,
      data: pendingQuestions,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return next(new AppError(`Invalid ID format: ${error.message}`, 400));
    }
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

/**
 * AI Batch Tagging Controller - Phase 3 Feature
 * Tags multiple questions with knowledge categories using AI
 */
export const batchTagQuestionsHandler = async (
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

    const { questionIds, forceRetag = false } = req.body;

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return next(
        new AppError("questionIds array is required and must not be empty", 400)
      );
    }

    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

    // Find questions to tag
    const questionsToTag = await QuestionModel.find({
      _id: { $in: questionIds.map((id) => new mongoose.Types.ObjectId(id)) },
      restaurantId: restaurantId,
      ...(forceRetag ? {} : { knowledgeCategory: { $exists: false } }), // Only tag untagged questions unless forced
    });

    if (questionsToTag.length === 0) {
      return next(
        new AppError(
          "No questions found to tag or all questions already have categories",
          404
        )
      );
    }

    const taggedQuestions: IQuestion[] = [];
    const taggingErrors: string[] = [];

    for (const question of questionsToTag) {
      try {
        // Determine knowledge category using AI tagging service
        const taggingResult = QuestionTaggingService.determineKnowledgeCategory(
          question.questionText,
          {
            existingCategories: question.categories,
          }
        );

        // Update question with knowledge category data
        question.knowledgeCategory = taggingResult.knowledgeCategory;
        question.knowledgeSubcategories = taggingResult.knowledgeSubcategories;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();

        const savedQuestion = await question.save();
        taggedQuestions.push(savedQuestion);

        console.log(
          `[Batch Tagging] Question ${
            question._id
          }: "${question.questionText.substring(0, 50)}..." ` +
            `→ ${taggingResult.knowledgeCategory} (${(
              taggingResult.confidence * 100
            ).toFixed(1)}% confidence)`
        );
      } catch (error) {
        const errorMsg = `Question ${question._id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        taggingErrors.push(errorMsg);
        console.error(`[Batch Tagging Error] ${errorMsg}`);
      }
    }

    res.status(200).json({
      status: "success",
      message: `Successfully tagged ${taggedQuestions.length} questions`,
      data: {
        taggedCount: taggedQuestions.length,
        errorCount: taggingErrors.length,
        taggedQuestions: taggedQuestions.map((q) => ({
          _id: q._id,
          questionText: q.questionText.substring(0, 100) + "...",
          knowledgeCategory: q.knowledgeCategory,
          knowledgeSubcategories: q.knowledgeSubcategories,
          confidence: "AI-tagged",
        })),
        errors: taggingErrors.length > 0 ? taggingErrors : undefined,
      },
    });
  } catch (error) {
    console.error("Batch tagging error:", error);
    next(error);
  }
};

/**
 * Validate Knowledge Category Tagging Controller - Phase 3 Feature
 * Validates AI tagging quality for a question
 */
export const validateQuestionTaggingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return next(new AppError("Invalid question ID format", 400));
    }

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }

    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

    const question = await QuestionModel.findOne({
      _id: questionId,
      restaurantId: restaurantId,
    });

    if (!question) {
      return next(new AppError("Question not found", 404));
    }

    if (!question.knowledgeCategory) {
      return next(
        new AppError(
          "Question does not have a knowledge category assigned",
          400
        )
      );
    }

    // Validate the current tagging
    const validation = QuestionTaggingService.validateTagging(
      question.questionText,
      question.knowledgeCategory,
      question.knowledgeSubcategories || []
    );

    res.status(200).json({
      status: "success",
      data: {
        questionId: question._id,
        currentCategory: question.knowledgeCategory,
        currentSubcategories: question.knowledgeSubcategories,
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          suggestions: validation.suggestions,
        },
      },
    });
  } catch (error) {
    console.error("Question validation error:", error);
    next(error);
  }
};
