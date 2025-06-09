/**
 * Enhanced Ingredient Intelligence & Allergen Detection System
 * Focuses on: Dish Names, Ingredients, Allergens, and Wine Intelligence
 */

// Core interfaces for enhanced ingredient processing
export interface EnhancedIngredient {
  name: string; // "mozzarella cheese"
  cleanName: string; // "mozzarella" (without descriptors)
  category: IngredientCategory;
  isCore: boolean; // main ingredient vs garnish/seasoning
  allergenRisk: string[]; // potential allergens this ingredient contains
  confidence: number; // 0-1, how confident we are in the categorization
}

export type IngredientCategory =
  | "protein"
  | "dairy"
  | "vegetable"
  | "grain"
  | "nut"
  | "seafood"
  | "spice"
  | "oil"
  | "fruit"
  | "other";

export interface AllergenDetection {
  allergen: string;
  confidence: "definite" | "likely" | "possible";
  source: string; // which ingredient triggered this
  reason: string; // why we think this allergen is present
}

export interface WineIntelligence {
  grapeVarieties: {
    name: string;
    confidence: "confirmed" | "inferred" | "likely";
    source: "explicit" | "regional" | "producer" | "wine_name" | "web_search";
  }[];
  region: {
    country?: string;
    region?: string;
    appellation?: string;
  };
  vintage?: number;
  producer?: string;
  wineStyle:
    | "still"
    | "sparkling"
    | "champagne"
    | "dessert"
    | "fortified"
    | "other";
  bodyProfile?: "light" | "medium" | "full";
  foodPairings: string[]; // only items from THIS menu
}

// Ingredient categorization patterns
const INGREDIENT_PATTERNS = {
  proteins: {
    meat: [
      "chicken",
      "beef",
      "pork",
      "lamb",
      "duck",
      "turkey",
      "veal",
      "bacon",
      "ham",
      "sausage",
    ],
    seafood: [
      "salmon",
      "tuna",
      "cod",
      "halibut",
      "shrimp",
      "crab",
      "lobster",
      "scallops",
      "mussels",
      "clams",
      "oysters",
      "fish",
    ],
    plant: [
      "tofu",
      "tempeh",
      "seitan",
      "beans",
      "lentils",
      "chickpeas",
      "quinoa",
    ],
  },

  dairy: {
    cheese: [
      "cheese",
      "parmesan",
      "mozzarella",
      "cheddar",
      "brie",
      "goat cheese",
      "feta",
      "ricotta",
      "gorgonzola",
      "gruyere",
    ],
    cream: ["cream", "heavy cream", "sour cream", "crème fraîche"],
    milk: ["milk", "buttermilk"],
    butter: ["butter", "clarified butter", "ghee"],
    other: ["yogurt", "mascarpone", "cottage cheese"],
  },

  nuts: {
    tree_nuts: [
      "almonds",
      "walnuts",
      "pecans",
      "cashews",
      "hazelnuts",
      "pistachios",
      "pine nuts",
      "macadamia",
    ],
    peanuts: ["peanuts", "peanut"],
    seeds: ["sesame seeds", "sunflower seeds", "pumpkin seeds"],
  },

  grains: {
    wheat: [
      "wheat",
      "flour",
      "bread",
      "pasta",
      "noodles",
      "couscous",
      "bulgur",
    ],
    rice: ["rice", "risotto"],
    other: ["quinoa", "barley", "oats", "corn", "polenta"],
  },

  vegetables: {
    alliums: ["onion", "garlic", "shallots", "leeks", "chives"],
    leafy: ["spinach", "arugula", "lettuce", "kale", "chard"],
    nightshades: ["tomato", "tomatoes", "peppers", "eggplant"],
    roots: ["carrots", "potatoes", "beets", "turnips", "radishes"],
    brassicas: ["broccoli", "cauliflower", "cabbage", "brussels sprouts"],
  },

  spices: [
    "salt",
    "pepper",
    "oregano",
    "basil",
    "thyme",
    "rosemary",
    "paprika",
    "cumin",
    "coriander",
  ],

  oils: [
    "olive oil",
    "vegetable oil",
    "canola oil",
    "sesame oil",
    "truffle oil",
  ],
};

// Allergen detection rules with confidence levels
const ALLERGEN_RULES = {
  dairy: {
    definite: [
      "cheese",
      "cream",
      "butter",
      "milk",
      "yogurt",
      "mascarpone",
      "ricotta",
      "mozzarella",
      "parmesan",
      "cheddar",
      "brie",
      "feta",
      "goat cheese",
    ],
    likely: [
      "alfredo",
      "carbonara",
      "bechamel",
      "hollandaise",
      "ranch",
      "blue cheese",
    ],
    possible: ["caesar dressing", "pesto", "gnocchi", "bread"], // may contain dairy
  },

  gluten: {
    definite: [
      "wheat",
      "flour",
      "bread",
      "pasta",
      "noodles",
      "couscous",
      "bulgur",
      "seitan",
      "beer",
    ],
    likely: ["breaded", "crusted", "dumplings", "gnocchi", "roux"],
    possible: [
      "soy sauce",
      "teriyaki sauce",
      "malt vinegar",
      "some seasonings",
    ], // may contain wheat
  },

  nuts: {
    definite: [
      "almonds",
      "walnuts",
      "pecans",
      "peanuts",
      "cashews",
      "hazelnuts",
      "pistachios",
      "pine nuts",
      "macadamia",
    ],
    likely: ["nut oil", "almond flour", "walnut oil", "peanut oil"],
    possible: ["pesto", "thai curry", "satay sauce", "some granola"], // may contain nuts
  },

  seafood: {
    definite: [
      "fish",
      "salmon",
      "tuna",
      "cod",
      "halibut",
      "shrimp",
      "crab",
      "lobster",
      "scallops",
      "mussels",
      "clams",
      "oysters",
      "anchovies",
    ],
    likely: ["fish sauce", "worcestershire sauce", "seafood stock"],
    possible: ["caesar dressing", "some asian sauces"], // traditional recipes may have fish
  },

  eggs: {
    definite: ["egg", "eggs", "mayonnaise", "aioli"],
    likely: ["hollandaise", "carbonara", "custard", "meringue", "some pasta"],
    possible: ["some breads", "some noodles"], // may contain eggs
  },

  soy: {
    definite: ["soy sauce", "tofu", "tempeh", "miso", "edamame"],
    likely: ["teriyaki sauce", "some asian sauces"],
    possible: ["some processed foods", "some oils"],
  },

  sesame: {
    definite: ["sesame seeds", "sesame oil", "tahini"],
    likely: ["hummus", "some asian dishes"],
    possible: ["some breads", "some sauces"],
  },
};

// Wine regional intelligence for grape variety detection
const WINE_REGIONAL_INTELLIGENCE = {
  // French regions
  burgundy: {
    varieties: ["Chardonnay", "Pinot Noir"],
    confidence: "confirmed" as const,
  },
  bourgogne: {
    varieties: ["Chardonnay", "Pinot Noir"],
    confidence: "confirmed" as const,
  },
  bordeaux: {
    varieties: ["Cabernet Sauvignon", "Merlot", "Cabernet Franc"],
    confidence: "confirmed" as const,
  },
  champagne: {
    varieties: ["Chardonnay", "Pinot Noir", "Pinot Meunier"],
    confidence: "confirmed" as const,
  },
  chablis: { varieties: ["Chardonnay"], confidence: "confirmed" as const },
  sancerre: {
    varieties: ["Sauvignon Blanc"],
    confidence: "confirmed" as const,
  },
  pouilly: { varieties: ["Sauvignon Blanc"], confidence: "confirmed" as const },
  loire: {
    varieties: ["Sauvignon Blanc", "Chenin Blanc", "Cabernet Franc"],
    confidence: "inferred" as const,
  },
  rhone: {
    varieties: ["Syrah", "Grenache", "Viognier"],
    confidence: "inferred" as const,
  },
  provence: {
    varieties: ["Grenache", "Syrah", "Mourvèdre"],
    confidence: "inferred" as const,
  },

  // Italian regions
  barolo: { varieties: ["Nebbiolo"], confidence: "confirmed" as const },
  barbaresco: { varieties: ["Nebbiolo"], confidence: "confirmed" as const },
  chianti: { varieties: ["Sangiovese"], confidence: "confirmed" as const },
  brunello: { varieties: ["Sangiovese"], confidence: "confirmed" as const },
  tuscany: { varieties: ["Sangiovese"], confidence: "inferred" as const },
  piedmont: {
    varieties: ["Nebbiolo", "Barbera"],
    confidence: "inferred" as const,
  },
  prosecco: { varieties: ["Glera"], confidence: "confirmed" as const },

  // Spanish regions
  rioja: { varieties: ["Tempranillo"], confidence: "confirmed" as const },
  "ribera del duero": {
    varieties: ["Tempranillo"],
    confidence: "confirmed" as const,
  },
  "rias baixas": { varieties: ["Albariño"], confidence: "confirmed" as const },

  // German regions
  mosel: { varieties: ["Riesling"], confidence: "confirmed" as const },
  rheingau: { varieties: ["Riesling"], confidence: "confirmed" as const },
  pfalz: { varieties: ["Riesling"], confidence: "inferred" as const },

  // Common wine names
  muscadet: {
    varieties: ["Melon de Bourgogne"],
    confidence: "confirmed" as const,
  },
  sauternes: {
    varieties: ["Sauvignon Blanc", "Sémillon"],
    confidence: "confirmed" as const,
  },
  cava: {
    varieties: ["Macabeo", "Xarel·lo", "Parellada"],
    confidence: "confirmed" as const,
  },

  // Producer patterns (famous examples)
  "dom perignon": {
    varieties: ["Chardonnay", "Pinot Noir"],
    confidence: "confirmed" as const,
  },
  "opus one": {
    varieties: ["Cabernet Sauvignon"],
    confidence: "confirmed" as const,
  },
};

/**
 * Clean ingredient name by removing descriptors and cooking methods
 */
export function cleanIngredientName(ingredient: string): string {
  const descriptors = [
    "fresh",
    "dried",
    "chopped",
    "diced",
    "sliced",
    "minced",
    "grated",
    "organic",
    "local",
    "wild",
    "free-range",
  ];
  const cookingMethods = [
    "grilled",
    "roasted",
    "sautéed",
    "braised",
    "steamed",
    "fried",
    "baked",
  ];

  let cleaned = ingredient.toLowerCase().trim();

  // Remove descriptors and cooking methods
  [...descriptors, ...cookingMethods].forEach((descriptor) => {
    cleaned = cleaned
      .replace(new RegExp(`\\b${descriptor}\\b`, "gi"), "")
      .trim();
  });

  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned || ingredient; // fallback to original if cleaning removes everything
}

/**
 * Categorize an ingredient based on patterns
 */
export function categorizeIngredient(ingredient: string): IngredientCategory {
  const clean = ingredient.toLowerCase();

  // Check proteins
  if (
    INGREDIENT_PATTERNS.proteins.meat.some((p) => clean.includes(p)) ||
    INGREDIENT_PATTERNS.proteins.seafood.some((p) => clean.includes(p)) ||
    INGREDIENT_PATTERNS.proteins.plant.some((p) => clean.includes(p))
  ) {
    return "protein";
  }

  // Check dairy
  if (
    Object.values(INGREDIENT_PATTERNS.dairy)
      .flat()
      .some((p) => clean.includes(p))
  ) {
    return "dairy";
  }

  // Check nuts
  if (
    Object.values(INGREDIENT_PATTERNS.nuts)
      .flat()
      .some((p) => clean.includes(p))
  ) {
    return "nut";
  }

  // Check grains
  if (
    Object.values(INGREDIENT_PATTERNS.grains)
      .flat()
      .some((p) => clean.includes(p))
  ) {
    return "grain";
  }

  // Check vegetables
  if (
    Object.values(INGREDIENT_PATTERNS.vegetables)
      .flat()
      .some((p) => clean.includes(p))
  ) {
    return "vegetable";
  }

  // Check spices
  if (INGREDIENT_PATTERNS.spices.some((p) => clean.includes(p))) {
    return "spice";
  }

  // Check oils
  if (INGREDIENT_PATTERNS.oils.some((p) => clean.includes(p))) {
    return "oil";
  }

  // Check for fruits (basic patterns)
  const fruits = [
    "apple",
    "lemon",
    "lime",
    "orange",
    "berry",
    "grape",
    "cherry",
    "peach",
    "pear",
  ];
  if (fruits.some((f) => clean.includes(f))) {
    return "fruit";
  }

  return "other";
}

/**
 * Determine if an ingredient is core to the dish or just a garnish/seasoning
 */
export function determineIfCoreIngredient(ingredient: string): boolean {
  const clean = ingredient.toLowerCase();

  // Garnishes and seasonings are typically not core
  const nonCorePatterns = [
    "garnish",
    "sprinkle",
    "drizzle",
    "dash",
    "pinch",
    "touch",
    "salt",
    "pepper",
    "parsley",
    "chives",
    "lemon zest",
    "microgreens",
  ];

  if (nonCorePatterns.some((pattern) => clean.includes(pattern))) {
    return false;
  }

  // Proteins are usually core
  if (categorizeIngredient(ingredient) === "protein") {
    return true;
  }

  // Large quantities suggest core ingredient
  const quantityPatterns = [
    "cup",
    "cups",
    "lb",
    "lbs",
    "ounce",
    "ounces",
    "pound",
    "pounds",
  ];
  if (quantityPatterns.some((q) => clean.includes(q))) {
    return true;
  }

  return true; // default to core if uncertain
}

/**
 * Detect potential allergens from an ingredient
 */
export function detectAllergenRisk(ingredient: string): string[] {
  const clean = ingredient.toLowerCase();
  const allergens: string[] = [];

  // Check each allergen category
  Object.entries(ALLERGEN_RULES).forEach(([allergen, rules]) => {
    if (
      rules.definite.some((trigger) => clean.includes(trigger.toLowerCase()))
    ) {
      allergens.push(allergen);
    }
  });

  return allergens;
}

/**
 * Enhanced ingredient processing function
 */
export function enhanceIngredients(
  rawIngredients: string[]
): EnhancedIngredient[] {
  return rawIngredients
    .filter((ingredient) => ingredient && ingredient.trim() !== "")
    .map((ingredient) => ({
      name: ingredient,
      cleanName: cleanIngredientName(ingredient),
      category: categorizeIngredient(ingredient),
      isCore: determineIfCoreIngredient(ingredient),
      allergenRisk: detectAllergenRisk(ingredient),
      confidence: 0.8, // default confidence, could be improved with ML
    }));
}

/**
 * Comprehensive allergen detection for dish + ingredients
 */
export function detectAllergens(
  ingredients: string[],
  dishName: string = ""
): AllergenDetection[] {
  const detections: AllergenDetection[] = [];
  const searchText = [...ingredients, dishName].join(" ").toLowerCase();

  Object.entries(ALLERGEN_RULES).forEach(([allergen, rules]) => {
    // Check definite matches
    rules.definite.forEach((trigger) => {
      if (searchText.includes(trigger.toLowerCase())) {
        detections.push({
          allergen,
          confidence: "definite",
          source: trigger,
          reason: `Contains ${trigger}`,
        });
      }
    });

    // Check likely matches (only if not already detected as definite)
    if (
      !detections.some(
        (d) => d.allergen === allergen && d.confidence === "definite"
      )
    ) {
      rules.likely.forEach((trigger) => {
        if (searchText.includes(trigger.toLowerCase())) {
          detections.push({
            allergen,
            confidence: "likely",
            source: trigger,
            reason: `Likely contains ${allergen} due to ${trigger}`,
          });
        }
      });
    }

    // Check possible matches (only if not already detected)
    if (!detections.some((d) => d.allergen === allergen)) {
      rules.possible.forEach((trigger) => {
        if (searchText.includes(trigger.toLowerCase())) {
          detections.push({
            allergen,
            confidence: "possible",
            source: trigger,
            reason: `May contain ${allergen} (${trigger} often contains ${allergen})`,
          });
        }
      });
    }
  });

  // Remove duplicates and return
  const uniqueDetections = detections.filter(
    (detection, index, self) =>
      index ===
      self.findIndex(
        (d) =>
          d.allergen === detection.allergen &&
          d.confidence === detection.confidence
      )
  );

  return uniqueDetections;
}

/**
 * Enhanced wine grape variety detection
 */
export function detectWineGrapeVarieties(
  wineName: string,
  wineRegion?: string,
  wineProducer?: string
): WineIntelligence["grapeVarieties"] {
  const varieties: WineIntelligence["grapeVarieties"] = [];
  const searchText = [wineName, wineRegion, wineProducer]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Check explicit grape variety mentions in wine name
  const explicitVarieties = [
    "chardonnay",
    "pinot noir",
    "cabernet sauvignon",
    "merlot",
    "syrah",
    "shiraz",
    "sauvignon blanc",
    "riesling",
    "sangiovese",
    "tempranillo",
    "nebbiolo",
    "pinot grigio",
    "pinot gris",
    "grenache",
    "viognier",
    "gewürztraminer",
  ];

  explicitVarieties.forEach((variety) => {
    if (searchText.includes(variety)) {
      varieties.push({
        name: variety
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        confidence: "confirmed",
        source: "explicit",
      });
    }
  });

  // If no explicit varieties found, check regional patterns
  if (varieties.length === 0 && wineRegion) {
    Object.entries(WINE_REGIONAL_INTELLIGENCE).forEach(([region, info]) => {
      if (searchText.includes(region.toLowerCase())) {
        info.varieties.forEach((variety) => {
          varieties.push({
            name: variety,
            confidence: info.confidence,
            source: "regional",
          });
        });
      }
    });
  }

  return varieties;
}

/**
 * Main enhanced processing function for menu items
 */
export interface ProcessedMenuItem {
  // Core data
  name: string;
  description?: string;
  category: string;
  price?: number;
  itemType: "food" | "beverage" | "wine";

  // Enhanced ingredients
  rawIngredients: string[];
  enhancedIngredients: EnhancedIngredient[];

  // Smart allergen detection
  detectedAllergens: AllergenDetection[];
  allergenSummary: string[]; // simplified list for storage

  // Dietary flags (enhanced)
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  confidence: number; // how confident we are in dietary classifications

  // Wine-specific (if applicable)
  wineIntelligence?: WineIntelligence;
}

export function processMenuItem(rawItem: any): ProcessedMenuItem {
  // 1. Extract basic info
  const basicInfo = {
    name: rawItem.itemName || rawItem.name || "",
    description: rawItem.description,
    category: rawItem.itemCategory || rawItem.category || "",
    price: rawItem.itemPrice || rawItem.price,
    itemType: rawItem.itemType || "food",
  };

  // 2. Process ingredients
  const rawIngredients = rawItem.itemIngredients || rawItem.ingredients || [];
  const enhancedIngredients = enhanceIngredients(rawIngredients);

  // 3. Detect allergens
  const allergenDetections = detectAllergens(rawIngredients, basicInfo.name);

  // 4. Determine dietary flags with confidence
  const definiteAllergens = allergenDetections
    .filter((d) => d.confidence === "definite")
    .map((d) => d.allergen);

  const isDairyFree = !definiteAllergens.includes("dairy");
  const isGlutenFree =
    !definiteAllergens.includes("gluten") && rawItem.isGlutenFree === true;
  const isVegan =
    !definiteAllergens.includes("dairy") &&
    !definiteAllergens.includes("eggs") &&
    !enhancedIngredients.some(
      (ing) =>
        ing.category === "protein" &&
        !INGREDIENT_PATTERNS.proteins.plant.some((p) =>
          ing.cleanName.includes(p)
        )
    );
  const isVegetarian =
    isVegan ||
    !enhancedIngredients.some(
      (ing) =>
        INGREDIENT_PATTERNS.proteins.meat.some((p) =>
          ing.cleanName.includes(p)
        ) ||
        INGREDIENT_PATTERNS.proteins.seafood.some((p) =>
          ing.cleanName.includes(p)
        )
    );

  // 5. Process wine data (if wine)
  let wineIntelligence: WineIntelligence | undefined;
  if (basicInfo.itemType === "wine") {
    const grapeVarieties = detectWineGrapeVarieties(
      basicInfo.name,
      rawItem.wineRegion,
      rawItem.wineProducer
    );

    wineIntelligence = {
      grapeVarieties,
      region: {
        country: rawItem.wineRegion ? "Unknown" : undefined, // Would need more sophisticated parsing
        region: rawItem.wineRegion,
      },
      vintage: rawItem.wineVintage,
      producer: rawItem.wineProducer,
      wineStyle: rawItem.wineStyle || "still",
      foodPairings: rawItem.winePairings || [],
    };
  }

  return {
    ...basicInfo,
    rawIngredients,
    enhancedIngredients,
    detectedAllergens: allergenDetections,
    allergenSummary: definiteAllergens,
    isVegan: rawItem.isVegan || isVegan,
    isVegetarian: rawItem.isVegetarian || isVegetarian,
    isGlutenFree: rawItem.isGlutenFree || isGlutenFree,
    isDairyFree,
    confidence: 0.8, // Overall confidence in our analysis
    wineIntelligence,
  };
}
