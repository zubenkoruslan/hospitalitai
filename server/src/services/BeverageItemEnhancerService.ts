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
You are a professional beverage expert specializing in analyzing cocktails, beers, spirits, and non-alcoholic drinks.

CRITICAL: Always extract what you can identify from the name and description. Be specific and accurate.

BEVERAGE ANALYSIS RULES:

1. SPIRIT TYPE DETECTION:
   - Look for: vodka, gin, rum, whiskey, whisky, bourbon, rye, tequila, brandy, cognac
   - Examples: "Martini" → gin, "Manhattan" → whiskey, "Mojito" → rum
   - Include variations: "Scotch whisky" → whiskey, "Bourbon whiskey" → whiskey
   - Brand names: "Mirabeau French rosé gin" → gin, "Grey Goose vodka" → vodka

2. BEER STYLE IDENTIFICATION:
   - Look for: IPA, India Pale Ale, lager, stout, pilsner, wheat beer, porter, amber ale, bitter
   - Extract from descriptions: "hoppy India Pale Ale" → IPA, "dry stout" → stout
   - Brand context: "Guinness" → stout, "London Pride" → bitter

3. COCKTAIL INGREDIENTS EXTRACTION:
   - Extract ALL mentioned ingredients from name and description
   - Split on commas, ampersands (&), and "and" 
   - Include brand names: "Mirabeau French rosé gin" → "Mirabeau French rosé gin"
   - Include garnishes: "garnished with lemon peel" → "lemon peel"
   - Common patterns: spirits, mixers, garnishes, fruits, syrups, bitters
   - Examples: 
     * "vodka, cranberry juice, lime" → ["vodka", "cranberry juice", "lime"]
     * "Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel" → ["Mirabeau French rosé gin", "Lillet rosé vermouth", "Pampelle grapefruit apéritif", "lemon peel"]

4. ALCOHOL CONTENT PARSING:
   - Look for: "X% ABV", "X.X% ABV", "X% vol", "alcohol by volume"
   - Extract numbers: "5.6% ABV" → "5.6% ABV", "4.2%" → "4.2% ABV"

5. NON-ALCOHOLIC DETECTION:
   - Keywords: "virgin", "mocktail", "non-alcoholic", "alcohol-free"
   - Names: "Virgin Mojito" → isNonAlcoholic: true
   - Context: If no alcohol mentioned in description → likely non-alcoholic

6. SERVING STYLE DETECTION:
   - Look for: neat, "on the rocks", shaken, stirred, draft, bottled, pint, "half pint"
   - Extract from descriptions: "draft pint" → "draft", "bottle" → "bottled"

EXAMPLES:
- "Classic Martini - Premium vodka or gin, dry vermouth, olive"
  → spiritType: "gin", cocktailIngredients: ["vodka", "gin", "dry vermouth", "olive"]
- "Rosé Negroni - Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel"
  → spiritType: "gin", cocktailIngredients: ["Mirabeau French rosé gin", "Lillet rosé vermouth", "Pampelle grapefruit apéritif", "lemon peel"], servingStyle: "garnished"
- "Punk IPA - BrewDog hoppy India Pale Ale, 5.6% ABV"  
  → beerStyle: "IPA", alcoholContent: "5.6% ABV"
- "Virgin Mojito - Lime, mint, sugar, soda water"
  → isNonAlcoholic: true, cocktailIngredients: ["lime", "mint", "sugar", "soda water"]

Return ONLY valid JSON in this exact format:
{
  "beverages": [
    {
      "index": 0,
      "spiritType": "vodka",
      "beerStyle": null,
      "cocktailIngredients": ["vodka", "dry vermouth", "olive"],
      "alcoholContent": null,
      "servingStyle": null,
      "isNonAlcoholic": false,
      "temperature": null,
      "confidence": 90
    }
  ]
}

IMPORTANT: Always include isNonAlcoholic as true/false (never null). Extract ALL identifiable ingredients.
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
              // Filter out empty ingredients
              const validIngredients = analysis.cocktailIngredients
                .map((ing: string) => ing?.trim())
                .filter((ing: string) => ing && ing.length > 0);

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
