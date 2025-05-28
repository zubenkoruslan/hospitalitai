import mongoose, { Schema, Document, Model, Types } from "mongoose";
import {
  ParsedMenuItem,
  ImportResultItemDetail,
} from "../types/menuUploadTypes";

export interface IMenuImportJob extends Document {
  restaurantId: Types.ObjectId;
  userId: Types.ObjectId;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "partial_completion";
  filePath: string; // Path to the original uploaded file (PDF)
  previewId: string; // From the preview step
  parsedMenuName?: string;
  targetMenuId?: string;
  replaceAllItems?: boolean;
  itemsToImport: ParsedMenuItem[]; // The full array of items with user decisions

  totalItemsInRequest: number;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsErrored: number;
  errorDetails: ImportResultItemDetail[];
  resultSummaryMessage?: string;
  errorReportCsv?: string; // CSV string for errors
  menuId?: string; // ID of the menu processed/created
  finalMenuName?: string;

  lastHeartbeat?: Date; // For tracking if a job is still alive if using a simple queue
  startedAt?: Date;
  completedAt?: Date;
  processingErrors?: string[]; // For errors during the job processing itself, not item errors

  // Timestamps (added by Mongoose schema option)
  createdAt?: Date;
  updatedAt?: Date;
}

const MenuImportJobSchema: Schema<IMenuImportJob> = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "partial_completion",
      ],
      default: "pending",
      required: true,
      index: true,
    },
    filePath: { type: String, required: true },
    previewId: { type: String, required: true, index: true },
    parsedMenuName: { type: String },
    targetMenuId: { type: String }, // Could be ObjectId string
    replaceAllItems: { type: Boolean, default: false },
    itemsToImport: { type: [Object], required: true }, // Array of ParsedMenuItem (stored as generic objects)

    totalItemsInRequest: { type: Number, default: 0 },
    itemsProcessed: { type: Number, default: 0 },
    itemsCreated: { type: Number, default: 0 },
    itemsUpdated: { type: Number, default: 0 },
    itemsSkipped: { type: Number, default: 0 },
    itemsErrored: { type: Number, default: 0 },
    errorDetails: { type: [Object], default: [] }, // Array of ImportResultItemDetail (stored as generic objects)
    resultSummaryMessage: { type: String },
    errorReportCsv: { type: String },
    menuId: { type: String }, // Store as string, can be ObjectId string
    finalMenuName: { type: String },

    lastHeartbeat: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    processingErrors: { type: [String], default: [] },

    // Timestamps (added by Mongoose schema option)
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true } // Adds createdAt, updatedAt
);

// Index for querying active jobs
MenuImportJobSchema.index({ status: 1, restaurantId: 1 });
MenuImportJobSchema.index({ userId: 1, createdAt: -1 }); // For users to see their recent jobs

const MenuImportJob: Model<IMenuImportJob> =
  mongoose.models.MenuImportJob ||
  mongoose.model<IMenuImportJob>("MenuImportJob", MenuImportJobSchema);

export default MenuImportJob;
