import mongoose, { Document, Schema } from "mongoose";

export enum NotificationType {
  NEW_ASSIGNMENT = "new_assignment",
  COMPLETED_TRAINING = "completed_training",
  NEW_STAFF = "new_staff",
  NEW_QUIZ = "new_quiz",
}

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  content: string;
  isRead: boolean;
  relatedId?: mongoose.Types.ObjectId; // Reference to quiz, result, or user
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
  },
  { timestamps: true }
);

// Create indexes for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;
