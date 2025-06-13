import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  FunctionDeclarationSchemaType,
} from "@google/generative-ai";

// Load environment variables
dotenv.config();

/**
 * Test AI processing with the full wine menu text
 */
async function testFullWineText() {
  console.log("🍷 Testing AI with Full Wine Menu Text");
  console.log("======================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Load the processed wine text
  const processedTextFile = path.join(
    __dirname,
    "../debug/wine-menu-processed-text.txt"
  );

  if (!fs.existsSync(processedTextFile)) {
    console.error(
      "❌ Processed wine text file not found. Run debug-pdf-text-extraction.ts first."
    );
    return;
  }

  const fullWineText = fs.readFileSync(processedTextFile, "utf-8");
  console.log(`📊 Full text length: ${fullWineText.length} characters`);

  // Simplified schema that works
  const wineMenuSchema = {
    name: "extract_menu_data",
    description: "Extract wine menu data from text",
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        menuName: {
          type: FunctionDeclarationSchemaType.STRING,
          description: "The menu name",
        },
        menuItems: {
          type: FunctionDeclarationSchemaType.ARRAY,
          description: "Array of wine items",
          items: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              itemName: { type: FunctionDeclarationSchemaType.STRING },
              itemPrice: { type: FunctionDeclarationSchemaType.NUMBER },
              itemType: { type: FunctionDeclarationSchemaType.STRING },
            },
            required: ["itemName", "itemType"],
          },
        },
      },
      required: ["menuName", "menuItems"],
    },
  };

  // Test with progressively larger chunks
  const testSizes = [
    { name: "First 2000 chars", text: fullWineText.substring(0, 2000) },
    { name: "First 5000 chars", text: fullWineText.substring(0, 5000) },
    { name: "First 10000 chars", text: fullWineText.substring(0, 10000) },
    { name: "Full text", text: fullWineText },
  ];

  for (const testCase of testSizes) {
    console.log(
      `\n🧪 Testing: ${testCase.name} (${testCase.text.length} chars)`
    );
    console.log("=".repeat(60));

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction:
          "Extract wine menu data using the extract_menu_data function.",
        tools: [{ functionDeclarations: [wineMenuSchema] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.ANY,
            allowedFunctionNames: ["extract_menu_data"],
          },
        },
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 8192,
        },
      });

      const prompt = `Extract wine data from this menu text using extract_menu_data function:\n\n${testCase.text}`;

      console.log(`📤 Sending prompt (${prompt.length} chars total)...`);
      const startTime = Date.now();

      const result = await model.generateContent(prompt);
      const processingTime = Date.now() - startTime;

      console.log(`📥 Response received in ${processingTime}ms`);
      console.log(
        `📊 Response text length: ${result.response.text()?.length || 0}`
      );
      console.log(
        `🔧 Function calls: ${result.response.functionCalls()?.length || 0}`
      );

      const functionCalls = result.response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        console.log("✅ Function call received!");
        const args = functionCalls[0].args as any;
        console.log(`   Menu Name: ${args.menuName}`);
        console.log(`   Items Found: ${args.menuItems?.length || 0}`);

        if (args.menuItems && args.menuItems.length > 0) {
          // Count by type
          const typeCount = args.menuItems.reduce((acc: any, item: any) => {
            acc[item.itemType] = (acc[item.itemType] || 0) + 1;
            return acc;
          }, {});
          console.log("   Items by type:", typeCount);

          console.log("   Sample items:");
          args.menuItems.slice(0, 5).forEach((item: any, idx: number) => {
            console.log(
              `     ${idx + 1}. ${item.itemName} - $${item.itemPrice || "?"} (${
                item.itemType
              })`
            );
          });
        }
      } else {
        console.log("❌ No function call received");
        const responseText = result.response.text();
        if (responseText) {
          console.log("📝 Plain text response:");
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
      console.error(`❌ Error with ${testCase.name}:`, error.message);

      // If it's a content too long error, try to understand the limit
      if (
        error.message.includes("too long") ||
        error.message.includes("token")
      ) {
        console.log("📏 Possible token limit exceeded");
      }
    }
  }

  console.log("\n🎯 Testing with explicit maxOutputTokens");
  console.log("=".repeat(50));

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "Extract wine menu data using extract_menu_data function. Process efficiently.",
      tools: [{ functionDeclarations: [wineMenuSchema] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
          allowedFunctionNames: ["extract_menu_data"],
        },
      },
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 12288, // Higher limit
      },
    });

    const prompt = `Extract wine items from this menu. Use extract_menu_data function:\n\n${fullWineText.substring(
      0,
      8000
    )}`;

    console.log("📤 Testing with higher maxOutputTokens...");
    const result = await model.generateContent(prompt);

    console.log(`📥 Response received`);
    console.log(
      `📊 Response text length: ${result.response.text()?.length || 0}`
    );
    console.log(
      `🔧 Function calls: ${result.response.functionCalls()?.length || 0}`
    );

    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      console.log("✅ Higher token limit works!");
      const args = functionCalls[0].args as any;
      console.log(`   Items: ${args.menuItems?.length || 0}`);
    } else {
      console.log("❌ Still no function call");
    }
  } catch (error: any) {
    console.error("❌ Error with higher token limit:", error.message);
  }

  console.log("\n🎉 Full wine text testing complete!");
}

// Run the test
if (require.main === module) {
  testFullWineText().catch(console.error);
}
