/**
 * 🔧 TEST SCRIPT: Question Bank Menu Connection Change
 *
 * This script demonstrates the new functionality that allows users to change
 * the menu that a question bank is connected to.
 *
 * Features tested:
 * - Update question bank with new menu connection
 * - Validate menu exists and belongs to restaurant
 * - Update denormalized menu name
 * - Remove menu connection (set to null)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { updateQuestionBankService } from "../services/questionBankService";
import QuestionBankModel from "../models/QuestionBankModel";
import MenuModel from "../models/MenuModel";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testMenuConnectionChange() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("✅ Connected to MongoDB");

    // Test data - you may need to adjust these IDs based on your actual data
    const testData = {
      restaurantId: "676462be90f60aaf6b52dda1", // Replace with actual restaurant ID
      questionBankId: "676462bf90f60aaf6b52dda5", // Replace with actual question bank ID
      newMenuId: "676462bf90f60aaf6b52ddaa", // Replace with actual menu ID
    };

    console.log("🔄 Testing Question Bank Menu Connection Change...");
    console.log("Test Data:", testData);

    // 1. Find existing question bank
    const existingBank = await QuestionBankModel.findOne({
      _id: testData.questionBankId,
      restaurantId: testData.restaurantId,
    });

    if (!existingBank) {
      console.log(
        "❌ Test question bank not found. Please update testData with valid IDs."
      );
      return;
    }

    console.log("📦 Current Question Bank:");
    console.log(`  Name: ${existingBank.name}`);
    console.log(`  Source Type: ${existingBank.sourceType}`);
    console.log(`  Current Menu ID: ${existingBank.sourceMenuId || "None"}`);
    console.log(
      `  Current Menu Name: ${existingBank.sourceMenuName || "None"}`
    );

    // 2. Find target menu
    const targetMenu = await MenuModel.findOne({
      _id: testData.newMenuId,
      restaurantId: testData.restaurantId,
    });

    if (!targetMenu) {
      console.log(
        "❌ Target menu not found. Please update testData with valid menu ID."
      );
      return;
    }

    console.log("🍽️ Target Menu:");
    console.log(`  Name: ${targetMenu.name}`);
    console.log(`  ID: ${targetMenu._id}`);

    // 3. Test updating menu connection
    console.log("\n🔄 Testing menu connection update...");

    const updateResult = await updateQuestionBankService(
      testData.questionBankId,
      new mongoose.Types.ObjectId(testData.restaurantId),
      {
        sourceMenuId: new mongoose.Types.ObjectId(testData.newMenuId),
      }
    );

    if (updateResult) {
      console.log("✅ Menu connection updated successfully!");
      console.log(`  New Menu ID: ${updateResult.sourceMenuId}`);
      console.log(`  New Menu Name: ${updateResult.sourceMenuName}`);
      console.log(`  Bank Name: ${updateResult.name}`);
    } else {
      console.log("❌ Failed to update menu connection");
    }

    // 4. Test removing menu connection
    console.log("\n🔄 Testing menu connection removal...");

    const removeResult = await updateQuestionBankService(
      testData.questionBankId,
      new mongoose.Types.ObjectId(testData.restaurantId),
      {
        sourceMenuId: null,
      }
    );

    if (removeResult) {
      console.log("✅ Menu connection removed successfully!");
      console.log(`  Menu ID: ${removeResult.sourceMenuId || "None"}`);
      console.log(`  Menu Name: ${removeResult.sourceMenuName || "None"}`);
    } else {
      console.log("❌ Failed to remove menu connection");
    }

    // 5. Restore original connection (if it existed)
    if (existingBank.sourceMenuId) {
      console.log("\n🔄 Restoring original menu connection...");

      const restoreResult = await updateQuestionBankService(
        testData.questionBankId,
        new mongoose.Types.ObjectId(testData.restaurantId),
        {
          sourceMenuId: existingBank.sourceMenuId,
        }
      );

      if (restoreResult) {
        console.log("✅ Original menu connection restored!");
        console.log(`  Restored Menu ID: ${restoreResult.sourceMenuId}`);
        console.log(`  Restored Menu Name: ${restoreResult.sourceMenuName}`);
      }
    }

    console.log("\n🎉 Menu connection change functionality test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Example of what the frontend would send
function demonstrateApiUsage() {
  console.log("\n📋 Frontend API Usage Example:");
  console.log("```typescript");
  console.log("// Change menu connection");
  console.log("const updateData = {");
  console.log("  sourceMenuId: 'new-menu-id-here'");
  console.log("};");
  console.log("");
  console.log(
    "const updatedBank = await updateQuestionBank(bankId, updateData);"
  );
  console.log("");
  console.log("// Remove menu connection");
  console.log("const removeData = {");
  console.log("  sourceMenuId: null");
  console.log("};");
  console.log("");
  console.log(
    "const updatedBank = await updateQuestionBank(bankId, removeData);"
  );
  console.log("```");
}

if (require.main === module) {
  console.log("🧪 QUESTION BANK MENU CONNECTION CHANGE TEST");
  console.log("============================================");
  console.log("");
  console.log("This test demonstrates the new functionality that allows");
  console.log("users to change which menu a question bank is connected to.");
  console.log("");

  demonstrateApiUsage();

  console.log("");
  console.log(
    "⚠️  Note: Please update the testData object with valid IDs from your database."
  );
  console.log("");

  // Uncomment to run the actual test
  // testMenuConnectionChange();

  console.log(
    "✅ To run the test, update the IDs and uncomment the test call."
  );
}
