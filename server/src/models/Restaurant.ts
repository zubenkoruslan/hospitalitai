import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for the Restaurant document
export interface IRestaurant extends Document {
  name: string;
  owner: mongoose.Types.ObjectId; // Reference to the User who owns/created the restaurant
  staff: mongoose.Types.ObjectId[]; // Array of User IDs who are staff members
}

// Mongoose schema for Restaurant
const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: [true, "Restaurant must have an owner"],
      index: true, // Index for quicker lookup by owner
    },
    staff: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // References User model for staff members
      },
    ],
  },
  {
    timestamps: true, // Add createdAt and updatedAt timestamps
  }
);

// Create and export the Restaurant model
const Restaurant: Model<IRestaurant> = mongoose.model<IRestaurant>(
  "Restaurant",
  restaurantSchema
);

export default Restaurant;
