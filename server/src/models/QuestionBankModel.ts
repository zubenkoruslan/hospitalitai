import mongoose, { Schema, Document, Model, Types } from "mongoose";
import QuestionModel from "./QuestionModel"; // Import QuestionModel for the method

// ADDED: Interface for selected categories from an SOP document
export interface ISelectedSopCategory {
  name: string;
  // content?: string; // Decided to fetch content on-demand from SopDocumentModel
}

export interface IQuestionBank extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  restaurantId: Types.ObjectId; // Reference to the Restaurant model
  sourceType: "SOP" | "MENU" | "MANUAL";
  sourceSopDocumentId?: Types.ObjectId | null; // Nullable, for SOP source
  sourceSopDocumentTitle?: string; // Denormalized for easier display, populated by service layer
  sourceMenuId?: Types.ObjectId | null; // Nullable, for Menu source
  sourceMenuName?: string; // Denormalized for easier display
  categories: string[];
  questions: Types.ObjectId[]; // Array of question IDs belonging to this bank
  questionCount: number; // Denormalized: count of questions in this bank
  // createdBy: Types.ObjectId; // Consider adding user who created it
  // updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  updateQuestionCountAndCategories: () => Promise<void>; // Declare instance method
  updateQuestionCount: () => Promise<void>; // ADDED: Declare instance method for simple count update
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
    },
    description: {
      type: String,
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "Restaurant ID is required"],
      index: true,
    },
    sourceType: {
      type: String,
      required: [true, "Source type is required"],
      enum: ["SOP", "MENU", "MANUAL"],
    },
    sourceSopDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SopDocument",
      default: null,
    },
    sourceSopDocumentTitle: {
      // For easier display on frontend without extra lookups
      type: String,
      trim: true,
    },
    sourceMenuId: {
      type: Schema.Types.ObjectId,
      ref: "Menu", // Assuming Menu model exists
      default: null,
    },
    sourceMenuName: {
      type: String,
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    questionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // createdBy: {
    //   type: Schema.Types.ObjectId,
    //   ref: "User", // Assuming User model exists
    //   required: true,
    // },
    // updatedBy: {
    //   type: Schema.Types.ObjectId,
    //   ref: "User",
    // },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
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

// Method to update questionCount. Could also update categories if needed.
// This should be called after adding/removing questions from this bank.
QuestionBankSchema.methods.updateQuestionCount = async function (
  this: IQuestionBank
) {
  const count = await mongoose
    .model("Question")
    .countDocuments({ questionBankId: this._id });
  this.questionCount = count;
  // Potentially re-aggregate categories here too if they are dynamic based on questions
  await this.save();
};

// Index for efficient querying by restaurant
QuestionBankSchema.index({ restaurantId: 1, name: 1 });
QuestionBankSchema.index({ restaurantId: 1, sourceType: 1 });
QuestionBankSchema.index({ sourceSopDocumentId: 1 }, { sparse: true }); // Sparse if not all banks have SOPs
QuestionBankSchema.index({ sourceMenuId: 1 }, { sparse: true }); // Sparse if not all banks have Menus

const QuestionBankModel: Model<IQuestionBank> =
  mongoose.models.QuestionBank ||
  mongoose.model<IQuestionBank>("QuestionBank", QuestionBankSchema);

export default QuestionBankModel;
