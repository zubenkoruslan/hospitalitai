/**
 * Advanced Price and Category Detection Service
 *
 * Enhances menu parsing with sophisticated price extraction and category identification
 * using pattern matching, context analysis, and AI-powered recognition.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface PricePattern {
  pattern: RegExp;
  description: string;
  extractPrice: (match: RegExpMatchArray, context: string) => ExtractedPrice[];
}

export interface ExtractedPrice {
  size?: string;
  price: number;
  currency?: string;
  confidence: number;
  context: string;
}

export interface CategoryHint {
  keywords: string[];
  sectionMarkers: string[];
  contextClues: string[];
  confidence: number;
}

export interface EnhancedMenuItem {
  rawText: string;
  extractedPrices: ExtractedPrice[];
  suggestedCategory: string;
  categoryConfidence: number;
  pricingPattern: string;
  contextAnalysis: {
    hasMultiplePrices: boolean;
    hasServingSizes: boolean;
    currencyDetected?: string;
    sectionContext?: string;
  };
}

export class AdvancedPriceCategoryService {
  private genAI: GoogleGenerativeAI;

  // Comprehensive price patterns for different menu formats
  private pricePatterns: PricePattern[] = [
    // Multi-column wine pricing: "8.5   24.25   34"
    {
      pattern:
        /(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)/g,
      description: "Three-column pricing (glass/carafe/bottle)",
      extractPrice: (match, context) => [
        { size: "Glass", price: parseFloat(match[1]), confidence: 90, context },
        {
          size: "Carafe",
          price: parseFloat(match[2]),
          confidence: 90,
          context,
        },
        {
          size: "Bottle",
          price: parseFloat(match[3]),
          confidence: 90,
          context,
        },
      ],
    },

    // Two-column pricing: "12.5  35.75"
    {
      pattern: /(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s*$/g,
      description: "Two-column pricing (glass/bottle)",
      extractPrice: (match, context) => [
        { size: "Glass", price: parseFloat(match[1]), confidence: 85, context },
        {
          size: "Bottle",
          price: parseFloat(match[2]),
          confidence: 85,
          context,
        },
      ],
    },

    // Currency symbol pricing: "£8.50", "$12.95", "€15.00"
    {
      pattern: /([£$€¥])(\d+(?:\.\d{1,2})?)/g,
      description: "Currency symbol pricing",
      extractPrice: (match, context) => [
        {
          price: parseFloat(match[2]),
          currency: match[1],
          confidence: 95,
          context,
        },
      ],
    },

    // Explicit serving size pricing: "Pint £6.50, Bottle £4.25"
    {
      pattern:
        /(pint|bottle|glass|can|half pint|double|single|shot)\s*[£$€]?(\d+(?:\.\d{1,2})?)/gi,
      description: "Explicit serving size pricing",
      extractPrice: (match, context) => [
        {
          size:
            match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
          price: parseFloat(match[2]),
          confidence: 95,
          context,
        },
      ],
    },

    // Range pricing: "£8-12", "$10-15"
    {
      pattern: /([£$€])(\d+(?:\.\d{1,2})?)-(\d+(?:\.\d{1,2})?)/g,
      description: "Price range",
      extractPrice: (match, context) => [
        {
          price: (parseFloat(match[2]) + parseFloat(match[3])) / 2, // Average
          currency: match[1],
          confidence: 70,
          context: `${context} (range: ${match[2]}-${match[3]})`,
        },
      ],
    },

    // Standalone decimal pricing: "29.5" (when in price context)
    {
      pattern: /(?:^|\s)(\d{1,3}(?:\.\d{1,2})?)(?=\s|$)/g,
      description: "Standalone decimal pricing",
      extractPrice: (match, context) => {
        const price = parseFloat(match[1]);
        // Only consider as price if reasonable range and in price context
        if (price >= 3 && price <= 500 && this.isPriceContext(context)) {
          return [
            {
              price,
              confidence: 60,
              context: `${context} (inferred)`,
            },
          ];
        }
        return [];
      },
    },
  ];

  // Category detection patterns
  private categoryPatterns = {
    // Wine categories
    wine: {
      sections: [
        /white\s+wine/i,
        /red\s+wine/i,
        /ros[eé]\s+wine/i,
        /sparkling/i,
        /champagne/i,
        /dessert\s+wine/i,
        /port/i,
        /orange\s+wine/i,
      ],
      keywords: [
        /\b\d{4}\b/, // Vintage years
        /cabernet|merlot|chardonnay|sauvignon|pinot|shiraz|syrah/i,
        /bordeaux|burgundy|rioja|chianti|barolo|champagne/i,
        /bottle|glass|carafe|magnum/i,
      ],
      regions: [
        /france|italy|spain|australia|california|chile|argentina/i,
        /loire|burgundy|bordeaux|tuscany|piedmont|mendoza/i,
      ],
    },

    // Food categories
    food: {
      sections: [
        /appetizers?|starters?|small\s+plates/i,
        /mains?|main\s+courses?|entrees?/i,
        /desserts?|sweets?/i,
        /sides?|side\s+dishes?/i,
        /soups?|salads?/i,
      ],
      cooking: [
        /grilled|fried|baked|roasted|sautéed|braised|steamed/i,
        /with|served|accompanied/i,
      ],
      dietary: [
        /\(v\)|\(vg\)|\(gf\)|\(df\)/i, // Dietary markers
        /vegetarian|vegan|gluten.free|dairy.free/i,
      ],
    },

    // Beverage categories
    beverage: {
      sections: [
        /cocktails?|spirits?|beers?|ales?/i,
        /whiskey|whisky|gin|vodka|rum|tequila/i,
        /coffee|tea|soft\s+drinks/i,
      ],
      types: [
        /ipa|lager|stout|pilsner|porter|bitter/i,
        /single|double|neat|rocks|draft|bottle/i,
        /espresso|cappuccino|latte|americano/i,
      ],
    },
  };

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Enhanced price extraction with pattern matching and context analysis
   */
  public extractPricesAdvanced(
    text: string,
    lineContext: string[] = []
  ): ExtractedPrice[] {
    const allPrices: ExtractedPrice[] = [];
    const contextText = [text, ...lineContext].join(" ").toLowerCase();

    // Apply each price pattern
    for (const pattern of this.pricePatterns) {
      const matches = Array.from(text.matchAll(pattern.pattern));

      for (const match of matches) {
        try {
          const extractedPrices = pattern.extractPrice(match, contextText);

          // Filter and enhance prices
          extractedPrices.forEach((price) => {
            if (this.isValidPrice(price.price)) {
              // Enhance confidence based on context
              price.confidence = this.adjustConfidenceByContext(
                price.confidence,
                contextText
              );
              allPrices.push(price);
            }
          });
        } catch (error) {
          console.warn(
            `Price extraction error with pattern ${pattern.description}:`,
            error
          );
        }
      }
    }

    // Remove duplicates and sort by confidence
    return this.deduplicateAndRankPrices(allPrices);
  }

  /**
   * Enhanced category detection using multiple signals
   */
  public detectCategoryAdvanced(
    itemText: string,
    sectionContext: string[] = [],
    previousItems: string[] = []
  ): { category: string; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];
    let bestCategory = "other";
    let bestConfidence = 0;

    const fullContext = [itemText, ...sectionContext, ...previousItems]
      .join(" ")
      .toLowerCase();

    // Check each category type
    for (const [categoryType, patterns] of Object.entries(
      this.categoryPatterns
    )) {
      let categoryScore = 0;
      const categoryReasons: string[] = [];

      // Check section markers
      if ("sections" in patterns) {
        for (const sectionPattern of patterns.sections) {
          if (sectionPattern.test(fullContext)) {
            categoryScore += 40;
            categoryReasons.push(
              `Found section marker: ${sectionPattern.source}`
            );
          }
        }
      }

      // Check keywords and specific patterns
      Object.entries(patterns).forEach(([patternType, patternList]) => {
        if (patternType !== "sections" && Array.isArray(patternList)) {
          for (const pattern of patternList) {
            if (pattern.test(fullContext)) {
              categoryScore += 20;
              categoryReasons.push(`Matched ${patternType}: ${pattern.source}`);
            }
          }
        }
      });

      // Apply contextual bonuses
      if (categoryType === "wine" && this.hasWineIndicators(itemText)) {
        categoryScore += 30;
        categoryReasons.push("Strong wine indicators detected");
      }

      if (categoryType === "food" && this.hasFoodIndicators(itemText)) {
        categoryScore += 25;
        categoryReasons.push("Food preparation/ingredient indicators detected");
      }

      if (categoryType === "beverage" && this.hasBeverageIndicators(itemText)) {
        categoryScore += 25;
        categoryReasons.push("Beverage/alcohol indicators detected");
      }

      // Update best category if this scores higher
      if (categoryScore > bestConfidence) {
        bestConfidence = categoryScore;
        bestCategory = categoryType;
        reasoning.length = 0; // Clear previous reasoning
        reasoning.push(...categoryReasons);
      }
    }

    // Normalize confidence to 0-100 scale
    const normalizedConfidence = Math.min(100, Math.max(0, bestConfidence));

    return {
      category: bestCategory,
      confidence: normalizedConfidence,
      reasoning,
    };
  }

  /**
   * AI-powered price and category analysis for complex cases
   */
  public async analyzeWithAI(menuText: string): Promise<{
    pricePatterns: string[];
    categoryStructure: string[];
    recommendations: string[];
  }> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1,
      },
    });

    const prompt = `
Analyze this menu text for price patterns and category structure:

${menuText.substring(0, 2000)} // Limit for analysis

Identify:
1. Price formatting patterns (currency symbols, column layouts, ranges)
2. Category/section structure (how items are grouped)
3. Recommendations for better parsing

Return JSON:
{
  "pricePatterns": ["pattern descriptions"],
  "categoryStructure": ["section names and organization"],
  "recommendations": ["specific parsing improvements"]
}
`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse AI response
      const cleaned = response.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("AI analysis failed:", error);
      return {
        pricePatterns: ["AI analysis unavailable"],
        categoryStructure: ["AI analysis unavailable"],
        recommendations: ["Use pattern-based parsing"],
      };
    }
  }

  // Helper methods
  private isPriceContext(context: string): boolean {
    const priceContextWords = [
      "menu",
      "price",
      "cost",
      "wine",
      "food",
      "drink",
      "bottle",
      "glass",
      "£",
      "$",
      "€",
      "gbp",
      "usd",
      "eur",
      "restaurant",
      "bar",
    ];

    return priceContextWords.some((word) =>
      context.toLowerCase().includes(word)
    );
  }

  private isValidPrice(price: number): boolean {
    return price >= 0.5 && price <= 1000 && !isNaN(price);
  }

  private adjustConfidenceByContext(
    baseConfidence: number,
    context: string
  ): number {
    let adjustment = 0;

    // Boost confidence for clear price context
    if (/wine|food|drink|menu|restaurant/i.test(context)) {
      adjustment += 10;
    }

    // Reduce confidence for ambiguous context
    if (/page|number|year|vintage/i.test(context)) {
      adjustment -= 15;
    }

    return Math.max(0, Math.min(100, baseConfidence + adjustment));
  }

  private deduplicateAndRankPrices(prices: ExtractedPrice[]): ExtractedPrice[] {
    // Remove duplicate prices (same price and size)
    const seen = new Set<string>();
    const unique = prices.filter((price) => {
      const key = `${price.price}_${price.size || "default"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by confidence descending
    return unique.sort((a, b) => b.confidence - a.confidence);
  }

  private hasWineIndicators(text: string): boolean {
    const wineIndicators = [
      /\b\d{4}\b/, // Years
      /cabernet|merlot|chardonnay|sauvignon|pinot/i,
      /bottle|glass|vintage|producer|winery/i,
      /france|italy|spain|bordeaux|burgundy/i,
    ];

    return wineIndicators.some((pattern) => pattern.test(text));
  }

  private hasFoodIndicators(text: string): boolean {
    const foodIndicators = [
      /grilled|fried|baked|roasted|sautéed/i,
      /chicken|beef|fish|vegetables|pasta/i,
      /served with|accompanied by/i,
      /\(v\)|\(vg\)|\(gf\)/i, // Dietary markers
    ];

    return foodIndicators.some((pattern) => pattern.test(text));
  }

  private hasBeverageIndicators(text: string): boolean {
    const beverageIndicators = [
      /beer|lager|ipa|stout|ale/i,
      /whiskey|gin|vodka|rum|tequila/i,
      /cocktail|martini|mojito/i,
      /pint|shot|double|neat|rocks/i,
    ];

    return beverageIndicators.some((pattern) => pattern.test(text));
  }
}
