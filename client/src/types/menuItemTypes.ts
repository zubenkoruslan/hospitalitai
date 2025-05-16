// client/src/types/menuItemTypes.ts

// Matches the backend MenuItem model
export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  itemType: ItemType; // Use shared type
  category: string; // MODIFIED: Allow any string for dynamic/custom categories
  menuId: string;
  restaurantId: string;
  createdAt?: string;
  updatedAt?: string;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
}

// Removed local Menu interface to avoid conflict with menuTypes.ts

// Represents the type of menu item
export type ItemType = "food" | "beverage";

// Specific category types based on ItemType
export type FoodCategory = "appetizer" | "main" | "side" | "dessert" | "other";
export type BeverageCategory =
  | "hot"
  | "cold"
  | "alcoholic"
  | "non-alcoholic"
  | "other";

// Union type for all possible categories
export type ItemCategory = FoodCategory | BeverageCategory;

// Represents the data structure for the add/edit form
export interface MenuItemFormData {
  name: string;
  description: string;
  price: string; // Use string for form input
  ingredients: string; // Comma-separated string for form input
  itemType: ItemType | ""; // Allow empty for initial state
  category: string; // MODIFIED: Allow any string for dynamic categories
  menuId: string; // ADDED: menuId is required to create/associate an item
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
}

// Constants for categories - Ensure these match the backend model definitions EXACTLY
export const FOOD_CATEGORIES: ReadonlyArray<FoodCategory> = [
  "appetizer",
  "main",
  "side",
  "dessert",
  "other",
] as const;

export const BEVERAGE_CATEGORIES: ReadonlyArray<BeverageCategory> = [
  "hot",
  "cold",
  "alcoholic",
  "non-alcoholic",
  "other",
] as const;
