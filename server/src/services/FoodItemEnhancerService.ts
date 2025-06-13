import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FoodEnhancementResult {
  ingredients: string[];
  cookingMethods: string[];
  dietaryTags: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isSpicy: boolean;
  };
  allergens: string[];
  confidence: number;
}

export interface FoodItemToEnhance {
  name: string;
  description?: string;
  category: string;
}

export class FoodItemEnhancerService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Enhance a single food item with detailed information
   */
  async enhanceItem(
    item: FoodItemToEnhance
  ): Promise<FoodEnhancementResult | null> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: this.buildSystemInstruction(),
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.1,
        },
      });

      const prompt = this.buildEnhancementPrompt(item);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      return this.parseEnhancementResponse(responseText, item);
    } catch (error) {
      console.error(`❌ Food enhancement failed for "${item.name}":`, error);
      return null;
    }
  }

  /**
   * Enhance multiple food items in batch with rate limiting
   */
  async enhanceBatch(
    items: FoodItemToEnhance[]
  ): Promise<(FoodEnhancementResult | null)[]> {
    console.log(`🍽️ Enhancing ${items.length} food items...`);
    const results: (FoodEnhancementResult | null)[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(
        `🔄 Processing food item ${i + 1}/${items.length}: "${item.name}"`
      );

      try {
        const enhancement = await this.enhanceItem(item);
        results.push(enhancement);

        if (enhancement) {
          console.log(
            `✅ Enhanced "${item.name}" - ${enhancement.ingredients.length} ingredients, ${enhancement.cookingMethods.length} methods`
          );
        } else {
          console.log(`⚠️ No enhancement for "${item.name}"`);
        }

        // Rate limiting: 1 request per second
        if (i < items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Failed to enhance "${item.name}":`, error);
        results.push(null);
      }
    }

    const successCount = results.filter((r) => r !== null).length;
    console.log(
      `✅ Food enhancement complete: ${successCount}/${items.length} items enhanced`
    );

    return results;
  }

  private buildSystemInstruction(): string {
    return `
You are a culinary expert specializing in food analysis. Given a food item name and description, extract detailed information about ingredients, cooking methods, dietary restrictions, and allergens.

RESPONSE FORMAT: Return ONLY a JSON object:
{
  "ingredients": ["ingredient1", "ingredient2"],
  "cookingMethods": ["grilled", "sautéed"],
  "dietaryTags": {
    "isVegetarian": true/false,
    "isVegan": true/false,
    "isGlutenFree": true/false,
    "isDairyFree": true/false,
    "isSpicy": true/false
  },
  "allergens": ["dairy", "gluten", "nuts"],
  "confidence": 85
}

GUIDELINES:
1. Extract main ingredients from the name and description
2. Identify cooking methods (grilled, fried, baked, sautéed, roasted, etc.)
3. Determine dietary restrictions based on ingredients
4. Identify common allergens (dairy, gluten, nuts, shellfish, eggs, soy, fish)
5. Set confidence (0-100) based on information clarity
7. Be conservative - if unsure, mark as false or exclude from arrays
8. Focus on the most important ingredients (limit to 6-8 key ones)

DIETARY RULES:
- Vegetarian: No meat, fish, or poultry
- Vegan: No animal products (meat, dairy, eggs, honey)
- Gluten-free: No wheat, barley, rye, or gluten-containing ingredients
- Dairy-free: No milk, cheese, cream, butter, or dairy products
- Spicy: Contains chili, pepper, or spicy seasonings

Return valid JSON only.
`.trim();
  }

  private buildEnhancementPrompt(item: FoodItemToEnhance): string {
    const description = item.description || "No description available";

    return `
Analyze this food item and extract detailed information:

ITEM NAME: ${item.name}
DESCRIPTION: ${description}
CATEGORY: ${item.category}

Identify ingredients, cooking methods, dietary restrictions, and allergens.
Return the information in the specified JSON format.
`;
  }

  private parseEnhancementResponse(
    responseText: string,
    item: FoodItemToEnhance
  ): FoodEnhancementResult | null {
    try {
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

      const parsed = JSON.parse(cleanResponse);

      // Validate structure
      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) {
        console.warn(`Invalid ingredients for "${item.name}"`);
        return null;
      }

      if (!parsed.cookingMethods || !Array.isArray(parsed.cookingMethods)) {
        console.warn(`Invalid cooking methods for "${item.name}"`);
        return null;
      }

      if (!parsed.dietaryTags || typeof parsed.dietaryTags !== "object") {
        console.warn(`Invalid dietary tags for "${item.name}"`);
        return null;
      }

      // Ensure confidence is valid
      const confidence = Math.max(0, Math.min(100, parsed.confidence || 50));

      return {
        ingredients: parsed.ingredients.slice(0, 8), // Limit to 8 ingredients
        cookingMethods: parsed.cookingMethods.slice(0, 4), // Limit to 4 methods
        dietaryTags: {
          isVegetarian: Boolean(parsed.dietaryTags.isVegetarian),
          isVegan: Boolean(parsed.dietaryTags.isVegan),
          isGlutenFree: Boolean(parsed.dietaryTags.isGlutenFree),
          isDairyFree: Boolean(parsed.dietaryTags.isDairyFree),
          isSpicy: Boolean(parsed.dietaryTags.isSpicy),
        },
        allergens: Array.isArray(parsed.allergens)
          ? parsed.allergens.slice(0, 6)
          : [],
        confidence,
      };
    } catch (error) {
      console.error(
        `Failed to parse enhancement response for "${item.name}":`,
        error
      );
      return null;
    }
  }
}
