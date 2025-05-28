import { Queue } from "bullmq";
import { MenuImportJobData } from "../types/menuUploadTypes"; // We might need to define/refine this

const QUEUE_NAME = "menu-import";

// Default connection options (adjust if your Redis is different)
const connectionOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  // password: process.env.REDIS_PASSWORD, // Uncomment if your Redis has a password
};

// Define the type for the job data more explicitly if needed.
// For now, MenuImportJobData from menuUploadTypes.ts might suffice or need adjustment.
// interface MenuImportJobPayload {
//   jobId: string; // This would be the ID of the MenuImportJobModel document
//   // Potentially other data needed directly by the worker, if not fetching everything via jobId
// }

const menuImportQueue = new Queue<MenuImportJobData, any, string>(QUEUE_NAME, {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 1000, // Initial delay 1s, then 2s, 4s
    },
    removeOnComplete: {
      count: 100, // keep the last 100 completed jobs
      age: 24 * 3600, // keep for 24 hours
    },
    removeOnFail: {
      count: 1000, // keep the last 1000 failed jobs
      age: 7 * 24 * 3600, // keep for 7 days
    },
  },
});

console.log(`BullMQ: ${QUEUE_NAME} queue initialized.`);

export { menuImportQueue, QUEUE_NAME, connectionOptions };
