import mongoose, { Document, Schema, Model, Types } from "mongoose";
// import { IUser } from "./User"; // Removed unused import

export const ITEM_TYPES = ["food", "beverage"] as const;
// REMOVE FoodCategory, BeverageCategory types and constants
// export const FOOD_CATEGORIES = [
//   "appetizer",
//   "main",
//   "side",
//   "dessert",
//   "other",
// ] as const;
// export const BEVERAGE_CATEGORIES = [
//   "hot",
//   "cold",
//   "alcoholic",
//   "non-alcoholic",
//   "other",
// ] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
// export type FoodCategory = (typeof FOOD_CATEGORIES)[number];
// export type BeverageCategory = (typeof BEVERAGE_CATEGORIES)[number];
// export type ItemCategory = FoodCategory | BeverageCategory; // Will just be string now

// Interface representing a MenuItem document in MongoDB
export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  itemType: ItemType;
  category: string; // Category will now be a simple string, not validated against a list
  menuId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  isActive?: boolean;

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
      // REMOVE custom validator for category
      // validate: {
      //   validator: function (this: IMenuItem, value: string): boolean {
      //     if (this.itemType === "food") {
      //       return (FOOD_CATEGORIES as readonly string[]).includes(value);
      //     }
      //     if (this.itemType === "beverage") {
      //       return (BEVERAGE_CATEGORIES as readonly string[]).includes(value);
      //     }
      //     return false; // Should not happen if itemType is validated
      //   },
      //   message: (props: { value: string }) =>
      //     `'${props.value}' is not a valid category for the selected item type.`,
      // },
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      required: [true, "Menu ID is required"],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
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
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for frequently queried fields
MenuItemSchema.index({ restaurantId: 1, menuId: 1 });

// Create and export the Mongoose model
const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>(
  "MenuItem",
  MenuItemSchema
);

export default MenuItem;
