import { Worker, Job } from "bullmq";
import mongoose from "mongoose";
import { QUEUE_NAME, connectionOptions } from "../queues/menuImportQueue";
import MenuImportJobModel from "../models/MenuImportJobModel";
import MenuService from "../services/menuService"; // Assuming MenuService is a class with static methods
import {
  MenuImportJobData,
  IMenuImportJob,
  ImportResult,
} from "../types/menuUploadTypes";
import { IMenuImportJobDocument } from "../models/MenuImportJobModel";
import connectDB from "../utils/connectDB"; // Utility to connect to MongoDB

// Ensure DB is connected before worker starts processing
let dbConnected = false;
const ensureDBConnection = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
    console.log("MongoDB connected for MenuImportWorker");
  }
};

const concurrency = parseInt(
  process.env.MENU_IMPORT_WORKER_CONCURRENCY || "3",
  10
);

console.log(
  `BullMQ: Initializing ${QUEUE_NAME} worker with concurrency ${concurrency}...`
);

const worker = new Worker<
  MenuImportJobData,
  ImportResult | { error: string; message: string },
  string
>(
  QUEUE_NAME,
  async (
    job: Job<
      MenuImportJobData,
      ImportResult | { error: string; message: string },
      string
    >
  ) => {
    await ensureDBConnection();
    console.log(
      `BullMQ: Processing job ${job.id} for ${QUEUE_NAME}, data:`,
      job.data
    );

    const { menuImportJobDocumentId } = job.data;

    let menuImportJobDoc: IMenuImportJobDocument | null = null;

    try {
      menuImportJobDoc = await MenuImportJobModel.findById(
        menuImportJobDocumentId
      );

      if (!menuImportJobDoc) {
        throw new Error(
          `MenuImportJob document not found for ID: ${menuImportJobDocumentId}`
        );
      }

      if (menuImportJobDoc.status === "cancelled") {
        console.log(`Job ${job.id} was cancelled. Skipping processing.`);
        // Optionally update the job doc status to reflect it was acknowledged as cancelled by worker
        // menuImportJobDoc.status = 'cancelled_confirmed'; // Example status
        // await menuImportJobDoc.save();
        return {
          message: "Job processing skipped due to cancellation.",
          overallStatus: "failed",
          itemsProcessed: 0,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          itemsErrored: 0,
        }; // Return a valid ImportResult like structure
      }

      menuImportJobDoc.status = "processing";
      menuImportJobDoc.attempts = job.attemptsMade + 1; // BullMQ is 0-indexed for attemptsMade before current
      menuImportJobDoc.processedAt = new Date();
      await menuImportJobDoc.save();

      // Call the actual processing logic (extracted from MenuService._processMenuImportJob)
      // This method needs to exist and be callable, perhaps as a static method.
      // It should accept all necessary data, perform the import, and update the MenuImportJob document.
      const importResult = await MenuService.processQueuedMenuImport(
        menuImportJobDocumentId
      );

      // If processQueuedMenuImport updates the job document itself with the result, we might not need to do it here.
      // However, explicitly setting status based on result here is safer.
      // menuImportJobDoc.result = importResult;
      // menuImportJobDoc.status = importResult.overallStatus === 'failed' ? 'failed' : 'completed';
      // menuImportJobDoc.completedAt = new Date();
      // menuImportJobDoc.progress = 100;
      // await menuImportJobDoc.save();

      console.log(`BullMQ: Job ${job.id} for ${QUEUE_NAME} completed.`);
      return importResult; // The result will be stored on the BullMQ job object by default
    } catch (error: any) {
      console.error(
        `BullMQ: Error processing job ${job.id} for ${QUEUE_NAME}:`,
        error
      );
      if (menuImportJobDoc) {
        menuImportJobDoc.status = "failed";
        menuImportJobDoc.errorMessage =
          error.message || "Worker processing failed";
        menuImportJobDoc.errorDetails = error.stack;
        menuImportJobDoc.completedAt = new Date(); // Mark as completed even if failed
        await menuImportJobDoc.save();
      }
      // Rethrow to let BullMQ handle retry logic based on queue settings
      // The error will also be stored on the job object by BullMQ
      throw error;
    }
  },
  {
    connection: connectionOptions,
    concurrency: concurrency, // Number of jobs to process in parallel
    // autorun: false // If we want to start it manually later in server.ts
  }
);

worker.on("completed", (job: Job, result: any) => {
  console.log(
    `BullMQ: Job ${job.id} for ${QUEUE_NAME} has completed with result:`,
    result
  );
});

worker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(
    `BullMQ: Job ${job?.id} for ${QUEUE_NAME} has failed with error:`,
    err.message,
    err.stack
  );
});

worker.on("error", (err: Error) => {
  console.error(`BullMQ: Worker for ${QUEUE_NAME} encountered an error:`, err);
});

console.log(`BullMQ: ${QUEUE_NAME} worker event listeners attached.`);

// To gracefully shutdown the worker
process.on("SIGINT", async () => {
  console.log("SIGINT received, closing worker...");
  await worker.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing worker...");
  await worker.close();
  process.exit(0);
});

export default worker; // Export the worker instance if needed elsewhere, or just let it run
