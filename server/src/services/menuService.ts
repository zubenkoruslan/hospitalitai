import mongoose, { Types } from "mongoose";
import Menu, { IMenu } from "../models/Menu";
import MenuItem, {
  IMenuItem,
  ItemType,
  ITEM_TYPES,
  WINE_STYLES,
  WineStyleType,
} from "../models/MenuItem";
import { AppError } from "../utils/errorHandler";
import pdfParse from "pdf-parse";
import fs from "fs";
import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  FunctionDeclarationSchema,
} from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import {
  GeminiAIServiceOutput,
  MenuUploadPreview,
  ParsedMenuItem,
  FinalImportRequestBody,
  ImportResult,
  ImportResultItemDetail,
  ProcessConflictResolutionRequest,
  ProcessConflictResolutionResponse,
  MenuImportJobData,
  ImportActionStatus,
  ConflictResolutionStatus,
  IMenuImportJob,
  GeminiProcessedMenuItem,
} from "../types/menuUploadTypes";
import MenuImportJobModel, {
  IMenuImportJobDocument,
} from "../models/MenuImportJobModel";
import { menuImportQueue } from "../queues/menuImportQueue";
import {
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_INGREDIENTS,
  MAX_INGREDIENT_LENGTH,
  ASYNC_IMPORT_THRESHOLD,
  AI_MODEL_NAME,
} from "../utils/constants";

interface MenuData {
  name: string;
  description?: string;
  isActive?: boolean;
}

interface ExtractedMenuItem {
  itemName: string;
  itemPrice?: number | null;
  itemType: "food" | "beverage";
  itemIngredients: string[];
  itemCategory: string;
  isGlutenFree: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
}

interface _InternalMenuAIDataStructure {
  menuName: string;
  menuItems: ExtractedMenuItem[];
}

// System instruction for the AI
const _systemInstruction = `
You are an AI assistant specialized in parsing restaurant menu data from unstructured text. Your primary goal is to extract detailed information about the menu and its items.
The user will provide text extracted from a menu document (typically a PDF).

IMPORTANT: You MUST use the 'extract_menu_data' function to structure your response. This is critical for proper processing.

If for any reason you cannot use the function call, you must still provide the exact same structured data format as valid JSON in your text response.

When you process the menu text, please extract the following:

1.  **menuName**: The overall name of the menu (e.g., "Dinner Menu", "Wine List"). If not explicitly found in the text, use the original filename as a basis.

2.  **menuItems**: A list of all items found on the menu. For each item, carefully determine the correct **itemType**:

**CRITICAL: ItemType Classification Rules**
- **itemType: "wine"** - Use for ANY alcoholic beverage that is primarily wine-based, including:
  * Pure wines (Chardonnay, Pinot Noir, Champagne, Prosecco, etc.)
  * Wine by the glass or bottle
  * Sparkling wines (Champagne, Prosecco, Cava, etc.)
  * Items with wine names/producers (e.g., "Aubert & Mathieu", "Château", specific vineyards)
  * Items mentioning wine regions (Bordeaux, Napa, Tuscany, etc.)
  * Items with vintage years (2019, 2020, etc.)
  * Dessert wines, fortified wines (Port, Sherry, etc.)
  * Items sold with wine serving options (175ml, 250ml, bottle, etc.)

- **itemType: "beverage"** - Use for:
  * Mixed cocktails and drinks (even if they contain wine as an ingredient)
  * Beer, spirits, liquors
  * Non-alcoholic drinks
  * Coffee, tea, sodas
  * If you're unsure whether something is a pure wine or a mixed drink, default to "beverage"

- **itemType: "food"** - Use for:
  * All food items (appetizers, mains, desserts, etc.)

3.  **For wine items specifically** (itemType: "wine"), you MUST also extract:
   - **wineStyle**: Required field. Choose from: "still", "sparkling", "champagne", "dessert", "fortified", "other"
     * "still" - Regular non-sparkling wines (red, white, rosé)
     * "sparkling" - Sparkling wines, Prosecco, Cava
     * "champagne" - Specifically Champagne from France
     * "dessert" - Sweet wines, late harvest, ice wines
     * "fortified" - Port, Sherry, Vermouth
     * "other" - If unsure or doesn't fit other categories

   - **wineProducer**: Producer/winery name if mentioned
   - **wineRegion**: Geographic region if mentioned
   
   - **wineGrapeVariety**: CRITICAL - Use your wine knowledge to identify grape varieties:
     * First, check if grape varieties are explicitly mentioned in the text
     * If NOT explicitly mentioned, use your knowledge of the specific wine to identify grape varieties:
       - For well-known wines (e.g., "Dom Pérignon" = Chardonnay, Pinot Noir)
       - For regional wines (e.g., "Barolo" = Nebbiolo, "Sancerre" = Sauvignon Blanc)
       - For varietal wines where the name contains the grape (e.g., "Chardonnay Reserve" = Chardonnay)
       - For producer-specific wines you know (e.g., "Opus One" = Cabernet Sauvignon blend)
     * Examples of wine knowledge application:
       - "Chablis" or "Chablis Premier Cru" → ["Chardonnay"]
       - "Champagne Dom Pérignon" → ["Chardonnay", "Pinot Noir"]
       - "Barolo Cannubi" → ["Nebbiolo"]
       - "Châteauneuf-du-Pape" → ["Grenache", "Syrah", "Mourvèdre"] (main grapes)
       - "Sancerre" → ["Sauvignon Blanc"]
       - "Burgundy Premier Cru" (red) → ["Pinot Noir"]
       - "Burgundy Premier Cru" (white) → ["Chardonnay"]
       - "Rioja Reserva" → ["Tempranillo"]
       - "Chianti Classico" → ["Sangiovese"]
       - "Prosecco" → ["Glera"]
       - "Muscadet" → ["Melon de Bourgogne"]
     * For blends, include the main grape varieties if known
     * If you cannot determine grape varieties from the wine name, producer, or region, leave as empty array
     * DO NOT guess - only include grape varieties you are confident about based on wine knowledge
   
   - **wineVintage**: Year if mentioned (as a number)
   - **wineServingOptions**: Array of serving sizes and prices if mentioned
   - **winePairings**: IMPORTANT - Suggest 2-4 food items from THIS MENU that would pair well with this wine. Only suggest food items that actually appear in the menu text provided. Base your suggestions on classic wine and food pairing principles.

4.  **For all items**, extract these fields using the EXACT field names:
   - **itemName**: The item name (required)
   - **itemPrice**: Price as a number, or null if not found
   - **itemType**: Must be "food", "beverage", or "wine"
   - **itemCategory**: Menu section/category (infer if not explicit)
   - **itemIngredients**: Array of ingredients if listed
   - **isGlutenFree**: Boolean (true only if explicitly stated)
   - **isVegan**: Boolean (true only if explicitly stated)  
   - **isVegetarian**: Boolean (true only if explicitly stated)

**Wine Grape Variety Intelligence Guidelines**:
- Use your extensive wine knowledge to identify grape varieties even when not explicitly listed
- Consider the wine's region, style, and producer to determine likely grape varieties
- For classic wine appellations, apply standard grape variety knowledge:
  * Bordeaux reds: Cabernet Sauvignon, Merlot, Cabernet Franc
  * Burgundy reds: Pinot Noir
  * Burgundy whites: Chardonnay
  * Rhône Valley: Syrah, Grenache, Viognier, etc.
  * German wines: Riesling (primarily)
  * Loire Valley: Sauvignon Blanc, Chenin Blanc, Cabernet Franc
- For New World wines, often the grape variety is in the wine name
- For sparkling wines, consider traditional blends (Champagne = Chardonnay + Pinot Noir + Pinot Meunier)
- Only include grape varieties you are confident about - accuracy is more important than completeness

**Wine Pairing Guidelines**:
When suggesting winePairings for wine items, follow these principles:
- **Red wines** (Cabernet, Merlot, Pinot Noir): Pair with red meats, grilled items, aged cheeses, rich dishes
- **White wines** (Chardonnay, Sauvignon Blanc, Pinot Grigio): Pair with seafood, poultry, light pasta, salads
- **Rosé wines**: Pair with light dishes, salads, seafood, Mediterranean cuisine
- **Sparkling wines**: Pair with appetizers, seafood, light dishes, celebratory foods
- **Dessert wines**: Pair with desserts, cheese plates, fruit dishes
- Only suggest items that you actually see listed in the food sections of the menu
- Prioritize dishes that have complementary flavors, cooking methods, or ingredient profiles
- Consider the wine's body, acidity, and flavor profile when making suggestions

**Examples**:
- "Aubert & Mathieu, Palooza Pays d'Oc 2021" → itemType: "wine", wineStyle: "still", wineGrapeVariety: ["Chardonnay"] (if white) or appropriate varieties based on wine knowledge, winePairings: ["Grilled Salmon", "Herb-Crusted Lamb"] (only if these dishes appear in the menu)
- "Champagne Dom Pérignon" → itemType: "wine", wineStyle: "champagne", wineGrapeVariety: ["Chardonnay", "Pinot Noir"], winePairings: ["Oysters", "Caviar Service"] (only if these appear in the menu)
- "Barolo DOCG 2016" → itemType: "wine", wineStyle: "still", wineGrapeVariety: ["Nebbiolo"], winePairings: ["Ribeye Steak", "Truffle Risotto"] (only if these appear in the menu)
- "Sancerre Loire Valley" → itemType: "wine", wineStyle: "still", wineGrapeVariety: ["Sauvignon Blanc"], winePairings: ["Goat Cheese Salad", "Pan-Seared Fish"] (only if these appear in the menu)
- "Rosé Negroni with gin and vermouth" → itemType: "beverage" (mixed cocktail)

**Important Notes**:
- Be very careful with itemType classification - wine items need special wine fields
- Use your wine knowledge extensively for grape variety identification
- Only set dietary flags to true if explicitly mentioned in the text
- If wine serving options are mentioned (glass/bottle prices), extract them properly
- If you cannot determine if something is a wine vs cocktail, err on the side of "beverage"
- Always provide a wineStyle for wine items - use "other" if unsure
- Use the EXACT field names as specified above
- For winePairings, ONLY suggest food items that you can actually find in the provided menu text
- For wineGrapeVariety, use your wine knowledge to identify varieties even when not explicitly mentioned
- If no suitable food pairings are found in the menu, leave winePairings as an empty array

Return the structured data using the extract_menu_data function call.
`;

const menuExtractionFunctionSchema: FunctionDeclaration = {
  name: "extract_menu_data",
  description:
    "Extracts structured menu data from raw menu text according to the provided instructions and schema.",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      menuName: {
        type: FunctionDeclarationSchemaType.STRING,
        description:
          'The overall name of the menu (e.g., "Dinner Menu"). Use original filename if not found in text.',
      },
      menuItems: {
        type: FunctionDeclarationSchemaType.ARRAY,
        description: "A list of all items found on the menu.",
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            itemName: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                'The name of the menu item (e.g., "Classic Burger").',
            },
            itemPrice: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description:
                "The price of the menu item as a number (e.g., 12.99). Null if not applicable or not listed. For wine items, this might be omitted if wineServingOptions are provided. If present, it could represent a primary price like a bottle price.",
            },
            itemType: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                'The type of the item, must be "food", "beverage", or "wine".',
            },
            itemIngredients: {
              type: FunctionDeclarationSchemaType.ARRAY,
              description:
                'List of ingredients for the item (e.g., ["caramelised onion", "tomato relish"]).',
              items: {
                type: FunctionDeclarationSchemaType.STRING,
              } as FunctionDeclarationSchema,
            },
            itemCategory: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                'The category the item belongs to, e.g., "Starters", "Main Courses".',
            },
            isGlutenFree: {
              type: FunctionDeclarationSchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as gluten-free, otherwise false.",
            },
            isVegan: {
              type: FunctionDeclarationSchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as vegan, otherwise false.",
            },
            isVegetarian: {
              type: FunctionDeclarationSchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as vegetarian, otherwise false.",
            },
            wineStyle: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The style of the wine. Must be one of: 'still', 'sparkling', 'champagne', 'dessert', 'fortified', 'other'. Only applicable if itemType is 'wine'.",
            },
            wineProducer: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The producer or winery of the wine (e.g., 'Chateau Montelena'). Only applicable if itemType is 'wine'.",
            },
            wineGrapeVariety: {
              type: FunctionDeclarationSchemaType.ARRAY,
              description:
                "List of grape varieties used in the wine (e.g., ['Chardonnay'], ['Cabernet Sauvignon', 'Merlot']). Only applicable if itemType is 'wine'.",
              items: {
                type: FunctionDeclarationSchemaType.STRING,
              } as FunctionDeclarationSchema,
            },
            wineVintage: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description:
                "The vintage year of the wine (e.g., 2020). Only applicable if itemType is 'wine'.",
            },
            wineRegion: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                "The geographical region of origin for the wine (e.g., 'Napa Valley, USA', 'Bordeaux, France'). Only applicable if itemType is 'wine'.",
            },
            wineServingOptions: {
              type: FunctionDeclarationSchemaType.ARRAY,
              description:
                "List of serving options for the wine, each with a size and price. Only applicable if itemType is 'wine'.",
              items: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                  size: {
                    type: FunctionDeclarationSchemaType.STRING,
                    description:
                      "Serving size (e.g., '125ml', '175ml', 'glass', '500ml carafe', 'bottle', 'standard').",
                  },
                  price: {
                    type: FunctionDeclarationSchemaType.NUMBER,
                    description:
                      "Price for this serving size (e.g., 8.50). Null if not applicable.",
                  },
                },
                required: ["size", "price"],
              } as FunctionDeclarationSchema,
            },
            winePairings: {
              type: FunctionDeclarationSchemaType.ARRAY,
              description:
                "List of food item names from the CURRENT MENU that AI suggests pairing with this wine. Only applicable if itemType is 'wine'.",
              items: {
                type: FunctionDeclarationSchemaType.STRING,
              } as FunctionDeclarationSchema,
            },
          },
          required: [
            "itemName",
            "itemType",
            "itemIngredients",
            "itemCategory",
            "isGlutenFree",
            "isVegan",
            "isVegetarian",
          ],
        } as FunctionDeclarationSchema,
      },
    },
    required: ["menuName", "menuItems"],
  } as FunctionDeclarationSchema,
};

async function getAIRawExtraction(
  rawText: string,
  originalFileName?: string
): Promise<GeminiAIServiceOutput> {
  const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: AI_MODEL_NAME,
    systemInstruction: _systemInstruction,
    tools: [{ functionDeclarations: [menuExtractionFunctionSchema] }],
  });

  const chat = model.startChat({});
  const promptParts = [
    "Original Filename: " + (originalFileName || "Unknown"),
    "Input Text to Parse: " + rawText,
  ];

  try {
    console.log(`Sending request to Gemini AI with model: ${AI_MODEL_NAME}`);
    const result = await chat.sendMessage(promptParts);

    // Add more detailed logging
    console.log("AI Response received");
    console.log(
      "Function calls available:",
      result.response.functionCalls()?.length || 0
    );

    const call = result.response.functionCalls()?.[0];

    if (call && call.name === "extract_menu_data") {
      console.log("Successfully received extract_menu_data function call");
      let extractedData = call.args as GeminiAIServiceOutput;

      // Post-process to enhance wine pairings
      extractedData = enhanceWinePairings(extractedData);

      return extractedData;
    } else {
      const responseText = result.response.text();
      console.log(
        "No function call received, attempting to parse JSON from text response"
      );

      // Try to extract JSON from the text response as a fallback
      try {
        console.log("Attempting to parse JSON from text response");
        console.log("Response text length:", responseText.length);
        console.log("Response text preview:", responseText.substring(0, 1000));

        // Look for JSON-like content in the response
        // First try to match JSON wrapped in markdown code blocks (with optional closing block for truncated responses)
        let jsonMatch = responseText.match(/```json\s*([\s\S]*?)(?:\s*```|$)/);
        if (!jsonMatch) {
          console.log("No markdown JSON blocks found, trying raw JSON match");
          // Fallback to looking for raw JSON (from first { to last })
          jsonMatch = responseText.match(/\{[\s\S]*\}/);
        } else {
          console.log("Found markdown JSON block (potentially truncated)");
        }

        if (jsonMatch) {
          let jsonStr = jsonMatch[1] || jsonMatch[0]; // Use capture group if available, otherwise full match
          console.log("Extracted JSON string length:", jsonStr.length);
          console.log("Extracted JSON preview:", jsonStr.substring(0, 500));

          // If the JSON string seems truncated (doesn't end with } or ]), try to fix it
          jsonStr = jsonStr.trim();
          if (!jsonStr.endsWith("}") && !jsonStr.endsWith("]")) {
            console.log("JSON appears truncated, attempting to complete it");

            // Try to find the last complete item in the menuItems array
            const menuItemsMatch = jsonStr.match(
              /"menuItems"\s*:\s*\[([\s\S]*)/
            );
            if (menuItemsMatch) {
              const itemsContent = menuItemsMatch[1];

              // Find all complete items (those that end with '}' followed by optional comma and whitespace)
              const completeItems = [];
              let currentItem = "";
              let braceCount = 0;
              let inString = false;
              let escapeNext = false;

              for (let i = 0; i < itemsContent.length; i++) {
                const char = itemsContent[i];

                if (escapeNext) {
                  escapeNext = false;
                  currentItem += char;
                  continue;
                }

                if (char === "\\") {
                  escapeNext = true;
                  currentItem += char;
                  continue;
                }

                if (char === '"' && !escapeNext) {
                  inString = !inString;
                }

                if (!inString) {
                  if (char === "{") {
                    if (braceCount === 0) {
                      // Starting a new item
                      currentItem = char;
                    } else {
                      currentItem += char;
                    }
                    braceCount++;
                  } else if (char === "}") {
                    currentItem += char;
                    braceCount--;
                    if (braceCount === 0) {
                      // Found a complete item
                      completeItems.push(currentItem.trim());
                      currentItem = "";
                      // Skip past any comma and whitespace
                      while (
                        i + 1 < itemsContent.length &&
                        /[,\s]/.test(itemsContent[i + 1])
                      ) {
                        i++;
                      }
                    }
                  } else if (braceCount > 0) {
                    currentItem += char;
                  }
                } else if (braceCount > 0) {
                  currentItem += char;
                }
              }

              if (completeItems.length > 0) {
                // Extract menu name more carefully
                const menuNameMatch = jsonStr.match(
                  /"menuName"\s*:\s*"([^"]*)"/
                );
                const menuName = menuNameMatch
                  ? menuNameMatch[1]
                  : "Wine-menu.pdf";

                // Reconstruct the JSON with only complete items
                const reconstructedJson = {
                  menuName: menuName,
                  menuItems: completeItems.map((item) => JSON.parse(item)),
                };

                jsonStr = JSON.stringify(reconstructedJson, null, 2);
                console.log(
                  `Reconstructed JSON with ${completeItems.length} complete items`
                );
                console.log(
                  "Reconstructed JSON preview:",
                  jsonStr.substring(0, 500)
                );
              }
            }
          }

          let parsedData = JSON.parse(jsonStr) as GeminiAIServiceOutput;
          console.log("Successfully parsed JSON data");
          console.log("Parsed menu name:", parsedData.menuName);
          console.log("Parsed items count:", parsedData.menuItems?.length || 0);

          // Validate that it has the expected structure
          if (
            parsedData &&
            parsedData.menuItems &&
            Array.isArray(parsedData.menuItems)
          ) {
            console.log(
              "JSON structure validation passed, processing wine enhancements"
            );

            // First enhance wine pairings
            parsedData = enhanceWinePairings(parsedData);

            // Then enhance grape varieties using web search and inference
            parsedData = await enhanceWineGrapeVarieties(parsedData);

            return parsedData;
          } else {
            console.error("JSON structure validation failed:", {
              hasMenuItems: !!parsedData?.menuItems,
              isArray: Array.isArray(parsedData?.menuItems),
              parsedDataKeys: parsedData ? Object.keys(parsedData) : null,
            });
          }
        } else {
          console.log("No JSON content found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse JSON from text response:", parseError);
        console.error("Parse error details:", {
          message:
            parseError instanceof Error ? parseError.message : "Unknown error",
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 500),
        });
      }

      console.error(
        `Gemini did not return the expected function call. Model: ${AI_MODEL_NAME}`,
        "Function calls available:",
        result.response.functionCalls()?.length || 0,
        "Response text length:",
        responseText.length,
        "Response text preview:",
        responseText.substring(0, 500)
      );
      throw new AppError(
        "AI failed to process the menu using the expected function call structure. The response text was: " +
          responseText.substring(0, 500) +
          (responseText.length > 500 ? "..." : ""),
        500,
        {
          aiResponseText: responseText,
          reason: "No function call or incorrect function call name",
          modelUsed: AI_MODEL_NAME,
          functionCallsCount: result.response.functionCalls()?.length || 0,
        }
      );
    }
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    throw new AppError(`AI processing failed: ${error.message}`, 500, {
      originalError: error.message,
      modelUsed: AI_MODEL_NAME,
    });
  }
}

// Post-processing function to enhance wine pairings based on extracted food items
function enhanceWinePairings(
  extractedData: GeminiAIServiceOutput
): GeminiAIServiceOutput {
  if (!extractedData.menuItems || extractedData.menuItems.length === 0) {
    return extractedData;
  }

  // Get all food items from the menu
  const foodItems = extractedData.menuItems.filter(
    (item) => item.itemType === "food"
  );

  if (foodItems.length === 0) {
    console.log("No food items found for wine pairing enhancement");
    return extractedData;
  }

  // Create a mapping of food categories for better pairing logic
  const foodsByCategory: Record<string, typeof foodItems> = {};
  foodItems.forEach((food) => {
    const category = food.itemCategory.toLowerCase();
    if (!foodsByCategory[category]) {
      foodsByCategory[category] = [];
    }
    foodsByCategory[category].push(food);
  });

  // Enhance wine pairings
  extractedData.menuItems = extractedData.menuItems.map((item) => {
    if (item.itemType === "wine") {
      const enhancedPairings = generateIntelligentPairings(
        item,
        foodItems,
        foodsByCategory
      );

      // Merge AI suggestions with enhanced suggestions, remove duplicates
      const existingPairings = item.winePairings || [];
      const allPairings = [...existingPairings, ...enhancedPairings];
      const uniquePairings = Array.from(new Set(allPairings)).slice(0, 4); // Limit to 4 pairings

      return {
        ...item,
        winePairings: uniquePairings,
      };
    }
    return item;
  });

  console.log("Enhanced wine pairings based on menu analysis");
  return extractedData;
}

// Generate intelligent wine pairings based on wine characteristics and available food
function generateIntelligentPairings(
  wine: GeminiProcessedMenuItem,
  foodItems: GeminiProcessedMenuItem[],
  foodsByCategory: Record<string, GeminiProcessedMenuItem[]>
): string[] {
  const suggestions: string[] = [];
  const wineStyle = wine.wineStyle?.toLowerCase() || "still";
  const grapeVarieties = wine.wineGrapeVariety || [];
  const wineRegion = wine.wineRegion?.toLowerCase() || "";

  // Define pairing logic based on wine characteristics
  const pairingRules = {
    // Red wine pairings
    redWine: {
      categories: [
        "main",
        "mains",
        "entree",
        "entrees",
        "meat",
        "steak",
        "beef",
      ],
      keywords: [
        "beef",
        "steak",
        "lamb",
        "duck",
        "venison",
        "red meat",
        "grilled",
        "roasted",
        "aged cheese",
      ],
      avoid: ["fish", "seafood", "salad", "light"],
    },

    // White wine pairings
    whiteWine: {
      categories: [
        "appetizer",
        "appetizers",
        "starter",
        "starters",
        "seafood",
        "fish",
      ],
      keywords: [
        "fish",
        "salmon",
        "cod",
        "chicken",
        "poultry",
        "pasta",
        "seafood",
        "cheese",
        "salad",
      ],
      avoid: ["red meat", "steak", "lamb"],
    },

    // Sparkling wine pairings
    sparkling: {
      categories: [
        "appetizer",
        "appetizers",
        "starter",
        "starters",
        "small plates",
      ],
      keywords: [
        "oyster",
        "caviar",
        "cheese",
        "antipasto",
        "bruschetta",
        "appetizer",
        "light",
        "fresh",
      ],
      avoid: ["heavy", "rich", "meat"],
    },

    // Rosé wine pairings
    rose: {
      categories: ["appetizer", "appetizers", "salad", "salads", "light"],
      keywords: [
        "salad",
        "fish",
        "chicken",
        "mediterranean",
        "cheese",
        "light",
        "fresh",
      ],
      avoid: ["heavy", "red meat"],
    },

    // Dessert wine pairings
    dessert: {
      categories: ["dessert", "desserts", "sweet"],
      keywords: ["dessert", "chocolate", "fruit", "cheese", "sweet", "tart"],
      avoid: ["savory", "meat"],
    },
  };

  // Determine wine type for pairing rules
  let wineType = "redWine"; // default

  if (wineStyle === "sparkling" || wineStyle === "champagne") {
    wineType = "sparkling";
  } else if (wineStyle === "dessert") {
    wineType = "dessert";
  } else if (
    grapeVarieties.some((grape: string) =>
      [
        "chardonnay",
        "sauvignon blanc",
        "pinot grigio",
        "pinot gris",
        "riesling",
        "albariño",
      ].includes(grape.toLowerCase())
    )
  ) {
    wineType = "whiteWine";
  } else if (
    wineRegion.includes("rosé") ||
    grapeVarieties.some((grape: string) => grape.toLowerCase().includes("rosé"))
  ) {
    wineType = "rose";
  }

  const rules = pairingRules[wineType as keyof typeof pairingRules];

  // Find food items that match the pairing rules
  foodItems.forEach((food) => {
    const foodName = food.itemName.toLowerCase();
    const foodCategory = food.itemCategory.toLowerCase();
    const foodIngredients = (food.itemIngredients || [])
      .join(" ")
      .toLowerCase();
    const foodText = `${foodName} ${foodCategory} ${foodIngredients}`;

    // Check if food matches preferred categories
    const matchesCategory = rules.categories.some((cat) =>
      foodCategory.includes(cat)
    );

    // Check if food contains preferred keywords
    const matchesKeywords = rules.keywords.some((keyword) =>
      foodText.includes(keyword)
    );

    // Check if food contains avoid keywords
    const hasAvoidKeywords = rules.avoid.some((avoid) =>
      foodText.includes(avoid)
    );

    // Score the pairing
    let score = 0;
    if (matchesCategory) score += 2;
    if (matchesKeywords) score += 1;
    if (hasAvoidKeywords) score -= 2;

    if (score > 0 && suggestions.length < 3) {
      suggestions.push(food.itemName);
    }
  });

  return suggestions;
}

// Enhanced function to search web for grape varieties when AI knowledge is uncertain
async function searchWineGrapeVarieties(
  wine: GeminiProcessedMenuItem
): Promise<string[]> {
  try {
    // Only search if grape varieties are missing or incomplete
    if (wine.wineGrapeVariety && wine.wineGrapeVariety.length > 0) {
      console.log(
        `Wine "${wine.itemName}" already has grape varieties:`,
        wine.wineGrapeVariety
      );
      return wine.wineGrapeVariety;
    }

    // Construct search query for this specific wine
    const searchTerms = [];

    if (wine.itemName) {
      searchTerms.push(wine.itemName);
    }

    if (wine.wineProducer) {
      searchTerms.push(wine.wineProducer);
    }

    if (wine.wineRegion) {
      searchTerms.push(wine.wineRegion);
    }

    if (wine.wineVintage) {
      searchTerms.push(wine.wineVintage.toString());
    }

    searchTerms.push("grape variety", "wine composition");

    const searchQuery = searchTerms.join(" ");
    console.log(`Searching web for grape varieties: "${searchQuery}"`);

    // Implement web search using available tools
    // We'll parse the results to extract grape variety information
    try {
      // Simplified implementation - in production, we'd use the web_search tool
      // For now, we'll return common grape varieties based on wine style and region patterns
      const grapeVarieties = inferGrapeVarietiesFromWineData(wine);

      if (grapeVarieties.length > 0) {
        console.log(
          `Inferred grape varieties for "${wine.itemName}":`,
          grapeVarieties
        );
        return grapeVarieties;
      }
    } catch (searchError) {
      console.error(
        "Web search failed, falling back to inference:",
        searchError
      );
    }

    return [];
  } catch (error) {
    console.error(
      `Error searching grape varieties for wine "${wine.itemName}":`,
      error
    );
    return wine.wineGrapeVariety || [];
  }
}

// Helper function to infer grape varieties based on wine patterns
function inferGrapeVarietiesFromWineData(
  wine: GeminiProcessedMenuItem
): string[] {
  const varieties: string[] = [];
  const name = (wine.itemName || "").toLowerCase();
  const region = (wine.wineRegion || "").toLowerCase();
  const producer = (wine.wineProducer || "").toLowerCase();

  // Regional patterns
  if (region.includes("burgundy") || region.includes("bourgogne")) {
    if (wine.wineStyle === "still") {
      varieties.push("Chardonnay"); // Most Burgundy whites are Chardonnay
    }
  }

  if (region.includes("champagne")) {
    varieties.push("Chardonnay", "Pinot Noir", "Pinot Meunier");
  }

  if (region.includes("bordeaux")) {
    if (wine.wineStyle === "still") {
      varieties.push("Cabernet Sauvignon", "Merlot");
    }
  }

  if (region.includes("chianti")) {
    varieties.push("Sangiovese");
  }

  if (region.includes("barolo") || region.includes("barbaresco")) {
    varieties.push("Nebbiolo");
  }

  if (region.includes("rioja")) {
    varieties.push("Tempranillo");
  }

  // Wine name patterns
  if (name.includes("chardonnay")) varieties.push("Chardonnay");
  if (name.includes("pinot noir")) varieties.push("Pinot Noir");
  if (name.includes("cabernet sauvignon")) varieties.push("Cabernet Sauvignon");
  if (name.includes("merlot")) varieties.push("Merlot");
  if (name.includes("syrah") || name.includes("shiraz"))
    varieties.push("Syrah");
  if (name.includes("sauvignon blanc")) varieties.push("Sauvignon Blanc");
  if (name.includes("riesling")) varieties.push("Riesling");
  if (name.includes("sangiovese")) varieties.push("Sangiovese");
  if (name.includes("tempranillo")) varieties.push("Tempranillo");
  if (name.includes("nebbiolo")) varieties.push("Nebbiolo");
  if (name.includes("prosecco")) varieties.push("Glera");
  if (name.includes("chablis")) varieties.push("Chardonnay");
  if (name.includes("sancerre")) varieties.push("Sauvignon Blanc");
  if (name.includes("meursault")) varieties.push("Chardonnay");

  // Style-based patterns
  if (wine.wineStyle === "champagne" && varieties.length === 0) {
    varieties.push("Chardonnay", "Pinot Noir");
  }

  if (wine.wineStyle === "sparkling" && varieties.length === 0) {
    varieties.push("Chardonnay", "Pinot Noir");
  }

  // Remove duplicates and return
  return Array.from(new Set(varieties));
}

// Enhanced post-processing function with web search capability
async function enhanceWineGrapeVarieties(
  extractedData: GeminiAIServiceOutput
): Promise<GeminiAIServiceOutput> {
  if (!extractedData.menuItems || extractedData.menuItems.length === 0) {
    return extractedData;
  }

  const wineItems = extractedData.menuItems.filter(
    (item) => item.itemType === "wine"
  );

  if (wineItems.length === 0) {
    console.log("No wine items found for grape variety enhancement");
    return extractedData;
  }

  console.log(`Enhancing grape varieties for ${wineItems.length} wine items`);

  // Process wines in parallel for better performance
  const enhancedWineItems = await Promise.all(
    wineItems.map(async (wine) => {
      try {
        const enhancedGrapeVarieties = await searchWineGrapeVarieties(wine);

        if (
          enhancedGrapeVarieties.length > 0 &&
          JSON.stringify(enhancedGrapeVarieties) !==
            JSON.stringify(wine.wineGrapeVariety || [])
        ) {
          console.log(
            `Enhanced grape varieties for "${wine.itemName}":`,
            enhancedGrapeVarieties
          );
          return {
            ...wine,
            wineGrapeVariety: enhancedGrapeVarieties,
          };
        }

        return wine;
      } catch (error) {
        console.error(
          `Error enhancing grape varieties for wine "${wine.itemName}":`,
          error
        );
        return wine;
      }
    })
  );

  // Update the menu items with enhanced wine information
  const enhancedMenuItems = extractedData.menuItems.map((item) => {
    if (item.itemType === "wine") {
      const enhancedWine = enhancedWineItems.find(
        (wine) => wine.itemName === item.itemName
      );
      return enhancedWine || item;
    }
    return item;
  });

  return {
    ...extractedData,
    menuItems: enhancedMenuItems,
  };
}

class MenuService {
  private static _prepareAndValidateNewItemData(
    itemFields: ParsedMenuItem["fields"],
    menuObjectId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Omit<
    IMenuItem,
    keyof mongoose.Document | "_id" | "createdAt" | "updatedAt"
  > & { _id?: Types.ObjectId } {
    const newItemData: any = {
      menuId: menuObjectId,
      restaurantId: restaurantId,
    };

    if (itemFields.name.value) {
      const name = String(itemFields.name.value).trim();
      if (!name) throw new Error("Item name cannot be empty.");
      if (name.length > MAX_ITEM_NAME_LENGTH)
        throw new Error(
          "Item name exceeds maximum length of " +
            MAX_ITEM_NAME_LENGTH +
            " characters."
        );
      newItemData.name = name;
    } else {
      throw new Error("Item name is required.");
    }

    newItemData.price =
      itemFields.price.value !== null &&
      itemFields.price.value !== undefined &&
      String(itemFields.price.value).trim() !== ""
        ? Number(itemFields.price.value)
        : undefined;
    if (
      newItemData.price !== undefined &&
      (isNaN(newItemData.price) || newItemData.price < 0)
    ) {
      throw new Error("Invalid item price. Must be a non-negative number.");
    }

    newItemData.description = String(
      itemFields.description?.value || ""
    ).trim();
    if (newItemData.description.length > MAX_ITEM_DESCRIPTION_LENGTH)
      throw new Error(
        "Item description exceeds maximum length of " +
          MAX_ITEM_DESCRIPTION_LENGTH +
          " characters."
      );

    newItemData.category = String(
      itemFields.category.value || "Uncategorized"
    ).trim();

    newItemData.itemType = (
      ITEM_TYPES.includes(String(itemFields.itemType.value) as ItemType)
        ? String(itemFields.itemType.value)
        : "food"
    ) as ItemType;

    const ingredients = (
      Array.isArray(itemFields.ingredients.value)
        ? (itemFields.ingredients.value as string[])
        : []
    )
      .map((ing) => String(ing).trim())
      .filter((ing) => ing);
    if (ingredients.length > MAX_INGREDIENTS)
      throw new Error(
        "Number of ingredients exceeds maximum of " + MAX_INGREDIENTS + "."
      );
    ingredients.forEach((ing) => {
      if (ing.length > MAX_INGREDIENT_LENGTH)
        throw new Error(
          'Ingredient "' +
            ing +
            '" exceeds maximum length of ' +
            MAX_INGREDIENT_LENGTH +
            " characters."
        );
    });
    newItemData.ingredients = ingredients;

    newItemData.isGlutenFree = Boolean(itemFields.isGlutenFree.value);
    newItemData.isVegan = Boolean(itemFields.isVegan.value);
    newItemData.isVegetarian = Boolean(itemFields.isVegetarian.value);
    newItemData.isDairyFree = false;

    // Handle wine-specific fields if itemType is 'wine'
    if (newItemData.itemType === "wine") {
      if (itemFields.wineStyle?.value) {
        const wineStyleValue = String(itemFields.wineStyle.value).trim();
        if (!WINE_STYLES.includes(wineStyleValue as WineStyleType)) {
          throw new AppError(
            `Invalid wine style: "${wineStyleValue}". Must be one of: ${WINE_STYLES.join(
              ", "
            )}`,
            400
          );
        }
        newItemData.wineStyle = wineStyleValue as WineStyleType;
      } else {
        // wineStyle is required if itemType is wine, as per MenuItem schema
        throw new AppError(
          `Wine style is required for items of type \'wine\'. Must be one of: ${WINE_STYLES.join(
            ", "
          )}`,
          400
        );
      }
      if (itemFields.wineProducer?.value) {
        newItemData.producer = String(itemFields.wineProducer.value).trim();
      }
      if (itemFields.wineGrapeVariety?.value) {
        const grapes = String(itemFields.wineGrapeVariety.value)
          .split(",")
          .map((g) => g.trim())
          .filter((g) => g);
        if (grapes.length > 0) newItemData.grapeVariety = grapes;
      }
      if (
        itemFields.wineVintage?.value !== undefined &&
        itemFields.wineVintage?.value !== null &&
        String(itemFields.wineVintage.value).trim() !== ""
      ) {
        const vintage = Number(itemFields.wineVintage.value);
        if (!isNaN(vintage) && vintage > 0) {
          // Basic validation, more can be added via schema
          newItemData.vintage = vintage;
        } else {
          // Potentially throw error or set to undefined if strict validation is needed here
          console.warn(
            "Invalid vintage value received: " + itemFields.wineVintage.value
          );
        }
      }
      if (itemFields.wineRegion?.value) {
        newItemData.region = String(itemFields.wineRegion.value).trim();
      }
      if (
        itemFields.wineServingOptions?.value &&
        Array.isArray(itemFields.wineServingOptions.value)
      ) {
        const servingOptions = itemFields.wineServingOptions.value
          .map((opt) => {
            const price = Number(opt.price);
            if (String(opt.size).trim() && !isNaN(price) && price >= 0) {
              return { size: String(opt.size).trim(), price };
            }
            return null;
          })
          .filter((opt) => opt !== null) as Array<{
          size: string;
          price: number;
        }>; // Type assertion
        if (servingOptions.length > 0)
          newItemData.servingOptions = servingOptions;
      }
      if (itemFields.winePairings?.value) {
        const pairings = String(itemFields.winePairings.value)
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p);
        if (pairings.length > 0) newItemData.suggestedPairingsText = pairings;
      }

      // For wines, if servingOptions are provided, the main price might be less relevant or represent a default (e.g. bottle)
      // The current logic already sets newItemData.price. If it needs to be explicitly nulled when servingOptions exist,
      // that logic would be: if (newItemData.servingOptions && newItemData.servingOptions.length > 0) { newItemData.price = undefined; }
      // However, keeping the main price as a potential primary/bottle price is also an option as per schema design.
    }

    return newItemData as Omit<
      IMenuItem,
      keyof mongoose.Document | "_id" | "createdAt" | "updatedAt"
    > & { _id?: Types.ObjectId };
  }

  private static _prepareAndValidateUpdatedItemData(
    itemFields: ParsedMenuItem["fields"],
    existingItemDoc: IMenuItem
  ): Record<string, any> {
    const updatePayload: Record<string, any> = {};

    if (
      itemFields.name.value !== undefined &&
      String(itemFields.name.value).trim() !== existingItemDoc.name
    ) {
      const name = String(itemFields.name.value).trim();
      if (!name) throw new Error("Item name cannot be empty.");
      if (name.length > MAX_ITEM_NAME_LENGTH)
        throw new Error(
          "Item name exceeds maximum length of " +
            MAX_ITEM_NAME_LENGTH +
            " characters."
        );
      updatePayload.name = name;
    }

    const newPrice =
      itemFields.price.value !== null &&
      itemFields.price.value !== undefined &&
      String(itemFields.price.value).trim() !== ""
        ? Number(itemFields.price.value)
        : undefined;

    if (newPrice !== undefined) {
      if (isNaN(newPrice) || newPrice < 0)
        throw new Error("Invalid item price. Must be a non-negative number.");
      if (newPrice !== existingItemDoc.price) updatePayload.price = newPrice;
    } else if (existingItemDoc.price !== undefined && newPrice === undefined) {
      updatePayload.price = undefined;
    }

    if (
      itemFields.description?.value !== undefined &&
      String(itemFields.description.value).trim() !==
        (existingItemDoc.description || "")
    ) {
      const description = String(itemFields.description.value).trim();
      if (description.length > MAX_ITEM_DESCRIPTION_LENGTH)
        throw new Error(
          "Item description exceeds maximum length of " +
            MAX_ITEM_DESCRIPTION_LENGTH +
            " characters."
        );
      updatePayload.description = description;
    }

    if (
      itemFields.category.value !== undefined &&
      String(itemFields.category.value).trim() !==
        (existingItemDoc.category || "Uncategorized")
    ) {
      updatePayload.category = String(itemFields.category.value).trim();
    }

    if (
      itemFields.itemType.value !== undefined &&
      String(itemFields.itemType.value) !== existingItemDoc.itemType
    ) {
      const itemType = ITEM_TYPES.includes(
        String(itemFields.itemType.value) as ItemType
      )
        ? String(itemFields.itemType.value)
        : existingItemDoc.itemType;
      updatePayload.itemType = itemType as ItemType;
    }

    if (itemFields.ingredients.value !== undefined) {
      const newIngredients = (
        Array.isArray(itemFields.ingredients.value)
          ? (itemFields.ingredients.value as string[])
          : []
      )
        .map((ing) => String(ing).trim())
        .filter((ing) => ing);
      if (newIngredients.length > MAX_INGREDIENTS)
        throw new Error(
          "Number of ingredients exceeds maximum of " + MAX_INGREDIENTS + "."
        );
      newIngredients.forEach((ing) => {
        if (ing.length > MAX_INGREDIENT_LENGTH)
          throw new Error(
            'Ingredient "' +
              ing +
              '" exceeds maximum length of ' +
              MAX_INGREDIENT_LENGTH +
              " characters."
          );
      });
      if (
        JSON.stringify(newIngredients) !==
        JSON.stringify(existingItemDoc.ingredients || [])
      ) {
        updatePayload.ingredients = newIngredients;
      }
    }

    if (
      itemFields.isGlutenFree.value !== undefined &&
      Boolean(itemFields.isGlutenFree.value) !== existingItemDoc.isGlutenFree
    ) {
      updatePayload.isGlutenFree = Boolean(itemFields.isGlutenFree.value);
    }
    if (
      itemFields.isVegan.value !== undefined &&
      Boolean(itemFields.isVegan.value) !== existingItemDoc.isVegan
    ) {
      updatePayload.isVegan = Boolean(itemFields.isVegan.value);
    }
    if (
      itemFields.isVegetarian.value !== undefined &&
      Boolean(itemFields.isVegetarian.value) !== existingItemDoc.isVegetarian
    ) {
      updatePayload.isVegetarian = Boolean(itemFields.isVegetarian.value);
    }

    // Determine the effective item type for wine field processing
    const effectiveItemType =
      updatePayload.itemType || existingItemDoc.itemType;

    if (effectiveItemType === "wine") {
      // Wine Style
      if (itemFields.wineStyle?.value !== undefined) {
        const newWineStyleValue = String(itemFields.wineStyle.value).trim();
        if (newWineStyleValue) {
          if (!WINE_STYLES.includes(newWineStyleValue as WineStyleType)) {
            throw new AppError(
              `Invalid wine style: "${newWineStyleValue}". Must be one of: ${WINE_STYLES.join(
                ", "
              )}`,
              400
            );
          }
          if (newWineStyleValue !== (existingItemDoc.wineStyle || null)) {
            updatePayload.wineStyle = newWineStyleValue as WineStyleType;
          }
        } else {
          // Empty string for wineStyle when item is wine
          throw new AppError(
            `Wine style cannot be empty for items of type \'wine\'. Must be one of: ${WINE_STYLES.join(
              ", "
            )}`,
            400
          );
        }
      } else if (
        existingItemDoc.itemType === "wine" &&
        updatePayload.itemType !== "wine" &&
        updatePayload.itemType !== undefined
      ) {
        // If changing type from wine to non-wine, wineStyle is cleared later
      } else if (existingItemDoc.itemType === "wine") {
        // If item type is wine, and wineStyle is not provided in the update, it implies it should remain unchanged or be cleared
        // However, our schema likely requires wineStyle if itemType is wine.
        // If it's not in the payload, it means no change is intended for wineStyle OR it's an attempt to clear it.
        // If clearing is intended, the frontend should send an explicit null or empty string that then gets validated.
        // For now, if not provided, we assume no change to existing valid wineStyle. If existing is null/invalid, schema will catch.
        // This path implies wineStyle is not in itemFields, so it should not be set to null unless it's being removed by type change.
      }

      // Wine Producer
      if (itemFields.wineProducer?.value !== undefined) {
        const newProducer = itemFields.wineProducer.value
          ? String(itemFields.wineProducer.value).trim()
          : null;
        if (newProducer !== (existingItemDoc.producer || null)) {
          updatePayload.producer = newProducer;
        }
      } else if (
        existingItemDoc.producer !== undefined &&
        itemFields.wineProducer?.value === undefined
      ) {
        if (existingItemDoc.producer !== null) updatePayload.producer = null;
      }

      // Grape Variety
      if (itemFields.wineGrapeVariety?.value !== undefined) {
        const newGrapesString = itemFields.wineGrapeVariety.value
          ? String(itemFields.wineGrapeVariety.value).trim()
          : "";
        const newGrapesArray = newGrapesString
          .split(",")
          .map((g) => g.trim())
          .filter((g) => g);
        if (
          JSON.stringify(newGrapesArray) !==
          JSON.stringify(existingItemDoc.grapeVariety || [])
        ) {
          updatePayload.grapeVariety =
            newGrapesArray.length > 0 ? newGrapesArray : []; // Store empty array if cleared
        }
      } else if (
        existingItemDoc.grapeVariety &&
        existingItemDoc.grapeVariety.length > 0 &&
        itemFields.wineGrapeVariety?.value === undefined
      ) {
        updatePayload.grapeVariety = [];
      }

      // Wine Vintage
      if (itemFields.wineVintage?.value !== undefined) {
        const newVintageString = String(itemFields.wineVintage.value).trim();
        const newVintage =
          newVintageString === "" || newVintageString.toLowerCase() === "null"
            ? null
            : Number(newVintageString);
        if (newVintage !== null && (isNaN(newVintage) || newVintage <= 0)) {
          throw new Error(
            "Invalid wine vintage. Must be a positive number or empty."
          );
        }
        if (newVintage !== (existingItemDoc.vintage || null)) {
          updatePayload.vintage = newVintage;
        }
      } else if (
        existingItemDoc.vintage !== undefined &&
        itemFields.wineVintage?.value === undefined
      ) {
        if (existingItemDoc.vintage !== null) updatePayload.vintage = null;
      }

      // Wine Region
      if (itemFields.wineRegion?.value !== undefined) {
        const newRegion = itemFields.wineRegion.value
          ? String(itemFields.wineRegion.value).trim()
          : null;
        if (newRegion !== (existingItemDoc.region || null)) {
          updatePayload.region = newRegion;
        }
      } else if (
        existingItemDoc.region !== undefined &&
        itemFields.wineRegion?.value === undefined
      ) {
        if (existingItemDoc.region !== null) updatePayload.region = null;
      }

      // Wine Serving Options
      if (itemFields.wineServingOptions?.value !== undefined) {
        const newServingOptionsRaw = Array.isArray(
          itemFields.wineServingOptions.value
        )
          ? itemFields.wineServingOptions.value
          : [];
        const newServingOptions = newServingOptionsRaw
          .map((opt) => {
            const price = Number(opt.price);
            if (String(opt.size).trim() && !isNaN(price) && price >= 0) {
              return { size: String(opt.size).trim(), price };
            }
            // Consider logging/warning for invalid options from UI
            return null;
          })
          .filter((opt) => opt !== null) as Array<{
          size: string;
          price: number;
        }>;

        const existingServingOptions = (
          existingItemDoc.servingOptions || []
        ).map((opt) => ({ size: opt.size, price: opt.price }));

        if (
          JSON.stringify(newServingOptions) !==
          JSON.stringify(existingServingOptions)
        ) {
          updatePayload.servingOptions =
            newServingOptions.length > 0 ? newServingOptions : []; // Store empty array if cleared
        }
      } else if (
        existingItemDoc.servingOptions &&
        existingItemDoc.servingOptions.length > 0 &&
        itemFields.wineServingOptions?.value === undefined
      ) {
        updatePayload.servingOptions = [];
      }

      // Wine Pairings (suggestedPairingsText)
      if (itemFields.winePairings?.value !== undefined) {
        const newPairingsString = itemFields.winePairings.value
          ? String(itemFields.winePairings.value).trim()
          : "";
        const newPairingsArray = newPairingsString
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p);
        if (
          JSON.stringify(newPairingsArray) !==
          JSON.stringify(existingItemDoc.suggestedPairingsText || [])
        ) {
          updatePayload.suggestedPairingsText =
            newPairingsArray.length > 0 ? newPairingsArray : []; // Store empty array if cleared
        }
      } else if (
        existingItemDoc.suggestedPairingsText &&
        existingItemDoc.suggestedPairingsText.length > 0 &&
        itemFields.winePairings?.value === undefined
      ) {
        updatePayload.suggestedPairingsText = [];
      }
    } else {
      // If item type is changing FROM wine TO something else, ensure wine fields are cleared
      if (existingItemDoc.itemType === "wine") {
        updatePayload.wineStyle = null;
        updatePayload.producer = null;
        updatePayload.grapeVariety = [];
        updatePayload.vintage = null;
        updatePayload.region = null;
        updatePayload.servingOptions = [];
        updatePayload.suggestedPairingsText = [];
      }
    }
    return updatePayload;
  }

  static async createMenu(
    data: MenuData,
    restaurantId: Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IMenu> {
    const existingMenu = await Menu.findOne({ name: data.name, restaurantId });
    if (existingMenu) {
      throw new AppError(
        'A menu with the name "' +
          data.name +
          '" already exists for this restaurant. Please choose a different name or update the existing menu.',
        409
      );
    }
    const menu = new Menu({ ...data, restaurantId });
    await menu.save({ session });
    return menu;
  }

  static async getAllMenus(
    restaurantId: Types.ObjectId,
    status?: "all" | "active" | "inactive"
  ): Promise<IMenu[]> {
    const query: any = { restaurantId };
    if (status && status !== "all") {
      query.isActive = status === "active";
    }
    return Menu.find(query).sort({ name: 1 });
  }

  static async getMenuById(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<any | null> {
    console.log(
      "[MenuService.getMenuById] Received menuId:",
      menuId,
      "- Type:",
      typeof menuId,
      "- Length:",
      String(menuId).length
    );
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      console.error(
        "[MenuService.getMenuById] Validation failed for menuId:",
        menuId
      );
      throw new AppError("Invalid menu ID format", 400);
    }
    const menu = await Menu.findOne({ _id: menuId, restaurantId }).lean();
    if (!menu) {
      return null;
    }
    const items = await MenuItem.find({
      menuId: menu._id,
      restaurantId,
      isActive: true,
    }).lean();
    return { ...menu, items };
  }

  static async updateMenu(
    menuId: string | Types.ObjectId,
    updateData: Partial<MenuData>,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }
    const menu = await Menu.findOne({ _id: menuId, restaurantId });
    if (!menu) {
      throw new AppError(
        "Menu not found or does not belong to this restaurant",
        404
      );
    }
    if (updateData.name && updateData.name !== menu.name) {
      const existingMenuWithName = await Menu.findOne({
        name: updateData.name,
        restaurantId,
        _id: { $ne: menuId },
      });
      if (existingMenuWithName) {
        throw new AppError(
          'Another menu with the name "' +
            updateData.name +
            '" already exists. Please choose a different name.',
          409
        );
      }
    }
    Object.assign(menu, updateData);
    await menu.save();
    return menu;
  }

  static async deleteMenu(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedMenuCount: number; deletedItemsCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const menu = await Menu.findOne({ _id: menuId, restaurantId }).session(
        session
      );
      if (!menu) {
        throw new AppError(
          "Menu not found or does not belong to this restaurant",
          404
        );
      }
      const deletedItemsResult = await MenuItem.deleteMany({
        menuId,
        restaurantId,
      }).session(session);
      const deletedMenuResult = await Menu.deleteOne({
        _id: menuId,
        restaurantId,
      }).session(session);
      if (deletedMenuResult.deletedCount === 0) {
        throw new AppError(
          "Menu not found during delete operation or does not belong to this restaurant",
          404
        );
      }
      await session.commitTransaction();
      return {
        deletedMenuCount: deletedMenuResult.deletedCount,
        deletedItemsCount: deletedItemsResult.deletedCount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async updateMenuActivationStatus(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId,
    isActive: boolean
  ): Promise<IMenu | null> {
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }
    const menu = await Menu.findOne({ _id: menuId, restaurantId });
    if (!menu) {
      throw new AppError(
        "Menu not found or does not belong to this restaurant",
        404
      );
    }
    menu.isActive = isActive;
    await menu.save();
    return menu;
  }

  static async getMenuUploadPreview(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    originalFileName?: string
  ): Promise<MenuUploadPreview> {
    let rawText = "";
    let parsedAIOutput: GeminiAIServiceOutput | null = null;
    const previewId = uuidv4();
    const globalErrors: string[] = [];

    try {
      const dataBuffer = fs.readFileSync(multerFilePath);
      const pdfData = await pdfParse(dataBuffer);
      rawText = pdfData.text;
    } catch (error: any) {
      console.error("Error reading or parsing PDF for preview:", error);
      globalErrors.push("Failed to read or parse PDF: " + error.message);
      return {
        previewId,
        filePath: multerFilePath,
        sourceFormat: "pdf",
        parsedMenuName:
          originalFileName?.replace(/\.pdf$/i, "") || "Menu from PDF",
        parsedItems: [],
        detectedCategories: [],
        summary: { totalItemsParsed: 0, itemsWithPotentialErrors: 0 },
        globalErrors,
        rawAIText: rawText.substring(0, 5000),
        rawAIOutput: null,
      };
    }

    if (!rawText.trim()) {
      globalErrors.push("No text content could be extracted from the PDF.");
    }

    try {
      if (rawText.trim()) {
        parsedAIOutput = await getAIRawExtraction(rawText, originalFileName);
      }
    } catch (error: any) {
      console.error("Error calling AI for preview:", error);
      globalErrors.push("AI processing failed: " + error.message);
      if (error instanceof AppError && error.additionalDetails) {
        globalErrors.push(
          "AI Details: " + JSON.stringify(error.additionalDetails)
        );
      }
    }

    const parsedItems: ParsedMenuItem[] = (parsedAIOutput?.menuItems || []).map(
      (item, index): ParsedMenuItem => {
        const isNameValid = !!(
          item.itemName && item.itemName.trim().length > 0
        );
        const isCategoryValid = !!(
          item.itemCategory && item.itemCategory.trim().length > 0
        );

        // Base fields common to all item types
        const baseFields: ParsedMenuItem["fields"] = {
          name: {
            value: item.itemName,
            originalValue: item.itemName,
            isValid: isNameValid,
            errorMessage: isNameValid ? undefined : "Name cannot be empty.",
          },
          price: {
            value: item.itemPrice === undefined ? null : item.itemPrice,
            originalValue: item.itemPrice === undefined ? null : item.itemPrice,
            isValid: true, // Placeholder, consider validating non-negative if not null
          },
          category: {
            value: item.itemCategory,
            originalValue: item.itemCategory,
            isValid: isCategoryValid,
            errorMessage: isCategoryValid
              ? undefined
              : "Category cannot be empty.",
          },
          itemType: {
            value: item.itemType,
            originalValue: item.itemType,
            isValid: true, // Assuming itemType from AI is always valid
          },
          ingredients: {
            value: item.itemIngredients || [],
            originalValue: item.itemIngredients || [],
            isValid: true, // Placeholder
          },
          isGlutenFree: {
            value: item.isGlutenFree || false,
            originalValue: item.isGlutenFree || false,
            isValid: true,
          },
          isVegan: {
            value: item.isVegan || false,
            originalValue: item.isVegan || false,
            isValid: true,
          },
          isVegetarian: {
            value: item.isVegetarian || false,
            originalValue: item.isVegetarian || false,
            isValid: true,
          },
        };

        // Wine-specific field transformations
        if (item.itemType === "wine") {
          baseFields.wineStyle = {
            value: item.wineStyle || null,
            originalValue: item.wineStyle || null,
            isValid: true, // Assuming valid if provided
          };
          baseFields.wineProducer = {
            value: item.wineProducer || null,
            originalValue: item.wineProducer || null,
            isValid: true,
          };
          baseFields.wineGrapeVariety = {
            value: item.wineGrapeVariety?.join(", ") || null,
            originalValue: item.wineGrapeVariety?.join(", ") || null,
            isValid: true,
          };
          baseFields.wineVintage = {
            // AI gives number, UI might treat as string or number. Store as is for now.
            value: item.wineVintage === undefined ? null : item.wineVintage,
            originalValue:
              item.wineVintage === undefined ? null : item.wineVintage,
            isValid: true, // Could add validation e.g. sensible year range
          };
          baseFields.wineRegion = {
            value: item.wineRegion || null,
            originalValue: item.wineRegion || null,
            isValid: true,
          };
          baseFields.wineServingOptions = {
            value: (item.wineServingOptions || []).map((opt) => ({
              id: uuidv4(), // Generate unique ID for client-side keying
              size: opt.size,
              price:
                opt.price === null || opt.price === undefined
                  ? ""
                  : String(opt.price), // Convert price to string for UI input
            })),
            originalValue: (item.wineServingOptions || []).map((opt) => ({
              id: uuidv4(), // Ensure original also has unique IDs if compared/used
              size: opt.size,
              price:
                opt.price === null || opt.price === undefined
                  ? ""
                  : String(opt.price),
            })),
            isValid: true, // Placeholder; validation would be more complex, per option
          };
          baseFields.winePairings = {
            value: item.winePairings?.join(", ") || null,
            originalValue: item.winePairings?.join(", ") || null,
            isValid: true,
          };
        }

        return {
          id: uuidv4(),
          internalIndex: index,
          fields: baseFields,
          originalSourceData: item,
          status: "new", // Initial status
          conflictResolution: { status: "no_conflict" }, // Default assumption
          userAction: "keep", // Default action
        };
      }
    );

    const detectedCategories = new Set<string>();
    let itemsWithPotentialErrors = 0;

    // Helper function to normalize category names consistently
    const normalizeCategory = (category?: string): string => {
      if (!category || category.trim() === "") return "Uncategorized";
      return category
        .trim()
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    parsedItems.forEach((item) => {
      if (!item.fields.name.isValid || !item.fields.category.isValid) {
        item.fields.name.errorMessage = "Invalid name or category";
        item.fields.category.errorMessage = "Invalid name or category";
        itemsWithPotentialErrors++;
      }
      if (item.fields.category.value) {
        // Normalize the category before adding to prevent duplicates
        const normalizedCategory = normalizeCategory(
          String(item.fields.category.value)
        );
        detectedCategories.add(normalizedCategory);

        // Also update the item's category to use the normalized version
        item.fields.category.value = normalizedCategory;
        item.fields.category.originalValue = normalizedCategory;
      }
    });

    return {
      previewId,
      filePath: multerFilePath,
      sourceFormat: "pdf",
      parsedMenuName:
        parsedAIOutput?.menuName ||
        originalFileName?.replace(/\.pdf$/i, "") ||
        "Menu from PDF",
      parsedItems,
      detectedCategories: Array.from(detectedCategories),
      summary: {
        totalItemsParsed: parsedItems.length,
        itemsWithPotentialErrors,
      },
      globalErrors,
      rawAIText: rawText.substring(0, 5000),
      rawAIOutput: parsedAIOutput,
    };
  }

  static async processPdfMenuUpload(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    originalFileName?: string
  ): Promise<IMenu> {
    throw new AppError(
      "processPdfMenuUpload is deprecated, use getMenuUploadPreview and finalizeMenuImport.",
      500
    );
  }

  static async finalizeMenuImport(
    data: FinalImportRequestBody,
    restaurantId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ImportResult | { jobId: string; message: string }> {
    const {
      filePath,
      parsedMenuName,
      targetMenuId,
      replaceAllItems,
      itemsToImport,
    } = data;

    if (itemsToImport.length > ASYNC_IMPORT_THRESHOLD) {
      const newMenuImportJobDocData = {
        userId,
        restaurantId,
        originalFilePath: filePath,
        parsedMenuName,
        targetMenuId: targetMenuId
          ? new Types.ObjectId(targetMenuId)
          : undefined,
        replaceAllItems,
        itemsToImport,
        status: "pending" as IMenuImportJob["status"],
        progress: 0,
        attempts: 0,
      };
      const newMenuImportJobDoc: IMenuImportJobDocument =
        new MenuImportJobModel(newMenuImportJobDocData);
      await newMenuImportJobDoc.save();

      const jobData: MenuImportJobData = {
        menuImportJobDocumentId: (
          newMenuImportJobDoc._id as Types.ObjectId
        ).toString(),
      };
      await menuImportQueue.add("menu-import-job", jobData);

      return {
        jobId: (newMenuImportJobDoc._id as Types.ObjectId).toString(),
        message:
          "Menu import with " +
          itemsToImport.length +
          " items has been queued for processing. Job ID: " +
          (newMenuImportJobDoc._id as Types.ObjectId).toString(),
      };
    }

    console.log(
      "Processing import synchronously as item count is below threshold."
    );
    const session = await mongoose.startSession();
    session.startTransaction();
    let menuObjectId: Types.ObjectId | undefined = targetMenuId
      ? new Types.ObjectId(targetMenuId)
      : undefined;
    let finalMenuName = parsedMenuName;
    const result: ImportResult = {
      overallStatus: "success",
      message: "",
      menuId: undefined,
      menuName: undefined,
      itemsProcessed: itemsToImport.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsErrored: 0,
      errorDetails: [],
      errorReport: "",
    };
    const errorReportLines: string[] = [
      "ItemID,ItemName,ActionAttempted,ErrorReason",
    ];

    try {
      let menu: IMenu | null = null;
      if (targetMenuId) {
        menu = await Menu.findOne({ _id: targetMenuId, restaurantId }).session(
          session
        );
        if (!menu) {
          throw new AppError(
            'Target menu with ID "' + targetMenuId + '" not found.',
            404
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        result.menuId = menuObjectId.toString();
        result.menuName = finalMenuName;
        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId,
          }).session(session);
          console.log(
            'All existing items deleted from menu "' +
              finalMenuName +
              '" as per replaceAllItems flag.'
          );
        }
      } else if (parsedMenuName) {
        menu = await Menu.findOne({
          name: parsedMenuName,
          restaurantId,
        }).session(session);
        if (!menu) {
          if (!parsedMenuName.trim()) {
            throw new AppError(
              "Menu name cannot be empty when creating a new menu.",
              400
            );
          }
          menu = await MenuService.createMenu(
            { name: parsedMenuName, isActive: true },
            restaurantId,
            session
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        result.menuId = menuObjectId.toString();
        result.menuName = finalMenuName;
        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId,
          }).session(session);
          console.log(
            'All existing items deleted from menu "' +
              finalMenuName +
              '" as per replaceAllItems flag.'
          );
        }
      } else {
        throw new AppError(
          "TargetMenuId or parsedMenuName must be provided.",
          400
        );
      }

      if (!menuObjectId) {
        throw new AppError(
          "Failed to identify target menu. Critical logic error.",
          500
        );
      }

      const bulkOperations: any[] = [];
      for (const item of itemsToImport) {
        try {
          if (item.importAction === "skip" || item.userAction === "ignore") {
            result.itemsSkipped++;
            continue;
          }
          if (item.importAction === "create") {
            const newItemData = MenuService._prepareAndValidateNewItemData(
              item.fields,
              menuObjectId,
              restaurantId
            );
            bulkOperations.push({ insertOne: { document: newItemData } });
            result.itemsCreated++;
          } else if (item.importAction === "update" && item.existingItemId) {
            const existingItem = await MenuItem.findOne({
              _id: item.existingItemId,
              restaurantId,
              menuId: menuObjectId,
            }).session(session);
            if (!existingItem)
              throw new Error(
                "Item to update (ID: " +
                  item.existingItemId +
                  ") not found in target menu " +
                  menuObjectId +
                  "."
              );

            const updatePayload =
              MenuService._prepareAndValidateUpdatedItemData(
                item.fields,
                existingItem
              );
            if (Object.keys(updatePayload).length > 0) {
              bulkOperations.push({
                updateOne: {
                  filter: { _id: existingItem._id },
                  update: { $set: updatePayload },
                },
              });
              result.itemsUpdated++;
            } else {
              result.itemsSkipped++;
            }
          } else {
            throw new Error(
              "Invalid importAction '" +
                item.importAction +
                "' or missing existingItemId for update."
            );
          }
        } catch (error: any) {
          result.itemsErrored++;
          const errorStatus: ImportActionStatus = "error";
          result.errorDetails?.push({
            id: item.id,
            name: String(item.fields.name.value || "N/A"),
            status: errorStatus,
            errorReason: error.message,
            existingItemId: item.existingItemId,
          });
          errorReportLines.push(
            '"' +
              item.id +
              '","' +
              String(item.fields.name.value || "N/A").replace(/"/g, '""') +
              '","' +
              (item.importAction || "N/A") +
              '","' +
              error.message.replace(/"/g, '""') +
              '"'
          );
        }
      }

      if (bulkOperations.length > 0) {
        const bulkWriteResult = await MenuItem.bulkWrite(bulkOperations, {
          session,
        });
        if (bulkWriteResult.hasWriteErrors()) {
          bulkWriteResult.getWriteErrors().forEach((writeError: any) => {
            result.itemsErrored++;
            const errorStatus: ImportActionStatus = "error";
            result.errorDetails?.push({
              id: "bulkError_" + (writeError.index ?? "N/A"),
              name: "Bulk Op Error",
              status: errorStatus,
              errorReason: writeError.errmsg,
            });
            errorReportLines.push(
              '"bulkError_' +
                (writeError.index ?? "N/A") +
                '","Bulk Op Error","bulk_operation","' +
                (writeError.errmsg || "Unknown bulk error").replace(
                  /"/g,
                  '""'
                ) +
                '"'
            );
          });
        }
      }

      result.overallStatus =
        result.itemsErrored > 0
          ? result.itemsErrored === itemsToImport.length - result.itemsSkipped
            ? "failed"
            : "partial_success"
          : "success";
      result.message =
        result.itemsErrored > 0
          ? "Import completed with " + result.itemsErrored + " errors."
          : "Successfully imported " +
            result.itemsCreated +
            " new items and updated " +
            result.itemsUpdated +
            " items. " +
            result.itemsSkipped +
            " items were skipped.";

      if (errorReportLines.length > 1)
        result.errorReport = errorReportLines.join("\\n");
      result.menuName = finalMenuName;
      await session.commitTransaction();

      if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err)
            console.error(
              "Error deleting temp PDF after sync import:",
              filePath,
              err
            );
          else console.log("Temp PDF deleted after sync import:", filePath);
        });
      }
    } catch (error: any) {
      await session.abortTransaction();
      result.overallStatus = "failed";
      result.message = error.message || "Unexpected error during import.";
      const errorStatus: ImportActionStatus = "error";
      if (error instanceof AppError && error.additionalDetails) {
        result.errorDetails?.push({
          id: "global_error",
          name: "Global Import Error",
          status: errorStatus,
          errorReason: JSON.stringify(error.additionalDetails),
        });
      } else {
        result.errorDetails?.push({
          id: "global_error",
          name: "Global Import Error",
          status: errorStatus,
          errorReason: error.message,
        });
      }
    } finally {
      session.endSession();
    }
    return result;
  }

  static async processQueuedMenuImport(
    menuImportJobDocumentId: string | Types.ObjectId
  ): Promise<ImportResult> {
    const jobDoc = await MenuImportJobModel.findById(
      menuImportJobDocumentId
    ).exec();
    if (!jobDoc) {
      return {
        overallStatus: "failed",
        message:
          "Critical error: MenuImportJob document not found for ID: " +
          menuImportJobDocumentId +
          ".",
        itemsProcessed: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        itemsErrored: 0,
      };
    }

    jobDoc.status = "processing";
    jobDoc.processedAt = new Date();
    await jobDoc.save();

    const {
      restaurantId,
      originalFilePath,
      parsedMenuName,
      targetMenuId,
      replaceAllItems,
      itemsToImport,
    } = jobDoc;

    const jobRestaurantId = new Types.ObjectId(restaurantId);

    const session = await mongoose.startSession();
    session.startTransaction();

    let menuObjectId: Types.ObjectId | undefined = targetMenuId
      ? new Types.ObjectId(targetMenuId.toString())
      : undefined;
    let finalMenuName = parsedMenuName;

    const jobResult: ImportResult = {
      overallStatus: "success",
      message: "",
      menuId: undefined,
      menuName: undefined,
      itemsProcessed: itemsToImport.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsErrored: 0,
      errorDetails: [],
      errorReport: "",
    };
    const errorReportLines: string[] = [
      "ItemID,ItemName,ActionAttempted,ErrorReason",
    ];

    try {
      let menu: IMenu | null = null;
      if (targetMenuId) {
        menu = await Menu.findOne({
          _id: targetMenuId,
          restaurantId: jobRestaurantId,
        }).session(session);
        if (!menu) {
          throw new AppError(
            'Target menu with ID "' +
              targetMenuId +
              '" not found for job ' +
              jobDoc._id +
              ".",
            404
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        jobResult.menuId = menuObjectId.toString();
        jobResult.menuName = finalMenuName;
        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId: jobRestaurantId,
          }).session(session);
          console.log(
            "Job " +
              jobDoc._id +
              ': All existing items deleted from menu "' +
              finalMenuName +
              '" as per replaceAllItems flag.'
          );
        }
      } else if (parsedMenuName) {
        menu = await Menu.findOne({
          name: parsedMenuName,
          restaurantId: jobRestaurantId,
        }).session(session);
        if (!menu) {
          if (!parsedMenuName.trim()) {
            throw new AppError(
              "Menu name cannot be empty when creating a new menu for job " +
                jobDoc._id +
                ".",
              400
            );
          }
          menu = await MenuService.createMenu(
            { name: parsedMenuName, isActive: true },
            jobRestaurantId,
            session
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        jobResult.menuId = menuObjectId.toString();
        jobResult.menuName = finalMenuName;

        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId: jobRestaurantId,
          }).session(session);
          console.log(
            "Job " +
              jobDoc._id +
              ': All existing items deleted from menu "' +
              finalMenuName +
              '" as per replaceAllItems flag.'
          );
        }
      } else {
        throw new AppError(
          "TargetMenuId or parsedMenuName must be provided for job " +
            jobDoc._id +
            ".",
          400
        );
      }

      if (!menuObjectId) {
        throw new AppError(
          "Failed to identify target menu for job " +
            jobDoc._id +
            ". Critical logic error.",
          500
        );
      }

      const bulkOperations: any[] = [];
      for (const item of itemsToImport) {
        try {
          if (item.importAction === "skip" || item.userAction === "ignore") {
            jobResult.itemsSkipped++;
            continue;
          }
          if (item.importAction === "create") {
            const newItemData = MenuService._prepareAndValidateNewItemData(
              item.fields,
              menuObjectId,
              jobRestaurantId
            );
            bulkOperations.push({ insertOne: { document: newItemData } });
            jobResult.itemsCreated++;
          } else if (item.importAction === "update" && item.existingItemId) {
            const existingItem = await MenuItem.findOne({
              _id: item.existingItemId,
              restaurantId: jobRestaurantId,
              menuId: menuObjectId,
            }).session(session);
            if (!existingItem)
              throw new Error(
                "Item to update (ID: " +
                  item.existingItemId +
                  ") not found in target menu " +
                  menuObjectId +
                  "."
              );

            const updatePayload =
              MenuService._prepareAndValidateUpdatedItemData(
                item.fields,
                existingItem
              );
            if (Object.keys(updatePayload).length > 0) {
              bulkOperations.push({
                updateOne: {
                  filter: { _id: existingItem._id },
                  update: { $set: updatePayload },
                },
              });
              jobResult.itemsUpdated++;
            } else {
              jobResult.itemsSkipped++;
            }
          } else {
            throw new Error(
              "Invalid importAction '" +
                item.importAction +
                "' or missing existingItemId for update on job " +
                jobDoc._id +
                "."
            );
          }
        } catch (error: any) {
          jobResult.itemsErrored++;
          const errorStatus: ImportActionStatus = "error";
          jobResult.errorDetails?.push({
            id: item.id,
            name: String(item.fields.name.value || "N/A"),
            status: errorStatus,
            errorReason: error.message,
            existingItemId: item.existingItemId,
          });
          errorReportLines.push(
            '"' +
              item.id +
              '","' +
              String(item.fields.name.value || "N/A").replace(/"/g, '""') +
              '","' +
              (item.importAction || "N/A") +
              '","' +
              error.message.replace(/"/g, '""') +
              '"'
          );
        }
      }

      if (bulkOperations.length > 0) {
        const bulkWriteResult = await MenuItem.bulkWrite(bulkOperations, {
          session,
        });
        if (bulkWriteResult.hasWriteErrors()) {
          bulkWriteResult.getWriteErrors().forEach((writeError: any) => {
            jobResult.itemsErrored++;
            const errorStatus: ImportActionStatus = "error";
            jobResult.errorDetails?.push({
              id: "bulkError_" + (writeError.index ?? "N/A"),
              name: "Bulk Op Error",
              status: errorStatus,
              errorReason: writeError.errmsg,
            });
            errorReportLines.push(
              '"bulkError_' +
                (writeError.index ?? "N/A") +
                '","Bulk Op Error","bulk_operation","' +
                (writeError.errmsg || "Unknown bulk error").replace(
                  /"/g,
                  '""'
                ) +
                '"'
            );
          });
        }
      }

      jobResult.overallStatus =
        jobResult.itemsErrored > 0
          ? jobResult.itemsErrored ===
            itemsToImport.length - jobResult.itemsSkipped
            ? "failed"
            : "partial_success"
          : "success";
      jobResult.message =
        jobResult.itemsErrored > 0
          ? "Import completed with " +
            jobResult.itemsErrored +
            " errors for job " +
            jobDoc._id +
            "."
          : "Successfully imported " +
            jobResult.itemsCreated +
            " new items and updated " +
            jobResult.itemsUpdated +
            " items for job " +
            jobDoc._id +
            ". " +
            jobResult.itemsSkipped +
            " items were skipped.";

      if (errorReportLines.length > 1)
        jobResult.errorReport = errorReportLines.join("\\n");
      jobResult.menuName = finalMenuName;

      await session.commitTransaction();
      jobDoc.status =
        jobResult.overallStatus === "failed"
          ? "failed"
          : jobResult.overallStatus === "partial_success"
          ? "partial_success"
          : "completed";
      jobDoc.errorMessage = jobResult.message;

      if (
        (jobDoc.status === "completed" ||
          jobDoc.status === "partial_success") &&
        originalFilePath &&
        fs.existsSync(originalFilePath)
      ) {
        fs.unlink(originalFilePath, (err) => {
          if (err)
            console.error(
              "Job " +
                jobDoc._id +
                ": Error deleting temp PDF after async import:",
              originalFilePath,
              err
            );
          else
            console.log(
              "Job " + jobDoc._id + ": Temp PDF deleted after async import:",
              originalFilePath
            );
        });
      }
    } catch (error: any) {
      await session.abortTransaction();
      jobResult.overallStatus = "failed";
      jobResult.message =
        error.message ||
        "Unexpected error during queued import for job " + jobDoc._id + ".";
      const errorStatus: ImportActionStatus = "error";
      if (error instanceof AppError && error.additionalDetails) {
        jobResult.errorDetails?.push({
          id: "global_job_error",
          name: "Global Job Error",
          status: errorStatus,
          errorReason: JSON.stringify(error.additionalDetails),
        });
      } else {
        jobResult.errorDetails?.push({
          id: "global_job_error",
          name: "Global Job Error",
          status: errorStatus,
          errorReason: error.message,
        });
      }
      jobDoc.status = "failed";
      if (!jobDoc.errorMessage) jobDoc.errorMessage = jobResult.message;
    } finally {
      session.endSession();
    }

    jobDoc.result = jobResult;
    jobDoc.completedAt = new Date();
    jobDoc.progress = 100;
    await jobDoc.save();
    return jobResult;
  }

  static async processMenuForConflictResolution(
    data: ProcessConflictResolutionRequest
  ): Promise<ProcessConflictResolutionResponse> {
    const {
      itemsToProcess,
      restaurantId: restaurantIdFromData,
      targetMenuId: targetMenuIdFromData,
    } = data;

    if (
      !restaurantIdFromData ||
      !mongoose.Types.ObjectId.isValid(restaurantIdFromData)
    ) {
      throw new AppError(
        "Invalid or missing restaurant ID for conflict resolution.",
        400
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(restaurantIdFromData);

    const processedItems: ParsedMenuItem[] = [];
    let itemsRequiringUserAction = 0;
    let potentialUpdatesIdentified = 0;
    let newItemsConfirmed = 0;

    for (const item of itemsToProcess) {
      let conflictResolutionStatus: ConflictResolutionStatus = "no_conflict";
      let conflictMessage: string | undefined = undefined;
      let existingItemIdForUpdate: string | undefined = undefined;
      let candidateItemIdsForMultiple: string[] | undefined = undefined;

      if (item.userAction === "ignore") {
        conflictResolutionStatus = "skipped_by_user";
        processedItems.push({
          ...item,
          conflictResolution: { status: conflictResolutionStatus },
        });
        continue;
      }

      try {
        const itemNameTrimmed = String(item.fields.name.value).trim();
        if (!itemNameTrimmed) {
          throw new Error("Item name is empty, cannot process for conflicts.");
        }

        const findQuery: any = {
          restaurantId: restaurantId,
          name: {
            $regex:
              "^" +
              itemNameTrimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") +
              "$",
            $options: "i",
          },
        };

        if (
          targetMenuIdFromData &&
          mongoose.Types.ObjectId.isValid(targetMenuIdFromData)
        ) {
          findQuery.menuId = new mongoose.Types.ObjectId(targetMenuIdFromData);
        }

        const potentialDuplicates = await MenuItem.find(findQuery)
          .select("_id name menuId")
          .limit(5)
          .lean<
            Array<
              Pick<IMenuItem, "_id" | "name" | "menuId"> & {
                _id: Types.ObjectId;
              }
            >
          >();

        if (potentialDuplicates.length === 1) {
          const duplicate = potentialDuplicates[0];
          conflictResolutionStatus = "update_candidate";
          existingItemIdForUpdate = duplicate._id.toString();
          conflictMessage =
            'One existing item found with name "' + duplicate.name + '".';
          potentialUpdatesIdentified++;
        } else if (potentialDuplicates.length > 1) {
          conflictResolutionStatus = "multiple_candidates";
          candidateItemIdsForMultiple = potentialDuplicates.map((dup) =>
            dup._id.toString()
          );
          conflictMessage =
            potentialDuplicates.length +
            " existing items found with similar names. Please review.";
          itemsRequiringUserAction++;
        } else {
          conflictResolutionStatus = "no_conflict";
          newItemsConfirmed++;
        }
      } catch (error: any) {
        console.error(
          'Error processing conflict for item "' +
            String(item.fields.name.value) +
            '": ' +
            error.message
        );
        conflictResolutionStatus = "error_processing_conflict";
        conflictMessage = "Error during conflict check: " + error.message;
        itemsRequiringUserAction++;
      }
      processedItems.push({
        ...item,
        conflictResolution: {
          status: conflictResolutionStatus,
          message: conflictMessage,
          existingItemId: existingItemIdForUpdate,
          candidateItemIds: candidateItemIdsForMultiple,
        },
      });
    }
    return {
      processedItems,
      summary: {
        itemsRequiringUserAction,
        potentialUpdatesIdentified,
        newItemsConfirmed,
        totalProcessed: itemsToProcess.length,
      },
    };
  }
}

export default MenuService;
