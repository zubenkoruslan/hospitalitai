import mongoose from "mongoose";
import connectDB from "../utils/connectDB";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import QuizAttempt from "../models/QuizAttempt";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";

/**
 * Reset analytics data for a specific restaurant and reprocess quiz attempts
 * This fixes over-counting issues caused by multiple analytics updates
 */
async function resetAnalyticsForRestaurant(restaurantId: string) {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

    // 1. Delete all existing analytics records for this restaurant
    console.log(
      `\n🗑️  Deleting existing analytics for restaurant ${restaurantId}...`
    );
    const deleteResult = await UserKnowledgeAnalyticsModel.deleteMany({
      restaurantId: restaurantObjectId,
    });
    console.log(`   Deleted ${deleteResult.deletedCount} analytics records`);

    // 2. Get all quiz attempts for this restaurant
    console.log(`\n📊 Finding quiz attempts for restaurant ${restaurantId}...`);
    const quizAttempts = await QuizAttempt.find({
      restaurantId: restaurantObjectId,
    })
      .sort({ attemptDate: 1 })
      .lean();

    console.log(`   Found ${quizAttempts.length} quiz attempts to process`);

    // 3. Reprocess each quiz attempt with the new idempotent analytics
    console.log(`\n🔄 Reprocessing quiz attempts...`);
    let processedCount = 0;

    for (const attempt of quizAttempts) {
      try {
        const staffUserId =
          typeof attempt.staffUserId === "string"
            ? new mongoose.Types.ObjectId(attempt.staffUserId)
            : (attempt.staffUserId as mongoose.Types.ObjectId);
        const attemptId =
          typeof attempt._id === "string"
            ? new mongoose.Types.ObjectId(attempt._id)
            : (attempt._id as mongoose.Types.ObjectId);

        await KnowledgeAnalyticsService.updateAnalyticsOnQuizCompletion(
          staffUserId,
          restaurantObjectId,
          attemptId
        );
        processedCount++;

        if (processedCount % 5 === 0) {
          console.log(
            `   Processed ${processedCount}/${quizAttempts.length} attempts...`
          );
        }
      } catch (error) {
        console.error(`   Error processing attempt ${attempt._id}:`, error);
      }
    }

    console.log(`\n✅ Reset complete!`);
    console.log(`   Total quiz attempts processed: ${processedCount}`);

    // 4. Show final analytics summary
    console.log(`\n📈 Final analytics summary:`);
    const finalAnalytics = await UserKnowledgeAnalyticsModel.find({
      restaurantId: restaurantObjectId,
    }).lean();

    for (const analytics of finalAnalytics) {
      console.log(`   User ${analytics.userId}:`);
      console.log(
        `     - Food: ${analytics.foodKnowledge.totalQuestions} questions`
      );
      console.log(
        `     - Beverage: ${analytics.beverageKnowledge.totalQuestions} questions`
      );
      console.log(
        `     - Wine: ${analytics.wineKnowledge.totalQuestions} questions`
      );
      console.log(
        `     - Procedures: ${analytics.proceduresKnowledge.totalQuestions} questions`
      );
      console.log(
        `     - Processed attempts: ${analytics.processedQuizAttempts.length}`
      );
    }
  } catch (error) {
    console.error("❌ Error resetting analytics:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script if called directly
if (require.main === module) {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    console.error("❌ Usage: npm run reset-analytics <restaurantId>");
    console.error(
      "   Example: npm run reset-analytics 680cc041a5063e15878bd0fd"
    );
    process.exit(1);
  }

  resetAnalyticsForRestaurant(restaurantId).catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
}

export { resetAnalyticsForRestaurant };
