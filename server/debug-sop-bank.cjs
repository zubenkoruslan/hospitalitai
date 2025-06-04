const mongoose = require("mongoose");

// Connect to database and debug the SOP bank
async function debugSopBank() {
  try {
    // Use environment variable or default connection
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/quizcrunch";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const bankId = "683d998e0ee02e0a38b3b536"; // From your error logs

    // Import models after connection
    const QuestionBankModel = require("./server/src/models/QuestionBankModel.ts");
    const SopDocumentModel = require("./server/src/models/SopDocumentModel.ts");

    // Find the problematic bank
    const bank = await QuestionBankModel.findById(bankId);
    if (!bank) {
      console.log("❌ Bank not found with ID:", bankId);
      return;
    }

    console.log("\n🏦 SOP Bank Details:");
    console.log("  Name:", bank.name);
    console.log("  Source Type:", bank.sourceType);
    console.log("  Categories:", bank.categories);
    console.log("  Categories Length:", bank.categories?.length || 0);
    console.log("  SOP Document ID:", bank.sourceSopDocumentId);

    // Check the source SOP document
    if (bank.sourceSopDocumentId) {
      console.log("\n📄 Checking Source SOP Document...");
      const sopDoc = await SopDocumentModel.findById(bank.sourceSopDocumentId);
      if (sopDoc) {
        console.log("  SOP Title:", sopDoc.title);
        console.log("  SOP Categories Count:", sopDoc.categories?.length || 0);
        console.log("  Available Categories:");
        if (sopDoc.categories && sopDoc.categories.length > 0) {
          sopDoc.categories.forEach((cat, index) => {
            console.log(
              `    ${index + 1}. ${cat.name} (${
                cat.sections?.length || 0
              } sections)`
            );
          });

          // 🛠️ FIX: If bank has no categories but SOP has categories, add them
          if (!bank.categories || bank.categories.length === 0) {
            console.log("\n🛠️ FIXING: Adding all SOP categories to bank...");
            const categoryNames = sopDoc.categories.map((cat) => cat.name);
            bank.categories = categoryNames;
            await bank.save();
            console.log("✅ Fixed! Bank now has categories:", categoryNames);
          } else {
            console.log("\n✅ Bank already has categories set up correctly");
          }
        } else {
          console.log("    (No categories found in SOP document)");
          console.log("\n⚠️ SOP document has no categories available");

          // Suggest creating default categories
          console.log("\n💡 SUGGESTION: Adding default SOP categories...");
          const defaultCategories = [
            "Safety Procedures",
            "Service Standards",
            "Food Handling",
          ];
          bank.categories = defaultCategories;
          await bank.save();
          console.log("✅ Added default categories:", defaultCategories);
        }
      } else {
        console.log("  ❌ SOP Document not found");
      }
    }

    console.log("\n🔍 Final Bank State:");
    const updatedBank = await QuestionBankModel.findById(bankId);
    console.log("  Categories:", updatedBank.categories);
    console.log(
      "  Ready for question generation:",
      updatedBank.categories?.length > 0 ? "✅ YES" : "❌ NO"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the debug function
debugSopBank();
