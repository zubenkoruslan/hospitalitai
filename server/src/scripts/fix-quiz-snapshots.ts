import mongoose from "mongoose";
import dotenv from "dotenv";
import { QuizService } from "../services/quizService";
import QuizModel from "../models/QuizModel";

dotenv.config();

/**
 * Script to fix existing quizzes with stale totalUniqueQuestionsInSourceSnapshot counts
 */
async function fixQuizSnapshots() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!, {
      useUnifiedTopology: true,
    } as any);

    console.log("✅ Connected to MongoDB");

    // Find all quizzes that source from question banks
    const quizzes = await QuizModel.find({
      sourceType: "QUESTION_BANKS",
      sourceQuestionBankIds: { $exists: true, $ne: [] },
    });

    console.log(
      `🔍 Found ${quizzes.length} quizzes sourced from question banks`
    );

    if (quizzes.length === 0) {
      console.log("ℹ️ No quizzes to fix");
      return;
    }

    let totalUpdated = 0;

    // Group quizzes by restaurant to process efficiently
    const quizzesByRestaurant = quizzes.reduce((acc, quiz) => {
      const restaurantId = quiz.restaurantId.toString();
      if (!acc[restaurantId]) {
        acc[restaurantId] = [];
      }
      acc[restaurantId].push(quiz);
      return acc;
    }, {} as Record<string, Array<(typeof quizzes)[0]>>);

    for (const restaurantIdStr of Object.keys(quizzesByRestaurant)) {
      const restaurantQuizzes = quizzesByRestaurant[restaurantIdStr];
      const restaurantId = new mongoose.Types.ObjectId(restaurantIdStr);

      console.log(
        `\n🏢 Processing ${restaurantQuizzes.length} quizzes for restaurant ${restaurantIdStr}`
      );

      // Get unique question bank IDs for this restaurant
      const uniqueBankIds = [
        ...new Set(
          restaurantQuizzes.flatMap((quiz) =>
            quiz.sourceQuestionBankIds.map((id) => id.toString())
          )
        ),
      ].map((id) => new mongoose.Types.ObjectId(id));

      console.log(`📚 Found ${uniqueBankIds.length} unique question banks`);

      // Update snapshots for all these banks (which will update all affected quizzes)
      const updatedCount =
        await QuizService.updateQuizSnapshotsForQuestionBanks(
          uniqueBankIds,
          restaurantId
        );

      totalUpdated += updatedCount;
      console.log(`✅ Updated ${updatedCount} quizzes for this restaurant`);
    }

    console.log(
      `\n🎯 Summary: Updated ${totalUpdated} out of ${quizzes.length} quizzes total`
    );

    // Show some examples of updated quizzes
    const updatedQuizzes = await QuizModel.find({
      sourceType: "QUESTION_BANKS",
    })
      .limit(5)
      .select("title totalUniqueQuestionsInSourceSnapshot");

    console.log("\n📋 Sample of quiz snapshot counts after update:");
    updatedQuizzes.forEach((quiz) => {
      console.log(
        `  • "${quiz.title}": ${quiz.totalUniqueQuestionsInSourceSnapshot} questions`
      );
    });
  } catch (error) {
    console.error("❌ Fix script failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixQuizSnapshots().catch(console.error);
}

export { fixQuizSnapshots };
