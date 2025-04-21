import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { IMenuItem } from "./MenuItem"; // Import for referencing
import { IUser } from "./User"; // Import for referencing

// Interface for individual question within a quiz
export interface IQuestion {
  text: string;
  choices: string[];
  correctAnswer: number; // Index (0-3)
  menuItemId: Types.ObjectId; // Link question to the specific menu item it's about
}

// Interface for the Quiz document
export interface IQuiz extends Document {
  title: string;
  description?: string; // Add optional description field
  menuItemIds: Types.ObjectId[]; // References to MenuItems used in the quiz
  questions: IQuestion[]; // Array of question subdocuments
  restaurantId: Types.ObjectId; // Reference to the User (Restaurant) who owns the quiz
  // Timestamps added automatically
  createdAt?: Date; // Add createdAt
  updatedAt?: Date; // Add updatedAt
}

// Mongoose schema for the Question subdocument
const QuestionSchema: Schema<IQuestion> = new Schema(
  {
    text: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    choices: {
      type: [String],
      required: [true, "Question must have choices"],
      validate: [
        (val: string[]) => val.length === 4,
        "Question must have exactly 4 choices",
      ],
    },
    correctAnswer: {
      type: Number,
      required: [true, "Correct answer index is required"],
      min: [0, "Correct answer index must be between 0 and 3"],
      max: [3, "Correct answer index must be between 0 and 3"],
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Question must be linked to a menu item"],
    },
  },
  { _id: false }
); // Subdocuments don't need their own _id by default

// Mongoose schema for Quiz
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
      maxLength: [500, "Description cannot be more than 500 characters"],
      default: null,
    },
    menuItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
        required: true,
      },
    ],
    questions: {
      type: [QuestionSchema],
      required: true,
      validate: [
        (val: IQuestion[]) => val.length > 0,
        "Quiz must contain at least one question",
      ],
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Assuming restaurants are linked via the User model
      required: [true, "Restaurant ID is required"],
      index: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create and export the Quiz model
const Quiz: Model<IQuiz> = mongoose.model<IQuiz>("Quiz", QuizSchema);

export default Quiz;
