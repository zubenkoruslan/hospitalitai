import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import QuestionModel, {
  IQuestion,
  QuestionType,
  IOption,
} from "../models/QuestionModel";
import MenuItemModel from "../models/MenuItemModel"; // Assuming this exists or will be created
import MenuModel from "../models/MenuModel"; // Assuming this exists or will be created
// import { callExternalAiApi } from './externalAiService'; // Placeholder for actual AI API call
import mongoose from "mongoose";
import { Types } from "mongoose";

// Interface for the parameters to generate questions, aligned with the plan
interface GenerateQuestionsParams {
  menuId: string;
  itemIds?: string[];
  categories: string[];
  questionFocusAreas: string[];
  targetQuestionCount: number;
  questionTypes: string[]; // e.g., ['multiple-choice-single', 'true-false']
  difficulty: string; // e.g., 'medium'
  additionalContext?: string;
  restaurantId: string; // Should be Types.ObjectId but passed as string from controller
}

// Interface for the structure of raw questions expected from the AI
interface RawAiGeneratedQuestion {
  questionText: string;
  questionType: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  category: string;
  difficulty: string;
  explanation?: string;
}

class AiQuestionService {
  /**
   * Generates raw question structures based on menu content using an LLM.
   * Does not save them to the database directly.
   */
  public static async generateRawQuestionsFromMenuContent(
    params: GenerateQuestionsParams
  ): Promise<RawAiGeneratedQuestion[]> {
    const {
      menuId,
      categories,
      questionFocusAreas,
      targetQuestionCount,
      questionTypes,
      difficulty,
      additionalContext,
      restaurantId, // This should ideally be Types.ObjectId from a validated source
    } = params;

    console.log("Attempting to generate AI questions with params:", params);

    // 1. Fetch MenuDocument
    const menu = await MenuModel.findById(menuId).lean();
    if (!menu) {
      // It's good practice to throw a more specific error, e.g., a custom AppError
      throw new Error(`Menu with ID ${menuId} not found.`);
    }

    let allRawQuestions: RawAiGeneratedQuestion[] = [];
    const questionsGeneratedPerFocus: Record<string, number> = {};
    questionFocusAreas.forEach(
      (focus) => (questionsGeneratedPerFocus[focus] = 0)
    );

    // Calculate total number of generation units (category * focusArea combinations)
    const totalUnits = categories.length * questionFocusAreas.length;
    if (totalUnits === 0) {
      console.warn(
        "No categories or focus areas selected, cannot generate questions."
      );
      return [];
    }

    // Distribute questions as evenly as possible
    // This logic can be sophisticated. For now, simple even distribution then fill remainder.
    const baseQuestionsPerUnit = Math.floor(targetQuestionCount / totalUnits);
    let remainderQuestions = targetQuestionCount % totalUnits;

    for (const categoryName of categories) {
      // Fetch MenuItemDocument(s) for the current category and menu
      // TODO: Replace with actual MenuItemModel.find() call once model is available and integrated
      // const menuItemsInCategory = await MenuItemModel.find({
      //   menuId: menu._id, // Assuming MenuModel instance has _id of type Types.ObjectId
      //   restaurantId: restaurantId, // Ensure restaurantId is used for scoping
      //   category: categoryName,
      // }).lean();

      // MOCK Menu Items for the current category
      const mockMenuItemsInCategory = [
        {
          _id: new mongoose.Types.ObjectId().toHexString(),
          name: `Mock Item 1 in ${categoryName}`,
          description: `Desc for item 1 of ${categoryName}`,
          ingredients: [`ing1_${categoryName}`, `ing2_${categoryName}`],
          allergens: [`allergen_${categoryName}`],
          category: categoryName,
          price: "10.99",
          menuId: menuId,
        },
        {
          _id: new mongoose.Types.ObjectId().toHexString(),
          name: `Mock Item 2 in ${categoryName}`,
          description: `Desc for item 2 of ${categoryName}`,
          ingredients: [`ingA_${categoryName}`, `ingB_${categoryName}`],
          allergens: [],
          category: categoryName,
          price: "12.50",
          menuId: menuId,
        },
      ];
      // END MOCK

      if (!mockMenuItemsInCategory || mockMenuItemsInCategory.length === 0) {
        console.warn(
          `No menu items found for category "${categoryName}" in menu "${menu.name}". Skipping this category.`
        );
        continue;
      }

      for (const item of mockMenuItemsInCategory) {
        if (allRawQuestions.length >= targetQuestionCount) break; // Stop if we've hit the global target

        for (const focusArea of questionFocusAreas) {
          if (allRawQuestions.length >= targetQuestionCount) break;

          let numQuestionsForItemFocus = baseQuestionsPerUnit;
          if (remainderQuestions > 0) {
            numQuestionsForItemFocus++;
            remainderQuestions--;
          }

          if (numQuestionsForItemFocus === 0) continue; // No questions allocated for this specific unit

          // 3. Construct detailed prompt for LLM
          const promptPayload = {
            menuName: menu.name,
            category: categoryName,
            item: {
              name: item.name,
              description: item.description,
              ingredients: item.ingredients,
              allergens: item.allergens,
              price: item.price, // Assuming price is relevant for some question types
            },
            questionFocus: focusArea,
            desiredQuestionCount: numQuestionsForItemFocus, // Generate for this specific item-focus unit
            questionTypes: questionTypes,
            difficulty: difficulty,
            additionalInstructions: additionalContext,
            outputFormatInstructions: `Respond with a JSON array of question objects. Each object must conform to this structure: { "questionText": "string", "questionType": "enum('multiple-choice-single', 'true-false')", "options": [{ "text": "string", "isCorrect": boolean }], "category": "${categoryName}", "difficulty": "${difficulty}", "explanation": "Optional brief explanation for the answer." }. Ensure options are relevant and provide plausible distractors for multiple-choice. Base questions strictly on the provided menu context and focus area: ${focusArea}. Do not invent information. For the '${focusArea}' focus, ensure questions directly test knowledge of that aspect concerning the item '${item.name}'.`,
          };

          console.log(
            `Constructed prompt for LLM (item: ${item.name}, focus: ${focusArea}, category: ${categoryName}):`,
            JSON.stringify(promptPayload, null, 2)
          );

          // 4. Call external LLM API (Placeholder)
          // const aiResponseJsonString = await callExternalAiApi(promptPayload);
          // MOCK AI RESPONSE for this specific item-focus prompt:
          const mockAiResponseJsonString = JSON.stringify([
            {
              questionText: `Mock Q: ${item.name} - ${focusArea} focus?`,
              questionType: questionTypes[0] || "multiple-choice-single",
              options: [
                { text: "Mock Opt A", isCorrect: true },
                { text: "Mock Opt B", isCorrect: false },
              ],
              category: categoryName, // The category of the item
              difficulty: difficulty,
              explanation: `Mock explanation for ${item.name} & ${focusArea}.`,
            },
          ]);

          try {
            const generatedQuestionsForPrompt: RawAiGeneratedQuestion[] =
              JSON.parse(mockAiResponseJsonString);
            allRawQuestions.push(
              ...generatedQuestionsForPrompt
                .slice(0, numQuestionsForItemFocus)
                .filter(
                  (q) => q.questionText && q.options && q.options.length > 0
                )
            );
          } catch (e) {
            console.error(
              "Error parsing AI response for item-focus:",
              item.name,
              focusArea,
              e
            );
          }
        }
        if (allRawQuestions.length >= targetQuestionCount) break;
      }
      if (allRawQuestions.length >= targetQuestionCount) break;
    }
    // Ensure we strictly adhere to targetQuestionCount as a maximum
    return allRawQuestions.slice(0, targetQuestionCount);
  }

  /**
   * Saves raw AI-generated questions to the database with a 'pending_review' status.
   */
  public static async saveGeneratedQuestionsAsPendingReview(
    rawQuestions: RawAiGeneratedQuestion[],
    restaurantIdString: string
    // targetBankId?: string // Optional: if questions are for a specific bank immediately
  ): Promise<IQuestion[]> {
    const savedQuestions: IQuestion[] = [];
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantIdString);

    for (const rawQ of rawQuestions) {
      // Validate rawQ structure here if needed, beyond basic TS typing
      if (
        !rawQ.questionText ||
        !rawQ.questionType ||
        !rawQ.options ||
        !rawQ.category ||
        !rawQ.difficulty
      ) {
        console.warn(
          "Skipping raw question due to missing essential fields:",
          rawQ
        );
        continue;
      }

      const questionData: Partial<IQuestion> = {
        questionText: rawQ.questionText,
        questionType: rawQ.questionType as QuestionType, // Cast as QuestionType, ensure AI output matches enum
        options: rawQ.options.map((opt) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
        })) as Types.Array<IOption>, // Map to IOption structure
        categories: [rawQ.category], // AI provides a single category string, store as array
        difficulty: rawQ.difficulty as "easy" | "medium" | "hard", // Cast, ensure AI output matches enum
        explanation: rawQ.explanation,
        restaurantId: restaurantObjectId,
        createdBy: "ai",
        status: "pending_review",
      };

      const newQuestion = new QuestionModel(questionData);
      try {
        const savedQ = await newQuestion.save();
        savedQuestions.push(savedQ);
      } catch (error) {
        // Log the error and the question data that caused it for easier debugging
        console.error(
          "Error saving AI generated question:",
          error,
          "Data:",
          questionData
        );
        // Optionally, collect errors to return or decide if one failure should stop all
      }
    }
    return savedQuestions;
  }
}

export default AiQuestionService;
