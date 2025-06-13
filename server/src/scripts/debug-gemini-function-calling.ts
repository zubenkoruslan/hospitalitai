import dotenv from "dotenv";
import { GoogleGenerativeAI, FunctionCallingMode } from "@google/generative-ai";

// Load environment variables
dotenv.config();

/**
 * Debug script to test Gemini 2.0 function calling configuration
 */
async function debugGeminiFunctionCalling() {
  console.log("🔧 Debugging Gemini 2.0 Function Calling");
  console.log("==========================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment");
    return;
  }

  console.log("✅ API Key found");
  console.log("🤖 Testing with gemini-2.0-flash\n");

  const genAI = new GoogleGenerativeAI(apiKey);

  // Simple function schema for testing
  const testFunctionSchema = {
    name: "extract_test_data",
    description: "Extract simple test data from text",
    parameters: {
      type: "object" as const,
      properties: {
        title: {
          type: "string" as const,
          description: "The title of the content",
        },
        items: {
          type: "array" as const,
          description: "Array of items found",
          items: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
              price: { type: "number" as const },
            },
            required: ["name"],
          },
        },
      },
      required: ["title", "items"],
    },
  };

  // Test configurations
  const testConfigs = [
    {
      name: "ANY mode with allowedFunctionNames",
      config: {
        model: "gemini-2.0-flash",
        tools: [{ functionDeclarations: [testFunctionSchema] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.ANY,
            allowedFunctionNames: ["extract_test_data"],
          },
        },
        generationConfig: {
          temperature: 0.0,
          topK: 1,
          topP: 1.0,
          maxOutputTokens: 1024,
        },
      },
    },
    {
      name: "AUTO mode",
      config: {
        model: "gemini-2.0-flash",
        tools: [{ functionDeclarations: [testFunctionSchema] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.AUTO,
          },
        },
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 1024,
        },
      },
    },
    {
      name: "ANY mode without allowedFunctionNames",
      config: {
        model: "gemini-2.0-flash",
        tools: [{ functionDeclarations: [testFunctionSchema] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.ANY,
          },
        },
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 1024,
        },
      },
    },
  ];

  const testText = `
Wine Menu
=========

Red Wines:
- Cabernet Sauvignon 2019 - $15.99
- Merlot 2020 - $12.50
- Pinot Noir 2021 - $18.00

White Wines:
- Chardonnay 2020 - $14.25
- Sauvignon Blanc 2021 - $13.75
`;

  const testPrompt = `
You must extract data from this menu text using the extract_test_data function.

CRITICAL: You MUST use the extract_test_data function call. Do not provide plain text responses.

Text to parse:
${testText}

Call the extract_test_data function with the extracted data.
`;

  for (const testConfig of testConfigs) {
    console.log(`\n🧪 Testing: ${testConfig.name}`);
    console.log("=".repeat(50));

    try {
      const model = genAI.getGenerativeModel(testConfig.config);

      console.log("📤 Sending test prompt...");
      const result = await model.generateContent(testPrompt);

      console.log(`📥 Response received`);
      console.log(
        `📊 Response text length: ${result.response.text()?.length || 0}`
      );
      console.log(
        `🔧 Function calls: ${result.response.functionCalls()?.length || 0}`
      );

      const functionCalls = result.response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        console.log("✅ Function call received!");
        functionCalls.forEach((call, index) => {
          console.log(`   Function ${index + 1}: ${call.name}`);
          console.log(`   Args: ${JSON.stringify(call.args, null, 2)}`);
        });
      } else {
        console.log("❌ No function call received");
        const responseText = result.response.text();
        if (responseText) {
          console.log("📝 Plain text response received:");
          console.log(
            `   "${responseText.substring(0, 200)}${
              responseText.length > 200 ? "..." : ""
            }"`
          );
        } else {
          console.log("🔍 Empty response received");
        }
      }
    } catch (error: any) {
      console.error(`❌ Error in ${testConfig.name}:`, error.message);
    }
  }

  console.log("\n🎯 Testing Simple System Instruction");
  console.log("=".repeat(50));

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are a function calling assistant. You MUST ALWAYS use function calls, never plain text responses.",
      tools: [{ functionDeclarations: [testFunctionSchema] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
          allowedFunctionNames: ["extract_test_data"],
        },
      },
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1024,
      },
    });

    const simplePrompt =
      "Extract data from this wine menu and call extract_test_data function:\n\nChardonnay 2020 - $15\nCabernet 2019 - $20";

    console.log("📤 Sending simple prompt with system instruction...");
    const result = await model.generateContent(simplePrompt);

    console.log(`📥 Response received`);
    console.log(
      `📊 Response text length: ${result.response.text()?.length || 0}`
    );
    console.log(
      `🔧 Function calls: ${result.response.functionCalls()?.length || 0}`
    );

    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      console.log("✅ Function call received with system instruction!");
      functionCalls.forEach((call, index) => {
        console.log(`   Function ${index + 1}: ${call.name}`);
        console.log(`   Args: ${JSON.stringify(call.args, null, 2)}`);
      });
    } else {
      console.log("❌ No function call received even with system instruction");
      const responseText = result.response.text();
      console.log(
        `📝 Response: "${responseText?.substring(0, 200) || "EMPTY"}"`
      );
    }
  } catch (error: any) {
    console.error("❌ Error with system instruction:", error.message);
  }

  console.log("\n🎉 Function calling debug complete!");
}

// Run the debug script
if (require.main === module) {
  debugGeminiFunctionCalling().catch(console.error);
}
