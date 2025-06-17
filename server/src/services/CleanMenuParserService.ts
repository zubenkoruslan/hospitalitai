import pdfParse from "pdf-parse";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GrapeVarietyIdentifierService } from "./GrapeVarietyIdentifierService";
import { FoodItemEnhancerService } from "./FoodItemEnhancerService";
import { BeverageItemEnhancerService } from "./BeverageItemEnhancerService";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import * as csv from "csv-parser";
import path from "path";

// Clean, simple interfaces
export interface ParsedMenuData {
  menuName: string;
  items: CleanMenuItem[];
  totalItemsFound: number;
  processingNotes: string[];
}

export interface CleanMenuItem {
  name: string;
  description?: string;
  price?: number;
  category: string;
  itemType: "food" | "beverage" | "wine";

  // Optional fields
  ingredients?: string[];

  // Wine-specific
  vintage?: number;
  producer?: string;
  region?: string;
  grapeVariety?: string[];
  wineStyle?: string;
  wineColor?: string;
  servingOptions?: Array<{
    size: string;
    price: number;
  }>;

  // Food-specific enhancements
  cookingMethods?: string[];
  allergens?: string[];
  isDairyFree?: boolean;
  isSpicy?: boolean;

  // Beverage-specific enhancements
  spiritType?: string;
  beerStyle?: string;
  cocktailIngredients?: string[];
  alcoholContent?: string;
  servingStyle?: string;
  isNonAlcoholic?: boolean;
  temperature?: string;

  // Dietary info
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;

  // Processing metadata
  confidence: number;
  originalText: string;
}

export class CleanMenuParserService {
  private genAI: GoogleGenerativeAI;
  private grapeIdentifier: GrapeVarietyIdentifierService;
  private foodEnhancer: FoodItemEnhancerService;
  private beverageEnhancer: BeverageItemEnhancerService;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.grapeIdentifier = new GrapeVarietyIdentifierService();
    this.foodEnhancer = new FoodItemEnhancerService();
    this.beverageEnhancer = new BeverageItemEnhancerService();
  }

  /**
   * Parse raw text directly (useful for testing)
   */
  async parseText(
    text: string,
    menuName?: string
  ): Promise<{
    success: boolean;
    data?: ParsedMenuData;
    errors: string[];
  }> {
    try {
      console.log(`🔄 Parsing text: ${menuName || "Unknown"}`);

      // Clean and prepare text
      const cleanText = this.cleanExtractedText(text);

      // Use AI to parse menu items
      const parseResult = await this.parseWithAI(cleanText, menuName);
      if (!parseResult.success) {
        return { success: false, errors: parseResult.errors };
      }

      console.log(
        `✅ Successfully parsed ${parseResult.data!.items.length} menu items`
      );

      return {
        success: true,
        data: parseResult.data!,
        errors: [],
      };
    } catch (error: any) {
      console.error("❌ Text parsing failed:", error);
      return {
        success: false,
        errors: [`Text parsing error: ${error.message}`],
      };
    }
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

      // Step 1: Extract text from file (supports multiple formats)
      const textResult = await this.extractTextFromFile(
        filePath,
        originalFileName
      );
      if (!textResult.success) {
        return { success: false, errors: textResult.errors };
      }

      // Step 2: Clean and prepare text
      const cleanText = this.cleanExtractedText(textResult.text!);

      // Step 3: Use AI to parse menu items (without function calling)
      const parseResult = await this.parseWithAI(cleanText, originalFileName);
      if (!parseResult.success) {
        return { success: false, errors: parseResult.errors };
      }

      console.log(
        `✅ Successfully parsed ${parseResult.data!.items.length} menu items`
      );

      return {
        success: true,
        data: parseResult.data!,
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
   * Extract text from any supported file format
   */
  private async extractTextFromFile(
    filePath: string,
    originalFileName?: string
  ): Promise<{
    success: boolean;
    text?: string;
    errors: string[];
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, errors: ["File not found"] };
      }

      const fileExtension = path
        .extname(originalFileName || filePath)
        .toLowerCase();

      switch (fileExtension) {
        case ".pdf":
          return await this.extractTextFromPdf(filePath);
        case ".csv":
          return await this.extractTextFromCsv(filePath);
        case ".xls":
        case ".xlsx":
          return await this.extractTextFromExcel(filePath);
        case ".doc":
        case ".docx":
          return await this.extractTextFromWord(filePath);
        case ".json":
          return await this.extractTextFromJson(filePath);
        case ".txt":
          return await this.extractTextFromTxt(filePath);
        default:
          return {
            success: false,
            errors: [`Unsupported file format: ${fileExtension}`],
          };
      }
    } catch (error: any) {
      return {
        success: false,
        errors: [`File extraction failed: ${error.message}`],
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
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text?.trim();

      if (!text || text.length < 10) {
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
   * Extract text from CSV file
   */
  private async extractTextFromCsv(filePath: string): Promise<{
    success: boolean;
    text?: string;
    errors: string[];
  }> {
    try {
      const csvContent = fs.readFileSync(filePath, "utf8");

      // Convert CSV to a readable format for AI parsing
      const lines = csvContent.split("\n").filter((line) => line.trim());
      if (lines.length === 0) {
        return { success: false, errors: ["Empty CSV file"] };
      }

      // Try to detect if there's a header row
      const header = lines[0]
        .split(",")
        .map((col) => col.replace(/"/g, "").trim());
      const hasNameColumn = header.some(
        (col) =>
          col.toLowerCase().includes("name") ||
          col.toLowerCase().includes("item") ||
          col.toLowerCase().includes("dish")
      );

      let text = "";
      if (hasNameColumn) {
        // Process as structured data with headers
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]
            .split(",")
            .map((val) => val.replace(/"/g, "").trim());
          const itemData = header
            .map((col, idx) => `${col}: ${values[idx] || ""}`)
            .join(", ");
          text += `Menu Item: ${itemData}\n`;
        }
      } else {
        // Process as plain text
        text = csvContent.replace(/,/g, " | ").replace(/"/g, "");
      }

      if (!text || text.length < 10) {
        return { success: false, errors: ["No readable content found in CSV"] };
      }

      return { success: true, text, errors: [] };
    } catch (error: any) {
      return {
        success: false,
        errors: [`CSV extraction failed: ${error.message}`],
      };
    }
  }

  /**
   * Extract text from Excel file
   */
  private async extractTextFromExcel(filePath: string): Promise<{
    success: boolean;
    text?: string;
    errors: string[];
  }> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        return {
          success: false,
          errors: ["No worksheets found in Excel file"],
        };
      }

      let allText = "";

      // Process all sheets (usually menus are on the first sheet)
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) continue;

        allText += `\n=== ${sheetName} ===\n`;

        // Convert to readable text format
        for (const row of jsonData as any[][]) {
          if (row && row.length > 0) {
            const rowText = row
              .filter((cell) => cell !== undefined && cell !== null)
              .join(" | ");
            if (rowText.trim()) {
              allText += rowText + "\n";
            }
          }
        }
      }

      if (!allText || allText.length < 10) {
        return {
          success: false,
          errors: ["No readable content found in Excel file"],
        };
      }

      return { success: true, text: allText, errors: [] };
    } catch (error: any) {
      return {
        success: false,
        errors: [`Excel extraction failed: ${error.message}`],
      };
    }
  }

  /**
   * Extract text from Word document
   */
  private async extractTextFromWord(filePath: string): Promise<{
    success: boolean;
    text?: string;
    errors: string[];
  }> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value?.trim();

      if (!text || text.length < 10) {
        return {
          success: false,
          errors: ["No readable text found in Word document"],
        };
      }

      return { success: true, text, errors: [] };
    } catch (error: any) {
      return {
        success: false,
        errors: [`Word document extraction failed: ${error.message}`],
      };
    }
  }

  /**
   * Extract text from JSON file
   */
  private async extractTextFromJson(filePath: string): Promise<{
    success: boolean;
    text?: string;
    errors: string[];
  }> {
    try {
      const jsonContent = fs.readFileSync(filePath, "utf8");
      const jsonData = JSON.parse(jsonContent);

      // Convert JSON to readable text format for AI parsing
      let text = "";

      if (Array.isArray(jsonData)) {
        // Array of menu items
        for (const item of jsonData) {
          text += this.jsonItemToText(item) + "\n";
        }
      } else if (jsonData.items && Array.isArray(jsonData.items)) {
        // Object with items array
        text += `Menu: ${jsonData.name || jsonData.menuName || "Unknown"}\n\n`;
        for (const item of jsonData.items) {
          text += this.jsonItemToText(item) + "\n";
        }
      } else if (typeof jsonData === "object") {
        // Single menu item or structured menu
        text = this.jsonItemToText(jsonData);
      } else {
        text = JSON.stringify(jsonData, null, 2);
      }

      if (!text || text.length < 10) {
        return {
          success: false,
          errors: ["No readable content found in JSON file"],
        };
      }

      return { success: true, text, errors: [] };
    } catch (error: any) {
      return {
        success: false,
        errors: [`JSON extraction failed: ${error.message}`],
      };
    }
  }

  /**
   * Extract text from plain text file
   */
  private async extractTextFromTxt(filePath: string): Promise<{
    success: boolean;
    text?: string;
    errors: string[];
  }> {
    try {
      const text = fs.readFileSync(filePath, "utf8").trim();

      if (!text || text.length < 10) {
        return { success: false, errors: ["Empty or too short text file"] };
      }

      return { success: true, text, errors: [] };
    } catch (error: any) {
      return {
        success: false,
        errors: [`Text file extraction failed: ${error.message}`],
      };
    }
  }

  /**
   * Helper to convert JSON object to readable text
   */
  private jsonItemToText(item: any): string {
    if (typeof item === "string") return item;
    if (typeof item !== "object") return String(item);

    const parts: string[] = [];

    // Common menu item fields
    if (item.name) parts.push(`Name: ${item.name}`);
    if (item.description) parts.push(`Description: ${item.description}`);
    if (item.price) parts.push(`Price: ${item.price}`);
    if (item.category) parts.push(`Category: ${item.category}`);

    // Add other properties
    for (const [key, value] of Object.entries(item)) {
      if (!["name", "description", "price", "category"].includes(key)) {
        if (Array.isArray(value)) {
          parts.push(`${key}: ${value.join(", ")}`);
        } else if (value !== null && value !== undefined) {
          parts.push(`${key}: ${value}`);
        }
      }
    }

    return parts.join(" | ");
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
        .replace(/\f/g, "\n")
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        // Normalize currency symbols
        .replace(/[£$€]/g, "£")
        .trim()
    );
  }

  /**
   * Use AI to parse menu items from text (without complex function calling)
   */
  private async parseWithAI(
    text: string,
    fileName?: string
  ): Promise<{
    success: boolean;
    data?: ParsedMenuData;
    errors: string[];
    processingNotes?: string[];
  }> {
    const processingNotes: string[] = [];

    // For very large texts OR when we expect many wines/food items, try chunked processing first
    if (
      text.length > 12000 ||
      this.containsExtensiveWineList(text) ||
      this.containsExtensiveFoodMenu(text) ||
      this.containsExtensiveBeverageMenu(text)
    ) {
      console.log("📚 Large menu detected, attempting chunked processing...");
      const chunkedResult = await this.parseWithChunking(text, fileName);

      if (chunkedResult.success && chunkedResult.data) {
        const wineCount = chunkedResult.data.items.filter(
          (item) => item.itemType === "wine"
        ).length;
        const foodCount = chunkedResult.data.items.filter(
          (item) => item.itemType === "food"
        ).length;
        const beverageCount = chunkedResult.data.items.filter(
          (item) => item.itemType === "beverage"
        ).length;
        const totalItems = chunkedResult.data.items.length;

        console.log(`🍷 Chunked processing found ${wineCount} wines`);
        console.log(`🍽️ Chunked processing found ${foodCount} food items`);
        console.log(`🍹 Chunked processing found ${beverageCount} beverages`);
        console.log(`📊 Total items: ${totalItems}`);

        // If chunked processing found a significant number of items, use it
        if (
          wineCount >= 28 ||
          foodCount >= 25 ||
          beverageCount >= 15 ||
          totalItems >= 40
        ) {
          console.log(
            `✅ Chunked processing successful: ${totalItems} items total (${wineCount} wines, ${foodCount} food, ${beverageCount} beverages)`
          );
          return chunkedResult;
        }
      }

      console.log(
        "⚠️ Chunked processing didn't yield more items, trying standard approach..."
      );
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: this.buildSystemInstruction(),
        generationConfig: {
          maxOutputTokens: 32768, // Much higher limit to prevent JSON truncation with wine lists
          temperature: 0.1, // Lower temperature for more consistent results
        },
      });

      const prompt = this.buildPrompt(text, fileName);

      console.log(`🤖 Sending ${text.length} characters to AI for parsing...`);

      const generateContent = async () => {
        return await model.generateContent(prompt);
      };

      const result = await this.retryWithBackoff(generateContent, 3, 2000, 2);
      const response = await result.response;
      const responseText = response.text();

      // Parse JSON response
      const parsedData = this.parseAIResponse(responseText);
      if (!parsedData) {
        return {
          success: false,
          errors: ["Failed to parse AI response as JSON"],
        };
      }

      if (parsedData.processingNotes) {
        processingNotes.push(...parsedData.processingNotes);
      }

      // Validate and clean results
      const validatedData = this.validateAndCleanResults(parsedData);

      if (validatedData.processingNotes) {
        processingNotes.push(...validatedData.processingNotes);
      }

      // Enhance wine items with grape variety identification
      const wineEnhancedData = await this.enhanceWineItemsWithGrapeVarieties(
        validatedData
      );

      if (wineEnhancedData.processingNotes) {
        processingNotes.push(...wineEnhancedData.processingNotes);
      }

      // Enhance food items with detailed analysis
      const foodEnhancedData = await this.enhanceFoodItemsWithDetails(
        wineEnhancedData
      );

      if (foodEnhancedData.processingNotes) {
        processingNotes.push(...foodEnhancedData.processingNotes);
      }

      // Enhance beverage items with detailed analysis
      const fullyEnhancedData = await this.enhanceBeverageItemsWithDetails(
        foodEnhancedData
      );

      if (fullyEnhancedData.processingNotes) {
        processingNotes.push(...fullyEnhancedData.processingNotes);
      }

      fullyEnhancedData.processingNotes = [...new Set(processingNotes)];

      return { success: true, data: fullyEnhancedData, errors: [] };
    } catch (error: any) {
      console.error("AI parsing error:", error);
      processingNotes.push(`AI parsing failed after retries: ${error.message}`);
      return {
        success: false,
        errors: [`AI parsing failed: ${error.message}`],
        processingNotes,
      };
    }
  }

  /**
   * Detect if text contains an extensive wine list that would benefit from chunking
   */
  private containsExtensiveWineList(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Count wine-related indicators
    let wineIndicators = 0;

    // Look for wine sections - Enhanced rosé detection
    const wineSections = [
      "wine list",
      "wines",
      "red wines",
      "white wines",
      "sparkling wines",
      "rosé wines",
      "rose wines",
      "rosé",
      "rose",
      "champagne",
      "prosecco",
      "by the glass",
      "by the bottle",
      "provence",
      "côtes de provence",
      "cotes de provence",
    ];

    wineSections.forEach((section) => {
      if (lowerText.includes(section)) {
        wineIndicators += 2; // Section headers are strong indicators
      }
    });

    // Count vintage patterns (strong wine indicators)
    const vintageMatches = text.match(/\b(19|20)\d{2}\b/g);
    if (vintageMatches) {
      wineIndicators += Math.min(vintageMatches.length / 2, 20); // Cap at 20
    }

    // Count wine regions/producers - Enhanced with rosé regions
    const wineTerms = [
      "bordeaux",
      "burgundy",
      "champagne",
      "tuscany",
      "rioja",
      "barolo",
      "chianti",
      "loire",
      "rhône",
      "napa",
      "sonoma",
      "mendoza",
      "barossa",
      "marlborough",
      "douro",
      "mosel",
      "alsace",
      "piedmont",
      "veneto",
      "châteauneuf",
      "sancerre",
      "chablis",
      "muscadet",
      "vouvray",
      "provence",
      "côtes de provence",
      "cotes de provence",
      "languedoc",
      "roussillon",
      "bandol",
      "cassis",
      "tavel",
      "chiaretto",
      "rosato",
    ];

    wineTerms.forEach((term) => {
      const matches = (lowerText.match(new RegExp(`\\b${term}\\b`, "g")) || [])
        .length;
      wineIndicators += matches;
    });

    // Count price patterns that might indicate wines
    const priceMatches = text.match(/[£$€]\s*\d+/g);
    if (priceMatches && priceMatches.length > 25) {
      wineIndicators += 5; // Many prices suggest extensive menu
    }

    console.log(`🍷 Wine indicators detected: ${wineIndicators}`);

    // If we have strong wine indicators, use chunked processing
    return wineIndicators > 15;
  }

  /**
   * Detect if text contains an extensive food menu that would benefit from chunking
   */
  private containsExtensiveFoodMenu(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Count food-related indicators
    let foodIndicators = 0;

    // Look for food sections
    const foodSections = [
      "appetizers",
      "starters",
      "mains",
      "main courses",
      "entrees",
      "entrées",
      "desserts",
      "sides",
      "salads",
      "soups",
      "pasta",
      "pizzas",
      "burgers",
      "sandwiches",
      "grills",
      "roasts",
      "seafood",
      "steaks",
      "chicken",
      "vegetarian",
      "vegan",
      "small plates",
      "sharing plates",
      "tasting menu",
      "chef's special",
    ];

    foodSections.forEach((section) => {
      if (lowerText.includes(section)) {
        foodIndicators += 2; // Section headers are strong indicators
      }
    });

    // Count cooking method indicators
    const cookingMethods = [
      "grilled",
      "fried",
      "baked",
      "roasted",
      "sautéed",
      "braised",
      "steamed",
      "poached",
      "smoked",
      "barbecued",
      "pan-seared",
      "slow-cooked",
      "char-grilled",
    ];

    cookingMethods.forEach((method) => {
      const matches = (
        lowerText.match(new RegExp(`\\b${method}\\b`, "g")) || []
      ).length;
      foodIndicators += matches * 0.5; // Each cooking method mention
    });

    // Count dietary markers
    const dietaryMarkers = [
      "(v)",
      "(vg)",
      "(gf)",
      "(df)",
      "vegetarian",
      "vegan",
      "gluten-free",
      "dairy-free",
      "contains nuts",
      "allergens",
    ];

    dietaryMarkers.forEach((marker) => {
      const matches = (
        lowerText.match(new RegExp(marker.replace(/[()]/g, "\\$&"), "g")) || []
      ).length;
      foodIndicators += matches;
    });

    // Count ingredient indicators (common food ingredients)
    const commonIngredients = [
      "tomato",
      "cheese",
      "chicken",
      "beef",
      "pork",
      "salmon",
      "mushroom",
      "onion",
      "garlic",
      "herbs",
      "sauce",
      "cream",
      "butter",
      "olive oil",
      "parmesan",
      "mozzarella",
      "basil",
      "spinach",
      "avocado",
      "lettuce",
    ];

    commonIngredients.forEach((ingredient) => {
      const matches = (
        lowerText.match(new RegExp(`\\b${ingredient}\\b`, "g")) || []
      ).length;
      foodIndicators += matches * 0.3; // Each ingredient mention
    });

    // Count price patterns that might indicate many food items
    const priceMatches = text.match(/[£$€]\s*\d+/g);
    if (priceMatches && priceMatches.length > 20) {
      foodIndicators += 3; // Many prices suggest extensive menu
    }

    // Count item patterns (name followed by description and price)
    const itemPatterns = text.match(/^[A-Z][A-Za-z\s,&'-]+\s*[-–—]\s*[£$€]/gm);
    if (itemPatterns && itemPatterns.length > 15) {
      foodIndicators += 5; // Many structured items
    }

    console.log(`🍽️ Food indicators detected: ${foodIndicators}`);

    // If we have strong food indicators, use chunked processing
    return foodIndicators > 8;
  }

  /**
   * Detect if text contains an extensive beverage menu that would benefit from chunking
   */
  private containsExtensiveBeverageMenu(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Count beverage-related indicators
    let beverageIndicators = 0;

    // Look for beverage sections
    const beverageSections = [
      "cocktails",
      "drinks",
      "beverages",
      "spirits",
      "beers",
      "ales",
      "lagers",
      "whiskey",
      "whisky",
      "gin",
      "vodka",
      "rum",
      "tequila",
      "brandy",
      "cognac",
      "liqueurs",
      "mocktails",
      "non-alcoholic",
      "soft drinks",
      "juices",
      "coffee",
      "tea",
      "hot drinks",
      "cold drinks",
      "bar menu",
      "drink menu",
    ];

    beverageSections.forEach((section) => {
      if (lowerText.includes(section)) {
        beverageIndicators += 2; // Section headers are strong indicators
      }
    });

    // Count specific cocktails and drink names
    const specificDrinks = [
      "martini",
      "manhattan",
      "old fashioned",
      "negroni",
      "mojito",
      "margarita",
      "daiquiri",
      "cosmopolitan",
      "bloody mary",
      "mai tai",
      "piña colada",
      "long island",
      "espresso martini",
      "whiskey sour",
      "ipa",
      "pale ale",
      "stout",
      "pilsner",
      "wheat beer",
      "porter",
      "amber ale",
    ];

    specificDrinks.forEach((drink) => {
      const matches = (lowerText.match(new RegExp(`\\b${drink}\\b`, "g")) || [])
        .length;
      beverageIndicators += matches; // Each specific drink mention
    });

    // Count serving style indicators
    const servingStyles = [
      "on the rocks",
      "neat",
      "straight up",
      "shaken",
      "stirred",
      "on tap",
      "draft",
      "bottled",
      "single",
      "double",
      "shot",
      "pint",
      "half pint",
      "glass",
      "bottle",
      "by the glass",
    ];

    servingStyles.forEach((style) => {
      const matches = (
        lowerText.match(new RegExp(style.replace(/\s+/g, "\\s+"), "g")) || []
      ).length;
      beverageIndicators += matches * 0.5; // Each serving style mention
    });

    // Count alcohol content indicators
    const alcoholIndicators = [
      "abv",
      "% vol",
      "alcohol by volume",
      "proof",
      "% alc",
    ];

    alcoholIndicators.forEach((indicator) => {
      const matches = (
        lowerText.match(new RegExp(`\\b${indicator}\\b`, "g")) || []
      ).length;
      beverageIndicators += matches; // Each alcohol indicator
    });

    // Count cocktail mixers and ingredients
    const mixersAndIngredients = [
      "tonic",
      "soda",
      "cola",
      "ginger beer",
      "ginger ale",
      "bitter",
      "bitters",
      "vermouth",
      "syrup",
      "juice",
      "lime",
      "lemon",
      "orange",
      "cherry",
      "olive",
      "mint",
      "basil",
      "cucumber",
      "cranberry",
      "pineapple",
      "grenadine",
    ];

    mixersAndIngredients.forEach((mixer) => {
      const matches = (lowerText.match(new RegExp(`\\b${mixer}\\b`, "g")) || [])
        .length;
      beverageIndicators += matches * 0.3; // Each mixer mention
    });

    // Count price patterns that might indicate many beverage items
    const priceMatches = text.match(/[£$€]\s*\d+/g);
    if (priceMatches && priceMatches.length > 10) {
      beverageIndicators += 3; // Many prices suggest extensive beverage menu
    }

    // Count beverage item patterns (drink name followed by description and price)
    const beveragePatterns = text.match(
      /^[A-Z][A-Za-z\s,&'-]+\s*[-–—]\s*[£$€]/gm
    );
    if (beveragePatterns && beveragePatterns.length > 8) {
      beverageIndicators += 4; // Many structured beverage items
    }

    console.log(`🍹 Beverage indicators detected: ${beverageIndicators}`);

    // If we have strong beverage indicators, use chunked processing
    return beverageIndicators > 6;
  }

  /**
   * Parse very large menus by processing in chunks
   */
  private async parseWithChunking(
    text: string,
    fileName?: string
  ): Promise<{
    success: boolean;
    data?: ParsedMenuData;
    errors: string[];
    processingNotes?: string[];
  }> {
    const processingNotes: string[] = [
      "Using chunked processing for large menu",
    ];

    try {
      // Split text into logical chunks (try to break at section boundaries)
      const chunks = this.intelligentChunkText(text);
      console.log(`📊 Split into ${chunks.length} chunks`);

      const allItems: CleanMenuItem[] = [];
      const allErrors: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(
          `🔄 Processing chunk ${i + 1}/${chunks.length} (${
            chunk.length
          } chars)`
        );

        try {
          const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: this.buildSystemInstruction(),
            generationConfig: {
              maxOutputTokens: 16384, // Higher limit for chunked processing
              temperature: 0.1,
            },
          });

          const chunkPrompt = this.buildPrompt(
            chunk,
            `${fileName} - Part ${i + 1}`
          );

          const generateContent = async () => {
            return await model.generateContent(chunkPrompt);
          };

          const result = await this.retryWithBackoff(
            generateContent,
            2,
            1500,
            1.5
          );
          const response = await result.response;
          const responseText = response.text();

          const parsedChunk = this.parseAIResponse(responseText);

          if (parsedChunk && parsedChunk.items) {
            const validItems = parsedChunk.items.filter((item) =>
              this.isValidMenuItem(item)
            );
            allItems.push(...validItems);
            console.log(
              `✅ Chunk ${i + 1}: Found ${validItems.length} valid items`
            );
          } else {
            console.log(`⚠️ Chunk ${i + 1}: No valid items found`);
          }

          // Add delay between chunks to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          console.error(`❌ Chunk ${i + 1} failed:`, error.message);
          allErrors.push(`Chunk ${i + 1} failed: ${error.message}`);
        }
      }

      if (allItems.length === 0) {
        return {
          success: false,
          errors: ["No items found in any chunks", ...allErrors],
          processingNotes,
        };
      }

      // Remove duplicates based on name and original text similarity
      const uniqueItems = this.removeDuplicateItems(allItems);
      console.log(
        `🔧 Removed ${allItems.length - uniqueItems.length} duplicate items`
      );

      // Create combined result
      const combinedData: ParsedMenuData = {
        menuName: fileName || "Menu",
        items: uniqueItems,
        totalItemsFound: uniqueItems.length,
        processingNotes: [
          ...processingNotes,
          `Processed ${chunks.length} chunks`,
          `Found ${uniqueItems.length} unique items`,
          ...(allErrors.length > 0
            ? [`Errors: ${allErrors.length} chunks failed`]
            : []),
        ],
      };

      // Validate and clean results
      const validatedData = this.validateAndCleanResults(combinedData);

      // Enhance wine items with grape variety identification
      const wineEnhancedData = await this.enhanceWineItemsWithGrapeVarieties(
        validatedData
      );

      // Enhance food items with detailed analysis
      const foodEnhancedData = await this.enhanceFoodItemsWithDetails(
        wineEnhancedData
      );

      // Enhance beverage items with detailed analysis
      const fullyEnhancedData = await this.enhanceBeverageItemsWithDetails(
        foodEnhancedData
      );

      return {
        success: true,
        data: fullyEnhancedData,
        errors: allErrors,
        processingNotes: fullyEnhancedData.processingNotes,
      };
    } catch (error: any) {
      console.error("❌ Chunked processing failed:", error);
      processingNotes.push(`Chunked processing failed: ${error.message}`);
      return {
        success: false,
        errors: [error.message],
        processingNotes,
      };
    }
  }

  /**
   * Intelligently split text into chunks at logical boundaries
   */
  private intelligentChunkText(text: string): string[] {
    const maxChunkSize = 2500; // Smaller chunks to prevent JSON truncation for large menus
    let chunks: string[] = [];

    console.log(
      `🔍 Splitting text of ${text.length} characters into chunks...`
    );

    // For large food menus, force smaller chunks to prevent JSON truncation
    if (text.length > 4000) {
      console.log("🍽️ Large food menu detected, forcing smaller chunks");

      // Force multiple chunks for comprehensive extraction
      const targetChunkSize = 1800; // Small chunks to prevent JSON truncation

      console.log(`📊 Forcing chunks of maximum ${targetChunkSize} chars each`);

      // Split by double line breaks first to get logical sections
      const sections = text
        .split(/\n\s*\n\s*/)
        .filter((section) => section.trim().length > 50);

      let currentChunk = "";
      for (const section of sections) {
        // Force new chunk if adding this section would exceed the limit
        if (currentChunk.length + section.length > targetChunkSize) {
          if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
            console.log(`✅ Added chunk: ${currentChunk.trim().length} chars`);
          }
          currentChunk = section + "\n\n";
        } else {
          currentChunk += section + "\n\n";
        }
      }

      // Add final chunk if there's content
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        console.log(
          `✅ Added final chunk: ${currentChunk.trim().length} chars`
        );
      }

      // If we still only have 1 chunk or chunks are too large, force equal splits
      if (
        chunks.length === 1 ||
        chunks.some((chunk) => chunk.length > targetChunkSize)
      ) {
        console.log("🔧 Forcing equal-sized chunks...");
        const originalText = chunks.length === 1 ? chunks[0] : text;
        chunks = [];

        // Calculate how many chunks we need
        const totalChunks = Math.ceil(originalText.length / targetChunkSize);
        console.log(`📊 Splitting into ${totalChunks} equal chunks`);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * targetChunkSize;
          const end = Math.min(start + targetChunkSize, originalText.length);
          let chunk = originalText.substring(start, end);

          // Try to break at a newline to avoid splitting items
          if (end < originalText.length) {
            const lastNewline = chunk.lastIndexOf("\n");
            if (lastNewline > targetChunkSize * 0.7) {
              // Only if we don't lose too much content
              chunk = originalText.substring(start, start + lastNewline);
            }
          }

          if (chunk.trim().length > 50) {
            chunks.push(chunk.trim());
            console.log(
              `✅ Added equal chunk ${i + 1}: ${chunk.trim().length} chars`
            );
          }
        }
      }

      const validChunks = chunks.filter((chunk) => chunk.trim().length > 50);
      console.log(`📊 Created ${validChunks.length} forced chunks`);
      return validChunks;
    }

    // Fallback to page-based chunking
    const pageBreaks = text.split(/Page\s*\d+/gi);
    console.log(`📄 Found ${pageBreaks.length} page sections`);

    // Process each page section
    for (let i = 0; i < pageBreaks.length; i++) {
      const pageContent = pageBreaks[i].trim();

      if (pageContent.length < 100) continue; // Skip tiny sections

      console.log(
        `📄 Processing page section ${i + 1}: ${pageContent.length} chars`
      );

      if (pageContent.length <= maxChunkSize) {
        // Page fits in one chunk
        chunks.push(pageContent);
        console.log(`✅ Page ${i + 1} added as single chunk`);
      } else {
        // Split large page by wine sections or double line breaks
        const subSections = pageContent.split(/\n\s*\n\s*(?=[A-Z])/); // Split on double line breaks followed by capital letters

        let currentChunk = "";

        for (const subSection of subSections) {
          if (currentChunk.length + subSection.length > maxChunkSize) {
            if (currentChunk.trim().length > 0) {
              chunks.push(currentChunk.trim());
              console.log(
                `✅ Added chunk: ${currentChunk.trim().length} chars`
              );
            }
            currentChunk = subSection + "\n\n";
          } else {
            currentChunk += subSection + "\n\n";
          }
        }

        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          console.log(
            `✅ Added final chunk: ${currentChunk.trim().length} chars`
          );
        }
      }
    }

    const validChunks = chunks.filter((chunk) => chunk.trim().length > 50);
    console.log(`📊 Created ${validChunks.length} valid chunks`);

    return validChunks;
  }

  /**
   * Remove duplicate items based on similarity
   */
  private removeDuplicateItems(items: CleanMenuItem[]): CleanMenuItem[] {
    const uniqueItems: CleanMenuItem[] = [];
    const seenNames = new Set<string>();

    for (const item of items) {
      const normalizedName = item.name.toLowerCase().trim();
      const key = `${normalizedName}|${item.itemType}|${item.price || 0}`;

      if (!seenNames.has(key)) {
        seenNames.add(key);
        uniqueItems.push(item);
      }
    }

    return uniqueItems;
  }

  /**
   * Wrapper for AI calls with exponential backoff retry logic.
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 2000,
    backoff = 2
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (error.status === 503 && i < retries - 1) {
          const retryDelay = delay * Math.pow(backoff, i);
          console.warn(
            `Attempt ${i + 1} failed with 503. Retrying in ${retryDelay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  /**
   * Build system instruction for AI
   */
  private buildSystemInstruction(): string {
    return `
You are a menu parsing specialist. Extract menu items from restaurant menu text and return ONLY a valid JSON object.

CRITICAL INSTRUCTION: Extract EVERY SINGLE menu item found in the document. Do not skip items, do not summarize, do not limit the count. If there are 50+ wines, extract all 50+. If there are 30+ food items, extract all 30+. Extract ALL menu items regardless of type.

GUIDELINES:
1. Extract ONLY actual menu items (food, drinks, wines) - skip headers, descriptions, decorative text
2. Determine item type: "food", "beverage", or "wine"
3. Extract prices accurately - look for £, $, € symbols and numbers
4. For wines: extract vintage, producer, region, serving options (glass/bottle/half-bottle prices)
5. Look for multiple serving sizes and prices: "by the glass", "125ml", "175ml", "bottle", "half bottle", "magnum"
6. Extract serving options as array: [{"size": "Glass", "price": 8.50}, {"size": "Bottle", "price": 32.00}]
7. Categorize items logically (appetizers, mains, desserts, wines, etc.)
8. Set confidence score (0-100) based on how clear the extraction is
9. Be conservative - if unsure about details, leave fields empty rather than guess
10. NEVER skip wine items - extract every wine mentioned in the document
11. NEVER skip food items - extract every food dish, appetizer, main, dessert, and side mentioned
12. NEVER skip beverage items - extract every cocktail, beer, spirit, soft drink, coffee, and tea mentioned
13. Extract ALL items from every section: appetizers, soups, salads, mains, desserts, sides, cocktails, beers, spirits, etc.

ITEM TYPES:
- "food": Dishes, appetizers, mains, desserts, sides, soups, salads
- "beverage": Cocktails, beers, spirits, soft drinks, coffee, tea (non-wine alcoholic and non-alcoholic drinks)
- "wine": All wines including sparkling, champagne, port, sake

WINE SPECIFICS:
- Extract vintage year if present (e.g., "2018 Chardonnay" → vintage: 2018)
- Extract producer/winery names
- Extract regions/countries
- Identify wine color/type: "red", "white", "rosé", "orange", "sparkling" based on wine name, description, or section
- Look for serving options with different prices (glass vs bottle vs half-bottle)
- Extract serving sizes like: "125ml", "175ml", "250ml", "Glass", "Bottle", "Half Bottle", "Magnum"
- Common patterns: "£8.50/£32.00" = Glass £8.50, Bottle £32.00
- Extract ALL wines found in the document - do not limit the number
- Pay special attention to wine lists, wine sections, and extensive wine offerings
- Include wines from all sections: by-the-glass, by-the-bottle, red wines, white wines, sparkling, dessert wines
- If you see 30+ wines listed, make sure to extract all 30+ (never stop at 20 or 25)
- Scan the entire document thoroughly - wine lists often span multiple pages or sections
- Wine color identification patterns:
  * Red wines: Cabernet, Merlot, Pinot Noir, Shiraz, Syrah, Sangiovese, Tempranillo, Grenache, Zinfandel, Malbec, Nebbiolo, Barbera, Chianti, Bordeaux (red), Burgundy (red), Barolo, Brunello, Rioja (red)
  * White wines: Chardonnay, Sauvignon Blanc, Riesling, Pinot Grigio, Pinot Gris, Gewürztraminer, Viognier, Albariño, Verdejo, Grüner Veltliner, Chablis, Sancerre, Muscadet, Vouvray, Bordeaux (white), Burgundy (white)
  * Rosé wines: Rosé, Rosado, Pink wines, Provence rosé, Chiaretto, Rosato, wines from "ROSE" sections, wines from "ROSÉ" sections, wines labeled as pink or blush wines
  * Sparkling wines: Champagne, Prosecco, Cava, Crémant, Franciacorta, sparkling wine
  * Orange wines: Orange wine, amber wine, skin-contact white wines

ROSÉ WINE DETECTION (CRITICAL):
- Pay SPECIAL ATTENTION to sections labeled "ROSE", "ROSÉ", "ROSÉ WINE", "PINK WINES", "BLUSH WINES"
- Extract ALL wines from rosé sections regardless of naming variations
- Look for wines with "Rosé", "Rosado", "Rosato", "Chiaretto" in their names
- Include wines from Provence, Côtes de Provence regions (typically rosé)
- Extract wines with complex pricing (multiple prices per wine indicate different serving sizes)
- For rosé wines with multiple prices, create serving options: first price = glass, second = carafe/half bottle, third = bottle, etc.
- Examples of rosé patterns:
  * "2022 MiP CLASSIC ROSÉ, Côtes de Provence, France £9.50 £12.50 £36"
  * "2023 PROVENCE ROSÉ, Whispering Angel, Provence, France £11.50 £15.50 £45"
  * "2022 Chiaretto Rosato Gorgo Di Bricolo, Veneto, Italy £11.50 £42"

FOOD SPECIFICS:
- Extract dietary markers: (V) = Vegetarian, (VG) = Vegan, (GF) = Gluten-Free, (DF) = Dairy-Free
- Look for allergen warnings: contains nuts, dairy, gluten, shellfish, eggs
- Identify cooking methods from descriptions: grilled, fried, baked, roasted, sautéed, braised
- Extract key ingredients from item names and descriptions
- Handle add-on pricing: "Add chicken +£4.50", "Extra cheese +£2.00"
- Categorize food items accurately: appetizers, soups, salads, mains, desserts, sides
- Note spice levels: mild, medium, hot, spicy indicators
- Extract portion information: sharing platters, individual portions

BEVERAGE SPECIFICS:
- Extract ALL beverage items found in the document - do not limit the number
- Include cocktails, beers, spirits, soft drinks, coffee, tea, mocktails
- Extract spirit types: vodka, gin, rum, whiskey, tequila, brandy, cognac
- Extract beer styles: IPA, lager, stout, pilsner, wheat beer, porter, amber ale
- Extract cocktail ingredients: base spirits, mixers, garnishes, syrups
- Extract alcohol content when mentioned: ABV%, proof, strength
- Extract serving styles: neat, on the rocks, shaken, stirred, draft, bottled
- Extract serving sizes: single, double, shot, pint, half pint, glass, bottle
- Identify non-alcoholic options: mocktails, virgin versions, alcohol-free
- Extract temperature indicators: hot, cold, iced, frozen
- Categorize beverages accurately: cocktails, beers, spirits, non-alcoholic, coffee, tea
- If you see 20+ beverages listed, make sure to extract all 20+ (never stop at 15)
- Scan the entire document thoroughly - drink menus often have multiple sections

RESPONSE FORMAT:
Return ONLY a JSON object. Extract ALL menu items found:
{
  "menuName": "string",
  "items": [
    {
      "name": "string",
      "description": "string or null",
      "price": number or null,
      "category": "string",
      "itemType": "food|beverage|wine",
      "ingredients": [],
      "vintage": number or null,
      "producer": "string or null",
      "region": "string or null",
      "grapeVariety": [],
      "wineStyle": "string or null",
      "wineColor": "string or null",
      "servingOptions": [{"size": "Glass", "price": 12.50}, {"size": "Bottle", "price": 48.00}],
      "isVegetarian": false,
      "isVegan": false,
      "isGlutenFree": false,
      "confidence": 80,
      "originalText": "string"
    }
  ],
  "totalItemsFound": 0,
  "processingNotes": ["Parsed successfully"]
}

CRITICAL: Return valid JSON only. Extract ALL items. If unsure about a field, use null or empty array.
`.trim();
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(text: string, fileName?: string): string {
    return `
Parse this menu and extract menu items. Return ONLY a JSON object with the parsed data.

CRITICAL REQUIREMENTS: 
- Extract EVERY SINGLE menu item found in the document
- If there are 30+ wines, extract all 30+ (do not stop at 20 or 25)
- If there are 30+ food items, extract all 30+ (do not stop at 20 or 25)
- If there are 20+ beverage items, extract all 20+ (do not stop at 15)
- If there are 50+ items total, extract all 50+ 
- Scan the entire text thoroughly - don't miss items at the end
- Extract from ALL sections: appetizers, soups, salads, mains, desserts, sides, specials, cocktails, beers, spirits
- Focus on accuracy and COMPLETENESS
- Return ONLY valid JSON - no explanations or additional text

MENU TEXT:
${text}

Remember: Extract ALL items found. Do not limit the count. Return ONLY the JSON object in the specified format.
`;
  }

  /**
   * Parse AI response as JSON
   */
  private parseAIResponse(responseText: string): ParsedMenuData | null {
    try {
      console.log(`📝 AI Response length: ${responseText.length} characters`);

      // Clean response - remove markdown code blocks if present
      let cleanResponse = responseText.trim();
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // Try to find JSON object start/end
      const jsonStart = cleanResponse.indexOf("{");
      const jsonEnd = cleanResponse.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        console.log(`🔧 Extracted JSON: ${cleanResponse.length} characters`);
      }

      // Fix common JSON issues
      cleanResponse = cleanResponse
        .replace(/[\n\r\t]/g, " ") // Remove newlines, returns, tabs
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
        .replace(/,\s*$/, "") // Remove trailing comma at end
        .replace(/([^\\])"/g, '$1"') // Ensure quotes are properly escaped
        .trim();

      // Handle potential JSON truncation by finding the last complete object
      const lastCompleteObject = this.findLastCompleteJsonObject(cleanResponse);
      if (lastCompleteObject && lastCompleteObject !== cleanResponse) {
        console.log(
          `🔧 Detected JSON truncation, using ${lastCompleteObject.length}/${cleanResponse.length} characters`
        );
        cleanResponse = lastCompleteObject;
      }

      const parsed = JSON.parse(cleanResponse);

      // Basic validation
      if (!parsed.items || !Array.isArray(parsed.items)) {
        console.error("Invalid response structure: missing items array");
        return null;
      }

      console.log(`✅ Successfully parsed ${parsed.items.length} items`);

      // Add processing note for large item counts and validate completeness
      if (parsed.items.length > 30) {
        parsed.processingNotes = parsed.processingNotes || [];
        parsed.processingNotes.push(
          `Successfully extracted ${parsed.items.length} items (large menu)`
        );
      }

      // Warn if we might have truncation issues with very large lists
      if (parsed.items.length >= 45) {
        parsed.processingNotes = parsed.processingNotes || [];
        parsed.processingNotes.push(
          `Large wine list detected (${parsed.items.length} items) - verify all wines were captured`
        );
      }

      return parsed as ParsedMenuData;
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", error);
      console.log("📝 Response preview:", responseText.substring(0, 500));

      // Fallback: try to create a minimal response
      return {
        menuName: "Parsed Menu",
        items: [],
        totalItemsFound: 0,
        processingNotes: [
          `Failed to parse AI response: ${(error as Error).message}`,
        ],
      };
    }
  }

  /**
   * Validate and clean AI results
   */
  private validateAndCleanResults(data: ParsedMenuData): ParsedMenuData {
    const cleanedItems = data.items
      .filter((item) => this.isValidMenuItem(item))
      .map((item) => this.cleanMenuItem(item));

    return {
      menuName: data.menuName || "Unknown Menu",
      items: cleanedItems,
      totalItemsFound: cleanedItems.length,
      processingNotes: [
        ...(data.processingNotes || []),
        `Validation: ${data.items.length} raw items → ${cleanedItems.length} valid items`,
      ],
    };
  }

  /**
   * Check if menu item is valid
   */
  private isValidMenuItem(item: CleanMenuItem): boolean {
    // Must have name and category
    if (!item.name || !item.category || item.name.length < 2) {
      return false;
    }

    // Must have valid item type
    if (!["food", "beverage", "wine"].includes(item.itemType)) {
      return false;
    }

    // Must have reasonable confidence
    if (!item.confidence || item.confidence < 30) {
      return false;
    }

    return true;
  }

  /**
   * Find the last complete JSON object in a potentially truncated string
   */
  private findLastCompleteJsonObject(jsonString: string): string | null {
    try {
      // First try parsing the full string
      JSON.parse(jsonString);
      return jsonString;
    } catch (error) {
      // If that fails, try to find the last complete item array
      const itemsMatch = jsonString.match(/"items"\s*:\s*\[/);
      if (!itemsMatch) return null;

      const itemsStart = itemsMatch.index! + itemsMatch[0].length - 1; // Include the opening bracket
      let bracketCount = 0;
      let lastCompleteItemEnd = -1;

      for (let i = itemsStart; i < jsonString.length; i++) {
        const char = jsonString[i];
        if (char === "{") bracketCount++;
        else if (char === "}") {
          bracketCount--;
          if (bracketCount === 0) {
            // Found the end of a complete item
            lastCompleteItemEnd = i;
          }
        }
      }

      if (lastCompleteItemEnd > -1) {
        // Build a complete JSON object with the items we could parse
        const beforeItems = jsonString.substring(0, itemsStart);
        const completeItems = jsonString.substring(
          itemsStart,
          lastCompleteItemEnd + 1
        );
        const afterItems =
          '], "totalItemsFound": 0, "processingNotes": ["Parsing completed with potential truncation"] }';

        return beforeItems + completeItems + afterItems;
      }

      return null;
    }
  }

  /**
   * Clean individual menu item
   */
  private cleanMenuItem(item: CleanMenuItem): CleanMenuItem {
    // Convert price to number if it's a string
    let cleanPrice: number | undefined = undefined;
    if (item.price !== undefined && item.price !== null) {
      if (typeof item.price === "number") {
        cleanPrice = item.price;
      } else {
        const parsed = parseFloat(String(item.price));
        if (!isNaN(parsed)) {
          cleanPrice = parsed;
        }
      }
    }

    // Convert vintage to number if it's a string
    let cleanVintage: number | undefined = undefined;
    if (item.vintage !== undefined && item.vintage !== null) {
      if (typeof item.vintage === "number") {
        cleanVintage = item.vintage;
      } else {
        const parsed = parseInt(String(item.vintage), 10);
        if (!isNaN(parsed)) {
          cleanVintage = parsed;
        }
      }
    }

    // Map wine style to valid enum value for wine items
    let cleanWineStyle: string | undefined = undefined;
    let cleanWineColor: string | undefined = undefined;
    if (item.itemType === "wine") {
      if (item.wineStyle) {
        cleanWineStyle = this.mapWineStyleToEnum(item.wineStyle);
        console.log(
          `🍷 Mapped wine style: "${item.wineStyle}" → "${cleanWineStyle}"`
        );
      }
      if (item.wineColor) {
        cleanWineColor = this.mapWineColorToEnum(item.wineColor);
        console.log(
          `🍷 Mapped wine color: "${item.wineColor}" → "${cleanWineColor}"`
        );
      }

      // Enhanced rosé detection based on wine name and region if color not detected
      if (!cleanWineColor || cleanWineColor === "other") {
        const wineName = item.name.toLowerCase();
        const wineRegion = (item.region || "").toLowerCase();
        const wineCategory = (item.category || "").toLowerCase();

        // Check if this appears to be a rosé wine based on name patterns
        if (
          wineName.includes("rosé") ||
          wineName.includes("rose") ||
          wineName.includes("rosado") ||
          wineName.includes("rosato") ||
          wineName.includes("chiaretto") ||
          wineName.includes("pink") ||
          wineRegion.includes("provence") ||
          wineRegion.includes("côtes de provence") ||
          wineRegion.includes("cotes de provence") ||
          wineCategory.includes("rosé") ||
          wineCategory.includes("rose")
        ) {
          cleanWineColor = "rosé";
          console.log(
            `🍷 Enhanced rosé detection: "${item.name}" → rosé (based on name/region/category)`
          );
        }
      }
    }

    return {
      ...item,
      name: item.name.trim(),
      description: item.description?.trim(),
      category: item.category.trim(),
      producer: item.producer?.trim(),
      region: item.region?.trim(),
      wineStyle: cleanWineStyle || item.wineStyle, // Use mapped value for wines
      wineColor: cleanWineColor || item.wineColor, // Use mapped value for wines
      price: cleanPrice,
      vintage: cleanVintage,
      // Ensure confidence is between 0-100
      confidence: Math.max(0, Math.min(100, item.confidence || 50)),
      // Clean arrays
      ingredients: item.ingredients?.filter(
        (ing) => ing && ing.trim().length > 0
      ),
      grapeVariety: item.grapeVariety?.filter(
        (grape) => grape && grape.trim().length > 0
      ),
    };
  }

  /**
   * Enhance wine items with AI-powered grape variety identification
   */
  private async enhanceWineItemsWithGrapeVarieties(
    data: ParsedMenuData
  ): Promise<ParsedMenuData> {
    console.log("🍇 Enhancing wine items with grape variety identification...");

    const enhancedItems = [...data.items];
    const wineItems = enhancedItems.filter((item) => item.itemType === "wine");

    if (wineItems.length === 0) {
      console.log(
        "📝 No wine items found, skipping grape variety identification"
      );
      return data;
    }

    console.log(`🍷 Found ${wineItems.length} wine items to enhance`);

    // Filter out wines that already have grape varieties
    const winesToEnhance = wineItems.filter(
      (wine) => !wine.grapeVariety || wine.grapeVariety.length === 0
    );

    if (winesToEnhance.length === 0) {
      console.log("🍇 All wine items already have grape varieties");
      return data;
    }

    console.log(
      `🍇 Processing ${winesToEnhance.length} wines without grape varieties`
    );

    try {
      // Use the batch method which has built-in rate limiting
      const results = await this.grapeIdentifier.identifyBatch(
        winesToEnhance.map((wine) => ({
          name: wine.name,
          description: wine.description,
          producer: wine.producer,
          region: wine.region,
        }))
      );

      let enhancedCount = 0;

      // Apply results back to the items
      for (let i = 0; i < winesToEnhance.length; i++) {
        const wine = winesToEnhance[i];
        const grapeResult = results[i];

        if (grapeResult && grapeResult.grapeVarieties.length > 0) {
          // Find the item in enhancedItems and update it
          const itemIndex = enhancedItems.findIndex(
            (item) =>
              item.name === wine.name && item.originalText === wine.originalText
          );

          if (itemIndex !== -1) {
            enhancedItems[itemIndex] = {
              ...enhancedItems[itemIndex],
              grapeVariety: grapeResult.grapeVarieties,
            };
            enhancedCount++;

            console.log(
              `🍇 Enhanced "${
                wine.name
              }" with varieties: ${grapeResult.grapeVarieties.join(", ")} (${
                grapeResult.confidence
              }% confidence)`
            );
          }
        }
      }

      // Update processing notes with detailed information
      const updatedNotes = [
        ...data.processingNotes,
        `Grape variety identification: Enhanced ${enhancedCount}/${winesToEnhance.length} wine items`,
      ];

      console.log(
        `✅ Grape variety enhancement complete: ${enhancedCount}/${winesToEnhance.length} wines enhanced`
      );

      return {
        ...data,
        items: enhancedItems,
        processingNotes: updatedNotes,
      };
    } catch (error) {
      console.error("🚫 Batch grape variety identification failed:", error);

      // Add error to processing notes
      const updatedNotes = [
        ...data.processingNotes,
        `Grape variety identification failed: ${(error as Error).message}`,
      ];

      return {
        ...data,
        processingNotes: updatedNotes,
      };
    }
  }

  /**
   * Enhance food items with detailed culinary analysis
   */
  private async enhanceFoodItemsWithDetails(
    data: ParsedMenuData
  ): Promise<ParsedMenuData> {
    console.log("🍽️ Enhancing food items with detailed analysis...");

    const enhancedItems = [...data.items];
    const foodItems = enhancedItems.filter((item) => item.itemType === "food");

    if (foodItems.length === 0) {
      console.log("📝 No food items found, skipping food enhancement");
      return data;
    }

    console.log(`🍽️ Found ${foodItems.length} food items to enhance`);

    // Filter out foods that already have comprehensive data
    const foodsToEnhance = foodItems.filter(
      (food) =>
        !food.ingredients ||
        food.ingredients.length === 0 ||
        !food.cookingMethods ||
        food.cookingMethods.length === 0
    );

    if (foodsToEnhance.length === 0) {
      console.log("🍽️ All food items already have detailed information");
      return data;
    }

    console.log(
      `🍽️ Processing ${foodsToEnhance.length} foods without detailed information`
    );

    try {
      // Use the batch method which has built-in rate limiting
      const results = await this.foodEnhancer.enhanceBatch(
        foodsToEnhance.map((food) => ({
          name: food.name,
          description: food.description,
          category: food.category,
        }))
      );

      let enhancedCount = 0;

      // Apply results back to the items
      for (let i = 0; i < foodsToEnhance.length; i++) {
        const food = foodsToEnhance[i];
        const enhancementResult = results[i];

        if (enhancementResult) {
          // Find the item in enhancedItems and update it
          const itemIndex = enhancedItems.findIndex(
            (item) =>
              item.name === food.name && item.originalText === food.originalText
          );

          if (itemIndex !== -1) {
            enhancedItems[itemIndex] = {
              ...enhancedItems[itemIndex],
              ingredients: enhancementResult.ingredients,
              cookingMethods: enhancementResult.cookingMethods,
              allergens: enhancementResult.allergens,
              isVegetarian: enhancementResult.dietaryTags.isVegetarian,
              isVegan: enhancementResult.dietaryTags.isVegan,
              isGlutenFree: enhancementResult.dietaryTags.isGlutenFree,
              isDairyFree: enhancementResult.dietaryTags.isDairyFree,
              isSpicy: enhancementResult.dietaryTags.isSpicy,
            };
            enhancedCount++;

            console.log(
              `🍽️ Enhanced "${food.name}" with ${enhancementResult.ingredients.length} ingredients, ${enhancementResult.cookingMethods.length} methods (${enhancementResult.confidence}% confidence)`
            );
          }
        }
      }

      // Update processing notes with detailed information
      const updatedNotes = [
        ...data.processingNotes,
        `Food enhancement: Enhanced ${enhancedCount}/${foodsToEnhance.length} food items with detailed culinary analysis`,
      ];

      console.log(
        `✅ Food enhancement complete: ${enhancedCount}/${foodsToEnhance.length} foods enhanced`
      );

      return {
        ...data,
        items: enhancedItems,
        processingNotes: updatedNotes,
      };
    } catch (error) {
      console.error("🚫 Batch food enhancement failed:", error);

      // Add error to processing notes
      const updatedNotes = [
        ...data.processingNotes,
        `Food enhancement failed: ${(error as Error).message}`,
      ];

      return {
        ...data,
        processingNotes: updatedNotes,
      };
    }
  }

  /**
   * Enhance beverage items with detailed analysis
   */
  private async enhanceBeverageItemsWithDetails(
    data: ParsedMenuData
  ): Promise<ParsedMenuData> {
    console.log("🍹 Enhancing beverage items with detailed analysis...");

    const enhancedItems = [...data.items];
    const beverageItems = enhancedItems.filter(
      (item) => item.itemType === "beverage"
    );

    if (beverageItems.length === 0) {
      console.log("📝 No beverage items found, skipping beverage enhancement");
      return data;
    }

    console.log(`🍹 Found ${beverageItems.length} beverage items to enhance`);

    // Filter out beverages that already have comprehensive data
    const beveragesToEnhance = beverageItems.filter(
      (beverage) =>
        !beverage.spiritType &&
        !beverage.beerStyle &&
        (!beverage.cocktailIngredients ||
          beverage.cocktailIngredients.length === 0)
    );

    if (beveragesToEnhance.length === 0) {
      console.log("🍹 All beverage items already have detailed information");
      return data;
    }

    console.log(
      `🍹 Processing ${beveragesToEnhance.length} beverages without detailed information`
    );

    try {
      // Use the enhancer service which has built-in rate limiting
      const results = await this.beverageEnhancer.enhanceBeverageItems(
        beveragesToEnhance
      );

      let enhancedCount = 0;

      // Apply results back to the items
      for (let i = 0; i < beveragesToEnhance.length; i++) {
        const beverage = beveragesToEnhance[i];
        const enhancedBeverage = results.items[i];

        if (enhancedBeverage) {
          // Find the item in enhancedItems and update it
          const itemIndex = enhancedItems.findIndex(
            (item) =>
              item.name === beverage.name &&
              item.originalText === beverage.originalText
          );

          if (itemIndex !== -1) {
            enhancedItems[itemIndex] = {
              ...enhancedItems[itemIndex],
              spiritType: enhancedBeverage.spiritType,
              beerStyle: enhancedBeverage.beerStyle,
              cocktailIngredients: enhancedBeverage.cocktailIngredients,
              alcoholContent: enhancedBeverage.alcoholContent,
              servingStyle: enhancedBeverage.servingStyle,
              isNonAlcoholic: enhancedBeverage.isNonAlcoholic,
              temperature: enhancedBeverage.temperature,
            };
            enhancedCount++;

            const enhancementDetails = [];
            if (enhancedBeverage.spiritType)
              enhancementDetails.push(`spirit: ${enhancedBeverage.spiritType}`);
            if (enhancedBeverage.beerStyle)
              enhancementDetails.push(`beer: ${enhancedBeverage.beerStyle}`);
            if (
              enhancedBeverage.cocktailIngredients &&
              enhancedBeverage.cocktailIngredients.length > 0
            ) {
              enhancementDetails.push(
                `${enhancedBeverage.cocktailIngredients.length} ingredients`
              );
            }

            console.log(
              `🍹 Enhanced "${beverage.name}" with ${enhancementDetails.join(
                ", "
              )} (${enhancedBeverage.confidence}% confidence)`
            );
          }
        }
      }

      // Update processing notes with detailed information
      const updatedNotes = [
        ...data.processingNotes,
        `Beverage enhancement: Enhanced ${enhancedCount}/${beveragesToEnhance.length} beverage items with detailed analysis`,
        ...results.processingNotes,
      ];

      console.log(
        `✅ Beverage enhancement complete: ${enhancedCount}/${beveragesToEnhance.length} beverages enhanced`
      );

      return {
        ...data,
        items: enhancedItems,
        processingNotes: updatedNotes,
      };
    } catch (error) {
      console.error("🚫 Batch beverage enhancement failed:", error);

      // Add error to processing notes
      const updatedNotes = [
        ...data.processingNotes,
        `Beverage enhancement failed: ${(error as Error).message}`,
      ];

      return {
        ...data,
        processingNotes: updatedNotes,
      };
    }
  }

  /**
   * Map AI-generated wine color to valid enum values
   */
  private mapWineColorToEnum(wineColor: string | undefined): string {
    if (!wineColor) return "other";

    const color = wineColor.toLowerCase().trim();

    // Red wines
    if (
      color.includes("red") ||
      color.includes("rouge") ||
      color.includes("tinto") ||
      color.includes("rosso")
    ) {
      return "red";
    }

    // White wines
    if (
      color.includes("white") ||
      color.includes("blanc") ||
      color.includes("blanco") ||
      color.includes("bianco") ||
      color.includes("weiss") ||
      color.includes("branco")
    ) {
      return "white";
    }

    // Rosé wines - Enhanced detection
    if (
      color.includes("rosé") ||
      color.includes("rose") ||
      color.includes("rosado") ||
      color.includes("rosato") ||
      color.includes("chiaretto") ||
      color.includes("pink") ||
      color.includes("blush") ||
      color.includes("provence") || // Many Provence wines are rosé
      color.includes("côtes de provence") ||
      color.includes("cotes de provence")
    ) {
      return "rosé";
    }

    // Sparkling wines
    if (
      color.includes("sparkling") ||
      color.includes("champagne") ||
      color.includes("prosecco") ||
      color.includes("cava") ||
      color.includes("cremant") ||
      color.includes("crémant") ||
      color.includes("franciacorta") ||
      color.includes("spumante") ||
      color.includes("pétillant") ||
      color.includes("petillant")
    ) {
      return "sparkling";
    }

    // Orange wines
    if (
      color.includes("orange") ||
      color.includes("amber") ||
      color.includes("skin contact") ||
      color.includes("skin-contact")
    ) {
      return "orange";
    }

    // Default to other if we can't determine
    return "other";
  }

  /**
   * Map AI-generated wine style to valid enum values
   */
  private mapWineStyleToEnum(wineStyle: string | undefined): string {
    if (!wineStyle) return "still";

    const style = wineStyle.toLowerCase().trim();

    // Sparkling wines
    if (
      style.includes("sparkling") ||
      style.includes("prosecco") ||
      style.includes("cava") ||
      style.includes("cremant") ||
      style.includes("franciacorta") ||
      style.includes("petillant") ||
      style.includes("pétillant")
    ) {
      return "sparkling";
    }

    // Champagne
    if (style.includes("champagne")) {
      return "champagne";
    }

    // Dessert wines
    if (
      style.includes("dessert") ||
      style.includes("sweet") ||
      style.includes("ice wine") ||
      style.includes("icewine") ||
      style.includes("late harvest") ||
      style.includes("noble rot") ||
      style.includes("botrytis") ||
      style.includes("aszú") ||
      style.includes("aszu") ||
      style.includes("moscato") ||
      style.includes("moscatel") ||
      style.includes("sauternes") ||
      style.includes("beerenauslese") ||
      style.includes("trockenbeerenauslese") ||
      style.includes("eiswein") ||
      style.includes("vin doux") ||
      style.includes("passito") ||
      style.includes("vendange tardive")
    ) {
      return "dessert";
    }

    // Fortified wines
    if (
      style.includes("fortified") ||
      style.includes("port") ||
      style.includes("porto") ||
      style.includes("sherry") ||
      style.includes("madeira") ||
      style.includes("marsala") ||
      style.includes("vermouth") ||
      style.includes("commandaria") ||
      style.includes("vin doux naturel") ||
      style.includes("mistelle") ||
      style.includes("vintage port") ||
      style.includes("tawny port") ||
      style.includes("ruby port") ||
      style.includes("late bottled vintage") ||
      style.includes("lbv") ||
      style.includes("crusted port") ||
      style.includes("white port") ||
      style.includes("fino") ||
      style.includes("manzanilla") ||
      style.includes("amontillado") ||
      style.includes("oloroso") ||
      style.includes("palo cortado") ||
      style.includes("pedro ximenez") ||
      style.includes("cream sherry") ||
      style.includes("bual") ||
      style.includes("verdelho") ||
      style.includes("sercial") ||
      style.includes("malmsey")
    ) {
      return "fortified";
    }

    // Default to still wine for everything else
    return "still";
  }
}
