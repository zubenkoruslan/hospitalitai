import mongoose from "mongoose";
import connectDB from "../utils/connectDB";
import QuizAttempt from "../models/QuizAttempt";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";

interface BackfillResult {
  totalAttempts: number;
  processed: number;
  alreadyProcessed: number;
  errors: number;
  errorDetails: Array<{ attemptId: string; error: string }>;
}

/**
 * Backfill knowledge analytics for existing quiz attempts
 */
export async function backfillKnowledgeAnalytics(
  restaurantId?: string,
  dryRun: boolean = false,
  batchSize: number = 50
): Promise<BackfillResult> {
  await connectDB();

  const result: BackfillResult = {
    totalAttempts: 0,
    processed: 0,
    alreadyProcessed: 0,
    errors: 0,
    errorDetails: [],
  };

  try {
    console.log("🔍 Starting knowledge analytics backfill...");

    // Build query
    const query: any = {};
    if (restaurantId) {
      query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }

    // Get total count
    const totalCount = await QuizAttempt.countDocuments(query);
    result.totalAttempts = totalCount;

    console.log(`📊 Found ${totalCount} quiz attempts to process`);

    if (totalCount === 0) {
      console.log("✅ No quiz attempts found to process");
      return result;
    }

    let processed = 0;
    let skip = 0;

    while (processed < totalCount) {
      console.log(`🔄 Processing batch ${Math.floor(skip / batchSize) + 1}...`);

      const attempts = await QuizAttempt.find(query)
        .limit(batchSize)
        .skip(skip)
        .lean();

      for (const attempt of attempts) {
        try {
          // Check if analytics already exist for this user and restaurant
          const existingAnalytics = await UserKnowledgeAnalyticsModel.findOne({
            userId: attempt.staffUserId,
            restaurantId: attempt.restaurantId,
          });

          // If analytics exist and have data, consider this attempt already processed
          if (
            existingAnalytics &&
            existingAnalytics.totalQuestionsAnswered > 0
          ) {
            result.alreadyProcessed++;
            console.log(
              `⏭️  User ${attempt.staffUserId} already has analytics data`
            );
            continue;
          }

          if (!dryRun) {
            // Update analytics for this quiz completion
            await KnowledgeAnalyticsService.updateAnalyticsOnQuizCompletion(
              attempt.staffUserId as mongoose.Types.ObjectId,
              attempt.restaurantId as mongoose.Types.ObjectId,
              attempt._id as mongoose.Types.ObjectId
            );
          }

          result.processed++;
          console.log(
            `✅ Processed attempt ${attempt._id} for user ${attempt.staffUserId}`
          );
        } catch (error) {
          result.errors++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errorDetails.push({
            attemptId: attempt._id.toString(),
            error: errorMessage,
          });
          console.error(
            `❌ Error processing attempt ${attempt._id}:`,
            errorMessage
          );
        }
      }

      processed += attempts.length;
      skip += batchSize;

      // Show progress
      const progressPercent = Math.round((processed / totalCount) * 100);
      console.log(
        `📈 Progress: ${processed}/${totalCount} (${progressPercent}%)`
      );
    }

    console.log("\n📋 Backfill Summary:");
    console.log(`   Total attempts: ${result.totalAttempts}`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Already processed: ${result.alreadyProcessed}`);
    console.log(`   Errors: ${result.errors}`);

    if (result.errors > 0) {
      console.log("\n❌ Error Details:");
      result.errorDetails.forEach(({ attemptId, error }) => {
        console.log(`   Attempt ${attemptId}: ${error}`);
      });
    }

    if (dryRun) {
      console.log("\n🔍 DRY RUN - No changes were made to the database");
    } else {
      console.log("\n✅ Backfill completed successfully!");
    }
  } catch (error) {
    console.error("💥 Fatal error during backfill:", error);
    throw error;
  }

  return result;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const restaurantId = args
    .find((arg) => arg.startsWith("--restaurant="))
    ?.split("=")[1];
  const batchSize = parseInt(
    args.find((arg) => arg.startsWith("--batch-size="))?.split("=")[1] || "50"
  );

  console.log("🚀 Knowledge Analytics Backfill Script");
  console.log(`   Restaurant ID: ${restaurantId || "ALL"}`);
  console.log(`   Dry Run: ${dryRun}`);
  console.log(`   Batch Size: ${batchSize}\n`);

  backfillKnowledgeAnalytics(restaurantId, dryRun, batchSize)
    .then((result) => {
      console.log("\n🎉 Backfill script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Backfill script failed:", error);
      process.exit(1);
    });
}
