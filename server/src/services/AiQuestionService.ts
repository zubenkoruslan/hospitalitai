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
                "An array of option objects for multiple-choice or true/false questions.",
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
                "The category the question pertains to (should match the input category).",
            },
            difficulty: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The difficulty level of the question (e.g., 'easy', 'medium', 'hard').",
            },
            explanation: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "(Optional) A brief explanation for the correct answer.",
            },
          },
          required: [
            "questionText",
            "questionType",
            "options",
            "category",
            "difficulty",
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

// System instruction for the AI
const _systemInstructionForQuestionGeneration = `System: You are an expert AI assistant tasked with generating educational questions about restaurant menu items. Your goal is to create high-quality questions based on provided menu content, specific focus areas, desired question types, and difficulty levels.

**CRITICAL INSTRUCTION: You MUST use the 'extract_generated_questions' function to provide your response. Do NOT provide a text-based response or explanation. Your ONLY output should be the function call with the generated question data. Adhere strictly to the schema provided for the 'extract_generated_questions' function.**

Input Context Provided per Request:
- Menu Item Context: Details about specific menu items (name, description, ingredients, allergens, price, etc.).
- Category: The menu category the item belongs to (e.g., "Starters", "Main Courses", "Beverages").
- Focus Area: The specific aspect to generate questions about (e.g., "ingredients", "allergens", "preparation methods", "culinary knowledge", "pricing").
- Target Question Count: The desired number of questions to generate for this specific context (usually 1-3 per call).
- Question Types: The allowed types of questions (e.g., "multiple-choice-single", "true-false").
- Difficulty Level: The desired difficulty (e.g., "easy", "medium", "hard").
- Additional Context/Instructions: Any specific user-provided notes.

Instructions for Question Generation:
1.  **Understand the Context**: Carefully analyze all provided information for the menu item(s), category, focus area, etc.
2.  **Adhere to Focus Area**: Ensure questions directly relate to the specified 'Focus Area'.
    *   'ingredients': Questions about what's in the dish.
    *   'preparation methods': How the dish is likely cooked (e.g., grilled, fried, baked). Infer if not explicit.
    *   'allergens': Common allergens present or potentially present.
    *   'culinary knowledge': Broader food knowledge related to the item or its components.
    *   'pricing': Questions about the item's price or value (less common, use if specified).
    *   'source/origin': Where key ingredients come from, if mentioned or culturally significant.
3.  **Match Question Type(s)**: Generate questions matching the allowed 'Question Types'.
    *   For 'multiple-choice-single', provide 3-4 options, with only one correct answer. Ensure distractors are plausible but incorrect.
    *   For 'true-false', create a clear statement that is definitively true or false based on the context. Provide one "True" option and one "False" option, marking the correct one.
4.  **Set Difficulty**: Align the question's complexity with the specified 'Difficulty Level'.
    *   'easy': Recall-based, straightforward facts from the provided text.
    *   'medium': Requires some inference or combining information.
    *   'hard': May require deeper understanding, application of knowledge, or recognizing subtle details.
5.  **Question Text**: Phrase questions clearly and unambiguously.
6.  **Options (for multiple-choice/true-false)**:
    *   Provide the specified number of options.
    *   Exactly one option must be marked 'isCorrect: true'.
    *   Options text should be concise.
7.  **Category**: The 'category' field in your output MUST match the input 'Category' you were given for the current item.
8.  **Explanation (Optional but Recommended)**: Provide a brief explanation for why the correct answer is correct, especially for 'medium' or 'hard' questions.
9.  **Target Count**: Aim to generate the 'Target Question Count'. If the context is too limited for that many high-quality questions for the given focus, it's better to generate fewer good questions than to force poor ones.
10. **Output**: Use ONLY the 'extract_generated_questions' function call for your response.

Example (Illustrative - details will vary based on actual input):
If asked to generate 1 'multiple-choice-single' question about 'ingredients' for a 'Classic Burger' in 'Main Courses', difficulty 'easy':
Prompt might include: Item: Classic Burger (Beef patty, lettuce, tomato, cheese, bun). Category: Main Courses. Focus: ingredients. Count: 1. Type: multiple-choice-single. Difficulty: easy.

Expected function call (simplified):
extract_generated_questions({
  questions: [
    {
      questionText: "Which of these is a key ingredient in the Classic Burger?",
      questionType: "multiple-choice-single",
      options: [
        { text: "Chicken patty", isCorrect: false },
        { text: "Beef patty", isCorrect: true },
        { text: "Fish fillet", isCorrect: false }
      ],
      category: "Main Courses",
      difficulty: "easy",
      explanation: "The Classic Burger is explicitly listed with a beef patty."
    }
  ]
})
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
          "The AI question generation service is not properly configured. Please check the server logs and GEMINI_API_KEY.",
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
        questionText: `Error during AI question generation: ${error.message}. This is a mock question.`,
        questionType: "multiple-choice-single",
        options: [
          { text: "Option A (mock error)", isCorrect: true },
          { text: "Option B (mock error)", isCorrect: false },
        ],
        category: "Error",
        difficulty: "easy",
        explanation: `An error occurred while communicating with the AI service or processing its response. Details: ${error.message}`,
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
      itemIds,
      questionFocusAreas,
      targetQuestionCount, // Overall target
      questionTypes,
      difficulty,
      additionalContext, // User's additional context
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
      // Potentially throw new AppError("AI Service not available.", 503);
      // Or return a specific error-indicating question structure if preferred by frontend
      return [
        {
          questionText:
            "AI Service is currently unavailable. Please try again later.",
          questionType: "multiple-choice-single",
          options: [
            { text: "OK", isCorrect: true },
            { text: "Retry", isCorrect: false }, // Added a second option
          ],
          category: "Service Error",
          difficulty: "easy",
          explanation:
            "The AI model (Gemini) could not be initialized, likely due to a missing API key or configuration issue.",
        },
      ];
    }

    // 1. Fetch MenuDocument
    const menu = await MenuModel.findOne({
      _id: new mongoose.Types.ObjectId(menuId),
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      isActive: true,
    }).lean<IMenu>();

    if (!menu) {
      console.error(
        `[AiQuestionService] Active menu with ID ${menuId} not found for restaurant ${restaurantId}.`
      );
      throw new AppError( // Throwing AppError for better handling
        `Active menu with ID ${menuId} not found for restaurant ${restaurantId}.`,
        404
      );
    }

    // Determine categories to process
    const categoriesToProcess =
      categories && categories.length > 0 ? categories : menu.categories;
    if (!categoriesToProcess || categoriesToProcess.length === 0) {
      console.warn(
        "[AiQuestionService] No categories specified or found on the menu to process for AI question generation."
      );
      return [];
    }

    let allRawQuestions: RawAiGeneratedQuestion[] = [];

    // Calculate how many questions to request per API call.
    // We have a total targetQuestionCount. We'll distribute this across category/focus area combinations.
    // For simplicity, let's aim for 1-2 questions per specific LLM call.
    const questionsPerLlmCall = 1; // Can be adjusted, e.g., 2 or 3

    console.log(
      `[AiQuestionService] Processing categories: ${categoriesToProcess.join(
        ", "
      )}`
    );
    console.log(
      `[AiQuestionService] Processing focus areas: ${questionFocusAreas.join(
        ", "
      )}`
    );

    for (const category of categoriesToProcess) {
      console.log(`[AiQuestionService] Processing category: ${category}`);
      // Fetch menu items for the current category and menu
      // Only fetch active items. If itemIds are provided, filter by those as well.
      const itemQuery: any = {
        menuId: new mongoose.Types.ObjectId(menuId),
        category: category, // Corrected: Query directly on the category string field
        isActive: true,
      };
      if (itemIds && itemIds.length > 0) {
        itemQuery._id = {
          $in: itemIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }

      const menuItemsForCategory = await MenuItemModel.find(itemQuery)
        .limit(20) // Limit items per category to avoid overly large prompts
        .lean<IMenuItem[]>();

      if (!menuItemsForCategory || menuItemsForCategory.length === 0) {
        console.warn(
          `[AiQuestionService] No active menu items found for category "${category}" in menu ${menuId}. Skipping this category.`
        );
        continue;
      }

      for (const focusArea of questionFocusAreas) {
        if (allRawQuestions.length >= targetQuestionCount) {
          console.log(
            "[AiQuestionService] Reached overall target question count. Stopping generation."
          );
          break; // Break from focus areas loop
        }

        console.log(
          `[AiQuestionService] Processing focus area: ${focusArea} for category: ${category}`
        );

        // Construct context from menu items for the prompt
        let itemsContext = menuItemsForCategory
          .map(
            (item) =>
              `Item Name: ${item.name}\\nDescription: ${
                item.description || "N/A"
              }\\nIngredients: ${
                (item.ingredients || []).join(", ") || "N/A"
              }\\nPrice: ${item.price || "N/A"}\\nAllergens: ${
                (item.allergens || []).join(", ") || "N/A"
              }`
          )
          .join("\\n\\n---\\n\\n");

        if (itemsContext.length > 15000) {
          // Limit context size if it's extremely large
          itemsContext =
            itemsContext.substring(0, 15000) + "... (context truncated)";
        }

        const currentTargetCountForThisCall = Math.min(
          questionsPerLlmCall,
          targetQuestionCount - allRawQuestions.length
        );
        if (currentTargetCountForThisCall <= 0) continue;

        // Construct the detailed prompt for the LLM
        const promptParts = [
          `You are generating questions for the menu category: "${category}".`,
          `The specific focus for these questions is: "${focusArea}".`,
          `Please generate approximately ${currentTargetCountForThisCall} question(s).`,
          `Allowed question types: ${questionTypes.join(", ")}.`,
          `Desired difficulty level: "${difficulty}".`,
        ];

        if (additionalContext) {
          promptParts.push(
            `User's additional instructions: "${additionalContext}"`
          );
        }

        promptParts.push(
          `\\nMenu Item Context for category "${category}":\\n${itemsContext}`
        );

        const finalPrompt = promptParts.join("\\n");

        console.log(
          `[AiQuestionService] Attempting to call LLM for category "${category}", focus "${focusArea}". Target: ${currentTargetCountForThisCall} questions.`
        );
        // console.debug("[AiQuestionService] Full prompt for LLM:", finalPrompt); // Potentially too verbose

        try {
          const generatedQuestions = await _callGeminiApiForQuestionGeneration(
            finalPrompt
          );

          if (generatedQuestions && generatedQuestions.length > 0) {
            const validQuestions = generatedQuestions.filter(
              (q) => q.category !== "Error"
            ); // Filter out mock error questions
            console.log(
              `[AiQuestionService] Received ${validQuestions.length} valid questions from LLM for category "${category}", focus "${focusArea}".`
            );
            // Ensure AI respected the category and difficulty, or override/log
            validQuestions.forEach((q) => {
              if (q.category !== category) {
                console.warn(
                  `[AiQuestionService] AI returned question with category "${q.category}" but expected "${category}". Overriding.`
                );
                q.category = category;
              }
              if (q.difficulty !== difficulty) {
                console.warn(
                  `[AiQuestionService] AI returned question with difficulty "${q.difficulty}" but expected "${difficulty}". Overriding.`
                );
                q.difficulty = difficulty;
              }
            });

            allRawQuestions.push(...validQuestions);
          } else {
            console.warn(
              `[AiQuestionService] LLM call for category "${category}", focus "${focusArea}" returned no questions or only error placeholders.`
            );
          }
        } catch (error: any) {
          console.error(
            `[AiQuestionService] Error calling LLM for category "${category}", focus "${focusArea}":`,
            error.message
          );
          // Decide if one error should stop all, or just log and continue.
          // For now, logging and continuing.
        }
      } // End of focus areas loop
      if (allRawQuestions.length >= targetQuestionCount) {
        break; // Break from categories loop
      }
    } // End of categories loop

    if (allRawQuestions.length === 0) {
      console.warn(
        "[AiQuestionService] No questions were generated by the AI after processing all categories and focus areas."
      );
      // Optionally, throw an error or return a specific message if no questions are generated at all.
      // This could be a user-facing error like "The AI could not generate questions based on the provided menu/criteria."
    } else {
      console.log(
        `[AiQuestionService] Total AI questions generated: ${allRawQuestions.length}`
      );
    }

    return allRawQuestions.slice(0, targetQuestionCount); // Ensure we don't exceed overall target
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
