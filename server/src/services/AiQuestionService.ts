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
import SopDocumentModel, { ISopDocument } from "../models/SopDocumentModel"; // Added import for SopDocumentModel

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
const AI_CALL_BATCH_SIZE = 1; // Adjusted for potentially larger category-based payloads
const DELAY_BETWEEN_BATCHES_MS = 20000; // Adjusted for potentially larger category-based payloads
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
- 'itemsInCategory': An array of objects, where each object contains details of a menu item within the target category (e.g., name, description, ingredients list, allergens).
- 'categoryName': The menu category these items belong to.
- 'questionFocusAreas': A list of general themes or aspects to generate questions about (e.g., ["Ingredients", "Allergens"]).
- 'questionTypes': The types of questions to generate (e.g., ["multiple-choice-single", "true-false"]).
- 'difficulty': The desired difficulty level ("easy", "medium", "hard").
- 'contextualItemNames' (for MCQ distractors): An array of other item names from the menu (potentially from other categories).
- 'contextualIngredients' (for MCQ distractors): An array of ingredients found across other items on the menu.
- 'targetQuestionCount': The total number of questions to generate for this entire batch of items in the category.

General Instructions for Question Generation:
1.  **Adherence**: Base questions on the 'itemsInCategory'. Distribute questions among the items in the category.
2.  **Correctness**: The CORRECT ANSWER must always be based *only* on the information provided for the specific item a question refers to.
3.  **Clarity**: Ensure questions are grammatically correct, clear, and unambiguous.
4.  **Explanation**: ALWAYS provide a brief 'explanation' for the correct answer, referencing the relevant item\'s details.
5.  **Focus Field**: In your output for each question, populate the 'focus' field with the primary theme of that question (e.g., "Ingredients", "Allergens", "Dietary Information"). This should align with the input 'questionFocusAreas'.
6.  **Category Field**: The 'category' field in your output MUST match the 'categoryName' provided in the input, or if a question is very specific to an item, that item\'s original category if it differs (though typically items in the batch share the categoryName).
7.  **Difficulty Field**: The 'difficulty' field in your output MUST match the input 'difficulty'.
8.  **Question Distribution**: Attempt to generate a balanced set of questions covering different items within the 'itemsInCategory' and different 'questionFocusAreas', up to the 'targetQuestionCount'.

Multiple Choice Questions (MCQ - 'multiple-choice-single'):
- Provide one correct answer and three plausible but incorrect distractor options (total 4 options).
- Distractors MUST be clearly wrong for the item the question is about.
- **Item-Specific MCQs** (e.g., focusing on one item from 'itemsInCategory'):
    - For ingredients: "Which of the following are key ingredients in [Item Name from batch]?"
    - For allergens: "Regarding dietary information for [Item Name from batch], which statement is correct?"
- **Category-Wide MCQs** (e.g., comparing items in 'itemsInCategory'):
    - "Which of these [categoryName] items is listed as vegan?"
    - "Which item in the [categoryName] category contains [specific ingredient]?"

True/False Questions ('true-false'):
- Create a clear statement about a specific item from 'itemsInCategory' that is definitively true or false.
- Provide two options: {"text": "True", "isCorrect": ...} and {"text": "False", "isCorrect": ...}.
- Example: "[Item Name from batch] is described as spicy." (True/False based on its description)

Output Format (ensure your function call adheres to this for EACH question):
{
  "questionText": "...",
  "questionType": "multiple-choice-single", // or "true-false"
  "options": [ // For T/F: [{text: "True", isCorrect: true/false}, {text: "False", isCorrect: true/false}]
    {"text": "Option A", "isCorrect": false},
    {"text": "Option B", "isCorrect": true}
    // ... up to 4 options for MCQ
  ],
  "category": "match input categoryName, or specific item\'s category if distinct and relevant",
  "difficulty": "match input difficulty",
  "explanation": "Brief explanation of why the answer is correct, based on item details.",
  "focus": "derived focus of the question (e.g., 'Ingredients', 'Allergens')"
}

Generate 'targetQuestionCount' questions based on these instructions, distributing them across the provided 'itemsInCategory'.
`;

// ADDED: System instruction for SOP/Policy Question Generation
const _systemInstructionForSopQuestionGeneration = `System: You are an AI assistant specialized in creating quiz questions for employee training based on Standard Operating Procedures (SOPs), policies, and instructional documents.

**CRITICAL INSTRUCTION: You MUST use the 'extract_generated_questions' function to provide your response. Do NOT provide a text-based response or explanation. Your ONLY output should be the function call with the generated question data. Adhere strictly to the schema provided for the 'extract_generated_questions' function.**

You will be provided with the following for each question generation request:
- 'sopCategoryName': The name of the category/section from the SOP document.
- 'sopCategoryText': The full text content of that SOP category/section.
- 'questionTypes': The types of questions to generate (e.g., ["multiple-choice-single", "true-false"]).
- 'difficulty': The desired difficulty level ("easy", "medium", "hard").
- 'targetQuestionCount': The total number of questions to generate from this SOP category text.

General Instructions for Question Generation:
1.  **Adherence**: Base questions strictly on the provided 'sopCategoryText'.
2.  **Correctness**: The CORRECT ANSWER must always be verifiable from the 'sopCategoryText'.
3.  **Clarity**: Ensure questions are grammatically correct, clear, and unambiguous.
4.  **Explanation**: ALWAYS provide a brief 'explanation' for the correct answer, referencing the relevant part of the 'sopCategoryText' if possible.
5.  **Focus Field**: In your output for each question, populate the 'focus' field with a concise keyword or phrase describing the main topic of the question derived from the SOP (e.g., "Fire Extinguisher Types", "Hand Washing Steps", "Data Privacy Clause").
6.  **Category Field**: The 'category' field in your output MUST match the 'sopCategoryName' provided in the input.
7.  **Difficulty Field**: The 'difficulty' field in your output MUST match the input 'difficulty'.
8.  **Question Distribution**: If the 'sopCategoryText' is long, attempt to generate questions covering different aspects of it, up to the 'targetQuestionCount'.

Multiple Choice Questions (MCQ - 'multiple-choice-single'):
- Provide one correct answer and three plausible but incorrect distractor options (total 4 options).
- Distractors should be relevant to the SOP context but clearly incorrect according to the 'sopCategoryText'.

True/False Questions ('true-false'):
- Create a clear statement based on the 'sopCategoryText' that is definitively true or false according to that text.
- Provide two options: {"text": "True", "isCorrect": ...} and {"text": "False", "isCorrect": ...}.

Output Format (ensure your function call adheres to this for EACH question, using the existing 'extract_generated_questions' schema):
{
  "questionText": "...",
  "questionType": "multiple-choice-single", // or "true-false"
  "options": [ /* ...options... */ ],
  "category": "match input sopCategoryName",
  "difficulty": "match input difficulty",
  "explanation": "Brief explanation of why the answer is correct, based on sopCategoryText.",
  "focus": "derived focus of the question (e.g., \"Emergency Exits\")"
}

Generate 'targetQuestionCount' questions based on these instructions from the provided 'sopCategoryText'.
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
        focus: "Configuration",
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
        focus: "API Error", // Added focus here
      },
    ];
  }
}

// Interface for the parameters to generate questions, aligned with the plan
interface GenerateQuestionsParams {
  menuId: string;
  itemIds?: string[]; // Optional: specific item IDs to focus on if not doing category-wide
  categoriesToFocus?: string[]; // Categories to generate questions for. This will be the primary driver.
  questionFocusAreas: string[]; // General themes, e.g., ["Ingredients", "Allergens"]
  targetQuestionCountPerItemFocus: number; // Total questions to aim for per category batch
  questionTypes: string[]; // e.g., ['multiple-choice-single', 'true-false']
  difficulty: string; // e.g., 'medium'
  additionalContext?: string; // General context, might be used to augment prompts
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

// This interface represents a single raw question object as expected from the AI
interface AiCallTask {
  userPromptString: string;
  categoryName: string; // Name of the category for this batch
  itemsInCategory: IMenuItem[]; // All items in this category batch
  difficulty: string; // Difficulty for the entire batch, taken from params
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

// ADDED: Interface for parameters for generating questions from SOPs
// MOVED an exported interface outside the class definition.
export interface GenerateQuestionsFromSopParams {
  sopDocumentId: string;
  selectedSopCategoryNames: string[];
  targetQuestionCount: number;
  questionTypes: string[]; // e.g., ['multiple-choice-single', 'true-false']
  difficulty: string; // e.g., 'medium'
  restaurantId: string;
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
      itemIds: specificItemIds,
      categoriesToFocus,
      questionFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes,
      difficulty,
      additionalContext,
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
          focus: "Configuration",
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

    const allGeneratedQuestions: RawAiGeneratedQuestion[] = [];
    const aiCallTasks: AiCallTask[] = [];

    // Prioritize category-based generation if categoriesToFocus is provided
    if (categoriesToFocus && categoriesToFocus.length > 0) {
      console.log(
        `[AiQuestionService] Processing by categories: ${categoriesToFocus.join(
          ", "
        )}`
      );
      for (const categoryName of categoriesToFocus) {
        const itemsInCategory = await MenuItemModel.find({
          menuId: new mongoose.Types.ObjectId(menuId),
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          category: categoryName,
          isActive: true,
        }).lean<IMenuItem[]>();

        if (itemsInCategory && itemsInCategory.length > 0) {
          const userPromptString = await this._buildPromptForCategoryBatch({
            categoryName,
            itemsInCategory,
            questionFocusAreas,
            targetQuestionCount: targetQuestionCountPerItemFocus,
            questionTypes,
            difficulty,
            menuId,
            restaurantId,
            additionalContext,
          });

          if (userPromptString) {
            aiCallTasks.push({
              userPromptString,
              categoryName,
              itemsInCategory,
              difficulty,
            });
          } else {
            console.warn(
              `[AiQuestionService] Could not generate prompt for category: ${categoryName}. Skipping.`
            );
          }
        } else {
          console.log(
            `[AiQuestionService] No active items found for category: ${categoryName} in menu ${menuId}.`
          );
        }
      }
    } else if (specificItemIds && specificItemIds.length > 0) {
      // This is a simplified fallback for specific items. It will create one task per item.
      // For a more advanced fallback, you could group these specific items by their categories
      // and then use _buildPromptForCategoryBatch for each of those smaller, specific groups.
      console.warn(
        "[AiQuestionService] Categories not provided, falling back to specific item IDs. Each item will be processed individually."
      );
      for (const itemId of specificItemIds) {
        const itemDetail = await this._getMenuItemDetails(
          itemId,
          menuId,
          restaurantId
        );
        if (itemDetail) {
          // To use _buildPromptForCategoryBatch, we treat this single item as a category of one.
          const categoryNameForItem = itemDetail.category || "Unknown Category"; // Define categoryNameForItem
          const userPromptString = await this._buildPromptForCategoryBatch({
            categoryName: categoryNameForItem, // Use defined variable
            itemsInCategory: [itemDetail],
            questionFocusAreas,
            targetQuestionCount: targetQuestionCountPerItemFocus, // Or adjust this logic for single item
            questionTypes,
            difficulty,
            menuId,
            restaurantId,
            additionalContext,
          });
          if (userPromptString) {
            aiCallTasks.push({
              userPromptString,
              categoryName: categoryNameForItem,
              itemsInCategory: [itemDetail],
              difficulty,
            });
          }
        } else {
          console.warn(
            `[AiQuestionService] Item with ID ${itemId} not found or not active. Skipping.`
          );
        }
      }
    } else {
      console.warn(
        "[AiQuestionService] No categories or specific item IDs provided to generate questions."
      );
      return [];
    }

    if (aiCallTasks.length === 0) {
      console.log(
        "[AiQuestionService] No AI call tasks created. Nothing to process."
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
        return (async () => {
          try {
            const generatedQuestionsFromAI =
              await _callGeminiApiForQuestionGeneration(task.userPromptString);

            generatedQuestionsFromAI.forEach((q) => {
              // The AI is expected to set q.category, q.difficulty, and q.focus
              // as per the revised system prompt and function schema.
              // We can add fallbacks or overrides here if necessary.
              q.category = q.category || task.categoryName; // Fallback to task's category if AI omits
              q.difficulty = q.difficulty || task.difficulty; // Fallback to task's difficulty

              if (!q.explanation) {
                q.explanation = "Explanation not provided by AI.";
              } else if (q.explanation.length > 490) {
                q.explanation =
                  q.explanation.substring(0, 490) + "... (truncated)";
              }
              // q.focus is expected from AI. If not provided, it remains undefined or could be set to a default.
              // q.focus = q.focus || "General";
            });
            return generatedQuestionsFromAI;
          } catch (error: any) {
            // Added type any to error for generic handling
            console.error(
              `[AiQuestionService] Error in AI call for category batch ${task.categoryName}:`,
              error
            );
            // Return a structured error object that matches RawAiGeneratedQuestion
            return [
              {
                questionText: `Error generating questions for category ${task.categoryName}. See server logs.`,
                questionType: "error-marker" as any, // To indicate an error state
                options: [],
                category: task.categoryName,
                difficulty: task.difficulty,
                explanation: `Generation failed for category batch ${
                  task.categoryName
                }. Error: ${(error instanceof Error
                  ? error.message
                  : String(error)
                ).substring(0, 300)}
                ... (Max 500 chars)`,
                focus: "Error",
              },
            ];
          }
        })(); // IIFE to handle async/await within map
      });

      // Wait for all promises in the current batch to resolve
      const results = await Promise.allSettled(batchPromises);
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          if (Array.isArray(result.value)) {
            allGeneratedQuestions.push(...result.value);
          } else {
            // This case should ideally not happen if _callGeminiApiForQuestionGeneration always returns an array
            // or the catch block returns an array.
            console.warn(
              `[AiQuestionService] Unexpected non-array result value from an AI call promise in batch:`,
              result.value
            );
          }
        } else if (result.status === "rejected") {
          // This should be caught by the inner try/catch of the IIFE,
          // but logging here for any unexpected rejections of the IIFE promise itself.
          console.error(
            `[AiQuestionService] AI call promise in batch rejected unexpectedly:`,
            result.reason
          );
          // Push a generic error question if an entire promise rejected unexpectedly
          allGeneratedQuestions.push({
            questionText:
              "System Error: AI Question generation failed unexpectedly. Batch promise rejected. See server logs.",
            questionType: "error-marker" as any,
            options: [],
            category: "System Error",
            difficulty: "unknown",
            explanation:
              "A system-level error occurred during batch processing. Check server logs for details like rejection reason.",
            focus: "System Error",
          });
        }
      });

      // Delay before the next batch (if there is one)
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
      // const query: any = { // Replaced by mongoose.FilterQuery<IMenuItem>
      const query: mongoose.FilterQuery<IMenuItem> = {
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
    } catch (error: any) {
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
        !mongoose.Types.ObjectId.isValid(currentItemId) // currentItemId is now always expected to be valid if provided.
      ) {
        console.warn(
          "[AiQuestionService - _getContextualData] Invalid ObjectId provided."
        );
        return { contextualItemNames: [], contextualIngredients: [] };
      }

      const query: mongoose.FilterQuery<IMenuItem> = {
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
    } catch (error: any) {
      console.error(
        `[AiQuestionService - _getContextualData] Error fetching contextual data for menu ${menuId}:`,
        error
      );
      return { contextualItemNames: [], contextualIngredients: [] }; // Return empty on error
    }
  }

  // This is the new helper function to build the prompt for a category batch.
  private static async _buildPromptForCategoryBatch(params: {
    categoryName: string;
    itemsInCategory: IMenuItem[];
    questionFocusAreas: string[];
    targetQuestionCount: number;
    questionTypes: string[];
    difficulty: string;
    menuId: string; // For fetching contextual data from other categories
    restaurantId: string; // For fetching contextual data
    additionalContext?: string;
  }): Promise<string | null> {
    const {
      categoryName,
      itemsInCategory,
      questionFocusAreas,
      targetQuestionCount,
      questionTypes,
      difficulty,
      menuId,
      restaurantId,
      additionalContext,
    } = params;

    // Simplified item details for the prompt to manage token count.
    // The AI will receive this as part of a JSON payload string.
    const itemsDataForPrompt = itemsInCategory.map((item) => ({
      name: item.name,
      description: item.description || "N/A",
      price:
        item.price !== undefined && item.price !== null ? item.price : "N/A",
      // Ensure ingredients and allergens are arrays of strings for the AI
      ingredients: Array.isArray(item.ingredients)
        ? item.ingredients.map(String)
        : [],
      allergens: Array.isArray(item.allergens)
        ? item.allergens.map(String)
        : [],
      isVegan: !!item.isVegan,
      isVegetarian: !!item.isVegetarian,
      isGlutenFree: !!item.isGlutenFree,
      // Add other relevant fields from IMenuItem if needed by the AI, e.g., item.category if it can differ
    }));

    // Contextual data: Fetch item names and ingredients from OTHER categories for distractors.
    let contextualItemNames: string[] = [];
    let contextualIngredients: string[] = [];

    try {
      const contextualItems = await MenuItemModel.find({
        menuId: new mongoose.Types.ObjectId(menuId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        category: { $ne: categoryName }, // Exclude items from the current category
        isActive: true,
      })
        .limit(50) // Limit the number of contextual items to avoid overly large context
        .lean<IMenuItem[]>();

      contextualItemNames = contextualItems.map((item) => item.name);
      const contextualIngredientsSet = new Set<string>();
      contextualItems.forEach((item) => {
        if (item.ingredients && Array.isArray(item.ingredients)) {
          // Ensure ingredients are processed correctly, similar to getIngredientNamesForPrompt
          const currentItemIngredients = getIngredientNamesForPrompt(
            item.ingredients as any[]
          );
          currentItemIngredients.forEach((ing) =>
            contextualIngredientsSet.add(ing)
          );
        }
      });
      contextualIngredients = Array.from(contextualIngredientsSet);
    } catch (error: any) {
      console.error(
        `[AiQuestionService] Error fetching contextual data for prompt generation (category: ${categoryName}):`,
        error
      );
      // Proceed without contextual data if fetching fails
    }

    const payloadForSystemPrompt = {
      categoryName: categoryName,
      itemsInCategory: itemsDataForPrompt, // Pass the curated item details
      questionFocusAreas: questionFocusAreas,
      targetQuestionCount: targetQuestionCount,
      questionTypes: questionTypes,
      difficulty: difficulty,
      // Limit context for prompt size. The system prompt already mentions these fields.
      contextualItemNames: contextualItemNames.slice(0, 30),
      contextualIngredients: contextualIngredients.slice(0, 50),
      additionalUserInstructions: additionalContext || "", // Changed from additionalContext to match system prompt expectation
    };

    // The actual string sent to Gemini will be this payload formatted as a JSON string.
    // The _systemInstructionForQuestionGeneration tells Gemini how to interpret this payload.
    try {
      return JSON.stringify(payloadForSystemPrompt);
    } catch (error: any) {
      console.error(
        "[AiQuestionService] Error stringifying payload for Gemini prompt:",
        error
      );
      return null;
    }
  }

  // Old prompt builder - _buildUserPromptForItemFocus - can be removed or commented out
  /*
  private static async _buildUserPromptForItemFocus(params: {
    item: IMenuItem;
    focus: string;
    questionTypes: string[];
    difficulty: string;
    menuId: string;
    restaurantId: string;
    targetQuestionCount: number;
    additionalContext?: string;
  }): Promise<string | null> {
    // ... (implementation of the old prompt builder)
    // This logic is now superseded by _buildPromptForCategoryBatch and the revised system prompt.
    console.warn("[AiQuestionService] _buildUserPromptForItemFocus is deprecated and should not be called directly in category-first approach.");
    return null; // Or throw an error
  }
  */

  // The interface GenerateQuestionsFromSopParams was moved out of the class.
  // The method definition remains the same.
  public static async generateQuestionsFromSopCategoriesService(
    params: GenerateQuestionsFromSopParams
  ): Promise<RawAiGeneratedQuestion[]> {
    if (!genAI || !model) {
      throw new AppError(
        "AI Service not initialized. Check GEMINI_API_KEY.",
        503
      );
    }

    const {
      sopDocumentId,
      selectedSopCategoryNames,
      targetQuestionCount,
      questionTypes,
      difficulty,
      restaurantId,
    } = params;

    const objectSopDocumentId = new Types.ObjectId(sopDocumentId);
    const objectRestaurantId = new Types.ObjectId(restaurantId);

    const sopDoc = await SopDocumentModel.findOne({
      _id: objectSopDocumentId,
      restaurantId: objectRestaurantId,
    }).lean<ISopDocument>();

    if (!sopDoc) {
      throw new AppError("SOP Document not found or access denied.", 404);
    }

    if (!sopDoc.categories || sopDoc.categories.length === 0) {
      throw new AppError("SOP Document has no categories defined.", 400);
    }

    let combinedSopText = "";
    let relevantCategoryNames: string[] = [];

    for (const catName of selectedSopCategoryNames) {
      const category = sopDoc.categories.find((c) => c.name === catName);
      if (category && category.content) {
        combinedSopText += `Category: ${category.name}\nText: ${category.content}\n\n`;
        relevantCategoryNames.push(category.name);
      } else {
        console.warn(
          `Category "${catName}" not found or empty in SOP Document ${sopDocumentId}. Skipping.`
        );
      }
    }

    if (!combinedSopText.trim()) {
      throw new AppError(
        "No content found in the selected SOP categories.",
        400
      );
    }

    const representativeCategoryName =
      relevantCategoryNames.length > 0
        ? relevantCategoryNames.join(", ")
        : "SOP Content";

    const userPromptString = `Please generate ${targetQuestionCount} questions of types [${questionTypes.join(
      ", "
    )}] with difficulty '${difficulty}'. Base the questions strictly on the following SOP content. Use "${representativeCategoryName}" as the category for the generated questions.

SOP Content Start:
${combinedSopText}
SOP Content End.
`;

    console.log(
      `[AiQuestionService - SOP] Sending prompt (first 500 chars):\n${userPromptString.substring(
        0,
        500
      )}`
    );

    const chat = model.startChat({
      tools: [{ functionDeclarations: [questionGenerationFunctionSchema] }],
      systemInstruction: {
        role: "system",
        parts: [{ text: _systemInstructionForSopQuestionGeneration }],
      } as any,
    });

    const result = await chat.sendMessage(userPromptString);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const parsedQuestions: RawAiGeneratedQuestion[] = [];
      for (const call of functionCalls) {
        if (call.name === "extract_generated_questions") {
          const questionsFromAi = (
            call.args as { questions: RawAiGeneratedQuestion[] }
          ).questions;
          if (Array.isArray(questionsFromAi)) {
            parsedQuestions.push(...questionsFromAi);
          }
        }
      }
      if (parsedQuestions.length === 0) {
        console.warn(
          "[AiQuestionService - SOP] AI responded with a function call, but no questions were extracted."
        );
        throw new AppError(
          "The AI did not generate any questions for the given SOP criteria. Try adjusting the input.",
          500
        );
      }
      return parsedQuestions;
    } else {
      console.error(
        "[AiQuestionService - SOP] AI response did not include the expected function call.",
        response.text()
      );
      throw new AppError(
        "AI response format error (SOP). Expected a function call.",
        500
      );
    }
  }
}

// MODIFIED: Export the class itself, not an instance
export default AiQuestionService;
