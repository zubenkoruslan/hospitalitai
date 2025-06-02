import mongoose from "mongoose";
import { KnowledgeCategory } from "../models/QuestionModel";

export interface TaggingResult {
  knowledgeCategory: KnowledgeCategory;
  knowledgeSubcategories: string[];
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
        "nutrition",
        "nutritional",
        "preparation",
        "recipe",
        "cooking",
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
        "calories",
        "carbohydrates",
        "fiber",
        "vitamin",
        "mineral",
      ],
      secondary: [
        "taste",
        "flavor",
        "texture",
        "temperature",
        "garnish",
        "presentation",
        "portion",
        "serving",
        "plating",
        "kitchen",
        "chef",
        "cook",
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
        "brewing",
        "temperature",
        "steamed",
        "iced",
        "hot",
        "cold",
        "blended",
      ],
      secondary: [
        "caffeine",
        "decaf",
        "organic",
        "fresh",
        "squeeze",
        "machine",
        "grinder",
        "filter",
        "roast",
        "bean",
        "leaf",
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
        "decanting",
        "serving temperature",
      ],
      secondary: [
        "bottle",
        "glass",
        "cork",
        "cellar",
        "aging",
        "harvest",
        "terroir",
        "sommelier",
        "tasting",
        "notes",
        "bouquet",
        "finish",
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

  // Subcategory mappings
  private static readonly SUBCATEGORY_KEYWORDS = {
    [KnowledgeCategory.FOOD_KNOWLEDGE]: {
      ingredients: ["ingredient", "contains", "made with", "includes"],
      allergens: [
        "allergen",
        "allergy",
        "nuts",
        "dairy",
        "gluten",
        "shellfish",
        "soy",
      ],
      preparation: [
        "prepared",
        "cooked",
        "grilled",
        "fried",
        "baked",
        "steamed",
      ],
      nutrition: ["calories", "fat", "protein", "carbs", "sodium", "vitamin"],
      "menu-items": ["appetizer", "entree", "dessert", "side", "salad", "soup"],
      "dietary-restrictions": [
        "vegetarian",
        "vegan",
        "gluten-free",
        "dairy-free",
      ],
      "cooking-methods": [
        "grilling",
        "frying",
        "baking",
        "sautéing",
        "roasting",
      ],
      "food-safety": [
        "temperature",
        "storage",
        "expiration",
        "cross-contamination",
      ],
    },
    [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
      coffee: ["coffee", "espresso", "latte", "cappuccino", "americano"],
      tea: ["tea", "green tea", "black tea", "herbal", "chai"],
      "soft-drinks": ["soda", "cola", "sprite", "juice", "smoothie"],
      juices: ["orange juice", "apple juice", "fresh squeezed"],
      preparation: ["brewing", "steaming", "grinding", "temperature"],
      equipment: ["machine", "grinder", "filter", "steamer"],
      temperature: ["hot", "iced", "cold", "steamed", "chilled"],
    },
    [KnowledgeCategory.WINE_KNOWLEDGE]: {
      varieties: ["cabernet", "merlot", "chardonnay", "pinot", "sauvignon"],
      regions: ["napa", "tuscany", "bordeaux", "burgundy", "region"],
      vintages: ["vintage", "year", "2020", "2019", "aged"],
      pairings: ["pairing", "pairs with", "complement", "match"],
      service: ["serving", "temperature", "decanting", "glass"],
      storage: ["cellar", "storage", "aging", "bottle"],
      "tasting-notes": ["tasting", "notes", "flavor", "aroma", "finish"],
      production: ["harvest", "fermentation", "bottling", "vineyard"],
    },
    [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
      safety: ["safety", "emergency", "fire", "first aid", "evacuation"],
      hygiene: ["hygiene", "hand washing", "cleaning", "sanitizing"],
      "service-standards": ["greeting", "customer service", "professional"],
      "opening-procedures": ["opening", "start of shift", "setup"],
      "closing-procedures": ["closing", "end of shift", "cleanup"],
      "emergency-protocols": [
        "emergency",
        "fire drill",
        "evacuation",
        "incident",
      ],
      "customer-service": ["customer", "guest", "service", "complaint"],
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

    // Determine subcategories
    const subcategories = this.determineSubcategories(
      normalizedText,
      topCategory
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      questionText,
      topCategory,
      subcategories,
      confidence
    );

    return {
      knowledgeCategory: topCategory,
      knowledgeSubcategories: subcategories,
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

      if (menuText.includes("wine") || menuText.includes("alcohol")) {
        scores[KnowledgeCategory.WINE_KNOWLEDGE] += 1;
      } else if (menuText.includes("drink") || menuText.includes("beverage")) {
        scores[KnowledgeCategory.BEVERAGE_KNOWLEDGE] += 1;
      } else {
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
   * Determine relevant subcategories for the selected category
   */
  private static determineSubcategories(
    text: string,
    category: KnowledgeCategory
  ): string[] {
    const subcategories: string[] = [];
    const categorySubcategories = this.SUBCATEGORY_KEYWORDS[category];

    if (!categorySubcategories) return subcategories;

    Object.entries(categorySubcategories).forEach(([subcategory, keywords]) => {
      const hasKeyword = keywords.some((keyword) => text.includes(keyword));
      if (hasKeyword) {
        subcategories.push(subcategory);
      }
    });

    // Limit to 3 subcategories (highest relevance)
    return subcategories.slice(0, 3);
  }

  /**
   * Generate human-readable reasoning for the categorization
   */
  private static generateReasoning(
    questionText: string,
    category: KnowledgeCategory,
    subcategories: string[],
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

    if (subcategories.length > 0) {
      reasoning += `. Subcategories: ${subcategories.join(", ")}`;
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
    assignedCategory: KnowledgeCategory,
    assignedSubcategories: string[]
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

    if (
      autoTagging.knowledgeSubcategories.length > assignedSubcategories.length
    ) {
      const missing = autoTagging.knowledgeSubcategories.filter(
        (sub) => !assignedSubcategories.includes(sub)
      );
      suggestions.push(`Consider adding subcategories: ${missing.join(", ")}`);
    }

    return {
      isValid,
      confidence,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }
}
