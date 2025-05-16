import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IQuestionBank extends Document {
  name: string;
  description?: string;
  categories: string[];
  targetQuestionCount?: number;
  questions: Types.ObjectId[];
  restaurantId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const QuestionBankSchema: Schema<IQuestionBank> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Question bank name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
      index: true, // Added index for faster searching by name for a restaurant
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    categories: {
      type: [String],
      default: [],
    },
    targetQuestionCount: {
      type: Number,
      min: [0, "Target question count cannot be negative"],
      default: 0,
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for typical queries
QuestionBankSchema.index({ restaurantId: 1, name: 1 });

const QuestionBankModel: Model<IQuestionBank> = mongoose.model<IQuestionBank>(
  "QuestionBank",
  QuestionBankSchema
);

export default QuestionBankModel;
