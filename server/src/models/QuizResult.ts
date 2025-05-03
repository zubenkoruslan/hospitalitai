import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Interface for storing a single answer given by the user
interface IUserAnswer {
  questionId: mongoose.Types.ObjectId; // Reference to the specific Question subdocument in the Quiz
  answerGiven: string; // The answer provided by the staff member
  isCorrect: boolean; // Whether the given answer was correct
}

// Interface for the QuizResult document
export interface IQuizResult extends Document {
  _id: Types.ObjectId; // Explicitly add _id type
  quizId: Types.ObjectId; // Reference to the Quiz
  userId: Types.ObjectId; // Reference to the User (Staff) who took the quiz
  restaurantId: Types.ObjectId; // Reference to the Restaurant for easier querying
  answers: number[]; // Array of indices representing the user's chosen answers
  score: number; // Number of correct answers
  totalQuestions: number; // Total questions in the quiz at time of submission
  startedAt?: Date;
  completedAt?: Date;
  status: "pending" | "in-progress" | "completed";
  retakeCount: number;
}

// Mongoose schema for embedded UserAnswer
const userAnswerSchema = new Schema<IUserAnswer>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
      // Note: No 'ref' here as it refers to an _id within an embedded array in Quiz,
      // which Mongoose doesn't directly link via population.
      // We store it for identification.
    },
    answerGiven: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false } // Don't need separate IDs for each answer log
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
      type: [Number],
      required: [true, "Answers are required"],
      // Optional validation: check if number of answers matches totalQuestions upon save?
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
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Optional: Compound index for faster querying of results by user and quiz
quizResultSchema.index({ userId: 1, quizId: 1 });

// Compound index for restaurant-level aggregation/filtering by user
quizResultSchema.index({ restaurantId: 1, userId: 1 });

// Ensure only one result entry per user per quiz attempt (conceptually)
// Mongoose unique index on {userId, quizId} might be too strict if re-takes are allowed.
// Application logic should handle preventing duplicate in-progress attempts if needed.

// Create and export the QuizResult model
const QuizResult: Model<IQuizResult> = mongoose.model<IQuizResult>(
  "QuizResult",
  quizResultSchema
);

export default QuizResult;
