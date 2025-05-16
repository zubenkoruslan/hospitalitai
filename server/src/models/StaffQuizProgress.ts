import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { IUser } from "./User"; // For staffUserId and restaurantId
import { IQuiz } from "./QuizModel"; // UPDATED: For quizId
import { IQuestion } from "./QuestionModel"; // For seenQuestionIds
import { IRestaurant } from "./Restaurant"; // For restaurantId

export interface IStaffQuizProgress extends Document {
  _id: Types.ObjectId;
  staffUserId: Types.ObjectId | IUser;
  quizId: Types.ObjectId | IQuiz;
  restaurantId: Types.ObjectId | IRestaurant;
  seenQuestionIds: Types.ObjectId[] | IQuestion[];
  totalUniqueQuestionsInSource: number;
  isCompletedOverall: boolean;
  lastAttemptTimestamp?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const StaffQuizProgressSchema: Schema<IStaffQuizProgress> = new Schema(
  {
    staffUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    seenQuestionIds: {
      type: [Schema.Types.ObjectId],
      ref: "Question",
      default: [],
    },
    totalUniqueQuestionsInSource: {
      type: Number,
      required: true,
      min: 0,
    },
    isCompletedOverall: {
      type: Boolean,
      default: false,
    },
    lastAttemptTimestamp: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying progress by staff for a specific quiz
StaffQuizProgressSchema.index({ staffUserId: 1, quizId: 1 });
// Removed attemptMadeOnDate from this index or any other specific index

const StaffQuizProgressModel: Model<IStaffQuizProgress> =
  mongoose.model<IStaffQuizProgress>(
    "StaffQuizProgress",
    StaffQuizProgressSchema
  );

export default StaffQuizProgressModel;
