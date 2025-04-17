import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for embedded Question options (if multiple choice)
interface IQuestionOption {
  text: string;
}

// Interface for embedded Question
interface IQuestion {
  _id?: mongoose.Types.ObjectId; // Add optional _id field
  questionText: string;
  questionType: "multipleChoice" | "trueFalse";
  options?: IQuestionOption[]; // Only required for multipleChoice
  correctAnswer: string; // Store the correct option text or 'true'/'false'
}

// Interface for the Quiz document
export interface IQuiz extends Document {
  title: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId; // Reference to the Restaurant
  createdBy: mongoose.Types.ObjectId; // Reference to the User (Restaurant role) who created it
  associatedMenus?: mongoose.Types.ObjectId[]; // Optional references to Menus
  questions: IQuestion[];
}

// Mongoose schema for embedded Question Option
const questionOptionSchema = new Schema<IQuestionOption>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false } // Usually don't need separate IDs for simple options
);

// Mongoose schema for embedded Question
const questionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    questionType: {
      type: String,
      required: true,
      enum: ["multipleChoice", "trueFalse"],
    },
    options: {
      type: [questionOptionSchema],
      // Required only if questionType is multipleChoice
      required: function (this: IQuestion) {
        return this.questionType === "multipleChoice";
      },
      validate: [
        {
          validator: function (this: IQuestion, val: IQuestionOption[]) {
            // For multiple choice, must have at least 2 options
            return (
              this.questionType !== "multipleChoice" || (val && val.length >= 2)
            );
          },
          message: "Multiple choice questions must have at least 2 options.",
        },
        {
          validator: function (this: IQuestion, val: IQuestionOption[]) {
            // Should not have options if true/false
            return (
              this.questionType !== "trueFalse" ||
              val === undefined ||
              val.length === 0
            );
          },
          message: "True/False questions should not have options.",
        },
      ],
    },
    correctAnswer: {
      type: String,
      required: [true, "Correct answer is required"],
      trim: true,
      validate: {
        validator: function (this: IQuestion, val: string): boolean {
          if (this.questionType === "trueFalse") {
            return val === "true" || val === "false";
          }
          if (this.questionType === "multipleChoice") {
            // Ensure the correct answer is one of the options provided
            return this.options?.some((option) => option.text === val) ?? false;
          }
          return false; // Should not happen with enum validation
        },
        message: function (
          this: IQuestion,
          props: mongoose.ValidatorProps
        ): string {
          // Access questionType directly from the current subdocument context ('this')
          if (this.questionType === "trueFalse")
            return `Correct answer must be 'true' or 'false'`;
          if (this.questionType === "multipleChoice")
            return `Correct answer for [${props.path}] must match one of the option texts.`;
          return `Invalid correct answer.`;
        },
      },
    },
  },
  { _id: true } // Give questions their own IDs
);

// Mongoose schema for Quiz
const quizSchema = new Schema<IQuiz>(
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
      required: [true, "Quiz must belong to a restaurant"],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Quiz must have a creator"],
    },
    associatedMenus: [
      {
        type: Schema.Types.ObjectId,
        ref: "Menu",
      },
    ],
    questions: {
      type: [questionSchema],
      validate: {
        validator: function (val: IQuestion[]) {
          return val && val.length > 0;
        },
        message: "Quiz must contain at least one question.",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the Quiz model
const Quiz: Model<IQuiz> = mongoose.model<IQuiz>("Quiz", quizSchema);

export default Quiz;
