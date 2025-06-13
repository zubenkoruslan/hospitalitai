import { BeverageItemEnhancerService } from "../services/BeverageItemEnhancerService";

async function debugSpecificBeverage() {
  console.log("🔍 Debugging specific beverage enhancement failure...\n");

  // The exact example provided by the user
  const testBeverage = {
    name: "Rosé Negroni",
    description:
      "Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel",
    price: 10.35,
    category: "Cocktails",
    itemType: "beverage" as const,
    confidence: 95,
    originalText:
      "Rosé Negroni - Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel £10.35",
  };

  console.log("📋 Test Item:");
  console.log(`Name: ${testBeverage.name}`);
  console.log(`Description: ${testBeverage.description}`);
  console.log(`Category: ${testBeverage.category}`);
  console.log("");

  console.log("🎯 Expected Results:");
  console.log("Spirit Type: gin");
  console.log(
    'Cocktail Ingredients: ["Mirabeau French rosé gin", "Lillet rosé vermouth", "Pampelle grapefruit apéritif", "lemon peel"]'
  );
  console.log("Serving Style: garnished");
  console.log("");

  try {
    const enhancer = new BeverageItemEnhancerService();
    console.log("🔄 Running enhancement...\n");

    const result = await enhancer.enhanceBeverageItems([testBeverage]);

    console.log("📊 ACTUAL RESULTS:\n");

    const enhanced = result.items[0];
    console.log(`Name: ${enhanced.name}`);
    console.log(`Spirit Type: ${enhanced.spiritType || "NOT DETECTED"}`);
    console.log(`Beer Style: ${enhanced.beerStyle || "NOT DETECTED"}`);
    console.log(
      `Cocktail Ingredients: ${
        enhanced.cocktailIngredients?.length
          ? enhanced.cocktailIngredients.join(", ")
          : "NOT DETECTED"
      }`
    );
    console.log(
      `Alcohol Content: ${enhanced.alcoholContent || "NOT DETECTED"}`
    );
    console.log(`Serving Style: ${enhanced.servingStyle || "NOT DETECTED"}`);
    console.log(`Non-Alcoholic: ${enhanced.isNonAlcoholic ? "Yes" : "No"}`);
    console.log(`Temperature: ${enhanced.temperature || "NOT DETECTED"}`);
    console.log(`Confidence: ${enhanced.confidence}%`);
    console.log("");

    // Detailed analysis
    console.log("🔍 DETAILED ANALYSIS:\n");

    if (!enhanced.spiritType) {
      console.log(
        '❌ Spirit type not detected from "Mirabeau French rosé gin"'
      );
    } else {
      console.log(`✅ Spirit type detected: ${enhanced.spiritType}`);
    }

    if (
      !enhanced.cocktailIngredients ||
      enhanced.cocktailIngredients.length === 0
    ) {
      console.log(
        "❌ No cocktail ingredients detected from detailed description"
      );
      console.log(
        "   Expected: gin, vermouth, grapefruit apéritif, lemon peel"
      );
    } else {
      console.log(
        `✅ Cocktail ingredients detected: ${enhanced.cocktailIngredients.join(
          ", "
        )}`
      );
      console.log(
        `   Count: ${enhanced.cocktailIngredients.length}/4 expected ingredients`
      );
    }

    if (result.processingNotes && result.processingNotes.length > 0) {
      console.log("\n📝 Processing Notes:");
      result.processingNotes.forEach((note) => console.log(`  • ${note}`));
    }
  } catch (error: any) {
    console.error("❌ Enhancement failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Also test the pattern matching manually
function testManualPatternMatching() {
  console.log("\n🧪 MANUAL PATTERN MATCHING TEST:\n");

  const description =
    "Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel";

  // Test spirit detection patterns
  const spiritPatterns = [
    "gin",
    "vodka",
    "rum",
    "whiskey",
    "tequila",
    "brandy",
  ];
  const foundSpirits = spiritPatterns.filter((spirit) =>
    description.toLowerCase().includes(spirit)
  );
  console.log(`Spirit patterns found: ${foundSpirits.join(", ") || "None"}`);

  // Test ingredient splitting patterns
  const ingredients = description.split(/,|&|\sand\s/).map((ing) => ing.trim());
  console.log(`Ingredient splitting test: ${ingredients.join(" | ")}`);

  // Test specific phrases
  const specificPatterns = ["gin", "vermouth", "apéritif", "garnish", "lemon"];

  console.log("\nSpecific pattern matching:");
  specificPatterns.forEach((pattern) => {
    const found = description.toLowerCase().includes(pattern.toLowerCase());
    console.log(`  ${pattern}: ${found ? "✅" : "❌"}`);
  });
}

// Run both tests
async function runDebugTests() {
  await debugSpecificBeverage();
  testManualPatternMatching();
}

runDebugTests().catch(console.error);
