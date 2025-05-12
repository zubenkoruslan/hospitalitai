import mongoose from "mongoose";
import axios from "axios";
import QuestionModel, {
  IQuestion,
  IOption,
  QuestionType,
} from "../models/QuestionModel";
import QuestionBankModel from "../models/QuestionBankModel";
import { AppError } from "../utils/errorHandler";

// Interface for the data needed to create a new question
export interface NewQuestionData {
  questionText: string;
  questionType: QuestionType;
  options: Array<{
    text: string;
    isCorrect: boolean;
    _id?: mongoose.Types.ObjectId;
  }>;
  categories: string[];
  restaurantId: mongoose.Types.ObjectId;
  createdBy: "ai" | "manual";
  difficulty?: "easy" | "medium" | "hard";
}

// Interface for the data allowed when updating an existing question
export interface UpdateQuestionData {
  questionText?: string;
  options?: Array<{
    text: string;
    isCorrect: boolean;
    _id?: mongoose.Types.ObjectId;
  }>;
  categories?: string[];
  difficulty?: "easy" | "medium" | "hard";
}

export const createQuestionService = async (
  data: NewQuestionData
): Promise<IQuestion> => {
  try {
    if (data.questionType === "true-false" && data.options.length !== 2) {
      throw new AppError(
        "True/False questions must have exactly 2 options.",
        400
      );
    }
    if (
      (data.questionType === "multiple-choice-single" ||
        data.questionType === "multiple-choice-multiple") &&
      (data.options.length < 2 || data.options.length > 6)
    ) {
      throw new AppError(
        "Multiple choice questions must have between 2 and 6 options.",
        400
      );
    }
    const correctOptionsCount = data.options.filter(
      (opt) => opt.isCorrect
    ).length;
    if (
      data.questionType === "multiple-choice-single" ||
      data.questionType === "true-false"
    ) {
      if (correctOptionsCount !== 1) {
        throw new AppError(
          "Single-answer multiple choice and True/False questions must have exactly one correct option.",
          400
        );
      }
    } else if (data.questionType === "multiple-choice-multiple") {
      if (correctOptionsCount < 1) {
        throw new AppError(
          "Multiple-answer multiple choice questions must have at least one correct option.",
          400
        );
      }
    }
    const newQuestion = new QuestionModel(data);
    await newQuestion.save();
    return newQuestion;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      throw new AppError(`Validation Error: ${messages.join(", ")}`, 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error creating question in service:", error);
    throw new AppError("Failed to create question.", 500);
  }
};

export const getQuestionByIdService = async (
  questionId: string,
  restaurantId: mongoose.Types.ObjectId
): Promise<IQuestion | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }
    const question = await QuestionModel.findOne({
      _id: questionId,
      restaurantId: restaurantId,
    });
    return question;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error fetching question by ID in service:", error);
    throw new AppError("Failed to fetch question by ID.", 500);
  }
};

export const getAllQuestionsService = async (
  restaurantId: mongoose.Types.ObjectId,
  queryParams?: any
): Promise<IQuestion[]> => {
  try {
    const questions = await QuestionModel.find({ restaurantId: restaurantId });
    return questions;
  } catch (error) {
    console.error(
      "Error fetching all questions for restaurant in service:",
      error
    );
    throw new AppError("Failed to fetch questions for this restaurant.", 500);
  }
};

export const updateQuestionService = async (
  questionId: string,
  restaurantId: mongoose.Types.ObjectId,
  data: UpdateQuestionData
): Promise<IQuestion | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }
    const existingQuestion = await QuestionModel.findOne({
      _id: questionId,
      restaurantId,
    });
    if (!existingQuestion) {
      throw new AppError(
        `Question not found with ID: ${questionId} for this restaurant.`,
        404
      );
    }
    const currentQuestionType = existingQuestion.questionType;
    if (data.options) {
      if (currentQuestionType === "true-false" && data.options.length !== 2) {
        throw new AppError(
          "True/False questions must have exactly 2 options.",
          400
        );
      }
      if (
        (currentQuestionType === "multiple-choice-single" ||
          currentQuestionType === "multiple-choice-multiple") &&
        (data.options.length < 2 || data.options.length > 6)
      ) {
        throw new AppError(
          "Multiple choice questions must have between 2 and 6 options.",
          400
        );
      }
      const correctOptionsCount = data.options.filter(
        (opt) => opt.isCorrect
      ).length;
      if (
        currentQuestionType === "multiple-choice-single" ||
        currentQuestionType === "true-false"
      ) {
        if (correctOptionsCount !== 1) {
          throw new AppError(
            "Single-answer multiple choice and True/False questions must have exactly one correct option.",
            400
          );
        }
      } else if (currentQuestionType === "multiple-choice-multiple") {
        if (correctOptionsCount < 1) {
          throw new AppError(
            "Multiple-answer multiple choice questions must have at least one correct option.",
            400
          );
        }
      }
    }
    const updatedQuestion = await QuestionModel.findOneAndUpdate(
      { _id: questionId, restaurantId: restaurantId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!updatedQuestion) {
      throw new AppError(
        `Question not found with ID: ${questionId} for this restaurant, or no update was performed.`,
        404
      );
    }
    return updatedQuestion;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      throw new AppError(`Validation Error: ${messages.join(", ")}`, 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating question in service:", error);
    throw new AppError(
      "Failed to update question due to an unexpected error.",
      500
    );
  }
};

export const deleteQuestionService = async (
  questionId: string,
  restaurantId: mongoose.Types.ObjectId
): Promise<boolean> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new AppError(`Invalid question ID format: ${questionId}`, 400);
    }
    const objectQuestionId = new mongoose.Types.ObjectId(questionId);
    const deletedQuestion = await QuestionModel.findOneAndDelete(
      { _id: objectQuestionId, restaurantId: restaurantId },
      { session }
    );
    if (!deletedQuestion) {
      await session.abortTransaction();
      session.endSession();
      return false;
    }
    await QuestionBankModel.updateMany(
      { restaurantId: restaurantId },
      { $pull: { questions: objectQuestionId } },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error deleting question in service:", error);
    throw new AppError("Failed to delete question.", 500);
  }
};

// Interface for the data expected by the AI generation service
export interface AiGenerationParams {
  restaurantId: mongoose.Types.ObjectId;
  categories: string[];
  targetQuestionCount: number;
  menuContext?: string;
  geminiModelName?: string;
}

// Placeholder for the structure of a single question object expected from the AI model
interface AiGeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
  options: Array<{ text: string; isCorrect: boolean }>;
  category: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export const generateAiQuestionsService = async (
  params: AiGenerationParams
): Promise<IQuestion[]> => {
  const { restaurantId, categories, targetQuestionCount, menuContext } = params;

  if (categories.length === 0 || targetQuestionCount <= 0) {
    throw new AppError(
      "Categories and a positive target question count are required for AI generation.",
      400
    );
  }

  const aiServiceUrl = process.env.AI_QUESTION_GENERATION_URL;
  const aiApiKey = process.env.AI_API_KEY;

  if (!aiServiceUrl) {
    throw new AppError(
      "AI service URL (AI_QUESTION_GENERATION_URL) is not configured in environment variables.",
      500
    );
  }

  console.log(
    `AI Service: Attempting to generate ${targetQuestionCount} questions for categories: ${categories.join(
      ", "
    )} using ${aiServiceUrl}`
  );

  let aiResponse: AiGeneratedQuestion[];

  const mockAiResponse: AiGeneratedQuestion[] = [];
  for (let i = 0; i < targetQuestionCount; i++) {
    const category = categories[i % categories.length];
    mockAiResponse.push({
      questionText: `Mock AI Question ${
        i + 1
      } about ${category} (actual AI integration pending)?`,
      questionType: "multiple-choice-single",
      options: [
        { text: "Correct Answer", isCorrect: true },
        { text: "Wrong Answer A", isCorrect: false },
        { text: "Wrong Answer B", isCorrect: false },
      ],
      category: category,
      difficulty: "medium",
    });
  }
  aiResponse = mockAiResponse;

  if (!aiResponse || aiResponse.length === 0) {
    console.warn(
      "AI model returned no questions or an empty array for the given parameters."
    );
    throw new AppError(
      "AI model did not return any questions for the provided input.",
      404
    );
  }

  const questionsToSave: NewQuestionData[] = aiResponse.map(
    (q: AiGeneratedQuestion) => ({
      ...q,
      restaurantId: restaurantId,
      createdBy: "ai",
      categories: [q.category || "Uncategorized"],
    })
  );

  try {
    const createdQuestions = await QuestionModel.insertMany(questionsToSave, {
      ordered: false,
    });
    return createdQuestions;
  } catch (error: any) {
    if (error.name === "MongoBulkWriteError" && error.writeErrors) {
      console.error(
        "Error inserting AI generated questions (some may have failed validation):",
        error.writeErrors
      );
      const successfulCount = error.result?.nInserted || 0;
      throw new AppError(
        `AI generated ${successfulCount} questions successfully, but some failed validation during save.`,
        500
      );
    } else if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      throw new AppError(
        `Validation Error saving AI questions: ${messages.join(", ")}`,
        400
      );
    }
    console.error("Error saving AI generated questions to database:", error);
    throw new AppError("Failed to save AI generated questions.", 500);
  }
};
