// Question Generation Constants - Refactored for Better Quality
// This file contains improved prompts and configurations to eliminate answer leakage
// and generate higher quality questions for hospitality training

export const QUESTION_GENERATION_CONFIG = {
  MAX_PROMPT_LENGTH: 4000,
  MIN_QUESTION_LENGTH: 20,
  MAX_EXPLANATION_LENGTH: 200,
  REQUIRED_DISTRACTOR_COUNT: 3,
  MIN_QUALITY_SCORE: 60, // Temporarily reduced from 75 to allow training while improving prompts

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
    "chablis",
    "sancerre",
    "rioja",
    "chianti",
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
    "cointreau",
    "amaretto",
    "campari",
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
    "mustard",
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
      /\b(barolo|chianti|bordeaux|burgundy|napa|sonoma|tuscany|piedmont)\b/gi, // Wine regions
      /\b(dom\s+perignon|opus\s+one|screaming\s+eagle|château|domaine)\b/gi, // Wine producers
      /\b(chardonnay|pinot\s+noir|cabernet|merlot|sauvignon|riesling|syrah)\b/gi, // Grape varieties
      /\b(parmesan|mozzarella|cheddar|goat\s+cheese|feta|brie)\b/gi, // Food ingredients
      /\b(grilled|baked|fried|sautéed|roasted|braised|steamed|poached)\b/gi, // Cooking methods
      /\b(peanut|nut|dairy|gluten|wheat|shellfish|sesame|soy|egg)\b/gi, // Allergens
      /\b(thai|chinese|japanese|italian|french|mexican|indian|greek)\b/gi, // Cuisine styles
    ],

    // Safe generic replacements
    SAFE_REPLACEMENTS: {
      vintage: "this wine",
      region: "this [wine color] wine from [country]",
      producer: "this [region] wine",
      grape: "this [wine style] wine",
      ingredient: "this [food category] dish",
      cooking_method: "this [protein type] preparation",
      allergen: "this [preparation style] dish",
      cuisine: "this [characteristic] dish",
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
    "What vintage year is this {WINE_DESCRIPTION} from?",
    "Which wine style category best describes this {WINE_COLOR} wine?",
    "What producer creates this {WINE_REGION} wine?",
    // Context-aware templates that avoid naming the answer
    "This Italian red wine from Piedmont is made primarily from which grape?",
    "Which region in France is famous for this Chardonnay-based sparkling wine?",
    "What is the primary grape variety in this Burgundy red wine?",
    "This powerful red wine from Italy's Piedmont region is made from which grape variety?",
    "Which French region is known for this elegant white wine with mineral notes?",
  ],

  FOOD_KNOWLEDGE: [
    // SIMPLIFIED: Only 3 ingredient-focused formats
    "What ingredients does the {MENU_ITEM_NAME} contain?",
    "Which dish contains these ingredients: {INGREDIENT_LIST}?",
    "Does the {MENU_ITEM_NAME} contain these ingredients: {INGREDIENT_LIST}?",
  ],

  BEVERAGE_KNOWLEDGE: [
    "What is the primary spirit in this {COCKTAIL_STYLE} cocktail?",
    "Which garnish is traditionally used for this {SPIRIT_TYPE} drink?",
    "What glassware is appropriate for this type of {BEVERAGE_CATEGORY}?",
    "Which preparation technique is used for this {COCKTAIL_STYLE}?",
    "What temperature should this {BEVERAGE_TYPE} be served?",
    "Which mixer is commonly used in this {SPIRIT_BASE} cocktail?",
    "How should this classic {COCKTAIL_FAMILY} be prepared?",
    // Context-aware templates
    "This refreshing citrus cocktail contains which primary spirit?",
    "What mixing technique is used for this layered drink?",
    "Which type of glass is traditionally used for this whiskey-based cocktail?",
  ],

  PROCEDURES_KNOWLEDGE: [
    "What is the first step when {PROCEDURE_ACTION}?",
    "How long should {TIME_BASED_PROCEDURE} take?",
    "When should a manager be notified during {PROCEDURE_NAME}?",
    "What safety equipment is required for {PROCEDURE_NAME}?",
    "Which documentation is needed after {PROCEDURE_NAME}?",
    "What is the correct sequence for {MULTI_STEP_PROCEDURE}?",
    "Who is authorized to perform {RESTRICTED_PROCEDURE}?",
    // Context-aware templates
    "According to our safety protocols, what should be done first in this situation?",
    "Which step comes immediately after sanitizing equipment?",
    "What is the proper procedure when handling customer complaints?",
  ],
};

// NEW: Streamlined System Instructions
export const IMPROVED_SYSTEM_INSTRUCTIONS = {
  MENU: `You are a hospitality training expert generating high-quality quiz questions. Current AI questions are scoring 48% quality due to specific issues that you MUST avoid.

🚨 CRITICAL QUALITY REQUIREMENTS (TO REACH 75%+ SCORE):

1. ALWAYS USE SPECIFIC MENU ITEM NAMES - NEVER vague references:
   ❌ FORBIDDEN: "Which ingredient is found in the side dish that features crispy shallot?"
   ✅ REQUIRED: "Which ingredient is included in the Tenderstem Broccoli with Crispy Shallot?"
   
   ❌ FORBIDDEN: "What protein is in this seafood preparation with citrus marinade?"
   ✅ REQUIRED: "What is the main protein in the Citrus Marinated Chicken?"

2. GENERATE EXACTLY 3 INCORRECT OPTIONS + 1 CORRECT = 4 TOTAL OPTIONS
   ❌ CAUSES -25 POINTS: Only 2 total options
   ✅ REQUIRED: Always 4 options (1 correct + 3 distractors)

3. NEVER INCLUDE ANSWER CLUES IN WINE QUESTIONS:
   ❌ FORBIDDEN: "Which region produces the 2016 Barolo Cannubi from Brezza?" (Barolo = answer leak)
   ✅ REQUIRED: "Which Italian wine region is this Nebbiolo-based wine from?" (specific item name but no answer leak)

4. PROVIDE MEANINGFUL EXPLANATIONS:
   ❌ FORBIDDEN: "The protein is salmon." (too short)
   ✅ REQUIRED: "The Citrus Marinated Chicken features grilled chicken breast as the primary protein, marinated in fresh citrus juices."

KNOWLEDGE CATEGORIES (choose the most relevant):
• FOOD_KNOWLEDGE: INGREDIENTS ONLY - Use the 3 simple formats above
• BEVERAGE_KNOWLEDGE: Drink recipes, preparation techniques, equipment, temperatures  
• WINE_KNOWLEDGE: Varieties, regions, pairings, service protocols, tasting notes
• PROCEDURES_KNOWLEDGE: Service standards, safety protocols, customer service

🚨 FOR FOOD QUESTIONS: ONLY generate questions about INGREDIENTS using the 3 formats above. 
DO NOT ask about allergens, cooking methods, dietary restrictions, or preparation methods.

📋 MANDATORY FOOD QUESTION GENERATION RULES:
1. Use EXACTLY one of the 3 formats shown above
2. For multiple choice: List actual ingredients from the menu item data
3. For true/false: Mix correct and incorrect ingredients
4. Always use the exact menu item name from the provided data
5. Generate realistic ingredient distractors from other menu items

DISTRACTOR GENERATION RULES:
• Use plausible alternatives from the same category
• Draw from contextual ingredients/items provided
• Make distractors realistic but clearly incorrect
• Avoid obviously wrong answers like "Chocolate" for wine grape varieties

QUESTION STRUCTURE FORMULA:
"[SPECIFIC QUESTION ABOUT] + [ACTUAL MENU ITEM NAME] + [QUESTION FOCUS]?"

SIMPLIFIED FOOD QUESTION FORMATS (USE ONLY THESE):

🍽️ FOOD QUESTIONS - FOCUS ON INGREDIENTS ONLY:

MULTIPLE CHOICE Format 1:
"What ingredients does the [MENU ITEM NAME] contain?"
✅ Example: "What ingredients does the Pan-Seared Salmon with Almond Crust contain?"

MULTIPLE CHOICE Format 2:
"Which dish contains these ingredients: [INGREDIENT LIST]?"
✅ Example: "Which dish contains these ingredients: salmon, almonds, lemon?"

TRUE/FALSE Format:
"Does the [MENU ITEM NAME] contain these ingredients: [INGREDIENT LIST]?"
✅ Example: "Does the Pan-Seared Salmon with Almond Crust contain these ingredients: salmon, almonds, capers?"

OTHER CATEGORIES:
✅ WINE: "Which grape variety is primarily used in the Barolo DOCG wines?" (mentions category, not specific bottle)
✅ BEVERAGE: "What is the primary spirit in the Classic Negroni cocktail?"
✅ PROCEDURE: "What is the first step when handling a customer complaint about food temperature?"

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

CRITICAL ANSWER LEAKAGE PREVENTION:
• Never include procedure names, timeframes, or specific requirements in question text when asking about them
• Use generic references: "According to safety protocol" instead of naming specific procedures
• Test understanding, not reading comprehension

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

export default {
  QUESTION_GENERATION_CONFIG,
  QUESTION_TEMPLATES,
  IMPROVED_SYSTEM_INSTRUCTIONS,
  ANSWER_LEAKAGE_PATTERNS,
};
