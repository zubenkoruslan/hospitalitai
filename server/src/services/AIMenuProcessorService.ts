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
  structuredData?: any; // For pre-processed JSON data
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
        .replace(/\s+,/g, ",")
        // Preserve structure for wine menus - keep line breaks
        .replace(/\r?\n/g, "\n") // Normalize line endings
        .replace(/[ \t]+/g, " ") // Only collapse horizontal whitespace
        .replace(/\n\s*\n\s*\n/g, "\n\n") // Reduce excessive line breaks to max 2
        .trim();
    } else {
      // For non-wine menus, keep the original aggressive whitespace normalization
      processedText = processedText
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
    }

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
          mode: FunctionCallingMode.AUTO,
        },
      },
      generationConfig: {
        temperature,
        topK: 1,
        topP: 1.0,
        maxOutputTokens: 16384,
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
          console.log(
            `📝 Response text preview:`,
            responseText?.substring(0, 500) || "(empty)"
          );

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
STRUCTURE: This is a wine list with sections like SPARKLING, WHITE, RED, ROSÉ, etc.
Each wine entry typically contains: [VINTAGE] [WINE NAME], [PRODUCER] [REGION], [COUNTRY] [GLASS PRICE] [BOTTLE PRICE]

WINE PROCESSING GUIDELINES:
- Apply extensive wine knowledge for grape variety identification
- Extract wine regions, vintages, and serving options carefully  
- Use classic appellation knowledge (Bordeaux, Burgundy, Champagne, etc.)
- Preserve producer/winery names exactly as written
- Look for multiple serving sizes with prices (125ml, 175ml, bottle)
- Extract wine styles: still, sparkling, champagne, dessert, fortified
- For wine pairings, only suggest food items from THIS menu
- Pay attention to section headers (SPARKLING, WHITE, RED, etc.)
- Parse price columns carefully - first price usually glass, second usually bottle
- Watch for special notations: NV (Non-Vintage), organic symbols, vintage years`
      : "";

    const baseContent = `Original Filename: ${
      originalFileName || "Unknown"
    }${wineInstructions}

Input Text to Parse:
${processedText}`;

    const attempts = {
      1: `Parse the following menu data and extract it using the extract_menu_data function.

${baseContent}

Please call the extract_menu_data function with the parsed menu information.`,

      2: `You have a function called extract_menu_data available. Use it to parse this menu data:

${baseContent}

Call the extract_menu_data function now.`,

      3: `Use the extract_menu_data function to extract menu items from this text:

${baseContent}

Make sure to call the function with proper menu data.`,
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
You are a menu data extraction system that analyzes menu text and extracts structured information.

When given menu text, you should:
1. Parse the menu items with their details
2. Call the extract_menu_data function with the extracted information

ITEM TYPES to classify:
- "wine" for wines, sparkling wines, champagne
- "beverage" for cocktails, beer, spirits, non-alcoholic drinks  
- "food" for food items

For wine items, also extract: wineStyle, wineProducer, wineGrapeVariety, wineVintage, wineRegion, wineServingOptions when available.

You have access to an extract_menu_data function - use it to return the parsed data.
`.trim();
  }

  /**
   * Build function schema for AI
   */
  private buildFunctionSchema(): FunctionDeclaration {
    return {
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
                itemCategory: { type: FunctionDeclarationSchemaType.STRING },
                itemIngredients: {
                  type: FunctionDeclarationSchemaType.ARRAY,
                  items: {
                    type: FunctionDeclarationSchemaType.STRING,
                  } as FunctionDeclarationSchema,
                },
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
              required: ["itemName", "itemType"],
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

  /**
   * Process structured JSON data instead of raw text
   */
  async processStructuredData(
    structuredData: any,
    options: AIProcessingOptions = {}
  ): Promise<AIProcessingResult> {
    const startTime = Date.now();
    const { originalFileName, maxRetries = 3, temperature = 0.1 } = options;

    try {
      // Convert structured data to a more readable format for AI
      const formattedText = this.formatStructuredDataForAI(structuredData);

      console.log("📊 Processing structured data:");
      console.log(
        `📋 Total items: ${structuredData.metadata?.totalItems || 0}`
      );
      console.log(
        `🎯 Format: ${structuredData.metadata?.detectedFormat || "unknown"}`
      );

      // Use the existing AI processing with formatted text
      const isWineMenu =
        structuredData.metadata?.detectedFormat === "wine_menu";

      const extractedData = await this.performAIExtraction(
        formattedText,
        originalFileName,
        isWineMenu,
        maxRetries,
        temperature
      );

      return {
        success: true,
        data: extractedData,
        metadata: this.buildMetadata(startTime, formattedText, isWineMenu, 1),
      };
    } catch (error: any) {
      console.error("❌ Structured data processing failed:", error);
      return {
        success: false,
        error: error.message,
        metadata: this.buildMetadata(
          startTime,
          JSON.stringify(structuredData),
          false,
          1
        ),
      };
    }
  }

  /**
   * Transform structured PDF data directly to MenuItem schema format
   */
  async transformStructuredDataToMenuItems(
    structuredData: any,
    menuId: string,
    restaurantId: string
  ): Promise<GeminiAIServiceOutput> {
    const rawMenuItems: GeminiProcessedMenuItem[] = [];

    if (structuredData.sections) {
      for (const [sectionName, items] of Object.entries(
        structuredData.sections
      )) {
        if (Array.isArray(items) && items.length > 0) {
          // Map section name to proper category
          const category = this.mapSectionToCategory(sectionName);

          items.forEach((item: any) => {
            const menuItem = this.transformWineEntryToMenuItem(
              item,
              category,
              sectionName
            );
            if (menuItem) {
              rawMenuItems.push(menuItem);
            }
          });
        }
      }
    }

    console.log(
      `🔄 Raw transformation: ${rawMenuItems.length} items extracted`
    );

    // Use AI to clean up unwanted entries
    const cleanedMenuItems = await this.aiCleanupMenuItems(rawMenuItems);

    console.log(
      `✅ AI cleanup: ${cleanedMenuItems.length} valid items after filtering`
    );

    const result: GeminiAIServiceOutput = {
      menuName: structuredData.title || "Wine Menu",
      menuItems: cleanedMenuItems,
    };

    // Enhance with AI-generated grape varieties and pairings
    return this.postProcessExtractedData(result);
  }

  /**
   * Use AI to clean up and filter menu items, removing unwanted text entries
   */
  private async aiCleanupMenuItems(
    menuItems: GeminiProcessedMenuItem[]
  ): Promise<GeminiProcessedMenuItem[]> {
    try {
      // If we have a small number of items, skip AI cleanup to avoid overhead
      if (menuItems.length <= 10) {
        return menuItems;
      }

      // Sample a few items to show AI what we're working with
      const sampleItems = menuItems.slice(0, 10).map((item) => ({
        name: item.itemName,
        producer: item.wineProducer,
        region: item.wineRegion,
        price: item.itemPrice,
        originalLine: (item as any).originalLine || "N/A",
      }));

      const prompt = `
You are a wine menu data validator. Review these extracted wine entries and identify which ones are valid wine items vs unwanted text (headers, descriptions, volume indicators, etc.).

SAMPLE DATA:
${JSON.stringify(sampleItems, null, 2)}

RULES:
- Valid wine entries have: wine name, producer/vineyard, region, and/or price
- Invalid entries include: volume headers (125ML, 175ML), price headers (GLASS, BOTTLE), section descriptions, promotional text, empty entries
- Wine names should be actual wine names, not descriptive text about wine-making

Return a JSON array of indices (0-based) for items that should be KEPT (valid wine entries only):
{"validIndices": [1, 2, 5, 7, ...]}

Be strict - when in doubt, exclude the item.
`;

      const model = this.genAI.getGenerativeModel({
        model: AI_MODEL_NAME,
        systemInstruction:
          "You are a precise data validator for wine menus. Only keep actual wine entries.",
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();

      // Parse AI response
      let validIndices: number[] = [];
      try {
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed.validIndices)) {
          validIndices = parsed.validIndices.filter(
            (i: any) => typeof i === "number" && i >= 0 && i < menuItems.length
          );
        }
      } catch (parseError) {
        console.warn(
          "AI cleanup response parsing failed, keeping all items:",
          parseError
        );
        return menuItems;
      }

      // If AI didn't return reasonable results, use fallback filtering
      if (
        validIndices.length === 0 ||
        validIndices.length > menuItems.length * 0.9
      ) {
        console.log(
          "🔄 AI cleanup results unreasonable, using fallback filtering"
        );
        return this.fallbackCleanupMenuItems(menuItems);
      }

      // Apply AI filtering
      const cleanedItems = validIndices.map((index) => menuItems[index]);
      console.log(
        `🤖 AI filtered: ${menuItems.length} → ${cleanedItems.length} items`
      );

      return cleanedItems;
    } catch (error: any) {
      console.warn("AI cleanup failed, using fallback:", error.message);
      return this.fallbackCleanupMenuItems(menuItems);
    }
  }

  /**
   * Fallback cleanup using rule-based filtering
   */
  private fallbackCleanupMenuItems(
    menuItems: GeminiProcessedMenuItem[]
  ): GeminiProcessedMenuItem[] {
    const validItems = menuItems.filter((item) => {
      // Rule-based filtering for obvious non-wine entries
      const name = item.itemName.toLowerCase().trim();

      // Skip volume headers
      if (/^\d+(ml|cl)\s*(glass|bottle|carafe)?$/i.test(name)) {
        return false;
      }

      // Skip price headers
      if (
        /^(glass|bottle|carafe|serving|wine|price|total)(\s+price)?$/i.test(
          name
        )
      ) {
        return false;
      }

      // Skip separator lines
      if (/^[|\-_=+\s]+$/.test(name)) {
        return false;
      }

      // Skip very short entries that don't look like wine names
      if (name.length < 3) {
        return false;
      }

      // Skip entries that are clearly descriptive text
      if (name.length > 100 && !item.itemPrice && !item.wineProducer) {
        return false;
      }

      // Skip entries that start with numbers but aren't vintages
      if (/^\d+\s*(£|$|€|usd|gbp|eur)/i.test(name)) {
        return false;
      }

      return true;
    });

    console.log(
      `🔧 Fallback filtered: ${menuItems.length} → ${validItems.length} items`
    );
    return validItems;
  }

  /**
   * Map section names to proper categories
   */
  private mapSectionToCategory(sectionName: string): string {
    const categoryMap: { [key: string]: string } = {
      sparkling: "Sparkling Wine",
      white: "White Wine",
      red: "Red Wine",
      rose: "Rosé Wine",
      orange: "Orange Wine",
      dessert: "Dessert Wine",
      port: "Fortified Wine",
      other: "Other Wine",
    };

    return categoryMap[sectionName.toLowerCase()] || "Other Wine";
  }

  /**
   * Transform individual wine entry to MenuItem format
   */
  private transformWineEntryToMenuItem(
    wineEntry: any,
    category: string,
    sectionName: string
  ): GeminiProcessedMenuItem | null {
    try {
      // Skip invalid entries
      if (!wineEntry.name || wineEntry.name.length < 2) {
        return null;
      }

      // Skip headers and non-wine entries (basic patterns)
      const invalidPatterns = [
        /^\d+(ml|ML|cl|CL)\s*\|?\s*(BOTTLE|CARAFE|GLASS)?$/i,
        /^(glass|bottle|carafe|serving|price|wine|total)\s*$/i,
        /^[|]+$/,
        /^\s*(ml|cl)\s*$/i,
        /^(white|red|sparkling|rose|dessert)\s+(wine|wines?)?\s*$/i,
        /^wine\s+(list|menu|selection)\s*$/i,
        /^[£$€]\d+/i, // Prices at start of line
        /^(wines?\s+)?(available\s+)?by\s+the\s+(glass|bottle|carafe)/i,
        /^(wines?\s+with\s+|perfect\s+with\s+|pairs?\s+well\s+with)/i,
      ];

      if (invalidPatterns.some((pattern) => pattern.test(wineEntry.name))) {
        return null;
      }

      // Skip descriptive text about wine-making or pairing
      if (
        wineEntry.name.length > 80 &&
        !wineEntry.prices?.bottle &&
        !wineEntry.prices?.glass
      ) {
        return null;
      }

      // Parse vintage correctly
      let vintage: number | undefined;
      if (wineEntry.vintage && wineEntry.vintage !== "NV") {
        const vintageNum = parseInt(wineEntry.vintage);
        if (
          !isNaN(vintageNum) &&
          vintageNum >= 1800 &&
          vintageNum <= new Date().getFullYear() + 5
        ) {
          vintage = vintageNum;
        }
      }

      // Determine primary price (prefer bottle, fallback to glass)
      let primaryPrice: number | null = null;
      if (wineEntry.prices?.bottle) {
        primaryPrice = wineEntry.prices.bottle;
      } else if (wineEntry.prices?.glass) {
        primaryPrice = wineEntry.prices.glass;
      }

      // Create serving options array
      const servingOptions: Array<{ size: string; price: number }> = [];
      if (wineEntry.prices?.glass) {
        servingOptions.push({ size: "Glass", price: wineEntry.prices.glass });
      }
      if (wineEntry.prices?.carafe) {
        servingOptions.push({ size: "Carafe", price: wineEntry.prices.carafe });
      }
      if (wineEntry.prices?.bottle) {
        servingOptions.push({ size: "Bottle", price: wineEntry.prices.bottle });
      }

      // Map wine style to valid enum values
      const wineStyle = this.mapWineStyle(wineEntry.style, sectionName);

      return {
        itemName: wineEntry.name.trim(),
        itemPrice: primaryPrice,
        itemType: "wine" as const,
        itemCategory: category,
        itemIngredients: [], // Wines don't have ingredients list
        isGlutenFree: true, // Wine is generally gluten-free
        isVegan: false, // Default false, would need AI to determine
        isVegetarian: true, // Wine is generally vegetarian

        // Wine-specific fields
        wineStyle,
        wineProducer: wineEntry.producer?.trim() || undefined,
        wineGrapeVariety: [], // Will be enhanced by AI
        wineVintage: vintage,
        wineRegion: wineEntry.region?.trim() || undefined,
        wineServingOptions:
          servingOptions.length > 0 ? servingOptions : undefined,
        winePairings: [], // Will be enhanced by AI

        // Store original line for AI cleanup reference
        originalLine: wineEntry.originalLine,
      } as GeminiProcessedMenuItem & { originalLine: string };
    } catch (error) {
      console.warn(`Failed to transform wine entry: ${wineEntry.name}`, error);
      return null;
    }
  }

  /**
   * Map wine style to valid enum values
   */
  private mapWineStyle(
    style: string | undefined,
    sectionName: string
  ): "still" | "sparkling" | "champagne" | "dessert" | "fortified" | "other" {
    // Define allowed wine styles directly to avoid import issues
    const WINE_STYLES = [
      "still",
      "sparkling",
      "champagne",
      "dessert",
      "fortified",
      "other",
    ] as const;
    type WineStyleType = (typeof WINE_STYLES)[number];

    if (style && WINE_STYLES.includes(style as WineStyleType)) {
      return style as WineStyleType;
    }

    // Map based on section name if style is not valid
    const sectionStyleMap: { [key: string]: WineStyleType } = {
      sparkling: "sparkling",
      white: "still",
      red: "still",
      rose: "still",
      orange: "still",
      dessert: "dessert",
      port: "fortified",
    };

    const mappedStyle = sectionStyleMap[sectionName.toLowerCase()];
    return mappedStyle || "still";
  }

  /**
   * Format structured data into readable text for AI processing (fallback method)
   */
  private formatStructuredDataForAI(structuredData: any): string {
    let formattedText = `MENU: ${structuredData.title}\n\n`;

    if (structuredData.sections) {
      for (const [sectionName, items] of Object.entries(
        structuredData.sections
      )) {
        if (Array.isArray(items) && items.length > 0) {
          formattedText += `=== ${sectionName.toUpperCase()} ===\n`;

          items.forEach((item: any) => {
            formattedText += `${item.vintage || ""} ${item.name}`;
            if (item.producer) formattedText += `, ${item.producer}`;
            if (item.region) formattedText += ` ${item.region}`;
            if (item.country) formattedText += `, ${item.country}`;

            // Add prices
            const prices: string[] = [];
            if (item.prices?.glass) prices.push(`glass: ${item.prices.glass}`);
            if (item.prices?.carafe)
              prices.push(`carafe: ${item.prices.carafe}`);
            if (item.prices?.bottle)
              prices.push(`bottle: ${item.prices.bottle}`);
            if (prices.length > 0) formattedText += ` | ${prices.join(", ")}`;

            formattedText += "\n";
          });
          formattedText += "\n";
        }
      }
    }

    return formattedText;
  }
}
