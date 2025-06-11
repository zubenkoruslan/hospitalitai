import mongoose from "mongoose";
import QuestionModel, { KnowledgeCategory } from "../models/QuestionModel.js";
import { QuestionTaggingService } from "../services/questionTaggingService.js";

/**
 * Fix questions that are about food items but contain wine ingredients
 * and were incorrectly categorized as beverage or wine knowledge
 */
async function fixFoodBeverageCategorization() {
  try {
    console.log("Starting food/beverage categorization fix...");

    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find questions that are likely food items but categorized as beverage or wine knowledge
    const suspiciousBeverageQuestions = await QuestionModel.find({
      knowledgeCategory: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
      questionBankId: { $exists: true },
      $or: [
        // Questions about meat dishes
        {
          questionText: { $regex: /steak|beef|chicken|pork|lamb|fish|salmon/i },
        },
        // Questions about cooking methods/preparation
        {
          questionText: {
            $regex:
              /dry-aged|grilled|roasted|braised|seared|how long|temperature/i,
          },
        },
        // Questions with wine as ingredient indicators
        {
          questionText: {
            $regex: /wine jus|wine sauce|wine reduction|wine braised/i,
          },
        },
        // Menu items
        {
          questionText: {
            $regex: /dish|entree|appetizer|dessert|pasta|salad|soup/i,
          },
        },
        // Food-specific terms
        {
          questionText: {
            $regex: /tomahawk|angus|ribeye|filet|burger|sandwich|pizza/i,
          },
        },
      ],
    });

    const suspiciousWineQuestions = await QuestionModel.find({
      knowledgeCategory: KnowledgeCategory.WINE_KNOWLEDGE,
      questionBankId: { $exists: true },
      $and: [
        {
          $or: [
            // Questions about meat dishes
            {
              questionText: {
                $regex: /steak|beef|chicken|pork|lamb|fish|salmon/i,
              },
            },
            // Questions about cooking methods/preparation
            {
              questionText: {
                $regex:
                  /dry-aged|grilled|roasted|braised|seared|how long|temperature/i,
              },
            },
            // Menu items
            {
              questionText: {
                $regex: /dish|entree|appetizer|dessert|pasta|salad|soup/i,
              },
            },
            // Food-specific terms
            {
              questionText: {
                $regex: /tomahawk|angus|ribeye|filet|burger|sandwich|pizza/i,
              },
            },
          ],
        },
        // But NOT questions about wine service, pairing, or wine itself
        {
          questionText: {
            $not: {
              $regex:
                /wine pairing|wine service|wine selection|wine recommend|which wine|what wine|wine list|sommelier|wine glass|wine bottle|decant|vintage year|grape variety|wine region|tasting notes/i,
            },
          },
        },
      ],
    });

    console.log(
      `Found ${suspiciousBeverageQuestions.length} suspicious beverage questions`
    );
    console.log(
      `Found ${suspiciousWineQuestions.length} suspicious wine questions`
    );

    let correctedCount = 0;

    // Process suspicious beverage questions
    for (const question of suspiciousBeverageQuestions) {
      console.log(
        `\nReviewing beverage question: "${question.questionText.substring(
          0,
          80
        )}..."`
      );

      // Re-tag using improved service
      const taggingResult = QuestionTaggingService.determineKnowledgeCategory(
        question.questionText,
        { existingCategories: question.categories }
      );

      if (
        taggingResult.knowledgeCategory === KnowledgeCategory.FOOD_KNOWLEDGE
      ) {
        console.log(
          `  ✓ Correcting: ${question.knowledgeCategory} → ${taggingResult.knowledgeCategory}`
        );
        console.log(`  Reason: ${taggingResult.reasoning}`);

        question.knowledgeCategory = taggingResult.knowledgeCategory;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();

        await question.save();
        correctedCount++;
      } else {
        console.log(
          `  - Keeping as ${question.knowledgeCategory} (AI suggests: ${taggingResult.knowledgeCategory})`
        );
      }
    }

    // Process suspicious wine questions
    for (const question of suspiciousWineQuestions) {
      console.log(
        `\nReviewing wine question: "${question.questionText.substring(
          0,
          80
        )}..."`
      );

      // Re-tag using improved service
      const taggingResult = QuestionTaggingService.determineKnowledgeCategory(
        question.questionText,
        { existingCategories: question.categories }
      );

      if (
        taggingResult.knowledgeCategory === KnowledgeCategory.FOOD_KNOWLEDGE
      ) {
        console.log(
          `  ✓ Correcting: ${question.knowledgeCategory} → ${taggingResult.knowledgeCategory}`
        );
        console.log(`  Reason: ${taggingResult.reasoning}`);

        question.knowledgeCategory = taggingResult.knowledgeCategory;
        question.knowledgeCategoryAssignedBy = "ai";
        question.knowledgeCategoryAssignedAt = new Date();

        await question.save();
        correctedCount++;
      } else {
        console.log(
          `  - Keeping as ${question.knowledgeCategory} (AI suggests: ${taggingResult.knowledgeCategory})`
        );
      }
    }

    console.log(`\n✅ Correction complete! Fixed ${correctedCount} questions.`);

    // Final category distribution
    const finalStats = {
      food: await QuestionModel.countDocuments({
        knowledgeCategory: KnowledgeCategory.FOOD_KNOWLEDGE,
        questionBankId: { $exists: true },
      }),
      beverage: await QuestionModel.countDocuments({
        knowledgeCategory: KnowledgeCategory.BEVERAGE_KNOWLEDGE,
        questionBankId: { $exists: true },
      }),
      wine: await QuestionModel.countDocuments({
        knowledgeCategory: KnowledgeCategory.WINE_KNOWLEDGE,
        questionBankId: { $exists: true },
      }),
      procedures: await QuestionModel.countDocuments({
        knowledgeCategory: KnowledgeCategory.PROCEDURES_KNOWLEDGE,
        questionBankId: { $exists: true },
      }),
    };

    console.log("\nFinal category distribution:");
    console.log(`  Food Knowledge: ${finalStats.food}`);
    console.log(`  Beverage Knowledge: ${finalStats.beverage}`);
    console.log(`  Wine Knowledge: ${finalStats.wine}`);
    console.log(`  Procedures Knowledge: ${finalStats.procedures}`);
  } catch (error) {
    console.error("Error fixing categorization:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the script if called directly
if (require.main === module) {
  fixFoodBeverageCategorization();
}

export default fixFoodBeverageCategorization;
