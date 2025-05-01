import express, { Request, Response, Router, NextFunction } from "express";
import Menu, { IMenu } from "../models/Menu";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { ensureRestaurantAssociation } from "../middleware/restaurantMiddleware";
import {
  handleValidationErrors,
  validateMenuIdParam,
  validateCreateMenu,
  validateUpdateMenu,
} from "../middleware/validationMiddleware";
import mongoose from "mongoose";
import { AppError } from "../utils/errorHandler";

const router: Router = express.Router();

// === Middleware specific to this router ===
router.use(protect);
router.use(ensureRestaurantAssociation);

// === Routes ===

/**
 * @route   POST /api/menus
 * @desc    Create a new menu
 * @access  Private (Restaurant Role)
 */
router.post(
  "/",
  restrictTo("restaurant"),
  validateCreateMenu,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, description } = req.body;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const existingMenu = await Menu.findOne({
        name: name.trim(),
        restaurantId: restaurantId,
      });

      if (existingMenu) {
        return next(new AppError("A menu with this name already exists", 400));
      }

      const newMenuData: Partial<IMenu> = {
        name: name.trim(),
        restaurantId: restaurantId,
      };
      if (description) newMenuData.description = description.trim();

      const menu = new Menu(newMenuData);
      const savedMenu = await menu.save();

      res.status(201).json({ menu: savedMenu });
    } catch (error) {
      next(error);
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
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const menus = await Menu.find({ restaurantId }).lean();
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
  validateMenuIdParam,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { menuId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const menu = await Menu.findOne({ _id: menuId, restaurantId }).lean();

      if (!menu) {
        return next(new AppError("Menu not found or access denied", 404));
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
  validateMenuIdParam,
  validateUpdateMenu,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { menuId } = req.params;
    const { name, description } = req.body;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    const updateData: { [key: string]: any } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();

    try {
      if (updateData.name) {
        const existingMenu = await Menu.findOne({
          _id: { $ne: menuId },
          name: updateData.name,
          restaurantId: restaurantId,
        });
        if (existingMenu) {
          return next(
            new AppError(
              `A menu with the name '${updateData.name}' already exists`,
              400
            )
          );
        }
      }

      const updatedMenu = await Menu.findOneAndUpdate(
        { _id: menuId, restaurantId: restaurantId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedMenu) {
        return next(new AppError("Menu not found or access denied", 404));
      }
      res.json({ menu: updatedMenu });
    } catch (error) {
      next(error);
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
  validateMenuIdParam,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { menuId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    try {
      const result = await Menu.deleteOne({
        _id: menuId,
        restaurantId: restaurantId,
      });

      if (result.deletedCount === 0) {
        return next(new AppError("Menu not found or access denied", 404));
      }
      res.status(200).json({ message: "Menu deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu:", error);
      next(error);
    }
  }
);

export default router;
