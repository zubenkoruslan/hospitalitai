import mongoose from "mongoose";
import connectDB from "../utils/connectDB";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";

/**
 * Test script to verify category champions functionality
 */
async function testCategoryChampions() {
  try {
    await connectDB();
    console.log("🔌 Connected to MongoDB");

    const restaurantId = new mongoose.Types.ObjectId(
      "680cc041a5063e15878bd0fd"
    );

    console.log("\n🔍 Testing Category Champions Logic...\n");

    // Get all staff analytics for this restaurant
    const staffAnalytics = await UserKnowledgeAnalyticsModel.find({
      restaurantId,
    })
      .populate("userId", "name")
      .lean();

    console.log(
      `📊 Found ${staffAnalytics.length} staff with analytics data\n`
    );

    // Test the category champions logic
    const categories = [
      { key: "foodKnowledge", enum: "food-knowledge" as const },
      { key: "beverageKnowledge", enum: "beverage-knowledge" as const },
      { key: "wineKnowledge", enum: "wine-knowledge" as const },
      { key: "proceduresKnowledge", enum: "procedures-knowledge" as const },
    ];

    for (const category of categories) {
      console.log(`\n🏆 ${category.key.toUpperCase()}:`);

      // Get all staff analytics for this category
      const categoryStaff = staffAnalytics.filter(
        (analytics) => (analytics as any)[category.key].totalQuestions > 0
      );

      console.log(
        `   Staff with ${category.key} data: ${categoryStaff.length}`
      );

      if (categoryStaff.length === 0) {
        console.log(`   ❌ No staff has answered questions in this category`);
        continue;
      }

      // Show all staff performance in this category
      categoryStaff.forEach((analytics, index) => {
        const categoryStats = (analytics as any)[category.key];
        const user = analytics.userId as any;
        console.log(
          `   ${index + 1}. ${user.name}: ${categoryStats.accuracy.toFixed(
            1
          )}% (${categoryStats.totalQuestions} questions)`
        );
      });

      // Find the champion (highest accuracy with at least 3 questions)
      const qualifiedStaff = categoryStaff.filter(
        (analytics) => (analytics as any)[category.key].totalQuestions >= 3
      );

      console.log(`   Staff with 3+ questions: ${qualifiedStaff.length}`);

      if (qualifiedStaff.length === 0) {
        console.log(`   ❌ No staff meets minimum 3 questions requirement`);
        continue;
      }

      const champion = qualifiedStaff.sort(
        (a, b) =>
          (b as any)[category.key].accuracy - (a as any)[category.key].accuracy
      )[0];

      if (champion) {
        const categoryStats = (champion as any)[category.key];
        const user = champion.userId as any;

        console.log(`   🥇 CHAMPION: ${user.name}`);
        console.log(`      - Accuracy: ${categoryStats.accuracy.toFixed(1)}%`);
        console.log(`      - Questions: ${categoryStats.totalQuestions}`);
        console.log(
          `      - Avg Time: ${categoryStats.averageCompletionTime || 0}s`
        );
      }
    }

    console.log("\n✅ Category champions test completed!");
  } catch (error) {
    console.error("❌ Error testing category champions:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the test if called directly
if (require.main === module) {
  testCategoryChampions();
}

export { testCategoryChampions };
