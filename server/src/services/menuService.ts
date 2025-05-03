import mongoose, { Types } from "mongoose";
import Menu, { IMenu } from "../models/Menu";
import { AppError } from "../utils/errorHandler";
// Import MenuItem if needed for future operations like cascade delete
// import MenuItem from '../models/MenuItem';

// Interface for data used in create/update
interface MenuData {
  name: string;
  description?: string;
}

class MenuService {
  /**
   * Creates a new menu for a specific restaurant.
   *
   * @param data - The data for the new menu (name, optional description).
   * @param restaurantId - The ID of the restaurant creating the menu.
   * @returns A promise resolving to the created menu document.
   * @throws {AppError} If a menu with the same name already exists for the restaurant (400),
   *                    if Mongoose validation fails (e.g., name length) (400),
   *                    or if any database save operation fails (500).
   */
  static async createMenu(
    data: MenuData,
    restaurantId: Types.ObjectId
  ): Promise<IMenu> {
    const { name, description } = data;
    const trimmedName = name.trim();

    try {
      // Check for existing menu with the same name for this restaurant
      const existingMenu = await Menu.findOne({
        name: trimmedName,
        restaurantId: restaurantId,
      });

      if (existingMenu) {
        throw new AppError("A menu with this name already exists", 400);
      }

      const newMenuData: Partial<IMenu> = {
        name: trimmedName,
        restaurantId: restaurantId,
      };
      if (description) newMenuData.description = description.trim();

      const menu = new Menu(newMenuData);
      const savedMenu = await menu.save();
      return savedMenu;
    } catch (error: any) {
      console.error("Error creating menu in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential Mongoose validation errors more specifically if needed
      throw new AppError("Failed to create menu.", 500);
    }
  }

  /**
   * Retrieves all menus belonging to a specific restaurant.
   *
   * @param restaurantId - The ID of the restaurant whose menus are to be fetched.
   * @returns A promise resolving to an array of menu documents.
   * @throws {AppError} If any unexpected database error occurs (500).
   */
  static async getAllMenus(restaurantId: Types.ObjectId): Promise<IMenu[]> {
    try {
      // Use lean() for performance as we only read data
      const menus = await Menu.find({ restaurantId }).lean();
      return menus;
    } catch (error: any) {
      console.error("Error fetching all menus in service:", error);
      throw new AppError("Failed to fetch menus.", 500);
    }
  }

  /**
   * Retrieves a single menu by its ID, ensuring it belongs to the specified restaurant.
   *
   * @param menuId - The ID of the menu to retrieve.
   * @param restaurantId - The ID of the restaurant to scope the search.
   * @returns A promise resolving to the menu document.
   * @throws {AppError} If the menu is not found or doesn't belong to the restaurant (404),
   *                    if the menuId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async getMenuById(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    try {
      // Use lean() for performance
      const menu = await Menu.findOne({
        _id: menuObjectId,
        restaurantId,
      }).lean();
      if (!menu) {
        throw new AppError("Menu not found or access denied", 404);
      }
      return menu;
    } catch (error: any) {
      console.error("Error fetching menu by ID in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential CastError if menuId is invalid format
      if (error.name === "CastError") {
        throw new AppError("Invalid menu ID format.", 400);
      }
      throw new AppError("Failed to fetch menu.", 500);
    }
  }

  /**
   * Updates an existing menu.
   *
   * @param menuId - The ID of the menu to update.
   * @param updateData - An object containing the fields to update (name, description).
   * @param restaurantId - The ID of the restaurant owning the menu.
   * @returns A promise resolving to the updated menu document.
   * @throws {AppError} If a menu with the updated name already exists (400),
   *                    if the menu is not found or doesn't belong to the restaurant (404),
   *                    if Mongoose validation fails during update (400),
   *                    if the menuId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async updateMenu(
    menuId: string | Types.ObjectId,
    updateData: Partial<MenuData>,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    const preparedUpdate: { [key: string]: any } = {};
    if (updateData.name !== undefined)
      preparedUpdate.name = updateData.name.trim();
    if (updateData.description !== undefined)
      preparedUpdate.description = updateData.description.trim();

    // Return early if no actual fields to update
    if (Object.keys(preparedUpdate).length === 0) {
      // Optionally fetch and return the existing menu if no updates are provided
      return this.getMenuById(menuObjectId, restaurantId);
    }

    try {
      // Check for name conflict only if name is being updated
      if (preparedUpdate.name) {
        const existingMenu = await Menu.findOne({
          _id: { $ne: menuObjectId },
          name: preparedUpdate.name,
          restaurantId: restaurantId,
        });
        if (existingMenu) {
          throw new AppError(
            `A menu with the name '${preparedUpdate.name}' already exists`,
            400
          );
        }
      }

      // Find and update the menu
      const updatedMenu = await Menu.findOneAndUpdate(
        { _id: menuObjectId, restaurantId: restaurantId },
        { $set: preparedUpdate },
        { new: true, runValidators: true } // Return the updated doc, run validators
      );

      if (!updatedMenu) {
        throw new AppError("Menu not found or access denied", 404);
      }
      return updatedMenu;
    } catch (error: any) {
      console.error("Error updating menu in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential Mongoose validation errors
      throw new AppError("Failed to update menu.", 500);
    }
  }

  /**
   * Deletes a specific menu.
   * Note: This currently does NOT handle deletion of associated MenuItems.
   *
   * @param menuId - The ID of the menu to delete.
   * @param restaurantId - The ID of the restaurant owning the menu.
   * @returns A promise resolving to an object indicating the number of deleted documents (should be 1).
   * @throws {AppError} If the menu is not found or doesn't belong to the restaurant (404),
   *                    if the menuId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async deleteMenu(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedCount: number }> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    try {
      // Add logic here to handle associated MenuItems if necessary
      // Example: await MenuItem.deleteMany({ menuId: menuObjectId, restaurantId });

      const result = await Menu.deleteOne({
        _id: menuObjectId,
        restaurantId: restaurantId,
      });

      if (result.deletedCount === 0) {
        throw new AppError("Menu not found or access denied", 404);
      }
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      console.error("Error deleting menu in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential CastError
      if (error.name === "CastError") {
        throw new AppError("Invalid menu ID format.", 400);
      }
      throw new AppError("Failed to delete menu.", 500);
    }
  }
}

export default MenuService;
