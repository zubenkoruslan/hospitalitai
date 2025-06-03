const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

async function testAnalytics() {
  try {
    await mongoose.connect("mongodb://localhost:27017/hospitality-training");

    // Import the actual model
    const QuizAttempt = require("./src/models/QuizAttempt.js").default;

    const restaurantId = new ObjectId("6833a77e12eda941e14d71df");

    console.log("Testing enhanced analytics with actual Mongoose model...");

    // Test basic count with mongoose model
    const totalAttempts = await QuizAttempt.countDocuments({ restaurantId });
    console.log("Total attempts for restaurant (via model):", totalAttempts);

    // Test the aggregation with mongoose model
    const overallAverageScoreResult = await QuizAttempt.aggregate([
      { $match: { restaurantId } },
      {
        $match: {
          score: { $exists: true, $gte: 0 },
          questionsPresented: { $exists: true, $ne: [] },
        },
      },
      {
        $addFields: {
          percentageScore: {
            $cond: {
              if: { $gt: [{ $size: "$questionsPresented" }, 0] },
              then: {
                $multiply: [
                  { $divide: ["$score", { $size: "$questionsPresented" }] },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
      { $group: { _id: null, avgPercentage: { $avg: "$percentageScore" } } },
    ]);

    console.log(
      "Overall average score result (via model):",
      overallAverageScoreResult
    );

    // Test individual records
    const sampleAttempts = await QuizAttempt.find({ restaurantId })
      .limit(3)
      .select("score questionsPresented staffUserId");
    console.log(
      "Sample attempts via model:",
      sampleAttempts.map((a) => ({
        score: a.score,
        questionsPresented: a.questionsPresented?.length,
        staffUserId: a.staffUserId,
      }))
    );

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testAnalytics();
