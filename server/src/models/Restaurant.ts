import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for the Restaurant document
export interface IRestaurant extends Document {
  _id: mongoose.Types.ObjectId; // Explicitly define _id type
  name: string;
  owner: mongoose.Types.ObjectId; // Reference to the User who owns/created the restaurant
  contactEmail?: string; // Added contactEmail
  // staff: mongoose.Types.ObjectId[]; // REMOVED: Array of User IDs who are staff members
}

// Mongoose schema for Restaurant
const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
      index: true, // Added index for potential lookups by name
      maxlength: [100, "Restaurant name cannot exceed 100 characters"], // Added maxlength
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: [true, "Restaurant must have an owner"],
      index: true, // Index for quicker lookup by owner
    },
    contactEmail: {
      // Added contactEmail to schema
      type: String,
      trim: true,
      // Basic email validation, could use a regex or validator library for more robustness
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
      maxlength: [100, "Contact email cannot exceed 100 characters"],
    },
    // staff: [ // REMOVED
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "User", // References User model for staff members
    //   },
    // ],
  },
  {
    timestamps: true, // Add createdAt and updatedAt timestamps
  }
);

// Add indexes for analytics queries
restaurantSchema.index({ createdAt: 1 });
restaurantSchema.index({ owner: 1, createdAt: 1 });

// Create and export the Restaurant model
const Restaurant: Model<IRestaurant> =
  mongoose.models.Restaurant ||
  mongoose.model<IRestaurant>("Restaurant", restaurantSchema);

export default Restaurant;
