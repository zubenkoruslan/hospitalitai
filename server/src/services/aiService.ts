import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  SafetySetting,
  Part,
  GenerativeModel,
} from "@google/generative-ai";
import dotenv from "dotenv";
import { AI_MODEL_NAME } from "../utils/constants";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
  // Potentially throw an error or have a fallback, depending on how critical this service is at startup
}

const genAI = new GoogleGenerativeAI(API_KEY || ""); // Fallback to empty string if API_KEY is not found, though requests will fail

// Define the expected structure for a single generated question
export interface IGeneratedQuestion {
  questionText: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  // Potentially add 'explanation' if the AI can generate it
}

export interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

/**
 * Generates multiple-choice questions from SOP text using Google Gemini.
 * @param sopText The full text of the Standard Operating Procedure.
 * @param numberOfQuestions The desired number of questions to generate.
 * @returns A promise that resolves to an array of generated questions.
 * @throws Throws an error if API call fails, response parsing fails, or response is not in the expected format.
 */
export async function generateQuestionsFromSopText(
  sopText: string,
  numberOfQuestions: number = 10
): Promise<IGeneratedQuestion[]> {
  if (!API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Cannot generate questions."
    );
  }
  if (!sopText || sopText.trim().length === 0) {
    throw new Error("SOP text cannot be empty.");
  }
  if (numberOfQuestions <= 0) {
    throw new Error("Number of questions must be positive.");
  }

  const model = genAI.getGenerativeModel({
    model: AI_MODEL_NAME,
  });

  const prompt = `You are an expert instructional designer. Based on the following Standard Operating Procedure (SOP) document, generate ${numberOfQuestions} multiple-choice questions.
Each question should test understanding of key procedures, safety information, or important details within the SOP.
For each question, provide:
1. The question text.
2. Exactly four unique answer options.
3. Clearly indicate which one of the four options is the correct answer.

Format your response as a valid JSON array of objects, where each object represents a question and has the following structure:
{
  "questionText": "The question itself",
  "options": [
    { "text": "Option A text", "isCorrect": false },
    { "text": "Option B text", "isCorrect": true },
    { "text": "Option C text", "isCorrect": false },
    { "text": "Option D text", "isCorrect": false }
  ]
}

Ensure the JSON is well-formed. Ensure only one option is marked as correct for each question.

SOP Document Text:
---
${sopText}
---`;

  const generationConfig: GenerationConfig = {
    temperature: 0.6,
    topK: 1,
    topP: 1,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  const safetySettings: SafetySetting[] = [
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
  ];

  // Construct the request for generateContent
  const request = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
    safetySettings,
  };

  try {
    console.log("Sending request to Gemini API for question generation...");
    // @ts-ignore The SDK types can sometimes be tricky with exact request structure for generateContent vs generateContentStream
    const result = await model.generateContent(request);

    const response = result.response;
    // When responseMimeType: "application/json" is used, response.text() should directly be the JSON string.
    const responseText = response.text();
    console.log("Raw JSON response from Gemini:", responseText);

    const generatedQuestions: IGeneratedQuestion[] = JSON.parse(responseText);

    if (!Array.isArray(generatedQuestions)) {
      throw new Error("AI response is not a JSON array as expected.");
    }
    if (generatedQuestions.length === 0 && numberOfQuestions > 0) {
      console.warn("AI generated an empty array of questions.");
      // Depending on strictness, you might throw an error or return empty array
    }

    for (const q of generatedQuestions) {
      if (
        !q.questionText ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        q.options.filter((opt) => opt.isCorrect).length !== 1
      ) {
        console.error("Invalid question structure from AI:", q);
        throw new Error("AI generated a question with an invalid structure.");
      }
    }
    console.log(
      `Successfully generated ${generatedQuestions.length} questions.`
    );
    return generatedQuestions;
  } catch (error) {
    console.error("Error generating questions from SOP text:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("SAFETY")) {
      // Basic check, refine if needed
      throw new Error(
        `Question generation failed due to safety settings. Details: ${errorMessage}`
      );
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse AI response as JSON. Check logs for raw Gemini response.`
      );
    }
    throw new Error(
      `Failed to generate questions from AI. Details: ${errorMessage}`
    );
  }
}

// Example usage (for testing purposes, remove or comment out in production)
// async function testGeneration() {
//   const sampleSop = "SOP Document: \n1. Always wear a helmet. \n2. Check tire pressure before riding. \n3. Use hand signals for turns. \n4. Do not ride at night without lights.";
//   try {
//     const questions = await generateQuestionsFromSopText(sampleSop, 2);
//     console.log(JSON.stringify(questions, null, 2));
//   } catch (e) {
//     console.error("Test generation failed:", e);
//   }
// }
// // testGeneration(); // Uncomment to run test if this file is run directly
