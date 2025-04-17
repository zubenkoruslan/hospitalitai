import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for individual Menu Item (embedded)
interface IMenuItem {
  name: string;
  description?: string;
  price: number;
  ingredients?: string[];
  allergens?: string[];
  imageUrl?: string;
}

// Interface for the Menu document
export interface IMenu extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId; // Reference to the Restaurant
  items: IMenuItem[];
}

// Mongoose schema for embedded MenuItem
const menuItemSchema = new Schema<IMenuItem>(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Menu item price is required"],
      min: [0, "Price cannot be negative"],
    },
    ingredients: [{ type: String, trim: true }],
    allergens: [{ type: String, trim: true }],
    imageUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true } // Assign IDs to subdocuments if needed for direct manipulation
);

// Mongoose schema for Menu
const menuSchema = new Schema<IMenu>(
  {
    name: {
      type: String,
      required: [true, "Menu name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant", // Reference to the Restaurant model
      required: [true, "Menu must belong to a restaurant"],
      index: true,
    },
    items: [menuItemSchema], // Array of embedded menu items
  },
  {
    timestamps: true, // Add createdAt and updatedAt timestamps
  }
);

// Create and export the Menu model
const Menu: Model<IMenu> = mongoose.model<IMenu>("Menu", menuSchema);

export default Menu;
