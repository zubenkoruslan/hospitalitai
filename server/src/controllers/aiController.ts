import { Request, Response, NextFunction } from "express";
import AiQuestionService from "../services/AiQuestionService";
import { AppError } from "../utils/errorHandler"; // Corrected path

interface GenerateQuestionsRequestBody {
  menuId: string;
  itemIds?: string[];
  categories: string[];
  questionFocusAreas: string[];
  targetQuestionCountPerItemFocus: number;
  questionTypes: string[];
  difficulty: string;
  additionalContext?: string;
  // restaurantId will be taken from authenticated user or request context, not directly from body for security
}

export const generateAiQuestionsHandler = async (
  req: Request<{}, {}, GenerateQuestionsRequestBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user } = req; // Assuming user is attached by auth middleware
    if (!user || !user.restaurantId) {
      return next(
        new AppError(
          "Authentication required or restaurantId missing from user token",
          401
        )
      );
    }

    const {
      menuId,
      categories,
      questionFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes,
      difficulty,
      additionalContext,
      itemIds,
    } = req.body;

    // Basic validation (more can be added with express-validator)
    if (
      !menuId ||
      !categories ||
      categories.length === 0 ||
      !questionFocusAreas ||
      questionFocusAreas.length === 0 ||
      !targetQuestionCountPerItemFocus ||
      !questionTypes ||
      questionTypes.length === 0 ||
      !difficulty
    ) {
      return next(
        new AppError("Missing required fields for AI question generation", 400)
      );
    }
    if (
      targetQuestionCountPerItemFocus <= 0 ||
      targetQuestionCountPerItemFocus > 10
    ) {
      return next(
        new AppError(
          "Target question count per item/focus must be between 1 and 10",
          400
        )
      );
    }

    const serviceParams = {
      menuId,
      categories,
      questionFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes,
      difficulty,
      additionalContext,
      itemIds,
      restaurantId: user.restaurantId.toString(), // Pass restaurantId from authenticated user
    };

    // Call the service to generate raw questions (these are not saved yet, or saved as pending)
    const rawGeneratedQuestions =
      await AiQuestionService.generateRawQuestionsFromMenuContent(
        serviceParams
      );

    // Save these questions with 'pending_review' status
    const pendingQuestions =
      await AiQuestionService.saveGeneratedQuestionsAsPendingReview(
        rawGeneratedQuestions,
        user.restaurantId.toString()
      );

    res.status(201).json({
      status: "success",
      message: "AI questions generated and are pending review.",
      data: pendingQuestions,
    });
  } catch (error) {
    console.error("AI Question Generation Error:", error);
    // Pass to global error handler, or AppError if it's already one
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to generate AI questions", 500));
  }
};
