import dotenv from "dotenv";
import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  FunctionDeclarationSchemaType,
} from "@google/generative-ai";

// Load environment variables
dotenv.config();

/**
 * Test AI processing with actual wine menu text format
 */
async function testSpecificWineText() {
  console.log("🍷 Testing AI with Specific Wine Menu Text Format");
  console.log("==================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Simplified schema based on working debug test
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
              wineStyle: { type: FunctionDeclarationSchemaType.STRING },
              wineRegion: { type: FunctionDeclarationSchemaType.STRING },
              wineVintage: { type: FunctionDeclarationSchemaType.NUMBER },
            },
            required: ["itemName", "itemType"],
          },
        },
      },
      required: ["menuName", "menuItems"],
    },
  };

  // Sample of the problematic wine text (simplified)
  const wineTextSample = `
SPARKLING 
125ML  |  BOTTLE
NV  Prosecco Brut Biologico Valdobbiadene Superiore   Veneto, Italy                        9         45
NV Goring Rosé, Family Release, Wiston Estate Sussex, England                  12.5       62
2017 Chardonnay, Sanford Santa Rita Hills, USA 16.5 79

WHITE WINE
2019   Château La Sauvageonne, Grand Vin Blanc,   Languedoc, France 14.5       70 
2019  Meursault Vieilles Vignes, Domaine Florent Garaudet Burgundy, France 23.5 117

RED WINE  
2018 Saint-Joseph, Les Royes, Domaine Courbis Rhône, France                               78
2015 Pomerol, Château du Domaine de l'Église Bordeaux, France                          134
`;

  console.log("📝 Testing with wine text sample:");
  console.log("=".repeat(60));
  console.log(wineTextSample);
  console.log("=".repeat(60));

  const testConfigs = [
    {
      name: "Simple system instruction",
      systemInstruction:
        "Extract wine menu data using the extract_menu_data function. For prices, look for number patterns after wine names.",
      prompt: `Extract wine data from this menu text. Call extract_menu_data function:\n\n${wineTextSample}`,
    },
    {
      name: "Detailed wine instruction",
      systemInstruction:
        "You are a wine menu parser. Extract wine items using extract_menu_data function. Parse prices that appear as numbers after wine names (e.g., '9 45' means 9 for glass, 45 for bottle).",
      prompt: `Parse this wine menu and extract items using extract_menu_data function:\n\n${wineTextSample}`,
    },
    {
      name: "Ultra-simple instruction",
      systemInstruction:
        "Call extract_menu_data function to extract wine data.",
      prompt: `Wine menu:\n${wineTextSample}\n\nExtract using extract_menu_data function.`,
    },
  ];

  for (const config of testConfigs) {
    console.log(`\n🧪 Testing: ${config.name}`);
    console.log("=".repeat(50));

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: config.systemInstruction,
        tools: [{ functionDeclarations: [wineMenuSchema] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.ANY,
            allowedFunctionNames: ["extract_menu_data"],
          },
        },
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 4096,
        },
      });

      console.log("📤 Sending prompt...");
      const result = await model.generateContent(config.prompt);

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
          const args = call.args as any;
          console.log(`   Menu Name: ${args.menuName}`);
          console.log(`   Items Found: ${args.menuItems?.length || 0}`);
          if (args.menuItems && args.menuItems.length > 0) {
            console.log("   First few items:");
            args.menuItems.slice(0, 3).forEach((item: any, idx: number) => {
              console.log(
                `     ${idx + 1}. ${item.itemName} - ${
                  item.itemPrice || "No price"
                } (${item.itemType})`
              );
            });
          }
        });
      } else {
        console.log("❌ No function call received");
        const responseText = result.response.text();
        if (responseText) {
          console.log("📝 Plain text response:");
          console.log(
            `   "${responseText.substring(0, 300)}${
              responseText.length > 300 ? "..." : ""
            }"`
          );
        } else {
          console.log("🔍 Empty response received");
        }
      }
    } catch (error: any) {
      console.error(`❌ Error in ${config.name}:`, error.message);
    }
  }

  console.log("\n🎯 Testing with even simpler content");
  console.log("=".repeat(50));

  const simpleWineText = `
RED WINE
2018 Cabernet Sauvignon, Napa Valley 25
2019 Pinot Noir, Oregon 18
2020 Merlot, Washington 22
`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "Extract wine menu items using extract_menu_data function.",
      tools: [{ functionDeclarations: [wineMenuSchema] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
          allowedFunctionNames: ["extract_menu_data"],
        },
      },
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 2048,
      },
    });

    console.log("📤 Testing with ultra-simple wine text...");
    const result = await model.generateContent(
      `Extract wine data:\n${simpleWineText}\n\nUse extract_menu_data function.`
    );

    console.log(`📥 Response received`);
    console.log(
      `📊 Response text length: ${result.response.text()?.length || 0}`
    );
    console.log(
      `🔧 Function calls: ${result.response.functionCalls()?.length || 0}`
    );

    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      console.log("✅ Simple content works!");
      const args = functionCalls[0].args as any;
      console.log(`   Items: ${args.menuItems?.length || 0}`);
    } else {
      console.log("❌ Even simple content failed");
      const responseText = result.response.text();
      console.log(
        `📝 Response: "${responseText?.substring(0, 200) || "EMPTY"}"`
      );
    }
  } catch (error: any) {
    console.error("❌ Error with simple content:", error.message);
  }

  console.log("\n🎉 Wine text format testing complete!");
}

// Run the test
if (require.main === module) {
  testSpecificWineText().catch(console.error);
}
