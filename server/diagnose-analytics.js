const mongoose = require("mongoose");
require("dotenv").config();

async function diagnoseAnalyticsData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log("🔍 Diagnosing analytics data for ruslan@mail.com...\n");

    // Find the restaurant user
    const User = mongoose.model("User");
    const restaurantUser = await User.findOne({
      email: "ruslan@mail.com",
      role: "restaurant",
    });

    if (!restaurantUser) {
      console.log("❌ Restaurant user ruslan@mail.com not found");
      return;
    }

    console.log("👤 Restaurant User Found:");
    console.log(`   ID: ${restaurantUser._id}`);
    console.log(`   Name: ${restaurantUser.name}`);
    console.log(`   Restaurant ID: ${restaurantUser.restaurantId}\n`);

    // Find all staff in this restaurant
    const staffUsers = await User.find({
      restaurantId: restaurantUser.restaurantId,
      role: "staff",
    });

    console.log("👥 Staff Members:");
    console.log(`   Total Staff: ${staffUsers.length}`);
    staffUsers.forEach((staff, index) => {
      console.log(
        `   ${index + 1}. ${staff.name} (${staff.email}) - ID: ${staff._id}`
      );
    });
    console.log("");

    // Check UserKnowledgeAnalytics records
    const UserKnowledgeAnalytics = mongoose.model("UserKnowledgeAnalytics");
    const analyticsRecords = await UserKnowledgeAnalytics.find({
      restaurantId: restaurantUser.restaurantId,
    });

    console.log("📊 User Analytics Records:");
    console.log(`   Total Records: ${analyticsRecords.length}`);

    for (const record of analyticsRecords) {
      const user = staffUsers.find(
        (s) => s._id.toString() === record.userId.toString()
      );
      console.log(
        `\n   📈 Analytics for ${user?.name || "Unknown"} (${record.userId}):`
      );
      console.log(
        `      Total Questions Answered: ${record.totalQuestionsAnswered}`
      );
      console.log(
        `      Overall Accuracy: ${record.overallAccuracy.toFixed(1)}%`
      );
      console.log(`      Last Updated: ${record.lastUpdated}`);

      console.log(`      📚 Knowledge Categories:`);
      console.log(
        `         Food: ${
          record.foodKnowledge.totalQuestions
        } questions, ${record.foodKnowledge.accuracy.toFixed(1)}% accuracy`
      );
      console.log(
        `         Beverage: ${
          record.beverageKnowledge.totalQuestions
        } questions, ${record.beverageKnowledge.accuracy.toFixed(1)}% accuracy`
      );
      console.log(
        `         Wine: ${
          record.wineKnowledge.totalQuestions
        } questions, ${record.wineKnowledge.accuracy.toFixed(1)}% accuracy`
      );
      console.log(
        `         Procedures: ${
          record.proceduresKnowledge.totalQuestions
        } questions, ${record.proceduresKnowledge.accuracy.toFixed(
          1
        )}% accuracy`
      );
    }

    // Check quiz attempts
    const QuizAttempt = mongoose.model("QuizAttempt");
    const quizAttempts = await QuizAttempt.find({
      restaurantId: restaurantUser.restaurantId,
    }).populate("quizId", "title");

    console.log(`\n🎯 Quiz Attempts:`);
    console.log(`   Total Attempts: ${quizAttempts.length}`);

    // Group by user
    const attemptsByUser = quizAttempts.reduce((acc, attempt) => {
      const userId = attempt.staffUserId.toString();
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(attempt);
      return acc;
    }, {});

    for (const [userId, attempts] of Object.entries(attemptsByUser)) {
      const user = staffUsers.find((s) => s._id.toString() === userId);
      console.log(
        `\n   🎮 Attempts by ${user?.name || "Unknown"} (${userId}):`
      );
      console.log(`      Total Attempts: ${attempts.length}`);

      attempts.forEach((attempt, index) => {
        console.log(
          `      ${index + 1}. Quiz: ${attempt.quizId?.title || "Unknown"}`
        );
        console.log(`         Score: ${attempt.score}%`);
        console.log(
          `         Questions: ${attempt.questionsPresented?.length || 0}`
        );
        console.log(`         Date: ${attempt.attemptDate}`);
      });
    }

    // Check for data inconsistencies
    console.log(`\n🔍 Data Consistency Check:`);

    // Check if analytics records match staff count
    const staffWithoutAnalytics = staffUsers.filter(
      (staff) =>
        !analyticsRecords.find(
          (record) => record.userId.toString() === staff._id.toString()
        )
    );

    if (staffWithoutAnalytics.length > 0) {
      console.log(`   ⚠️  Staff without analytics records:`);
      staffWithoutAnalytics.forEach((staff) => {
        console.log(`      - ${staff.name} (${staff.email})`);
      });
    } else {
      console.log(`   ✅ All staff have analytics records`);
    }

    // Check if quiz attempts have corresponding analytics updates
    const userIdsWithAttempts = new Set(
      quizAttempts.map((a) => a.staffUserId.toString())
    );
    const userIdsWithAnalytics = new Set(
      analyticsRecords.map((r) => r.userId.toString())
    );

    const attemptsWithoutAnalytics = [...userIdsWithAttempts].filter(
      (id) => !userIdsWithAnalytics.has(id)
    );
    if (attemptsWithoutAnalytics.length > 0) {
      console.log(`   ⚠️  Users with quiz attempts but no analytics:`);
      attemptsWithoutAnalytics.forEach((userId) => {
        const user = staffUsers.find((s) => s._id.toString() === userId);
        console.log(`      - ${user?.name || "Unknown"} (${userId})`);
      });
    } else {
      console.log(`   ✅ All users with quiz attempts have analytics records`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

diagnoseAnalyticsData();
