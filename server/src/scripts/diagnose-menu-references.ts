/**
 * 🔍 DIAGNOSTIC SCRIPT: Menu References in Question Banks
 *
 * This script checks for broken menu references in question banks and provides
 * suggestions for fixing orphaned connections.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import QuestionBankModel from "../models/QuestionBankModel";
import MenuModel from "../models/MenuModel";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function diagnoseMenuReferences() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("✅ Connected to MongoDB");

    console.log("🔍 MENU REFERENCE DIAGNOSTIC");
    console.log("============================");

    // 1. Find all question banks with menu connections
    const questionBanksWithMenus = await QuestionBankModel.find({
      sourceType: "MENU",
      sourceMenuId: { $ne: null },
    }).select("_id name sourceMenuId sourceMenuName restaurantId");

    console.log(
      `\n📦 Found ${questionBanksWithMenus.length} question banks connected to menus`
    );

    if (questionBanksWithMenus.length === 0) {
      console.log("No question banks with menu connections found.");
      return;
    }

    // 2. Check each menu reference
    const brokenReferences = [];
    const validReferences = [];

    for (const bank of questionBanksWithMenus) {
      const menu = await MenuModel.findOne({
        _id: bank.sourceMenuId,
        restaurantId: bank.restaurantId,
      });

      if (!menu) {
        brokenReferences.push({
          bankId: bank._id.toString(),
          bankName: bank.name,
          menuId: bank.sourceMenuId?.toString() || "null",
          menuName: bank.sourceMenuName || "Unknown",
          restaurantId: bank.restaurantId.toString(),
        });
      } else {
        validReferences.push({
          bankId: bank._id.toString(),
          bankName: bank.name,
          menuId: menu._id.toString(),
          menuName: menu.name,
          restaurantId: bank.restaurantId.toString(),
        });
      }
    }

    // 3. Report results
    console.log(`\n✅ Valid References: ${validReferences.length}`);
    validReferences.forEach((ref) => {
      console.log(`  📦 ${ref.bankName} → 🍽️ ${ref.menuName} (${ref.menuId})`);
    });

    console.log(`\n❌ Broken References: ${brokenReferences.length}`);
    brokenReferences.forEach((ref) => {
      console.log(
        `  📦 ${ref.bankName} → ❌ ${ref.menuName} (${ref.menuId}) [MISSING]`
      );
    });

    // 4. Provide fix suggestions
    if (brokenReferences.length > 0) {
      console.log("\n🔧 SUGGESTED FIXES:");
      console.log("1. Update question banks to connect to existing menus:");
      console.log("   PATCH /api/question-banks/{bankId}");
      console.log("   { sourceMenuId: 'new-valid-menu-id' }");
      console.log("");
      console.log("2. Remove menu connections:");
      console.log("   PATCH /api/question-banks/{bankId}");
      console.log("   { sourceMenuId: null }");
      console.log("");
      console.log("3. Auto-fix broken references (run with --fix flag):");
      brokenReferences.forEach((ref) => {
        console.log(`   Bank: ${ref.bankName} (${ref.bankId})`);
      });
    }

    // 5. Check for menus without any question bank connections
    const allMenus = await MenuModel.find({}).select("_id name restaurantId");
    const connectedMenuIds = new Set(validReferences.map((ref) => ref.menuId));

    const unconnectedMenus = allMenus.filter(
      (menu) => !connectedMenuIds.has(menu._id.toString())
    );

    console.log(
      `\n🍽️ Menus without question bank connections: ${unconnectedMenus.length}`
    );
    unconnectedMenus.forEach((menu) => {
      console.log(`  🍽️ ${menu.name} (${menu._id})`);
    });

    // 6. Summary
    console.log("\n📊 SUMMARY:");
    console.log(
      `   Total Question Banks with Menu Connections: ${questionBanksWithMenus.length}`
    );
    console.log(`   Valid Connections: ${validReferences.length}`);
    console.log(`   Broken Connections: ${brokenReferences.length}`);
    console.log(`   Unconnected Menus: ${unconnectedMenus.length}`);

    if (brokenReferences.length === 0) {
      console.log("\n🎉 All menu references are valid!");
    } else {
      console.log("\n⚠️ Some menu references need attention.");
    }
  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Auto-fix function (optional)
async function autoFixBrokenReferences() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("✅ Connected to MongoDB for auto-fix");

    const brokenBanks = await QuestionBankModel.find({
      sourceType: "MENU",
      sourceMenuId: { $ne: null },
    });

    let fixedCount = 0;
    for (const bank of brokenBanks) {
      const menuExists = await MenuModel.exists({
        _id: bank.sourceMenuId,
        restaurantId: bank.restaurantId,
      });

      if (!menuExists) {
        // Remove broken menu connection
        bank.sourceMenuId = null;
        bank.sourceMenuName = undefined;
        await bank.save();
        fixedCount++;
        console.log(
          `🔧 Fixed: Removed broken menu connection from "${bank.name}"`
        );
      }
    }

    console.log(
      `\n✅ Auto-fix completed. Fixed ${fixedCount} broken references.`
    );
  } catch (error) {
    console.error("❌ Auto-fix failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--fix")) {
    console.log("🔧 Running auto-fix for broken menu references...");
    autoFixBrokenReferences();
  } else {
    console.log("🔍 Running diagnostic for menu references...");
    console.log("   Use --fix flag to automatically remove broken references");
    diagnoseMenuReferences();
  }
}
