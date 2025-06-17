import mongoose, { Types } from "mongoose";
import MenuItem, {
  IMenuItem,
  ItemType,
  ITEM_TYPES,
  ILeanMenuItem,
} from "../models/MenuItem";
import Menu from "../models/Menu";
import { AppError } from "../utils/errorHandler";

// Interface for data passed to create/update
// Define more strictly than route's flexible body
interface ItemData {
  name: string;
  menuId: string | Types.ObjectId;
  itemType: ItemType;
  category: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isActive?: boolean;
}

export interface ItemUpdateData {
  name?: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  itemType?: ItemType;
  category?: string;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  // Wine-specific fields
  wineStyle?: string;
  wineColor?: string;
  producer?: string;
  grapeVariety?: string[];
  vintage?: number;
  region?: string;
  servingOptions?: Array<{ size: string; price: number }>;
  suggestedPairingsText?: string[];
  // menuId is generally not updated this way, handled by separate move/link logic if needed
}

interface ItemFilter {
  menuId?: string | Types.ObjectId;
  // Add other potential filters later: category, name contains, etc.
}

class ItemService {
  /**
   * Creates a new menu item associated with a menu and restaurant.
   *
   * @param data - The data for the new menu item.
   * @param restaurantId - The ID of the restaurant creating the item.
   * @param session - Optional Mongoose session for atomic operations
   * @returns A promise resolving to the created menu item document.
   * @throws {AppError} If validation fails (e.g., invalid category, price, name length),
   *                    if the target menu is not found or doesn't belong to the restaurant,
   *                    or if any database save operation fails.
   */
  static async createItem(
    data: ItemData,
    restaurantId: Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IMenuItem> {
    const {
      name,
      menuId,
      itemType,
      category,
      description,
      price,
      ingredients,
      isGlutenFree,
      isDairyFree,
      isVegetarian,
      isVegan,
      isActive,
    } = data;

    // Normalize category by trimming whitespace only (preserve case)
    const normalizedCategory = category.trim();

    // --- Validation within Service ---
    if (!name || !menuId || !itemType || !normalizedCategory) {
      throw new AppError(
        "Item name, menu ID, type, and category are required",
        400
      );
    }
    if (name.trim().length < 2 || name.trim().length > 50) {
      throw new AppError("Item name must be between 2 and 50 characters", 400);
    }
    if (!ITEM_TYPES.includes(itemType)) {
      throw new AppError(
        `Invalid item type. Must be one of: ${ITEM_TYPES.join(", ")}`,
        400
      );
    }
    // Price validation
    if (price !== undefined) {
      if (typeof price !== "number" || isNaN(price)) {
        throw new AppError("Price must be a valid number", 400);
      }
      if (price < 0) {
        throw new AppError("Price cannot be negative", 400);
      }
      if (price > 1000) {
        // Example limit
        throw new AppError("Price exceeds maximum allowed value (1000)", 400);
      }
    }
    // Ingredients validation
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        throw new AppError("Ingredients must be provided as an array", 400);
      }
      for (const ing of ingredients) {
        if (typeof ing !== "string" || ing.trim().length === 0) {
          throw new AppError("Each ingredient must be a non-empty string", 400);
        }
        if (ing.trim().length > 50) {
          throw new AppError(
            "Ingredient names cannot exceed 50 characters",
            400
          );
        }
      }
    }

    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    try {
      // Check if parent menu exists and belongs to the restaurant
      const parentMenuQuery = Menu.findOne({
        _id: menuObjectId,
        restaurantId: restaurantId,
      });
      if (session) {
        parentMenuQuery.session(session);
      }
      const parentMenu = await parentMenuQuery;

      if (!parentMenu) {
        throw new AppError("Target menu not found or access denied", 404);
      }

      // Prepare data for MenuItem model
      const newItemData: Partial<IMenuItem> = {
        name: name.trim(),
        itemType,
        category: normalizedCategory,
        menuId: menuObjectId,
        restaurantId: restaurantId,
        isGlutenFree: Boolean(isGlutenFree ?? false),
        isDairyFree: Boolean(isDairyFree ?? false),
        isVegetarian: Boolean(isVegetarian ?? false),
        isVegan: Boolean(isVegan ?? false),
        isActive: isActive !== undefined ? isActive : true,
      };
      if (description !== undefined && typeof description === "string") {
        newItemData.description = description.trim();
      }
      if (price !== undefined) newItemData.price = price;
      if (ingredients !== undefined)
        newItemData.ingredients = ingredients
          .map((s) => s.trim())
          .filter(Boolean);

      // Enforce dietary consistency
      if (newItemData.isVegan && !newItemData.isVegetarian) {
        newItemData.isVegetarian = true;
      }

      const item = new MenuItem(newItemData);
      const savedItem = await item.save(session ? { session } : undefined); // Mongoose validation happens here
      return savedItem;
    } catch (error: any) {
      console.error("Error creating menu item in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "ValidationError") {
        // Rethrow Mongoose validation errors as AppError
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      if (error.name === "CastError") {
        throw new AppError("Invalid Menu ID format.", 400);
      }
      throw new AppError("Failed to create menu item.", 500);
    }
  }

  /**
   * Retrieves menu items for a specific restaurant, optionally filtered by menu.
   *
   * @param filter - An object containing filter criteria (e.g., menuId).
   * @param restaurantId - The ID of the restaurant whose items are being fetched.
   * @returns A promise resolving to an array of menu item documents.
   * @throws {AppError} If the menuId in the filter is invalid format (400),
   *                    or if an unexpected database error occurs (500).
   */
  static async getItems(
    filter: ItemFilter,
    restaurantId: Types.ObjectId
  ): Promise<ILeanMenuItem[]> {
    const queryFilter: {
      restaurantId: Types.ObjectId;
      menuId?: Types.ObjectId;
    } = {
      restaurantId: restaurantId,
    };

    if (filter.menuId) {
      try {
        queryFilter.menuId =
          typeof filter.menuId === "string"
            ? new Types.ObjectId(filter.menuId)
            : filter.menuId;
      } catch (_e) {
        throw new AppError("Invalid Menu ID format in filter.", 400);
      }
    }

    try {
      const items = await MenuItem.find(queryFilter).lean();
      return items as unknown as ILeanMenuItem[];
    } catch (error: any) {
      console.error("Error fetching menu items in service:", error);
      throw new AppError("Failed to fetch menu items.", 500);
    }
  }

  /**
   * Retrieves a single menu item by its ID, ensuring it belongs to the specified restaurant.
   *
   * @param itemId - The ID of the menu item to retrieve.
   * @param restaurantId - The ID of the restaurant to scope the search.
   * @returns A promise resolving to the menu item document, or null if not found (though throws 404).
   * @throws {AppError} If the item is not found or doesn't belong to the restaurant (404),
   *                    if the itemId format is invalid (400),
   *                    or if an unexpected database error occurs (500).
   */
  static async getItemById(
    itemId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<IMenuItem | null> {
    const itemObjectId =
      typeof itemId === "string" ? new Types.ObjectId(itemId) : itemId;

    try {
      const item = await MenuItem.findOne({ _id: itemObjectId, restaurantId }); // Don't use lean if we need Mongoose methods later
      if (!item) {
        throw new AppError("Menu item not found or access denied", 404);
      }
      return item;
    } catch (error: any) {
      console.error("Error fetching item by ID in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "CastError") {
        throw new AppError("Invalid item ID format.", 400);
      }
      throw new AppError("Failed to fetch menu item.", 500);
    }
  }

  /**
   * Updates an existing menu item.
   *
   * @param itemId - The ID of the menu item to update.
   * @param updateData - An object containing the fields to update.
   * @param restaurantId - The ID of the restaurant owning the item.
   * @returns A promise resolving to the updated menu item document.
   * @throws {AppError} If validation of updateData fails (400),
   *                    if the item is not found or doesn't belong to the restaurant (404),
   *                    if the final category/itemType combination is invalid (400),
   *                    if the itemId format is invalid (400),
   *                    if Mongoose validation fails during update (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async updateItem(
    itemId: string | Types.ObjectId,
    updateData: ItemUpdateData,
    restaurantId: Types.ObjectId
  ): Promise<IMenuItem | null> {
    const itemObjectId =
      typeof itemId === "string" ? new Types.ObjectId(itemId) : itemId;

    // Prepare and validate update data
    const preparedUpdate: { [key: string]: any } = {};

    if (updateData.name !== undefined)
      preparedUpdate.name = (updateData.name as string).trim();
    if (updateData.description !== undefined)
      preparedUpdate.description = (updateData.description as string).trim();
    if (updateData.price !== undefined) {
      if (
        typeof updateData.price !== "number" ||
        isNaN(updateData.price) ||
        updateData.price < 0 ||
        updateData.price > 1000
      ) {
        throw new AppError(
          "Invalid price format or value (0-1000 allowed)",
          400
        );
      }
      preparedUpdate.price = updateData.price;
    }
    if (updateData.ingredients !== undefined)
      preparedUpdate.ingredients = updateData.ingredients
        .map((s) => s.trim())
        .filter(Boolean);
    if (updateData.itemType !== undefined) {
      if (!ITEM_TYPES.includes(updateData.itemType as ItemType)) {
        throw new AppError(
          `Invalid item type. Must be one of: ${ITEM_TYPES.join(", ")}`,
          400
        );
      }
      preparedUpdate.itemType = updateData.itemType;
    }
    if (updateData.category !== undefined)
      preparedUpdate.category = updateData.category.trim();
    if (updateData.isGlutenFree !== undefined)
      preparedUpdate.isGlutenFree = Boolean(updateData.isGlutenFree);
    if (updateData.isDairyFree !== undefined)
      preparedUpdate.isDairyFree = Boolean(updateData.isDairyFree);
    if (updateData.isVegetarian !== undefined)
      preparedUpdate.isVegetarian = Boolean(updateData.isVegetarian);
    if (updateData.isVegan !== undefined)
      preparedUpdate.isVegan = Boolean(updateData.isVegan);

    // Handle wine-specific fields
    if (updateData.wineStyle !== undefined) {
      preparedUpdate.wineStyle = updateData.wineStyle?.trim() || null;
    }
    if (updateData.wineColor !== undefined) {
      preparedUpdate.wineColor = updateData.wineColor?.trim() || null;
    }
    if (updateData.producer !== undefined) {
      preparedUpdate.producer = updateData.producer?.trim() || null;
    }
    if (updateData.grapeVariety !== undefined) {
      preparedUpdate.grapeVariety = Array.isArray(updateData.grapeVariety)
        ? updateData.grapeVariety.map((g) => g.trim()).filter((g) => g)
        : [];
    }
    if (updateData.vintage !== undefined) {
      if (
        updateData.vintage &&
        (updateData.vintage < 1000 ||
          updateData.vintage > new Date().getFullYear() + 10)
      ) {
        throw new AppError("Vintage must be a valid year", 400);
      }
      preparedUpdate.vintage = updateData.vintage || null;
    }
    if (updateData.region !== undefined) {
      preparedUpdate.region = updateData.region?.trim() || null;
    }
    if (updateData.servingOptions !== undefined) {
      preparedUpdate.servingOptions = Array.isArray(updateData.servingOptions)
        ? updateData.servingOptions.filter((opt) => opt.size && opt.price >= 0)
        : [];
    }
    if (updateData.suggestedPairingsText !== undefined) {
      preparedUpdate.suggestedPairingsText = Array.isArray(
        updateData.suggestedPairingsText
      )
        ? updateData.suggestedPairingsText.map((p) => p.trim()).filter((p) => p)
        : [];
    }

    if (Object.keys(preparedUpdate).length === 0) {
      throw new AppError("No valid update data provided", 400);
    }

    try {
      const existingItem = await MenuItem.findById(itemObjectId).exec();
      if (
        !existingItem ||
        existingItem.restaurantId.toString() !== restaurantId.toString()
      ) {
        throw new AppError("Menu item not found or access denied", 404);
      }

      if (
        preparedUpdate.itemType &&
        preparedUpdate.itemType !== existingItem.itemType &&
        !preparedUpdate.category
      ) {
        preparedUpdate.category = existingItem.category;
      }

      const finalIsVegan = preparedUpdate.isVegan ?? existingItem.isVegan;
      const intendedIsVegetarian =
        preparedUpdate.isVegetarian ?? existingItem.isVegetarian;
      if (finalIsVegan && !intendedIsVegetarian) {
        preparedUpdate.isVegetarian = true;
      }

      const updatedItem = await MenuItem.findByIdAndUpdate(
        itemObjectId,
        { $set: preparedUpdate },
        { new: true, runValidators: true }
      );

      if (!updatedItem) {
        throw new AppError(
          "Menu item update failed unexpectedly after checks.",
          500
        );
      }
      console.log(
        "[ItemService.updateItem] Updated item details:",
        JSON.stringify(updatedItem, null, 2)
      );
      return updatedItem;
    } catch (error: any) {
      console.error("Error updating menu item in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "ValidationError") {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      if (error.name === "CastError") {
        throw new AppError("Invalid item ID format.", 400);
      }
      throw new AppError("Failed to update menu item.", 500);
    }
  }

  /**
   * Deletes a specific menu item.
   *
   * @param itemId - The ID of the menu item to delete.
   * @param restaurantId - The ID of the restaurant owning the item.
   * @returns A promise resolving to an object indicating the number of deleted documents (should be 1).
   * @throws {AppError} If the item is not found or doesn't belong to the restaurant (404),
   *                    if the itemId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async deleteItem(
    itemId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedCount: number }> {
    const itemObjectId =
      typeof itemId === "string" ? new Types.ObjectId(itemId) : itemId;

    try {
      const result = await MenuItem.deleteOne({
        _id: itemObjectId,
        restaurantId: restaurantId,
      });

      if (result.deletedCount === 0) {
        throw new AppError("Menu item not found or access denied", 404);
      }
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      console.error("Error deleting menu item in service:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "CastError") {
        throw new AppError("Invalid item ID format.", 400);
      }
      throw new AppError("Failed to delete menu item.", 500);
    }
  }

  /**
   * Deletes multiple menu items by their IDs if they belong to the given restaurant.
   *
   * @param itemIds - Array of item IDs to delete.
   * @param restaurantId - The ID of the restaurant that should own the items.
   * @returns A promise resolving to deletion results.
   * @throws {AppError} If validation fails or deletion encounters errors.
   */
  static async bulkDeleteItems(
    itemIds: (string | Types.ObjectId)[],
    restaurantId: Types.ObjectId
  ): Promise<{
    message: string;
    deletedCount: number;
    failedCount: number;
    errors?: string[];
  }> {
    if (!itemIds || itemIds.length === 0) {
      throw new AppError("No item IDs provided for bulk deletion", 400);
    }

    const itemObjectIds = itemIds.map((id) =>
      typeof id === "string" ? new Types.ObjectId(id) : id
    );

    try {
      const deletionResult = await MenuItem.deleteMany({
        _id: { $in: itemObjectIds },
        restaurantId: restaurantId,
      });

      const deletedCount = deletionResult.deletedCount || 0;
      const failedCount = itemIds.length - deletedCount;

      let message = `Successfully deleted ${deletedCount} menu item${
        deletedCount !== 1 ? "s" : ""
      }`;
      if (failedCount > 0) {
        message += ` (${failedCount} item${
          failedCount !== 1 ? "s" : ""
        } not found or access denied)`;
      }

      return {
        message,
        deletedCount,
        failedCount,
        ...(failedCount > 0 && {
          errors: [`${failedCount} items could not be deleted`],
        }),
      };
    } catch (error: any) {
      console.error("Error in bulk delete menu items:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete menu items.", 500);
    }
  }

  /**
   * Reassigns all menu items from a specific category to a new category for a given menu and restaurant.
   *
   * @param menuId - The ID of the menu.
   * @param oldCategoryName - The name of the category to reassign items from.
   * @param newCategoryName - The name of the category to reassign items to.
   * @param restaurantId - The ID of the restaurant (for scoping and authorization).
   * @returns A promise resolving to an object with matchedCount and modifiedCount from the update operation.
   * @throws {AppError} If an unexpected database error occurs.
   */
  static async reassignItemsCategory(
    menuId: string | Types.ObjectId,
    oldCategoryName: string,
    newCategoryName: string,
    restaurantId: Types.ObjectId // Added for scoping, though MenuItem model might not enforce restaurantId on category updates directly
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    try {
      // First, verify the menu belongs to the restaurant (optional, but good for authorization scope)
      const menu = await Menu.findOne({
        _id: menuObjectId,
        restaurantId: restaurantId,
      });
      if (!menu) {
        // Or handle as per your app's authorization logic for this operation
        throw new AppError(
          "Menu not found or not authorized for this restaurant.",
          404
        );
      }

      const result = await MenuItem.updateMany(
        {
          menuId: menuObjectId,
          category: oldCategoryName,
          restaurantId: restaurantId, // Ensure we only update items belonging to the correct restaurant
        },
        { $set: { category: newCategoryName } }
      );
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      };
    } catch (error: any) {
      console.error("Error reassigning item categories in service:", error);
      if (error instanceof AppError) throw error;
      // Consider specific error handling, e.g., for CastError on menuId if not validated before call
      throw new AppError("Failed to reassign item categories.", 500);
    }
  }
}

export default ItemService;
