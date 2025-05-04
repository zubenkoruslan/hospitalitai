import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Quiz from "./models/Quiz"; // Adjust path if necessary
import QuizResult from "./models/QuizResult"; // Adjust path if necessary

// Load environment variables from .env file in the server directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanupOrphanedResults() {
  console.log("🚀 Starting cleanup script...");

  if (!MONGODB_URI) {
    console.error("❌ Error: MONGODB_URI is not defined in the .env file.");
    process.exit(1);
  }

  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Database connected successfully.");

    // 1. Get all distinct quiz IDs from QuizResult collection
    console.log("Fetching distinct quiz IDs from QuizResults...");
    const resultQuizIds = await QuizResult.distinct("quizId");
    console.log(`Found ${resultQuizIds.length} distinct quiz IDs in results.`);

    // Explicitly filter non-ObjectId types and convert valid ones to strings for the Set
    const validResultQuizIdStrings = resultQuizIds
      .filter(
        (id): id is mongoose.Types.ObjectId =>
          id instanceof mongoose.Types.ObjectId
      )
      .map((id) => id.toString());
    const resultQuizIdSet = new Set(validResultQuizIdStrings);

    // 2. Get all existing quiz IDs from Quiz collection
    console.log("Fetching existing quiz IDs from Quizzes...");
    const existingQuizzes = await Quiz.find({}, "_id").lean();
    const existingQuizIdSet = new Set(
      existingQuizzes.map((quiz) => quiz._id.toString())
    );
    console.log(`Found ${existingQuizIdSet.size} existing quizzes.`);

    // 3. Identify orphaned quiz IDs
    const orphanedQuizIds = [...resultQuizIdSet].filter(
      (quizId) => quizId && !existingQuizIdSet.has(quizId)
    );

    if (orphanedQuizIds.length === 0) {
      console.log("✅ No orphaned quiz results found. Database is clean.");
    } else {
      console.warn(
        `🚨 Found ${orphanedQuizIds.length} orphaned quiz IDs:`,
        orphanedQuizIds
      );

      // Convert string IDs back to ObjectIds for the query
      const orphanedObjectIds = orphanedQuizIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      // 4. Delete orphaned QuizResult documents
      console.log("Deleting orphaned quiz results...");
      const deleteResult = await QuizResult.deleteMany({
        quizId: { $in: orphanedObjectIds },
      });

      console.log(
        `✅ Successfully deleted ${deleteResult.deletedCount} orphaned quiz result documents.`
      );
      if (deleteResult.deletedCount !== orphanedQuizIds.length) {
        console.warn(
          `Warning: Expected to delete ${orphanedQuizIds.length} results, but deleted ${deleteResult.deletedCount}. There might be duplicates or other issues.`
        );
      }
    }

    // --- Step 2: Clean up results for INACTIVE quizzes ---
    console.log(
      "\n🔎 Starting check for results linked to inactive quizzes..."
    );

    // 1. Find IDs of all inactive quizzes
    const inactiveQuizzes = await Quiz.find(
      { isAvailable: false },
      "_id"
    ).lean();
    const inactiveQuizIds = inactiveQuizzes.map((quiz) => quiz._id);

    if (inactiveQuizIds.length === 0) {
      console.log("✅ No inactive quizzes found.");
    } else {
      console.log(`Found ${inactiveQuizIds.length} inactive quizzes.`);

      // 2. Find pending/in-progress results linked to these inactive quizzes
      const deletableStatuses = ["pending", "in-progress"]; // Define statuses to clean up
      const inactiveResultsToDelete = await QuizResult.find(
        {
          quizId: { $in: inactiveQuizIds },
          status: { $in: deletableStatuses },
        },
        "_id quizId status"
      ).lean(); // Fetch info for logging

      if (inactiveResultsToDelete.length === 0) {
        console.log(
          "✅ No pending/in-progress results found for inactive quizzes."
        );
      } else {
        console.warn(
          `🚨 Found ${inactiveResultsToDelete.length} pending/in-progress results linked to inactive quizzes:`
        );
        // Optional: Log details of results being deleted
        // inactiveResultsToDelete.forEach(r => console.log(`  - Result ID: ${r._id}, Quiz ID: ${r.quizId}, Status: ${r.status}`));

        const inactiveResultObjectIds = inactiveResultsToDelete.map(
          (r) => r._id
        );

        // 3. Delete these results
        console.log(
          "Deleting pending/in-progress results for inactive quizzes..."
        );
        const deleteInactiveResult = await QuizResult.deleteMany({
          _id: { $in: inactiveResultObjectIds },
        });

        console.log(
          `✅ Successfully deleted ${deleteInactiveResult.deletedCount} pending/in-progress results for inactive quizzes.`
        );
        if (
          deleteInactiveResult.deletedCount !== inactiveResultsToDelete.length
        ) {
          console.warn(
            `Warning: Expected to delete ${inactiveResultsToDelete.length} inactive results, but deleted ${deleteInactiveResult.deletedCount}.`
          );
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Error during cleanup:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    console.log("Disconnecting from database...");
    await mongoose.disconnect();
    console.log("🔌 Database disconnected.");
    console.log("🏁 Cleanup script finished.");
  }
}

// Run the cleanup function
cleanupOrphanedResults();
