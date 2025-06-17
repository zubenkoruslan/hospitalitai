import mongoose, { Document, Schema, Model, Types } from "mongoose";
// import { IUser } from "./User"; // Removed unused import

export const ITEM_TYPES = ["food", "beverage", "wine"] as const;
export const WINE_STYLES = [
  "still",
  "sparkling",
  "champagne",
  "dessert",
  "fortified",
  "other",
] as const;

export const WINE_COLORS = [
  "red",
  "white",
  "rosé",
  "orange",
  "sparkling",
  "champagne",
  "cava",
  "crémant",
  "other",
] as const;
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
export type WineStyleType = (typeof WINE_STYLES)[number];
export type WineColorType = (typeof WINE_COLORS)[number];
// export type FoodCategory = (typeof FOOD_CATEGORIES)[number];
// export type BeverageCategory = (typeof BEVERAGE_CATEGORIES)[number];
// export type ItemCategory = FoodCategory | BeverageCategory; // Will just be string now

// Interface for Wine Serving Option sub-document
export interface IWineServingOption extends Types.Subdocument {
  size: string;
  price: number;
}

// For plain objects (e.g. after .lean())
export interface ILeanWineServingOption {
  _id?: Types.ObjectId;
  size: string;
  price: number;
}

// Interface representing a MenuItem document in MongoDB
export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price?: number; // For wines, this might be a primary price (e.g., bottle) or omitted if servingOptions are used
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

  // Food-specific enhancement fields
  cookingMethods?: string[];
  allergens?: string[];
  isSpicy?: boolean;

  // Beverage-specific enhancement fields
  spiritType?: string;
  beerStyle?: string;
  cocktailIngredients?: string[];
  alcoholContent?: string;
  servingStyle?: string;
  isNonAlcoholic?: boolean;
  temperature?: string;

  // Wine-specific fields
  wineStyle?: WineStyleType;
  wineColor?: WineColorType; // Color classification: red, white, rosé, orange, sparkling
  producer?: string;
  grapeVariety?: string[];
  vintage?: number;
  region?: string;
  servingOptions?: Types.DocumentArray<IWineServingOption>; // Array of serving options for wines
  suggestedPairingsText?: string[]; // Names of food items suggested for pairing by AI
}

// For plain objects (e.g. after .lean())
export interface ILeanMenuItem {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  itemType: ItemType;
  category: string;
  menuId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  isActive?: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;

  // Food-specific enhancement fields
  cookingMethods?: string[];
  allergens?: string[];
  isSpicy?: boolean;

  // Beverage-specific enhancement fields
  spiritType?: string;
  beerStyle?: string;
  cocktailIngredients?: string[];
  alcoholContent?: string;
  servingStyle?: string;
  isNonAlcoholic?: boolean;
  temperature?: string;

  wineStyle?: WineStyleType;
  wineColor?: WineColorType;
  producer?: string;
  grapeVariety?: string[];
  vintage?: number;
  region?: string;
  servingOptions?: ILeanWineServingOption[];
  suggestedPairingsText?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}

// Mongoose schema definition
const WineServingOptionSchema: Schema<IWineServingOption> = new Schema({
  size: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
});

const MenuItemSchema: Schema<IMenuItem> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [200, "Item name cannot exceed 200 characters"],
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
      required: [true, "Item type (food/beverage/wine) is required"],
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

    // Food-specific enhancement fields
    cookingMethods: {
      type: [{ type: String, trim: true }],
      default: undefined,
    },
    allergens: {
      type: [{ type: String, trim: true }],
      default: undefined,
    },
    isSpicy: {
      type: Boolean,
      default: false,
    },

    // Beverage-specific enhancement fields
    spiritType: {
      type: String,
      trim: true,
    },
    beerStyle: {
      type: String,
      trim: true,
    },
    cocktailIngredients: {
      type: [{ type: String, trim: true }],
      default: undefined,
    },
    alcoholContent: {
      type: String,
      trim: true,
    },
    servingStyle: {
      type: String,
      trim: true,
    },
    isNonAlcoholic: {
      type: Boolean,
      default: false,
    },
    temperature: {
      type: String,
      trim: true,
    },

    // Wine-specific schema fields
    wineStyle: {
      type: String,
      enum: WINE_STYLES,
      trim: true,
      index: true, // Index for filtering by wine style
    },
    wineColor: {
      type: String,
      enum: WINE_COLORS,
      trim: true,
      index: true, // Index for filtering by wine color
    },
    producer: {
      type: String,
      trim: true,
    },
    grapeVariety: {
      type: [{ type: String, trim: true }],
      default: undefined, // Explicitly undefined for arrays if not provided
    },
    vintage: {
      type: Number,
      min: [1000, "Vintage year seems too old"],
      max: [
        new Date().getFullYear() + 5,
        "Vintage year seems too far in the future",
      ],
    },
    region: {
      type: String,
      trim: true,
    },
    servingOptions: {
      type: [WineServingOptionSchema],
      default: undefined, // Explicitly undefined for arrays if not provided
    },
    suggestedPairingsText: {
      type: [{ type: String, trim: true }],
      default: undefined, // Explicitly undefined for arrays if not provided
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
