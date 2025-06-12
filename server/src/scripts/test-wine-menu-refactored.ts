import path from "path";
import fs from "fs";
import { Types } from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import "../utils/connectDB";
import MenuServiceRefactored from "../services/MenuServiceRefactored";

/**
 * Test script for wine menu upload functionality
 * Tests the refactored menu services with the actual wine menu PDF
 */
async function testWineMenuUpload() {
  console.log("🍷 Testing Wine Menu Upload with Refactored Services");
  console.log("====================================================\n");

  const restaurantId = new Types.ObjectId("507f1f77bcf86cd799439011"); // Test restaurant ID
  const wineMenuPath = path.join(
    __dirname,
    "../../uploads/sop_documents/Wine-menu.pdf"
  );

  try {
    // Step 1: Check if wine menu file exists
    console.log("1. Checking for wine menu file...");
    if (!fs.existsSync(wineMenuPath)) {
      throw new Error(`Wine menu file not found at: ${wineMenuPath}`);
    }
    console.log(`✅ Wine menu file found: ${path.basename(wineMenuPath)}`);
    console.log(
      `   File size: ${(fs.statSync(wineMenuPath).size / 1024).toFixed(1)} KB\n`
    );

    // Step 2: Test health check
    console.log("2. Testing service health...");
    try {
      const healthCheck = await MenuServiceRefactored.healthCheck();
      console.log("✅ Health Check:", healthCheck);
    } catch (healthError) {
      console.log("⚠️  Health check failed:", healthError);
    }
    console.log();

    // Step 3: Test preview generation
    console.log("3. Testing menu upload preview...");
    const startTime = Date.now();

    try {
      const preview = await MenuServiceRefactored.getMenuUploadPreview(
        wineMenuPath,
        restaurantId,
        "Wine-menu.pdf"
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ Preview generated in ${processingTime}ms`);
      console.log(`   Preview ID: ${preview.previewId}`);
      console.log(`   Source Format: ${preview.sourceFormat}`);
      console.log(`   Parsed Menu Name: ${preview.parsedMenuName}`);
      console.log(`   Total Items: ${preview.parsedItems.length}`);
      console.log(`   Summary: ${JSON.stringify(preview.summary, null, 2)}`);

      // Analyze wine-specific items
      const wineItems = preview.parsedItems.filter(
        (item) => item.fields.itemType.value === "wine"
      );
      console.log(`   Wine Items Found: ${wineItems.length}`);

      if (wineItems.length > 0) {
        console.log("\n📋 Sample wine items:");
        wineItems.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.fields.name.value}`);
          console.log(`      Price: $${item.fields.price.value || "N/A"}`);
          console.log(`      Style: ${item.fields.wineStyle?.value || "N/A"}`);
          console.log(
            `      Producer: ${item.fields.wineProducer?.value || "N/A"}`
          );
          console.log(
            `      Vintage: ${item.fields.wineVintage?.value || "N/A"}`
          );
          console.log(
            `      Region: ${item.fields.wineRegion?.value || "N/A"}`
          );
        });
      }

      // Check for errors
      if (preview.globalErrors && preview.globalErrors.length > 0) {
        console.log("\n⚠️  Global Errors:");
        preview.globalErrors.forEach((error) => console.log(`   - ${error}`));
      }

      console.log("\n✅ Wine menu upload preview test completed successfully!");
      return preview;
    } catch (previewError: any) {
      console.error("❌ Preview generation failed:", previewError.message);
      if (previewError.details) {
        console.error("   Error details:", previewError.details);
      }
      throw previewError;
    }
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

/**
 * Test menu statistics
 */
async function testMenuStats() {
  console.log("\n📊 Testing Menu Statistics...");
  const restaurantId = new Types.ObjectId("507f1f77bcf86cd799439011");

  try {
    const stats = await MenuServiceRefactored.getMenuStats(restaurantId);
    console.log("✅ Menu Statistics:");
    console.log(`   ${JSON.stringify(stats, null, 2)}`);
  } catch (error: any) {
    console.log("⚠️  Menu stats test failed:", error.message);
  }
}

// Run the tests
async function runTests() {
  try {
    await testWineMenuUpload();
    await testMenuStats();
    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("\n💥 Test suite failed:", error);
  } finally {
    process.exit(0);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests();
}
