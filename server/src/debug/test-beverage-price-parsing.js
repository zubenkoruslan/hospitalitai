/**
 * Test file to demonstrate enhanced beverage price parsing
 * This shows how the BeverageItemEnhancerService now extracts prices and serving options
 */

const testBeverageItems = [
  // Beer with multiple serving sizes
  {
    name: "Stella Artois",
    description:
      "Premium Belgian lager: Pint £6.50, Half Pint £3.25, Bottle £4.75",
    category: "Beer",
    itemType: "beverage",
    originalText:
      "Stella Artois - Premium Belgian lager: Pint £6.50, Half Pint £3.25, Bottle £4.75",
    confidence: 85,
  },

  // Single price beer
  {
    name: "Guinness Draft",
    description: "Classic Irish stout served on draft £5.80",
    category: "Beer",
    itemType: "beverage",
    originalText: "Guinness Draft - Classic Irish stout served on draft £5.80",
    confidence: 90,
  },

  // Cocktail with single price
  {
    name: "Mojito",
    description: "White rum, fresh mint, lime juice, sugar, soda water £9.50",
    category: "Cocktails",
    itemType: "beverage",
    originalText:
      "Mojito - White rum, fresh mint, lime juice, sugar, soda water £9.50",
    confidence: 95,
  },

  // Whiskey with multiple serving sizes
  {
    name: "Jameson Irish Whiskey",
    description: "Single £8.50, Double £15.00, Triple £22.00",
    category: "Spirits",
    itemType: "beverage",
    originalText:
      "Jameson Irish Whiskey - Single £8.50, Double £15.00, Triple £22.00",
    confidence: 90,
  },

  // Wine with serving options (should work same as before)
  {
    name: "House Red Wine",
    description:
      "Smooth Merlot blend: Glass £7.50, Carafe £18.00, Bottle £28.00",
    category: "Wine",
    itemType: "beverage",
    originalText:
      "House Red Wine - Smooth Merlot blend: Glass £7.50, Carafe £18.00, Bottle £28.00",
    confidence: 88,
  },

  // Beer with multiple formats
  {
    name: "IPA Selection",
    description:
      "Hoppy India Pale Ale available: Draft Pint £6.75, Bottle 330ml £4.50, Can 440ml £5.25",
    category: "Beer",
    itemType: "beverage",
    originalText:
      "IPA Selection - Hoppy India Pale Ale available: Draft Pint £6.75, Bottle 330ml £4.50, Can 440ml £5.25",
    confidence: 87,
  },
];

// Expected results after enhancement
const expectedEnhancements = {
  "Stella Artois": {
    beerStyle: "lager",
    servingOptions: [
      { size: "Pint", price: 6.5 },
      { size: "Half Pint", price: 3.25 },
      { size: "Bottle", price: 4.75 },
    ],
    servingStyle: "draft",
  },

  "Guinness Draft": {
    beerStyle: "stout",
    price: 5.8,
    servingStyle: "draft",
  },

  Mojito: {
    spiritType: "rum",
    cocktailIngredients: ["rum", "mint", "lime juice", "sugar", "soda water"],
    price: 9.5,
    servingStyle: "shaken",
  },

  "Jameson Irish Whiskey": {
    spiritType: "whiskey",
    servingOptions: [
      { size: "Single", price: 8.5 },
      { size: "Double", price: 15.0 },
      { size: "Triple", price: 22.0 },
    ],
  },

  "House Red Wine": {
    servingOptions: [
      { size: "Glass", price: 7.5 },
      { size: "Carafe", price: 18.0 },
      { size: "Bottle", price: 28.0 },
    ],
  },

  "IPA Selection": {
    beerStyle: "IPA",
    servingOptions: [
      { size: "Pint", price: 6.75 },
      { size: "Bottle", price: 4.5 },
      { size: "Can", price: 5.25 },
    ],
    servingStyle: "draft",
  },
};

console.log("🍻 Beverage Price Parsing Test Data");
console.log("=====================================");
console.log("\n📝 Test Items:");
testBeverageItems.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name}`);
  console.log(`   Description: ${item.description}`);
  console.log(`   Original: ${item.originalText}`);
  console.log("");
});

console.log("\n🎯 Expected Enhancements:");
Object.entries(expectedEnhancements).forEach(([name, enhancement]) => {
  console.log(`${name}:`);
  console.log(`   ${JSON.stringify(enhancement, null, 4)}`);
  console.log("");
});

module.exports = {
  testBeverageItems,
  expectedEnhancements,
};
