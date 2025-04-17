import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for storing a single answer given by the user
interface IUserAnswer {
  questionId: mongoose.Types.ObjectId; // Reference to the specific Question subdocument in the Quiz
  answerGiven: string; // The answer provided by the staff member
  isCorrect: boolean; // Whether the given answer was correct
}

// Interface for the QuizResult document
export interface IQuizResult extends Document {
  quizId: mongoose.Types.ObjectId; // Reference to the Quiz taken
  userId: mongoose.Types.ObjectId; // Reference to the User (staff) who took the quiz
  restaurantId: mongoose.Types.ObjectId; // Reference to the Restaurant (for easier querying/filtering)
  answers: IUserAnswer[];
  score: number; // Calculated score (e.g., percentage or number correct)
  totalQuestions: number; // Store the total number of questions at the time of taking
  startedAt: Date;
  completedAt?: Date;
  status: "notStarted" | "inProgress" | "completed";
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
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    answers: [userAnswerSchema],
    score: {
      type: Number,
      required: true,
      min: 0,
      // Max score could vary, maybe store as percentage?
      // max: 100, // Example if storing percentage
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ["notStarted", "inProgress", "completed"],
      default: "notStarted",
    },
  },
  {
    timestamps: true, // Adds createdAt, updatedAt (distinct from started/completed)
  }
);

// Index for efficient querying of results by user and quiz
quizResultSchema.index({ userId: 1, quizId: 1 });

// Ensure only one result entry per user per quiz attempt (conceptually)
// Mongoose unique index on {userId, quizId} might be too strict if re-takes are allowed.
// Application logic should handle preventing duplicate in-progress attempts if needed.

// Create and export the QuizResult model
const QuizResult: Model<IQuizResult> = mongoose.model<IQuizResult>(
  "QuizResult",
  quizResultSchema
);

export default QuizResult;
