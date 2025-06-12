import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  FunctionDeclarationSchema,
  FunctionCallingMode,
} from "@google/generative-ai";
import { AppError } from "../utils/errorHandler";
import { AI_MODEL_NAME } from "../utils/constants";
import {
  GeminiAIServiceOutput,
  GeminiProcessedMenuItem,
} from "../types/menuUploadTypes";

export interface AIProcessingOptions {
  originalFileName?: string;
  isWineMenu?: boolean;
  maxRetries?: number;
  temperature?: number;
}

export interface AIProcessingResult {
  success: boolean;
  data?: GeminiAIServiceOutput;
  error?: string;
  metadata?: {
    modelUsed: string;
    attempts: number;
    processingTime: number;
    textLength: number;
    isWineMenu: boolean;
  };
}

export class AIMenuProcessorService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly systemInstruction: string;
  private readonly functionSchema: FunctionDeclaration;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.systemInstruction = this.buildSystemInstruction();
    this.functionSchema = this.buildFunctionSchema();
  }

  /**
   * Main entry point for AI menu processing
   */
  async processMenuText(
    rawText: string,
    options: AIProcessingOptions = {}
  ): Promise<AIProcessingResult> {
    const startTime = Date.now();
    const { originalFileName, maxRetries = 3, temperature = 0.0 } = options;

    // Validate input
    const validationResult = this.validateInput(rawText, originalFileName);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error,
        metadata: this.buildMetadata(startTime, rawText, false, 0),
      };
    }

    // Detect if this is a wine menu
    const isWineMenu = this.detectWineMenu(rawText, originalFileName);

    // Preprocess text based on menu type
    const processedText = this.preprocessText(rawText, isWineMenu);

    try {
      const result = await this.performAIExtraction(
        processedText,
        originalFileName,
        isWineMenu,
        maxRetries,
        temperature
      );

      return {
        success: true,
        data: result,
        metadata: this.buildMetadata(
          startTime,
          rawText,
          isWineMenu,
          maxRetries
        ),
      };
    } catch (error: any) {
      console.error("AI processing failed:", error);

      return {
        success: false,
        error: error.message || "Unknown AI processing error",
        metadata: this.buildMetadata(
          startTime,
          rawText,
          isWineMenu,
          maxRetries
        ),
      };
    }
  }

  /**
   * Validate input text before processing
   */
  private validateInput(
    rawText: string,
    fileName?: string
  ): {
    isValid: boolean;
    error?: string;
  } {
    const trimmedText = rawText.trim();

    if (!trimmedText || trimmedText.length < 10) {
      return {
        isValid: false,
        error:
          "No readable text content found. The file may be corrupted, contain only images, or be in an unsupported format.",
      };
    }

    if (trimmedText.length > 500000) {
      // 500KB text limit
      return {
        isValid: false,
        error:
          "Text content too large for processing. Please reduce file size.",
      };
    }

    return { isValid: true };
  }

  /**
   * Detect if this appears to be a wine menu
   */
  private detectWineMenu(rawText: string, fileName?: string): boolean {
    const fileNameIndicator = fileName?.toLowerCase().includes("wine") || false;

    const wineKeywords = [
      "wine",
      "vintage",
      "bottle",
      "glass",
      "ml",
      "chardonnay",
      "cabernet",
      "merlot",
      "pinot",
      "sauvignon",
      "bordeaux",
      "burgundy",
      "champagne",
      "prosecco",
      "sommelier",
      "vineyard",
      "winery",
      "terroir",
    ];

    const textIndicator = wineKeywords.some((keyword) =>
      new RegExp(`\\b${keyword}\\b`, "i").test(rawText)
    );

    return fileNameIndicator || textIndicator;
  }

  /**
   * Preprocess text based on menu type
   */
  private preprocessText(rawText: string, isWineMenu: boolean): string {
    let processedText = rawText;

    if (isWineMenu) {
      console.log("🍷 Applying wine-specific text preprocessing");

      processedText = processedText
        // Normalize vintage years
        .replace(/(\d{4})\s*v(?:intage)?/gi, "$1")
        // Standardize serving sizes
        .replace(/(\d+)\s*mls?\b/gi, "$1ml")
        .replace(/(\d+)\s*ozs?\b/gi, "$1oz")
        // Normalize wine regions
        .replace(/\bA\.O\.C\.?\b/gi, "AOC")
        .replace(/\bD\.O\.C\.?\b/gi, "DOC")
        .replace(/\bD\.O\.C\.G\.?\b/gi, "DOCG")
        // Clean up common OCR artifacts
        .replace(/[""'']/g, '"')
        .replace(/–|—/g, "-")
        // Normalize price formatting
        .replace(/\$\s*(\d+)/g, "$$$1")
        .replace(/(\d+)\s*\$/g, "$$$1")
        // Fix spacing issues
        .replace(/(\d{4})\s+([A-Z])/g, "$1 $2")
        .replace(/,(?!\s)/g, ", ")
        .replace(/\s+,/g, ",");
    }

    // General text cleanup
    processedText = processedText
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    return processedText;
  }

  /**
   * Perform the actual AI extraction with retry logic
   */
  private async performAIExtraction(
    processedText: string,
    originalFileName?: string,
    isWineMenu: boolean = false,
    maxRetries: number = 3,
    temperature: number = 0.0
  ): Promise<GeminiAIServiceOutput> {
    const model = this.genAI.getGenerativeModel({
      model: AI_MODEL_NAME,
      systemInstruction: this.systemInstruction,
      tools: [{ functionDeclarations: [this.functionSchema] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
          allowedFunctionNames: ["extract_menu_data"],
        },
      },
      generationConfig: {
        temperature,
        topK: 1,
        topP: 1.0,
        maxOutputTokens: 12288,
      },
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎯 AI Extraction attempt ${attempt}/${maxRetries}`);

        const promptText = this.createPrompt(
          processedText,
          originalFileName,
          isWineMenu,
          attempt
        );

        console.log(
          `🔍 Sending to ${AI_MODEL_NAME} (prompt length: ${promptText.length})`
        );

        const result = await model.generateContent(promptText);

        console.log(`🤖 AI Response received (attempt ${attempt})`);
        console.log(
          `📊 Response text length: ${result.response.text?.()?.length || 0}`
        );
        console.log(
          `🔧 Function calls: ${result.response.functionCalls()?.length || 0}`
        );

        const functionCall = result.response.functionCalls()?.[0];

        if (functionCall && functionCall.name === "extract_menu_data") {
          console.log("✅ Function call received successfully");

          let extractedData = functionCall.args as GeminiAIServiceOutput;

          // Validate the extracted data
          this.validateExtractedData(extractedData);

          // Post-process the data
          extractedData = await this.postProcessExtractedData(extractedData);

          return extractedData;
        } else {
          const responseText = result.response.text();
          console.log(`❌ Attempt ${attempt}: No function call received`);

          if (attempt === maxRetries) {
            // Final attempt: try JSON extraction
            console.log("🔧 Final attempt: Intelligent JSON extraction");
            return await this.extractJSONFromResponse(
              responseText,
              originalFileName
            );
          }

          lastError = new Error(
            `Function call not received on attempt ${attempt}`
          );
        }
      } catch (error: any) {
        console.error(`❌ Attempt ${attempt} error:`, error.message);
        lastError = error;

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // If we get here, all attempts failed
    throw new AppError(
      `AI processing failed after ${maxRetries} attempts: ${
        lastError?.message || "Unknown error"
      }`,
      500,
      {
        modelUsed: AI_MODEL_NAME,
        attempts: maxRetries,
        lastError: lastError?.message,
        isWineMenu,
      }
    );
  }

  /**
   * Create prompts for different attempt strategies
   */
  private createPrompt(
    processedText: string,
    originalFileName?: string,
    isWineMenu: boolean = false,
    attempt: number = 1
  ): string {
    const wineInstructions = isWineMenu
      ? `

🍷 WINE MENU DETECTED - SPECIAL PROCESSING ACTIVE:
- Apply extensive wine knowledge for grape variety identification
- Extract wine regions, vintages, and serving options carefully
- Use classic appellation knowledge (Bordeaux, Burgundy, etc.)
- Preserve producer/winery names exactly as written
- Look for multiple serving sizes with prices
- Extract wine styles: still, sparkling, champagne, dessert, fortified
- For wine pairings, only suggest food items from THIS menu`
      : "";

    const baseContent = `Original Filename: ${
      originalFileName || "Unknown"
    }${wineInstructions}

Input Text to Parse:
${processedText}`;

    const attempts = {
      1: `🚨 GEMINI 2.0 FUNCTION CALLING REQUIREMENT 🚨
MANDATORY: You MUST ONLY respond using the extract_menu_data function call.
TEXT RESPONSES ARE COMPLETELY FORBIDDEN.
DO NOT GENERATE ANY PLAIN TEXT - FUNCTION CALL ONLY.

${baseContent}

⚠️ CRITICAL: The extract_menu_data function call is your ONLY allowed response format.`,

      2: `FUNCTION CALL REQUIRED: You are REQUIRED to call the extract_menu_data function.
Text responses will cause system failure. Function calling is MANDATORY.

${baseContent}

URGENT: Use the function call format, not plain JSON text.`,

      3: `FINAL ERROR RECOVERY MODE: Previous attempts failed - function calling was not used.
YOU MUST CALL extract_menu_data FUNCTION - NO EXCEPTIONS
TEXT RESPONSES WILL BE REJECTED

${baseContent}

LAST CHANCE: Function call is the ONLY acceptable response format.`,
    };

    return attempts[attempt as keyof typeof attempts] || attempts[3];
  }

  /**
   * Validate extracted data structure
   */
  private validateExtractedData(data: GeminiAIServiceOutput): void {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid extracted data: not an object");
    }

    if (!data.menuItems || !Array.isArray(data.menuItems)) {
      throw new Error(
        "Invalid extracted data: missing or invalid menuItems array"
      );
    }

    if (data.menuItems.length === 0) {
      throw new Error("No menu items extracted from the text");
    }
  }

  /**
   * Post-process extracted data to enhance quality
   */
  private async postProcessExtractedData(
    data: GeminiAIServiceOutput
  ): Promise<GeminiAIServiceOutput> {
    // Enhance wine pairings
    data = this.enhanceWinePairings(data);

    // Enhance grape varieties
    data = await this.enhanceWineGrapeVarieties(data);

    console.log(
      `📊 Post-processing complete: ${data.menuItems.length} items processed`
    );

    return data;
  }

  /**
   * Extract JSON from text response as fallback
   */
  private async extractJSONFromResponse(
    responseText: string,
    originalFileName?: string
  ): Promise<GeminiAIServiceOutput> {
    console.log("🔧 Attempting intelligent JSON extraction");

    // Try direct JSON parse first
    try {
      const parsed = JSON.parse(responseText) as GeminiAIServiceOutput;
      console.log("✅ Direct JSON parse successful");
      return this.normalizeExtractedData(parsed, originalFileName);
    } catch (error) {
      console.log("❌ Direct JSON parse failed, trying extraction methods");
    }

    // Try extracting from markdown code blocks
    const codeBlockMatch = responseText.match(
      /```(?:json)?\s*([\s\S]*?)(?:\s*```|$)/i
    );
    if (codeBlockMatch) {
      try {
        const jsonStr = this.fixCommonJSONIssues(codeBlockMatch[1]);
        const parsed = JSON.parse(jsonStr) as GeminiAIServiceOutput;
        console.log("✅ Code block extraction successful");
        return this.normalizeExtractedData(parsed, originalFileName);
      } catch (error) {
        console.log("❌ Code block extraction failed");
      }
    }

    // Try finding JSON object boundaries
    const objectMatch = responseText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const jsonStr = this.fixCommonJSONIssues(objectMatch[0]);
        const parsed = JSON.parse(jsonStr) as GeminiAIServiceOutput;
        console.log("✅ Object boundary extraction successful");
        return this.normalizeExtractedData(parsed, originalFileName);
      } catch (error) {
        console.log("❌ Object boundary extraction failed");
      }
    }

    throw new AppError(
      "Failed to extract valid menu data from AI response",
      500,
      {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 500),
      }
    );
  }

  /**
   * Fix common JSON formatting issues
   */
  private fixCommonJSONIssues(jsonStr: string): string {
    return jsonStr
      .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes
      .replace(/\n|\r/g, " ") // Replace newlines
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Normalize extracted data and ensure required fields
   */
  private normalizeExtractedData(
    data: GeminiAIServiceOutput,
    originalFileName?: string
  ): GeminiAIServiceOutput {
    // Ensure menu name
    if (!data.menuName) {
      data.menuName =
        originalFileName?.replace(/\.[^/.]+$/, "") || "Uploaded Menu";
    }

    // Ensure menuItems is array
    if (!Array.isArray(data.menuItems)) {
      data.menuItems = [];
    }

    // Normalize each menu item
    data.menuItems = data.menuItems.map((item) => ({
      ...item,
      itemName: item.itemName || "Unknown Item",
      itemPrice: item.itemPrice || null,
      itemType: item.itemType || "food",
      itemIngredients: Array.isArray(item.itemIngredients)
        ? item.itemIngredients
        : [],
      itemCategory: item.itemCategory || "Uncategorized",
      isGlutenFree: Boolean(item.isGlutenFree),
      isVegan: Boolean(item.isVegan),
      isVegetarian: Boolean(item.isVegetarian),
      // Normalize wine fields if present
      ...(item.itemType === "wine" && {
        wineGrapeVariety: Array.isArray(item.wineGrapeVariety)
          ? item.wineGrapeVariety
          : [],
        wineServingOptions: Array.isArray(item.wineServingOptions)
          ? item.wineServingOptions
          : [],
        winePairings: Array.isArray(item.winePairings) ? item.winePairings : [],
      }),
    }));

    return data;
  }

  /**
   * Enhance wine pairings based on available food items
   */
  private enhanceWinePairings(
    data: GeminiAIServiceOutput
  ): GeminiAIServiceOutput {
    const foodItems = data.menuItems.filter((item) => item.itemType === "food");

    if (foodItems.length === 0) {
      return data;
    }

    data.menuItems = data.menuItems.map((item) => {
      if (item.itemType === "wine") {
        const enhancedPairings = this.generateIntelligentPairings(
          item,
          foodItems
        );
        const existingPairings = item.winePairings || [];
        const allPairings = [...existingPairings, ...enhancedPairings];
        const uniquePairings = Array.from(new Set(allPairings)).slice(0, 4);

        return {
          ...item,
          winePairings: uniquePairings,
        };
      }
      return item;
    });

    return data;
  }

  /**
   * Generate intelligent wine pairings
   */
  private generateIntelligentPairings(
    wine: GeminiProcessedMenuItem,
    foodItems: GeminiProcessedMenuItem[]
  ): string[] {
    // Simplified pairing logic - can be expanded
    const suggestions: string[] = [];
    const wineStyle = wine.wineStyle?.toLowerCase() || "still";

    // Basic pairing rules
    const isRedWine = wine.wineGrapeVariety?.some((grape) =>
      ["cabernet", "merlot", "pinot noir", "syrah", "sangiovese"].some((red) =>
        grape.toLowerCase().includes(red)
      )
    );

    const isWhiteWine = wine.wineGrapeVariety?.some((grape) =>
      ["chardonnay", "sauvignon blanc", "pinot grigio", "riesling"].some(
        (white) => grape.toLowerCase().includes(white)
      )
    );

    foodItems.forEach((food) => {
      const foodText = `${food.itemName} ${
        food.itemCategory
      } ${food.itemIngredients?.join(" ")}`.toLowerCase();

      if (isRedWine && /beef|steak|lamb|duck|red meat|grilled/.test(foodText)) {
        suggestions.push(food.itemName);
      } else if (
        isWhiteWine &&
        /fish|seafood|chicken|salad|pasta/.test(foodText)
      ) {
        suggestions.push(food.itemName);
      } else if (
        wineStyle === "sparkling" &&
        /appetizer|cheese|oyster/.test(foodText)
      ) {
        suggestions.push(food.itemName);
      }
    });

    return suggestions.slice(0, 2); // Limit suggestions
  }

  /**
   * Enhance wine grape varieties using wine knowledge
   */
  private async enhanceWineGrapeVarieties(
    data: GeminiAIServiceOutput
  ): Promise<GeminiAIServiceOutput> {
    const wineItems = data.menuItems.filter((item) => item.itemType === "wine");

    if (wineItems.length === 0) {
      return data;
    }

    // Process wines and enhance grape varieties
    const enhancedWines = wineItems.map((wine) => {
      if (!wine.wineGrapeVariety || wine.wineGrapeVariety.length === 0) {
        const inferredVarieties = this.inferGrapeVarieties(wine);
        if (inferredVarieties.length > 0) {
          console.log(
            `Enhanced grape varieties for "${wine.itemName}":`,
            inferredVarieties
          );
          return { ...wine, wineGrapeVariety: inferredVarieties };
        }
      }
      return wine;
    });

    // Update the menu items
    data.menuItems = data.menuItems.map((item) => {
      if (item.itemType === "wine") {
        const enhanced = enhancedWines.find(
          (wine) => wine.itemName === item.itemName
        );
        return enhanced || item;
      }
      return item;
    });

    return data;
  }

  /**
   * Infer grape varieties based on wine knowledge
   */
  private inferGrapeVarieties(wine: GeminiProcessedMenuItem): string[] {
    const varieties: string[] = [];
    const name = (wine.itemName || "").toLowerCase();
    const region = (wine.wineRegion || "").toLowerCase();

    // Regional patterns
    if (region.includes("burgundy")) {
      varieties.push("Chardonnay", "Pinot Noir");
    } else if (region.includes("champagne")) {
      varieties.push("Chardonnay", "Pinot Noir", "Pinot Meunier");
    } else if (region.includes("bordeaux")) {
      varieties.push("Cabernet Sauvignon", "Merlot");
    } else if (region.includes("chianti")) {
      varieties.push("Sangiovese");
    } else if (region.includes("rioja")) {
      varieties.push("Tempranillo");
    }

    // Name patterns
    const grapeMap = {
      chardonnay: "Chardonnay",
      "pinot noir": "Pinot Noir",
      "cabernet sauvignon": "Cabernet Sauvignon",
      merlot: "Merlot",
      syrah: "Syrah",
      shiraz: "Syrah",
      "sauvignon blanc": "Sauvignon Blanc",
      riesling: "Riesling",
      prosecco: "Glera",
      chablis: "Chardonnay",
      sancerre: "Sauvignon Blanc",
    };

    for (const [pattern, variety] of Object.entries(grapeMap)) {
      if (name.includes(pattern)) {
        varieties.push(variety);
      }
    }

    return Array.from(new Set(varieties));
  }

  /**
   * Build system instruction for AI
   */
  private buildSystemInstruction(): string {
    return `
🔧 GEMINI 2.0 MENU PARSER SYSTEM 🔧

You are a specialized menu data extraction system. Your ONLY response format is the extract_menu_data function call.

⚠️ CRITICAL RULES:
1. NEVER respond with plain text
2. ALWAYS use extract_menu_data function call
3. FORBIDDEN: JSON text responses
4. REQUIRED: Function call format only

Your task: Parse menu text and call extract_menu_data with structured data.

ITEM TYPE CLASSIFICATION:
- itemType: "wine" - Pure wines, wine by glass/bottle, sparkling wines, champagne
- itemType: "beverage" - Mixed cocktails, beer, spirits, non-alcoholic drinks
- itemType: "food" - All food items

FOR WINE ITEMS: Extract wineStyle, wineProducer, wineGrapeVariety, wineVintage, wineRegion, wineServingOptions, winePairings

Use your extensive wine knowledge to identify grape varieties even when not explicitly mentioned.
Apply classic appellation knowledge for regional wines.
For wine pairings, only suggest food items that appear in the provided menu text.

Return structured data using the extract_menu_data function call.
`.trim();
  }

  /**
   * Build function schema for AI
   */
  private buildFunctionSchema(): FunctionDeclaration {
    return {
      name: "extract_menu_data",
      description: "Extracts structured menu data from raw menu text",
      parameters: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          menuName: {
            type: FunctionDeclarationSchemaType.STRING,
            description: "The overall name of the menu",
          },
          menuItems: {
            type: FunctionDeclarationSchemaType.ARRAY,
            description: "Array of menu items",
            items: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                itemName: { type: FunctionDeclarationSchemaType.STRING },
                itemPrice: { type: FunctionDeclarationSchemaType.NUMBER },
                itemType: { type: FunctionDeclarationSchemaType.STRING },
                itemIngredients: {
                  type: FunctionDeclarationSchemaType.ARRAY,
                  items: {
                    type: FunctionDeclarationSchemaType.STRING,
                  } as FunctionDeclarationSchema,
                },
                itemCategory: { type: FunctionDeclarationSchemaType.STRING },
                isGlutenFree: { type: FunctionDeclarationSchemaType.BOOLEAN },
                isVegan: { type: FunctionDeclarationSchemaType.BOOLEAN },
                isVegetarian: { type: FunctionDeclarationSchemaType.BOOLEAN },
                // Wine-specific fields
                wineStyle: { type: FunctionDeclarationSchemaType.STRING },
                wineProducer: { type: FunctionDeclarationSchemaType.STRING },
                wineGrapeVariety: {
                  type: FunctionDeclarationSchemaType.ARRAY,
                  items: {
                    type: FunctionDeclarationSchemaType.STRING,
                  } as FunctionDeclarationSchema,
                },
                wineVintage: { type: FunctionDeclarationSchemaType.NUMBER },
                wineRegion: { type: FunctionDeclarationSchemaType.STRING },
                wineServingOptions: {
                  type: FunctionDeclarationSchemaType.ARRAY,
                  items: {
                    type: FunctionDeclarationSchemaType.OBJECT,
                    properties: {
                      size: { type: FunctionDeclarationSchemaType.STRING },
                      price: { type: FunctionDeclarationSchemaType.NUMBER },
                    },
                    required: ["size", "price"],
                  } as FunctionDeclarationSchema,
                },
                winePairings: {
                  type: FunctionDeclarationSchemaType.ARRAY,
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
  }

  /**
   * Build metadata for result
   */
  private buildMetadata(
    startTime: number,
    rawText: string,
    isWineMenu: boolean,
    attempts: number
  ) {
    return {
      modelUsed: AI_MODEL_NAME,
      attempts,
      processingTime: Date.now() - startTime,
      textLength: rawText.length,
      isWineMenu,
    };
  }
}
