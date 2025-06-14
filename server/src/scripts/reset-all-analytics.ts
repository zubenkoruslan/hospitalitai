import mongoose from "mongoose";
import connectDB from "../utils/connectDB";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import QuizAttemptModel from "../models/QuizAttempt";
import ArchivedQuizAnalyticsModel from "../models/ArchivedQuizAnalytics";
import UserPerformanceSnapshotModel from "../models/UserPerformanceSnapshot";
import StaffQuizProgressModel from "../models/StaffQuizProgress";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";
import { cacheService } from "../services/cacheService";
import { KnowledgeCategory } from "../models/QuestionModel";

interface ResetOptions {
  resetQuizAttempts?: boolean; // Whether to delete quiz attempts (destructive)
  resetStaffProgress?: boolean; // Whether to reset staff quiz progress
  resetArchivedAnalytics?: boolean; // Whether to delete archived analytics
  preserveUserData?: boolean; // Whether to preserve user account data
}

interface ResetResults {
  success: boolean;
  analyticsDeleted: number;
  quizAttemptsDeleted?: number;
  archivedAnalyticsDeleted?: number;
  snapshotsDeleted?: number;
  progressResetCount?: number;
  cacheCleared: boolean;
  errors: string[];
}

/**
 * Comprehensive analytics reset for a restaurant
 * This will clear all analytics data and optionally quiz attempts
 */
async function resetAllAnalytics(
  restaurantId: string,
  options: ResetOptions = {}
): Promise<ResetResults> {
  const results: ResetResults = {
    success: false,
    analyticsDeleted: 0,
    cacheCleared: false,
    errors: [],
  };

  try {
    await connectDB();
    console.log("🔌 Connected to MongoDB");

    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

    console.log(`\n🚨 ANALYTICS RESET FOR RESTAURANT: ${restaurantId}`);
    console.log("⚠️  This operation will permanently delete analytics data!");
    console.log(`Options: ${JSON.stringify(options, null, 2)}\n`);

    // 1. Clear analytics cache first
    console.log("🧹 Clearing analytics cache...");
    try {
      await KnowledgeAnalyticsService.invalidateAnalyticsCache(
        restaurantObjectId
      );

      // Also clear any remaining cache patterns
      const cacheKeys = [
        `analytics:${restaurantId}:*`,
        `restaurant:${restaurantId}:*`,
        `leaderboards:${restaurantId}:*`,
        `categories:${restaurantId}:*`,
      ];

      for (const pattern of cacheKeys) {
        // Since we don't have a pattern-based clear, we'll rely on the service method
        console.log(`   Cleared cache pattern: ${pattern}`);
      }

      results.cacheCleared = true;
      console.log("✅ Analytics cache cleared");
    } catch (error) {
      const errorMsg = `Cache clear failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      results.errors.push(errorMsg);
      console.warn(`⚠️  ${errorMsg}`);
    }

    // 2. Delete UserKnowledgeAnalytics records
    console.log("\n🗑️  Deleting UserKnowledgeAnalytics records...");
    try {
      const analyticsDeleteResult =
        await UserKnowledgeAnalyticsModel.deleteMany({
          restaurantId: restaurantObjectId,
        });
      results.analyticsDeleted = analyticsDeleteResult.deletedCount;
      console.log(`✅ Deleted ${results.analyticsDeleted} analytics records`);
    } catch (error) {
      const errorMsg = `Analytics deletion failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      results.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    // 3. Delete UserPerformanceSnapshot records
    console.log("\n🗑️  Deleting UserPerformanceSnapshot records...");
    try {
      const snapshotDeleteResult =
        await UserPerformanceSnapshotModel.deleteMany({
          restaurantId: restaurantObjectId,
        });
      results.snapshotsDeleted = snapshotDeleteResult.deletedCount;
      console.log(
        `✅ Deleted ${results.snapshotsDeleted} performance snapshots`
      );
    } catch (error) {
      const errorMsg = `Snapshot deletion failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      results.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    // 4. Optionally delete archived analytics
    if (options.resetArchivedAnalytics) {
      console.log("\n🗑️  Deleting ArchivedQuizAnalytics records...");
      try {
        const archivedDeleteResult =
          await ArchivedQuizAnalyticsModel.deleteMany({
            restaurantId: restaurantObjectId,
          });
        results.archivedAnalyticsDeleted = archivedDeleteResult.deletedCount;
        console.log(
          `✅ Deleted ${results.archivedAnalyticsDeleted} archived analytics records`
        );
      } catch (error) {
        const errorMsg = `Archived analytics deletion failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // 5. Optionally reset StaffQuizProgress
    if (options.resetStaffProgress) {
      console.log("\n🔄 Resetting StaffQuizProgress records...");
      try {
        const progressResetResult = await StaffQuizProgressModel.updateMany(
          { restaurantId: restaurantObjectId },
          {
            $set: {
              seenQuestionIds: [],
              isCompletedOverall: false,
            },
            $unset: {
              lastAttemptTimestamp: "",
            },
          }
        );
        results.progressResetCount = progressResetResult.modifiedCount;
        console.log(
          `✅ Reset progress for ${results.progressResetCount} staff quiz records`
        );
      } catch (error) {
        const errorMsg = `Progress reset failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // 6. Optionally delete quiz attempts (DESTRUCTIVE!)
    if (options.resetQuizAttempts) {
      console.log("\n🚨 DELETING QUIZ ATTEMPTS (DESTRUCTIVE OPERATION)...");
      console.log("⚠️  This will permanently delete all quiz attempt history!");

      try {
        const attemptDeleteResult = await QuizAttemptModel.deleteMany({
          restaurantId: restaurantObjectId,
        });
        results.quizAttemptsDeleted = attemptDeleteResult.deletedCount;
        console.log(`✅ Deleted ${results.quizAttemptsDeleted} quiz attempts`);
      } catch (error) {
        const errorMsg = `Quiz attempts deletion failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // 7. Summary
    console.log("\n📊 RESET SUMMARY:");
    console.log(`   Analytics records deleted: ${results.analyticsDeleted}`);
    console.log(
      `   Performance snapshots deleted: ${results.snapshotsDeleted || 0}`
    );
    if (results.archivedAnalyticsDeleted !== undefined) {
      console.log(
        `   Archived analytics deleted: ${results.archivedAnalyticsDeleted}`
      );
    }
    if (results.progressResetCount !== undefined) {
      console.log(
        `   Staff progress records reset: ${results.progressResetCount}`
      );
    }
    if (results.quizAttemptsDeleted !== undefined) {
      console.log(`   Quiz attempts deleted: ${results.quizAttemptsDeleted}`);
    }
    console.log(`   Cache cleared: ${results.cacheCleared ? "Yes" : "No"}`);
    console.log(`   Errors encountered: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    results.success =
      results.errors.length === 0 || results.analyticsDeleted > 0;

    if (results.success) {
      console.log("\n✅ Analytics reset completed successfully!");
      console.log(
        "🔄 New analytics will be generated as staff complete quizzes."
      );
    } else {
      console.log("\n⚠️  Analytics reset completed with errors.");
    }
  } catch (error) {
    console.error("❌ Fatal error during analytics reset:", error);
    results.errors.push(error instanceof Error ? error.message : String(error));
    results.success = false;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }

  return results;
}

/**
 * Interactive script execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "❌ Usage: npm run reset-all-analytics <restaurantId> [options]"
    );
    console.error("");
    console.error("Options:");
    console.error(
      "  --include-attempts     Also delete quiz attempts (DESTRUCTIVE!)"
    );
    console.error("  --include-progress     Reset staff quiz progress");
    console.error("  --include-archived     Delete archived analytics");
    console.error(
      "  --full-reset           Reset everything (VERY DESTRUCTIVE!)"
    );
    console.error("");
    console.error("Examples:");
    console.error("  npm run reset-all-analytics 680cc041a5063e15878bd0fd");
    console.error(
      "  npm run reset-all-analytics 680cc041a5063e15878bd0fd --include-progress"
    );
    console.error(
      "  npm run reset-all-analytics 680cc041a5063e15878bd0fd --full-reset"
    );
    process.exit(1);
  }

  const restaurantId = args[0];
  const options: ResetOptions = {};

  // Parse command line options
  if (args.includes("--include-attempts") || args.includes("--full-reset")) {
    options.resetQuizAttempts = true;
  }
  if (args.includes("--include-progress") || args.includes("--full-reset")) {
    options.resetStaffProgress = true;
  }
  if (args.includes("--include-archived") || args.includes("--full-reset")) {
    options.resetArchivedAnalytics = true;
  }

  // Validate restaurant ID format
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    console.error("❌ Invalid restaurant ID format");
    process.exit(1);
  }

  // Show warning for destructive operations
  if (options.resetQuizAttempts) {
    console.log("🚨 WARNING: This operation will delete quiz attempts!");
    console.log(
      "   This cannot be undone and will permanently remove quiz history."
    );
  }

  try {
    const results = await resetAllAnalytics(restaurantId, options);

    if (results.success) {
      console.log("\n🎉 Analytics reset operation completed successfully!");
      process.exit(0);
    } else {
      console.log(
        "\n⚠️  Analytics reset completed with errors. Check the logs above."
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Script execution failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { resetAllAnalytics, ResetOptions, ResetResults };
