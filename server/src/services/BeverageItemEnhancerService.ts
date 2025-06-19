import { GoogleGenerativeAI } from "@google/generative-ai";
import { CleanMenuItem } from "./CleanMenuParserService";

export class BeverageItemEnhancerService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Enhance beverage items with detailed analysis
   */
  async enhanceBeverageItems(beverageItems: CleanMenuItem[]): Promise<{
    items: CleanMenuItem[];
    processingNotes: string[];
  }> {
    if (beverageItems.length === 0) {
      return { items: [], processingNotes: ["No beverage items to enhance"] };
    }

    console.log(`🍹 Enhancing ${beverageItems.length} beverage items...`);

    const processingNotes: string[] = [];
    const enhancedItems: CleanMenuItem[] = [];

    try {
      // Process beverages in batches to avoid overwhelming the API
      const batchSize = 10;
      const batches = this.chunkArray(beverageItems, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(
          `🔄 Processing beverage batch ${i + 1}/${batches.length} (${
            batch.length
          } items)`
        );

        try {
          const batchResult = await this.enhanceBeverageBatch(batch);
          enhancedItems.push(...batchResult.items);
          processingNotes.push(...batchResult.notes);

          // Rate limiting between batches
          if (i < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error: any) {
          console.error(`❌ Beverage batch ${i + 1} failed:`, error.message);
          // Add original items without enhancement if batch fails
          enhancedItems.push(...batch);
          processingNotes.push(
            `Batch ${i + 1} enhancement failed: ${error.message}`
          );
        }
      }

      console.log(`✅ Enhanced ${enhancedItems.length} beverage items`);
      return { items: enhancedItems, processingNotes };
    } catch (error: any) {
      console.error("❌ Beverage enhancement failed:", error.message);
      return {
        items: beverageItems, // Return original items
        processingNotes: [`Beverage enhancement failed: ${error.message}`],
      };
    }
  }

  /**
   * Enhance a batch of beverage items
   */
  private async enhanceBeverageBatch(beverageItems: CleanMenuItem[]): Promise<{
    items: CleanMenuItem[];
    notes: string[];
  }> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: this.buildBeverageAnalysisPrompt(),
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      },
    });

    const prompt = this.buildBeverageBatchPrompt(beverageItems);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    try {
      const analysisResult = this.parseBeverageAnalysisResponse(responseText);
      const enhancedItems = this.applyBeverageEnhancements(
        beverageItems,
        analysisResult
      );

      return {
        items: enhancedItems,
        notes: [`Enhanced ${enhancedItems.length} beverages in batch`],
      };
    } catch (error: any) {
      console.error("Failed to parse beverage analysis:", error.message);
      return {
        items: beverageItems,
        notes: [`Failed to parse beverage analysis: ${error.message}`],
      };
    }
  }

  /**
   * Build system instruction for beverage analysis
   */
  private buildBeverageAnalysisPrompt(): string {
    return `
You are a master bartender, beverage specialist, and pricing extraction expert. Your job is to extract comprehensive beverage information including prices and serving options.

CRITICAL EXTRACTION RULES:

1. PRICE AND SERVING SIZE EXTRACTION:
   - Extract ALL prices and their associated serving sizes
   - Common beer/beverage serving sizes: "pint", "half pint", "bottle", "can", "glass", "shot", "double", "pitcher", "jug"
   - Look for price patterns: £X.XX, $X.XX, €X.XX, X.XX (without symbol)
   - Multiple prices indicate different serving sizes
   
   Examples:
   - "Stella Artois Draft: Pint £6.50, Half Pint £3.25" → servingOptions: [{"size": "Pint", "price": 6.50}, {"size": "Half Pint", "price": 3.25}]
   - "Guinness: £5.80" → price: 5.80, servingStyle: "draft" (if context suggests)
   - "Corona Bottle £4.75, Draft Pint £5.50" → servingOptions: [{"size": "Bottle", "price": 4.75}, {"size": "Pint", "price": 5.50}]
   - "Whiskey: Single £8, Double £14" → servingOptions: [{"size": "Single", "price": 8}, {"size": "Double", "price": 14}]

2. INGREDIENT EXTRACTION (for cocktails):
   - Base spirits (vodka, gin, rum, whiskey, tequila, brandy, cognac)
   - Mixers (juices, sodas, syrups, liqueurs, bitters)
   - Garnishes (lemon peel, cherry, olive, mint, lime wheel)

3. NORMALIZE INGREDIENT NAMES:
   - "fresh lime juice" → "lime juice"
   - "house-made simple syrup" → "simple syrup" 
   - "muddled mint leaves" → "mint"

4. SPIRIT TYPE DETECTION:
   - Look for: vodka, gin, rum, whiskey, whisky, bourbon, rye, tequila, brandy, cognac
   - Brand names: "Grey Goose vodka" → vodka, "Hendrick's gin" → gin

5. BEER STYLE IDENTIFICATION:
   - Look for: IPA, India Pale Ale, lager, stout, pilsner, wheat beer, porter, amber ale, bitter, ale
   - Extract from descriptions: "hoppy India Pale Ale" → IPA, "dry stout" → stout

6. ALCOHOL CONTENT PARSING:
   - Look for: "X% ABV", "X.X% ABV", "X% vol", "alcohol by volume"
   - Extract numbers: "5.6% ABV" → "5.6% ABV"

7. SERVING STYLE DETECTION:
   - Look for: draft, tap, bottled, canned, neat, "on the rocks", shaken, stirred
   - Extract from context: "draft pint" → "draft", "bottled beer" → "bottled"

8. NON-ALCOHOLIC DETECTION:
   - Keywords: "virgin", "mocktail", "non-alcoholic", "alcohol-free", "0%"

PRICE EXTRACTION EXAMPLES:
- "Heineken: Pint £5.50, Bottle £4.25, Can £3.90" 
  → servingOptions: [{"size": "Pint", "price": 5.50}, {"size": "Bottle", "price": 4.25}, {"size": "Can", "price": 3.90}]

- "House Red Wine: Glass £7, Carafe £18, Bottle £28"
  → servingOptions: [{"size": "Glass", "price": 7}, {"size": "Carafe", "price": 18}, {"size": "Bottle", "price": 28}]

- "Vodka Tonic £8.50"
  → price: 8.50, cocktailIngredients: ["vodka", "tonic water"]

- "Premium Whiskey: Single £12, Double £22, Triple £32"
  → servingOptions: [{"size": "Single", "price": 12}, {"size": "Double", "price": 22}, {"size": "Triple", "price": 32}]

Return ONLY valid JSON in this exact format:
{
  "beverages": [
    {
      "index": 0,
      "spiritType": "vodka",
      "beerStyle": null,
      "cocktailIngredients": ["vodka", "cranberry juice", "lime", "lime wheel"],
      "alcoholContent": null,
      "servingStyle": "shaken",
      "isNonAlcoholic": false,
      "temperature": null,
      "price": 8.50,
      "servingOptions": [
        {"size": "Regular", "price": 8.50},
        {"size": "Large", "price": 12.00}
      ],
      "confidence": 90
    }
  ]
}

CRITICAL RULES:
- If multiple prices found, create servingOptions array
- If only one price found, use price field
- Extract ALL serving sizes and their prices
- Be precise with price numbers (no rounding unless necessary)
- Include currency-free numeric prices only
- Normalize serving size names (e.g., "1/2 pint" → "Half Pint")
`.trim();
  }

  /**
   * Build prompt for beverage batch analysis
   */
  private buildBeverageBatchPrompt(beverageItems: CleanMenuItem[]): string {
    const beverageList = beverageItems
      .map((item, index) => {
        return `${index}. ${item.name}${
          item.description ? ` - ${item.description}` : ""
        }`;
      })
      .join("\n");

    return `
Analyze these beverage menu items and extract detailed beverage information:

${beverageList}

Return analysis for all beverages as JSON in the specified format.
    `.trim();
  }

  /**
   * Parse beverage analysis response
   */
  private parseBeverageAnalysisResponse(responseText: string): any {
    console.log("🔍 Raw AI response:", responseText.substring(0, 500));

    // Clean response
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

    // Find JSON object
    const jsonStart = cleanResponse.indexOf("{");
    const jsonEnd = cleanResponse.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
    }

    console.log("🧹 Cleaned response:", cleanResponse.substring(0, 300));

    try {
      const parsed = JSON.parse(cleanResponse);
      console.log(
        "✅ Parsed successfully:",
        JSON.stringify(parsed, null, 2).substring(0, 500)
      );
      return parsed;
    } catch (error) {
      console.error("❌ JSON parse error:", error);
      console.log("📝 Failed response:", cleanResponse);
      throw error;
    }
  }

  /**
   * Apply beverage enhancements to items
   */
  private applyBeverageEnhancements(
    originalItems: CleanMenuItem[],
    analysisResult: any
  ): CleanMenuItem[] {
    const enhancedItems = [...originalItems];

    console.log("🔧 Applying enhancements to", enhancedItems.length, "items");
    console.log("📋 Analysis result:", JSON.stringify(analysisResult, null, 2));

    if (analysisResult.beverages && Array.isArray(analysisResult.beverages)) {
      analysisResult.beverages.forEach(
        (analysis: any, analysisIndex: number) => {
          const index = analysis.index;
          console.log(
            `🎯 Processing analysis ${analysisIndex} for item index ${index}`
          );

          if (index >= 0 && index < enhancedItems.length) {
            const item = enhancedItems[index];
            let enhancementsApplied = [];

            // Apply beverage-specific enhancements with detailed logging
            if (analysis.spiritType && analysis.spiritType.trim()) {
              item.spiritType = analysis.spiritType.trim();
              enhancementsApplied.push(`spiritType: ${item.spiritType}`);
            }

            if (analysis.beerStyle && analysis.beerStyle.trim()) {
              item.beerStyle = analysis.beerStyle.trim();
              enhancementsApplied.push(`beerStyle: ${item.beerStyle}`);
            }

            if (
              analysis.cocktailIngredients &&
              Array.isArray(analysis.cocktailIngredients)
            ) {
              // Enhanced ingredient validation and normalization
              const validIngredients = this.validateAndNormalizeIngredients(
                analysis.cocktailIngredients
              );

              if (validIngredients.length > 0) {
                item.cocktailIngredients = validIngredients;
                enhancementsApplied.push(
                  `cocktailIngredients: [${validIngredients.join(", ")}]`
                );
              }
            }

            if (analysis.alcoholContent && analysis.alcoholContent.trim()) {
              item.alcoholContent = analysis.alcoholContent.trim();
              enhancementsApplied.push(
                `alcoholContent: ${item.alcoholContent}`
              );
            }

            if (analysis.servingStyle && analysis.servingStyle.trim()) {
              item.servingStyle = analysis.servingStyle.trim();
              enhancementsApplied.push(`servingStyle: ${item.servingStyle}`);
            }

            if (typeof analysis.isNonAlcoholic === "boolean") {
              item.isNonAlcoholic = analysis.isNonAlcoholic;
              enhancementsApplied.push(
                `isNonAlcoholic: ${item.isNonAlcoholic}`
              );
            }

            if (analysis.temperature && analysis.temperature.trim()) {
              item.temperature = analysis.temperature.trim();
              enhancementsApplied.push(`temperature: ${item.temperature}`);
            }

            // Apply price information if extracted
            if (analysis.price && typeof analysis.price === "number") {
              item.price = analysis.price;
              enhancementsApplied.push(`price: £${item.price}`);
            }

            // Apply serving options if extracted (for items with multiple sizes/prices)
            if (
              analysis.servingOptions &&
              Array.isArray(analysis.servingOptions)
            ) {
              const validServingOptions = analysis.servingOptions
                .filter(
                  (option: any) =>
                    option &&
                    typeof option.size === "string" &&
                    typeof option.price === "number" &&
                    option.size.trim().length > 0 &&
                    option.price > 0
                )
                .map((option: any) => ({
                  size: option.size.trim(),
                  price: Number(option.price),
                }));

              if (validServingOptions.length > 0) {
                item.servingOptions = validServingOptions;
                enhancementsApplied.push(
                  `servingOptions: ${
                    validServingOptions.length
                  } options (${validServingOptions
                    .map(
                      (o: { size: string; price: number }) =>
                        `${o.size}: £${o.price}`
                    )
                    .join(", ")})`
                );

                // If we have serving options, clear the single price field to avoid confusion
                if (item.price && validServingOptions.length > 1) {
                  item.price = undefined;
                  enhancementsApplied.push(
                    "cleared single price (using servingOptions instead)"
                  );
                }
              }
            }

            // Update confidence if provided
            if (analysis.confidence && analysis.confidence > item.confidence) {
              item.confidence = Math.min(analysis.confidence, 100);
              enhancementsApplied.push(`confidence: ${item.confidence}%`);
            }

            console.log(
              `✅ Enhanced "${item.name}": ${
                enhancementsApplied.join(", ") || "No enhancements"
              }`
            );
          } else {
            console.warn(
              `⚠️ Invalid index ${index} for analysis ${analysisIndex}`
            );
          }
        }
      );
    } else {
      console.warn("⚠️ No beverages array found in analysis result");
    }

    return enhancedItems;
  }

  /**
   * Validate and normalize extracted ingredients for maximum accuracy
   */
  private validateAndNormalizeIngredients(ingredients: string[]): string[] {
    // Preparation methods that should NOT be considered ingredients
    const preparationMethods = [
      "shaken",
      "stirred",
      "muddled",
      "built",
      "strained",
      "blended",
      "chilled",
      "frozen",
      "neat",
      "on the rocks",
      "straight up",
      "garnished",
      "served",
      "topped",
      "finished",
      "mixed",
      "combined",
    ];

    // Ingredient normalization mappings
    const normalizations: Record<string, string> = {
      // Fresh/house-made variations
      "fresh lime juice": "lime juice",
      "fresh lemon juice": "lemon juice",
      "fresh-squeezed lime juice": "lime juice",
      "fresh-squeezed lemon juice": "lemon juice",
      "freshly squeezed lime juice": "lime juice",
      "freshly squeezed lemon juice": "lemon juice",
      "house-made simple syrup": "simple syrup",
      "homemade simple syrup": "simple syrup",
      "house simple syrup": "simple syrup",
      "homemade grenadine": "grenadine",
      "house-made grenadine": "grenadine",

      // Muddled/prepared variations
      "muddled mint": "mint",
      "muddled mint leaves": "mint",
      "fresh mint": "mint",
      "fresh mint leaves": "mint",
      "muddled cucumber": "cucumber",
      "fresh cucumber": "cucumber",

      // Garnish variations
      "lemon twist": "lemon peel",
      "orange twist": "orange peel",
      "lime twist": "lime peel",
      "maraschino cherry": "cherry",
      "cocktail cherry": "cherry",

      // Soda/mixer variations
      "soda water": "soda water",
      "club soda": "soda water",
      "sparkling water": "soda water",
      "tonic water": "tonic",
      "ginger beer": "ginger beer",
      "ginger ale": "ginger ale",

      // Common misspellings/variations
      "simple syrup": "simple syrup",
      "triple sec": "triple sec",
      "dry vermouth": "vermouth",
      "sweet vermouth": "vermouth",
    };

    return ingredients
      .map((ingredient: string) => ingredient?.trim())
      .filter((ingredient: string) => {
        if (!ingredient || ingredient.length === 0) return false;

        const lowerIngredient = ingredient.toLowerCase();

        // Filter out preparation methods
        const isPreparationMethod = preparationMethods.some(
          (method) =>
            lowerIngredient.includes(method.toLowerCase()) &&
            lowerIngredient.split(" ").length <= 3 // Avoid filtering complex ingredient descriptions
        );

        if (isPreparationMethod) {
          console.log(`🚫 Filtered out preparation method: ${ingredient}`);
          return false;
        }

        return true;
      })
      .map((ingredient: string) => {
        const normalized = normalizations[ingredient.toLowerCase()];
        if (normalized) {
          console.log(`🔄 Normalized "${ingredient}" → "${normalized}"`);
          return normalized;
        }
        return ingredient;
      })
      .filter((ingredient: string, index: number, array: string[]) => {
        // Remove duplicates (case-insensitive)
        return (
          array.findIndex(
            (item) => item.toLowerCase() === ingredient.toLowerCase()
          ) === index
        );
      });
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
