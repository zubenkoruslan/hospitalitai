import path from "path";
import { CleanMenuParserService } from "../services/CleanMenuParserService";

async function testSpecificWinePdf() {
  console.log("🧪 Testing Specific Wine PDF");
  console.log("=====================================");

  const parserService = new CleanMenuParserService();

  // Test the specific PDF file mentioned by the user
  const testFilePath = path.join(
    __dirname,
    "../../uploads/menuFile-1749732565587-256049673.pdf"
  );

  console.log(`📄 Testing with file: ${testFilePath}`);

  try {
    const result = await parserService.parseMenu(
      testFilePath,
      "SpecificWineMenu.pdf"
    );

    if (result.success) {
      console.log("✅ Parsing successful!");
      console.log(`📊 Results:`);
      console.log(`   Menu Name: ${result.data!.menuName}`);
      console.log(`   Total Items: ${result.data!.totalItemsFound}`);
      console.log(
        `   Processing Notes: ${result.data!.processingNotes.join(", ")}`
      );

      // Count items by type
      const wineItems = result.data!.items.filter(
        (item) => item.itemType === "wine"
      );
      const foodItems = result.data!.items.filter(
        (item) => item.itemType === "food"
      );
      const beverageItems = result.data!.items.filter(
        (item) => item.itemType === "beverage"
      );

      console.log(`\n📈 Item Breakdown:`);
      console.log(`   Wine Items: ${wineItems.length}`);
      console.log(`   Food Items: ${foodItems.length}`);
      console.log(`   Beverage Items: ${beverageItems.length}`);

      if (wineItems.length > 0) {
        console.log("\n🍷 Wine Items Found:");
        wineItems.forEach((wine, index) => {
          console.log(
            `   ${index + 1}. "${wine.name}" - ${wine.category} - £${
              wine.price
            } (${wine.confidence}% confidence)`
          );
        });
      }

      // Check if we found the expected number (user mentioned 28+)
      if (wineItems.length < 28) {
        console.log(
          `\n⚠️ WARNING: Found only ${wineItems.length} wines, but user expects 28+`
        );
        console.log(
          "   This suggests there may still be parsing limitations or issues."
        );
      } else {
        console.log(
          `\n✅ SUCCESS: Found ${wineItems.length} wines (meets/exceeds expected 28+)`
        );
      }

      // Show some sample wine details
      console.log("\n📝 Sample Wine Details:");
      wineItems.slice(0, 5).forEach((wine, index) => {
        console.log(`\n   Wine ${index + 1}:`);
        console.log(`   Name: "${wine.name}"`);
        console.log(`   Category: "${wine.category}"`);
        console.log(`   Price: £${wine.price}`);
        console.log(`   Producer: ${wine.producer || "N/A"}`);
        console.log(`   Region: ${wine.region || "N/A"}`);
        console.log(`   Vintage: ${wine.vintage || "N/A"}`);
        console.log(
          `   Grape Varieties: ${wine.grapeVariety?.join(", ") || "N/A"}`
        );
        console.log(`   Confidence: ${wine.confidence}%`);
      });
    } else {
      console.log("❌ Parsing failed!");
      console.log(`   Errors: ${result.errors.join(", ")}`);
    }
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n🎯 Test completed");
}

testSpecificWinePdf().catch(console.error);
