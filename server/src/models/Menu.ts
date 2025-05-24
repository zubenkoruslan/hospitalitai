import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for the Menu document
export interface IMenu extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId; // Reference to the Restaurant
  isActive?: boolean; // Added isActive field
}

// Mongoose schema for Menu
const menuSchema = new Schema<IMenu>(
  {
    name: {
      type: String,
      required: [true, "Menu name is required"],
      trim: true,
      maxlength: [100, "Menu name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant", // Reference to the Restaurant model
      required: [true, "Menu must belong to a restaurant"],
      index: true,
    },
    isActive: {
      // Added isActive field to schema
      type: Boolean,
      default: false, // Default to false, will be set to true on creation if needed
      index: true,
    },
  },
  {
    timestamps: true, // Add createdAt and updatedAt timestamps
  }
);

// Create and export the Menu model
const Menu: Model<IMenu> = mongoose.model<IMenu>("Menu", menuSchema);

export default Menu;
