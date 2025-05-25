import { AppError } from "../utils/errorHandler";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  GenerativeModel,
  FunctionCallingMode,
  FunctionDeclarationSchema,
  FunctionDeclarationSchemaProperty,
} from "@google/generative-ai";

interface AICategory {
  name: string;
  content: string;
  subCategories?: AICategory[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAIInstance: GoogleGenerativeAI | null = null;
let geminiModelInstance: GenerativeModel | null = null;

if (GEMINI_API_KEY) {
  genAIInstance = new GoogleGenerativeAI(GEMINI_API_KEY);
  geminiModelInstance = genAIInstance.getGenerativeModel({
    model: "gemini-1.5-flash-latest", // Or your preferred model
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
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingMode.ANY, // Use ANY to allow the model to decide or NONE if you only want text responses (not for this case)
      },
    },
  });
} else {
  console.error(
    "AICategorizationService: GEMINI_API_KEY is not set. AI categorization will not function correctly."
  );
}

// Define the item schema for a category, which can be reused
const categoryItemSchemaProperties: Record<
  string,
  FunctionDeclarationSchemaProperty
> = {
  name: {
    type: FunctionDeclarationSchemaType.STRING,
    description: "The title or name of the SOP category/section.",
  },
  content: {
    type: FunctionDeclarationSchemaType.STRING,
    description:
      "The full text content belonging to this SOP category/section. If the section primarily contains sub-sections, this might be a brief overview or empty.",
  },
  subCategories: {
    type: FunctionDeclarationSchemaType.ARRAY,
    description:
      "An array of sub-category objects, following the same structure.",
    items: {
      type: FunctionDeclarationSchemaType.OBJECT,
      // For the schema definition, we define properties for one level of sub-categories.
      // The AI's understanding of recursion will come from the prompt and descriptions.
      properties: {
        name: { type: FunctionDeclarationSchemaType.STRING },
        content: { type: FunctionDeclarationSchemaType.STRING },
        // Not defining subCategories here to stop schema recursion for TS,
        // but AI should still infer deeper nesting if present in data based on overall prompt.
      },
      required: ["name", "content"],
    },
  },
};

const categoryItemSchema: FunctionDeclarationSchema = {
  type: FunctionDeclarationSchemaType.OBJECT,
  properties: categoryItemSchemaProperties,
  required: ["name", "content"],
};

const sopCategorizationFunctionSchema: FunctionDeclaration = {
  name: "extract_sop_categories_hierarchical",
  description:
    "Extracts a hierarchical array of categorized sections from an SOP document. Each section can have a name, its content, and an array of sub-categories.",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      categories: {
        type: FunctionDeclarationSchemaType.ARRAY,
        description: "An array of top-level SOP category objects.",
        items: categoryItemSchema,
      },
    },
    required: ["categories"],
  },
};

/**
 * Placeholder for your chosen AI provider's client.
 * Example for OpenAI:
 * import OpenAI from 'openai';
 * const openai = new OpenAI({
 *   apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is in an environment variable
 * });
 */

export class AICategorizationService {
  /**
   * Categorizes the given text using an AI model.
   * You need to replace the placeholder logic with an actual call to your AI service.
   *
   * @param textToCategorize The text content of the document.
   * @param prompt The detailed prompt to guide the AI model.
   * @returns A promise that resolves to an array of category objects.
   * @throws AppError if the AI service call fails.
   */
  static async categorizeText(
    textToCategorize: string,
    prompt: string
  ): Promise<AICategory[]> {
    if (!geminiModelInstance) {
      console.error(
        "AICategorizationService: Gemini AI Model not initialized. Cannot categorize text."
      );
      throw new AppError(
        "AI Categorization Service is not available due to configuration issues.",
        503 // Service Unavailable
      );
    }

    console.log(
      "AICategorizationService: Called with text length:",
      textToCategorize.length,
      "Prompt (snippet):",
      prompt.substring(0, 200) + "..."
    );

    try {
      const chat = geminiModelInstance.startChat({
        tools: [{ functionDeclarations: [sopCategorizationFunctionSchema] }],
        systemInstruction: {
          role: "system",
          parts: [{ text: prompt }], // Use the detailed prompt from SopDocumentService
        } as any, // Type assertion for systemInstruction parts
      });

      const result = await chat.sendMessage(textToCategorize);
      const response = result.response;

      if (
        !response.candidates ||
        !response.candidates[0] ||
        !response.candidates[0].content ||
        !response.candidates[0].content.parts
      ) {
        console.error(
          "AICategorizationService: Invalid response structure from Gemini:",
          JSON.stringify(response, null, 2)
        );
        throw new Error("Invalid or empty response structure from Gemini API.");
      }

      const part = response.candidates[0].content.parts[0];

      if (!part.functionCall) {
        console.error(
          "AICategorizationService: AI did not return a function call. Response part:",
          JSON.stringify(part, null, 2)
        );
        if (part.text) {
          console.error(
            "AICategorizationService: AI response text:",
            part.text
          );
        }
        throw new Error(
          "AI did not use the required function call. Response: " +
            (part.text || "No text content provided by AI.")
        );
      }

      const functionCall = part.functionCall;

      if (functionCall.name !== "extract_sop_categories_hierarchical") {
        console.error(
          `AICategorizationService: AI returned an unexpected function call: ${functionCall.name}. Args:`,
          JSON.stringify(functionCall.args, null, 2)
        );
        throw new Error(
          `AI called an unexpected function: ${functionCall.name}. Expected 'extract_sop_categories_hierarchical'.`
        );
      }

      const { categories } = functionCall.args as { categories: AICategory[] };

      if (!categories || !Array.isArray(categories)) {
        console.error(
          "AICategorizationService: 'categories' array not found or not an array in function call args. Args:",
          JSON.stringify(functionCall.args, null, 2)
        );
        throw new Error(
          "Extracted data from AI does not contain a valid 'categories' array."
        );
      }

      // Basic validation of the categories structure - needs to be recursive now
      const validateCategoriesRecursive = (cats: AICategory[]): boolean => {
        return cats.every((cat) => {
          const isValidTopLevel =
            typeof cat.name === "string" && typeof cat.content === "string";
          const areSubCategoriesValid =
            !cat.subCategories ||
            (Array.isArray(cat.subCategories) &&
              validateCategoriesRecursive(cat.subCategories));
          return isValidTopLevel && areSubCategoriesValid;
        });
      };

      if (!validateCategoriesRecursive(categories)) {
        console.error(
          "AICategorizationService: AI response category format is invalid (hierarchical).",
          categories
        );
        throw new AppError(
          "AI response format for categories is invalid (hierarchical).",
          500
        );
      }

      console.log(
        `AICategorizationService: Successfully received and parsed ${categories.length} categories from AI.`
      );
      return categories;
    } catch (error: any) {
      console.error(
        "AICategorizationService: Error during Gemini API call or processing:",
        error.message,
        error.stack
      );
      if (error instanceof AppError) throw error;
      throw new AppError(
        `AI categorization request failed: ${error.message}`,
        500
      );
    }
  }
}
