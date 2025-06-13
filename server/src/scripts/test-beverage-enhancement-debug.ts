import { BeverageItemEnhancerService } from "../services/BeverageItemEnhancerService";

async function debugBeverageEnhancement() {
  console.log("🔍 Debugging beverage enhancement issues...\n");

  const enhancer = new BeverageItemEnhancerService();

  // Test sample beverage items that should have clear enhancements
  const testBeverages = [
    {
      name: "Classic Martini",
      description: "Premium vodka or gin, dry vermouth, olive or twist",
      price: 12.5,
      category: "cocktails",
      itemType: "beverage" as const,
      confidence: 85,
      originalText:
        "Classic Martini - Premium vodka or gin, dry vermouth, olive or twist £12.50",
    },
    {
      name: "Punk IPA",
      description: "BrewDog hoppy India Pale Ale, 5.6% ABV, bottle",
      price: 4.5,
      category: "beers",
      itemType: "beverage" as const,
      confidence: 90,
      originalText:
        "Punk IPA - BrewDog hoppy India Pale Ale, 5.6% ABV, bottle £4.50",
    },
    {
      name: "Virgin Mojito",
      description: "Lime, mint, sugar, soda water",
      price: 6.5,
      category: "mocktails",
      itemType: "beverage" as const,
      confidence: 88,
      originalText: "Virgin Mojito - Lime, mint, sugar, soda water £6.50",
    },
    {
      name: "Manhattan",
      description: "Rye whiskey, sweet vermouth, bitters, cherry garnish",
      price: 13.0,
      category: "cocktails",
      itemType: "beverage" as const,
      confidence: 92,
      originalText:
        "Manhattan - Rye whiskey, sweet vermouth, bitters, cherry garnish £13.00",
    },
    {
      name: "Guinness",
      description: "Irish dry stout, 4.2% ABV, pint",
      price: 5.8,
      category: "beers",
      itemType: "beverage" as const,
      confidence: 95,
      originalText: "Guinness - Irish dry stout, 4.2% ABV, pint £5.80",
    },
  ];

  try {
    console.log("🧪 Testing individual beverage enhancement...\n");

    const result = await enhancer.enhanceBeverageItems(testBeverages);

    console.log("📊 ENHANCEMENT RESULTS:\n");

    result.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   Original: ${item.originalText}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Spirit Type: ${item.spiritType || "Not detected"}`);
      console.log(`   Beer Style: ${item.beerStyle || "Not detected"}`);
      console.log(
        `   Cocktail Ingredients: ${
          item.cocktailIngredients?.join(", ") || "None detected"
        }`
      );
      console.log(
        `   Alcohol Content: ${item.alcoholContent || "Not detected"}`
      );
      console.log(`   Serving Style: ${item.servingStyle || "Not detected"}`);
      console.log(`   Non-Alcoholic: ${item.isNonAlcoholic ? "Yes" : "No"}`);
      console.log(`   Temperature: ${item.temperature || "Not detected"}`);
      console.log(`   Confidence: ${item.confidence}%`);
      console.log("");
    });

    // Test expectations
    console.log("🎯 TESTING EXPECTATIONS:\n");

    const martini = result.items.find(
      (item) => item.name === "Classic Martini"
    );
    console.log(
      `Martini spirit detection: ${
        martini?.spiritType ? "✅" : "❌"
      } (Expected: vodka or gin)`
    );
    console.log(
      `Martini ingredients: ${
        martini?.cocktailIngredients?.length ? "✅" : "❌"
      } (Expected: vodka/gin, vermouth, olive)`
    );

    const ipa = result.items.find((item) => item.name === "Punk IPA");
    console.log(
      `IPA beer style: ${ipa?.beerStyle ? "✅" : "❌"} (Expected: IPA)`
    );
    console.log(
      `IPA alcohol content: ${
        ipa?.alcoholContent ? "✅" : "❌"
      } (Expected: 5.6% ABV)`
    );

    const virgin = result.items.find((item) => item.name === "Virgin Mojito");
    console.log(
      `Virgin Mojito non-alcoholic: ${
        virgin?.isNonAlcoholic ? "✅" : "❌"
      } (Expected: true)`
    );
    console.log(
      `Virgin Mojito ingredients: ${
        virgin?.cocktailIngredients?.length ? "✅" : "❌"
      } (Expected: lime, mint, sugar, soda)`
    );

    const manhattan = result.items.find((item) => item.name === "Manhattan");
    console.log(
      `Manhattan spirit: ${
        manhattan?.spiritType ? "✅" : "❌"
      } (Expected: whiskey)`
    );
    console.log(
      `Manhattan ingredients: ${
        manhattan?.cocktailIngredients?.length ? "✅" : "❌"
      } (Expected: whiskey, vermouth, bitters)`
    );

    const guinness = result.items.find((item) => item.name === "Guinness");
    console.log(
      `Guinness beer style: ${
        guinness?.beerStyle ? "✅" : "❌"
      } (Expected: stout)`
    );
    console.log(
      `Guinness alcohol content: ${
        guinness?.alcoholContent ? "✅" : "❌"
      } (Expected: 4.2% ABV)`
    );

    console.log("\n📝 Processing Notes:");
    result.processingNotes.forEach((note) => console.log(`  • ${note}`));
  } catch (error: any) {
    console.error("❌ Debug test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the debug test
debugBeverageEnhancement().catch(console.error);
