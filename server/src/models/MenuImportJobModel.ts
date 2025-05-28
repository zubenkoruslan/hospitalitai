import mongoose, { Schema, Document, Model } from "mongoose";
import { IMenuImportJob } from "../types/menuUploadTypes"; // Assuming IMenuImportJob is correctly defined here

// Create a new interface that extends IMenuImportJob and mongoose.Document
export interface IMenuImportJobDocument extends IMenuImportJob, Document {}

const MenuImportJobSchema: Schema<IMenuImportJobDocument> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Assuming you have a User model
      required: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant", // Assuming you have a Restaurant model
      required: true,
    },
    originalFilePath: {
      type: String,
      required: true,
    },
    parsedMenuName: {
      type: String,
    },
    targetMenuId: {
      type: Schema.Types.ObjectId,
      ref: "Menu", // Assuming you have a Menu model
    },
    replaceAllItems: {
      type: Boolean,
      default: false,
    },
    itemsToImport: [
      {
        // This will store the ParsedMenuItem structure directly.
        // Mongoose can store complex objects.
        // Consider if any fields within ParsedMenuItem need specific schema types or refs.
        // For simplicity now, we'll store it as Mixed, but for production, define sub-schema if needed.
        type: Schema.Types.Mixed, // Or define a sub-schema for ParsedMenuItem
      },
    ],
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "partial_success",
      ],
      default: "pending",
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    result: {
      // This will store the ImportResult structure directly.
      // Similar to itemsToImport, consider a sub-schema for production robustness.
      type: Schema.Types.Mixed, // Or define a sub-schema for ImportResult
    },
    errorMessage: {
      type: String,
    },
    errorDetails: {
      type: Schema.Types.Mixed, // For storing stack trace or other complex error info
    },
    attempts: {
      type: Number,
      default: 0,
      required: true,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// Indexing suggestions (add more as needed based on query patterns)
MenuImportJobSchema.index({ userId: 1, status: 1 });
MenuImportJobSchema.index({ restaurantId: 1, status: 1 });
MenuImportJobSchema.index({ status: 1, createdAt: -1 });

const MenuImportJobModel: Model<IMenuImportJobDocument> =
  mongoose.models.MenuImportJob ||
  mongoose.model<IMenuImportJobDocument>("MenuImportJob", MenuImportJobSchema);

export default MenuImportJobModel;
