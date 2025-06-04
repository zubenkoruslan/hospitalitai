// Question Generation Constants - Refactored for Better Quality
// This file contains improved prompts and configurations to eliminate answer leakage
// and generate higher quality questions for hospitality training

export const QUESTION_GENERATION_CONFIG = {
  MAX_PROMPT_LENGTH: 4000,
  MIN_QUESTION_LENGTH: 20,
  MAX_EXPLANATION_LENGTH: 200,
  REQUIRED_DISTRACTOR_COUNT: 3,
  MIN_QUALITY_SCORE: 70,

  WINE_RELATED_TERMS: [
    "grape",
    "vintage",
    "wine",
    "bottle",
    "glass",
    "tasting",
    "chardonnay",
    "pinot noir",
    "cabernet",
    "merlot",
    "sauvignon",
    "bordeaux",
    "burgundy",
    "napa",
    "tuscany",
    "champagne",
    "barolo",
    "chianti",
    "rioja",
    "prosecco",
    "riesling",
  ],

  BEVERAGE_INGREDIENTS: [
    "vodka",
    "gin",
    "rum",
    "whiskey",
    "tequila",
    "bourbon",
    "lime",
    "lemon",
    "mint",
    "simple syrup",
    "club soda",
    "triple sec",
    "vermouth",
    "bitters",
    "grenadine",
    "campari",
    "orange peel",
    "sugar",
    "ice",
  ],

  COMMON_ALLERGENS: [
    "gluten",
    "dairy",
    "nuts",
    "shellfish",
    "eggs",
    "soy",
    "wheat",
    "fish",
    "tree nuts",
    "peanuts",
    "sesame",
    "sulfites",
  ],

  FOOD_INGREDIENTS: [
    "parmesan",
    "mozzarella",
    "cheddar",
    "goat cheese",
    "salmon",
    "chicken",
    "beef",
    "pork",
    "lamb",
    "mushroom",
    "truffle",
    "avocado",
    "bacon",
    "tomato",
    "onion",
    "garlic",
  ],

  COOKING_METHODS: [
    "grilled",
    "baked",
    "fried",
    "sautéed",
    "roasted",
    "braised",
    "steamed",
    "poached",
    "pan-seared",
    "smoked",
    "barbecued",
    "charred",
  ],

  CUISINE_STYLES: [
    "thai",
    "chinese",
    "japanese",
    "italian",
    "french",
    "mexican",
    "indian",
    "greek",
    "mediterranean",
    "asian",
    "european",
    "latin",
  ],

  CATEGORY_PRIORITIES: {
    wine: ["grape_variety", "region", "vintage", "pairing", "service"],
    beverage: [
      "ingredients",
      "preparation",
      "garnish",
      "glassware",
      "temperature",
    ],
    food: ["ingredients", "allergens", "preparation", "dietary", "description"],
  },

  // Answer leakage prevention rules
  ANSWER_LEAKAGE_PREVENTION: {
    // Patterns that commonly cause answer leakage
    DANGEROUS_PATTERNS: [
      /\b(\d{4})\b/g, // Years/vintages
      /\b(barolo|chianti|bordeaux|burgundy|napa|sonoma|tuscany|piedmont)\b/gi, // Regions
      /\b(dom\s+perignon|opus\s+one|screaming\s+eagle|château|domaine)\b/gi, // Producers
      /\b(chardonnay|pinot\s+noir|cabernet|merlot|sauvignon|riesling|syrah)\b/gi, // Grapes
      /\b(parmesan|mozzarella|cheddar|goat\s+cheese|feta|brie)\b/gi, // Cheese
      /\b(grilled|baked|fried|sautéed|roasted|braised|steamed|poached|pan-seared|smoked)\b/gi, // Cooking methods
      /\b(chicken|beef|pork|lamb|salmon|fish|duck|turkey|tofu|shrimp|lobster)\b/gi, // Proteins
      /\b(peanut|nut|dairy|gluten|wheat|shellfish|sesame|soy|egg)\b/gi, // Allergens
      /\b(thai|chinese|japanese|italian|french|mexican|indian|greek|mediterranean)\b/gi, // Cuisines
    ],

    // Safe generic replacements for questions
    SAFE_REPLACEMENTS: {
      vintage: "this wine",
      region: "this {wine_color} wine from {country}",
      producer: "this {region} wine",
      grape: "this {wine_style} wine",
      ingredient: "this {food_category} dish",
      cooking_method: "this {protein_type} dish",
      allergen: "this {cooking_method} {food_type} dish",
      cuisine: "this {spice_level} dish with {characteristic_ingredients}",
    },

    // Question sanitization rules
    SANITIZATION_RULES: {
      removeAnswerHints: true,
      useGenericDescriptors: true,
      validateBeforeGeneration: true,
      heavyPenaltyForLeakage: 40, // Quality score penalty
    },
  },
};

// Improved Question Templates - Avoiding Answer Leakage
export const QUESTION_TEMPLATES = {
  WINE_KNOWLEDGE: [
    // SAFE: Use generic descriptions instead of wine names that contain answers
    "Which grape variety is primarily used in this {WINE_STYLE} from {GENERIC_REGION}?",
    "What region produces this {WINE_COLOR} wine with {CHARACTERISTIC}?",
    "Which food item from our menu pairs best with this {WINE_STYLE}?",
    "What serving temperature is recommended for this type of {WINE_CATEGORY}?",
    "What vintage year is this {WINE_DESCRIPTION}?",
    "Which wine style category best describes this {WINE_COLOR} wine?",
    "What producer creates this {WINE_REGION} wine?",
    // NEW: Context-aware templates that avoid naming the answer
    "This Italian red wine from Piedmont is made primarily from which grape?",
    "Which region in France is famous for this Chardonnay-based sparkling wine?",
    "What is the primary grape variety in this Burgundy red wine?",
    "Which appellation in Italy is known for this Nebbiolo-based wine?",
    "What type of oak treatment is used for this premium {WINE_COLOR} wine?",
  ],

  FOOD_KNOWLEDGE: [
    // SAFE: Use generic descriptions to avoid ingredient/allergen leakage
    "Which allergen should customers be aware of in this {FOOD_CATEGORY} dish?",
    "What is the main protein in this {COOKING_METHOD} {FOOD_TYPE}?",
    "Which cooking method is used for this {PROTEIN_TYPE} dish with {FLAVOR_PROFILE}?",
    "What dietary restriction does this {CUISINE_STYLE} dish accommodate?",
    "Which ingredient gives this {FOOD_CATEGORY} its distinctive {FLAVOR_CHARACTERISTIC}?",
    "What type of cuisine is this {SPICE_LEVEL} dish with {CHARACTERISTIC_INGREDIENTS}?",
    "Which accompaniment is served with this {PREPARATION_STYLE} {MAIN_INGREDIENT}?",
    // NEW: Context-aware templates that avoid naming the answer
    "This creamy pasta dish contains which type of cheese?",
    "What cooking technique is used for this tender meat preparation?",
    "Which allergen is commonly found in this type of crusted dish?",
    "This Asian noodle dish represents which cuisine style?",
    "What is the primary protein in this Mediterranean-style dish?",
  ],

  BEVERAGE_KNOWLEDGE: [
    "What is the primary spirit in this classic three-ingredient cocktail?",
    "Which garnish is traditionally used for this gin-based cocktail?",
    "What glassware is appropriate for this stirred cocktail?",
    "Which preparation technique is used for this shaken drink?",
    "What temperature should this type of coffee beverage be served?",
    "Which mixer is essential in this whiskey-based cocktail?",
    "How should this layered cocktail be prepared?",
    "What type of ice is recommended for this spirit-forward drink?",
    "Which citrus garnish complements this bitter Italian aperitif?",
  ],

  PROCEDURES_KNOWLEDGE: [
    "What is the first step when handling a customer complaint?",
    "How long should hands be washed according to food safety protocol?",
    "When should a manager be notified during an incident?",
    "What safety equipment is required for cleaning procedures?",
    "Which documentation is needed after a food safety incident?",
    "What is the correct sequence for opening procedures?",
    "Who is authorized to perform cash handling procedures?",
    "What temperature should food be maintained at during service?",
  ],
};

// NEW: Streamlined System Instructions
export const IMPROVED_SYSTEM_INSTRUCTIONS = {
  MENU: `You are a hospitality training expert. Generate quiz questions based on menu items using the knowledge category framework.

KNOWLEDGE CATEGORIES (choose the most relevant):
• FOOD_KNOWLEDGE: Ingredients, allergens, dietary restrictions, preparation methods
• BEVERAGE_KNOWLEDGE: Drink recipes, preparation techniques, equipment, temperatures  
• WINE_KNOWLEDGE: Varieties, regions, pairings, service protocols, tasting notes
• PROCEDURES_KNOWLEDGE: Service standards, safety protocols, customer service

CORE RULES:
1. Base ALL answers on provided menu item data ONLY
2. Create plausible but clearly incorrect distractors using contextual data
3. Distribute questions evenly across items and focus areas
4. Use specific item names in questions for clarity
5. Match question focus to menu category type (wine→wine knowledge, etc.)

QUESTION QUALITY STANDARDS:
• Be specific: "Which ingredient is in the Caesar Salad?" not "What's in this salad?"
• Use realistic distractors: Draw from contextual ingredients/items list provided
• Test practical knowledge: Focus on what staff need to know for service
• Avoid ambiguity: Each question should have ONE clearly correct answer

CRITICAL: PREVENT ANSWER LEAKAGE
• NEVER include the answer in the question text: If asking about "Barolo region", don't mention "Barolo" in the question
• Use generic references: "Which region produces this Piedmont red wine?" instead of naming the wine directly
• Hide answer clues: Remove producer names, vintages, and variety hints from question text
• For vintage questions: "What year is this Dom Pérignon champagne?" NOT "What vintage is the 2019 Dom Pérignon?"
• For region questions: "Which Italian wine region is famous for Nebbiolo?" NOT "What region is Barolo from?"
• For ingredient questions: "What cheese is used in this Roman-style salad?" NOT "What cheese is in Caesar salad?"

OUTPUT: Use extract_generated_questions function with exact schema provided.`,

  SOP: `You are a workplace training specialist. Generate quiz questions from Standard Operating Procedures.

FOCUS on testing:
• Key procedures and step-by-step processes
• Safety requirements and protocols  
• Important timeframes, measurements, or specifications
• Decision points and when to escalate issues
• Compliance requirements and documentation needs

QUESTION QUALITY:
• Ask about specific procedures: "What is the first step when handling a customer complaint?"
• Test critical knowledge: "How long should hands be washed according to food safety protocol?"
• Focus on actionable information: "When should a manager be notified of an incident?"
• Avoid trivial details: Don't ask about document formatting or non-essential information

DISTRACTOR STRATEGY:
• Use plausible but incorrect procedures from similar contexts
• Include common mistakes or misconceptions
• Reference related but distinct protocols
• Avoid obviously wrong answers that provide no training value

OUTPUT: Use extract_generated_questions function with complete schema.`,
};

// Helper functions for detecting answer leakage
export const ANSWER_LEAKAGE_PATTERNS = {
  WINE: [
    // Vintage year leakage: "2016 Barolo" question asking about vintage
    /(\d{4})/g,
    // Region name leakage: "Barolo DOCG" question asking about region
    /(barolo|chianti|bordeaux|burgundy|napa|sonoma|tuscany|piedmont|champagne|chablis|sancerre)/gi,
    // Producer leakage: "Dom Perignon" question asking about producer
    /(dom\s+perignon|opus\s+one|screaming\s+eagle|château|domaine)/gi,
    // Grape variety leakage: "Pinot Noir Reserve" asking about grape
    /(chardonnay|pinot\s+noir|cabernet|merlot|sauvignon|riesling|syrah)/gi,
  ],

  FOOD: [
    // Ingredient leakage: "Caesar Salad with Parmesan" question asking about cheese
    /(parmesan|mozzarella|cheddar|goat\s+cheese|feta|brie)/gi,
    // Cooking method leakage: "Grilled Salmon" asking about cooking method
    /(grilled|baked|fried|sautéed|roasted|braised|steamed|poached|pan-seared|smoked)/gi,
    // Protein leakage: "Chicken Marsala" asking about protein
    /(chicken|beef|pork|lamb|salmon|fish|duck|turkey|tofu|shrimp|lobster)/gi,
    // Allergen leakage: "Peanut Crusted" asking about allergens
    /(peanut|nut|dairy|gluten|wheat|shellfish|sesame|soy|egg)/gi,
    // Cuisine leakage: "Thai Pad See Ew" asking about cuisine
    /(thai|chinese|japanese|italian|french|mexican|indian|greek|mediterranean)/gi,
  ],

  BEVERAGE: [
    // Spirit leakage: "Vodka Martini" asking about primary spirit
    /(vodka|gin|rum|whiskey|tequila|bourbon)/gi,
    // Mixer leakage: "Gin and Tonic" asking about mixer
    /(tonic|soda|juice|syrup|vermouth|bitters)/gi,
    // Garnish leakage: "Mojito with Mint" asking about garnish
    /(mint|lime|lemon|cherry|olive|onion)/gi,
  ],
};

// Quality Thresholds and Scoring
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 80,
  ACCEPTABLE: 70,
  POOR: 60,
  UNACCEPTABLE: 50,

  // Penalties for common issues
  PENALTIES: {
    ANSWER_LEAKAGE: -40,
    DUPLICATE_OPTIONS: -20,
    VAGUE_QUESTION: -15,
    POOR_DISTRACTORS: -15,
    NO_EXPLANATION: -10,
    TOO_SHORT: -10,
    NO_MENU_REFERENCE: -30,
  },

  // Bonuses for quality features
  BONUSES: {
    CLEAR_MENU_REFERENCE: +5,
    EDUCATIONAL_EXPLANATION: +5,
    REALISTIC_DISTRACTORS: +5,
    PRACTICAL_KNOWLEDGE: +5,
    SAFETY_FOCUSED: +10,
  },
};

// Smart Question Format Selection Rules
export const SMART_QUESTION_FORMATS = {
  FOOD_FORMATS: [
    {
      name: "Simple Ingredient Query",
      trigger: "name_length <= 20 && allergen_count >= 2",
      template: "What ingredients does the {ITEM_NAME} contain?",
      focus: "ingredients",
      description: "For simple dishes with notable allergens/ingredients",
    },
    {
      name: "Dish Recognition",
      trigger: "name_length > 20 || complexity_score > 5",
      template: "Which dish contains these ingredients: {KEY_INGREDIENTS}?",
      focus: "recognition",
      description: "For complex dishes - test recognition instead of reading",
    },
    {
      name: "Ingredient Verification",
      trigger: "unique_ingredients >= 3",
      template:
        "Which of these ingredients is found in the {GENERIC_DISH_TYPE}?",
      focus: "ingredient_verification",
      description: "Test specific ingredient knowledge",
    },
    {
      name: "Allergen Identification",
      trigger: "allergen_count >= 3",
      template:
        "Which allergen should customers be aware of in this {COOKING_METHOD} dish?",
      focus: "allergens",
      description: "Critical safety knowledge for staff",
    },
    {
      name: "Safety Verification",
      trigger: "high_risk_allergens.length > 0",
      template: "What safety precaution is important when preparing this dish?",
      focus: "safety",
      description: "Focus on critical safety knowledge",
    },
    {
      name: "Preparation Method",
      trigger: "cooking_methods.length >= 2",
      template:
        "What cooking method is used for the main component of this dish?",
      focus: "preparation",
      description: "Test cooking technique knowledge",
    },
  ],

  WINE_FORMATS: [
    {
      name: "Grape Variety",
      template:
        "Which grape variety is primarily used in this {WINE_REGION} wine?",
      focus: "grape_variety",
    },
    {
      name: "Region Knowledge",
      template: "Which region produces this {WINE_STYLE} wine?",
      focus: "region",
    },
    {
      name: "Vintage Information",
      template: "What vintage year is this {PRODUCER} wine?",
      focus: "vintage",
    },
    {
      name: "Food Pairing",
      template: "Which menu item pairs best with this {WINE_STYLE}?",
      focus: "pairing",
    },
  ],

  BEVERAGE_FORMATS: [
    {
      name: "Core Ingredients",
      template: "What is the primary spirit in this cocktail?",
      focus: "ingredients",
    },
    {
      name: "Preparation Method",
      template: "How should this cocktail be prepared?",
      focus: "preparation",
    },
    {
      name: "Garnish Knowledge",
      template: "Which garnish is used for this cocktail?",
      focus: "garnish",
    },
    {
      name: "Service Standards",
      template: "What glassware is appropriate for this drink?",
      focus: "service",
    },
  ],
};

// Category-Specific Processing Rules
export const CATEGORY_PROCESSING_RULES = {
  "wine knowledge": {
    avoid_patterns: ["vintage", "producer", "region_in_name"],
    prefer_contexts: ["grape_variety", "food_pairing", "service_temp"],
    distractor_sources: ["other_wines", "wine_regions", "grape_varieties"],
  },
  "food knowledge": {
    avoid_patterns: ["ingredient_in_name", "cooking_method_in_name"],
    prefer_contexts: ["allergens", "dietary_info", "cooking_methods"],
    distractor_sources: ["other_ingredients", "cooking_methods", "allergens"],
  },
  "beverage knowledge": {
    avoid_patterns: ["spirit_in_name", "preparation_in_name"],
    prefer_contexts: ["ingredients", "garnish", "glassware"],
    distractor_sources: ["other_spirits", "garnishes", "preparation_methods"],
  },
};

// NEW: Phase 2 - Smart Context Processing interfaces
export interface SmartDistractors {
  ingredients: string[];
  items: string[];
  allergens?: string[];
  wineSpecific?: {
    grapes: string[];
    regions: string[];
    producers: string[];
  };
  beverageSpecific?: {
    spirits: string[];
    mixers: string[];
    garnishes: string[];
  };
}

export interface QuestionGenerationContext {
  categoryName: string;
  items: SimplifiedMenuItem[];
  smartDistractors: SmartDistractors;
  questionRules: CategorySpecificRules;
  targetCount: number;
  questionTypes: string[];
  distribution: QuestionPlan[];
}

export interface SimplifiedMenuItem {
  name: string;
  description: string; // Truncated to 100 chars
  keyIngredients: string[]; // Max 5 most important
  allergens: string[];
  dietary: DietaryInfo;
  category: string;
  wineDetails?: WineDetails; // Only for wine items
}

export interface CategorySpecificRules {
  focusAreas: string[];
  templates: string[];
  avoidanceRules: string[];
}

export interface DietaryInfo {
  isVegan?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
}

export interface WineDetails {
  grape?: string;
  region?: string;
  vintage?: string;
  producer?: string;
  wineStyle?: string;
}

// NEW: Phase 3 - Question Distribution Algorithm interfaces
export interface QuestionPlan {
  item: SimplifiedMenuItem;
  questionCount: number;
  focusAreas: string[];
  questionTypes: string[];
}

// Helper constants for smart context processing
const WINE_RELATED_TERMS = [
  "grape",
  "vintage",
  "wine",
  "bottle",
  "glass",
  "tasting",
  "chardonnay",
  "pinot noir",
  "cabernet",
  "merlot",
  "sauvignon",
  "bordeaux",
  "burgundy",
  "napa",
  "sonoma",
  "tuscany",
  "piedmont",
  "champagne",
  "chablis",
  "sancerre",
  "rioja",
  "chianti",
];

const BEVERAGE_INGREDIENTS = [
  "vodka",
  "gin",
  "rum",
  "whiskey",
  "tequila",
  "bourbon",
  "lime",
  "lemon",
  "mint",
  "simple syrup",
  "club soda",
  "triple sec",
  "vermouth",
  "bitters",
  "grenadine",
  "cointreau",
  "amaretto",
  "campari",
];

// Smart context processing functions
export const selectRelevantDistractors = (
  categoryName: string,
  contextualData: {
    contextualIngredients: string[];
    contextualItemNames: string[];
  }
): SmartDistractors => {
  const isWineCategory = /wine/i.test(categoryName);
  const isBeverageCategory = /beverage|drink|cocktail/i.test(categoryName);

  if (isWineCategory) {
    return {
      ingredients: contextualData.contextualIngredients
        .filter((ing) =>
          WINE_RELATED_TERMS.some((term) => ing.toLowerCase().includes(term))
        )
        .slice(0, 15),
      items: contextualData.contextualItemNames
        .filter((name) => /wine|vintage|grape/i.test(name))
        .slice(0, 10),
      wineSpecific: {
        grapes: extractWineGrapes(contextualData),
        regions: extractWineRegions(contextualData),
        producers: extractWineProducers(contextualData),
      },
    };
  }

  if (isBeverageCategory) {
    return {
      ingredients: contextualData.contextualIngredients
        .filter((ing) => BEVERAGE_INGREDIENTS.includes(ing.toLowerCase()))
        .slice(0, 15),
      items: contextualData.contextualItemNames
        .filter((name) => /cocktail|drink|coffee|tea/i.test(name))
        .slice(0, 10),
      beverageSpecific: {
        spirits: extractSpirits(contextualData),
        mixers: extractMixers(contextualData),
        garnishes: extractGarnishes(contextualData),
      },
    };
  }

  // Food category defaults
  return {
    ingredients: contextualData.contextualIngredients.slice(0, 20),
    items: contextualData.contextualItemNames.slice(0, 15),
    allergens: QUESTION_GENERATION_CONFIG.COMMON_ALLERGENS,
  };
};

// Helper functions for extracting wine-specific data
const extractWineGrapes = (data: {
  contextualIngredients: string[];
}): string[] => {
  const grapeTerms = [
    "chardonnay",
    "pinot noir",
    "cabernet",
    "merlot",
    "sauvignon",
  ];
  return data.contextualIngredients
    .filter((ing) =>
      grapeTerms.some((grape) => ing.toLowerCase().includes(grape))
    )
    .slice(0, 8);
};

const extractWineRegions = (data: {
  contextualIngredients: string[];
}): string[] => {
  const regionTerms = ["bordeaux", "burgundy", "napa", "tuscany", "piedmont"];
  return data.contextualIngredients
    .filter((ing) =>
      regionTerms.some((region) => ing.toLowerCase().includes(region))
    )
    .slice(0, 8);
};

const extractWineProducers = (data: {
  contextualIngredients: string[];
}): string[] => {
  const producerTerms = ["château", "domaine", "estate", "winery"];
  return data.contextualIngredients
    .filter((ing) =>
      producerTerms.some((producer) => ing.toLowerCase().includes(producer))
    )
    .slice(0, 8);
};

const extractSpirits = (data: {
  contextualIngredients: string[];
}): string[] => {
  const spiritTerms = ["vodka", "gin", "rum", "whiskey", "tequila", "bourbon"];
  return data.contextualIngredients
    .filter((ing) =>
      spiritTerms.some((spirit) => ing.toLowerCase().includes(spirit))
    )
    .slice(0, 8);
};

const extractMixers = (data: { contextualIngredients: string[] }): string[] => {
  const mixerTerms = ["tonic", "soda", "juice", "syrup", "vermouth", "bitters"];
  return data.contextualIngredients
    .filter((ing) =>
      mixerTerms.some((mixer) => ing.toLowerCase().includes(mixer))
    )
    .slice(0, 8);
};

const extractGarnishes = (data: {
  contextualIngredients: string[];
}): string[] => {
  const garnishTerms = ["lime", "lemon", "cherry", "olive", "onion", "mint"];
  return data.contextualIngredients
    .filter((ing) =>
      garnishTerms.some((garnish) => ing.toLowerCase().includes(garnish))
    )
    .slice(0, 8);
};

// Question distribution algorithm
export const calculateQuestionDistribution = (
  items: SimplifiedMenuItem[],
  focusAreas: string[],
  targetCount: number
): QuestionPlan[] => {
  const itemCount = items.length;

  // Ensure each item gets at least 1 question if possible
  const baseQuestionsPerItem = Math.max(1, Math.floor(targetCount / itemCount));
  const remainingQuestions = targetCount - baseQuestionsPerItem * itemCount;

  // Distribute focus areas evenly
  const distribution: QuestionPlan[] = items.map((item, index) => {
    const extraQuestion = index < remainingQuestions ? 1 : 0;
    const totalQuestionsForItem = baseQuestionsPerItem + extraQuestion;

    return {
      item,
      questionCount: totalQuestionsForItem,
      focusAreas: distributeFocusAreas(focusAreas, totalQuestionsForItem),
      questionTypes: distributeQuestionTypes(
        ["multiple-choice-single", "true-false"],
        totalQuestionsForItem
      ),
    };
  });

  return distribution;
};

const distributeFocusAreas = (
  focusAreas: string[],
  questionCount: number
): string[] => {
  if (questionCount <= focusAreas.length) {
    return focusAreas.slice(0, questionCount);
  }

  // Repeat focus areas evenly if we need more questions than focus areas
  const result: string[] = [];
  for (let i = 0; i < questionCount; i++) {
    result.push(focusAreas[i % focusAreas.length]);
  }
  return result;
};

const distributeQuestionTypes = (
  types: string[],
  questionCount: number
): string[] => {
  const result: string[] = [];
  for (let i = 0; i < questionCount; i++) {
    result.push(types[i % types.length]);
  }
  return result;
};

// Enhanced data structure processing
export const buildEnhancedPromptContext = (params: {
  categoryName: string;
  itemsInCategory: any[];
  questionFocusAreas: string[];
  targetQuestionCount: number;
  questionTypes: string[];
  contextualData: {
    contextualIngredients: string[];
    contextualItemNames: string[];
  };
}): QuestionGenerationContext => {
  const { categoryName, itemsInCategory, contextualData } = params;

  // Smart distractor selection based on category type
  const relevantDistractors = selectRelevantDistractors(
    categoryName,
    contextualData
  );

  // Cleaner item representation
  const simplifiedItems: SimplifiedMenuItem[] = itemsInCategory.map((item) => ({
    name: item.name,
    description: truncateDescription(item.description, 100),
    keyIngredients: item.ingredients?.slice(0, 5) || [],
    allergens: item.allergens || [],
    dietary: extractDietaryInfo(item),
    category: item.category,
    wineDetails:
      item.itemType === "wine" ? extractWineDetails(item) : undefined,
  }));

  // Calculate question distribution
  const distribution = calculateQuestionDistribution(
    simplifiedItems,
    params.questionFocusAreas,
    params.targetQuestionCount
  );

  return {
    categoryName,
    items: simplifiedItems,
    smartDistractors: relevantDistractors,
    questionRules: generateCategorySpecificRules(categoryName),
    targetCount: params.targetQuestionCount,
    questionTypes: params.questionTypes,
    distribution,
  };
};

// Helper functions for data processing
const truncateDescription = (
  description: string,
  maxLength: number
): string => {
  if (!description) return "";
  return description.length > maxLength
    ? description.substring(0, maxLength - 3) + "..."
    : description;
};

const extractDietaryInfo = (item: any): DietaryInfo => {
  const description = (item.description || "").toLowerCase();
  const ingredients = (item.ingredients || []).join(" ").toLowerCase();
  const allergens = (item.allergens || []).join(" ").toLowerCase();

  return {
    isVegan: /vegan/i.test(description) || /plant.?based/i.test(description),
    isVegetarian:
      /vegetarian/i.test(description) ||
      (!ingredients.includes("meat") && !ingredients.includes("fish")),
    isGlutenFree:
      /gluten.?free/i.test(description) || !allergens.includes("gluten"),
    isDairyFree:
      /dairy.?free/i.test(description) || !allergens.includes("dairy"),
  };
};

const extractWineDetails = (item: any): WineDetails => {
  const name = item.name || "";
  const description = item.description || "";

  return {
    grape: extractGrapeFromText(name + " " + description),
    region: extractRegionFromText(name + " " + description),
    vintage: extractVintageFromText(name),
    producer: extractProducerFromText(name),
    wineStyle: extractWineStyleFromText(description),
  };
};

const extractGrapeFromText = (text: string): string | undefined => {
  const grapes = [
    "chardonnay",
    "pinot noir",
    "cabernet",
    "merlot",
    "sauvignon",
  ];
  return grapes.find((grape) => text.toLowerCase().includes(grape));
};

const extractRegionFromText = (text: string): string | undefined => {
  const regions = [
    "bordeaux",
    "burgundy",
    "napa",
    "tuscany",
    "piedmont",
    "barolo",
  ];
  return regions.find((region) => text.toLowerCase().includes(region));
};

const extractVintageFromText = (text: string): string | undefined => {
  const vintageMatch = text.match(/\b(19|20)\d{2}\b/);
  return vintageMatch ? vintageMatch[0] : undefined;
};

const extractProducerFromText = (text: string): string | undefined => {
  // Extract producer names - this is a simplified version
  const producerPatterns = [
    /château\s+\w+/i,
    /domaine\s+\w+/i,
    /\w+\s+estate/i,
  ];
  for (const pattern of producerPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return undefined;
};

const extractWineStyleFromText = (text: string): string | undefined => {
  const styles = ["still", "sparkling", "fortified", "dessert"];
  return styles.find((style) => text.toLowerCase().includes(style)) || "still";
};

const generateCategorySpecificRules = (
  categoryName: string
): CategorySpecificRules => {
  const isWineCategory = /wine/i.test(categoryName);
  const isBeverageCategory = /beverage|drink|cocktail/i.test(categoryName);

  if (isWineCategory) {
    return {
      focusAreas: ["grape_variety", "region", "vintage", "pairing", "service"],
      templates: QUESTION_TEMPLATES.WINE_KNOWLEDGE,
      avoidanceRules: [
        "Never include vintage year in vintage questions",
        "Never include region name in region questions",
        "Never include producer name in producer questions",
        "Use generic wine descriptions",
      ],
    };
  }

  if (isBeverageCategory) {
    return {
      focusAreas: [
        "ingredients",
        "preparation",
        "garnish",
        "glassware",
        "temperature",
      ],
      templates: QUESTION_TEMPLATES.BEVERAGE_KNOWLEDGE,
      avoidanceRules: [
        "Never include spirit name in spirit questions",
        "Use generic cocktail descriptions",
      ],
    };
  }

  // Food category
  return {
    focusAreas: [
      "ingredients",
      "allergens",
      "preparation",
      "dietary",
      "description",
    ],
    templates: QUESTION_TEMPLATES.FOOD_KNOWLEDGE,
    avoidanceRules: [
      "Never include ingredient name in ingredient questions",
      "Never include cooking method in method questions",
      "Use generic dish descriptions",
    ],
  };
};

// NEW: Smart Question Format Selection - Intelligence Layer
export const selectOptimalQuestionFormat = (
  item: SimplifiedMenuItem,
  categoryName: string,
  contextualData: {
    contextualIngredients: string[];
    contextualItemNames: string[];
  }
): {
  selectedFormat: any;
  reasoning: string;
  confidence: number;
} => {
  const itemNameLength = item.name.length;
  const allergenCount = item.allergens.length;
  const ingredientCount = item.keyIngredients.length;
  const hasComplexDescription =
    item.description && item.description.length > 50;

  // Analyze item complexity
  const complexityScore = calculateItemComplexity(item);

  if (categoryName.toLowerCase().includes("food")) {
    // FOOD: Smart format selection based on complexity
    if (itemNameLength <= 20 && allergenCount >= 2) {
      return {
        selectedFormat: SMART_QUESTION_FORMATS.FOOD_FORMATS.find(
          (f) => f.name === "Simple Ingredient Query"
        ),
        reasoning:
          "Simple dish name with notable allergens - test ingredient knowledge",
        confidence: 0.9,
      };
    }

    if (itemNameLength > 25 || complexityScore > 5) {
      return {
        selectedFormat: SMART_QUESTION_FORMATS.FOOD_FORMATS.find(
          (f) => f.name === "Dish Recognition"
        ),
        reasoning:
          "Complex dish name - test recognition instead of reading comprehension",
        confidence: 0.85,
      };
    }

    if (allergenCount >= 3) {
      return {
        selectedFormat: SMART_QUESTION_FORMATS.FOOD_FORMATS.find(
          (f) => f.name === "Allergen Identification"
        ),
        reasoning: "Multiple allergens present - focus on safety knowledge",
        confidence: 0.95,
      };
    }

    if (ingredientCount >= 4) {
      return {
        selectedFormat: SMART_QUESTION_FORMATS.FOOD_FORMATS.find(
          (f) => f.name === "Ingredient Verification"
        ),
        reasoning: "Multiple unique ingredients - test specific knowledge",
        confidence: 0.8,
      };
    }

    // Default to preparation method for food
    return {
      selectedFormat: SMART_QUESTION_FORMATS.FOOD_FORMATS.find(
        (f) => f.name === "Preparation Method"
      ),
      reasoning: "Standard food item - test cooking technique knowledge",
      confidence: 0.7,
    };
  }

  if (categoryName.toLowerCase().includes("wine")) {
    // WINE: Smart format selection based on wine characteristics
    if (item.wineDetails?.vintage) {
      return {
        selectedFormat: SMART_QUESTION_FORMATS.WINE_FORMATS.find(
          (f) => f.name === "Vintage Information"
        ),
        reasoning: "Vintage information available - test vintage knowledge",
        confidence: 0.9,
      };
    }

    if (item.wineDetails?.region) {
      return {
        selectedFormat: SMART_QUESTION_FORMATS.WINE_FORMATS.find(
          (f) => f.name === "Region Knowledge"
        ),
        reasoning: "Region information available - test regional knowledge",
        confidence: 0.85,
      };
    }

    // Default to grape variety for wine
    return {
      selectedFormat: SMART_QUESTION_FORMATS.WINE_FORMATS.find(
        (f) => f.name === "Grape Variety"
      ),
      reasoning: "Wine item - test grape variety knowledge",
      confidence: 0.8,
    };
  }

  if (categoryName.toLowerCase().includes("beverage")) {
    // BEVERAGE: Smart format selection for cocktails/drinks
    const hasCocktailTerms = /cocktail|mixed|drink/i.test(item.name);

    if (hasCocktailTerms) {
      return {
        selectedFormat: SMART_QUESTION_FORMATS.BEVERAGE_FORMATS.find(
          (f) => f.name === "Core Ingredients"
        ),
        reasoning: "Cocktail item - test core ingredient knowledge",
        confidence: 0.9,
      };
    }

    // Default to preparation method for beverages
    return {
      selectedFormat: SMART_QUESTION_FORMATS.BEVERAGE_FORMATS.find(
        (f) => f.name === "Preparation Method"
      ),
      reasoning: "Beverage item - test preparation knowledge",
      confidence: 0.7,
    };
  }

  // Fallback
  return {
    selectedFormat: null,
    reasoning: "Category not recognized - using default format",
    confidence: 0.5,
  };
};

// Helper function to calculate item complexity
const calculateItemComplexity = (item: SimplifiedMenuItem): number => {
  let score = 0;

  // Name complexity
  const nameWords = item.name.split(/\s+/).length;
  score += nameWords > 3 ? 2 : 0;
  score += item.name.length > 30 ? 2 : 0;

  // Ingredient complexity
  score += item.keyIngredients.length > 5 ? 2 : 0;
  score += item.keyIngredients.some((ing) => ing.includes(",")) ? 1 : 0;

  // Allergen complexity
  score += item.allergens.length > 3 ? 1 : 0;

  // Description complexity
  if (item.description) {
    score += item.description.length > 100 ? 2 : 0;
    score += item.description.split(",").length > 3 ? 1 : 0;
  }

  return score;
};

// NEW: Enhanced Distractor Selection with Intelligence
export const generateContextAwareDistractors = (
  correctAnswer: string,
  categoryName: string,
  contextualData: {
    contextualIngredients: string[];
    contextualItemNames: string[];
  },
  questionFocus: string
): string[] => {
  const smartDistractors = selectRelevantDistractors(
    categoryName,
    contextualData
  );
  const distractors: string[] = [];

  if (categoryName.toLowerCase().includes("wine")) {
    if (
      questionFocus === "grape_variety" &&
      smartDistractors.wineSpecific?.grapes
    ) {
      distractors.push(
        ...smartDistractors.wineSpecific.grapes.filter(
          (g) => g !== correctAnswer
        )
      );
    } else if (
      questionFocus === "region" &&
      smartDistractors.wineSpecific?.regions
    ) {
      distractors.push(
        ...smartDistractors.wineSpecific.regions.filter(
          (r) => r !== correctAnswer
        )
      );
    } else if (
      questionFocus === "producer" &&
      smartDistractors.wineSpecific?.producers
    ) {
      distractors.push(
        ...smartDistractors.wineSpecific.producers.filter(
          (p) => p !== correctAnswer
        )
      );
    }
  } else if (categoryName.toLowerCase().includes("beverage")) {
    if (
      questionFocus === "ingredients" &&
      smartDistractors.beverageSpecific?.spirits
    ) {
      distractors.push(
        ...smartDistractors.beverageSpecific.spirits.filter(
          (s) => s !== correctAnswer
        )
      );
    } else if (
      questionFocus === "garnish" &&
      smartDistractors.beverageSpecific?.garnishes
    ) {
      distractors.push(
        ...smartDistractors.beverageSpecific.garnishes.filter(
          (g) => g !== correctAnswer
        )
      );
    }
  } else if (categoryName.toLowerCase().includes("food")) {
    if (questionFocus === "ingredients") {
      distractors.push(
        ...smartDistractors.ingredients.filter((i) => i !== correctAnswer)
      );
    } else if (questionFocus === "allergens" && smartDistractors.allergens) {
      distractors.push(
        ...smartDistractors.allergens.filter((a) => a !== correctAnswer)
      );
    }
  }

  // Fill remaining slots with general contextual items
  const remainingSlots = 3 - distractors.length;
  if (remainingSlots > 0) {
    const generalDistractors = [
      ...smartDistractors.ingredients,
      ...smartDistractors.items,
    ].filter((item) => item !== correctAnswer && !distractors.includes(item));

    distractors.push(...generalDistractors.slice(0, remainingSlots));
  }

  return distractors.slice(0, 3); // Ensure exactly 3 distractors
};

// NEW: Phase 2 Integration Function
export const applySmartContextProcessing = (
  items: SimplifiedMenuItem[],
  categoryName: string,
  contextualData: {
    contextualIngredients: string[];
    contextualItemNames: string[];
  },
  questionFocusAreas: string[],
  targetQuestionCount: number
): {
  enhancedItems: Array<
    SimplifiedMenuItem & {
      selectedFormat: any;
      formatReasoning: string;
      complexityScore: number;
      questionPriority: number;
    }
  >;
  smartDistractors: SmartDistractors;
  distribution: QuestionPlan[];
  processingInsights: {
    categoryAnalysis: string;
    formatDistribution: Record<string, number>;
    complexityAnalysis: string;
  };
} => {
  // 1. Analyze and enhance items with smart format selection
  const enhancedItems = items.map((item) => {
    const formatSelection = selectOptimalQuestionFormat(
      item,
      categoryName,
      contextualData
    );
    const complexityScore = calculateItemComplexity(item);

    return {
      ...item,
      selectedFormat: formatSelection.selectedFormat,
      formatReasoning: formatSelection.reasoning,
      complexityScore,
      questionPriority: calculateQuestionPriority(
        item,
        complexityScore,
        categoryName
      ),
    };
  });

  // 2. Generate smart distractors
  const smartDistractors = selectRelevantDistractors(
    categoryName,
    contextualData
  );

  // 3. Calculate question distribution
  const distribution = calculateQuestionDistribution(
    items,
    questionFocusAreas,
    targetQuestionCount
  );

  // 4. Generate processing insights
  const formatDistribution: Record<string, number> = {};
  enhancedItems.forEach((item) => {
    const formatName = item.selectedFormat?.name || "Unknown";
    formatDistribution[formatName] = (formatDistribution[formatName] || 0) + 1;
  });

  const avgComplexity =
    enhancedItems.reduce((sum, item) => sum + item.complexityScore, 0) /
    enhancedItems.length;

  return {
    enhancedItems,
    smartDistractors,
    distribution,
    processingInsights: {
      categoryAnalysis: `Processed ${items.length} ${categoryName} items with smart format selection`,
      formatDistribution,
      complexityAnalysis: `Average complexity: ${avgComplexity.toFixed(
        1
      )}/10. ${
        avgComplexity > 5
          ? "High complexity items detected - using advanced formats"
          : "Standard complexity items - using balanced formats"
      }`,
    },
  };
};

// Helper function to calculate question priority
const calculateQuestionPriority = (
  item: SimplifiedMenuItem,
  complexityScore: number,
  categoryName: string
): number => {
  let priority = 5; // Base priority

  // Higher priority for safety-critical items
  if (item.allergens.length > 2) priority += 3;
  if (
    item.allergens.some((a) =>
      ["peanuts", "shellfish", "tree nuts"].includes(a)
    )
  )
    priority += 2;

  // Higher priority for complex items that test real knowledge
  if (complexityScore > 5) priority += 2;

  // Category-specific priorities
  if (categoryName.toLowerCase().includes("wine") && item.wineDetails?.vintage)
    priority += 1;
  if (
    categoryName.toLowerCase().includes("food") &&
    item.keyIngredients.length > 4
  )
    priority += 1;

  return Math.min(priority, 10); // Cap at 10
};

// NEW: Phase 3 - Advanced Question Distribution Algorithm
export interface AdvancedQuestionPlan {
  totalQuestions: number;
  distributionStrategy:
    | "balanced"
    | "priority-weighted"
    | "safety-focused"
    | "complexity-adaptive";
  itemQuestionPlans: ItemQuestionPlan[];
  focusAreaDistribution: FocusAreaPlan[];
  qualityTargets: QualityTargets;
  adaptiveParameters: AdaptiveParameters;
}

export interface ItemQuestionPlan {
  item: SimplifiedMenuItem;
  allocatedQuestions: number;
  questionTypes: QuestionTypeAllocation[];
  focusAreas: string[];
  priority: number;
  rationale: string;
  estimatedDifficulty: "easy" | "medium" | "hard";
  trainingValue: number; // 1-10 scale
}

export interface QuestionTypeAllocation {
  type: string; // 'multiple-choice-single', 'true-false', etc.
  count: number;
  format: any; // Selected question format
  reasoning: string;
}

export interface FocusAreaPlan {
  area: string; // 'ingredients', 'allergens', 'preparation', etc.
  targetQuestions: number;
  actualQuestions: number;
  coverage: number; // Percentage coverage
  priority: "critical" | "important" | "supplementary";
}

export interface QualityTargets {
  minimumScore: number; // Minimum acceptable quality score
  targetAnswerLeakageRate: number; // Target 0% answer leakage
  targetDistractorQuality: number; // 1-10 scale
  expectedDifficulty: "easy" | "medium" | "hard";
  learningObjectives: string[];
}

export interface AdaptiveParameters {
  complexityThreshold: number; // Above this, use advanced formats
  safetyWeightMultiplier: number; // Multiplier for safety-critical items
  balanceTolerancePercent: number; // Acceptable imbalance percentage
  minQuestionsPerItem: number;
  maxQuestionsPerItem: number;
}

// NEW: Advanced Question Distribution Algorithm
export const calculateAdvancedQuestionDistribution = (
  items: SimplifiedMenuItem[],
  categoryName: string,
  focusAreas: string[],
  targetQuestionCount: number,
  distributionStrategy:
    | "balanced"
    | "priority-weighted"
    | "safety-focused"
    | "complexity-adaptive" = "priority-weighted"
): AdvancedQuestionPlan => {
  // Step 1: Calculate item priorities and training values
  const enhancedItems = items.map((item) => {
    const complexityScore = calculateItemComplexity(item);
    const priority = calculateQuestionPriority(
      item,
      complexityScore,
      categoryName
    );
    const trainingValue = calculateTrainingValue(item, categoryName);

    return {
      ...item,
      complexityScore,
      priority,
      trainingValue,
      estimatedDifficulty:
        complexityScore > 6 ? "hard" : complexityScore > 3 ? "medium" : "easy",
    };
  });

  // Step 2: Apply distribution strategy
  const itemQuestionPlans = applyDistributionStrategy(
    enhancedItems,
    targetQuestionCount,
    distributionStrategy
  );

  // Step 3: Calculate focus area distribution
  const focusAreaDistribution = calculateFocusAreaDistribution(
    itemQuestionPlans,
    focusAreas,
    targetQuestionCount
  );

  // Step 4: Optimize distribution for balance and coverage
  const optimizedPlans = optimizeQuestionDistribution(
    itemQuestionPlans,
    focusAreaDistribution,
    targetQuestionCount
  );

  // Step 5: Set quality targets
  const qualityTargets = calculateQualityTargets(enhancedItems, categoryName);

  // Step 6: Define adaptive parameters
  const adaptiveParameters = getAdaptiveParameters(
    categoryName,
    enhancedItems.length
  );

  return {
    totalQuestions: targetQuestionCount,
    distributionStrategy,
    itemQuestionPlans: optimizedPlans,
    focusAreaDistribution,
    qualityTargets,
    adaptiveParameters,
  };
};

// Helper function to calculate training value
const calculateTrainingValue = (
  item: SimplifiedMenuItem,
  categoryName: string
): number => {
  let value = 5; // Base value

  // Safety training value
  if (item.allergens.length > 0) value += 3;
  if (
    item.allergens.some((a) =>
      ["peanuts", "shellfish", "tree nuts"].includes(a)
    )
  )
    value += 2;

  // Complexity training value
  if (item.keyIngredients.length > 4) value += 2;
  if (item.name.length > 30) value += 1;

  // Category-specific value
  if (categoryName.toLowerCase().includes("wine") && item.wineDetails)
    value += 2;
  if (categoryName.toLowerCase().includes("food") && item.allergens.length > 2)
    value += 2;
  if (
    categoryName.toLowerCase().includes("beverage") &&
    item.keyIngredients.length > 3
  )
    value += 1;

  return Math.min(value, 10);
};

// Apply different distribution strategies
const applyDistributionStrategy = (
  enhancedItems: any[],
  targetQuestionCount: number,
  strategy: string
): ItemQuestionPlan[] => {
  switch (strategy) {
    case "balanced":
      return applyBalancedDistribution(enhancedItems, targetQuestionCount);
    case "priority-weighted":
      return applyPriorityWeightedDistribution(
        enhancedItems,
        targetQuestionCount
      );
    case "safety-focused":
      return applySafetyFocusedDistribution(enhancedItems, targetQuestionCount);
    case "complexity-adaptive":
      return applyComplexityAdaptiveDistribution(
        enhancedItems,
        targetQuestionCount
      );
    default:
      return applyPriorityWeightedDistribution(
        enhancedItems,
        targetQuestionCount
      );
  }
};

// Balanced distribution - equal questions per item
const applyBalancedDistribution = (
  enhancedItems: any[],
  targetQuestionCount: number
): ItemQuestionPlan[] => {
  const questionsPerItem = Math.floor(
    targetQuestionCount / enhancedItems.length
  );
  const remainder = targetQuestionCount % enhancedItems.length;

  return enhancedItems.map((item, index) => ({
    item: item,
    allocatedQuestions: questionsPerItem + (index < remainder ? 1 : 0),
    questionTypes: [
      {
        type: "multiple-choice-single",
        count: questionsPerItem + (index < remainder ? 1 : 0),
        format: null,
        reasoning: "Balanced distribution",
      },
    ],
    focusAreas: ["ingredients", "allergens"],
    priority: item.priority,
    rationale: "Equal distribution across all items",
    estimatedDifficulty: item.estimatedDifficulty,
    trainingValue: item.trainingValue,
  }));
};

// Priority-weighted distribution - more questions for higher priority items
const applyPriorityWeightedDistribution = (
  enhancedItems: any[],
  targetQuestionCount: number
): ItemQuestionPlan[] => {
  const totalPriorityWeight = enhancedItems.reduce(
    (sum, item) => sum + item.priority,
    0
  );

  return enhancedItems.map((item) => {
    const weightedQuestions = Math.max(
      1,
      Math.round((item.priority / totalPriorityWeight) * targetQuestionCount)
    );

    return {
      item: item,
      allocatedQuestions: Math.min(weightedQuestions, 5), // Cap at 5 per item
      questionTypes: [
        {
          type: "multiple-choice-single",
          count: Math.min(weightedQuestions, 5),
          format: null,
          reasoning: `Priority weight: ${item.priority}/10`,
        },
      ],
      focusAreas: determineFocusAreas(item),
      priority: item.priority,
      rationale: `Allocated ${Math.min(
        weightedQuestions,
        5
      )} questions based on priority ${item.priority}/10`,
      estimatedDifficulty: item.estimatedDifficulty,
      trainingValue: item.trainingValue,
    };
  });
};

// Safety-focused distribution - prioritize items with allergens
const applySafetyFocusedDistribution = (
  enhancedItems: any[],
  targetQuestionCount: number
): ItemQuestionPlan[] => {
  const safetyItems = enhancedItems.filter((item) => item.allergens.length > 0);
  const regularItems = enhancedItems.filter(
    (item) => item.allergens.length === 0
  );

  const safetyQuestions = Math.min(
    Math.ceil(targetQuestionCount * 0.7),
    safetyItems.length * 3
  );
  const regularQuestions = targetQuestionCount - safetyQuestions;

  const safetyPlans = safetyItems.map((item) => ({
    item: item,
    allocatedQuestions: Math.ceil(safetyQuestions / safetyItems.length),
    questionTypes: [
      {
        type: "multiple-choice-single",
        count: Math.ceil(safetyQuestions / safetyItems.length),
        format: null,
        reasoning: "Safety-critical item with allergens",
      },
    ],
    focusAreas: ["allergens", "ingredients", "safety"],
    priority: item.priority + 2, // Boost safety priority
    rationale: `Safety-focused: ${item.allergens.length} allergens present`,
    estimatedDifficulty: item.estimatedDifficulty,
    trainingValue: item.trainingValue + 2,
  }));

  const regularPlans = regularItems.map((item) => ({
    item: item,
    allocatedQuestions: Math.max(
      1,
      Math.floor(regularQuestions / regularItems.length)
    ),
    questionTypes: [
      {
        type: "multiple-choice-single",
        count: Math.max(1, Math.floor(regularQuestions / regularItems.length)),
        format: null,
        reasoning: "Regular item with standard allocation",
      },
    ],
    focusAreas: ["ingredients", "preparation"],
    priority: item.priority,
    rationale: "Standard allocation for non-allergen item",
    estimatedDifficulty: item.estimatedDifficulty,
    trainingValue: item.trainingValue,
  }));

  return [...safetyPlans, ...regularPlans];
};

// Complexity-adaptive distribution - more questions for complex items
const applyComplexityAdaptiveDistribution = (
  enhancedItems: any[],
  targetQuestionCount: number
): ItemQuestionPlan[] => {
  const totalComplexity = enhancedItems.reduce(
    (sum, item) => sum + item.complexityScore,
    0
  );

  return enhancedItems.map((item) => {
    const complexityRatio = item.complexityScore / totalComplexity;
    const baseQuestions = Math.max(
      1,
      Math.round(complexityRatio * targetQuestionCount)
    );
    const adaptiveQuestions =
      item.complexityScore > 5 ? baseQuestions + 1 : baseQuestions;

    return {
      item: item,
      allocatedQuestions: Math.min(adaptiveQuestions, 4),
      questionTypes: [
        {
          type: "multiple-choice-single",
          count: Math.min(adaptiveQuestions, 4),
          format: null,
          reasoning: `Complexity score: ${item.complexityScore}/10`,
        },
      ],
      focusAreas:
        item.complexityScore > 5
          ? ["recognition", "ingredients", "preparation"]
          : ["ingredients", "basic"],
      priority: item.priority,
      rationale: `Adaptive allocation based on complexity ${item.complexityScore}/10`,
      estimatedDifficulty: item.estimatedDifficulty,
      trainingValue: item.trainingValue,
    };
  });
};

// Determine appropriate focus areas for an item
const determineFocusAreas = (item: any): string[] => {
  const areas: string[] = [];

  if (item.allergens.length > 0) areas.push("allergens");
  if (item.keyIngredients.length > 3) areas.push("ingredients");
  if (item.complexityScore > 5) areas.push("recognition");
  if (item.wineDetails) areas.push("wine_knowledge");

  // Always include at least one area
  if (areas.length === 0) areas.push("basic");

  return areas;
};

// Calculate focus area distribution
const calculateFocusAreaDistribution = (
  itemPlans: ItemQuestionPlan[],
  requestedFocusAreas: string[],
  totalQuestions: number
): FocusAreaPlan[] => {
  const areaMap = new Map<string, number>();

  // Count questions allocated to each focus area
  itemPlans.forEach((plan) => {
    plan.focusAreas.forEach((area) => {
      areaMap.set(area, (areaMap.get(area) || 0) + plan.allocatedQuestions);
    });
  });

  return requestedFocusAreas.map((area) => ({
    area,
    targetQuestions: Math.ceil(totalQuestions / requestedFocusAreas.length),
    actualQuestions: areaMap.get(area) || 0,
    coverage: ((areaMap.get(area) || 0) / totalQuestions) * 100,
    priority:
      area === "allergens"
        ? "critical"
        : area === "ingredients"
        ? "important"
        : "supplementary",
  }));
};

// Optimize distribution for better balance
const optimizeQuestionDistribution = (
  itemPlans: ItemQuestionPlan[],
  focusDistribution: FocusAreaPlan[],
  targetQuestionCount: number
): ItemQuestionPlan[] => {
  // Check if total allocated questions match target
  const totalAllocated = itemPlans.reduce(
    (sum, plan) => sum + plan.allocatedQuestions,
    0
  );

  if (totalAllocated === targetQuestionCount) {
    return itemPlans; // Perfect allocation
  }

  // Adjust allocation to match target
  const difference = targetQuestionCount - totalAllocated;

  if (difference > 0) {
    // Need to add questions - prioritize high-value items
    const sortedPlans = [...itemPlans].sort(
      (a, b) => b.trainingValue - a.trainingValue
    );
    for (let i = 0; i < difference && i < sortedPlans.length; i++) {
      sortedPlans[i].allocatedQuestions += 1;
      sortedPlans[i].rationale += ` (+1 optimization)`;
    }
    return sortedPlans;
  } else {
    // Need to remove questions - reduce from low-value items
    const sortedPlans = [...itemPlans].sort(
      (a, b) => a.trainingValue - b.trainingValue
    );
    for (let i = 0; i < Math.abs(difference) && i < sortedPlans.length; i++) {
      if (sortedPlans[i].allocatedQuestions > 1) {
        sortedPlans[i].allocatedQuestions -= 1;
        sortedPlans[i].rationale += ` (-1 optimization)`;
      }
    }
    return sortedPlans;
  }
};

// Calculate quality targets based on category and items
const calculateQualityTargets = (
  enhancedItems: any[],
  categoryName: string
): QualityTargets => {
  const avgComplexity =
    enhancedItems.reduce((sum, item) => sum + item.complexityScore, 0) /
    enhancedItems.length;
  const hasAllergens = enhancedItems.some((item) => item.allergens.length > 0);

  return {
    minimumScore: hasAllergens ? 85 : 80, // Higher standards for safety-critical content
    targetAnswerLeakageRate: 0, // Zero tolerance for answer leakage
    targetDistractorQuality: avgComplexity > 5 ? 9 : 8, // Higher quality distractors for complex items
    expectedDifficulty:
      avgComplexity > 6 ? "hard" : avgComplexity > 3 ? "medium" : "easy",
    learningObjectives: generateLearningObjectives(categoryName, enhancedItems),
  };
};

// Generate learning objectives based on content
const generateLearningObjectives = (
  categoryName: string,
  items: any[]
): string[] => {
  const objectives: string[] = [];

  if (categoryName.toLowerCase().includes("food")) {
    objectives.push("Identify key ingredients in menu items");
    if (items.some((item) => item.allergens.length > 0)) {
      objectives.push("Recognize allergens and dietary restrictions");
    }
    objectives.push("Understand food preparation methods");
  }

  if (categoryName.toLowerCase().includes("wine")) {
    objectives.push("Distinguish wine varietals and regions");
    objectives.push("Understand wine pairing principles");
    if (items.some((item) => item.wineDetails?.vintage)) {
      objectives.push("Recognize vintage characteristics");
    }
  }

  if (categoryName.toLowerCase().includes("beverage")) {
    objectives.push("Identify core cocktail ingredients");
    objectives.push("Understand drink preparation techniques");
    objectives.push("Know appropriate serving methods");
  }

  return objectives;
};

// Get adaptive parameters based on category and item count
const getAdaptiveParameters = (
  categoryName: string,
  itemCount: number
): AdaptiveParameters => {
  const isComplex =
    categoryName.toLowerCase().includes("wine") || itemCount > 10;

  return {
    complexityThreshold: isComplex ? 5 : 6,
    safetyWeightMultiplier: categoryName.toLowerCase().includes("food")
      ? 2.0
      : 1.5,
    balanceTolerancePercent: 20, // 20% imbalance is acceptable
    minQuestionsPerItem: 1,
    maxQuestionsPerItem: isComplex ? 5 : 4,
  };
};

export default {
  QUESTION_GENERATION_CONFIG,
  QUESTION_TEMPLATES,
  IMPROVED_SYSTEM_INSTRUCTIONS,
  SMART_QUESTION_FORMATS,
  QUALITY_THRESHOLDS,
  CATEGORY_PROCESSING_RULES,
  selectRelevantDistractors,
  calculateQuestionDistribution,
  buildEnhancedPromptContext,
  selectOptimalQuestionFormat,
  generateContextAwareDistractors,
  applySmartContextProcessing,
  calculateAdvancedQuestionDistribution,
};
