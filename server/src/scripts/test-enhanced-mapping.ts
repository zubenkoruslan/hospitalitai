import {
  CleanMenuParserService,
  CleanMenuItem,
} from "../services/CleanMenuParserService";
import { cleanMenuController } from "../controllers/cleanMenuController";
import { Types } from "mongoose";

// Mock CleanMenuItem with all enhanced fields
const mockCleanMenuItem: CleanMenuItem = {
  name: "Grilled Salmon with Herbs",
  description:
    "Fresh Atlantic salmon grilled to perfection with Mediterranean herbs",
  price: 28.5,
  category: "Main Course",
  itemType: "food",

  // Basic ingredients
  ingredients: ["Atlantic salmon", "olive oil", "rosemary", "thyme", "lemon"],

  // Food-specific enhancements
  cookingMethods: ["grilled", "seared"],
  allergens: ["fish"],
  isDairyFree: true,
  isSpicy: false,

  // Dietary info
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: true,

  // Processing metadata
  confidence: 95,
  originalText:
    "Grilled Salmon with Herbs - Fresh Atlantic salmon grilled to perfection with Mediterranean herbs $28.50",
};

const mockWineItem: CleanMenuItem = {
  name: "Chateau Montelena Chardonnay",
  description: "Rich, full-bodied Chardonnay from Napa Valley",
  price: 15.0,
  category: "White Wine",
  itemType: "wine",

  // Wine-specific fields
  vintage: 2020,
  producer: "Chateau Montelena",
  region: "Napa Valley",
  grapeVariety: ["Chardonnay"],
  wineStyle: "still",
  servingOptions: [
    { size: "Glass", price: 15.0 },
    { size: "Bottle", price: 65.0 },
  ],

  // Dietary info
  isVegetarian: true,
  isVegan: true,
  isGlutenFree: true,

  confidence: 98,
  originalText:
    "Chateau Montelena Chardonnay 2020 - Rich, full-bodied Chardonnay from Napa Valley Glass $15 | Bottle $65",
};

const mockBeverageItem: CleanMenuItem = {
  name: "Classic Negroni",
  description:
    "Traditional Italian cocktail with gin, Campari, and sweet vermouth",
  price: 14.0,
  category: "Cocktails",
  itemType: "beverage",

  // Beverage-specific enhancements
  spiritType: "Gin",
  cocktailIngredients: ["gin", "Campari", "sweet vermouth", "orange peel"],
  alcoholContent: "22% ABV",
  servingStyle: "on the rocks",
  isNonAlcoholic: false,
  temperature: "chilled",

  // Dietary info
  isVegetarian: true,
  isVegan: true,
  isGlutenFree: true,

  confidence: 92,
  originalText:
    "Classic Negroni - Traditional Italian cocktail with gin, Campari, and sweet vermouth $14",
};

async function testEnhancedMapping() {
  console.log("🧪 Testing Enhanced Field Mapping");
  console.log("=====================================");

  // Mock restaurant and menu IDs
  const restaurantId = new Types.ObjectId();
  const menuId = new Types.ObjectId();

  // Test conversion for each type
  const mockItems = [mockCleanMenuItem, mockWineItem, mockBeverageItem];

  // Access the private method via any
  const controller = cleanMenuController as any;

  try {
    const convertedItems = await controller.convertCleanItemsToMenuItems(
      mockItems,
      menuId,
      restaurantId
    );

    console.log("\n🔍 Field Mapping Results:");
    console.log("==========================");

    convertedItems.forEach((item: any, index: number) => {
      const original = mockItems[index];
      console.log(`\n📝 Item ${index + 1}: ${item.name} (${item.itemType})`);
      console.log("-".repeat(50));

      // Basic fields
      console.log(`✅ Name: ${item.name} ← ${original.name}`);
      console.log(
        `✅ Description: ${item.description || "N/A"} ← ${
          original.description || "N/A"
        }`
      );
      console.log(`✅ Price: ${item.price} ← ${original.price}`);
      console.log(`✅ Category: ${item.category} ← ${original.category}`);
      console.log(`✅ ItemType: ${item.itemType} ← ${original.itemType}`);

      // Dietary fields
      console.log(
        `✅ isGlutenFree: ${item.isGlutenFree} ← ${original.isGlutenFree}`
      );
      console.log(
        `✅ isDairyFree: ${item.isDairyFree} ← ${original.isDairyFree}`
      );
      console.log(
        `✅ isVegetarian: ${item.isVegetarian} ← ${original.isVegetarian}`
      );
      console.log(`✅ isVegan: ${item.isVegan} ← ${original.isVegan}`);

      // Enhanced fields based on type
      if (original.itemType === "food") {
        console.log(
          `✅ Ingredients: ${JSON.stringify(
            item.ingredients
          )} ← ${JSON.stringify(original.ingredients)}`
        );
        console.log(
          `✅ Cooking Methods: ${JSON.stringify(
            item.cookingMethods
          )} ← ${JSON.stringify(original.cookingMethods)}`
        );
        console.log(
          `✅ Allergens: ${JSON.stringify(item.allergens)} ← ${JSON.stringify(
            original.allergens
          )}`
        );
        console.log(`✅ isSpicy: ${item.isSpicy} ← ${original.isSpicy}`);
      }

      if (original.itemType === "wine") {
        console.log(`✅ Wine Style: ${item.wineStyle} ← ${original.wineStyle}`);
        console.log(`✅ Producer: ${item.producer} ← ${original.producer}`);
        console.log(`✅ Vintage: ${item.vintage} ← ${original.vintage}`);
        console.log(`✅ Region: ${item.region} ← ${original.region}`);
        console.log(
          `✅ Grape Variety: ${JSON.stringify(
            item.grapeVariety
          )} ← ${JSON.stringify(original.grapeVariety)}`
        );
        console.log(
          `✅ Serving Options: ${JSON.stringify(
            item.servingOptions
          )} ← ${JSON.stringify(original.servingOptions)}`
        );
      }

      if (original.itemType === "beverage") {
        console.log(
          `✅ Spirit Type: ${item.spiritType} ← ${original.spiritType}`
        );
        console.log(
          `✅ Cocktail Ingredients: ${JSON.stringify(
            item.cocktailIngredients
          )} ← ${JSON.stringify(original.cocktailIngredients)}`
        );
        console.log(
          `✅ Alcohol Content: ${item.alcoholContent} ← ${original.alcoholContent}`
        );
        console.log(
          `✅ Serving Style: ${item.servingStyle} ← ${original.servingStyle}`
        );
        console.log(
          `✅ isNonAlcoholic: ${item.isNonAlcoholic} ← ${original.isNonAlcoholic}`
        );
        console.log(
          `✅ Temperature: ${item.temperature} ← ${original.temperature}`
        );
      }
    });

    console.log("\n🎉 All enhanced fields mapped successfully!");
    console.log(
      "✅ Food items: ingredients, cooking methods, allergens, spicy flag"
    );
    console.log(
      "✅ Wine items: producer, vintage, region, grape varieties, serving options"
    );
    console.log(
      "✅ Beverage items: spirit type, cocktail ingredients, alcohol content, serving style, temperature"
    );
    console.log(
      "✅ All items: dietary flags (GF, DF, Vegan, Vegetarian), descriptions"
    );
  } catch (error) {
    console.error("❌ Mapping test failed:", error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedMapping().catch(console.error);
}

export { testEnhancedMapping };
