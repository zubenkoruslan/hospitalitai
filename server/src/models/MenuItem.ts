import mongoose, { Document, Schema, Model, Types } from "mongoose";
import { IUser } from "./User"; // For restaurantId reference

// Define allowed types and categories (can be used for validation later)
export const ITEM_TYPES = ["food", "beverage"] as const;
export const FOOD_CATEGORIES = [
  "appetizer",
  "main",
  "side",
  "dessert",
  "other",
] as const;
export const BEVERAGE_CATEGORIES = [
  "hot",
  "cold",
  "alcoholic",
  "non-alcoholic",
  "other",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];
export type BeverageCategory = (typeof BEVERAGE_CATEGORIES)[number];
export type ItemCategory = FoodCategory | BeverageCategory;

// Interface representing a MenuItem document in MongoDB
export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  itemType: ItemType;
  category: string;
  menuId: Types.ObjectId;
  restaurantId: Types.ObjectId;

  // NEW Dietary Fields
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
}

// Mongoose schema definition
const MenuItemSchema: Schema<IMenuItem> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [100, "Item name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    ingredients: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    itemType: {
      type: String,
      enum: ITEM_TYPES,
      required: [true, "Item type (food/beverage) is required"],
      index: true,
    },
    category: {
      type: String,
      required: [true, "Item category is required"],
      trim: true,
      index: true,
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      required: [true, "Menu ID is required"],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Assuming restaurant owner is a User
      required: [true, "Restaurant ID is required"],
      index: true,
    },
    // NEW Dietary Fields with defaults
    isGlutenFree: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDairyFree: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVegetarian: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVegan: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the Mongoose model
const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>(
  "MenuItem",
  MenuItemSchema
);

export default MenuItem;
