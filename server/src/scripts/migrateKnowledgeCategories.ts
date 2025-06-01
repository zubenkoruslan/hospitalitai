import mongoose from "mongoose";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel";
import connectDB from "../utils/connectDB";

interface MigrationResult {
  totalQuestions: number;
  migrated: number;
  highConfidence: number;
  lowConfidence: number;
  errors: number;
  errorDetails: Array<{ questionId: string; error: string }>;
}

// Keywords for each knowledge category
const CATEGORY_KEYWORDS = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: [
    // Core food terms
    "ingredient",
    "recipe",
    "dish",
    "meal",
    "food",
    "cuisine",
    "menu",
    "allergen",
    "gluten",
    "dairy",
    "nut",
    "shellfish",
    "egg",
    "soy",
    "preparation",
    "cooking",
    "baking",
    "frying",
    "grilling",
    "steaming",
    "nutrition",
    "calorie",
    "protein",
    "carbohydrate",
    "fat",
    "vitamin",
    "vegetarian",
    "vegan",
    "halal",
    "kosher",
    "organic",
    "seasonal",
    "appetizer",
    "entree",
    "dessert",
    "side",
    "salad",
    "soup",
    "pasta",
    "meat",
    "seafood",
    "poultry",
    "beef",
    "chicken",
    "fish",
    "pork",
    "spice",
    "herb",
    "seasoning",
    "sauce",
    "dressing",
    "marinade",
  ],

  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: [
    // Non-alcoholic beverages
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
    "water",
    "sparkling",
    "milk",
    "cream",
    "sugar",
    "syrup",
    "decaf",
    "caffeine",
    "brewing",
    "steaming",
    "frothing",
    "temperature",
    "roast",
    "green tea",
    "black tea",
    "herbal tea",
    "iced tea",
    "hot chocolate",
    "fresh juice",
    "concentrate",
    "organic",
    "dairy-free",
    "almond milk",
  ],

  [KnowledgeCategory.WINE_KNOWLEDGE]: [
    // Wine specific terms
    "wine",
    "vintage",
    "grape",
    "vineyard",
    "winery",
    "bottle",
    "red wine",
    "white wine",
    "rosé",
    "champagne",
    "sparkling wine",
    "cabernet",
    "merlot",
    "pinot",
    "chardonnay",
    "sauvignon",
    "riesling",
    "tannin",
    "acidity",
    "body",
    "finish",
    "bouquet",
    "aroma",
    "pairing",
    "decanting",
    "serving temperature",
    "cork",
    "sommelier",
    "region",
    "terroir",
    "appellation",
    "vintage year",
    "aging",
    "cellar",
    "storage",
    "tasting",
    "wine glass",
    "wine list",
  ],

  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: [
    // Standard operating procedures
    "procedure",
    "protocol",
    "policy",
    "standard",
    "safety",
    "hygiene",
    "opening",
    "closing",
    "cleaning",
    "sanitizing",
    "emergency",
    "service",
    "customer service",
    "reservation",
    "seating",
    "greeting",
    "cash register",
    "payment",
    "POS",
    "receipt",
    "refund",
    "complaint",
    "uniform",
    "dress code",
    "schedule",
    "shift",
    "break",
    "training",
    "fire safety",
    "first aid",
    "evacuation",
    "accident",
    "incident",
    "inventory",
    "stock",
    "delivery",
    "storage",
    "expiration",
    "rotation",
  ],
};

// Subcategory mapping based on keywords
const SUBCATEGORY_KEYWORDS = {
  // Food Knowledge subcategories
  ingredients: ["ingredient", "component", "element", "composition"],
  allergens: [
    "allergen",
    "allergy",
    "gluten",
    "dairy",
    "nut",
    "shellfish",
    "egg",
    "soy",
  ],
  "food-preparation": [
    "preparation",
    "prep",
    "cooking",
    "baking",
    "frying",
    "grilling",
    "steaming",
  ],
  nutrition: [
    "nutrition",
    "calorie",
    "protein",
    "carbohydrate",
    "fat",
    "vitamin",
    "healthy",
  ],
  "menu-items": ["menu", "dish", "appetizer", "entree", "dessert", "special"],
  "dietary-restrictions": [
    "vegetarian",
    "vegan",
    "halal",
    "kosher",
    "gluten-free",
  ],
  "cooking-methods": [
    "cooking",
    "baking",
    "frying",
    "grilling",
    "steaming",
    "roasting",
  ],
  "food-safety": [
    "safety",
    "temperature",
    "storage",
    "expiration",
    "contamination",
  ],

  // Beverage Knowledge subcategories
  coffee: ["coffee", "espresso", "latte", "cappuccino", "americano", "roast"],
  tea: ["tea", "green tea", "black tea", "herbal tea", "iced tea"],
  "soft-drinks": ["soda", "soft drink", "cola", "carbonated"],
  juices: ["juice", "fresh juice", "concentrate", "smoothie"],
  "beverage-preparation": ["brewing", "steaming", "frothing", "mixing"],
  equipment: ["machine", "equipment", "grinder", "steamer"],
  temperature: ["temperature", "hot", "cold", "iced", "heated"],

  // Wine Knowledge subcategories
  varieties: [
    "cabernet",
    "merlot",
    "pinot",
    "chardonnay",
    "sauvignon",
    "riesling",
  ],
  regions: ["region", "valley", "country", "appellation", "terroir"],
  vintages: ["vintage", "year", "aged", "aging"],
  pairings: ["pairing", "match", "complement", "goes with"],
  "wine-service": ["serving", "temperature", "glass", "decanting", "opening"],
  "wine-storage": ["storage", "cellar", "temperature", "humidity"],
  "tasting-notes": ["tasting", "aroma", "bouquet", "finish", "notes"],
  production: ["production", "winery", "vineyard", "harvest"],

  // Procedures Knowledge subcategories
  safety: ["safety", "emergency", "fire", "evacuation", "accident"],
  hygiene: ["hygiene", "cleaning", "sanitizing", "washing"],
  "service-standards": ["service", "standard", "greeting", "seating"],
  "opening-procedures": ["opening", "setup", "preparation"],
  "closing-procedures": ["closing", "cleanup", "shutdown"],
  "emergency-protocols": ["emergency", "protocol", "fire", "first aid"],
  "customer-service": ["customer", "guest", "complaint", "satisfaction"],
};

/**
 * Determines knowledge category based on question text and context
 */
function determineKnowledgeCategory(
  questionText: string,
  categories: string[] = [],
  sopContext?: any
): {
  knowledgeCategory: KnowledgeCategory;
  knowledgeSubcategories: string[];
  confidence: number;
} {
  const text = (questionText + " " + categories.join(" ")).toLowerCase();
  const scores: Record<KnowledgeCategory, number> = {
    [KnowledgeCategory.FOOD_KNOWLEDGE]: 0,
    [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: 0,
    [KnowledgeCategory.WINE_KNOWLEDGE]: 0,
    [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: 0,
  };

  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[category as KnowledgeCategory] += 1;
      }
    }
  }

  // Boost scores based on SOP context
  if (sopContext) {
    if (
      text.includes("sop") ||
      text.includes("procedure") ||
      text.includes("protocol")
    ) {
      scores[KnowledgeCategory.PROCEDURES_KNOWLEDGE] += 3;
    }
  }

  // Find the category with highest score
  const sortedCategories = Object.entries(scores).sort(([, a], [, b]) => b - a);

  const winningCategory = sortedCategories[0][0] as KnowledgeCategory;
  const winningScore = sortedCategories[0][1];
  const totalScore = Object.values(scores).reduce(
    (sum, score) => sum + score,
    0
  );

  // Calculate confidence (0-1)
  const confidence = totalScore > 0 ? winningScore / totalScore : 0.3;

  // Determine subcategories
  const subcategories: string[] = [];
  for (const [subcategory, keywords] of Object.entries(SUBCATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        subcategories.push(subcategory);
        break; // Only add each subcategory once
      }
    }
  }

  // Limit to 3 subcategories
  const limitedSubcategories = subcategories.slice(0, 3);

  return {
    knowledgeCategory: winningCategory,
    knowledgeSubcategories: limitedSubcategories,
    confidence,
  };
}

/**
 * Migrates existing questions to include knowledge categories
 */
export async function migrateKnowledgeCategories(
  dryRun: boolean = false,
  batchSize: number = 100
): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalQuestions: 0,
    migrated: 0,
    highConfidence: 0,
    lowConfidence: 0,
    errors: 0,
    errorDetails: [],
  };

  try {
    console.log("🔄 Starting knowledge category migration...");
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE MIGRATION"}`);

    // Count total questions that need migration
    const totalCount = await QuestionModel.countDocuments({
      knowledgeCategory: { $exists: false },
    });

    result.totalQuestions = totalCount;
    console.log(`📊 Found ${totalCount} questions to migrate`);

    if (totalCount === 0) {
      console.log("✅ No questions need migration");
      return result;
    }

    // Process questions in batches
    let processed = 0;
    let skip = 0;

    while (processed < totalCount) {
      const questions = await QuestionModel.find({
        knowledgeCategory: { $exists: false },
      })
        .limit(batchSize)
        .skip(skip);

      console.log(
        `🔄 Processing batch ${Math.floor(skip / batchSize) + 1} (${
          questions.length
        } questions)`
      );

      for (const question of questions) {
        try {
          // Determine knowledge category
          const tagging = determineKnowledgeCategory(
            question.questionText,
            question.categories,
            question.sopDocumentId ? { hasSop: true } : undefined
          );

          // Update question based on confidence
          if (tagging.confidence >= 0.6) {
            // High confidence - auto-assign
            if (!dryRun) {
              await QuestionModel.updateOne(
                { _id: question._id },
                {
                  $set: {
                    knowledgeCategory: tagging.knowledgeCategory,
                    knowledgeSubcategories: tagging.knowledgeSubcategories,
                    knowledgeCategoryAssignedBy: "ai",
                    knowledgeCategoryAssignedAt: new Date(),
                  },
                }
              );
            }
            result.migrated++;
            result.highConfidence++;
          } else {
            // Low confidence - assign with review status
            if (!dryRun) {
              await QuestionModel.updateOne(
                { _id: question._id },
                {
                  $set: {
                    knowledgeCategory: tagging.knowledgeCategory,
                    knowledgeSubcategories: tagging.knowledgeSubcategories,
                    knowledgeCategoryAssignedBy: "ai",
                    knowledgeCategoryAssignedAt: new Date(),
                    status: "pending_review", // Mark for manual review
                  },
                }
              );
            }
            result.migrated++;
            result.lowConfidence++;
          }

          // Log progress every 50 questions
          if (result.migrated % 50 === 0) {
            console.log(
              `✅ Migrated ${result.migrated}/${totalCount} questions`
            );
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push({
            questionId: question._id.toString(),
            error: error instanceof Error ? error.message : "Unknown error",
          });

          console.error(`❌ Error migrating question ${question._id}:`, error);
        }
      }

      processed += questions.length;
      skip += batchSize;

      // Small delay to prevent overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("🎉 Migration completed!");
    console.log(`📊 Results:`);
    console.log(`   Total questions: ${result.totalQuestions}`);
    console.log(`   Migrated: ${result.migrated}`);
    console.log(`   High confidence: ${result.highConfidence}`);
    console.log(`   Low confidence (needs review): ${result.lowConfidence}`);
    console.log(`   Errors: ${result.errors}`);

    if (result.errorDetails.length > 0) {
      console.log("❌ Error details:");
      result.errorDetails.forEach((error) => {
        console.log(`   Question ${error.questionId}: ${error.error}`);
      });
    }

    return result;
  } catch (error) {
    console.error("💥 Migration failed:", error);
    throw error;
  }
}

/**
 * CLI script runner
 */
async function runMigration() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const batchSize = parseInt(
    args.find((arg) => arg.startsWith("--batch-size="))?.split("=")[1] || "100"
  );

  try {
    // Connect to database
    await connectDB();
    console.log("🔗 Connected to database");

    // Run migration
    const result = await migrateKnowledgeCategories(dryRun, batchSize);

    // Output results as JSON for programmatic access
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

export { determineKnowledgeCategory };
