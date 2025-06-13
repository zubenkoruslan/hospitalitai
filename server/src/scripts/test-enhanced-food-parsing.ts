import { FoodItemEnhancerService } from "../services/FoodItemEnhancerService";

// Test cases with various food types
const testFoodItems = [
  {
    name: "Pan-Seared Sea Bass",
    description: "With lemon risotto, asparagus, and white wine sauce",
    category: "Mains",
  },
  {
    name: "Wild Mushroom Soup",
    description: "Roasted porcini and shiitake mushrooms in cream broth (V)",
    category: "Soups & Salads",
  },
  {
    name: "Quinoa Power Bowl",
    description:
      "Roasted vegetables, chickpeas, avocado, tahini dressing, mixed greens (VG, GF)",
    category: "Soups & Salads",
  },
  {
    name: "Beef Wellington",
    description:
      "Tender fillet wrapped in puff pastry, mushroom duxelles, red wine jus",
    category: "Mains",
  },
  {
    name: "Thai Green Curry",
    description:
      "Coconut curry with seasonal vegetables, jasmine rice, fresh herbs (VG)",
    category: "Mains",
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with molten center, vanilla ice cream",
    category: "Desserts",
  },
  {
    name: "Caesar Salad",
    description:
      "Crisp romaine, parmesan, croutons, anchovies, classic dressing",
    category: "Soups & Salads",
  },
  {
    name: "Truffle Risotto",
    description: "Arborio rice with black truffle, parmesan, white wine (V)",
    category: "Mains",
  },
];

async function testFoodEnhancement() {
  console.log("🍽️ Testing Enhanced Food Parsing");
  console.log("=================================");

  try {
    const foodEnhancer = new FoodItemEnhancerService();

    console.log(`📋 Testing ${testFoodItems.length} food items...`);
    console.log(`📊 Items breakdown:`);

    // Analyze test data
    const categoryCount: Record<string, number> = {};
    testFoodItems.forEach((item) => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });

    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} items`);
    });

    console.log(`\n🤖 Running AI enhancement...`);

    // Test batch enhancement
    const results = await foodEnhancer.enhanceBatch(testFoodItems);

    console.log(`\n📊 Enhancement Results:`);
    console.log(`=======================`);

    let successCount = 0;
    let totalIngredients = 0;
    let totalCookingMethods = 0;
    let dietaryTagsCount = {
      vegetarian: 0,
      vegan: 0,
      glutenFree: 0,
      dairyFree: 0,
      spicy: 0,
    };

    results.forEach((result, index) => {
      const item = testFoodItems[index];
      console.log(`\n${index + 1}. ${item.name} (${item.category})`);
      console.log(`   Description: ${item.description}`);

      if (result) {
        successCount++;
        console.log(`   ✅ Enhanced (${result.confidence}% confidence)`);
        console.log(`   🥘 Ingredients: ${result.ingredients.join(", ")}`);
        console.log(
          `   👨‍🍳 Cooking Methods: ${result.cookingMethods.join(", ")}`
        );
        console.log(
          `   🚨 Allergens: ${result.allergens.join(", ") || "None identified"}`
        );
        console.log(`   🌍 Cuisine: ${result.cuisineType || "Not specified"}`);

        const dietaryInfo = [];
        if (result.dietaryTags.isVegetarian) {
          dietaryInfo.push("Vegetarian");
          dietaryTagsCount.vegetarian++;
        }
        if (result.dietaryTags.isVegan) {
          dietaryInfo.push("Vegan");
          dietaryTagsCount.vegan++;
        }
        if (result.dietaryTags.isGlutenFree) {
          dietaryInfo.push("Gluten-Free");
          dietaryTagsCount.glutenFree++;
        }
        if (result.dietaryTags.isDairyFree) {
          dietaryInfo.push("Dairy-Free");
          dietaryTagsCount.dairyFree++;
        }
        if (result.dietaryTags.isSpicy) {
          dietaryInfo.push("Spicy");
          dietaryTagsCount.spicy++;
        }

        console.log(
          `   🥗 Dietary: ${
            dietaryInfo.join(", ") || "No special dietary tags"
          }`
        );

        totalIngredients += result.ingredients.length;
        totalCookingMethods += result.cookingMethods.length;
      } else {
        console.log(`   ❌ Enhancement failed`);
      }
    });

    console.log(`\n📈 Summary Statistics:`);
    console.log(`====================`);
    console.log(
      `✅ Success Rate: ${successCount}/${testFoodItems.length} (${Math.round(
        (successCount / testFoodItems.length) * 100
      )}%)`
    );
    console.log(
      `🥘 Average Ingredients per Item: ${(
        totalIngredients / successCount
      ).toFixed(1)}`
    );
    console.log(
      `👨‍🍳 Average Cooking Methods per Item: ${(
        totalCookingMethods / successCount
      ).toFixed(1)}`
    );

    console.log(`\n🥗 Dietary Classification:`);
    console.log(`   - Vegetarian: ${dietaryTagsCount.vegetarian} items`);
    console.log(`   - Vegan: ${dietaryTagsCount.vegan} items`);
    console.log(`   - Gluten-Free: ${dietaryTagsCount.glutenFree} items`);
    console.log(`   - Dairy-Free: ${dietaryTagsCount.dairyFree} items`);
    console.log(`   - Spicy: ${dietaryTagsCount.spicy} items`);

    // Test accuracy by checking known dietary markers
    const expectedDietary = testFoodItems.filter(
      (item) =>
        item.description.includes("(V)") ||
        item.description.includes("(VG)") ||
        item.description.includes("(GF)")
    ).length;

    const detectedDietary =
      dietaryTagsCount.vegetarian +
      dietaryTagsCount.vegan +
      dietaryTagsCount.glutenFree;

    console.log(`\n🎯 Dietary Detection Accuracy:`);
    console.log(`   Expected dietary items: ${expectedDietary}`);
    console.log(`   Detected dietary items: ${detectedDietary}`);
    console.log(
      `   Accuracy: ${
        detectedDietary >= expectedDietary ? "✅ Good" : "⚠️ Needs improvement"
      }`
    );

    console.log(`\n✅ Food enhancement test completed successfully!`);
  } catch (error) {
    console.error("❌ Food enhancement test failed:", error);
  }
}

// Run the test
testFoodEnhancement().catch(console.error);
