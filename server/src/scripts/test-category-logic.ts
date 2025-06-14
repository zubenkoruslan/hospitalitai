import mongoose from "mongoose";
import connectDB from "../utils/connectDB";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";

/**
 * Test the category logic for Misha's analytics
 */
async function testCategoryLogic() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    const restaurantId = new mongoose.Types.ObjectId(
      "680cc041a5063e15878bd0fd"
    );
    const mishaUserId = new mongoose.Types.ObjectId("680cc136a5063e15878bd11e");

    // Get Misha's analytics
    const mishaAnalytics = await UserKnowledgeAnalyticsModel.findOne({
      restaurantId,
      userId: mishaUserId,
    }).lean();

    if (!mishaAnalytics) {
      console.log("❌ No analytics found for Misha");
      return;
    }

    console.log("\n📊 Misha's Current Analytics:");
    console.log(
      `   Food Knowledge: ${
        mishaAnalytics.foodKnowledge.totalQuestions
      } questions, ${mishaAnalytics.foodKnowledge.accuracy.toFixed(
        1
      )}% accuracy`
    );
    console.log(
      `   Beverage Knowledge: ${
        mishaAnalytics.beverageKnowledge.totalQuestions
      } questions, ${mishaAnalytics.beverageKnowledge.accuracy.toFixed(
        1
      )}% accuracy`
    );
    console.log(
      `   Wine Knowledge: ${
        mishaAnalytics.wineKnowledge.totalQuestions
      } questions, ${mishaAnalytics.wineKnowledge.accuracy.toFixed(
        1
      )}% accuracy`
    );
    console.log(
      `   Procedures Knowledge: ${
        mishaAnalytics.proceduresKnowledge.totalQuestions
      } questions, ${mishaAnalytics.proceduresKnowledge.accuracy.toFixed(
        1
      )}% accuracy`
    );

    // Test the category logic using private methods (we'll access them through reflection)
    const service = KnowledgeAnalyticsService as any;

    const strongestCategory = service.getStrongestCategory(mishaAnalytics);
    const weakestCategory = service.getWeakestCategory(mishaAnalytics);

    console.log("\n🎯 Category Analysis Results:");
    console.log(`   Strongest Category: ${strongestCategory}`);
    console.log(`   Weakest Category: ${weakestCategory}`);

    // Expected results
    console.log("\n✅ Expected Results:");
    console.log(
      `   Strongest Category should be: food-knowledge (only active category)`
    );
    console.log(
      `   Weakest Category should be: food-knowledge (only active category)`
    );

    // Test enhanced analytics
    console.log("\n🔄 Testing Enhanced Analytics...");
    const enhancedAnalytics =
      await KnowledgeAnalyticsService.getRestaurantAnalytics(restaurantId);

    console.log("\n👥 Top Performers:");
    enhancedAnalytics.topPerformers.forEach((performer, index) => {
      console.log(
        `   ${index + 1}. ${performer.userName} - Strongest: ${
          performer.strongestCategory
        } (${performer.overallAccuracy.toFixed(1)}%)`
      );
    });

    console.log("\n⚠️  Staff Needing Support:");
    if (enhancedAnalytics.staffNeedingSupport.length === 0) {
      console.log("   None (correctly filtered out single-category staff)");
    } else {
      enhancedAnalytics.staffNeedingSupport.forEach((staff, index) => {
        console.log(
          `   ${index + 1}. ${staff.userName} - Weakest: ${
            staff.weakestCategory
          } (${staff.overallAccuracy.toFixed(1)}%)`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error testing category logic:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the test if called directly
if (require.main === module) {
  testCategoryLogic().catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
}

export { testCategoryLogic };
