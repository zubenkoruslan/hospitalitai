import mongoose, { Schema, Document, Types } from "mongoose";

// Interface matching the frontend Notification interface
export interface INotification extends Document {
  _id: Types.ObjectId;
  type: "new_assignment" | "completed_training" | "new_staff" | "new_quiz";
  content: string;
  isRead: boolean;
  relatedId?: Types.ObjectId;
  metadata?: {
    staffId?: Types.ObjectId;
    quizId?: Types.ObjectId;
    [key: string]: any;
  };
  userId: Types.ObjectId; // The user who should receive this notification
  restaurantId: Types.ObjectId; // The restaurant context
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    type: {
      type: String,
      enum: ["new_assignment", "completed_training", "new_staff", "new_quiz"],
      required: [true, "Notification type is required"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "Notification content is required"],
      trim: true,
      maxlength: [500, "Notification content cannot exceed 500 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "Restaurant ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ restaurantId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Export the model
const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
export default Notification;
