import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Interface for individual categories within an SOP document
export interface ISopCategory {
  _id?: Types.ObjectId; // Optional: Mongoose might add this if not _id: false, let's allow it
  name: string;
  content: string;
  startOffset?: number; // Optional: Character offset in the full extracted text
  endOffset?: number; // Optional: Character offset in the full extracted text
  subCategories?: ISopCategory[]; // Recursive definition for sub-categories
}

// Enum for Question Generation Status
export enum QuestionGenerationStatus {
  NONE = "NONE",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
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
  description?: string; // Added description
  // Fields for question bank integration
  questionGenerationStatus: QuestionGenerationStatus;
  questionBankId?: Types.ObjectId | null; // Nullable reference to QuestionBank
}

const SopCategorySchema: Schema<ISopCategory> = new Schema({
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
});

// Must define the schema before referencing it recursively
SopCategorySchema.add({
  subCategories: {
    type: [SopCategorySchema],
    default: [],
  },
});

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
    description: {
      type: String,
      trim: true,
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
    // Fields for question bank integration
    questionGenerationStatus: {
      type: String,
      enum: Object.values(QuestionGenerationStatus),
      default: QuestionGenerationStatus.NONE,
    },
    questionBankId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionBank",
      default: null,
      index: true, // Add index if you query by this often
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
