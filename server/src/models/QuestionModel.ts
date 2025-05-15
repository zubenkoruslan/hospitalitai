import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type QuestionType =
  | "multiple-choice-single"
  | "multiple-choice-multiple"
  | "true-false";

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
  questionText: string;
  questionType: QuestionType;
  options: Types.Array<IOption>;
  categories: string[];
  restaurantId: Types.ObjectId;
  createdBy: "ai" | "manual";
  difficulty?: "easy" | "medium" | "hard";
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
      ref: "User",
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      enum: ["ai", "manual"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
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

const QuestionModel: Model<IQuestion> = mongoose.model<IQuestion>(
  "Question",
  QuestionSchema
);

export default QuestionModel;
