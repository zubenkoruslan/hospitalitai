import pdfParse from "pdf-parse";
import fs from "fs";
import {
  GoogleGenerativeAI,
  FunctionDeclarationSchemaType,
  FunctionCallingMode,
} from "@google/generative-ai";

// Simple, clean interfaces
export interface ParsedMenuData {
  menuName: string;
  items: SimpleMenuItem[];
  totalItemsFound: number;
  processingNotes: string[];
}

export interface SimpleMenuItem {
  name: string;
  description?: string;
  price?: number;
  category: string;
  itemType: "food" | "beverage" | "wine";

  // Optional fields based on type
  ingredients?: string[];
  allergens?: string[];

  // Wine-specific (only if itemType === 'wine')
  vintage?: number;
  producer?: string;
  region?: string;
  grapeVariety?: string[];
  wineStyle?:
    | "still"
    | "sparkling"
    | "champagne"
    | "dessert"
    | "fortified"
    | "other";
  servingOptions?: Array<{
    size: string; // "Glass", "Bottle", etc.
    price: number;
  }>;

  // Dietary info
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;

  // Processing metadata
  confidence: number; // 0-100, how confident we are in this extraction
  originalText: string; // The original line from the PDF
}

export class SimpleMenuParserService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Main entry point - parse any menu type
   */
  async parseMenu(
    filePath: string,
    originalFileName?: string
  ): Promise<{
    success: boolean;
    data?: ParsedMenuData;
    errors: string[];
  }> {
    try {
      console.log(`🔄 Parsing menu: ${originalFileName || "Unknown"}`);

      // Step 1: Extract text from PDF
      const textResult = await this.extractTextFromPdf(filePath);
      if (!textResult.success) {
        return { success: false, errors: textResult.errors };
      }

      // Step 2: Clean and prepare text
      const cleanText = this.cleanExtractedText(textResult.text!);

      // Step 3: Use AI to parse menu items
      const parseResult = await this.parseWithAI(cleanText, originalFileName);
      if (!parseResult.success) {
        return { success: false, errors: parseResult.errors };
      }

      // Step 4: Validate and clean results
      const validatedData = this.validateAndCleanResults(parseResult.data!);

      console.log(
        `✅ Successfully parsed ${validatedData.items.length} menu items`
      );

      return {
        success: true,
        data: validatedData,
        errors: [],
      };
    } catch (error: any) {
      console.error("❌ Menu parsing failed:", error);
      return {
        success: false,
        errors: [`Menu parsing error: ${error.message}`],
      };
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractTextFromPdf(filePath: string): Promise<{
    success: boolean;
    text?: string;
    errors: string[];
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, errors: ["PDF file not found"] };
      }

      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text?.trim();

      if (!text || text.length < 50) {
        return { success: false, errors: ["No readable text found in PDF"] };
      }

      return { success: true, text, errors: [] };
    } catch (error: any) {
      return {
        success: false,
        errors: [`PDF extraction failed: ${error.message}`],
      };
    }
  }

  /**
   * Clean extracted text for better AI processing
   */
  private cleanExtractedText(rawText: string): string {
    return (
      rawText
        // Remove excessive whitespace but preserve line breaks
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        // Remove common PDF artifacts
        .replace(/\f/g, "\n") // Form feed to newline
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Control characters
        // Normalize currency symbols
        .replace(/[£$€]/g, "£")
        .trim()
    );
  }

  /**
   * Use AI to parse menu items from text
   */
  private async parseWithAI(
    text: string,
    fileName?: string
  ): Promise<{
    success: boolean;
    data?: ParsedMenuData;
    errors: string[];
  }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: this.buildSystemInstruction(),
        tools: [
          {
            functionDeclarations: [this.buildFunctionSchema()],
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.ANY,
            allowedFunctionNames: ["parse_menu_items"],
          },
        },
      });

      const prompt = this.buildPrompt(text, fileName);

      console.log(`🤖 Sending ${text.length} characters to AI for parsing...`);

      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Check for function calls
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        return {
          success: false,
          errors: ["AI did not return structured menu data"],
        };
      }

      const menuData = functionCalls[0].args as ParsedMenuData;

      if (!menuData.items || menuData.items.length === 0) {
        return {
          success: false,
          errors: ["No menu items found in the document"],
        };
      }

      return { success: true, data: menuData, errors: [] };
    } catch (error: any) {
      console.error("AI parsing error:", error);
      return {
        success: false,
        errors: [`AI parsing failed: ${error.message}`],
      };
    }
  }

  /**
   * Build system instruction for AI
   */
  private buildSystemInstruction(): string {
    return `
You are a menu parsing specialist. Your job is to extract menu items from restaurant menu text.

GUIDELINES:
1. Extract ONLY actual menu items (food, drinks, wines) - skip headers, descriptions, decorative text
2. Determine item type: "food", "beverage", or "wine"
3. Extract prices accurately - look for £, $, € symbols and numbers
4. For wines: extract vintage, producer, region, serving options (glass/bottle prices)
5. Categorize items logically (appetizers, mains, desserts, wines, etc.)
6. Set confidence score based on how clear the extraction is
7. Be conservative - if unsure about details, leave fields empty rather than guess

ITEM TYPES:
- "food": Dishes, appetizers, mains, desserts, sides
- "beverage": Cocktails, beers, spirits, soft drinks, coffee, tea
- "wine": All wines including sparkling, champagne, port

WINE SPECIFICS:
- Extract vintage year if present (e.g., "2018 Chardonnay" → vintage: 2018)
- Extract producer/winery names
- Extract regions/countries
- Look for serving options with different prices (glass vs bottle)
- Identify wine style: still, sparkling, champagne, dessert, fortified

Be accurate and conservative. Quality over quantity.
`.trim();
  }

  /**
   * Build function schema for AI
   */
  private buildFunctionSchema() {
    return {
      name: "parse_menu_items",
      description: "Parse menu items from text",
      parameters: {
        type: "object" as const,
        properties: {
          menuName: {
            type: "string" as const,
            description: "Name of the menu",
          },
          items: {
            type: "array" as const,
            description: "Array of menu items",
            items: {
              type: "object" as const,
              properties: {
                name: { type: "string" as const },
                description: { type: "string" as const },
                price: { type: "number" as const },
                category: { type: "string" as const },
                itemType: {
                  type: "string" as const,
                  enum: ["food", "beverage", "wine"],
                },
                ingredients: {
                  type: "array" as const,
                  items: { type: "string" as const },
                },
                vintage: { type: "number" as const },
                producer: { type: "string" as const },
                region: { type: "string" as const },
                grapeVariety: {
                  type: "array" as const,
                  items: { type: "string" as const },
                },
                wineStyle: {
                  type: "string" as const,
                  enum: [
                    "still",
                    "sparkling",
                    "champagne",
                    "dessert",
                    "fortified",
                    "other",
                  ],
                },
                servingOptions: {
                  type: "array" as const,
                  items: {
                    type: "object" as const,
                    properties: {
                      size: { type: "string" as const },
                      price: { type: "number" as const },
                    },
                    required: ["size", "price"],
                  },
                },
                isVegetarian: { type: "boolean" as const },
                isVegan: { type: "boolean" as const },
                isGlutenFree: { type: "boolean" as const },
                confidence: { type: "number" as const },
                originalText: { type: "string" as const },
              },
              required: [
                "name",
                "category",
                "itemType",
                "confidence",
                "originalText",
              ],
            },
          },
          totalItemsFound: {
            type: "number" as const,
            description: "Total number of items found",
          },
          processingNotes: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Notes about the parsing process",
          },
        },
        required: ["menuName", "items", "totalItemsFound"],
      },
    };
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(text: string, fileName?: string): string {
    return `
Parse this menu and extract all menu items using the parse_menu_items function.

MENU TEXT:
${text}

Extract every food item, beverage, and wine from this menu. Be thorough but accurate.
Call the parse_menu_items function with the structured data.
`;
  }

  /**
   * Validate and clean AI results
   */
  private validateAndCleanResults(data: ParsedMenuData): ParsedMenuData {
    const cleanedItems = data.items
      .filter((item) => this.isValidMenuItem(item))
      .map((item) => this.cleanMenuItem(item));

    return {
      ...data,
      items: cleanedItems,
      totalItemsFound: cleanedItems.length,
      processingNotes: [
        ...data.processingNotes,
        `Validation: ${data.items.length} raw items → ${cleanedItems.length} valid items`,
      ],
    };
  }

  /**
   * Check if menu item is valid
   */
  private isValidMenuItem(item: SimpleMenuItem): boolean {
    // Must have name and category
    if (!item.name || !item.category || item.name.length < 2) {
      return false;
    }

    // Must have valid item type
    if (!["food", "beverage", "wine"].includes(item.itemType)) {
      return false;
    }

    // Must have reasonable confidence
    if (item.confidence < 30) {
      return false;
    }

    // Wine-specific validation
    if (item.itemType === "wine") {
      // Wine should have either price or serving options
      if (
        !item.price &&
        (!item.servingOptions || item.servingOptions.length === 0)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clean individual menu item
   */
  private cleanMenuItem(item: SimpleMenuItem): SimpleMenuItem {
    return {
      ...item,
      name: item.name.trim(),
      description: item.description?.trim(),
      category: item.category.trim(),
      producer: item.producer?.trim(),
      region: item.region?.trim(),
      // Ensure confidence is between 0-100
      confidence: Math.max(0, Math.min(100, item.confidence)),
      // Clean arrays
      ingredients: item.ingredients?.filter((ing) => ing.trim().length > 0),
      grapeVariety: item.grapeVariety?.filter(
        (grape) => grape.trim().length > 0
      ),
    };
  }
}
