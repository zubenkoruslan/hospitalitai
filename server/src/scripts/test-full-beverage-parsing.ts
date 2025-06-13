import { CleanMenuParserService } from "../services/CleanMenuParserService";

async function testFullBeverageMenuParsing() {
  console.log("🍹 Testing full beverage menu parsing pipeline...\n");

  // Simulate a realistic beverage menu text
  const beverageMenuText = `
COCKTAIL MENU

SIGNATURE COCKTAILS

Rosé Negroni £10.35
Mirabeau French rosé gin, Lillet rosé vermouth & Pampelle grapefruit apéritif, garnished with lemon peel

Classic Manhattan £12.50
Woodford Reserve bourbon whiskey, sweet vermouth, Angostura bitters, maraschino cherry

Espresso Martini £11.75
Premium vodka, fresh espresso, coffee liqueur, served with coffee beans

Virgin Mojito £6.50
Fresh lime juice, mint leaves, sugar syrup, soda water, garnished with lime wedge

BEERS & ALES

Punk IPA £5.80
BrewDog hoppy India Pale Ale, citrus notes, 5.6% ABV, served on draft

Guinness Stout £4.95
Classic Irish dry stout, creamy head, 4.2% ABV, pint

London Pride £4.50
Fuller's traditional English bitter, malty flavor, 4.1% ABV, half pint available

SPIRITS

Macallan 18 Year £45.00
Single malt Scotch whisky, served neat or on the rocks

Grey Goose Vodka £8.50
Premium French vodka, served chilled, choice of mixers

Bacardi Superior Rum £7.25
White rum, perfect for cocktails or served with cola
`;

  try {
    const parser = new CleanMenuParserService();
    console.log("🔄 Parsing beverage menu...\n");

    const result = await parser.parseText(
      beverageMenuText,
      "Test Beverage Menu"
    );

    if (!result.success || !result.data) {
      console.error("❌ Parsing failed:", result.errors);
      return;
    }

    const { data } = result;
    console.log("📊 PARSING RESULTS:\n");
    console.log(`Menu Name: ${data.menuName}`);
    console.log(`Total Items: ${data.totalItemsFound}`);
    console.log(`Processing Notes: ${data.processingNotes.length} notes`);
    console.log("");

    // Analyze beverage items specifically
    const beverageItems = data.items.filter(
      (item) => item.itemType === "beverage"
    );
    console.log(`🍹 Found ${beverageItems.length} beverage items:\n`);

    beverageItems.forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.name} (${item.category}) - £${item.price}`
      );
      console.log(`   Description: ${item.description || "None"}`);
      console.log(`   Confidence: ${item.confidence}%`);

      // Check beverage-specific enhancements
      const enhancements = [];
      if (item.spiritType) enhancements.push(`Spirit: ${item.spiritType}`);
      if (item.beerStyle) enhancements.push(`Beer: ${item.beerStyle}`);
      if (item.cocktailIngredients && item.cocktailIngredients.length > 0) {
        enhancements.push(
          `Ingredients: ${item.cocktailIngredients.join(", ")}`
        );
      }
      if (item.alcoholContent)
        enhancements.push(`Alcohol: ${item.alcoholContent}`);
      if (item.servingStyle) enhancements.push(`Serving: ${item.servingStyle}`);
      if (item.isNonAlcoholic) enhancements.push("Non-alcoholic");
      if (item.temperature) enhancements.push(`Temp: ${item.temperature}`);

      if (enhancements.length > 0) {
        console.log(`   ✨ Enhancements: ${enhancements.join(" | ")}`);
      } else {
        console.log(`   ⚠️ No enhancements detected`);
      }
      console.log("");
    });

    // Detailed analysis
    console.log("🔍 DETAILED ANALYSIS:\n");

    const cocktails = beverageItems.filter((item) =>
      item.category.toLowerCase().includes("cocktail")
    );
    const beers = beverageItems.filter((item) => item.beerStyle);
    const spirits = beverageItems.filter(
      (item) => item.spiritType && !item.cocktailIngredients
    );
    const nonAlcoholic = beverageItems.filter((item) => item.isNonAlcoholic);

    console.log(`Cocktails: ${cocktails.length}`);
    cocktails.forEach((cocktail) => {
      const ingredientCount = cocktail.cocktailIngredients?.length || 0;
      console.log(
        `  • ${cocktail.name}: ${ingredientCount} ingredients, spirit: ${
          cocktail.spiritType || "none"
        }`
      );
    });

    console.log(`\nBeers: ${beers.length}`);
    beers.forEach((beer) => {
      console.log(
        `  • ${beer.name}: ${beer.beerStyle}, ${
          beer.alcoholContent || "no ABV"
        }`
      );
    });

    console.log(`\nSpirits: ${spirits.length}`);
    spirits.forEach((spirit) => {
      console.log(
        `  • ${spirit.name}: ${spirit.spiritType}, serving: ${
          spirit.servingStyle || "standard"
        }`
      );
    });

    console.log(`\nNon-alcoholic: ${nonAlcoholic.length}`);
    nonAlcoholic.forEach((drink) => {
      const ingredientCount = drink.cocktailIngredients?.length || 0;
      console.log(`  • ${drink.name}: ${ingredientCount} ingredients`);
    });

    // Success metrics
    console.log("\n📈 SUCCESS METRICS:\n");

    const enhancedItems = beverageItems.filter(
      (item) =>
        item.spiritType ||
        item.beerStyle ||
        (item.cocktailIngredients && item.cocktailIngredients.length > 0)
    );

    const enhancementRate =
      beverageItems.length > 0
        ? (enhancedItems.length / beverageItems.length) * 100
        : 0;

    console.log(
      `Enhancement Rate: ${enhancedItems.length}/${
        beverageItems.length
      } (${enhancementRate.toFixed(1)}%)`
    );
    console.log(
      `Average Confidence: ${(
        beverageItems.reduce((sum, item) => sum + item.confidence, 0) /
        beverageItems.length
      ).toFixed(1)}%`
    );

    // Specific test cases
    console.log("\n🎯 SPECIFIC TEST CASES:\n");

    const roseNegroni = beverageItems.find((item) =>
      item.name.includes("Rosé Negroni")
    );
    if (roseNegroni) {
      console.log("✅ Rosé Negroni found:");
      console.log(`   Spirit: ${roseNegroni.spiritType || "NOT DETECTED"}`);
      console.log(
        `   Ingredients: ${
          roseNegroni.cocktailIngredients?.join(", ") || "NOT DETECTED"
        }`
      );
      console.log(`   Serving: ${roseNegroni.servingStyle || "NOT DETECTED"}`);
    } else {
      console.log("❌ Rosé Negroni not found in results");
    }

    const punkIPA = beverageItems.find((item) =>
      item.name.includes("Punk IPA")
    );
    if (punkIPA) {
      console.log("✅ Punk IPA found:");
      console.log(`   Beer Style: ${punkIPA.beerStyle || "NOT DETECTED"}`);
      console.log(
        `   Alcohol Content: ${punkIPA.alcoholContent || "NOT DETECTED"}`
      );
      console.log(`   Serving: ${punkIPA.servingStyle || "NOT DETECTED"}`);
    } else {
      console.log("❌ Punk IPA not found in results");
    }

    const virginMojito = beverageItems.find((item) =>
      item.name.includes("Virgin Mojito")
    );
    if (virginMojito) {
      console.log("✅ Virgin Mojito found:");
      console.log(
        `   Non-alcoholic: ${
          virginMojito.isNonAlcoholic ? "YES" : "NOT DETECTED"
        }`
      );
      console.log(
        `   Ingredients: ${
          virginMojito.cocktailIngredients?.join(", ") || "NOT DETECTED"
        }`
      );
    } else {
      console.log("❌ Virgin Mojito not found in results");
    }

    console.log("\n📝 Processing Notes:");
    data.processingNotes.forEach((note) => console.log(`  • ${note}`));
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testFullBeverageMenuParsing().catch(console.error);
