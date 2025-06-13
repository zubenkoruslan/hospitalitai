import { CleanMenuParserService } from "../services/CleanMenuParserService";
import fs from "fs";
import path from "path";

// Sample food menu text for testing
const sampleFoodMenuText = `
APPETIZERS

Crispy Calamari - £8.50
Fresh squid rings served with marinara sauce and lemon wedge

Bruschetta Trio - £7.25  
Three slices of toasted sourdough topped with: tomato & basil, mushroom & truffle, goat cheese & honey

Burrata Caprese - £9.75
Creamy burrata cheese with heirloom tomatoes, fresh basil, and aged balsamic reduction

SOUPS & SALADS

Wild Mushroom Soup - £6.50 (V)
Roasted porcini and shiitake mushrooms in cream broth

Caesar Salad - £8.25
Crisp romaine, parmesan, croutons, anchovies, classic dressing
Add grilled chicken +£4.50

Quinoa Power Bowl - £11.95 (VG, GF)
Roasted vegetables, chickpeas, avocado, tahini dressing, mixed greens

MAINS

Pan-Seared Sea Bass - £24.95
With lemon risotto, asparagus, and white wine sauce

Beef Wellington - £32.50  
Tender fillet wrapped in puff pastry, mushroom duxelles, red wine jus

Lamb Rack - £28.75
Herb-crusted rack of lamb, rosemary jus, roasted root vegetables

Mushroom Gnocchi - £18.50 (V)
House-made potato gnocchi with wild mushrooms, truffle cream sauce, parmesan

Thai Green Curry - £16.95 (VG)
Coconut curry with seasonal vegetables, jasmine rice, fresh herbs

DESSERTS

Chocolate Lava Cake - £7.95
Warm chocolate cake with molten center, vanilla ice cream

Tiramisu - £6.75
Classic Italian dessert with ladyfingers, mascarpone, coffee

Lemon Tart - £6.50 (V)
Sharp lemon curd in buttery pastry shell, berry compote

SIDES

Truffle Fries - £5.95
Parmesan Roasted Broccoli - £4.50 (V, GF)
Garlic Mashed Potatoes - £4.25 (V)
`;

interface FoodItem {
  name: string;
  price: number;
  description: string;
  category: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  hasAddOns: boolean;
  ingredients: string[];
}

function analyzeFoodMenuText() {
  console.log("🍽️ Analyzing Food Menu Text Structure");
  console.log("=====================================");

  const lines = sampleFoodMenuText.split("\n").filter((line) => line.trim());
  console.log(`📄 Total lines: ${lines.length}`);
  console.log(`📄 Text length: ${sampleFoodMenuText.length} characters`);

  // Identify categories
  const categories = [
    "APPETIZERS",
    "SOUPS & SALADS",
    "MAINS",
    "DESSERTS",
    "SIDES",
  ];
  const foundCategories: string[] = [];

  categories.forEach((category) => {
    if (lines.some((line) => line.includes(category))) {
      foundCategories.push(category);
    }
  });

  console.log(`📋 Found categories: ${foundCategories.join(", ")}`);

  // Analyze items by category
  const itemsByCategory: Record<string, FoodItem[]> = {};
  let totalItems = 0;

  foundCategories.forEach((category) => {
    const categoryIndex = lines.findIndex((line) => line.includes(category));
    if (categoryIndex !== -1) {
      const nextCategoryIndex = lines
        .slice(categoryIndex + 1)
        .findIndex((line) =>
          foundCategories.some((cat) => line.includes(cat) && cat !== category)
        );

      const categoryLines =
        nextCategoryIndex === -1
          ? lines.slice(categoryIndex + 1)
          : lines.slice(
              categoryIndex + 1,
              categoryIndex + 1 + nextCategoryIndex
            );

      const items: FoodItem[] = [];

      for (let i = 0; i < categoryLines.length; i++) {
        const line = categoryLines[i];

        // Check if this line contains a price (likely an item)
        if (line.includes("£")) {
          const priceMatch = line.match(/£(\d+\.?\d*)/);
          const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

          // Extract name (everything before the price)
          const nameMatch = line.match(/^(.+?)\s*-\s*£/);
          const name = nameMatch
            ? nameMatch[1].trim()
            : line.split("-")[0].trim();

          // Get description (next line if it doesn't contain £ or category)
          let description = "";
          if (i + 1 < categoryLines.length) {
            const nextLine = categoryLines[i + 1];
            if (
              !nextLine.includes("£") &&
              !foundCategories.some((cat) => nextLine.includes(cat))
            ) {
              description = nextLine.trim();
            }
          }

          // Check dietary markers
          const isVegetarian = line.includes("(V)") && !line.includes("(VG)");
          const isVegan = line.includes("(VG)");
          const isGlutenFree = line.includes("(GF)");
          const hasAddOns =
            line.includes("+£") ||
            (i + 1 < categoryLines.length &&
              categoryLines[i + 1].includes("Add "));

          // Basic ingredient extraction from description
          const ingredients = description
            .toLowerCase()
            .split(/[,\s]+/)
            .filter(
              (word) =>
                word.length > 3 &&
                !["with", "and", "the", "in", "on", "of"].includes(word)
            );

          items.push({
            name,
            price,
            description,
            category,
            isVegetarian,
            isVegan,
            isGlutenFree,
            hasAddOns,
            ingredients: ingredients.slice(0, 5), // Limit to 5 key ingredients
          });
        }
      }

      itemsByCategory[category] = items;
      totalItems += items.length;
      console.log(`   ${category}: ${items.length} items`);
    }
  });

  console.log(`\n📊 Total items identified: ${totalItems}`);

  // Analyze dietary information
  const dietaryStats = {
    vegetarian: 0,
    vegan: 0,
    glutenFree: 0,
    withAddOns: 0,
  };

  Object.values(itemsByCategory)
    .flat()
    .forEach((item) => {
      if (item.isVegetarian) dietaryStats.vegetarian++;
      if (item.isVegan) dietaryStats.vegan++;
      if (item.isGlutenFree) dietaryStats.glutenFree++;
      if (item.hasAddOns) dietaryStats.withAddOns++;
    });

  console.log(`\n🥗 Dietary Information:`);
  console.log(`   - Vegetarian: ${dietaryStats.vegetarian} items`);
  console.log(`   - Vegan: ${dietaryStats.vegan} items`);
  console.log(`   - Gluten-free: ${dietaryStats.glutenFree} items`);
  console.log(`   - With add-ons: ${dietaryStats.withAddOns} items`);

  // Price analysis
  const allPrices = Object.values(itemsByCategory)
    .flat()
    .map((item) => item.price);
  const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  console.log(`\n💰 Price Analysis:`);
  console.log(`   - Average price: £${avgPrice.toFixed(2)}`);
  console.log(
    `   - Price range: £${minPrice.toFixed(2)} - £${maxPrice.toFixed(2)}`
  );

  // Category-specific analysis
  console.log(`\n📋 Category Breakdown:`);
  foundCategories.forEach((category) => {
    const items = itemsByCategory[category];
    if (items.length > 0) {
      const categoryAvgPrice =
        items.reduce((sum, item) => sum + item.price, 0) / items.length;
      const categoryDietary = items.filter(
        (item) => item.isVegetarian || item.isVegan
      ).length;

      console.log(`   ${category}:`);
      console.log(`     - ${items.length} items`);
      console.log(`     - Average price: £${categoryAvgPrice.toFixed(2)}`);
      console.log(`     - Dietary options: ${categoryDietary}`);

      // Show a sample item
      const sampleItem = items[0];
      console.log(
        `     - Sample: "${
          sampleItem.name
        }" - ${sampleItem.description.substring(0, 50)}...`
      );
    }
  });

  return {
    totalItems,
    categories: foundCategories,
    itemsByCategory,
    dietaryStats,
    priceStats: { avgPrice, minPrice, maxPrice },
  };
}

// Run the analysis
const analysis = analyzeFoodMenuText();

console.log(`\n🔍 Food Parsing Challenges Identified:`);
console.log(`=====================================`);

// Identify potential parsing challenges
const challenges = [];

if (analysis.dietaryStats.vegetarian + analysis.dietaryStats.vegan > 0) {
  challenges.push("Dietary marker extraction (V), (VG), (GF)");
}

if (analysis.dietaryStats.withAddOns > 0) {
  challenges.push("Add-on price parsing (+£4.50)");
}

const hasComplexDescriptions = Object.values(analysis.itemsByCategory)
  .flat()
  .some(
    (item) => item.description.includes(",") && item.description.length > 50
  );

if (hasComplexDescriptions) {
  challenges.push("Complex ingredient lists in descriptions");
}

const hasVariedPricing =
  analysis.priceStats.maxPrice / analysis.priceStats.minPrice > 5;
if (hasVariedPricing) {
  challenges.push("Wide price range requiring accurate extraction");
}

challenges.forEach((challenge, index) => {
  console.log(`${index + 1}. ${challenge}`);
});

console.log(`\n💡 Recommendations for Food Parsing Enhancement:`);
console.log(`===============================================`);
console.log(`1. Enhance dietary marker detection for (V), (VG), (GF) tags`);
console.log(`2. Improve ingredient extraction from descriptions`);
console.log(`3. Better handling of add-on pricing (+£X.XX)`);
console.log(
  `4. Category-specific validation (mains should be more expensive than sides)`
);
console.log(
  `5. Enhanced description parsing for cooking methods and key ingredients`
);
console.log(`6. Better handling of multi-line item descriptions`);

console.log(`\n✅ Food menu analysis complete!`);
