import * as dotenv from "dotenv";
import { CleanMenuParserService } from "../services/CleanMenuParserService";
import {
  sampleExtensiveFoodMenuText,
  totalExpectedItems,
} from "./test-comprehensive-food-parsing";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

async function testActualFoodParsing() {
  console.log("🍽️ Testing Actual Comprehensive Food Parsing");
  console.log("============================================");

  try {
    console.log(`📊 Expected items: ${totalExpectedItems}`);

    // Initialize parser
    const parser = new CleanMenuParserService();

    // Parse the menu directly as text
    console.log("\n🔄 Starting parsing...");
    const startTime = Date.now();

    const result = await parser.parseText(
      sampleExtensiveFoodMenuText,
      "Comprehensive Food Menu Test"
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`⏱️ Parsing completed in ${duration}s`);

    if (result.success && result.data) {
      const { data } = result;

      // Analyze results
      const totalItems = data.items.length;
      const foodItems = data.items.filter((item) => item.itemType === "food");
      const beverageItems = data.items.filter(
        (item) => item.itemType === "beverage"
      );
      const wineItems = data.items.filter((item) => item.itemType === "wine");

      console.log("\n📊 PARSING RESULTS:");
      console.log("==================");
      console.log(`✅ Total items parsed: ${totalItems}`);
      console.log(`🍽️ Food items: ${foodItems.length}`);
      console.log(`🥤 Beverage items: ${beverageItems.length}`);
      console.log(`🍷 Wine items: ${wineItems.length}`);

      // Check coverage
      const coverage = Math.round((totalItems / totalExpectedItems) * 100);
      console.log(
        `📈 Coverage: ${coverage}% (${totalItems}/${totalExpectedItems})`
      );

      // Analyze food categories
      console.log("\n🏷️ FOOD CATEGORIES:");
      const categoryBreakdown: Record<string, number> = {};
      foodItems.forEach((item) => {
        const category = item.category || "Unknown";
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      });

      Object.entries(categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   - ${category}: ${count} items`);
        });

      // Analyze dietary information
      console.log("\n🥗 DIETARY ANALYSIS:");
      const vegetarianCount = foodItems.filter(
        (item) => item.isVegetarian
      ).length;
      const veganCount = foodItems.filter((item) => item.isVegan).length;
      const glutenFreeCount = foodItems.filter(
        (item) => item.isGlutenFree
      ).length;
      const dairyFreeCount = foodItems.filter(
        (item) => item.isDairyFree
      ).length;
      const spicyCount = foodItems.filter((item) => item.isSpicy).length;

      console.log(`   - Vegetarian: ${vegetarianCount} items`);
      console.log(`   - Vegan: ${veganCount} items`);
      console.log(`   - Gluten-free: ${glutenFreeCount} items`);
      console.log(`   - Dairy-free: ${dairyFreeCount} items`);
      console.log(`   - Spicy: ${spicyCount} items`);

      // Analyze ingredient extraction
      console.log("\n🧄 INGREDIENT ANALYSIS:");
      const itemsWithIngredients = foodItems.filter(
        (item) => item.ingredients && item.ingredients.length > 0
      );
      console.log(
        `   - Items with ingredients: ${itemsWithIngredients.length}/${foodItems.length}`
      );

      if (itemsWithIngredients.length > 0) {
        const avgIngredients =
          itemsWithIngredients.reduce(
            (sum, item) => sum + (item.ingredients?.length || 0),
            0
          ) / itemsWithIngredients.length;
        console.log(
          `   - Average ingredients per item: ${avgIngredients.toFixed(1)}`
        );
      }

      // Analyze cooking methods
      console.log("\n👨‍🍳 COOKING METHOD ANALYSIS:");
      const itemsWithCookingMethods = foodItems.filter(
        (item) => item.cookingMethods && item.cookingMethods.length > 0
      );
      console.log(
        `   - Items with cooking methods: ${itemsWithCookingMethods.length}/${foodItems.length}`
      );

      // Sample items
      console.log(`\n🔍 SAMPLE PARSED ITEMS:`);
      console.log("======================");

      const sampleItems = foodItems.slice(0, 5);
      sampleItems.forEach((item, idx) => {
        console.log(`\n${idx + 1}. ${item.name} (${item.category})`);
        console.log(`   Price: £${item.price}`);
        if (item.description)
          console.log(
            `   Description: ${item.description.substring(0, 60)}...`
          );
        if (item.ingredients?.length)
          console.log(`   Ingredients: ${item.ingredients.join(", ")}`);
        if (item.cookingMethods?.length)
          console.log(`   Cooking methods: ${item.cookingMethods.join(", ")}`);

        const dietary = [];
        if (item.isVegetarian) dietary.push("Vegetarian");
        if (item.isVegan) dietary.push("Vegan");
        if (item.isGlutenFree) dietary.push("Gluten-free");
        if (item.isDairyFree) dietary.push("Dairy-free");
        if (item.isSpicy) dietary.push("Spicy");
        if (dietary.length) console.log(`   Dietary: ${dietary.join(", ")}`);

        console.log(`   Confidence: ${item.confidence}%`);
      });

      // Performance evaluation
      console.log(`\n⚡ PERFORMANCE EVALUATION:`);
      console.log("==========================");

      if (coverage >= 95) {
        console.log(
          `✅ EXCELLENT: ${coverage}% coverage - All or nearly all items extracted`
        );
      } else if (coverage >= 85) {
        console.log(
          `✅ GOOD: ${coverage}% coverage - Most items extracted successfully`
        );
      } else if (coverage >= 70) {
        console.log(
          `⚠️ ACCEPTABLE: ${coverage}% coverage - Room for improvement`
        );
      } else {
        console.log(
          `❌ POOR: ${coverage}% coverage - Significant items missing`
        );
      }

      console.log(
        `⏱️ Processing speed: ${(totalItems / duration).toFixed(
          1
        )} items/second`
      );

      // Processing notes
      if (data.processingNotes?.length) {
        console.log(`\n📝 PROCESSING NOTES:`);
        data.processingNotes.forEach((note) => {
          console.log(`   - ${note}`);
        });
      }
    } else {
      console.error("❌ Parsing failed:");
      result.errors.forEach((error) => {
        console.error(`   - ${error}`);
      });
    }
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testActualFoodParsing().catch(console.error);
