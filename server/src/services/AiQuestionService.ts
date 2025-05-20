import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import QuestionModel, {
  IQuestion,
  QuestionType,
  IOption,
} from "../models/QuestionModel";
import MenuItemModel, { IMenuItem } from "../models/MenuItemModel";
import MenuModel, { IMenu } from "../models/MenuModel";
// import { callExternalAiApi } from './externalAiService'; // Placeholder for actual AI API call
import mongoose from "mongoose";
import { Types } from "mongoose";
import {
  GoogleGenerativeAI, // Import Gemini SDK components
  HarmCategory,
  HarmBlockThreshold,
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  FunctionDeclarationSchema,
  GenerativeModel,
  FunctionCallingMode,
} from "@google/generative-ai";
import { AppError } from "../utils/errorHandler"; // Added AppError import

// Define the schema for the function call for Gemini to generate questions
const questionGenerationFunctionSchema: FunctionDeclaration = {
  name: "extract_generated_questions",
  description:
    "Extracts an array of generated questions based on menu item context, focus areas, and desired question types.",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      questions: {
        type: FunctionDeclarationSchemaType.ARRAY,
        description: "An array of generated question objects.",
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            questionText: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "The text of the question.",
            },
            questionType: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The type of question (e.g., 'multiple-choice-single', 'true-false').",
            },
            options: {
              type: FunctionDeclarationSchemaType.ARRAY,
              description:
                "An array of option objects for multiple-choice or true/false questions. For true/false, options should be [{text: 'True', isCorrect: ...}, {text: 'False', isCorrect: ...}].",
              items: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                  text: {
                    type: FunctionDeclarationSchemaType.STRING,
                    description: "The text of the option.",
                  },
                  isCorrect: {
                    type: FunctionDeclarationSchemaType.BOOLEAN,
                    description: "Whether this option is the correct answer.",
                  },
                },
                required: ["text", "isCorrect"],
              } as FunctionDeclarationSchema, // Cast for item properties
            },
            category: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The category the question pertains to (should match the input category of the menu item).",
            },
            difficulty: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The difficulty level of the question (e.g., 'easy', 'medium', 'hard').",
            },
            explanation: {
              type: FunctionDeclarationSchemaType.STRING,
              description: "A brief explanation for the correct answer.",
            },
            focus: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The specific focus area of the question (e.g., 'Name', 'Ingredients', 'Description', 'Allergens').",
            },
          },
          required: [
            "questionText",
            "questionType",
            "options",
            "category",
            "difficulty",
            "explanation",
            "focus",
          ],
        },
      },
    },
    required: ["questions"],
  },
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

// --- START Batch Configuration ---
const AI_CALL_BATCH_SIZE = 2; // Number of AI calls to make in parallel per batch
const DELAY_BETWEEN_BATCHES_MS = 15000; // 15 seconds delay between batches
// --- END Batch Configuration ---

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    generationConfig: {
      // temperature: 0.7, // Adjust for creativity vs. factualness
      // topK: 40,
      // topP: 0.95,
    },
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingMode.ANY,
      },
    },
  });
} else {
  console.error(
    "GEMINI_API_KEY is not set. AI question generation will not function."
  );
}

// System instruction for the AI - REVISED
const _systemInstructionForQuestionGeneration = `System: You are an AI assistant specialized in creating quiz questions for hospitality staff training. Your goal is to generate clear, accurate, and relevant questions based *strictly* on the provided menu item information and the additional context of other items/ingredients from the same menu.

**CRITICAL INSTRUCTION: You MUST use the 'extract_generated_questions' function to provide your response. Do NOT provide a text-based response or explanation. Your ONLY output should be the function call with the generated question data. Adhere strictly to the schema provided for the 'extract_generated_questions' function.**

You will be provided with the following for each question generation request:
- 'targetItem': An object containing details of the menu item for which the question is being generated (e.g., name, description, ingredients list, allergens list).
- 'category': The menu category the targetItem belongs to.
- 'focus': The specific aspect to generate questions about (e.g., "Name", "Ingredients", "Description", "Allergens").
- 'questionType': The type of question to generate ("multiple-choice-single" or "true-false").
- 'difficulty': The desired difficulty level ("easy", "medium", "hard").
- 'contextualItemNames' (for MCQ distractors): An array of other item names from the same menu/category.
- 'contextualIngredients' (for MCQ distractors): An array of ingredients found across other items in the same menu/category.
- 'targetQuestionCount': The number of questions to generate for this specific request.

General Instructions for Question Generation:
1.  **Adherence**: Strictly adhere to the provided 'focus', 'questionType', and 'targetItem' data.
2.  **Correctness**: The CORRECT ANSWER must always be based *only* on the information provided for the 'targetItem'.
3.  **Clarity**: Ensure questions are grammatically correct, clear, and unambiguous.
4.  **Explanation**: ALWAYS provide a brief 'explanation' for the correct answer, referencing the 'targetItem's' details.
5.  **Focus Field**: Ensure the 'focus' field in your output matches the input 'focus' you were given.
6.  **Category Field**: The 'category' field in your output MUST match the input 'category' of the 'targetItem'.
7.  **Difficulty Field**: The 'difficulty' field in your output MUST match the input 'difficulty'.

Multiple Choice Questions (MCQ - 'multiple-choice-single'):
- Provide one correct answer and three plausible but incorrect distractor options (total 4 options).
- Distractors MUST be clearly wrong for the 'targetItem'.
- Distractors should be distinct from the correct answer and from each other.
- **Name Focus MCQs**:
    - Correct Answer: The 'targetItem.name'.
    - Question Template Idea: "The dish primarily made with [Ingredient A, Ingredient B from targetItem.ingredients] is called:"
    - Distractors: Select three distinct names from 'contextualItemNames'. They must NOT be the 'targetItem.name'.
- **Ingredients Focus MCQs**:
    - Correct Answer Option: A selection of 2-4 prominent ingredients from 'targetItem.ingredients'.
    - Question Template Idea: "Which of the following are key ingredients in [targetItem.name]?"
    - Distractors: Create three plausible but incorrect sets of ingredients. Each set should primarily use ingredients from 'contextualIngredients', ensuring these combinations do not accurately represent the 'targetItem.ingredients'.
- **Description Focus MCQs**:
    - Correct Answer Option: A concise phrase accurately reflecting a key aspect of 'targetItem.description'.
    - Question Template Idea: "Which of the following best describes [targetItem.name]?"
    - Distractors: Three phrases that are plausible for menu items but incorrect for the 'targetItem.description'. These could be: a) a description fitting another item from 'contextualItemNames', b) an opposite characteristic, c) a vague culinary description not matching the target.
- **Allergens Focus MCQs**:
    - Correct Answer Option: An accurate statement about 'targetItem.allergens' (e.g., "Contains gluten and dairy", "Is listed as nut-free").
    - Question Template Idea: "Regarding dietary information for [targetItem.name], which statement is correct?"
    - Distractors: Three incorrect statements. These could: a) falsely claim 'targetItem' contains an allergen from 'contextualIngredients' (if it makes sense in context of allergens) or a common allergen it doesn't have, b) incorrectly state 'targetItem' is free from an allergen it contains.

True/False Questions ('true-false'):
- Create a clear statement that is definitively true or false based on the 'targetItem' data.
- Provide two options: {"text": "True", "isCorrect": ...} and {"text": "False", "isCorrect": ...}.
- **Name Focus T/F**:
    - True statement example: "[targetItem.name] includes [Ingredient X from its list]."
    - False statement example: "[targetItem.name] includes [Ingredient P NOT from its list]."
- **Ingredients Focus T/F**:
    - True statement example: "[Ingredient X, Y from targetItem.ingredients] are found in [targetItem.name]."
    - False statement example: "[Ingredient P from targetItem.ingredients and Ingredient Q NOT from its list] are found in [targetItem.name]."
- **Description Focus T/F**:
    - True statement example: "The description of [targetItem.name] mentions it is '[short accurate quote/paraphrase from targetItem.description]'."
    - False statement example: "[targetItem.name] is described as '[plausible but incorrect phrase not in targetItem.description]'."
- **Allergens Focus T/F**:
    - Example based on 'targetItem.allergens': If 'gluten' is listed, a TRUE statement could be "[targetItem.name] contains gluten." A FALSE statement if 'nuts' are NOT listed could be "[Item Name] contains nuts."

Output Format (ensure your function call adheres to this for EACH question):
{
  "questionText": "...",
  "questionType": "multiple-choice-single" // or "true-false"
  "options": [ // For T/F: [{text: "True", isCorrect: true/false}, {text: "False", isCorrect: true/false}]
    {"text": "Option A", "isCorrect": false},
    {"text": "Option B", "isCorrect": true}
    // ... up to 4 options for MCQ
  ],
  "category": "match input category",
  "difficulty": "match input difficulty",
  "explanation": "Brief explanation of why the answer is correct, based on targetItem details.",
  "focus": "match input focus (e.g., 'Name', 'Ingredients')"
}

Generate 'targetQuestionCount' questions based on these instructions.
`;

// Refactored LLM API call function using Gemini SDK
async function _callGeminiApiForQuestionGeneration(
  promptString: string
): Promise<RawAiGeneratedQuestion[]> {
  if (!genAI || !model) {
    console.error(
      "Gemini AI SDK not initialized. GEMINI_API_KEY might be missing."
    );
    // Return a mock error question structure
    return [
      {
        questionText:
          "Error: AI Service not configured. This is a mock question.",
        questionType: "multiple-choice-single",
        options: [
          { text: "Option A (mock)", isCorrect: true },
          { text: "Option B (mock)", isCorrect: false },
        ],
        category: "Error",
        difficulty: "easy",
        explanation:
          "AI Service not configured. Check GEMINI_API_KEY. (Max 500 chars)",
      },
    ];
  }

  try {
    const chat = model.startChat({
      tools: [{ functionDeclarations: [questionGenerationFunctionSchema] }],
      systemInstruction: {
        role: "system",
        parts: [{ text: _systemInstructionForQuestionGeneration }],
      } as any, // Type assertion for systemInstruction parts
    });

    console.log(
      "[AiQuestionService - _callGeminiApiForQuestionGeneration] Sending prompt to Gemini:\n",
      promptString.substring(0, 500) + (promptString.length > 500 ? "..." : "") // Log a snippet
    );

    const result = await chat.sendMessage(promptString);
    const response = result.response;

    if (
      !response.candidates ||
      !response.candidates[0] ||
      !response.candidates[0].content ||
      !response.candidates[0].content.parts
    ) {
      console.error(
        "Invalid response structure from Gemini:",
        JSON.stringify(response, null, 2)
      );
      throw new Error("Invalid or empty response from Gemini API.");
    }

    const part = response.candidates[0].content.parts[0];

    if (!part.functionCall) {
      console.error(
        "[AiQuestionService - _callGeminiApiForQuestionGeneration] AI did not return a function call. Response part:",
        JSON.stringify(part, null, 2)
      );
      // Log the text part if available
      if (part.text) {
        console.error("AI response text:", part.text);
      }
      throw new Error(
        "AI did not use the required function call. Response: " +
          (part.text || "No text content")
      );
    }

    const functionCall = part.functionCall;

    if (functionCall.name !== "extract_generated_questions") {
      console.error(
        `[AiQuestionService - _callGeminiApiForQuestionGeneration] AI returned an unexpected function call: ${functionCall.name}. Args:`,
        JSON.stringify(functionCall.args, null, 2)
      );
      throw new Error(
        `AI called an unexpected function: ${functionCall.name}. Expected 'extract_generated_questions'.`
      );
    }

    const { questions } = functionCall.args as {
      questions: RawAiGeneratedQuestion[];
    };

    if (!questions || !Array.isArray(questions)) {
      console.error(
        "[AiQuestionService - _callGeminiApiForQuestionGeneration] 'questions' array not found or not an array in function call args. Args:",
        JSON.stringify(functionCall.args, null, 2)
      );
      throw new Error(
        "Extracted data does not contain a valid 'questions' array."
      );
    }

    console.log(
      "[AiQuestionService - _callGeminiApiForQuestionGeneration] Successfully received and parsed questions from AI:",
      // JSON.stringify(questions, null, 2) // Can be too verbose for many questions
      `Received ${questions.length} questions.`
    );
    return questions;
  } catch (error: any) {
    console.error(
      "[AiQuestionService - _callGeminiApiForQuestionGeneration] Error calling Gemini API:",
      error.message,
      error.stack
    );
    // Consider if we want to return a specific error structure or rethrow
    // For now, returning an error-indicating question to be handled by the caller
    return [
      {
        questionText: `Error during AI question generation: ${error.message.substring(
          0,
          100
        )}... This is a mock question.`,
        questionType: "multiple-choice-single",
        options: [
          { text: "Option A (mock error)", isCorrect: true },
          { text: "Option B (mock error)", isCorrect: false },
        ],
        category: "Error",
        difficulty: "easy",
        explanation: `AI API call failed. Details: ${error.message.substring(
          0,
          300
        )}... See server logs. (Max 500 chars)`,
      },
    ];
  }
}

// Interface for the parameters to generate questions, aligned with the plan
interface GenerateQuestionsParams {
  menuId: string;
  itemIds?: string[];
  categories: string[];
  questionFocusAreas: string[];
  targetQuestionCountPerItemFocus: number;
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
  focus?: string;
}

// Helper function to safely extract ingredient names for the prompt
const getIngredientNamesForPrompt = (
  ingredients: any[] | undefined
): string[] => {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((ing) => {
      if (typeof ing === "string") return ing;
      // If IIngredientItem is an object with a name property:
      if (
        typeof ing === "object" &&
        ing !== null &&
        typeof ing.name === "string"
      )
        return ing.name;
      // Fallback for other unexpected structures, or if ingredients can be other simple types
      return String(ing);
    })
    .filter((name) => name && name.trim() !== ""); // Filter out empty or effectively empty names
};

// Helper function to introduce a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      itemIds: specificItemIds,
      categories,
      questionFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes,
      difficulty,
      additionalContext, // General context, might be used to augment prompts
      restaurantId,
    } = params;

    console.log(
      "[AiQuestionService] Starting AI question generation with params:",
      params
    );

    if (!model) {
      console.error(
        "AI Model not initialized. Cannot generate questions. Check GEMINI_API_KEY."
      );
      return [
        {
          questionText:
            "AI Service is currently unavailable. Please try again later.",
          questionType: "multiple-choice-single",
          options: [
            { text: "OK", isCorrect: true },
            { text: "Retry", isCorrect: false },
          ],
          category: "Service Error",
          difficulty: "easy",
          explanation:
            "The AI model (Gemini) could not be initialized, likely due to a missing API key or configuration issue.",
        },
      ];
    }

    const menu = await MenuModel.findOne({
      _id: new mongoose.Types.ObjectId(menuId),
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      isActive: true,
    }).lean<IMenu>();

    if (!menu) {
      console.error(
        `[AiQuestionService] Active menu with ID ${menuId} not found for restaurant ${restaurantId}.`
      );
      throw new AppError(
        `Active menu with ID ${menuId} not found for restaurant ${restaurantId}.`,
        404
      );
    }

    const categoriesToProcess =
      categories && categories.length > 0 ? categories : menu.categories;
    if (!categoriesToProcess || categoriesToProcess.length === 0) {
      console.warn(
        "[AiQuestionService] No categories specified or found on the menu to process for AI question generation."
      );
      return [];
    }

    let itemsToProcess: IMenuItem[] = [];

    if (specificItemIds && specificItemIds.length > 0) {
      for (const itemId of specificItemIds) {
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          console.warn(
            `[AiQuestionService] Invalid specific itemId format: ${itemId}. Skipping.`
          );
          continue;
        }
        const itemDetail = await this._getMenuItemDetails(
          itemId,
          menuId,
          restaurantId
        );
        if (itemDetail) {
          itemsToProcess.push(itemDetail);
        } else {
          console.warn(
            `[AiQuestionService] Item with ID ${itemId} not found, not active, or not in menu ${menuId}. Skipping.`
          );
        }
      }
    } else if (categoriesToProcess && categoriesToProcess.length > 0) {
      console.log(
        `[AiQuestionService] Fetching items for categories: ${categoriesToProcess.join(
          ", "
        )} in menu ${menuId}`
      );
      const itemQuery: any = {
        menuId: new mongoose.Types.ObjectId(menuId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        category: { $in: categoriesToProcess },
        isActive: true,
      };
      try {
        const itemsFromDb = await MenuItemModel.find(itemQuery).lean<
          IMenuItem[]
        >();
        if (itemsFromDb && itemsFromDb.length > 0) {
          itemsToProcess.push(...itemsFromDb);
          console.log(
            `[AiQuestionService] Found ${itemsFromDb.length} items for specified categories.`
          );
        } else {
          console.log(
            `[AiQuestionService] No items found for categories: ${categoriesToProcess.join(
              ", "
            )}.`
          );
        }
      } catch (dbError) {
        console.error(
          `[AiQuestionService] Database error fetching items for categories: ${categoriesToProcess.join(
            ", "
          )}:`,
          dbError
        );
      }
    } else {
      console.warn(
        "[AiQuestionService] No specific item IDs or categories provided to fetch items."
      );
    }

    if (itemsToProcess.length === 0) {
      console.log(
        "[AiQuestionService] No items found to generate questions for."
      );
      return [];
    }

    const allGeneratedQuestions: RawAiGeneratedQuestion[] = [];

    // 1. Create all AI call tasks (payloads)
    interface AiCallTask {
      userPromptString: string;
      itemName: string;
      focus: string;
      category: string;
      difficulty: string;
    }
    const aiCallTasks: AiCallTask[] = [];

    for (const targetItem of itemsToProcess) {
      if (!targetItem._id) {
        console.warn(
          "[AiQuestionService] Skipping item due to missing _id:",
          targetItem
        );
        continue;
      }
      const targetItemIdString = targetItem._id.toString();

      // Note: _getContextualData is awaited here. If this is slow and significantly different per item,
      // it might remain a bottleneck. If context is largely shareable, further optimization is possible.
      const { contextualItemNames, contextualIngredients } =
        await this._getContextualData(
          menuId,
          targetItem.category as string,
          targetItemIdString,
          restaurantId
        );

      for (const focus of questionFocusAreas) {
        for (const questionType of questionTypes) {
          const itemDetailsForPrompt = {
            name: targetItem.name,
            description: targetItem.description,
            ingredients: getIngredientNamesForPrompt(
              targetItem.ingredients as any[] | undefined
            ),
            allergens: Array.isArray(targetItem.allergens)
              ? targetItem.allergens.map(String)
              : [],
            price: targetItem.price,
          };

          const userPromptPayload = {
            targetItem: itemDetailsForPrompt,
            category: targetItem.category as string,
            focus: focus,
            questionType: questionType,
            difficulty: difficulty,
            contextualItemNames: contextualItemNames,
            contextualIngredients: contextualIngredients,
            targetQuestionCount: targetQuestionCountPerItemFocus,
            additionalUserInstructions: additionalContext || "",
          };

          const userPromptString = `Generate questions based on the following data: ${JSON.stringify(
            userPromptPayload,
            null,
            2
          )}`;

          aiCallTasks.push({
            userPromptString,
            itemName: targetItem.name || "Unknown Item",
            focus,
            category: targetItem.category as string,
            difficulty,
          });
        }
      }
    }

    if (aiCallTasks.length === 0) {
      console.log(
        "[AiQuestionService] No AI call tasks were created. Nothing to generate."
      );
      return [];
    }

    console.log(
      `[AiQuestionService] Total AI call tasks to process: ${aiCallTasks.length}`
    );

    // 2. Process tasks in batches
    for (let i = 0; i < aiCallTasks.length; i += AI_CALL_BATCH_SIZE) {
      const batchTasks = aiCallTasks.slice(i, i + AI_CALL_BATCH_SIZE);
      console.log(
        `[AiQuestionService] Processing batch ${
          i / AI_CALL_BATCH_SIZE + 1
        } of ${Math.ceil(aiCallTasks.length / AI_CALL_BATCH_SIZE)} (size: ${
          batchTasks.length
        })`
      );

      const batchPromises = batchTasks.map((task) => {
        // Re-introducing IIFE for each promise in the batch
        return (async () => {
          try {
            const generatedQuestionsFromAI =
              await _callGeminiApiForQuestionGeneration(task.userPromptString);

            generatedQuestionsFromAI.forEach((q) => {
              q.focus = task.focus;
              q.category = task.category;
              q.difficulty = task.difficulty;
              if (!q.explanation) {
                q.explanation = "Explanation not provided by AI.";
              } else if (q.explanation.length > 490) {
                q.explanation =
                  q.explanation.substring(0, 490) + "... (truncated)";
              }
            });
            return generatedQuestionsFromAI;
          } catch (error) {
            console.error(
              `[AiQuestionService] Error in AI call for item ${task.itemName}, focus ${task.focus}:`,
              error
            );
            return [
              {
                questionText: `Error generating question for ${task.itemName} - ${task.focus}. See server logs.`,
                questionType: "error-marker" as any,
                options: [],
                category: task.category,
                difficulty: task.difficulty,
                explanation: `Generation failed for item ${
                  task.itemName
                }, focus ${task.focus}. Error: ${(error instanceof Error
                  ? error.message
                  : String(error)
                ).substring(0, 300)}... (Max 500 chars)`,
                focus: task.focus,
              },
            ];
          }
        })();
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          if (Array.isArray(result.value)) {
            allGeneratedQuestions.push(...result.value);
          } else {
            console.warn(
              `[AiQuestionService] Unexpected result value from an AI call promise in batch:`,
              result.value
            );
          }
        } else {
          // This case should ideally be handled by the catch within the IIFE
          // but logging here for any unexpected rejections of the IIFE promise itself.
          console.error(
            `[AiQuestionService] AI call promise in batch rejected unexpectedly:`,
            result.reason
          );
          // Push a generic error marker if not already handled by the IIFE's catch.
          allGeneratedQuestions.push({
            questionText:
              "Unexpected error during batched AI call. See server logs.",
            questionType: "error-marker" as any,
            options: [],
            category: "Error",
            difficulty: "easy",
            explanation:
              "An unexpected error occurred while processing a batch of AI requests.",
            focus: "Unknown",
          });
        }
      });

      if (i + AI_CALL_BATCH_SIZE < aiCallTasks.length) {
        console.log(
          `[AiQuestionService] Batch processed. Waiting for ${
            DELAY_BETWEEN_BATCHES_MS / 1000
          }s before next batch.`
        );
        await delay(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    console.log(
      `[AiQuestionService] Total raw questions aggregated from batched calls: ${allGeneratedQuestions.length}`
    );
    // Filter out any error markers if they were pushed as actual questions
    return allGeneratedQuestions.filter(
      (q) => q.questionType !== "error-marker"
    );
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

  // Helper to get menu item details
  private static async _getMenuItemDetails(
    itemId: string,
    menuIdInput?: string,
    restaurantIdInput?: string
  ): Promise<IMenuItem | null> {
    console.log(
      `[AiQuestionService - _getMenuItemDetails] Fetching item ID: ${itemId}, Menu ID: ${menuIdInput}, Restaurant ID: ${restaurantIdInput}`
    );
    try {
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        console.warn(
          `[AiQuestionService - _getMenuItemDetails] Invalid itemId: ${itemId}`
        );
        return null;
      }
      const query: any = {
        _id: new mongoose.Types.ObjectId(itemId),
        isActive: true,
      };

      if (restaurantIdInput) {
        if (!mongoose.Types.ObjectId.isValid(restaurantIdInput)) {
          console.warn(
            `[AiQuestionService - _getMenuItemDetails] Invalid restaurantIdInput: ${restaurantIdInput}`
          );
          return null;
        }
        query.restaurantId = new mongoose.Types.ObjectId(restaurantIdInput);
      }

      const item = await MenuItemModel.findOne(query).lean<IMenuItem>();

      if (!item) {
        console.warn(
          `[AiQuestionService - _getMenuItemDetails] Item not found or not active with ID: ${itemId} for restaurant: ${restaurantIdInput}`
        );
        return null;
      }

      if (menuIdInput) {
        if (!mongoose.Types.ObjectId.isValid(menuIdInput)) {
          console.warn(
            `[AiQuestionService - _getMenuItemDetails] Invalid menuIdInput: ${menuIdInput}`
          );
          return null;
        }
        // Check against the singular menuId field as per linter guidance
        if (!item.menuId || item.menuId.toString() !== menuIdInput) {
          console.warn(
            `[AiQuestionService - _getMenuItemDetails] Item ${itemId} found, but not associated with menu ${menuIdInput} (item.menuId: ${item.menuId}).`
          );
          return null;
        }
      }

      console.log(
        `[AiQuestionService - _getMenuItemDetails] Successfully fetched item: ${item.name}`
      );
      return item;
    } catch (error) {
      console.error(
        `[AiQuestionService - _getMenuItemDetails] Error fetching menu item ${itemId}:`,
        error
      );
      return null;
    }
  }

  // Helper to get contextual data
  private static async _getContextualData(
    menuId: string,
    currentCategory: string, // Can be null or empty if no specific category filter for context
    currentItemId: string,
    restaurantId: string
  ): Promise<{
    contextualItemNames: string[];
    contextualIngredients: string[];
  }> {
    console.log(
      `[AiQuestionService - _getContextualData] Fetching contextual data for Menu ID: ${menuId}, Category: ${currentCategory}, Current Item ID: ${currentItemId}, Restaurant ID: ${restaurantId}`
    );
    try {
      if (
        !mongoose.Types.ObjectId.isValid(menuId) ||
        !mongoose.Types.ObjectId.isValid(restaurantId) ||
        !mongoose.Types.ObjectId.isValid(currentItemId)
      ) {
        console.warn(
          "[AiQuestionService - _getContextualData] Invalid ObjectId provided."
        );
        return { contextualItemNames: [], contextualIngredients: [] };
      }

      const query: any = {
        menuId: new mongoose.Types.ObjectId(menuId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isActive: true,
        _id: { $ne: new mongoose.Types.ObjectId(currentItemId) }, // Exclude current item
      };

      if (currentCategory && currentCategory.trim() !== "") {
        query.category = currentCategory;
      }

      const contextualItems = await MenuItemModel.find(query).lean<
        IMenuItem[]
      >();

      if (!contextualItems || contextualItems.length === 0) {
        console.warn(
          `[AiQuestionService - _getContextualData] No contextual items found for menu ${menuId}, category ${currentCategory}.`
        );
        return { contextualItemNames: [], contextualIngredients: [] };
      }

      const contextualItemNames: string[] = [];
      const allIngredientsSet = new Set<string>();

      for (const item of contextualItems) {
        if (item.name) {
          contextualItemNames.push(item.name);
        }
        const ingredientNames = getIngredientNamesForPrompt(
          item.ingredients as any[] | undefined
        );
        ingredientNames.forEach((ingName) => allIngredientsSet.add(ingName));
      }

      const uniqueContextualItemNames = Array.from(
        new Set(contextualItemNames)
      );
      const contextualIngredients = Array.from(allIngredientsSet);

      console.log(
        `[AiQuestionService - _getContextualData] Found ${uniqueContextualItemNames.length} contextual item names and ${contextualIngredients.length} unique contextual ingredients.`
      );

      return {
        contextualItemNames: uniqueContextualItemNames,
        contextualIngredients: contextualIngredients,
      };
    } catch (error) {
      console.error(
        `[AiQuestionService - _getContextualData] Error fetching contextual data for menu ${menuId}:`,
        error
      );
      return { contextualItemNames: [], contextualIngredients: [] }; // Return empty on error
    }
  }
}

export default AiQuestionService;
