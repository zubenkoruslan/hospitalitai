import QuestionBankModel, { IQuestionBank } from "../models/QuestionBankModel";
import QuestionModel, {
  IQuestion,
  QuestionType,
  IOption,
  KnowledgeCategory,
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
import { AI_MODEL_NAME } from "../utils/constants";
import {
  QuestionTaggingService,
  TaggingContext,
} from "./questionTaggingService";

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
const AI_CALL_BATCH_SIZE = 3; // Adjusted for potentially larger category-based payloads
const DELAY_BETWEEN_BATCHES_MS = 5000; // Adjusted for potentially larger category-based payloads
// --- END Batch Configuration ---

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: AI_MODEL_NAME,
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

// System instruction for the AI - REVISED with Knowledge Category Integration
const _systemInstructionForQuestionGeneration = `System: You are an AI assistant specialized in creating quiz questions for hospitality staff training with knowledge category awareness. Your goal is to generate clear, accurate, and relevant questions based *strictly* on the provided menu item information and the additional context of other items/ingredients from the same menu.

**KNOWLEDGE CATEGORIES**: Focus on these four knowledge categories when creating questions:
1. **Food Knowledge**: Ingredients, allergens, nutrition, preparation methods, menu items, dietary restrictions, cooking methods, food safety
2. **Beverage Knowledge**: Coffee, tea, soft drinks, juices, preparation techniques, equipment, temperature requirements
3. **Wine Knowledge**: Varieties, regions, vintages, pairings, service, storage, tasting notes, production
4. **Procedures Knowledge**: Safety protocols, hygiene standards, service procedures, opening/closing procedures, emergency protocols, customer service

**CRITICAL INSTRUCTION: You MUST use the 'extract_generated_questions' function to provide your response. Do NOT provide a text-based response or explanation. Your ONLY output should be the function call with the generated question data. Adhere strictly to the schema provided for the 'extract_generated_questions' function.**

You will be provided with the following for each question generation request:
- 'itemsInCategory': An array of objects, where each object contains details of a menu item within the target category (e.g., name, description, ingredients list, allergens).
- 'categoryName': The menu category these items belong to.
- 'questionFocusAreas': A list of general themes or aspects to generate questions about (e.g., ["Ingredients", "Allergens"]).
- 'questionTypes': The types of questions to generate (e.g., ["multiple-choice-single", "true-false"]).
- 'contextualItemNames' (for MCQ distractors): An array of other item names from the menu (potentially from other categories).
- 'contextualIngredients' (for MCQ distractors): An array of ingredients found across other items on the menu.
- 'targetQuestionCount': The total number of questions to generate for this entire batch of items in the category.

All generated questions should be of 'medium' difficulty. The 'difficulty' field should NOT be included in your output data structure.

General Instructions for Question Generation:
1.  **Adherence**: Base questions on the 'itemsInCategory'. Distribute questions among the items in the category.
2.  **Correctness**: The CORRECT ANSWER must always be based *only* on the information provided for the specific item a question refers to.
3.  **Clarity**: Ensure questions are grammatically correct, clear, and unambiguous.
4.  **Explanation**: ALWAYS provide a brief 'explanation' for the correct answer, referencing the relevant item\'s details.
5.  **Focus Field**: In your output for each question, populate the 'focus' field with the primary theme of that question (e.g., "Ingredients", "Allergens", "Dietary Information"). This should align with the input 'questionFocusAreas'.
6.  **Category Field**: The 'category' field in your output MUST match the 'categoryName' provided in the input, or if a question is very specific to an item, that item\'s original category if it differs (though typically items in the batch share the categoryName).
7.  **Question Distribution**: Attempt to generate a balanced set of questions covering different items within the 'itemsInCategory' and different 'questionFocusAreas', up to the 'targetQuestionCount'.

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

Output Format (ensure your function call adheres to this for EACH question - OMIT the 'difficulty' field):
{
  "questionText": "...",
  "questionType": "multiple-choice-single", // or "true-false"
  "options": [ // For T/F: [{text: "True", isCorrect: true/false}, {text: "False", isCorrect: true/false}]
    {"text": "Option A", "isCorrect": false},
    {"text": "Option B", "isCorrect": true}
    // ... up to 4 options for MCQ
  ],
  "category": "match input categoryName, or specific item\'s category if distinct and relevant",
  "explanation": "Brief explanation of why the answer is correct, based on item details.",
  "focus": "derived focus of the question (e.g., 'Ingredients', 'Allergens')"
}

Generate 'targetQuestionCount' questions based on these instructions, distributing them across the provided 'itemsInCategory'.
`;

// ADDED: System instruction for SOP/Policy Question Generation with Knowledge Category Integration
const _systemInstructionForSopQuestionGeneration = `System: You are an AI assistant specialized in creating quiz questions for employee training based on Standard Operating Procedures (SOPs), policies, and instructional documents with knowledge category awareness.

**KNOWLEDGE CATEGORIES**: When creating questions, consider these four knowledge categories:
1. **Food Knowledge**: Food safety protocols, ingredient handling, nutrition guidelines, allergen management, preparation standards
2. **Beverage Knowledge**: Beverage preparation protocols, equipment operation, temperature standards, ingredient handling
3. **Wine Knowledge**: Wine service protocols, storage procedures, pairing guidelines, temperature requirements
4. **Procedures Knowledge**: Safety protocols, hygiene standards, service procedures, opening/closing procedures, emergency protocols, customer service standards

**CRITICAL INSTRUCTION: You MUST use the 'extract_generated_questions' function to provide your response. Do NOT provide a text-based response or explanation. Your ONLY output should be the function call with the generated question data. Adhere strictly to the schema provided for the 'extract_generated_questions' function.**

You will be provided with the following for each question generation request:
- 'sopCategoryName': The name of the category/section from the SOP document.
- 'sopCategoryText': The full text content of that SOP category/section.
- 'questionTypes': The types of questions to generate (e.g., ["multiple-choice-single", "true-false"]). If multiple types are provided, please try to alternate between them or provide a balanced mix for the 'targetQuestionCount'.
- 'targetQuestionCount': The total number of questions to generate from this SOP category text.

All generated questions should be of 'medium' difficulty. The 'difficulty' field should NOT be included in your output data structure.

General Instructions for Question Generation:
1.  **Adherence**: Base questions strictly on the provided 'sopCategoryText'.
2.  **Correctness**: The CORRECT ANSWER must always be verifiable from the 'sopCategoryText'.
3.  **Clarity**: Ensure questions are grammatically correct, clear, and unambiguous.
4.  **Explanation**: ALWAYS provide a brief 'explanation' for the correct answer, referencing the relevant part of the 'sopCategoryText' if possible.
5.  **Focus Field**: In your output for each question, populate the 'focus' field with a concise keyword or phrase describing the main topic of the question derived from the SOP (e.g., "Fire Extinguisher Types", "Hand Washing Steps", "Data Privacy Clause").
6.  **Category Field**: The 'category' field in your output MUST match the 'sopCategoryName' provided in the input.
7.  **Question Distribution**: If the 'sopCategoryText' is long, attempt to generate questions covering different aspects of it, up to the 'targetQuestionCount'.

Multiple Choice Questions (MCQ - 'multiple-choice-single'):
- Provide one correct answer and three plausible but incorrect distractor options (total 4 options).
- Distractors should be relevant to the SOP context but clearly incorrect according to the 'sopCategoryText'.

True/False Questions ('true-false'):
- Create a clear statement based on the 'sopCategoryText' that is definitively true or false according to that text.
- Provide two options: {"text": "True", "isCorrect": ...} and {"text": "False", "isCorrect": ...}.

Output Format (ensure your function call adheres to this for EACH question, using the existing 'extract_generated_questions' schema - OMIT the 'difficulty' field):
{
  "questionText": "...",
  "questionType": "multiple-choice-single", // or "true-false"
  "options": [ /* ...options... */ ],
  "category": "match input sopCategoryName",
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
  additionalContext?: string; // General context, might be used to augment prompts
  restaurantId: string; // Should be Types.ObjectId but passed as string from controller
}

// Interface for the structure of raw questions expected from the AI
// MODIFIED: Exporting this interface
export interface RawAiGeneratedQuestion {
  questionText: string;
  questionType: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  category: string;
  explanation?: string;
  focus?: string;
}

// This interface represents a single raw question object as expected from the AI
interface AiCallTask {
  userPromptString: string;
  categoryName: string;
  itemsInCategory: IMenuItem[];
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
  questionTypes: string[];
  // difficulty: string; // Field removed as AI now defaults to medium difficulty based on system prompt.
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
    if (!genAI || !model) {
      console.error(
        "AI Service not configured. Check GEMINI_API_KEY. Returning mock error question."
      );
      return [
        {
          questionText: "AI Service Error: Not configured",
          questionType: "true-false",
          options: [
            { text: "True", isCorrect: false },
            { text: "False", isCorrect: true },
          ],
          category: "Error",
          explanation:
            "AI Service not configured. Check GEMINI_API_KEY. (Max 500 chars)",
          focus: "Configuration",
        },
      ];
    }

    const {
      menuId,
      itemIds,
      categoriesToFocus,
      questionFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes,
      additionalContext,
      restaurantId,
    } = params;

    console.log(
      "[AiQuestionService] Starting AI question generation with params:",
      params
    );

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
            menuId,
            restaurantId,
            additionalContext,
          });

          if (userPromptString) {
            aiCallTasks.push({
              userPromptString,
              categoryName,
              itemsInCategory,
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
    } else if (itemIds && itemIds.length > 0) {
      // This is a simplified fallback for specific items. It will create one task per item.
      // For a more advanced fallback, you could group these specific items by their categories
      // and then use _buildPromptForCategoryBatch for each of those smaller, specific groups.
      console.warn(
        "[AiQuestionService] Categories not provided, falling back to specific item IDs. Each item will be processed individually."
      );
      for (const itemId of itemIds) {
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
            menuId,
            restaurantId,
            additionalContext,
          });
          if (userPromptString) {
            aiCallTasks.push({
              userPromptString,
              categoryName: categoryNameForItem,
              itemsInCategory: [itemDetail],
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
   * Saves an array of raw AI-generated questions to the database with a 'pending_review' status.
   * Associates them with a specific restaurant and, optionally, a specific question bank.
   * Includes AI-powered knowledge category tagging for Phase 3 functionality.
   *
   * @param rawQuestions Array of raw question data from AI.
   * @param restaurantIdString The ID of the restaurant.
   * @param questionBankId The ID of the question bank to associate these questions with.
   * @param taggingContext Optional context for knowledge category tagging (menu/SOP context).
   * @returns A promise that resolves to an array of the saved IQuestion documents.
   */
  public static async saveGeneratedQuestionsAsPendingReview(
    rawQuestions: RawAiGeneratedQuestion[],
    restaurantIdString: string,
    questionBankId: string, // MODIFIED: Made questionBankId mandatory
    taggingContext?: TaggingContext
  ): Promise<IQuestion[]> {
    const savedQuestions: IQuestion[] = [];
    const restaurantId = new mongoose.Types.ObjectId(restaurantIdString);
    const bankId = new mongoose.Types.ObjectId(questionBankId); // Convert to ObjectId

    for (const rawQ of rawQuestions) {
      try {
        // Basic validation for options
        if (!rawQ.options || rawQ.options.length === 0) {
          console.warn(
            `Skipping question "${rawQ.questionText}" due to missing or empty options.`
          );
          continue;
        }
        const hasCorrectOption = rawQ.options.some((opt) => opt.isCorrect);
        if (!hasCorrectOption) {
          console.warn(
            `Skipping question "${rawQ.questionText}" as no correct option was provided.`
          );
          continue;
        }

        // AI-powered knowledge category tagging
        const knowledgeTagging =
          QuestionTaggingService.determineKnowledgeCategory(rawQ.questionText, {
            ...taggingContext,
            existingCategories: rawQ.category ? [rawQ.category] : [],
          });

        console.log(
          `[AI Tagging] Question: "${rawQ.questionText.substring(0, 50)}..." ` +
            `→ ${knowledgeTagging.knowledgeCategory} (${(
              knowledgeTagging.confidence * 100
            ).toFixed(1)}% confidence)`
        );

        const questionData: Partial<IQuestion> = {
          questionText: rawQ.questionText,
          questionType: rawQ.questionType as QuestionType,
          options: rawQ.options.map(
            (opt: { text: string; isCorrect: boolean }) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              // _id will be generated by MongoDB upon saving new options
            })
          ) as Types.Array<IOption>, // Correctly cast to Mongoose Array of IOption
          categories: rawQ.category ? [rawQ.category] : [],
          explanation: rawQ.explanation,
          restaurantId: restaurantId,
          createdBy: "ai",
          status: "pending_review",
          questionBankId: bankId, // ADDED: Assign the bankId

          // Knowledge Analytics fields from AI tagging
          knowledgeCategory: knowledgeTagging.knowledgeCategory,
          knowledgeSubcategories: knowledgeTagging.knowledgeSubcategories,
          knowledgeCategoryAssignedBy: "ai",
          knowledgeCategoryAssignedAt: new Date(),
        };

        const newQuestion = new QuestionModel(questionData);
        const savedQuestion = await newQuestion.save();
        savedQuestions.push(savedQuestion.toObject() as IQuestion);
      } catch (error) {
        console.error(
          `Error saving AI generated question: ${error} Data: ${JSON.stringify(
            rawQ,
            null,
            2
          )}`
        );
        // Decide if one error should stop all, or just skip this question
        // For now, skipping and logging.
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
    menuId: string;
    restaurantId: string;
    additionalContext?: string;
  }): Promise<string | null> {
    const {
      categoryName,
      itemsInCategory,
      questionFocusAreas,
      targetQuestionCount,
      questionTypes,
      menuId,
      restaurantId,
      additionalContext,
    } = params;

    if (itemsInCategory.length === 0) {
      console.warn(
        `No items in category '${categoryName}' to build prompt. Skipping.`
      );
      return null;
    }

    const contextualData = await this._getContextualData(
      menuId,
      categoryName,
      itemsInCategory[0]?._id?.toString() || "", // Use first item for general context if available
      restaurantId
    );

    // Prepare items data for the prompt
    const itemsDataForPrompt = itemsInCategory.map((item) => ({
      name: item.name,
      description: item.description,
      ingredients: getIngredientNamesForPrompt(item.ingredients),
      allergens: item.allergens?.join(", ") || "None listed",
      // No need to include item.category here as it's passed as categoryName for the batch
    }));

    let promptString = `Category: ${categoryName}\n`;
    promptString += `Target Question Count: ${targetQuestionCount}\n`;
    promptString += `Question Types: ${questionTypes.join(", ")}\n`;
    promptString += `Focus Areas: ${questionFocusAreas.join(", ")}\n`;
    if (additionalContext) {
      promptString += `Additional Context: ${additionalContext}\n`;
    }
    promptString += `\nMenu Items in this Category (itemsInCategory):\n${JSON.stringify(
      itemsDataForPrompt,
      null,
      2
    )}\n`;
    promptString += `\nContextual Item Names (for distractor generation):\n${JSON.stringify(
      contextualData.contextualItemNames.slice(0, 30),
      null,
      2
    )}\n`;
    promptString += `\nContextual Ingredients (for distractor generation):\n${JSON.stringify(
      contextualData.contextualIngredients.slice(0, 50),
      null,
      2
    )}\n`;

    return promptString;
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
    const {
      sopDocumentId,
      selectedSopCategoryNames,
      targetQuestionCount,
      questionTypes,
      restaurantId,
    } = params;

    if (!genAI || !model) {
      console.error("AI Service (SOP) not configured. Check GEMINI_API_KEY.");
      return [
        {
          questionText: "AI Service Error (SOP): Not configured",
          questionType: "true-false",
          options: [
            { text: "True", isCorrect: false },
            { text: "False", isCorrect: true },
          ],
          category: "Error",
          explanation: "AI Service not configured. Check GEMINI_API_KEY.",
          focus: "Configuration",
        },
      ];
    }

    const sopDocument = await SopDocumentModel.findById(sopDocumentId).populate(
      "categories.subCategories"
    );
    if (!sopDocument) {
      throw new AppError("SOP Document not found", 404);
    }

    const allGeneratedQuestions: RawAiGeneratedQuestion[] = [];
    const categoriesToProcess = sopDocument.categories.filter((cat) =>
      selectedSopCategoryNames.includes(cat.name)
    );

    if (categoriesToProcess.length === 0) {
      console.warn(
        `No matching SOP categories found for names: ${selectedSopCategoryNames.join(
          ", "
        )}`
      );
      return []; // Or throw an error if at least one match is expected
    }

    for (const category of categoriesToProcess) {
      if (!category.content || category.content.trim() === "") {
        console.warn(
          `SOP Category '${category.name}' has no content. Skipping generation.`
        );
        continue;
      }
      try {
        const questionsFromCategory =
          await this.generateQuestionsFromSopCategoryText(
            category.name,
            category.content,
            targetQuestionCount, // This is total for all selected, might need adjustment if per category
            questionTypes
          );
        allGeneratedQuestions.push(...questionsFromCategory);
      } catch (error: any) {
        console.error(
          `Error generating questions for SOP category '${category.name}':`,
          error
        );
        // Optionally, add a placeholder error question for this category
        allGeneratedQuestions.push({
          questionText: `Failed to generate for SOP category: ${category.name}`,
          questionType: "true-false",
          options: [
            { text: "Error", isCorrect: true },
            { text: "N/A", isCorrect: false },
          ],
          category: category.name,
          explanation: `Generation failed. Error: ${error.message}`,
          focus: "Generation Error",
        });
      }
    }
    return allGeneratedQuestions;
  }

  public static async generateQuestionsFromSopCategoryText(
    sopCategoryName: string,
    sopCategoryText: string,
    targetQuestionCount: number,
    questionTypes: string[]
  ): Promise<RawAiGeneratedQuestion[]> {
    if (!genAI || !model) {
      console.error(
        "AI Service (SOP Text) not configured. Check GEMINI_API_KEY."
      );
      return [
        {
          questionText: "AI Service Error (SOP Text): Not configured",
          questionType: "true-false",
          options: [
            { text: "True", isCorrect: false },
            { text: "False", isCorrect: true },
          ],
          category: sopCategoryName,
          explanation: "AI Service not configured. Check GEMINI_API_KEY.",
          focus: "Configuration",
        },
      ];
    }

    const finalPromptPayload = {
      sopCategoryName,
      sopCategoryText,
      targetQuestionCount,
      questionTypes,
    };

    const userPromptString = JSON.stringify(finalPromptPayload);

    const chat = model.startChat({
      tools: [{ functionDeclarations: [questionGenerationFunctionSchema] }],
      systemInstruction: {
        role: "system",
        parts: [{ text: _systemInstructionForSopQuestionGeneration }],
      },
      history: [],
    });

    const result = await chat.sendMessage(userPromptString);
    const call = result.response.functionCalls()?.[0];

    if (call && call.name === "extract_generated_questions") {
      return (call.args as any).questions as RawAiGeneratedQuestion[];
    }
    console.warn(
      "AI (SOP Text) did not return the expected function call. Response:",
      JSON.stringify(result.response)
    );
    return [];
  }
}

// MODIFIED: Export the class itself, not an instance
export default AiQuestionService;
