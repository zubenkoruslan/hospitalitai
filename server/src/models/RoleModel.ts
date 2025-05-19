import mongoose, { Document, Schema, Types } from "mongoose";

// Interface for Role document
export interface IRole extends Document {
  _id: Types.ObjectId; // Explicitly define _id for better type inference
  name: string;
  description?: string;
  restaurantId: Types.ObjectId; // Reference to the Restaurant model
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema<IRole> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required."],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant", // Ensures this refers to a document in the 'restaurants' collection
      required: [true, "Restaurant ID is required for a role."],
      index: true, // Index for efficient querying by restaurantId
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    versionKey: false, // Disable the __v versioning field
  }
);

// Compound index to ensure role name is unique within a specific restaurant
RoleSchema.index({ name: 1, restaurantId: 1 }, { unique: true });

// Pre-save hook for validation or other logic can be added here if needed
// RoleSchema.pre<IRole>('save', async function (next) { ... });

const RoleModel =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);

export default RoleModel;
