import mongoose from "mongoose";
import QuestionModel from "../models/QuestionModel";

async function activateWineQuestions() {
  try {
    await mongoose.connect(
      "mongodb://localhost:27017/hospitality-training?replicaSet=rs0"
    );
    console.log("Connected to MongoDB");

    // Find all pending wine questions
    const wineBankId = "683d81f51492d2933b724a37"; // Wine Bank ID
    const pendingWineQuestions = await QuestionModel.find({
      questionBankId: wineBankId,
      status: "pending_review",
    });

    console.log(
      `Found ${pendingWineQuestions.length} pending wine questions to activate`
    );

    if (pendingWineQuestions.length === 0) {
      console.log("No pending wine questions found to activate.");
      await mongoose.disconnect();
      return;
    }

    // Show a few examples
    console.log("\nSample questions to be activated:");
    pendingWineQuestions.slice(0, 3).forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.questionText.substring(0, 60)}...`);
    });

    // Activate all pending wine questions
    const result = await QuestionModel.updateMany(
      {
        questionBankId: wineBankId,
        status: "pending_review",
      },
      {
        $set: {
          status: "active",
        },
      }
    );

    console.log(
      `\n✅ Successfully activated ${result.modifiedCount} wine questions`
    );

    // Verify the change
    const activeWineQuestions = await QuestionModel.countDocuments({
      questionBankId: wineBankId,
      status: "active",
    });

    const remainingPending = await QuestionModel.countDocuments({
      questionBankId: wineBankId,
      status: "pending_review",
    });

    console.log(`\nFinal Wine Bank status:`);
    console.log(`  Active questions: ${activeWineQuestions}`);
    console.log(`  Pending questions: ${remainingPending}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  activateWineQuestions();
}

export default activateWineQuestions;
