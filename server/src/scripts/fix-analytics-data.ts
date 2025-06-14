import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/User";
import UserKnowledgeAnalyticsModel from "../models/UserKnowledgeAnalytics";
import QuizAttemptModel from "../models/QuizAttempt";
import { KnowledgeAnalyticsService } from "../services/knowledgeAnalyticsService";

dotenv.config();

async function fixAnalyticsData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      useUnifiedTopology: true,
    } as any);

    console.log("✅ Connected to MongoDB");
    console.log("🔧 Fixing analytics data for ruslan@mail.com restaurant...\n");

    // Find the restaurant
    const restaurantUser = await UserModel.findOne({
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
    const staffUsers = await UserModel.find({
      restaurantId: restaurantId,
      role: "staff",
    });

    console.log(`👥 Found ${staffUsers.length} staff members`);

    // Find all quiz attempts for this restaurant
    const quizAttempts = await QuizAttemptModel.find({
      restaurantId: restaurantId,
    }).populate({
      path: "questionsPresented.questionId",
      select: "knowledgeCategory",
    });

    console.log(`🎯 Found ${quizAttempts.length} quiz attempts\n`);

    // Check which staff have analytics records
    const existingAnalytics = await UserKnowledgeAnalyticsModel.find({
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

    // Process each quiz attempt to ensure analytics are updated
    console.log(`\n🔄 Processing quiz attempts...`);

    for (const attempt of quizAttempts) {
      console.log(
        `   Processing attempt by ${attempt.staffUserId} for quiz ${attempt.quizId}`
      );

      try {
        await KnowledgeAnalyticsService.updateAnalyticsOnQuizCompletion(
          attempt.staffUserId,
          restaurantId,
          attempt._id
        );
        console.log(`   ✅ Analytics updated for attempt ${attempt._id}`);
      } catch (error) {
        console.error(
          `   ❌ Failed to update analytics for attempt ${attempt._id}:`,
          error
        );
      }
    }

    // Verify the fix worked
    console.log(`\n🔍 Verifying fixes...`);
    const updatedAnalytics = await UserKnowledgeAnalyticsModel.find({
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

    // Test the analytics service output
    console.log(`\n🧮 Testing Analytics Service Output:`);
    try {
      const categoriesData = await Promise.all(
        [
          "food-knowledge",
          "beverage-knowledge",
          "wine-knowledge",
          "procedures-knowledge",
        ].map(async (category) => {
          const analytics =
            await KnowledgeAnalyticsService.getCategoryAnalytics(
              restaurantId,
              category as any
            );
          return { category, analytics };
        })
      );

      categoriesData.forEach(({ category, analytics }) => {
        console.log(`\n   📋 ${category}:`);
        console.log(
          `      Average Accuracy: ${analytics.averageAccuracy.toFixed(1)}%`
        );
        console.log(`      Total Questions: ${analytics.totalQuestions}`);
        console.log(
          `      Staff Participating: ${analytics.totalStaffParticipating}`
        );
      });
    } catch (error) {
      console.error("Error testing analytics service:", error);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

fixAnalyticsData();
