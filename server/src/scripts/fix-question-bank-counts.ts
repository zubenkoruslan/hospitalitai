import mongoose from "mongoose";
import QuestionBankModel from "../models/QuestionBankModel";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel";
import { QuestionTaggingService } from "../services/questionTaggingService";

async function fixQuestionBankCounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      "mongodb://localhost:27017/hospitality-training?replicaSet=rs0"
    );
    console.log("Connected to MongoDB");

    // 1. Fix question bank counts
    console.log("Fixing question bank counts...");
    const questionBanks = await QuestionBankModel.find({});

    for (const bank of questionBanks) {
      const actualQuestionCount = bank.questions?.length || 0;
      if (bank.questionCount !== actualQuestionCount) {
        console.log(
          `Fixing ${bank.name}: questionCount was ${bank.questionCount}, actual is ${actualQuestionCount}`
        );
        bank.questionCount = actualQuestionCount;
        await bank.save();
      }
    }

    // 2. Check and fix questions without knowledge categories
    console.log("Checking questions without knowledge categories...");
    const questionsWithoutCategory = await QuestionModel.find({
      knowledgeCategory: { $exists: false },
    });

    console.log(
      `Found ${questionsWithoutCategory.length} questions without knowledge categories`
    );

    for (const question of questionsWithoutCategory) {
      try {
        // Skip questions without questionBankId as they can't be saved
        if (!question.questionBankId) {
          console.log(`Skipping question ${question._id} - no questionBankId`);
          continue;
        }

        // Auto-tag with AI
        const taggingResult = QuestionTaggingService.determineKnowledgeCategory(
          question.questionText,
          { existingCategories: question.categories }
        );
        const category = taggingResult.knowledgeCategory;

        question.knowledgeCategory = category;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();

        await question.save();
        console.log(
          `Tagged question "${question.questionText.substring(
            0,
            50
          )}..." as ${category}`
        );
      } catch (error) {
        console.error(`Failed to tag question ${question._id}:`, error);

        // Skip if no questionBankId
        if (!question.questionBankId) {
          console.log(`Skipping question ${question._id} - no questionBankId`);
          continue;
        }

        // Assign a default category if AI tagging fails
        question.knowledgeCategory = KnowledgeCategory.FOOD_KNOWLEDGE;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();
        await question.save();
        console.log(`Assigned default category to question ${question._id}`);
      }
    }

    // 3. Check questions with null/undefined knowledge categories
    const questionsWithNullCategory = await QuestionModel.find({
      knowledgeCategory: { $in: [null, undefined, ""] },
    });

    console.log(
      `Found ${questionsWithNullCategory.length} questions with null/empty knowledge categories`
    );

    for (const question of questionsWithNullCategory) {
      try {
        // Skip questions without questionBankId as they can't be saved
        if (!question.questionBankId) {
          console.log(`Skipping question ${question._id} - no questionBankId`);
          continue;
        }

        const taggingResult = QuestionTaggingService.determineKnowledgeCategory(
          question.questionText,
          { existingCategories: question.categories }
        );
        const category = taggingResult.knowledgeCategory;

        question.knowledgeCategory = category;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();

        await question.save();
        console.log(
          `Fixed null category for question "${question.questionText.substring(
            0,
            50
          )}..." as ${category}`
        );
      } catch (error) {
        console.error(`Failed to tag question ${question._id}:`, error);

        // Skip if no questionBankId
        if (!question.questionBankId) {
          console.log(`Skipping question ${question._id} - no questionBankId`);
          continue;
        }

        question.knowledgeCategory = KnowledgeCategory.FOOD_KNOWLEDGE;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();
        await question.save();
      }
    }

    // 4. Activate pending questions that have valid question bank IDs
    console.log("Activating pending questions...");
    const pendingQuestions = await QuestionModel.find({
      status: "pending_review",
      questionBankId: { $exists: true },
      knowledgeCategory: { $exists: true },
    });

    console.log(
      `Found ${pendingQuestions.length} pending questions to activate`
    );

    for (const question of pendingQuestions) {
      question.status = "active";
      await question.save();
      console.log(
        `Activated question: "${question.questionText.substring(0, 50)}..."`
      );
    }

    // 5. Verify the fixes
    console.log("\nVerification:");
    const totalQuestions = await QuestionModel.countDocuments();
    const questionsWithCategory = await QuestionModel.countDocuments({
      knowledgeCategory: {
        $exists: true,
        $ne: null,
        $nin: ["", null, undefined],
      },
    });
    const activeQuestions = await QuestionModel.countDocuments({
      status: "active",
      questionBankId: { $exists: true },
    });
    const banksWithQuestions = await QuestionBankModel.find({
      questionCount: { $gt: 0 },
    });

    console.log(`Total questions: ${totalQuestions}`);
    console.log(
      `Questions with knowledge categories: ${questionsWithCategory}`
    );
    console.log(`Active questions with valid bank IDs: ${activeQuestions}`);
    console.log(`Question banks with questions: ${banksWithQuestions.length}`);

    banksWithQuestions.forEach((bank) => {
      console.log(`  - ${bank.name}: ${bank.questionCount} questions`);
    });

    console.log("Fix completed successfully!");
  } catch (error) {
    console.error("Error fixing question bank counts:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixQuestionBankCounts();
}

export default fixQuestionBankCounts;
