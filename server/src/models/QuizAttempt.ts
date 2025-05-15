import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { IUser } from "./User";
import { IQuiz } from "./Quiz";
import { IQuestion } from "./QuestionModel"; // For questionId ref in questionsPresented

// Interface for the details of each question presented in an attempt
interface IQuestionAttemptDetail {
  questionId: Types.ObjectId | IQuestion;
  answerGiven?: any; // Flexible to store various answer types (string, array, etc.)
  isCorrect?: boolean;
  sortOrder?: number;
}

// Interface for the QuizAttempt document
export interface IQuizAttempt extends Document {
  _id: Types.ObjectId;
  staffUserId: Types.ObjectId | IUser; // Staff who took the quiz
  quizId: Types.ObjectId | IQuiz; // The Quiz definition
  restaurantId: Types.ObjectId | IUser; // Restaurant owning the quiz
  questionsPresented: IQuestionAttemptDetail[];
  score: number; // Number of correct answers or calculated score
  attemptDate: Date; // Date of attempt submission
  durationInSeconds?: number; // Optional: time taken for the quiz in seconds
  createdAt?: Date;
  updatedAt?: Date;
}

const QuestionAttemptDetailSchema: Schema<IQuestionAttemptDetail> = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    answerGiven: {
      type: Schema.Types.Mixed, // Using Mixed for flexibility with different answer types
    },
    isCorrect: {
      type: Boolean,
    },
    sortOrder: {
      type: Number,
    },
  },
  { _id: false } // No separate _id for subdocuments in this array
);

const QuizAttemptSchema: Schema<IQuizAttempt> = new Schema(
  {
    staffUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Staff User ID is required"],
      index: true,
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz ID is required"],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Assuming restaurant owner is a User
      required: [true, "Restaurant ID is required"],
      index: true,
    },
    questionsPresented: {
      type: [QuestionAttemptDetailSchema],
      default: [],
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: [0, "Score cannot be negative"],
    },
    attemptDate: {
      type: Date,
      default: Date.now,
      required: [true, "Attempt date is required"],
    },
    durationInSeconds: {
      type: Number,
      min: [0, "Duration cannot be negative"],
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Compound index for querying attempts by staff for a specific quiz
QuizAttemptSchema.index({ quizId: 1, staffUserId: 1 });

// Compound index for restaurant-level aggregation/filtering of attempts
QuizAttemptSchema.index({ restaurantId: 1, quizId: 1, attemptDate: -1 }); // For fetching recent attempts for a quiz in a restaurant

const QuizAttempt: Model<IQuizAttempt> = mongoose.model<IQuizAttempt>(
  "QuizAttempt",
  QuizAttemptSchema
);

export default QuizAttempt;
