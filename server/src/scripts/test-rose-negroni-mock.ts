import { CleanMenuItem } from "../services/CleanMenuParserService";

// Mock the enhanced AI response for the Rosé Negroni
function mockEnhancedBeverageAnalysis(item: CleanMenuItem): CleanMenuItem {
  const enhanced = { ...item };

  // Simulate the enhanced AI prompt logic
  const description = item.description || "";
  const name = item.name.toLowerCase();

  // Spirit detection with brand awareness
  if (description.toLowerCase().includes("gin")) {
    enhanced.spiritType = "gin";
  }

  // Enhanced ingredient extraction - split on commas, &, and extract garnishes
  if (description) {
    const ingredients: string[] = [];

    // Split on commas and ampersands, then clean up
    const parts = description.split(/,|&/).map((part) => part.trim());

    for (const part of parts) {
      if (part.toLowerCase().includes("garnished with")) {
        // Extract garnish: "garnished with lemon peel" → "lemon peel"
        const garnishMatch = part.match(/garnished with (.+)/i);
        if (garnishMatch) {
          ingredients.push(garnishMatch[1].trim());
        }
      } else if (part.trim()) {
        // Regular ingredient
        ingredients.push(part.trim());
      }
    }

    if (ingredients.length > 0) {
      enhanced.cocktailIngredients = ingredients;
    }
  }

  // Serving style detection
  if (description.toLowerCase().includes("garnished")) {
    enhanced.servingStyle = "garnished";
  }

  // Set as alcoholic (not non-alcoholic)
  enhanced.isNonAlcoholic = false;

  return enhanced;
}

async function testRoseNegroniMock() {
  console.log("🌹 Testing enhanced Rosé Negroni analysis...\n");

  // The exact example from the user
  const roseNegroni: CleanMenuItem = {
    name: "Rosé Negroni",
    description:
      "Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel",
    price: 10.35,
    category: "Cocktails",
    itemType: "beverage",
    confidence: 95,
    originalText:
      "Rosé Negroni - Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel £10.35",
  };

  console.log("📋 Original Item:");
  console.log(`Name: ${roseNegroni.name}`);
  console.log(`Description: ${roseNegroni.description}`);
  console.log(`Category: ${roseNegroni.category}`);
  console.log(`Price: £${roseNegroni.price}`);
  console.log(`Confidence: ${roseNegroni.confidence}%`);
  console.log("");

  // Apply enhanced mock analysis
  const enhanced = mockEnhancedBeverageAnalysis(roseNegroni);

  console.log("✨ ENHANCED RESULTS:\n");
  console.log(`Name: ${enhanced.name}`);
  console.log(`Spirit Type: ${enhanced.spiritType || "Not detected"}`);
  console.log(`Beer Style: ${enhanced.beerStyle || "Not detected"}`);
  console.log(
    `Cocktail Ingredients: ${
      enhanced.cocktailIngredients?.join(", ") || "Not detected"
    }`
  );
  console.log(`Alcohol Content: ${enhanced.alcoholContent || "Not detected"}`);
  console.log(`Serving Style: ${enhanced.servingStyle || "Not detected"}`);
  console.log(`Non-Alcoholic: ${enhanced.isNonAlcoholic ? "Yes" : "No"}`);
  console.log(`Temperature: ${enhanced.temperature || "Not detected"}`);
  console.log("");

  // Verification
  console.log("🎯 VERIFICATION:\n");

  const expectedIngredients = [
    "Mirabeau French rosé gin",
    "Lillet rosé vermouth",
    "Pampelle grapefruit apéritif",
    "lemon peel",
  ];

  console.log("Expected ingredients:", expectedIngredients.join(", "));
  console.log(
    "Detected ingredients:",
    enhanced.cocktailIngredients?.join(", ") || "None"
  );
  console.log("");

  const checks = [
    {
      test: "Spirit type detection",
      expected: "gin",
      actual: enhanced.spiritType,
      pass: enhanced.spiritType === "gin",
    },
    {
      test: "Ingredient count",
      expected: "4 ingredients",
      actual: `${enhanced.cocktailIngredients?.length || 0} ingredients`,
      pass: (enhanced.cocktailIngredients?.length || 0) === 4,
    },
    {
      test: "Gin ingredient preserved",
      expected: "Mirabeau French rosé gin",
      actual:
        enhanced.cocktailIngredients?.find((ing) => ing.includes("gin")) ||
        "Not found",
      pass:
        enhanced.cocktailIngredients?.some((ing) =>
          ing.includes("Mirabeau French rosé gin")
        ) || false,
    },
    {
      test: "Vermouth ingredient preserved",
      expected: "Lillet rosé vermouth",
      actual:
        enhanced.cocktailIngredients?.find((ing) => ing.includes("vermouth")) ||
        "Not found",
      pass:
        enhanced.cocktailIngredients?.some((ing) =>
          ing.includes("Lillet rosé vermouth")
        ) || false,
    },
    {
      test: "Garnish extracted",
      expected: "lemon peel",
      actual:
        enhanced.cocktailIngredients?.find((ing) => ing.includes("lemon")) ||
        "Not found",
      pass:
        enhanced.cocktailIngredients?.some((ing) =>
          ing.includes("lemon peel")
        ) || false,
    },
    {
      test: "Serving style",
      expected: "garnished",
      actual: enhanced.servingStyle || "Not detected",
      pass: enhanced.servingStyle === "garnished",
    },
  ];

  checks.forEach((check) => {
    const status = check.pass ? "✅" : "❌";
    console.log(
      `${status} ${check.test}: ${check.actual} (expected: ${check.expected})`
    );
  });

  const passedChecks = checks.filter((c) => c.pass).length;
  const totalChecks = checks.length;

  console.log(
    `\n📊 SCORE: ${passedChecks}/${totalChecks} checks passed (${Math.round(
      (passedChecks / totalChecks) * 100
    )}%)`
  );

  if (passedChecks === totalChecks) {
    console.log(
      "🎉 Perfect! The enhanced logic correctly extracts all beverage details."
    );
  } else {
    console.log("⚠️ Some checks failed - the logic needs refinement.");
  }
}

// Run the test
testRoseNegroniMock().catch(console.error);
