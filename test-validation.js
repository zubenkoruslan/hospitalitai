const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/hospitality-test", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import the Question model
const QuestionModel = require("./server/src/models/QuestionModel").default;
const { KnowledgeCategory } = require("./server/src/models/QuestionModel");

async function testQuestionCreation() {
  try {
    console.log("Testing question creation with required fields...");

    const testQuestion = new QuestionModel({
      questionText: "What is the capital of France?",
      questionType: "multiple-choice-single",
      options: [
        { text: "Paris", isCorrect: true },
        { text: "London", isCorrect: false },
        { text: "Berlin", isCorrect: false },
        { text: "Madrid", isCorrect: false },
      ],
      categories: ["geography"],
      restaurantId: new mongoose.Types.ObjectId(),
      questionBankId: new mongoose.Types.ObjectId(),
      createdBy: "manual",
      knowledgeCategory: KnowledgeCategory.FOOD_KNOWLEDGE,
      knowledgeCategoryAssignedBy: "manual",
      knowledgeCategoryAssignedAt: new Date(),
    });

    const savedQuestion = await testQuestion.save();
    console.log("✅ Question created successfully!");
    console.log("Question ID:", savedQuestion._id);

    // Clean up
    await QuestionModel.findByIdAndDelete(savedQuestion._id);
    console.log("✅ Test question cleaned up");
  } catch (error) {
    console.error("❌ Validation error:", error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach((key) => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed");
  }
}

testQuestionCreation();
