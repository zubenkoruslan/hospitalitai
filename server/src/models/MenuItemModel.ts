import mongoose, { Document, Schema, Types } from "mongoose";

// Interface for Dietary Information consistency
interface IDietaryInfo {
  allergens?: string[];
  dietaryRestrictions?: string[]; // e.g., vegan, vegetarian, gluten-free
}

// Interface for the MenuItem document
export interface IMenuItem extends Document, IDietaryInfo {
  name: string;
  description?: string;
  menuId: Types.ObjectId; // Belongs to this Menu
  restaurantId: Types.ObjectId; // Belongs to this Restaurant (denormalized for querying)
  category: string; // e.g., Appetizers, Main Courses, Wine
  price: number;
  ingredients?: string[];
  itemType: "food" | "beverage" | "other";
  imageUrl?: string;
  isActive: boolean;
  preparationTimeMinutes?: number;
  displayOrder?: number; // For ordering within a category/menu
  createdAt: Date;
  updatedAt: Date;
  // nutritionInfo: { calories: number, protein: number, carbs: number, fat: number }; // Future
  // tags: string[]; // e.g., spicy, popular, new, chefSpecial // Future
}

const MenuItemSchema: Schema<IMenuItem> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required."],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      required: [true, "Menu ID is required for a menu item."],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [
        true,
        "Restaurant ID is required for a menu item (denormalized).",
      ],
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required for a menu item."],
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required for a menu item."],
      min: [0, "Price cannot be negative."],
    },
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    allergens: [
      {
        type: String,
        trim: true,
      },
    ],
    dietaryRestrictions: [
      {
        type: String,
        trim: true,
      },
    ],
    itemType: {
      type: String,
      enum: ["food", "beverage", "other"],
      default: "food",
    },
    imageUrl: {
      type: String,
      trim: true,
      // Add validation for URL format if desired
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    preparationTimeMinutes: {
      type: Number,
      min: [0, "Preparation time cannot be negative."],
    },
    displayOrder: {
      type: Number,
      default: 0, // Default order
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    versionKey: false,
  }
);

// Compound index for typical queries, e.g., finding all active items in a menu's category
MenuItemSchema.index({ menuId: 1, category: 1, isActive: 1 });
MenuItemSchema.index({ restaurantId: 1, isActive: 1 }); // For restaurant-wide item searches
MenuItemSchema.index({ name: 1, menuId: 1 }); // If searching by name within a menu

const MenuItemModel =
  mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);

export default MenuItemModel;
