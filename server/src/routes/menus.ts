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
import MenuService from "../services/menuService";
import * as menuController from "../controllers/menuController";
import { uploadPdf } from "../middleware/uploadMiddleware";

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
      const savedMenu = await MenuService.createMenu(
        { name, description },
        restaurantId
      );
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
      const menus = await MenuService.getAllMenus(restaurantId);
      res.json({ menus });
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
      const menu = await MenuService.getMenuById(menuId, restaurantId);
      res.json({ menu });
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

    const updateData = { name, description };

    try {
      const updatedMenu = await MenuService.updateMenu(
        menuId,
        updateData,
        restaurantId
      );
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
      await MenuService.deleteMenu(menuId, restaurantId);
      res.status(200).json({ message: "Menu deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu:", error);
      next(error);
    }
  }
);

// New route for PDF menu upload
router.post(
  "/:restaurantId/upload-pdf",
  protect,
  restrictTo("restaurant"),
  uploadPdf.single("menuPdf"),
  menuController.uploadMenuPdf
);

export default router;
