import express, { Request, Response, Router, NextFunction } from "express";
import { protect, restrictTo } from "../middleware/authMiddleware";
import mongoose from "mongoose"; // For req.user.restaurantId type assertion
import ItemService from "../services/itemService";
import { AppError } from "../utils/errorHandler";
import {
  handleValidationErrors,
  validateObjectId,
  validateCreateItemBody,
  validateUpdateItemBody,
} from "../middleware/validationMiddleware";

const router: Router = express.Router();

// === Middleware ===
router.use(protect);

// === Routes ===

/**
 * @route   POST /api/items
 * @desc    Create a new menu item
 * @access  Private (Restaurant Role)
 */
router.post(
  "/",
  restrictTo("restaurant"),
  validateCreateItemBody,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!restaurantId) {
      // This specific check for restaurantId on user can remain
      return next(new AppError("Restaurant ID not found for user", 400));
    }

    const itemData = req.body;

    try {
      const savedItem = await ItemService.createItem(itemData, restaurantId);
      res.status(201).json({ item: savedItem });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/items
 * @desc    Get items (filtered by menuId if provided in query)
 * @access  Private (Restaurant or Staff)
 */
router.get(
  "/",
  // No specific validation for query params here, service handles undefined menuId
  // If menuId query param needs validation (e.g. isMongoId if present), add here
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { menuId } = req.query;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user", 400));
    }

    const filter = { menuId: menuId as string | undefined };

    try {
      const items = await ItemService.getItems(filter, restaurantId);
      res.status(200).json({ items });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/items/:itemId
 * @desc    Update a menu item
 * @access  Private (Restaurant Role)
 */
router.put(
  "/:itemId",
  restrictTo("restaurant"),
  validateObjectId("itemId"),
  validateUpdateItemBody,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { itemId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!restaurantId) {
      // This specific check for restaurantId on user can remain
      return next(new AppError("Restaurant ID not found for user", 400));
    }
    // Removed manual mongoose.Types.ObjectId.isValid(itemId) check

    const updateData = req.body;

    try {
      const updatedItem = await ItemService.updateItem(
        itemId,
        updateData,
        restaurantId
      );
      res.status(200).json({ item: updatedItem });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/items/:itemId
 * @desc    Delete a menu item
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:itemId",
  restrictTo("restaurant"),
  validateObjectId("itemId"),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { itemId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!restaurantId) {
      // This specific check for restaurantId on user can remain
      return next(new AppError("Restaurant ID not found for user", 400));
    }
    // Removed manual mongoose.Types.ObjectId.isValid(itemId) check

    try {
      await ItemService.deleteItem(itemId, restaurantId);
      res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
