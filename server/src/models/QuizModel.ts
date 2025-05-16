import mongoose, { Document, Schema, Types } from "mongoose";

export interface IQuiz extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  restaurantId: Types.ObjectId;
  sourceQuestionBankIds: Types.ObjectId[];
  totalUniqueQuestionsInSourceSnapshot: number;
  numberOfQuestionsPerAttempt: number;
  isAvailable?: boolean;
  averageScore?: number | null;
  targetRoles?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema: Schema<IQuiz> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    sourceQuestionBankIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "QuestionBank",
      },
    ],
    totalUniqueQuestionsInSourceSnapshot: {
      type: Number,
      default: 0,
    },
    numberOfQuestionsPerAttempt: {
      type: Number,
      required: [
        true,
        "Number of questions per attempt is required for a quiz.",
      ],
      min: [1, "Quiz must have at least 1 question per attempt."],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    targetRoles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IQuiz>("Quiz", QuizSchema);
