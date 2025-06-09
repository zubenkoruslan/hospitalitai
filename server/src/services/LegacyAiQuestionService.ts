import QuestionModel, {
  IQuestion,
  QuestionType,
} from "../models/QuestionModel";
import { Types } from "mongoose";
import { AppError } from "../utils/errorHandler";
import {
  QuestionTaggingService,
  TaggingContext,
} from "./questionTaggingService";
import { SimpleAiQuestionService } from "./SimpleAiQuestionService";
import SopDocumentModel from "../models/SopDocumentModel";

/**
 * Legacy AI Question Service
 *
 * Contains only the essential methods still needed by other parts of the system.
 * New question generation should use SimpleAiQuestionService instead.
 */

export interface RawAiGeneratedQuestion {
  questionText: string;
  questionType: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  category: string;
  explanation?: string;
  focus?: string;
}

export interface GenerateQuestionsFromSopParams {
  sopDocumentId: string;
  selectedSopCategoryNames: string[];
  targetQuestionCount: number;
  questionTypes: string[];
  restaurantId: string;
}

class LegacyAiQuestionService {
  /**
   * Save generated questions as pending review
   * This method is still used by various controllers and services
   */
  public static async saveGeneratedQuestionsAsPendingReview(
    rawQuestions: RawAiGeneratedQuestion[],
    restaurantIdString: string,
    questionBankId: string,
    taggingContext?: TaggingContext
  ): Promise<IQuestion[]> {
    console.log("[LegacyAI] Saving questions as pending review...");

    if (!rawQuestions || rawQuestions.length === 0) {
      console.log("[LegacyAI] No questions to save");
      return [];
    }

    if (!restaurantIdString || !questionBankId) {
      throw new AppError(
        "Restaurant ID and Question Bank ID are required",
        400
      );
    }

    const restaurantId = new Types.ObjectId(restaurantIdString);
    const bankId = new Types.ObjectId(questionBankId);
    const savedQuestions: IQuestion[] = [];

    for (const rawQ of rawQuestions) {
      try {
        // Basic validation
        if (
          !rawQ.questionText ||
          !rawQ.questionType ||
          !rawQ.options ||
          !rawQ.category
        ) {
          console.warn(
            "[LegacyAI] Skipping question with missing fields:",
            rawQ
          );
          continue;
        }

        // Validate question type
        const validTypes = [
          "multiple-choice-single",
          "multiple-choice-multiple",
          "true-false",
        ];
        if (!validTypes.includes(rawQ.questionType)) {
          console.warn(
            `[LegacyAI] Invalid question type: ${rawQ.questionType}, defaulting to multiple-choice-single`
          );
          rawQ.questionType = "multiple-choice-single";
        }

        // Validate options
        if (!Array.isArray(rawQ.options) || rawQ.options.length === 0) {
          console.warn(
            "[LegacyAI] Skipping question with invalid options:",
            rawQ
          );
          continue;
        }

        const correctAnswers = rawQ.options.filter((opt) => opt.isCorrect);
        if (correctAnswers.length === 0) {
          console.warn(
            "[LegacyAI] Skipping question with no correct answers:",
            rawQ
          );
          continue;
        }

        // Apply knowledge tagging if available
        let knowledgeCategory: string | undefined = undefined;
        let knowledgeSubcategories: string[] | undefined = undefined;

        if (taggingContext) {
          try {
            const taggingResult =
              QuestionTaggingService.determineKnowledgeCategory(
                rawQ.questionText,
                taggingContext
              );
            knowledgeCategory = taggingResult.knowledgeCategory;
            // Note: subcategories not available in this method
          } catch (taggingError) {
            console.warn("[LegacyAI] Question tagging failed:", taggingError);
          }
        }

        // Create question document
        const questionData = {
          questionText: rawQ.questionText,
          questionType: rawQ.questionType as QuestionType,
          options: rawQ.options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
          categories: [rawQ.category],
          restaurantId,
          questionBankId: bankId,
          createdBy: "ai" as const,
          status: "pending_review" as const,
          explanation: rawQ.explanation?.substring(0, 500),
          knowledgeCategory,
          knowledgeSubcategories,
          knowledgeCategoryAssignedBy: knowledgeCategory ? "ai" : undefined,
          knowledgeCategoryAssignedAt: knowledgeCategory
            ? new Date()
            : undefined,
        };

        const newQuestion = new QuestionModel(questionData);
        const savedQuestion = await newQuestion.save();
        savedQuestions.push(savedQuestion);

        console.log(
          `[LegacyAI] Saved question: "${rawQ.questionText.substring(
            0,
            50
          )}..."`
        );
      } catch (error: any) {
        console.error("[LegacyAI] Error saving question:", error.message);
        console.error(
          "[LegacyAI] Question data:",
          JSON.stringify(rawQ, null, 2)
        );
      }
    }

    console.log(
      `[LegacyAI] Successfully saved ${savedQuestions.length} out of ${rawQuestions.length} questions`
    );
    return savedQuestions;
  }

  /**
   * Generate questions from SOP category text
   * Uses the new SimpleAiQuestionService for generation
   */
  public static async generateQuestionsFromSopCategoryText(
    sopCategoryName: string,
    sopCategoryText: string,
    targetQuestionCount: number,
    questionTypes: string[]
  ): Promise<RawAiGeneratedQuestion[]> {
    console.log(
      `[LegacyAI] Generating ${targetQuestionCount} questions for SOP category: ${sopCategoryName}`
    );

    try {
      // Use the new simplified service for SOP question generation
      const questions = await SimpleAiQuestionService.generateSopQuestions({
        sopContent: sopCategoryText,
        sopCategoryName: sopCategoryName,
        questionCount: targetQuestionCount,
      });

      // Convert to legacy format
      const legacyQuestions: RawAiGeneratedQuestion[] = questions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        category: sopCategoryName,
        explanation: q.explanation,
        focus: "procedures",
      }));

      console.log(
        `[LegacyAI] Generated ${legacyQuestions.length} SOP questions`
      );
      return legacyQuestions;
    } catch (error: any) {
      console.error(
        `[LegacyAI] Failed to generate SOP questions for ${sopCategoryName}:`,
        error.message
      );
      throw new AppError(
        `Failed to generate SOP questions: ${error.message}`,
        500
      );
    }
  }

  /**
   * Generate questions from multiple SOP categories
   * Wrapper method that calls generateQuestionsFromSopCategoryText for each category
   */
  public static async generateQuestionsFromSopCategoriesService(
    params: GenerateQuestionsFromSopParams
  ): Promise<RawAiGeneratedQuestion[]> {
    const {
      sopDocumentId,
      selectedSopCategoryNames,
      targetQuestionCount,
      questionTypes,
      restaurantId,
    } = params;

    console.log(
      `[LegacyAI] Generating questions from ${selectedSopCategoryNames.length} SOP categories`
    );

    try {
      const sopDocument = await SopDocumentModel.findById(sopDocumentId);
      if (!sopDocument) {
        throw new AppError("SOP Document not found", 404);
      }

      const allGeneratedQuestions: RawAiGeneratedQuestion[] = [];
      const categoriesToProcess = sopDocument.categories.filter((cat) =>
        selectedSopCategoryNames.includes(cat.name)
      );

      if (categoriesToProcess.length === 0) {
        console.warn(
          `[LegacyAI] No matching SOP categories found for names: ${selectedSopCategoryNames.join(
            ", "
          )}`
        );
        return [];
      }

      // Calculate questions per category
      const questionsPerCategory = Math.ceil(
        targetQuestionCount / categoriesToProcess.length
      );

      for (const category of categoriesToProcess) {
        if (!category.content || category.content.trim() === "") {
          console.warn(
            `[LegacyAI] SOP Category '${category.name}' has no content. Skipping.`
          );
          continue;
        }

        try {
          const questionsFromCategory =
            await this.generateQuestionsFromSopCategoryText(
              category.name,
              category.content,
              questionsPerCategory,
              questionTypes
            );
          allGeneratedQuestions.push(...questionsFromCategory);
        } catch (error: any) {
          console.error(
            `[LegacyAI] Error generating questions for SOP category '${category.name}':`,
            error
          );
          // Add a placeholder error question for this category
          allGeneratedQuestions.push({
            questionText: `Failed to generate questions for SOP category: ${category.name}`,
            questionType: "true-false",
            options: [
              { text: "Error occurred", isCorrect: true },
              { text: "No error", isCorrect: false },
            ],
            category: category.name,
            explanation: `Generation failed. Error: ${error.message}`,
            focus: "Generation Error",
          });
        }
      }

      console.log(
        `[LegacyAI] Generated ${allGeneratedQuestions.length} total questions from SOP categories`
      );
      return allGeneratedQuestions;
    } catch (error: any) {
      console.error(
        `[LegacyAI] Failed to generate SOP questions:`,
        error.message
      );
      throw new AppError(
        `Failed to generate SOP questions: ${error.message}`,
        500
      );
    }
  }
}

export default LegacyAiQuestionService;
