import express, { Request, Response, Router, NextFunction } from "express";
import Menu, { IMenu } from "../models/Menu";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware"; // Assuming middleware exists
import mongoose from "mongoose";

const router: Router = express.Router();

// Extend Express Request interface to include user from auth middleware
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    restaurantId?: string;
  };
}

// === Middleware specific to this router ===
// All menu routes require authentication
router.use(authenticateToken);

// === Routes ===

/**
 * @route   POST /api/menus
 * @desc    Create a new menu
 * @access  Private (Restaurant Role)
 */
router.post(
  "/",
  authorizeRole(["restaurant"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { name, description, items } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!name) {
      res.status(400).json({ message: "Menu name is required" });
      return;
    }
    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }
    if (items && !Array.isArray(items)) {
      res.status(400).json({ message: "Menu items must be an array" });
      return;
    }

    try {
      const newMenuData: Partial<IMenu> = {
        name,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        items: items || [],
      };
      if (description) newMenuData.description = description;

      const menu = new Menu(newMenuData);
      await menu.save();
      res.status(201).json(menu);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        console.error("Error creating menu:", error);
        next(error);
      }
    }
  }
);

/**
 * @route   GET /api/menus
 * @desc    Get all menus for the user's restaurant
 * @access  Private (Restaurant or Staff)
 */
router.get(
  "/",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      const menus = await Menu.find({ restaurantId });
      res.json(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/menus/:menuId
 * @desc    Get a single menu by ID
 * @access  Private (Restaurant or Staff)
 */
router.get(
  "/:menuId",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { menuId } = req.params;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      res.status(400).json({ message: "Invalid Menu ID format" });
      return;
    }
    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      const menu = await Menu.findOne({ _id: menuId, restaurantId });

      if (!menu) {
        res.status(404).json({ message: "Menu not found or access denied" });
        return;
      }
      res.json(menu);
    } catch (error) {
      console.error("Error fetching single menu:", error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/menus/:menuId
 * @desc    Update a menu (including items)
 * @access  Private (Restaurant Role)
 */
router.put(
  "/:menuId",
  authorizeRole(["restaurant"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { menuId } = req.params;
    const { name, description, items } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      res.status(400).json({ message: "Invalid Menu ID format" });
      return;
    }
    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    const updateData: Partial<IMenu> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (items !== undefined) {
      if (!Array.isArray(items)) {
        res.status(400).json({ message: "Menu items must be an array" });
        return;
      }
      updateData.items = items;
    }

    try {
      const updatedMenu = await Menu.findOneAndUpdate(
        { _id: menuId, restaurantId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedMenu) {
        res.status(404).json({ message: "Menu not found or access denied" });
        return;
      }
      res.json(updatedMenu);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        console.error("Error updating menu:", error);
        next(error);
      }
    }
  }
);

/**
 * @route   DELETE /api/menus/:menuId
 * @desc    Delete a menu
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:menuId",
  authorizeRole(["restaurant"]),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { menuId } = req.params;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      res.status(400).json({ message: "Invalid Menu ID format" });
      return;
    }
    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      const result = await Menu.deleteOne({ _id: menuId, restaurantId });

      if (result.deletedCount === 0) {
        res.status(404).json({ message: "Menu not found or access denied" });
        return;
      }
      res.status(200).json({ message: "Menu deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu:", error);
      next(error);
    }
  }
);

// Routes for managing individual menu items could go here (e.g., POST /:menuId/items, PUT /:menuId/items/:itemId)
// For simplicity, the PUT route above replaces the whole items array.

export default router;
