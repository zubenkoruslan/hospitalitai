import mongoose, { Schema, Document, Model, Types } from "mongoose";
import QuestionModel from "./QuestionModel"; // Import QuestionModel for the method

// ADDED: Interface for selected categories from an SOP document
export interface ISelectedSopCategory {
  name: string;
  // content?: string; // Decided to fetch content on-demand from SopDocumentModel
}

export interface IQuestionBank extends Document {
  name: string;
  description?: string;
  categories: string[]; // Aggregated from questions within this bank
  questionCount: number; // Actual count of questions in the 'questions' array
  targetQuestionCount?: number; // Optional target for generation or desired size
  questions: Types.ObjectId[];
  restaurantId: Types.ObjectId;

  // Fields for SOP Document sourced banks
  sourceType?: "menu" | "sop_document"; // Type of source for the question bank
  sourceDocumentId?: Types.ObjectId; // ID of either Menu or SopDocument
  sourceTypeRef?: "Menu" | "SopDocument"; // Model name for refPath
  selectedCategories?: ISelectedSopCategory[]; // Names of categories selected from the SOP document

  createdAt?: Date;
  updatedAt?: Date;
  updateQuestionCountAndCategories: () => Promise<void>; // Declare instance method
}

// ADDED: Schema for selected SOP categories
const SelectedSopCategorySchema: Schema<ISelectedSopCategory> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

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
    // Fields for SOP Document sourced banks
    sourceType: {
      type: String,
      enum: ["menu", "sop_document"],
      // required: true // Make required if all banks must have a source type
    },
    sourceDocumentId: {
      type: Schema.Types.ObjectId,
      refPath: "sourceTypeRef",
      // required: function() { return !!this.sourceType; } // Require if sourceType is present
    },
    sourceTypeRef: {
      type: String,
      enum: ["Menu", "SopDocument"], // Must match Mongoose model names
      // required: function() { return !!this.sourceType; } // Require if sourceType is present
    },
    selectedCategories: {
      type: [SelectedSopCategorySchema],
      default: undefined, // Default to undefined so it's not an empty array unless specified
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
// Consider an index if querying by sourceType and sourceDocumentId is common
QuestionBankSchema.index(
  { restaurantId: 1, sourceType: 1, sourceDocumentId: 1 },
  { sparse: true }
);

const QuestionBankModel: Model<IQuestionBank> =
  mongoose.models.QuestionBank ||
  mongoose.model<IQuestionBank>("QuestionBank", QuestionBankSchema);

export default QuestionBankModel;
