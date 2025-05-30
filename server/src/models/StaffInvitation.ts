import mongoose, { Schema, Document } from "mongoose";

export interface IStaffInvitation extends Document {
  email: string;
  restaurantId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  name?: string;
  assignedRoleId?: mongoose.Types.ObjectId;
  status: "pending" | "completed" | "expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffInvitationSchema = new Schema<IStaffInvitation>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    name: String,
    assignedRoleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// Note: token index is automatically created by unique: true
staffInvitationSchema.index({ email: 1, restaurantId: 1 });
staffInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IStaffInvitation>(
  "StaffInvitation",
  staffInvitationSchema
);
