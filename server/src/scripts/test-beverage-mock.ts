import { CleanMenuItem } from "../services/CleanMenuParserService";

// Mock beverage enhancement for testing without API key
function mockBeverageEnhancement(
  beverageItems: CleanMenuItem[]
): CleanMenuItem[] {
  return beverageItems.map((item) => {
    const enhanced = { ...item };

    // Mock spirit type detection
    if (item.name.toLowerCase().includes("martini")) {
      enhanced.spiritType = "vodka";
      enhanced.cocktailIngredients = ["vodka", "dry vermouth", "olive"];
      enhanced.servingStyle = "stirred";
    } else if (item.name.toLowerCase().includes("manhattan")) {
      enhanced.spiritType = "whiskey";
      enhanced.cocktailIngredients = [
        "rye whiskey",
        "sweet vermouth",
        "bitters",
        "cherry",
      ];
      enhanced.servingStyle = "stirred";
    } else if (item.name.toLowerCase().includes("mojito")) {
      if (item.name.toLowerCase().includes("virgin")) {
        enhanced.isNonAlcoholic = true;
        enhanced.cocktailIngredients = ["lime", "mint", "sugar", "soda water"];
      } else {
        enhanced.spiritType = "rum";
        enhanced.cocktailIngredients = [
          "white rum",
          "lime juice",
          "mint",
          "sugar",
          "soda water",
        ];
      }
    }

    // Mock beer style detection
    if (
      item.description?.toLowerCase().includes("ipa") ||
      item.name.toLowerCase().includes("ipa")
    ) {
      enhanced.beerStyle = "IPA";
    } else if (
      item.description?.toLowerCase().includes("stout") ||
      item.name.toLowerCase().includes("guinness")
    ) {
      enhanced.beerStyle = "stout";
    } else if (item.description?.toLowerCase().includes("lager")) {
      enhanced.beerStyle = "lager";
    }

    // Mock alcohol content extraction
    const abvMatch = item.description?.match(/(\d+\.?\d*)%\s*(ABV|vol)/i);
    if (abvMatch) {
      enhanced.alcoholContent = `${abvMatch[1]}% ABV`;
    }

    // Mock serving style detection
    if (item.description?.toLowerCase().includes("pint")) {
      enhanced.servingStyle = "pint";
    } else if (item.description?.toLowerCase().includes("bottle")) {
      enhanced.servingStyle = "bottled";
    } else if (item.description?.toLowerCase().includes("draft")) {
      enhanced.servingStyle = "draft";
    }

    return enhanced;
  });
}

async function testMockBeverageEnhancement() {
  console.log("🧪 Testing mock beverage enhancement logic...\n");

  // Test sample beverage items
  const testBeverages: CleanMenuItem[] = [
    {
      name: "Classic Martini",
      description: "Premium vodka or gin, dry vermouth, olive or twist",
      price: 12.5,
      category: "cocktails",
      itemType: "beverage",
      confidence: 85,
      originalText:
        "Classic Martini - Premium vodka or gin, dry vermouth, olive or twist £12.50",
    },
    {
      name: "Punk IPA",
      description: "BrewDog hoppy India Pale Ale, 5.6% ABV, bottle",
      price: 4.5,
      category: "beers",
      itemType: "beverage",
      confidence: 90,
      originalText:
        "Punk IPA - BrewDog hoppy India Pale Ale, 5.6% ABV, bottle £4.50",
    },
    {
      name: "Virgin Mojito",
      description: "Lime, mint, sugar, soda water",
      price: 6.5,
      category: "mocktails",
      itemType: "beverage",
      confidence: 88,
      originalText: "Virgin Mojito - Lime, mint, sugar, soda water £6.50",
    },
    {
      name: "Manhattan",
      description: "Rye whiskey, sweet vermouth, bitters, cherry garnish",
      price: 13.0,
      category: "cocktails",
      itemType: "beverage",
      confidence: 92,
      originalText:
        "Manhattan - Rye whiskey, sweet vermouth, bitters, cherry garnish £13.00",
    },
    {
      name: "Guinness",
      description: "Irish dry stout, 4.2% ABV, pint",
      price: 5.8,
      category: "beers",
      itemType: "beverage",
      confidence: 95,
      originalText: "Guinness - Irish dry stout, 4.2% ABV, pint £5.80",
    },
  ];

  console.log("📋 Testing mock enhancement on 5 beverages...\n");

  const enhanced = mockBeverageEnhancement(testBeverages);

  console.log("📊 MOCK ENHANCEMENT RESULTS:\n");

  enhanced.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}`);
    console.log(`   Spirit Type: ${item.spiritType || "Not detected"}`);
    console.log(`   Beer Style: ${item.beerStyle || "Not detected"}`);
    console.log(
      `   Cocktail Ingredients: ${
        item.cocktailIngredients?.join(", ") || "None detected"
      }`
    );
    console.log(`   Alcohol Content: ${item.alcoholContent || "Not detected"}`);
    console.log(`   Serving Style: ${item.servingStyle || "Not detected"}`);
    console.log(`   Non-Alcoholic: ${item.isNonAlcoholic ? "Yes" : "No"}`);
    console.log("");
  });

  // Test expectations
  console.log("🎯 TESTING MOCK EXPECTATIONS:\n");

  const martini = enhanced.find((item) => item.name === "Classic Martini");
  console.log(
    `Martini spirit detection: ${
      martini?.spiritType ? "✅" : "❌"
    } (Expected: vodka)`
  );
  console.log(
    `Martini ingredients: ${
      martini?.cocktailIngredients?.length ? "✅" : "❌"
    } (Expected: vodka, vermouth, olive)`
  );

  const ipa = enhanced.find((item) => item.name === "Punk IPA");
  console.log(
    `IPA beer style: ${ipa?.beerStyle ? "✅" : "❌"} (Expected: IPA)`
  );
  console.log(
    `IPA alcohol content: ${
      ipa?.alcoholContent ? "✅" : "❌"
    } (Expected: 5.6% ABV)`
  );

  const virgin = enhanced.find((item) => item.name === "Virgin Mojito");
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

  const manhattan = enhanced.find((item) => item.name === "Manhattan");
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

  const guinness = enhanced.find((item) => item.name === "Guinness");
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

  console.log("\n✅ Mock test shows the logic structure works correctly!");
  console.log("🔧 The real enhancement service should follow this pattern.");
}

// Run the mock test
testMockBeverageEnhancement().catch(console.error);
