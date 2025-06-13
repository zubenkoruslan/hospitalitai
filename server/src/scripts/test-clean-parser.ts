import dotenv from "dotenv";
import path from "path";

// Configure environment
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { CleanMenuParserService } from "../services/CleanMenuParserService";

async function testCleanParser() {
  console.log("🧪 Testing Clean Menu Parser Service");
  console.log("=====================================");

  const parserService = new CleanMenuParserService();

  // Use a valid PDF from the uploads directory
  const testFilePath = path.join(
    __dirname,
    "../../uploads/menuFile-1749731480754-376860119.pdf"
  );

  console.log(`📄 Testing with file: ${testFilePath}`);

  try {
    const result = await parserService.parseMenu(testFilePath, "Test-menu.pdf");

    if (result.success) {
      console.log("✅ Parsing successful!");
      console.log(`📊 Results:`);
      console.log(`   Menu Name: ${result.data!.menuName}`);
      console.log(`   Total Items: ${result.data!.totalItemsFound}`);
      console.log(
        `   Processing Notes: ${result.data!.processingNotes.join(", ")}`
      );

      console.log("\n📝 First few items:");
      result.data!.items.slice(0, 5).forEach((item, index) => {
        console.log(`\n   Item ${index + 1}:`);
        console.log(`   Name: "${item.name}"`);
        console.log(`   Category: "${item.category}"`);
        console.log(`   Item Type: "${item.itemType}"`);
        console.log(`   Price: ${item.price}`);
        console.log(`   Confidence: ${item.confidence}`);
        console.log(
          `   Valid: ${!!(item.name && item.category && item.itemType)}`
        );
      });

      // Check for empty or invalid items
      const invalidItems = result.data!.items.filter(
        (item) => !item.name || !item.category || !item.itemType
      );
      if (invalidItems.length > 0) {
        console.log(`\n⚠️ Found ${invalidItems.length} invalid items:`);
        invalidItems.forEach((item, index) => {
          console.log(
            `   Invalid Item ${index + 1}:`,
            JSON.stringify(item, null, 2)
          );
        });
      }
    } else {
      console.log("❌ Parsing failed:");
      result.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
    }
  } catch (error) {
    console.error("💥 Test failed with error:", error);
  }

  console.log("\n🎯 Test completed");
}

// Run test
testCleanParser()
  .then(() => {
    console.log("\n🎯 Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
    process.exit(1);
  });
