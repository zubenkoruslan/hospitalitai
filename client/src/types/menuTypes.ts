// client/src/types/menuTypes.ts

// Basic details of a Menu, as returned in a list
export interface IMenuClient {
  _id: string;
  name: string;
  description?: string;
  restaurantId: string;
  createdAt: string;
  updatedAt: string;
}

// Represents a single menu item on the client
// Mirrors server/src/models/MenuItem.ts IMenuItem
export type ItemTypeClient = "food" | "beverage";
export type ItemCategoryClient = string; // Can be more specific if using enums like on backend

export interface IMenuItemClient {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  itemType: ItemTypeClient;
  category: ItemCategoryClient;
  menuId: string;
  restaurantId: string;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  createdAt: string;
  updatedAt: string;
}

// Represents a Menu with its full list of items
export interface IMenuWithItemsClient extends IMenuClient {
  items: IMenuItemClient[];
}

// For creating a new menu (if needed by UI in future)
export interface CreateMenuDataClient {
  name: string;
  description?: string;
}

// For updating a menu (if needed by UI in future)
export interface UpdateMenuDataClient {
  name?: string;
  description?: string;
}
