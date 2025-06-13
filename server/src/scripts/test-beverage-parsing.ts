import { CleanMenuParserService } from "../services/CleanMenuParserService";
import { BeverageItemEnhancerService } from "../services/BeverageItemEnhancerService";

async function testBeverageParsingAndEnhancement() {
  console.log("🍹 Testing comprehensive beverage parsing and enhancement...\n");

  // Sample menu text with extensive beverage selection
  const beverageMenuText = `
COCKTAILS

Classic Martini - Premium vodka or gin, dry vermouth, olive or twist £12.50
Manhattan - Rye whiskey, sweet vermouth, bitters, cherry garnish £13.00
Old Fashioned - Bourbon whiskey, sugar, bitters, orange peel £12.00
Negroni - Gin, Campari, sweet vermouth, orange peel £11.50
Mojito - White rum, lime juice, mint, sugar, soda water £10.50
Margarita - Tequila, triple sec, lime juice, salt rim £11.00
Daiquiri - White rum, lime juice, simple syrup £10.00
Cosmopolitan - Vodka, cranberry juice, lime juice, triple sec £11.50
Bloody Mary - Vodka, tomato juice, spices, celery stick £9.50
Mai Tai - Dark rum, orange liqueur, almond syrup, lime £13.50
Whiskey Sour - Bourbon, lemon juice, simple syrup, egg white £12.00
Espresso Martini - Vodka, coffee liqueur, fresh espresso £12.50

CRAFT BEERS

London Pride - Fuller's traditional bitter, 4.1% ABV, pint £5.50, half pint £3.00
Punk IPA - BrewDog hoppy India Pale Ale, 5.6% ABV, bottle £4.50
Guinness - Irish dry stout, 4.2% ABV, pint £5.80
Peroni Nastro Azzurro - Italian premium lager, 5.1% ABV, bottle £4.20
Brooklyn Lager - American amber lager, 5.2% ABV, bottle £4.80
Heineken - Dutch premium lager, 5.0% ABV, draft pint £5.20
Stella Artois - Belgian premium lager, 5.0% ABV, pint £5.40
Camden Hells - London craft lager, 4.6% ABV, bottle £4.60
Wheat Beer - Hoegaarden Belgian white beer, 4.9% ABV, bottle £4.70
Porter - Samuel Smith's Imperial Stout, 7.0% ABV, bottle £6.20

PREMIUM SPIRITS

Whiskey Selection:
- Macallan 12 Year - Single malt Scotch whisky, 25ml £8.50
- Jameson Irish Whiskey - Triple distilled, 25ml £4.50
- Jack Daniel's - Tennessee whiskey, 25ml £4.80
- Glenlivet 18 Year - Speyside single malt, 25ml £12.00

Gin Collection:
- Hendrick's - Scottish gin with cucumber, 25ml £5.50
- Bombay Sapphire - London dry gin, 25ml £4.20
- Tanqueray - Premium London dry gin, 25ml £4.50
- Monkey 47 - German schwarzwald gin, 25ml £7.80

Vodka Range:
- Grey Goose - French premium vodka, 25ml £6.50
- Belvedere - Polish rye vodka, 25ml £6.20
- Absolut - Swedish vodka, 25ml £4.00
- Ketel One - Dutch vodka, 25ml £5.20

Rum Selection:
- Havana Club 7 Year - Cuban aged rum, 25ml £5.80
- Captain Morgan Spiced - Caribbean spiced rum, 25ml £4.20
- Mount Gay Eclipse - Barbados rum, 25ml £4.50
- Diplomatico Reserva - Venezuelan aged rum, 25ml £6.80

NON-ALCOHOLIC BEVERAGES

Mocktails:
- Virgin Mojito - Lime, mint, sugar, soda water £6.50
- Virgin Mary - Tomato juice, spices, celery stick £5.50
- Cucumber Cooler - Cucumber, lime, mint, tonic water £6.00
- Berry Spritz - Mixed berries, lime, elderflower, sparkling water £6.50

Hot Beverages:
- Americano - Double shot espresso with hot water £3.20
- Cappuccino - Espresso with steamed milk foam £3.80
- Latte - Espresso with steamed milk £4.20
- Flat White - Double espresso with microfoam milk £3.90
- Hot Chocolate - Belgian chocolate with whipped cream £4.50
- English Breakfast Tea - Traditional black tea £2.80
- Earl Grey - Bergamot flavored black tea £3.00
- Green Tea - Japanese sencha £3.20
- Chamomile Tea - Caffeine-free herbal tea £3.00

Soft Drinks:
- Coca-Cola - Classic cola, 330ml bottle £3.20
- Pepsi - Cola drink, 330ml bottle £3.00
- Sprite - Lemon-lime soda, 330ml bottle £3.00
- Orange Juice - Freshly squeezed, 250ml glass £4.50
- Apple Juice - Pure pressed apple, 250ml glass £4.20
- Sparkling Water - San Pellegrino, 500ml bottle £3.50
- Still Water - Evian, 500ml bottle £3.20
- Ginger Beer - Fever-Tree premium, 200ml bottle £3.80
  `.trim();

  try {
    const parser = new CleanMenuParserService();

    console.log("📋 Testing beverage menu parsing...");
    console.log(`📝 Menu text length: ${beverageMenuText.length} characters\n`);

    // Parse the beverage menu
    const result = await parser.parseText(
      beverageMenuText,
      "Comprehensive Beverage Menu Test"
    );

    if (!result.success) {
      console.error("❌ Parsing failed:", result.errors);
      return;
    }

    const data = result.data!;
    console.log(`✅ Successfully parsed ${data.items.length} items\n`);

    // Analyze results by item type
    const cocktails = data.items.filter(
      (item) =>
        item.itemType === "beverage" &&
        item.category.toLowerCase().includes("cocktail")
    );
    const beers = data.items.filter(
      (item) =>
        item.itemType === "beverage" &&
        (item.category.toLowerCase().includes("beer") ||
          item.category.toLowerCase().includes("ale"))
    );
    const spirits = data.items.filter(
      (item) =>
        item.itemType === "beverage" &&
        (item.category.toLowerCase().includes("spirit") ||
          item.category.toLowerCase().includes("whiskey") ||
          item.category.toLowerCase().includes("gin") ||
          item.category.toLowerCase().includes("vodka") ||
          item.category.toLowerCase().includes("rum"))
    );
    const nonAlcoholic = data.items.filter(
      (item) =>
        item.itemType === "beverage" &&
        (item.category.toLowerCase().includes("mocktail") ||
          item.category.toLowerCase().includes("hot") ||
          item.category.toLowerCase().includes("soft") ||
          item.category.toLowerCase().includes("tea") ||
          item.category.toLowerCase().includes("coffee"))
    );

    console.log("📊 BEVERAGE PARSING RESULTS:");
    console.log(`🍸 Cocktails: ${cocktails.length}`);
    console.log(`🍺 Beers: ${beers.length}`);
    console.log(`🥃 Spirits: ${spirits.length}`);
    console.log(`🥤 Non-alcoholic: ${nonAlcoholic.length}`);
    console.log(`📋 Total beverages: ${data.items.length}\n`);

    // Display enhancement details
    console.log("🔍 BEVERAGE ENHANCEMENT ANALYSIS:\n");

    let enhancedCount = 0;

    // Check cocktails
    console.log("🍸 COCKTAILS:");
    cocktails.slice(0, 5).forEach((item) => {
      const enhancements = [];
      if (item.spiritType) enhancements.push(`Spirit: ${item.spiritType}`);
      if (item.cocktailIngredients && item.cocktailIngredients.length > 0) {
        enhancements.push(
          `Ingredients: ${item.cocktailIngredients.join(", ")}`
        );
      }
      if (item.servingStyle) enhancements.push(`Serving: ${item.servingStyle}`);
      if (item.alcoholContent) enhancements.push(`ABV: ${item.alcoholContent}`);

      if (enhancements.length > 0) enhancedCount++;

      console.log(
        `  • ${item.name} - ${
          enhancements.length > 0 ? enhancements.join(" | ") : "Basic info only"
        } (${item.confidence}% confidence)`
      );
    });

    // Check beers
    console.log("\n🍺 BEERS:");
    beers.slice(0, 5).forEach((item) => {
      const enhancements = [];
      if (item.beerStyle) enhancements.push(`Style: ${item.beerStyle}`);
      if (item.alcoholContent) enhancements.push(`ABV: ${item.alcoholContent}`);
      if (item.servingStyle) enhancements.push(`Serving: ${item.servingStyle}`);

      if (enhancements.length > 0) enhancedCount++;

      console.log(
        `  • ${item.name} - ${
          enhancements.length > 0 ? enhancements.join(" | ") : "Basic info only"
        } (${item.confidence}% confidence)`
      );
    });

    // Check spirits
    console.log("\n🥃 SPIRITS:");
    spirits.slice(0, 5).forEach((item) => {
      const enhancements = [];
      if (item.spiritType) enhancements.push(`Type: ${item.spiritType}`);
      if (item.alcoholContent) enhancements.push(`ABV: ${item.alcoholContent}`);
      if (item.servingStyle) enhancements.push(`Serving: ${item.servingStyle}`);

      if (enhancements.length > 0) enhancedCount++;

      console.log(
        `  • ${item.name} - ${
          enhancements.length > 0 ? enhancements.join(" | ") : "Basic info only"
        } (${item.confidence}% confidence)`
      );
    });

    // Check non-alcoholic
    console.log("\n🥤 NON-ALCOHOLIC:");
    nonAlcoholic.slice(0, 5).forEach((item) => {
      const enhancements = [];
      if (item.isNonAlcoholic) enhancements.push("Non-alcoholic");
      if (item.temperature)
        enhancements.push(`Temperature: ${item.temperature}`);
      if (item.cocktailIngredients && item.cocktailIngredients.length > 0) {
        enhancements.push(
          `Ingredients: ${item.cocktailIngredients.slice(0, 3).join(", ")}`
        );
      }

      if (enhancements.length > 0) enhancedCount++;

      console.log(
        `  • ${item.name} - ${
          enhancements.length > 0 ? enhancements.join(" | ") : "Basic info only"
        } (${item.confidence}% confidence)`
      );
    });

    // Summary statistics
    console.log("\n📈 ENHANCEMENT STATISTICS:");
    console.log(
      `✨ Enhanced items: ${enhancedCount}/${data.items.length} (${Math.round(
        (enhancedCount / data.items.length) * 100
      )}%)`
    );

    const avgConfidence = Math.round(
      data.items.reduce((sum, item) => sum + item.confidence, 0) /
        data.items.length
    );
    console.log(`🎯 Average confidence: ${avgConfidence}%`);

    // Processing notes
    if (data.processingNotes && data.processingNotes.length > 0) {
      console.log("\n📝 Processing Notes:");
      data.processingNotes.forEach((note) => console.log(`  • ${note}`));
    }

    // Test specific beverage enhancement functionality
    console.log("\n🧪 Testing standalone beverage enhancer...");
    const beverageEnhancer = new BeverageItemEnhancerService();
    const sampleBeverages = data.items
      .filter((item) => item.itemType === "beverage")
      .slice(0, 3);

    if (sampleBeverages.length > 0) {
      const enhancementResult = await beverageEnhancer.enhanceBeverageItems(
        sampleBeverages
      );
      console.log(
        `🔬 Standalone enhancement test: ${enhancementResult.items.length} items processed`
      );

      enhancementResult.items.forEach((item) => {
        const details = [];
        if (item.spiritType) details.push(`Spirit: ${item.spiritType}`);
        if (item.beerStyle) details.push(`Beer: ${item.beerStyle}`);
        if (item.cocktailIngredients && item.cocktailIngredients.length > 0) {
          details.push(`${item.cocktailIngredients.length} ingredients`);
        }
        console.log(
          `  • ${item.name}: ${details.join(", ") || "No enhancements"}`
        );
      });
    }

    console.log(
      "\n✅ Beverage parsing and enhancement test completed successfully!"
    );
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testBeverageParsingAndEnhancement().catch(console.error);
