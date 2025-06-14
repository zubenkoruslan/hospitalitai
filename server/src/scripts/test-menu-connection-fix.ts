import mongoose from "mongoose";
import dotenv from "dotenv";
import { updateQuestionBankService } from "../services/questionBankService";
import QuestionBankModel from "../models/QuestionBankModel";
import QuestionModel from "../models/QuestionModel";

dotenv.config();

/**
 * Test script to verify that changing menu connections properly clears questions
 */
async function testMenuConnectionFix() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!, {
      useUnifiedTopology: true,
    } as any);

    console.log("✅ Connected to MongoDB");

    // Find a question bank with menu connection that has questions
    const testBank = await QuestionBankModel.findOne({
      sourceType: "MENU",
      sourceMenuId: { $exists: true, $ne: null },
    }).populate("questions");

    if (!testBank) {
      console.log(
        "❌ No suitable test bank found. Need a MENU-type bank with questions."
      );
      return;
    }

    console.log(`🔍 Testing with bank: ${testBank.name}`);
    console.log(`📋 Current questions count: ${testBank.questions.length}`);
    console.log(`🍽️ Current menu ID: ${testBank.sourceMenuId}`);

    // Count questions in database before update
    const questionsBefore = await QuestionModel.countDocuments({
      questionBankId: testBank._id,
      restaurantId: testBank.restaurantId,
    });

    console.log(`📊 Questions in database before: ${questionsBefore}`);

    // Update to a different menu (or null for testing)
    const updatedBank = await updateQuestionBankService(
      testBank._id.toString(),
      testBank.restaurantId,
      {
        sourceMenuId: null, // Remove menu connection to test clearing
      }
    );

    if (!updatedBank) {
      console.log("❌ Failed to update bank");
      return;
    }

    // Count questions in database after update
    const questionsAfter = await QuestionModel.countDocuments({
      questionBankId: testBank._id,
      restaurantId: testBank.restaurantId,
    });

    console.log(`📊 Questions in database after: ${questionsAfter}`);
    console.log(
      `📋 Questions array length after: ${updatedBank.questions.length}`
    );

    // Verify questions were cleared
    if (questionsAfter === 0 && updatedBank.questions.length === 0) {
      console.log(
        "✅ SUCCESS: Questions were properly cleared when menu connection changed"
      );
    } else {
      console.log("❌ FAILURE: Questions were not properly cleared");
      console.log(
        `  - Expected 0 questions in database, got ${questionsAfter}`
      );
      console.log(
        `  - Expected 0 questions in array, got ${updatedBank.questions.length}`
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMenuConnectionFix().catch(console.error);
}

export { testMenuConnectionFix };
