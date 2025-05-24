import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Interface for individual categories within an SOP document
export interface ISopCategory {
  name: string;
  content: string;
  startOffset?: number; // Optional: Character offset in the full extracted text
  endOffset?: number; // Optional: Character offset in the full extracted text
}

// Interface for the SopDocument document
export interface ISopDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  originalFileName: string;
  storagePath: string; // Path where the original file is stored
  fileType: "pdf" | "docx" | "txt" | "md"; // Supported file types
  restaurantId: Types.ObjectId; // Reference to the Restaurant model
  status: "uploaded" | "parsing" | "categorizing" | "processed" | "error";
  uploadedAt: Date;
  updatedAt: Date;
  extractedText?: string; // Full text extracted from the document (can be large)
  categories: ISopCategory[];
  errorMessage?: string; // To store any error message during processing
}

const SopCategorySchema: Schema<ISopCategory> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Category content is required"],
    },
    startOffset: {
      type: Number,
    },
    endOffset: {
      type: Number,
    },
  },
  { _id: false } // No separate _id for category subdocuments
);

const SopDocumentSchema: Schema<ISopDocument> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
    },
    originalFileName: {
      type: String,
      required: [true, "Original file name is required"],
    },
    storagePath: {
      type: String,
      required: [true, "Storage path is required"],
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
      enum: ["pdf", "docx", "txt", "md"],
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "Restaurant ID is required"],
      index: true,
    },
    status: {
      type: String,
      required: [true, "Document status is required"],
      enum: ["uploaded", "parsing", "categorizing", "processed", "error"],
      default: "uploaded",
    },
    extractedText: {
      type: String,
    },
    categories: {
      type: [SopCategorySchema],
      default: [],
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Index for efficient querying by restaurant and status
SopDocumentSchema.index({ restaurantId: 1, status: 1 });
SopDocumentSchema.index({ restaurantId: 1, title: 1 });

const SopDocumentModel: Model<ISopDocument> =
  mongoose.models.SopDocument ||
  mongoose.model<ISopDocument>("SopDocument", SopDocumentSchema);

export default SopDocumentModel;
