import { Request, Response, NextFunction } from "express";
import LegacyAiQuestionService from "../services/LegacyAiQuestionService";
import QuestionBankModel from "../models/QuestionBankModel";
import { AppError } from "../utils/errorHandler"; // Corrected path

interface GenerateQuestionsRequestBody {
  bankId: string;
  menuId: string;
  itemIds?: string[];
  categoriesToFocus?: string[];
  questionFocusAreas: string[];
  targetQuestionCountPerItemFocus: number;
  questionTypes: string[];
  additionalContext?: string;
  // restaurantId will be taken from authenticated user or request context, not directly from body for security
}

// DEPRECATED: This controller is replaced by the simplified AI service integrated into questionService
// The main question generation now uses SimpleAiQuestionService through generateAiQuestionsService
export const generateAiQuestionsHandler = async (
  req: Request<{}, {}, GenerateQuestionsRequestBody>,
  res: Response,
  next: NextFunction
) => {
  // ---- START DEBUG LOGS ----
  console.log(
    "BACKEND: Received full req.body:",
    JSON.stringify(req.body, null, 2)
  );
  if (req.body && typeof req.body === "object") {
    console.log("BACKEND: req.body.menuId:", req.body.menuId);
    console.log(
      "BACKEND: req.body.categoriesToFocus:",
      req.body.categoriesToFocus
    );
    console.log(
      "BACKEND: Type of req.body.categoriesToFocus:",
      typeof req.body.categoriesToFocus
    );
    if (Array.isArray(req.body.categoriesToFocus)) {
      console.log(
        "BACKEND: req.body.categoriesToFocus.length:",
        req.body.categoriesToFocus.length
      );
    }
    console.log("BACKEND: req.body.itemIds:", req.body.itemIds);
    console.log(
      "BACKEND: req.body.questionFocusAreas:",
      req.body.questionFocusAreas
    );
  } else {
    console.log(
      "BACKEND: req.body is not an object or is undefined:",
      req.body
    );
  }
  // ---- END DEBUG LOGS ----

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
      bankId,
      menuId,
      categoriesToFocus,
      questionFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes,
      additionalContext,
      itemIds,
    } = req.body;

    // Basic validation (more can be added with express-validator)
    if (
      !bankId ||
      !menuId ||
      ((!categoriesToFocus || categoriesToFocus.length === 0) &&
        (!itemIds || itemIds.length === 0)) ||
      !questionFocusAreas ||
      questionFocusAreas.length === 0 ||
      !targetQuestionCountPerItemFocus ||
      !questionTypes ||
      questionTypes.length === 0
    ) {
      return next(
        new AppError(
          "Missing required fields for AI question generation. Ensure bankId, menuId, categories/itemIds, focus areas, question count, and types are provided.",
          400
        )
      );
    }
    if (
      targetQuestionCountPerItemFocus <= 0 ||
      targetQuestionCountPerItemFocus > 20
    ) {
      return next(
        new AppError(
          "Target question count per item/focus must be between 1 and 20",
          400
        )
      );
    }

    const serviceParams = {
      menuId,
      categoriesToFocus,
      questionFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes,
      additionalContext,
      itemIds,
      restaurantId: user.restaurantId.toString(),
    };

    // REDIRECT: Guide users to the new simplified system
    res.status(200).json({
      status: "redirect",
      message:
        "🚀 This endpoint has been upgraded! Please use the new simplified AI system through question banks.",
      migration: {
        oldEndpoint: "/api/ai/generate-questions",
        newFlow: [
          {
            step: 1,
            endpoint: "POST /api/question-banks/from-menu",
            description: "Create a question bank from your menu",
            requiredFields: ["name", "description", "menuId", "categories"],
          },
          {
            step: 2,
            endpoint: "POST /api/question-banks/{bankId}/generate-ai-questions",
            description: "Generate AI questions for the question bank",
            requiredFields: ["questionCount", "focusAreas"],
          },
        ],
        benefits: [
          "🎯 Better organized questions in banks",
          "💬 Human-like conversational questions",
          "⚡ 84% faster generation",
          "🔧 Easier to manage and review",
        ],
      },
      compatibility: {
        bankId,
        menuId,
        suggestedBankName: `AI Questions for Menu (${new Date().toLocaleDateString()})`,
        mappedParameters: {
          questionCount: targetQuestionCountPerItemFocus,
          focusAreas: questionFocusAreas,
          categories: categoriesToFocus,
        },
      },
      documentation:
        "See /api/question-banks endpoints for the new simplified AI system",
    });
  } catch (error) {
    console.error("AI Question Generation Error:", error);
    // Pass to global error handler, or AppError if it's already one
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to generate AI questions", 500));
  }
};
