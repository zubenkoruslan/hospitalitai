import mongoose from "mongoose";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel";
import { QuestionTaggingService } from "../services/questionTaggingService";

async function fixWineQuestionCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      "mongodb://localhost:27017/hospitality-training?replicaSet=rs0"
    );
    console.log("Connected to MongoDB");

    // Wine-related keywords that indicate a question should be wine knowledge
    const wineKeywords = [
      "wine",
      "vintage",
      "grape",
      "variety",
      "vineyard",
      "cabernet",
      "merlot",
      "chardonnay",
      "pinot",
      "sauvignon",
      "tannin",
      "acidity",
      "pairing",
      "bordeaux",
      "burgundy",
      "napa",
      "tuscany",
      "rioja",
      "chianti",
      "prosecco",
      "riesling",
      "syrah",
      "shiraz",
      "tempranillo",
      "sangiovese",
      "nebbiolo",
      "moscato",
      "chablis",
      "barolo",
      "brunello",
      "sparkling",
      "champagne",
      "red wine",
      "white wine",
      "rosé",
      "bottle",
      "glass",
      "cork",
      "terroir",
      "sommelier",
      "tasting",
      "bouquet",
      "finish",
      "decant",
      "cellar",
      "aging",
      "oak",
      "dry",
      "sweet",
      "full-bodied",
      "light-bodied",
    ];

    // Find questions that mention wine-related terms but are not categorized as wine knowledge
    const potentialWineQuestions = await QuestionModel.find({
      $and: [
        { knowledgeCategory: { $ne: KnowledgeCategory.WINE_KNOWLEDGE } },
        { questionBankId: { $exists: true } },
        {
          $or: [
            {
              questionText: { $regex: new RegExp(wineKeywords.join("|"), "i") },
            },
            { categories: { $elemMatch: { $regex: /wine/i } } },
          ],
        },
      ],
    });

    console.log(
      `Found ${potentialWineQuestions.length} potential wine questions to review`
    );

    let updatedCount = 0;

    for (const question of potentialWineQuestions) {
      const questionText = question.questionText.toLowerCase();
      const categories = question.categories.join(" ").toLowerCase();
      const combinedText = `${questionText} ${categories}`;

      // Check if this really should be wine knowledge
      const wineScore = wineKeywords.reduce((score, keyword) => {
        return score + (combinedText.includes(keyword) ? 1 : 0);
      }, 0);

      // If it has multiple wine keywords, re-categorize it
      if (wineScore >= 2) {
        // Use the tagging service to get proper categorization
        const taggingResult = QuestionTaggingService.determineKnowledgeCategory(
          question.questionText,
          { existingCategories: question.categories }
        );

        if (
          taggingResult.knowledgeCategory === KnowledgeCategory.WINE_KNOWLEDGE
        ) {
          console.log(
            `Re-categorizing question: "${question.questionText.substring(
              0,
              60
            )}..."`
          );
          console.log(
            `  From: ${question.knowledgeCategory} → To: ${taggingResult.knowledgeCategory}`
          );

          question.knowledgeCategory = taggingResult.knowledgeCategory;
          question.knowledgeCategoryAssignedBy = "ai";
          question.knowledgeCategoryAssignedAt = new Date();

          await question.save();
          updatedCount++;
        }
      }
    }

    // Also check for food items that might be wine-related but incorrectly tagged
    const foodQuestionsWithWineTerms = await QuestionModel.find({
      knowledgeCategory: KnowledgeCategory.FOOD_KNOWLEDGE,
      questionBankId: { $exists: true },
      $or: [
        { questionText: { $regex: /wine|grape|vintage|pairing|tasting/i } },
        { categories: { $elemMatch: { $regex: /wine/i } } },
      ],
    });

    console.log(
      `Found ${foodQuestionsWithWineTerms.length} food questions with wine terms to review`
    );

    for (const question of foodQuestionsWithWineTerms) {
      const questionText = question.questionText.toLowerCase();

      // Check if this is actually about wine pairing or wine service
      if (
        questionText.includes("wine pairing") ||
        questionText.includes("wine service") ||
        questionText.includes("wine recommend") ||
        questionText.includes("pairs with wine") ||
        questionText.includes("wine selection")
      ) {
        console.log(
          `Re-categorizing wine service question: "${question.questionText.substring(
            0,
            60
          )}..."`
        );
        console.log(
          `  From: ${question.knowledgeCategory} → To: ${KnowledgeCategory.WINE_KNOWLEDGE}`
        );

        question.knowledgeCategory = KnowledgeCategory.WINE_KNOWLEDGE;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();

        await question.save();
        updatedCount++;
      }
    }

    // Check beverage questions that should be wine knowledge
    const beverageQuestionsWithWineTerms = await QuestionModel.find({
      knowledgeCategory: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
      questionBankId: { $exists: true },
      $or: [
        {
          questionText: {
            $regex:
              /wine|vintage|grape|cabernet|merlot|chardonnay|pinot|sauvignon/i,
          },
        },
        { categories: { $elemMatch: { $regex: /wine/i } } },
      ],
    });

    console.log(
      `Found ${beverageQuestionsWithWineTerms.length} beverage questions with wine terms to review`
    );

    for (const question of beverageQuestionsWithWineTerms) {
      const questionText = question.questionText.toLowerCase();

      // If it's clearly about wine and not cocktails/mixed drinks
      if (
        !questionText.includes("cocktail") &&
        !questionText.includes("mixed") &&
        !questionText.includes("spirit") &&
        (questionText.includes("wine") ||
          questionText.includes("vintage") ||
          questionText.includes("grape") ||
          questionText.includes("cabernet") ||
          questionText.includes("merlot") ||
          questionText.includes("chardonnay"))
      ) {
        console.log(
          `Re-categorizing wine question: "${question.questionText.substring(
            0,
            60
          )}..."`
        );
        console.log(
          `  From: ${question.knowledgeCategory} → To: ${KnowledgeCategory.WINE_KNOWLEDGE}`
        );

        question.knowledgeCategory = KnowledgeCategory.WINE_KNOWLEDGE;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();

        await question.save();
        updatedCount++;
      }
    }

    console.log(`\nTotal questions re-categorized: ${updatedCount}`);

    // Final verification
    const wineQuestionCount = await QuestionModel.countDocuments({
      knowledgeCategory: KnowledgeCategory.WINE_KNOWLEDGE,
      questionBankId: { $exists: true },
    });

    const foodQuestionCount = await QuestionModel.countDocuments({
      knowledgeCategory: KnowledgeCategory.FOOD_KNOWLEDGE,
      questionBankId: { $exists: true },
    });

    const beverageQuestionCount = await QuestionModel.countDocuments({
      knowledgeCategory: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
      questionBankId: { $exists: true },
    });

    const proceduresQuestionCount = await QuestionModel.countDocuments({
      knowledgeCategory: KnowledgeCategory.PROCEDURES_KNOWLEDGE,
      questionBankId: { $exists: true },
    });

    console.log("\nFinal category distribution:");
    console.log(`  Wine Knowledge: ${wineQuestionCount} questions`);
    console.log(`  Food Knowledge: ${foodQuestionCount} questions`);
    console.log(`  Beverage Knowledge: ${beverageQuestionCount} questions`);
    console.log(`  Procedures Knowledge: ${proceduresQuestionCount} questions`);

    console.log("Wine question categorization fix completed successfully!");
  } catch (error) {
    console.error("Error fixing wine question categories:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixWineQuestionCategories();
}

export default fixWineQuestionCategories;
