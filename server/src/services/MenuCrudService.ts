import mongoose, { Types } from "mongoose";
import Menu, { IMenu } from "../models/Menu";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import { AppError } from "../utils/errorHandler";

export interface MenuData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface MenuWithItems {
  _id: any;
  name: string;
  description?: string;
  isActive: boolean;
  restaurantId: any;
  items: IMenuItem[];
  [key: string]: any; // Allow additional properties
}

/**
 * Service responsible for basic menu CRUD operations
 * Extracted from MenuService for better separation of concerns
 */
export class MenuCrudService {
  /**
   * Create a new menu
   */
  static async createMenu(
    data: MenuData,
    restaurantId: Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IMenu> {
    // Check for existing menu with same name
    const existingMenu = await Menu.findOne({
      name: data.name,
      restaurantId,
    }).session(session || null);

    if (existingMenu) {
      throw new AppError(
        `A menu with the name "${data.name}" already exists for this restaurant. Please choose a different name or update the existing menu.`,
        409
      );
    }

    const menu = new Menu({ ...data, restaurantId });
    await menu.save({ session });

    console.log(
      `✅ Created menu: "${data.name}" for restaurant ${restaurantId}`
    );
    return menu;
  }

  /**
   * Get all menus for a restaurant with optional status filtering
   */
  static async getAllMenus(
    restaurantId: Types.ObjectId,
    status?: "all" | "active" | "inactive"
  ): Promise<IMenu[]> {
    const query: any = { restaurantId };

    if (status && status !== "all") {
      query.isActive = status === "active";
    }

    const menus = await Menu.find(query).sort({ name: 1 });

    console.log(
      `📋 Retrieved ${
        menus.length
      } menus for restaurant ${restaurantId} (status: ${status || "all"})`
    );
    return menus;
  }

  /**
   * Get a menu by ID with its items
   */
  static async getMenuById(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<MenuWithItems | null> {
    console.log(
      `🔍 Looking up menu ID: ${menuId} for restaurant: ${restaurantId}`
    );

    // Validate menu ID format
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      console.error(`❌ Invalid menu ID format: ${menuId}`);
      throw new AppError("Invalid menu ID format", 400);
    }

    // Find the menu
    const menu = await Menu.findOne({ _id: menuId, restaurantId }).lean();
    if (!menu) {
      console.log(`❌ Menu not found: ${menuId}`);
      return null;
    }

    // Get menu items
    const items = await MenuItem.find({
      menuId: menu._id,
      restaurantId,
      isActive: true,
    });

    console.log(`✅ Found menu "${menu.name}" with ${items.length} items`);
    return { ...menu, items } as MenuWithItems;
  }

  /**
   * Update an existing menu
   */
  static async updateMenu(
    menuId: string | Types.ObjectId,
    updateData: Partial<MenuData>,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    // Validate menu ID format
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }

    // Find the menu
    const menu = await Menu.findOne({ _id: menuId, restaurantId });
    if (!menu) {
      throw new AppError(
        "Menu not found or does not belong to this restaurant",
        404
      );
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== menu.name) {
      const existingMenuWithName = await Menu.findOne({
        name: updateData.name,
        restaurantId,
        _id: { $ne: menuId },
      });

      if (existingMenuWithName) {
        throw new AppError(
          `Another menu with the name "${updateData.name}" already exists. Please choose a different name.`,
          409
        );
      }
    }

    // Apply updates
    Object.assign(menu, updateData);
    await menu.save();

    console.log(`✅ Updated menu: ${menuId} with data:`, updateData);
    return menu;
  }

  /**
   * Delete a menu and all its items
   */
  static async deleteMenu(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedMenuCount: number; deletedItemsCount: number }> {
    // Validate menu ID format
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify menu exists and belongs to restaurant
      const menu = await Menu.findOne({ _id: menuId, restaurantId }).session(
        session
      );
      if (!menu) {
        throw new AppError(
          "Menu not found or does not belong to this restaurant",
          404
        );
      }

      // Delete all menu items first
      const deletedItemsResult = await MenuItem.deleteMany({
        menuId,
        restaurantId,
      }).session(session);

      // Delete the menu
      const deletedMenuResult = await Menu.deleteOne({
        _id: menuId,
        restaurantId,
      }).session(session);

      if (deletedMenuResult.deletedCount === 0) {
        throw new AppError(
          "Menu not found during delete operation or does not belong to this restaurant",
          404
        );
      }

      await session.commitTransaction();

      const result = {
        deletedMenuCount: deletedMenuResult.deletedCount,
        deletedItemsCount: deletedItemsResult.deletedCount,
      };

      console.log(
        `🗑️ Deleted menu ${menuId}: ${result.deletedMenuCount} menu, ${result.deletedItemsCount} items`
      );
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update menu activation status
   */
  static async updateMenuActivationStatus(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId,
    isActive: boolean
  ): Promise<IMenu | null> {
    // Validate menu ID format
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }

    // Find and update the menu
    const menu = await Menu.findOne({ _id: menuId, restaurantId });
    if (!menu) {
      throw new AppError(
        "Menu not found or does not belong to this restaurant",
        404
      );
    }

    menu.isActive = isActive;
    await menu.save();

    console.log(`🔄 Updated menu ${menuId} activation status to: ${isActive}`);
    return menu;
  }

  /**
   * Get menu statistics for a restaurant
   */
  static async getMenuStatistics(restaurantId: Types.ObjectId): Promise<{
    totalMenus: number;
    activeMenus: number;
    inactiveMenus: number;
    totalItems: number;
    itemsByMenu: Array<{ menuId: string; menuName: string; itemCount: number }>;
  }> {
    // Get all menus
    const menus = await Menu.find({ restaurantId }).lean();

    // Count active/inactive
    const activeMenus = menus.filter((menu) => menu.isActive).length;
    const inactiveMenus = menus.length - activeMenus;

    // Get item counts per menu
    const itemCountsPromises = menus.map(async (menu) => {
      const itemCount = await MenuItem.countDocuments({
        menuId: menu._id,
        restaurantId,
        isActive: true,
      });

      return {
        menuId: menu._id.toString(),
        menuName: menu.name,
        itemCount,
      };
    });

    const itemsByMenu = await Promise.all(itemCountsPromises);
    const totalItems = itemsByMenu.reduce(
      (sum, menu) => sum + menu.itemCount,
      0
    );

    const stats = {
      totalMenus: menus.length,
      activeMenus,
      inactiveMenus,
      totalItems,
      itemsByMenu,
    };

    console.log(`📊 Menu statistics for restaurant ${restaurantId}:`, stats);
    return stats;
  }

  /**
   * Check if a menu name is available for a restaurant
   */
  static async isMenuNameAvailable(
    menuName: string,
    restaurantId: Types.ObjectId,
    excludeMenuId?: string | Types.ObjectId
  ): Promise<boolean> {
    const query: any = {
      name: menuName,
      restaurantId,
    };

    if (excludeMenuId) {
      query._id = { $ne: excludeMenuId };
    }

    const existingMenu = await Menu.findOne(query);
    return !existingMenu;
  }

  /**
   * Get menus by status with pagination
   */
  static async getMenusByStatus(
    restaurantId: Types.ObjectId,
    isActive: boolean,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    menus: IMenu[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;

    const [menus, totalCount] = await Promise.all([
      Menu.find({ restaurantId, isActive })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Menu.countDocuments({ restaurantId, isActive }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      menus,
      totalCount,
      totalPages,
      currentPage: page,
    };
  }
}
