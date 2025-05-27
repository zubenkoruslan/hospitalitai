import SopDocumentModel, {
  ISopDocument,
  ISopCategory,
  QuestionGenerationStatus,
} from "../models/SopDocumentModel";
import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import QuestionModel, {
  IQuestion,
  QuestionType,
  IOption,
} from "../models/QuestionModel";
import AiQuestionService, { RawAiGeneratedQuestion } from "./AiQuestionService"; // Ensure this path is correct
import { Types } from "mongoose";
import { AppError } from "../utils/errorHandler"; // Ensure this path is correct

interface GenerateSopQuestionsParams {
  // Renamed from GenerateSopQuizParams for clarity
  sopDocumentId: string;
  restaurantId: string;
  selectedCategoryIds: string[];
  forceUpdateBank?: boolean; // Renamed from forceRegeneration
  targetQuestionsPerSelectedCategory?: number;
}

// Helper to find a category/subcategory by its _id
function findCategoryByIdRecursively(
  categories: ISopCategory[],
  categoryId: string
): ISopCategory | null {
  for (const category of categories) {
    if (category._id?.toString() === categoryId) {
      return category;
    }
    if (category.subCategories && category.subCategories.length > 0) {
      const foundInSub = findCategoryByIdRecursively(
        category.subCategories,
        categoryId
      );
      if (foundInSub) {
        return foundInSub;
      }
    }
  }
  return null;
}

export class SopQuestionGenerationService {
  public static async generateQuestionsForSopBank(
    params: GenerateSopQuestionsParams
  ): Promise<IQuestionBank> {
    const {
      sopDocumentId,
      restaurantId,
      selectedCategoryIds,
      forceUpdateBank = false,
      targetQuestionsPerSelectedCategory = 3, // Default value
    } = params;

    const sopDoc = await SopDocumentModel.findOne({
      _id: new Types.ObjectId(sopDocumentId),
      restaurantId: new Types.ObjectId(restaurantId),
    }); // Not using .lean() as we will save sopDoc

    if (!sopDoc) {
      throw new AppError("SOP Document not found or not authorized.", 404);
    }

    if (!selectedCategoryIds || selectedCategoryIds.length === 0) {
      throw new AppError(
        "No categories or sub-categories selected for question generation.",
        400
      );
    }

    const allSelectedCategoryObjects: {
      id: Types.ObjectId;
      name: string;
      content: string;
    }[] = [];
    for (const catId of selectedCategoryIds) {
      const categoryObject = findCategoryByIdRecursively(
        sopDoc.categories,
        catId
      );
      if (categoryObject && categoryObject.content && categoryObject._id) {
        allSelectedCategoryObjects.push({
          id: categoryObject._id,
          name: categoryObject.name,
          content: categoryObject.content,
        });
      } else {
        console.warn(
          `Category/Sub-category with ID ${catId} not found or has no content in SOP ${sopDocumentId}. Skipping.`
        );
      }
    }

    if (allSelectedCategoryObjects.length === 0) {
      sopDoc.questionGenerationStatus = QuestionGenerationStatus.FAILED;
      sopDoc.errorMessage =
        "None of the selected categories had content for question generation.";
      await sopDoc.save();
      throw new AppError(
        "None of the selected categories/sub-categories could be used for question generation.",
        400
      );
    }

    const allRawQuestionsFromAi: (RawAiGeneratedQuestion & {
      originalSopCategoryId?: string;
    })[] = [];
    for (const selectedCat of allSelectedCategoryObjects) {
      try {
        const categorySpecificQuestions =
          await AiQuestionService.generateQuestionsFromSopCategoryText(
            selectedCat.name,
            selectedCat.content,
            targetQuestionsPerSelectedCategory,
            ["multiple-choice-single", "true-false"]
          );
        const questionsWithContext = categorySpecificQuestions.map((q) => ({
          ...q,
          originalSopCategoryId: selectedCat.id.toString(),
          category: selectedCat.name, // Ensure AI uses this or we override it here
        }));
        allRawQuestionsFromAi.push(...questionsWithContext);
      } catch (aiError: any) {
        console.error(
          `AI question generation failed for SOP category ${selectedCat.name} (ID: ${selectedCat.id}):`,
          aiError.message
        );
        // Continue to next category, but log the error
      }
    }

    if (allRawQuestionsFromAi.length === 0) {
      sopDoc.questionGenerationStatus = QuestionGenerationStatus.FAILED;
      sopDoc.errorMessage =
        "AI failed to generate any questions for the selected SOP content.";
      await sopDoc.save();
      throw new AppError(
        "AI failed to generate any questions for the selected SOP content.",
        500
      );
    }

    let questionBank: IQuestionBank;
    const existingBankId = sopDoc.questionBankId;

    if (existingBankId && forceUpdateBank) {
      const oldBank = await QuestionBankModel.findById(existingBankId);
      if (
        oldBank &&
        oldBank.sourceType === "SOP" &&
        oldBank.sourceSopDocumentId?.toString() === sopDocumentId
      ) {
        await QuestionModel.deleteMany({ questionBankId: existingBankId });
        oldBank.questions = [];
        oldBank.questionCount = 0;
        oldBank.categories = []; // Will be repopulated
        questionBank = oldBank;
        console.log(
          `Reusing and clearing existing Question Bank ID: ${existingBankId} for SOP: ${sopDocumentId}`
        );
      } else {
        if (oldBank) {
          console.warn(
            `Existing bank ${existingBankId} is not for current SOP ${sopDocumentId} or not an SOP bank. Creating new.`
          );
        }
        questionBank = new QuestionBankModel();
      }
    } else {
      if (existingBankId && !forceUpdateBank) {
        console.log(
          `Not forcing update of existing bank ${existingBankId}. A new Question Bank will be created and SOP will be linked to new bank.`
        );
      }
      questionBank = new QuestionBankModel();
    }

    const selectedCategoryNamesDisplay = allSelectedCategoryObjects
      .map((c) => c.name)
      .join(", ");
    questionBank.name = `Question Bank for SOP: ${
      sopDoc.title
    } (Sections: ${selectedCategoryNamesDisplay.substring(0, 50)}${
      selectedCategoryNamesDisplay.length > 50 ? "..." : ""
    })`;
    questionBank.restaurantId = sopDoc.restaurantId;
    questionBank.sourceType = "SOP";
    questionBank.sourceSopDocumentId = sopDoc._id;
    questionBank.sourceSopDocumentTitle = sopDoc.title;
    questionBank.description = `Generated from SOP: ${sopDoc.title}, focusing on sections: ${selectedCategoryNamesDisplay}`;
    // Ensure questions array is clear if reusing bank
    if (questionBank.isNew || forceUpdateBank) questionBank.questions = [];

    // Save bank here if it's new, to get its _id for linking questions
    // If reusing, it's already saved / will be saved later with updates.
    if (questionBank.isNew) await questionBank.save();

    const savedQuestionObjects: IQuestion[] = [];
    const questionBankSopCategoriesCovered = new Set<string>();

    for (const rawQ of allRawQuestionsFromAi) {
      if (
        !rawQ.questionText ||
        !rawQ.questionType ||
        !rawQ.options ||
        !rawQ.category
      ) {
        console.warn(
          "Skipping raw question from AI due to missing essential fields:",
          rawQ
        );
        continue;
      }
      questionBankSopCategoriesCovered.add(rawQ.category); // Category name from SOP section

      const questionData: Partial<IQuestion> = {
        questionText: rawQ.questionText,
        questionType: rawQ.questionType as QuestionType,
        options: rawQ.options.map(
          (opt: { text: string; isCorrect: boolean }) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })
        ) as Types.Array<IOption>,
        categories: [rawQ.category],
        restaurantId: sopDoc.restaurantId,
        questionBankId: questionBank._id, // Link to the bank being built/updated
        createdBy: "ai",
        status: "pending_review",
        explanation: rawQ.explanation?.substring(0, 500), // Ensure explanation fits schema
        sopDocumentId: sopDoc._id,
        sopCategoryId: rawQ.originalSopCategoryId
          ? new Types.ObjectId(rawQ.originalSopCategoryId)
          : undefined,
      };

      const newQuestion = new QuestionModel(questionData);
      try {
        const savedQ = await newQuestion.save();
        savedQuestionObjects.push(savedQ);
      } catch (dbError: any) {
        console.error(
          "Error saving AI generated question to DB:",
          dbError.message,
          "Data:",
          JSON.stringify(questionData)
        );
      }
    }

    if (savedQuestionObjects.length === 0) {
      if (questionBank.isNew)
        await QuestionBankModel.findByIdAndDelete(questionBank._id); // Clean up newly created empty bank
      sopDoc.questionGenerationStatus = QuestionGenerationStatus.FAILED;
      sopDoc.errorMessage =
        "No questions were successfully saved to the database from AI output.";
      await sopDoc.save();
      throw new AppError(
        "No questions were successfully saved from AI output.",
        500
      );
    }

    questionBank.questions.push(...savedQuestionObjects.map((q) => q._id)); // Add new questions
    questionBank.questionCount = questionBank.questions.length;
    questionBank.categories = Array.from(questionBankSopCategoriesCovered);
    await questionBank.save(); // Final save for the bank

    sopDoc.questionBankId = questionBank._id;
    sopDoc.questionGenerationStatus = QuestionGenerationStatus.COMPLETED;
    sopDoc.errorMessage = undefined;
    await sopDoc.save();

    return questionBank;
  }
}
