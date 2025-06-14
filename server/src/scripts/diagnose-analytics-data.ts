import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/User";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import QuizAttemptModel from "../models/QuizAttempt";
import QuizModel from "../models/QuizModel";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";
import { KnowledgeCategory } from "../models/QuestionModel";

dotenv.config();

async function diagnoseAnalyticsData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      useUnifiedTopology: true,
    } as any);

    console.log("✅ Connected to MongoDB");
    console.log("🔍 Diagnosing analytics data for ruslan@mail.com...\n");

    // 1. Find the restaurant user
    const restaurantUser = await UserModel.findOne({
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

    // 2. Find all staff in this restaurant
    const staffUsers = await UserModel.find({
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

    // 3. Check UserKnowledgeAnalytics records
    const analyticsRecords = await UserKnowledgeAnalyticsModel.find({
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

    // 4. Check quiz attempts
    const quizAttempts = await QuizAttemptModel.find({
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
    }, {} as Record<string, any[]>);

    for (const [userId, attempts] of Object.entries(attemptsByUser)) {
      const user = staffUsers.find((s) => s._id.toString() === userId);
      console.log(
        `\n   🎮 Attempts by ${user?.name || "Unknown"} (${userId}):`
      );
      console.log(`      Total Attempts: ${attempts.length}`);

      attempts.forEach((attempt, index) => {
        console.log(
          `      ${index + 1}. Quiz: ${
            (attempt.quizId as any)?.title || "Unknown"
          }`
        );
        console.log(`         Score: ${attempt.score}%`);
        console.log(
          `         Questions: ${attempt.questionsPresented?.length || 0}`
        );
        console.log(`         Date: ${attempt.attemptDate}`);
      });
    }

    // 5. Get current analytics via service
    console.log(`\n🧮 Current Analytics Calculation:`);
    try {
      const currentAnalytics = await Promise.all(
        Object.values(KnowledgeCategory).map(async (category) => {
          const analytics =
            await KnowledgeAnalyticsService.getCategoryAnalytics(
              restaurantUser.restaurantId,
              category
            );
          return { category, analytics };
        })
      );

      currentAnalytics.forEach(({ category, analytics }) => {
        console.log(`\n   📋 ${category}:`);
        console.log(
          `      Average Accuracy: ${analytics.averageAccuracy.toFixed(1)}%`
        );
        console.log(`      Total Questions: ${analytics.totalQuestions}`);
        console.log(
          `      Staff Participating: ${analytics.totalStaffParticipating}`
        );
        console.log(
          `      30-Day Accuracy: ${analytics.last30DaysAccuracy.toFixed(1)}%`
        );
        console.log(
          `      Accuracy Trend: ${analytics.accuracyTrend.toFixed(1)}%`
        );
      });
    } catch (error) {
      console.error("Error getting analytics:", error);
    }

    // 6. Check for any data inconsistencies
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
