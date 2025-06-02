import mongoose from "mongoose";
import QuestionModel from "../models/QuestionModel";
import QuestionBankModel from "../models/QuestionBankModel";
import { KnowledgeCategory } from "../models/QuestionModel";

async function fixOrphanedQuestions() {
  try {
    await mongoose.connect(
      "mongodb://localhost:27017/hospitality-training?replicaSet=rs0"
    );
    console.log("Connected to MongoDB");

    // Find orphaned active questions
    const orphanedQuestions = await QuestionModel.find({
      status: "active",
      $or: [{ questionBankId: { $exists: false } }, { questionBankId: null }],
    });

    console.log(`Found ${orphanedQuestions.length} orphaned active questions`);

    // Get all question banks
    const questionBanks = await QuestionBankModel.find({});
    console.log(`\nAvailable question banks:`);
    questionBanks.forEach((bank) => {
      console.log(
        `  ${bank._id}: ${bank.name} (${
          bank.sourceType
        }, categories: ${bank.categories?.join(", ")})`
      );
    });

    let fixed = 0;

    for (const question of orphanedQuestions) {
      console.log(`\nProcessing: ${question.questionText.substring(0, 50)}...`);
      console.log(`  Categories: ${question.categories?.join(", ")}`);
      console.log(
        `  Knowledge Category: ${question.knowledgeCategory || "MISSING"}`
      );

      // Set default knowledge category if missing
      if (!question.knowledgeCategory) {
        question.knowledgeCategory = KnowledgeCategory.FOOD_KNOWLEDGE;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();
      }

      // Try to match question to a bank based on categories
      // First try exact matches, then partial matches
      let matchingBank = questionBanks.find((bank) => {
        return bank.categories?.some((bankCat) =>
          question.categories?.some(
            (qCat) => qCat.toLowerCase() === bankCat.toLowerCase()
          )
        );
      });

      // If no exact match, try broader food-related categories
      if (!matchingBank) {
        const foodCategories = [
          "starters",
          "mains",
          "for the table",
          "appetizers",
          "entrees",
          "sides",
        ];
        if (
          question.categories?.some((cat) =>
            foodCategories.includes(cat.toLowerCase())
          )
        ) {
          matchingBank = questionBanks.find(
            (bank) => bank.name === "Food Bank"
          );
        }
      }

      // If still no match, check for wine-related categories
      if (!matchingBank) {
        const wineCategories = [
          "wine",
          "wines",
          "sparkling",
          "red",
          "white",
          "rosé",
        ];
        if (
          question.categories?.some((cat) =>
            wineCategories.includes(cat.toLowerCase())
          )
        ) {
          matchingBank = questionBanks.find(
            (bank) => bank.name === "Wine Bank"
          );
        }
      }

      if (matchingBank) {
        // Assign question to bank
        question.questionBankId = matchingBank._id;
        await question.save();

        // Add question to bank's questions array if not already there
        if (!matchingBank.questions.includes(question._id)) {
          matchingBank.questions.push(question._id);
          matchingBank.questionCount = matchingBank.questions.length;
          await matchingBank.save();
        }

        console.log(`  -> Fixed: Assigned to ${matchingBank.name}`);
        fixed++;
      } else {
        console.log(`  -> No match found - assigning to Food Bank by default`);

        const foodBank = questionBanks.find(
          (bank) => bank.name === "Food Bank"
        );
        if (foodBank) {
          question.questionBankId = foodBank._id;
          await question.save();

          if (!foodBank.questions.includes(question._id)) {
            foodBank.questions.push(question._id);
            foodBank.questionCount = foodBank.questions.length;
            await foodBank.save();
          }

          fixed++;
          console.log(`  -> Assigned to Food Bank (default)`);
        } else {
          console.log(
            `  -> ERROR: Could not find Food Bank for default assignment`
          );
        }
      }
    }

    // Update Wine Bank count
    const wineBank = await QuestionBankModel.findOne({ name: "Wine Bank" });
    if (wineBank) {
      const actualQuestionCount = wineBank.questions.length;
      if (wineBank.questionCount !== actualQuestionCount) {
        console.log(
          `\nFixing Wine Bank count: ${wineBank.questionCount} -> ${actualQuestionCount}`
        );
        wineBank.questionCount = actualQuestionCount;
        await wineBank.save();
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Fixed ${fixed} orphaned questions`);
    console.log(`- Updated question bank counts`);

    // Final verification
    const remainingOrphaned = await QuestionModel.countDocuments({
      status: "active",
      $or: [{ questionBankId: { $exists: false } }, { questionBankId: null }],
    });

    const activeQuestionsWithBanks = await QuestionModel.countDocuments({
      status: "active",
      questionBankId: { $exists: true, $ne: null },
    });

    console.log(`\nFinal status:`);
    console.log(`- Active questions with banks: ${activeQuestionsWithBanks}`);
    console.log(`- Remaining orphaned: ${remainingOrphaned}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixOrphanedQuestions();
}

export default fixOrphanedQuestions;
