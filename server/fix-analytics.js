const mongoose = require("mongoose");
require("dotenv").config();

async function fixAnalyticsData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log("🔧 Fixing analytics data for ruslan@mail.com restaurant...\n");

    // Get models
    const User = mongoose.model("User");
    const UserKnowledgeAnalytics = mongoose.model("UserKnowledgeAnalytics");
    const QuizAttempt = mongoose.model("QuizAttempt");

    // Find the restaurant
    const restaurantUser = await User.findOne({
      email: "ruslan@mail.com",
      role: "restaurant",
    });

    if (!restaurantUser || !restaurantUser.restaurantId) {
      console.log("❌ Restaurant user not found");
      return;
    }

    const restaurantId = restaurantUser.restaurantId;
    console.log(`🏢 Restaurant ID: ${restaurantId}`);

    // Find all staff in this restaurant
    const staffUsers = await User.find({
      restaurantId: restaurantId,
      role: "staff",
    });

    console.log(`👥 Found ${staffUsers.length} staff members`);

    // Check which staff have analytics records
    const existingAnalytics = await UserKnowledgeAnalytics.find({
      restaurantId: restaurantId,
    });

    console.log("📊 Current Analytics Status:");
    for (const staff of staffUsers) {
      const hasAnalytics = existingAnalytics.find(
        (a) => a.userId.toString() === staff._id.toString()
      );
      console.log(
        `   ${staff.name}: ${hasAnalytics ? "✅" : "❌"} Analytics Record`
      );
    }

    // Create analytics records for staff that don't have them
    console.log(`\n🔄 Creating missing analytics records...`);

    for (const staff of staffUsers) {
      const hasAnalytics = existingAnalytics.find(
        (a) => a.userId.toString() === staff._id.toString()
      );

      if (!hasAnalytics) {
        console.log(`   Creating analytics record for ${staff.name}...`);

        const newAnalytics = new UserKnowledgeAnalytics({
          userId: staff._id,
          restaurantId: restaurantId,
        });

        await newAnalytics.save();
        console.log(`   ✅ Created analytics record for ${staff.name}`);
      }
    }

    // Verify the fix worked
    console.log(`\n🔍 Verifying fixes...`);
    const updatedAnalytics = await UserKnowledgeAnalytics.find({
      restaurantId: restaurantId,
    });

    console.log("📈 Updated Analytics Status:");
    for (const staff of staffUsers) {
      const analytics = updatedAnalytics.find(
        (a) => a.userId.toString() === staff._id.toString()
      );

      if (analytics) {
        console.log(`   ✅ ${staff.name}:`);
        console.log(
          `      Total Questions: ${analytics.totalQuestionsAnswered}`
        );
        console.log(
          `      Overall Accuracy: ${analytics.overallAccuracy.toFixed(1)}%`
        );
        console.log(
          `      Food: ${analytics.foodKnowledge.totalQuestions} questions`
        );
        console.log(
          `      Beverage: ${analytics.beverageKnowledge.totalQuestions} questions`
        );
        console.log(
          `      Wine: ${analytics.wineKnowledge.totalQuestions} questions`
        );
        console.log(
          `      Procedures: ${analytics.proceduresKnowledge.totalQuestions} questions`
        );
      } else {
        console.log(`   ❌ ${staff.name}: Still missing analytics record`);
      }
    }

    console.log(`\n✅ Analytics data fix completed!`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

fixAnalyticsData();
