const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

async function testAnalytics() {
  try {
    await mongoose.connect("mongodb://localhost:27017/hospitality-training");
    const db = mongoose.connection.db;
    const restaurantId = new ObjectId("6833a77e12eda941e14d71df");

    console.log("Testing enhanced analytics aggregation...");

    // Test basic count
    const totalAttempts = await db
      .collection("quizattempts")
      .countDocuments({ restaurantId });
    console.log("Total attempts for restaurant:", totalAttempts);

    // Test the aggregation
    const overallAverageScoreResult = await db
      .collection("quizattempts")
      .aggregate([
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
      ])
      .toArray();

    console.log("Overall average score result:", overallAverageScoreResult);

    // Test individual scores
    const individualScores = await db
      .collection("quizattempts")
      .aggregate([
        { $match: { restaurantId } },
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
        {
          $project: {
            staffUserId: 1,
            score: 1,
            questionsPresented: { $size: "$questionsPresented" },
            percentageScore: 1,
          },
        },
        { $limit: 5 },
      ])
      .toArray();

    console.log("Sample individual scores:", individualScores);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testAnalytics();
