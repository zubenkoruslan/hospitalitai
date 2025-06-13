import { Request, Response } from "express";
import { MenuCrudService } from "../services/MenuCrudService";
import MenuItem from "../models/MenuItem";
import { Types } from "mongoose";

// Create local type alias for the authenticated request with user info
type AuthenticatedRequest = Request & {
  user?: {
    userId: Types.ObjectId;
    restaurantId?: Types.ObjectId;
    role: string;
    name: string;
  };
};

// ================= MENU CRUD OPERATIONS =================

/**
 * Get all menus for a restaurant
 */
export const getMenus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const status = req.query.status as
      | "all"
      | "active"
      | "inactive"
      | undefined;

    const result = await MenuCrudService.getAllMenus(restaurantId!, status);
    res.json(result);
  } catch (error: any) {
    console.error("Error fetching menus:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error fetching menus",
    });
  }
};

/**
 * Get a specific menu by ID
 */
export const getMenuById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const { menuId } = req.params;

    const menu = await MenuCrudService.getMenuById(menuId, restaurantId!);
    if (!menu) {
      res.status(404).json({ message: "Menu not found" });
      return;
    }

    res.json(menu);
  } catch (error: any) {
    console.error("Error fetching menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error fetching menu",
    });
  }
};

/**
 * Create a new menu
 */
export const createMenu = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const { name, description, isActive = true } = req.body;

    if (!name) {
      res.status(400).json({ message: "Menu name is required" });
      return;
    }

    const menuData = { name, description, isActive };
    const menu = await MenuCrudService.createMenu(menuData, restaurantId!);

    res.status(201).json(menu);
  } catch (error: any) {
    console.error("Error creating menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error creating menu",
    });
  }
};

/**
 * Update a menu
 */
export const updateMenu = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const { menuId } = req.params;
    const updates = req.body;

    const menu = await MenuCrudService.updateMenu(
      menuId,
      updates,
      restaurantId!
    );
    if (!menu) {
      res.status(404).json({ message: "Menu not found" });
      return;
    }

    res.json(menu);
  } catch (error: any) {
    console.error("Error updating menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error updating menu",
    });
  }
};

/**
 * Delete a menu
 */
export const deleteMenu = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const { menuId } = req.params;

    await MenuCrudService.deleteMenu(menuId, restaurantId!);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error deleting menu",
    });
  }
};

/**
 * Update menu activation status
 */
export const updateMenuActivationStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const { menuId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({ message: "isActive must be a boolean value" });
      return;
    }

    const menu = await MenuCrudService.updateMenuActivationStatus(
      menuId,
      restaurantId!,
      isActive
    );

    if (!menu) {
      res.status(404).json({ message: "Menu not found" });
      return;
    }

    res.json({ success: true, data: menu });
  } catch (error: any) {
    console.error("Error updating menu activation status:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error updating menu activation status",
    });
  }
};

/**
 * Delete a category and reassign items to another category
 */
export const deleteCategoryAndReassignItems = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.user!;
    const { menuId, categoryName } = req.params;
    const { reassignToCategory } = req.body;

    if (!reassignToCategory) {
      res.status(400).json({
        message: "reassignToCategory is required in the request body",
      });
      return;
    }

    // Find items in the category to be deleted
    const itemsToReassign = await MenuItem.find({
      menuId,
      restaurantId,
      category: categoryName,
    });

    if (itemsToReassign.length === 0) {
      res.status(404).json({
        message: `No items found in category "${categoryName}"`,
      });
      return;
    }

    // Update all items to the new category
    await MenuItem.updateMany(
      { menuId, restaurantId, category: categoryName },
      { $set: { category: reassignToCategory } }
    );

    res.json({
      message: `Successfully reassigned ${itemsToReassign.length} items from "${categoryName}" to "${reassignToCategory}"`,
      itemsReassigned: itemsToReassign.length,
    });
  } catch (error: any) {
    console.error("Error deleting category and reassigning items:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error deleting category and reassigning items",
    });
  }
};
