import mongoose from "mongoose";
import { KnowledgeCategory } from "../models/QuestionModel";

export interface TaggingResult {
  knowledgeCategory: KnowledgeCategory;
  confidence: number;
  reasoning?: string;
}

export interface TaggingContext {
  menuCategories?: string[];
  sopCategoryName?: string;
  existingCategories?: string[];
}

export class QuestionTaggingService {
  // Keyword mappings for each knowledge category
  private static readonly CATEGORY_KEYWORDS = {
    [KnowledgeCategory.FOOD_KNOWLEDGE]: {
      primary: [
        "ingredient",
        "ingredients",
        "allergen",
        "allergens",
        "menu",
        "dish",
        "food",
        "meal",
        "appetizer",
        "entree",
        "dessert",
        "sauce",
        "seasoning",
        "spice",
        "protein",
        "vegetarian",
        "vegan",
        "gluten",
        "dairy",
        "nuts",
        "gluten-free",
        "dairy-free",
        "nut-free",
        "steak",
        "beef",
        "chicken",
        "fish",
        "pork",
        "lamb",
        "pasta",
        "salad",
        "soup",
        "burger",
        "sandwich",
        "pizza",
        "dry-aged",
        "grilled",
        "roasted",
        "braised",
        "seared",
        "tomahawk",
        "angus",
      ],
      secondary: [
        "contains",
        "made with",
        "includes",
        "free from",
        "suitable for",
        "dietary",
        "restriction",
        "allergy",
      ],
    },
    [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
      primary: [
        "coffee",
        "tea",
        "espresso",
        "latte",
        "cappuccino",
        "americano",
        "juice",
        "smoothie",
        "soda",
        "soft drink",
        "beverage",
        "drink",
        "milk",
        "cream",
        "sugar",
        "syrup",
        "iced",
        "hot",
        "cold",
        "blended",
        "cocktail",
        "martini",
        "mojito",
        "whiskey",
        "vodka",
        "gin",
        "rum",
        "beer",
        "ale",
        "lager",
        "mixed drink",
        "shot",
        "liqueur",
        "spirits",
      ],
      secondary: [
        "caffeine",
        "decaf",
        "organic",
        "fresh",
        "squeeze",
        "roast",
        "bean",
        "leaf",
        "alcohol",
        "bartender",
        "shaken",
        "stirred",
        "garnish",
      ],
    },
    [KnowledgeCategory.WINE_KNOWLEDGE]: {
      primary: [
        "wine",
        "vintage",
        "grape",
        "variety",
        "region",
        "vineyard",
        "red wine",
        "white wine",
        "rosé",
        "sparkling",
        "champagne",
        "cabernet",
        "merlot",
        "chardonnay",
        "pinot",
        "sauvignon",
        "tannin",
        "acidity",
        "pairing",
        "bordeaux",
        "burgundy",
        "napa",
        "tuscany",
        "rioja",
        "chianti",
        "prosecco",
        "riesling",
        "gewürztraminer",
        "syrah",
        "shiraz",
        "tempranillo",
        "sangiovese",
        "nebbiolo",
        "moscato",
        "chablis",
        "barolo",
        "brunello",
      ],
      secondary: [
        "bottle",
        "glass",
        "cork",
        "terroir",
        "sommelier",
        "tasting",
        "notes",
        "bouquet",
        "finish",
        "decant",
        "cellar",
        "aging",
        "oak",
        "dry",
        "sweet",
        "full-bodied",
        "light-bodied",
        "crisp",
        "smooth",
        "bold",
        "elegant",
        "complex",
        "fruity",
        "earthy",
        "mineral",
      ],
    },
    [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
      primary: [
        "procedure",
        "protocol",
        "safety",
        "sanitation",
        "hygiene",
        "cleaning",
        "sanitizing",
        "washing",
        "policy",
        "rule",
        "regulation",
        "compliance",
        "standard",
        "guideline",
        "emergency",
        "first aid",
        "fire",
        "evacuation",
        "opening",
        "closing",
        "shift",
        "schedule",
      ],
      secondary: [
        "uniform",
        "appearance",
        "customer service",
        "greeting",
        "pos",
        "payment",
        "cash",
        "credit",
        "receipt",
        "reservation",
        "seating",
        "table",
        "service",
      ],
    },
  };

  /**
   * Determines knowledge category for a question using AI-powered analysis
   */
  static determineKnowledgeCategory(
    questionText: string,
    context?: TaggingContext
  ): TaggingResult {
    const normalizedText = questionText.toLowerCase();

    // Calculate scores for each category
    const categoryScores = this.calculateCategoryScores(
      normalizedText,
      context
    );

    // Find the highest scoring category
    const topCategory = Object.entries(categoryScores).reduce((a, b) =>
      categoryScores[a[0] as KnowledgeCategory] >
      categoryScores[b[0] as KnowledgeCategory]
        ? a
        : b
    )[0] as KnowledgeCategory;

    // Calculate confidence based on score distribution
    const topScore = categoryScores[topCategory];
    const scores = Object.values(categoryScores);
    const secondHighest = scores.sort((a, b) => b - a)[1] || 0;

    // Confidence is based on margin between top and second-highest scores
    const confidence = Math.min(
      0.95,
      topScore > 0 ? (topScore - secondHighest) / topScore : 0
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      questionText,
      topCategory,
      confidence
    );

    return {
      knowledgeCategory: topCategory,
      confidence,
      reasoning,
    };
  }

  /**
   * Calculate weighted scores for each knowledge category
   */
  private static calculateCategoryScores(
    text: string,
    context?: TaggingContext
  ): Record<KnowledgeCategory, number> {
    const scores: Record<KnowledgeCategory, number> = {
      [KnowledgeCategory.FOOD_KNOWLEDGE]: 0,
      [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: 0,
      [KnowledgeCategory.WINE_KNOWLEDGE]: 0,
      [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: 0,
    };

    // Score based on keywords
    Object.entries(this.CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
      const cat = category as KnowledgeCategory;

      // Primary keywords (higher weight)
      keywords.primary.forEach((keyword) => {
        if (text.includes(keyword)) {
          scores[cat] += 2;
        }
      });

      // Secondary keywords (lower weight)
      keywords.secondary.forEach((keyword) => {
        if (text.includes(keyword)) {
          scores[cat] += 1;
        }
      });
    });

    // Apply food-first logic for dishes that contain wine ingredients
    this.applyFoodFirstLogic(scores, text);

    // Context-based boosting
    if (context) {
      this.applyContextBoosting(scores, context, text);
    }

    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      (Object.keys(scores) as KnowledgeCategory[]).forEach((category) => {
        scores[category] /= maxScore;
      });
    }

    return scores;
  }

  /**
   * Apply food-first logic for items that are primarily food but contain wine/beverage ingredients
   */
  private static applyFoodFirstLogic(
    scores: Record<KnowledgeCategory, number>,
    text: string
  ): void {
    // Wine pairing/service questions (should stay wine knowledge)
    const winePairingIndicators = [
      "wine pairs",
      "wine pairing",
      "wine selection",
      "wine recommend",
      "which wine",
      "what wine",
      "wine goes with",
      "wine matches",
      "pairs best",
      "wine for",
    ];

    // Cocktail preparation (should stay beverage knowledge)
    const cocktailIndicators = [
      "cocktail",
      "mixed drink",
      "how to make",
      "how do you make",
      "bartender",
      "shake",
      "stir",
      "garnish",
      "sangria",
      "margarita",
      "mojito",
    ];

    // Check for wine pairing questions first
    const isWinePairingQuestion = winePairingIndicators.some((indicator) =>
      text.includes(indicator)
    );

    // Check for cocktail preparation
    const isCocktailQuestion = cocktailIndicators.some((indicator) =>
      text.includes(indicator)
    );

    if (isWinePairingQuestion) {
      scores[KnowledgeCategory.WINE_KNOWLEDGE] += 4;
      return; // Skip other processing for wine pairing questions
    }

    if (isCocktailQuestion) {
      scores[KnowledgeCategory.BEVERAGE_KNOWLEDGE] += 4;
      return; // Skip other processing for cocktail questions
    }

    // Strong food indicators that should override wine/beverage classification
    const strongFoodIndicators = [
      "steak",
      "chicken",
      "beef",
      "pork",
      "lamb",
      "fish",
      "salmon",
      "pasta",
      "risotto",
      "burger",
      "sandwich",
      "pizza",
      "salad",
      "soup",
      "appetizer",
      "entree",
      "dessert",
      "dish",
      "how long",
      "dry-aged",
      "grilled",
      "roasted",
      "braised",
      "seared",
      "baked",
      "fried",
    ];

    // Wine as ingredient indicators (not as beverage)
    const wineAsIngredientIndicators = [
      "wine jus",
      "red wine jus",
      "white wine jus",
      "wine sauce",
      "wine reduction",
      "wine braised",
      "cooked in wine",
      "wine marinated",
      "wine glaze",
    ];

    // Check if this is clearly a food item
    const hasStrongFoodIndicator = strongFoodIndicators.some((indicator) =>
      text.includes(indicator)
    );

    // Check if wine is mentioned as an ingredient rather than a beverage
    const hasWineAsIngredient = wineAsIngredientIndicators.some((indicator) =>
      text.includes(indicator)
    );

    if (hasStrongFoodIndicator || hasWineAsIngredient) {
      // Boost food knowledge significantly
      scores[KnowledgeCategory.FOOD_KNOWLEDGE] += 3;

      // If wine is mentioned as ingredient, don't penalize but don't boost wine knowledge either
      if (hasWineAsIngredient) {
        // Remove the wine knowledge boost that was added by keywords
        scores[KnowledgeCategory.WINE_KNOWLEDGE] = Math.max(
          0,
          scores[KnowledgeCategory.WINE_KNOWLEDGE] - 2
        );
      }
    }

    // Check for beverage preparation vs food preparation context
    const beveragePreparationContext = [
      "recipe for cocktail",
      "mix",
      "serve in glass",
    ];

    const foodPreparationContext = [
      "how long",
      "what temperature",
      "how is it prepared",
      "cooking method",
      "ingredients in",
      "allergens in",
      "contains",
    ];

    const hasBeveragePrep = beveragePreparationContext.some((context) =>
      text.includes(context)
    );

    const hasFoodPrep = foodPreparationContext.some((context) =>
      text.includes(context)
    );

    if (hasFoodPrep && !hasBeveragePrep) {
      scores[KnowledgeCategory.FOOD_KNOWLEDGE] += 2;
    }
  }

  /**
   * Apply context-based score boosting
   */
  private static applyContextBoosting(
    scores: Record<KnowledgeCategory, number>,
    context: TaggingContext,
    text: string
  ): void {
    // Menu context suggests food or beverage knowledge
    if (context.menuCategories?.length) {
      const menuText = context.menuCategories.join(" ").toLowerCase();

      // Strong wine indicators
      if (
        menuText.includes("wine") ||
        menuText.includes("vintage") ||
        menuText.includes("grape") ||
        menuText.includes("vineyard") ||
        menuText.includes("cabernet") ||
        menuText.includes("chardonnay") ||
        menuText.includes("pinot") ||
        menuText.includes("sauvignon") ||
        menuText.includes("merlot")
      ) {
        scores[KnowledgeCategory.WINE_KNOWLEDGE] += 2;
      }
      // Beverage indicators (excluding wine)
      else if (
        menuText.includes("drink") ||
        menuText.includes("beverage") ||
        menuText.includes("cocktail") ||
        menuText.includes("coffee") ||
        menuText.includes("tea")
      ) {
        scores[KnowledgeCategory.BEVERAGE_KNOWLEDGE] += 1;
      }
      // Food items (default for menu items)
      else {
        scores[KnowledgeCategory.FOOD_KNOWLEDGE] += 1;
      }
    }

    // SOP context suggests procedures knowledge
    if (context.sopCategoryName) {
      const sopText = context.sopCategoryName.toLowerCase();
      if (
        sopText.includes("safety") ||
        sopText.includes("procedure") ||
        sopText.includes("protocol")
      ) {
        scores[KnowledgeCategory.PROCEDURES_KNOWLEDGE] += 2;
      }
    }

    // Existing categories provide hints
    if (context.existingCategories?.length) {
      const existingText = context.existingCategories.join(" ").toLowerCase();

      if (existingText.includes("wine")) {
        scores[KnowledgeCategory.WINE_KNOWLEDGE] += 0.5;
      }
      if (existingText.includes("coffee") || existingText.includes("drink")) {
        scores[KnowledgeCategory.BEVERAGE_KNOWLEDGE] += 0.5;
      }
    }
  }

  /**
   * Generate human-readable reasoning for the categorization
   */
  private static generateReasoning(
    questionText: string,
    category: KnowledgeCategory,
    confidence: number
  ): string {
    const categoryNames = {
      [KnowledgeCategory.FOOD_KNOWLEDGE]: "Food Knowledge",
      [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: "Beverage Knowledge",
      [KnowledgeCategory.WINE_KNOWLEDGE]: "Wine Knowledge",
      [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: "Procedures Knowledge",
    };

    let reasoning = `Categorized as ${categoryNames[category]} `;

    if (confidence > 0.8) {
      reasoning += "with high confidence";
    } else if (confidence > 0.6) {
      reasoning += "with moderate confidence";
    } else {
      reasoning += "with low confidence - may need manual review";
    }

    return reasoning;
  }

  /**
   * Batch process multiple questions for tagging
   */
  static async batchTagQuestions(
    questions: Array<{
      _id: string;
      questionText: string;
      categories?: string[];
    }>,
    context?: TaggingContext
  ): Promise<Array<{ _id: string; tagging: TaggingResult }>> {
    return questions.map((question) => ({
      _id: question._id,
      tagging: this.determineKnowledgeCategory(question.questionText, {
        ...context,
        existingCategories: question.categories,
      }),
    }));
  }

  /**
   * Validate tagging quality and provide improvement suggestions
   */
  static validateTagging(
    questionText: string,
    assignedCategory: KnowledgeCategory
  ): {
    isValid: boolean;
    confidence: number;
    suggestions?: string[];
  } {
    const autoTagging = this.determineKnowledgeCategory(questionText);

    const isValid = autoTagging.knowledgeCategory === assignedCategory;
    const confidence = autoTagging.confidence;

    const suggestions: string[] = [];

    if (!isValid) {
      suggestions.push(
        `AI suggests ${autoTagging.knowledgeCategory} instead of ${assignedCategory}`
      );
    }

    return {
      isValid,
      confidence,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }
}
