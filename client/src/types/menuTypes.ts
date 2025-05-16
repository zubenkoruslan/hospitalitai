// client/src/types/menuTypes.ts
import { MenuItem } from "./menuItemTypes"; // Import MenuItem

// Basic details of a Menu, as returned in a list
export interface IMenuClient {
  _id: string;
  name: string;
  description?: string;
  restaurantId: string;
  createdAt: string;
  updatedAt: string;
}

// ItemTypeClient, ItemCategoryClient, and IMenuItemClient are removed as they are redundant
// with types in menuItemTypes.ts

// Represents a Menu with its full list of items
export interface IMenuWithItemsClient extends IMenuClient {
  items: MenuItem[]; // Use imported MenuItem
}

// For creating a new menu
export interface CreateMenuDataClient {
  name: string;
  description?: string;
}

// For updating a menu
export interface UpdateMenuDataClient {
  name?: string;
  description?: string;
}
