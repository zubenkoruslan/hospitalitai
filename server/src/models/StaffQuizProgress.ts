import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { IUser } from "./User"; // For staffUserId and restaurantId
import { IQuiz } from "./Quiz"; // For quizId
import { IQuestion } from "./QuestionModel"; // For seenQuestionIds

export interface IStaffQuizProgress extends Document {
  _id: Types.ObjectId;
  staffUserId: Types.ObjectId | IUser;
  quizId: Types.ObjectId | IQuiz;
  restaurantId: Types.ObjectId | IUser;
  seenQuestionIds: Types.ObjectId[] | IQuestion[];
  totalUniqueQuestionsInSource: number;
  isCompletedOverall: boolean;
  lastAttemptTimestamp?: Date;
  questionsAnsweredToday?: number; // Marked for re-evaluation in plan
  lastActivityDateForDailyReset?: Date; // Marked for re-evaluation in plan
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
      ref: "User", // Assuming restaurant admin/owner is a User
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
    questionsAnsweredToday: {
      // RE-EVALUATE/REMOVE in plan
      type: Number,
      default: 0,
      min: 0,
    },
    lastActivityDateForDailyReset: {
      // RE-EVALUATE/REMOVE in plan
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
