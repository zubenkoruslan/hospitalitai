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
 * @desc    Create a new menu item within a specific menu
 * @access  Private (Restaurant Role)
 */
router.post(
  "/",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const {
      name,
      description,
      price,
      ingredients,
      itemType,
      category,
      menuId,
      isGlutenFree,
      isDairyFree,
      isVegetarian,
      isVegan,
    } = req.body;
    const restaurantId = req.user?.restaurantId;

    // --- Validation ---
    if (!name || !menuId || !itemType || !category) {
      return res.status(400).json({
        message: "Item name, menu ID, type, and category are required",
      });
    }

    // Name validation
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 50
    ) {
      return res.status(400).json({
        message: "Item name must be between 2 and 50 characters",
      });
    }

    // Description validation if provided
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        message: "Description must be a string if provided",
      });
    }

    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID not found for user" });
    }
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return res.status(400).json({ message: "Invalid Menu ID format" });
    }
    if (!ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({
        message: `Invalid item type. Must be one of: ${ITEM_TYPES.join(", ")}`,
      });
    }
    if (!isValidCategory(itemType, category)) {
      const allowed =
        itemType === "food"
          ? FOOD_CATEGORIES.join(", ")
          : BEVERAGE_CATEGORIES.join(", ");
      return res.status(400).json({
        message: `Invalid category '${category}' for type '${itemType}'. Allowed: ${allowed}`,
      });
    }

    // Enhanced price validation
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice)) {
        return res.status(400).json({
          message: "Price must be a valid number",
        });
      }

      if (numPrice < 0) {
        return res.status(400).json({
          message: "Price cannot be negative",
        });
      }

      if (numPrice > 1000) {
        // Set a reasonable upper limit
        return res.status(400).json({
          message: "Price exceeds maximum allowed value (1000)",
        });
      }
    }

    // Enhanced ingredients validation
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({
          message: "Ingredients must be provided as an array",
        });
      }

      // Check each ingredient
      for (const ingredient of ingredients) {
        if (typeof ingredient !== "string" || ingredient.trim().length === 0) {
          return res.status(400).json({
            message: "Each ingredient must be a non-empty string",
          });
        }

        if (ingredient.trim().length > 50) {
          return res.status(400).json({
            message: "Ingredient names cannot exceed 50 characters",
          });
        }
      }
    }

    try {
      const parentMenu = await Menu.findOne({
        _id: menuId,
        restaurantId: restaurantId,
      });
      if (!parentMenu) {
        return res
          .status(404)
          .json({ message: "Target menu not found or access denied" });
      }

      // --- Create Item Data ---
      const newItemData: Partial<IMenuItem> = {
        name,
        itemType,
        category,
        menuId: new mongoose.Types.ObjectId(menuId),
        restaurantId: restaurantId,
        isGlutenFree: Boolean(isGlutenFree ?? false),
        isDairyFree: Boolean(isDairyFree ?? false),
        isVegetarian: Boolean(isVegetarian ?? false),
        isVegan: Boolean(isVegan ?? false),
      };
      if (description !== undefined) newItemData.description = description;
      if (price !== undefined) newItemData.price = Number(price);
      if (ingredients !== undefined)
        newItemData.ingredients = ingredients.map(String).filter(Boolean);

      // Enforce dietary consistency (Vegan implies Vegetarian)
      if (newItemData.isVegan && !newItemData.isVegetarian) {
        newItemData.isVegetarian = true;
      }
      // Add other consistency checks if needed

      const item = new MenuItem(newItemData);
      const savedItem = await item.save();

      res.status(201).json({ item: savedItem });
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        console.error("Error creating menu item:", error);
        next(error);
      }
    }
  }
);

/**
 * @route   GET /api/items
 * @desc    Get items (filtered by menuId)
 * @access  Private (Restaurant or Staff)
 */
// Implement GET /api/items?menuId=xxx
router.get(
  "/",
  // No specific role restriction needed here if staff can also view items
  // restrictTo("restaurant", "staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { menuId } = req.query; // Get menuId from query parameters (optional)
    const restaurantId = req.user?.restaurantId;

    // --- Validation ---
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID not found for user" });
    }

    // Build the query filter
    const queryFilter: {
      restaurantId: Types.ObjectId;
      menuId?: Types.ObjectId;
    } = {
      restaurantId: restaurantId,
    };

    // If menuId is provided, validate it and add to filter
    if (menuId) {
      const menuIdStr = String(menuId);
      if (!mongoose.Types.ObjectId.isValid(menuIdStr)) {
        return res
          .status(400)
          .json({ message: "Invalid Menu ID format in query parameter" });
      }
      queryFilter.menuId = new mongoose.Types.ObjectId(menuIdStr);
    }

    // --- If menuId is NOT provided, it means we want ALL items for the restaurant ---
    // No extra check needed, the queryFilter without menuId handles this.

    try {
      // Find items based on the constructed filter
      const items = await MenuItem.find(queryFilter);

      // --- Respond ---
      // Send response with items nested under an 'items' key
      res.status(200).json({ items: items });
    } catch (error: any) {
      console.error("Error fetching menu items:", error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/items/:itemId
 * @desc    Update a menu item
 * @access  Private (Restaurant Role)
 */
// Implement PUT /api/items/:itemId
router.put(
  "/:itemId",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { itemId } = req.params;
    const {
      name,
      description,
      price,
      ingredients,
      itemType,
      category,
      isGlutenFree,
      isDairyFree,
      isVegetarian,
      isVegan,
    } = req.body;
    const restaurantId = req.user?.restaurantId;

    // --- Validation ---
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid Item ID format" });
    }
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID not found for user" });
    }
    if (itemType !== undefined && !ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({
        message: `Invalid item type. Must be one of: ${ITEM_TYPES.join(", ")}`,
      });
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ message: "Invalid price format" });
    }
    if (ingredients !== undefined && !Array.isArray(ingredients)) {
      return res
        .status(400)
        .json({ message: "Ingredients must be an array of strings" });
    }

    // Build update object
    const updateData: { [key: string]: any } = {}; // Use more flexible type for update
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined)
      updateData.description = String(description).trim();
    if (price !== undefined) updateData.price = Number(price);
    if (ingredients !== undefined)
      updateData.ingredients = ingredients.map(String).filter(Boolean);
    if (itemType !== undefined) updateData.itemType = itemType;
    if (category !== undefined) updateData.category = category;
    if (isGlutenFree !== undefined)
      updateData.isGlutenFree = Boolean(isGlutenFree);
    if (isDairyFree !== undefined)
      updateData.isDairyFree = Boolean(isDairyFree);
    if (isVegetarian !== undefined)
      updateData.isVegetarian = Boolean(isVegetarian);
    if (isVegan !== undefined) updateData.isVegan = Boolean(isVegan);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    if (updateData.name === "") {
      return res.status(400).json({ message: "Item name cannot be empty" });
    }

    try {
      const existingItem = await MenuItem.findOne({
        _id: itemId,
        restaurantId: restaurantId,
      });
      if (!existingItem) {
        return res
          .status(404)
          .json({ message: "Menu item not found or access denied" });
      }

      // Validate category against the final item type
      const finalItemType = updateData.itemType || existingItem.itemType;
      const finalCategory = updateData.category || existingItem.category;
      if (
        updateData.category !== undefined ||
        updateData.itemType !== undefined
      ) {
        // Only validate if changed
        if (!isValidCategory(finalItemType, finalCategory)) {
          const allowed =
            finalItemType === "food"
              ? FOOD_CATEGORIES.join(", ")
              : BEVERAGE_CATEGORIES.join(", ");
          return res.status(400).json({
            message: `Invalid category '${finalCategory}' for type '${finalItemType}'. Allowed: ${allowed}`,
          });
        }
      }

      // Enforce dietary consistency (Vegan implies Vegetarian)
      // Need to check the final intended state, considering existing values
      const finalIsVegan = updateData.isVegan ?? existingItem.isVegan;
      const intendedIsVegetarian =
        updateData.isVegetarian ?? existingItem.isVegetarian;
      if (finalIsVegan && !intendedIsVegetarian) {
        // If isVegan is being set true, and isVegetarian is false or undefined,
        // force isVegetarian to true in the update.
        updateData.isVegetarian = true;
      }
      // Add other consistency checks if needed

      // Update with validated data
      const updatedItem = await MenuItem.findByIdAndUpdate(
        itemId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedItem) {
        return res
          .status(404)
          .json({ message: "Menu item update failed or item not found." });
      }

      res.status(200).json({ item: updatedItem });
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        console.error("Error updating menu item:", error);
        next(error);
      }
    }
  }
);

/**
 * @route   DELETE /api/items/:itemId
 * @desc    Delete a menu item
 * @access  Private (Restaurant Role)
 */
// Implement DELETE /api/items/:itemId
router.delete(
  "/:itemId",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { itemId } = req.params;
    const restaurantId = req.user?.restaurantId;

    // --- Validation ---
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid Item ID format" });
    }
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Restaurant ID not found for user" });
    }

    try {
      // --- Delete Item ---
      const result = await MenuItem.deleteOne({
        _id: itemId,
        restaurantId: restaurantId, // Security check: ensure user owns item
      });

      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ message: "Menu item not found or access denied" });
      }

      // --- Respond ---
      // Send 204 No Content or 200 with message
      // res.status(204).send();
      res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting menu item:", error);
      next(error);
    }
  }
);

export default router;
