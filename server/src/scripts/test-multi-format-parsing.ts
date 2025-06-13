#!/usr/bin/env ts-node

import { CleanMenuParserService } from "../services/CleanMenuParserService";
import fs from "fs";
import path from "path";

const testMultiFormatParsing = async () => {
  console.log("🧪 Testing Multi-Format Menu Parsing");
  console.log("=====================================\n");

  const parserService = new CleanMenuParserService();

  // Create test files for different formats
  const testDir = path.join(process.cwd(), "test-files");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Test 1: JSON format
  console.log("📝 Testing JSON format...");
  const jsonTestFile = path.join(testDir, "test-menu.json");
  const jsonMenu = {
    name: "Sample Restaurant Menu",
    items: [
      {
        name: "Grilled Salmon",
        description: "Fresh Atlantic salmon with lemon butter",
        price: 24.99,
        category: "Main Course",
        type: "food",
      },
      {
        name: "Chardonnay 2020",
        description: "Crisp white wine from Burgundy",
        price: 12.99,
        category: "White Wine",
        type: "wine",
        vintage: 2020,
        region: "Burgundy",
      },
    ],
  };

  fs.writeFileSync(jsonTestFile, JSON.stringify(jsonMenu, null, 2));

  try {
    const jsonResult = await parserService.parseText(
      JSON.stringify(jsonMenu, null, 2),
      "test-menu.json"
    );
    console.log(
      `✅ JSON parsing: ${jsonResult.success ? "SUCCESS" : "FAILED"}`
    );
    if (jsonResult.success) {
      console.log(`   Found ${jsonResult.data!.items.length} items`);
    } else {
      console.log(`   Errors: ${jsonResult.errors.join(", ")}`);
    }
  } catch (error: any) {
    console.log(`❌ JSON parsing failed: ${error.message}`);
  }

  // Test 2: CSV format
  console.log("\n📊 Testing CSV format...");
  const csvTestFile = path.join(testDir, "test-menu.csv");
  const csvContent = `Name,Description,Price,Category
"Caesar Salad","Fresh romaine lettuce with parmesan",12.99,"Appetizers"
"Ribeye Steak","Aged beef with herb butter",32.99,"Main Course"
"Tiramisu","Classic Italian dessert",8.99,"Desserts"`;

  fs.writeFileSync(csvTestFile, csvContent);

  try {
    const csvResult = await parserService.parseText(
      csvContent,
      "test-menu.csv"
    );
    console.log(`✅ CSV parsing: ${csvResult.success ? "SUCCESS" : "FAILED"}`);
    if (csvResult.success) {
      console.log(`   Found ${csvResult.data!.items.length} items`);
    } else {
      console.log(`   Errors: ${csvResult.errors.join(", ")}`);
    }
  } catch (error: any) {
    console.log(`❌ CSV parsing failed: ${error.message}`);
  }

  // Test 3: Plain text format
  console.log("\n📄 Testing TXT format...");
  const txtContent = `RESTAURANT MENU

STARTERS
- Bruschetta - Fresh tomatoes on toasted bread - £8.50
- Soup of the Day - Ask your server - £6.99

MAIN COURSES  
- Fish and Chips - Beer battered cod with chips - £16.99
- Chicken Curry - Mild curry with basmati rice - £14.50

DESSERTS
- Chocolate Cake - Rich chocolate sponge - £7.99
- Ice Cream Selection - 3 scoops of your choice - £5.99`;

  try {
    const txtResult = await parserService.parseText(
      txtContent,
      "test-menu.txt"
    );
    console.log(`✅ TXT parsing: ${txtResult.success ? "SUCCESS" : "FAILED"}`);
    if (txtResult.success) {
      console.log(`   Found ${txtResult.data!.items.length} items`);
      console.log(`   Menu name: "${txtResult.data!.menuName}"`);
    } else {
      console.log(`   Errors: ${txtResult.errors.join(", ")}`);
    }
  } catch (error: any) {
    console.log(`❌ TXT parsing failed: ${error.message}`);
  }

  // Clean up test files
  try {
    fs.unlinkSync(jsonTestFile);
    fs.unlinkSync(csvTestFile);
    fs.rmdirSync(testDir);
  } catch (error) {
    console.log("Note: Could not clean up test files");
  }

  console.log("\n🎉 Multi-format parsing test completed!");
};

// Run the test
testMultiFormatParsing().catch(console.error);
