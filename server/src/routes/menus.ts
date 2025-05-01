import express, { Request, Response, Router, NextFunction } from "express";
import Menu, { IMenu } from "../models/Menu";
import { protect, restrictTo } from "../middleware/authMiddleware";
import mongoose from "mongoose";

const router: Router = express.Router();

// === Middleware specific to this router ===
// Use 'protect' for authentication
router.use(protect);

// === Routes ===

/**
 * @route   POST /api/menus
 * @desc    Create a new menu
 * @access  Private (Restaurant Role)
 */
router.post(
  "/",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, description } = req.body;
    const restaurantId = req.user?.restaurantId;

    // Enhanced validation
    if (!name || typeof name !== "string") {
      res
        .status(400)
        .json({ message: "Menu name is required and must be a string" });
      return;
    }

    if (name.trim().length < 2 || name.trim().length > 50) {
      res
        .status(400)
        .json({ message: "Menu name must be between 2 and 50 characters" });
      return;
    }

    if (description && typeof description !== "string") {
      res
        .status(400)
        .json({ message: "Description must be a string if provided" });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      const newMenuData: Partial<IMenu> = {
        name: name.trim(),
        restaurantId: restaurantId,
      };
      if (description) newMenuData.description = description.trim();

      // Check for duplicate menu names for this restaurant
      const existingMenu = await Menu.findOne({
        name: name.trim(),
        restaurantId: restaurantId,
      });

      if (existingMenu) {
        res
          .status(400)
          .json({ message: "A menu with this name already exists" });
        return;
      }

      const menu = new Menu(newMenuData);
      const savedMenu = await menu.save();

      res.status(201).json({ menu: savedMenu });
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      const menus = await Menu.find({ restaurantId });
      res.json({ menus: menus });
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      res.json({ menu: menu });
    } catch (error) {
      console.error("Error fetching single menu:", error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/menus/:menuId
 * @desc    Update a menu
 * @access  Private (Restaurant Role)
 */
router.put(
  "/:menuId",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { menuId } = req.params;
    const { name, description } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return res.status(400).json({ message: "Invalid Menu ID format" });
    }
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID not found for user" });
    }

    const updateData: Partial<IMenu> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    try {
      const updatedMenu = await Menu.findOneAndUpdate(
        { _id: menuId, restaurantId: restaurantId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedMenu) {
        return res
          .status(404)
          .json({ message: "Menu not found or access denied" });
      }
      res.json({ menu: updatedMenu });
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        console.error("Error updating menu:", error);
        next(error); // Pass error to error-handling middleware
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
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      const result = await Menu.deleteOne({
        _id: menuId,
        restaurantId: restaurantId,
      });

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

export default router;
