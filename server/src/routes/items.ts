import express, { Request, Response, Router, NextFunction } from "express";
import MenuItem, {
  IMenuItem,
  ITEM_TYPES, // Import constants for validation
  FOOD_CATEGORIES,
  BEVERAGE_CATEGORIES,
  ItemType,
  ItemCategory,
} from "../models/MenuItem";
import Menu from "../models/Menu";
import { protect, restrictTo } from "../middleware/authMiddleware";
import mongoose, { Types } from "mongoose";
import ItemService from "../services/itemService"; // Import the new service
import { AppError } from "../utils/errorHandler";

const router: Router = express.Router();

// Helper function for category validation
const isValidCategory = (
  itemType: ItemType,
  category: ItemCategory
): boolean => {
  if (itemType === "food" && FOOD_CATEGORIES.includes(category as any)) {
    return true;
  }
  if (
    itemType === "beverage" &&
    BEVERAGE_CATEGORIES.includes(category as any)
  ) {
    return true;
  }
  return false;
};

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
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    // Basic check for restaurantId
    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user", 400));
    }

    // Pass the whole body to the service, let it handle validation & extraction
    const itemData = req.body;

    try {
      const savedItem = await ItemService.createItem(itemData, restaurantId);
      res.status(201).json({ item: savedItem });
    } catch (error: any) {
      // Service handles validation, not found, and other errors
      next(error);
    }
  }
);

/**
 * @route   GET /api/items
 * @desc    Get items (filtered by menuId)
 * @access  Private (Restaurant or Staff)
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { menuId } = req.query;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user", 400));
    }

    // Prepare filter object
    const filter = { menuId: menuId as string | undefined };

    try {
      // Delegate fetching to the service
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
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { itemId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    // Basic checks
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return next(new AppError("Invalid Item ID format", 400));
    }
    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user", 400));
    }

    // Pass the request body to the service for validation and processing
    const updateData = req.body;

    try {
      const updatedItem = await ItemService.updateItem(
        itemId,
        updateData,
        restaurantId
      );
      // Service handles validation, not found, etc.
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
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { itemId } = req.params;
    const restaurantId = req.user?.restaurantId as mongoose.Types.ObjectId;

    // Basic checks
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return next(new AppError("Invalid Item ID format", 400));
    }
    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user", 400));
    }

    try {
      // Delegate deletion to the service
      await ItemService.deleteItem(itemId, restaurantId);
      // Service handles not found error
      res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
