import mongoose, { Document, Schema, Types } from "mongoose";

export interface IQuiz extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  restaurantId: Types.ObjectId;
  sourceQuestionBankIds: Types.ObjectId[];
  sopDocumentId?: Types.ObjectId | null;
  totalUniqueQuestionsInSourceSnapshot: number;
  numberOfQuestionsPerAttempt: number;
  isAvailable?: boolean;
  averageScore?: number | null;
  targetRoles?: Types.ObjectId[];
  retakeCooldownHours: number;
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
    sopDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SopDocument",
      required: false,
    },
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
      default: false,
    },
    targetRoles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    retakeCooldownHours: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Retake cooldown cannot be negative."],
    },
  },
  {
    timestamps: true,
  }
);

const QuizModel =
  mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", QuizSchema);

export default QuizModel;
