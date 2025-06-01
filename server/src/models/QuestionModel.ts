import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type QuestionType =
  | "multiple-choice-single"
  | "multiple-choice-multiple"
  | "true-false";

// NEW: Knowledge Category enum
export enum KnowledgeCategory {
  FOOD_KNOWLEDGE = "food-knowledge",
  BEVERAGE_KNOWLEDGE = "beverage-knowledge",
  WINE_KNOWLEDGE = "wine-knowledge",
  PROCEDURES_KNOWLEDGE = "procedures-knowledge",
}

export interface IOption extends Document {
  text: string;
  isCorrect: boolean;
  _id: Types.ObjectId;
}

const OptionSchema: Schema<IOption> = new Schema(
  {
    text: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, required: true, default: false },
  },
  { _id: true }
);

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  questionText: string;
  questionType: QuestionType;
  options: Types.Array<IOption>;
  categories: string[];
  restaurantId: Types.ObjectId;
  questionBankId: Types.ObjectId;
  sopDocumentId?: Types.ObjectId;
  sopCategoryId?: Types.ObjectId;
  createdBy: "ai" | "manual";
  status: "active" | "pending_review" | "rejected";
  explanation?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // NEW: Knowledge analytics fields
  knowledgeCategory: KnowledgeCategory;
  knowledgeSubcategories?: string[];
  knowledgeCategoryAssignedBy: "manual" | "ai" | "restaurant_edit";
  knowledgeCategoryAssignedAt: Date;
  knowledgeCategoryLastEditedBy?: Types.ObjectId;
}

const QuestionSchema: Schema<IQuestion> = new Schema(
  {
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
      maxlength: [1000, "Question text cannot exceed 1000 characters"],
    },
    questionType: {
      type: String,
      enum: [
        "multiple-choice-single",
        "multiple-choice-multiple",
        "true-false",
      ],
      required: [true, "Question type is required"],
    },
    options: {
      type: [OptionSchema],
      required: true,
      validate: [
        function (this: IQuestion, val: IOption[]) {
          if (this.questionType === "true-false") {
            return val.length === 2;
          }
          // For multiple choice, allow 2 to 6 options
          return val.length >= 2 && val.length <= 6;
        },
        "Invalid number of options for question type. True/False must have 2 options. Multiple choice must have 2-6 options.",
      ],
    },
    categories: {
      type: [String],
      required: [true, "At least one category is required"],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    questionBankId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionBank",
      required: [true, "Question bank ID is required"],
      index: true,
    },
    createdBy: {
      type: String,
      enum: ["ai", "manual"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending_review", "rejected"],
      default: "active",
      index: true,
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: [500, "Explanation cannot exceed 500 characters"],
      required: false,
    },
    sopDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SopDocument",
      required: false,
      index: true,
    },
    sopCategoryId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    knowledgeCategory: {
      type: String,
      enum: [
        "food-knowledge",
        "beverage-knowledge",
        "wine-knowledge",
        "procedures-knowledge",
      ],
      required: true,
      index: true,
    },
    knowledgeSubcategories: {
      type: [String],
      required: false,
      validate: {
        validator: function (subcategories: string[]) {
          return subcategories.length <= 3;
        },
        message: "Maximum 3 knowledge subcategories allowed",
      },
    },
    knowledgeCategoryAssignedBy: {
      type: String,
      enum: ["manual", "ai", "restaurant_edit"],
      required: true,
    },
    knowledgeCategoryAssignedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    knowledgeCategoryLastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
  },
  { timestamps: true }
);

QuestionSchema.path("options").validate(function (
  this: IQuestion,
  options: IOption[]
) {
  const correctOptionsCount = options.filter((opt) => opt.isCorrect).length;
  if (
    this.questionType === "multiple-choice-single" ||
    this.questionType === "true-false"
  ) {
    return correctOptionsCount === 1;
  }
  if (this.questionType === "multiple-choice-multiple") {
    return correctOptionsCount >= 1;
  }
  return true;
},
"Incorrect number of correct options set for the question type. Single-answer MCQs and True/False must have exactly one correct option. Multi-answer MCQs must have at least one.");

const QuestionModel: Model<IQuestion> =
  mongoose.models.Question ||
  mongoose.model<IQuestion>("Question", QuestionSchema);

export default QuestionModel;
