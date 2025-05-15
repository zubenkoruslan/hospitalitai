import mongoose, { Schema, Document, Model, Types } from "mongoose";
// import { IMenuItem } from "./MenuItem"; // No longer directly primary source for quiz structure, commented out
import { IUser } from "./User"; // Import for referencing
// MODIFIED: Import main IQuestion from QuestionModel and QuestionModel itself to access its schema
// import QuestionModel, { IQuestion as MainIQuestion } from "./QuestionModel"; // Commented out as questions array is removed

// REMOVED local IQuestion interface and QuestionSchema definition that was here

// Interface for the Quiz document
export interface IQuiz extends Document {
  _id: Types.ObjectId; // Explicitly add _id type
  title: string;
  description?: string; // Add optional description field
  // menuItemIds?: Types.ObjectId[]; // REMOVED: References to MenuItems used in the quiz

  // NEW: References to QuestionBanks used as source
  sourceQuestionBankIds: Types.ObjectId[];

  // questions: MainIQuestion[]; // REMOVED: Array of question subdocuments from QuestionModel

  numberOfQuestionsPerAttempt: number; // RENAMED from numberOfQuestions

  restaurantId: Types.ObjectId; // Reference to the User (Restaurant) who owns the quiz
  isAssigned: boolean; // Flag to indicate if the quiz has been assigned to any staff
  isAvailable: boolean; // Flag to control if staff can see/take this quiz
  totalUniqueQuestionsInSourceSnapshot?: number; // ADDED: Optional field
  // Timestamps added automatically
  createdAt?: Date; // Add createdAt
  updatedAt?: Date; // Add updatedAt
}

// Mongoose schema for Quiz
const QuizSchema: Schema<IQuiz> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      maxlength: [150, "Quiz title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, "Description cannot be more than 500 characters"],
      default: null,
    },
    // menuItemIds: [ // REMOVED
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "MenuItem",
    //   },
    // ],
    sourceQuestionBankIds: [
      // NEW FIELD
      {
        type: Schema.Types.ObjectId,
        ref: "QuestionBank", // Reference to QuestionBankModel
        required: [true, "Source Question Bank ID is required"], // Made required message more specific
      },
    ],
    // questions: { // REMOVED
    //   type: [QuestionModel.schema],
    //   required: true,
    //   validate: [
    //     (val: MainIQuestion[]) => val.length > 0,
    //     "Quiz must contain at least one question",
    //   ],
    // },
    numberOfQuestionsPerAttempt: {
      // RENAMED from numberOfQuestions
      type: Number,
      required: [true, "Number of questions per attempt is required."],
      min: [1, "Quiz must have at least one question per attempt."],
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Assuming restaurants are linked via the User model
      required: [true, "Restaurant ID is required"],
      index: true,
    },
    isAssigned: {
      type: Boolean,
      required: [true, "isAssigned field is required"],
      index: true, // Added index for filtering by assigned status
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: false, // Default to not available
      index: true, // Index for efficient querying by staff
    },
    totalUniqueQuestionsInSourceSnapshot: {
      // ADDED
      type: Number,
      min: [0, "Total unique questions snapshot cannot be negative."],
      default: undefined, // Explicitly undefined, will be set programmatically
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add compound index for fetching quizzes by restaurant
QuizSchema.index({ restaurantId: 1, _id: 1 });

// Add multikey index for searching quizzes by menu item IDs - Re-evaluate if menuItemIds is deprecated
// QuizSchema.index({ menuItemIds: 1 }); // Commented out for now, as menuItemIds role is reduced

// Create and export the Quiz model
const Quiz: Model<IQuiz> = mongoose.model<IQuiz>("Quiz", QuizSchema);

export default Quiz;
