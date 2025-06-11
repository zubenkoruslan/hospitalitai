import mongoose, { Schema, Document, Model, Types } from "mongoose";

// NEW: Interface for IncorrectQuestionDetail (matching frontend expectations)
interface IIncorrectQuestionDetail {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
}

// New interface for answer details within QuizResult.answers
interface IAnswerDetailForResult {
  questionId: Types.ObjectId;
  answerGiven: any; // Keeping it flexible as per gradedQuestionsDetails
  isCorrect: boolean;
}

// Interface for the QuizResult document
export interface IQuizResult extends Document {
  _id: Types.ObjectId;
  quizId: Types.ObjectId;
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  answers: IAnswerDetailForResult[]; // MODIFIED from number[]
  score: number;
  totalQuestions: number;
  startedAt?: Date;
  completedAt?: Date;
  status: "pending" | "in-progress" | "completed";
  retakeCount: number;
  wasCancelled?: boolean;
  incorrectQuestions?: IIncorrectQuestionDetail[];
}

// NEW: Mongoose schema for embedded IncorrectQuestionDetail
const incorrectQuestionDetailSchema = new Schema<IIncorrectQuestionDetail>(
  {
    questionText: { type: String, required: true },
    userAnswer: { type: String, required: true },
    correctAnswer: { type: String, required: true },
  },
  { _id: false }
);

// New Mongoose schema for IAnswerDetailForResult
const answerDetailForResultSchema = new Schema<IAnswerDetailForResult>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    answerGiven: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

// Mongoose schema for QuizResult
const quizResultSchema = new Schema<IQuizResult>(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "Restaurant ID is required"],
      index: true,
    },
    answers: {
      type: [answerDetailForResultSchema], // MODIFIED from [Number]
      required: [true, "Answers are required"],
      default: [], // Added default empty array
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: [true, "Total questions count is required"],
      min: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
      required: true,
      index: true,
    },
    retakeCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    wasCancelled: {
      type: Boolean,
      default: false, // Default to false if not explicitly set
    },
    incorrectQuestions: {
      type: [incorrectQuestionDetailSchema],
      default: [],
    }, // NEW FIELD
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Optional: Compound index for faster querying of results by user and quiz
quizResultSchema.index({ userId: 1, quizId: 1 });

// Compound index for restaurant-level aggregation/filtering by user
quizResultSchema.index({ restaurantId: 1, userId: 1 });

// Add indexes for analytics queries
quizResultSchema.index({ createdAt: 1, restaurantId: 1 });
quizResultSchema.index({ restaurantId: 1, createdAt: 1 });
quizResultSchema.index({ createdAt: 1, overallScore: 1 });

// Ensure only one result entry per user per quiz attempt (conceptually)
// Mongoose unique index on {userId, quizId} might be too strict if re-takes are allowed.
// Application logic should handle preventing duplicate in-progress attempts if needed.

// Create and export the QuizResult model
const QuizResult: Model<IQuizResult> =
  mongoose.models.QuizResult ||
  mongoose.model<IQuizResult>("QuizResult", quizResultSchema);

export default QuizResult;
