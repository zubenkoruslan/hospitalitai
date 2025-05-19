import mongoose, { Schema, Document, Model, Types } from "mongoose";
import QuestionModel from "./QuestionModel"; // Import QuestionModel for the method

export interface IQuestionBank extends Document {
  name: string;
  description?: string;
  categories: string[]; // Aggregated from questions
  questionCount: number; // Actual count of questions in the 'questions' array
  targetQuestionCount?: number; // Optional target for generation or desired size
  questions: Types.ObjectId[];
  restaurantId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  updateQuestionCountAndCategories: () => Promise<void>; // Declare instance method
}

const QuestionBankSchema: Schema<IQuestionBank> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Question bank name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
      index: true, // Added index for faster searching by name for a restaurant
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    categories: {
      type: [String],
      default: [],
    },
    questionCount: {
      // Actual count, calculated by the instance method
      type: Number,
      default: 0,
      min: [0, "Question count cannot be negative"],
    },
    targetQuestionCount: {
      type: Number,
      min: [0, "Target question count cannot be negative"],
      // default: 0, // No default, can be undefined
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Method to update question count and aggregated categories
QuestionBankSchema.methods.updateQuestionCountAndCategories = async function (
  this: IQuestionBank
) {
  if (this.questions && this.questions.length > 0) {
    // Fetch only active questions to count and aggregate categories from
    const activeQuestions = await QuestionModel.find({
      _id: { $in: this.questions },
      // status: 'active', // Uncomment if QuestionModel has a status and only active should be counted
    }).lean();

    this.questionCount = activeQuestions.length;

    const categoriesSet = new Set<string>();
    activeQuestions.forEach((questionDoc) => {
      // questionDoc is already IQuestion due to lean<IQuestion>() if used, or cast if not
      if (questionDoc.categories && Array.isArray(questionDoc.categories)) {
        questionDoc.categories.forEach((cat: string) => categoriesSet.add(cat));
      }
    });
    this.categories = Array.from(categoriesSet);
  } else {
    this.questionCount = 0;
    this.categories = [];
  }
  // This method modifies the document. The caller is responsible for saving.
};

// Compound index for typical queries
QuestionBankSchema.index({ restaurantId: 1, name: 1 });

const QuestionBankModel: Model<IQuestionBank> =
  mongoose.models.QuestionBank ||
  mongoose.model<IQuestionBank>("QuestionBank", QuestionBankSchema);

export default QuestionBankModel;
