import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import MenuService from "../services/menuService";
import { AppError } from "../utils/errorHandler";
import MenuItem from "../models/MenuItem"; // Used in getMenuByIdWithItems and deleteCategoryAndReassignItems
import ItemService from "../services/itemService"; // Added import for ItemService
import {
  handleValidationErrors as _handleValidationErrors,
  validateCreateMenu as _validateCreateMenu,
  validateObjectId as _validateObjectId,
  validateMenuIdParam as _validateMenuIdParam,
  validateUpdateMenu as _validateUpdateMenu,
  validateCategoryNameParam as _validateCategoryNameParam,
} from "../middleware/validationMiddleware";

// No need for AuthenticatedRequest if AuthPayload is globally declared via authMiddleware.ts

// --- Create Menu ---
export const createMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return next(
        new AppError(
          "User not associated with a restaurant or restaurant ID missing.",
          403
        )
      );
    }
    // Validation for name is now handled by validateCreateMenu

    const menuData = { name, description };
    const newMenu = await MenuService.createMenu(
      menuData,
      new mongoose.Types.ObjectId(restaurantId)
    );
    res.status(201).json({ success: true, data: newMenu });
  } catch (error) {
    next(error);
  }
};

// --- Get All Menus for a Restaurant ---
export const getMenusByRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const status = req.query.status as
      | "all"
      | "active"
      | "inactive"
      | undefined;
    // Validation handled by validateObjectId("restaurantId") in routes file

    const menus = await MenuService.getAllMenus(
      new mongoose.Types.ObjectId(restaurantId),
      status // Pass the status to the service
    );
    res.status(200).json({ success: true, count: menus.length, data: menus });
  } catch (error) {
    next(error);
  }
};

// --- Get Single Menu with its Items ---
export const getMenuByIdWithItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { menuId } = req.params;
    const restaurantId = req.user?.restaurantId;

    // menuId validation handled by validateMenuIdParam in routes file
    if (!restaurantId) {
      return next(new AppError("User not associated with a restaurant.", 403));
    }

    const menu = await MenuService.getMenuById(
      menuId,
      new mongoose.Types.ObjectId(restaurantId)
    );

    if (!menu) {
      return next(
        new AppError(
          "Menu not found or not authorized for this restaurant.",
          404
        )
      );
    }

    const items = await MenuItem.find({ menuId: menu._id }).lean();
    res.status(200).json({ success: true, data: { ...menu, items } });
  } catch (error) {
    next(error);
  }
};

// --- Update Menu Details ---
export const updateMenuDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { menuId } = req.params;
    const { name, description } = req.body;
    const restaurantId = req.user?.restaurantId;

    // menuId validation handled by validateMenuIdParam in routes file
    // name/description validation handled by validateUpdateMenu in routes file
    if (!restaurantId) {
      return next(new AppError("User not associated with a restaurant.", 403));
    }

    const updateData = { name, description };
    const updatedMenu = await MenuService.updateMenu(
      menuId,
      updateData,
      new mongoose.Types.ObjectId(restaurantId)
    );

    if (!updatedMenu) {
      return next(
        new AppError("Menu not found or not authorized to update.", 404)
      );
    }
    res.status(200).json({ success: true, data: updatedMenu });
  } catch (error) {
    next(error);
  }
};

// --- Delete Menu ---
export const deleteMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { menuId } = req.params;
    const restaurantId = req.user?.restaurantId;

    // menuId validation handled by validateMenuIdParam in routes file
    if (!restaurantId) {
      return next(new AppError("User not associated with a restaurant.", 403));
    }

    const deleteResult = await MenuService.deleteMenu(
      menuId,
      new mongoose.Types.ObjectId(restaurantId)
    );

    if (deleteResult.deletedMenuCount === 0) {
      return next(
        new AppError("Menu not found or not authorized to delete.", 404)
      );
    }
    // Removed commented-out MenuItem.deleteMany as service handles it.

    res.status(200).json({
      success: true,
      message: "Menu and associated items deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const uploadMenuPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const restaurantIdString = req.params.restaurantId;
    const restaurantId = new mongoose.Types.ObjectId(restaurantIdString);

    // ---- START DEBUG LOGS ----
    console.log(
      "uploadMenuPdf controller - req.headers:",
      JSON.stringify(req.headers, null, 2)
    );
    console.log(
      "uploadMenuPdf controller - req.body:",
      JSON.stringify(req.body, null, 2)
    ); // req.body might be empty or undefined with multer, file is in req.file
    console.log("uploadMenuPdf controller - req.file:", req.file);
    // ---- END DEBUG LOGS ----

    if (!req.file) {
      return next(new AppError("No PDF file uploaded.", 400));
    }

    const filePath = req.file.path;
    const menu = await MenuService.processPdfMenuUpload(
      filePath,
      restaurantId,
      req.file.originalname
    );

    res.status(201).json({
      message: "Menu PDF uploaded and processed successfully.",
      data: menu,
    });
  } catch (error) {
    // MenuService.processPdfMenuUpload handles file cleanup in its finally block
    next(error);
  }
};

export const deleteCategoryAndReassignItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { menuId, categoryName: encodedCategoryName } = req.params;
    const restaurantId = req.user?.restaurantId; // Get restaurantId from authenticated user
    const categoryName = decodeURIComponent(encodedCategoryName);

    if (!restaurantId) {
      return next(new AppError("User not associated with a restaurant.", 403));
    }

    // This check remains as it's specific business logic not covered by simple validation
    if (
      categoryName.toLowerCase() === "uncategorized" ||
      categoryName.toLowerCase() === "non assigned"
    ) {
      return next(
        new AppError(`The category "${categoryName}" cannot be deleted.`, 400)
      );
    }

    // Call the service method to handle the logic
    const result = await ItemService.reassignItemsCategory(
      menuId,
      categoryName,
      "Non Assigned", // The new category name is hardcoded here as per original logic
      new mongoose.Types.ObjectId(restaurantId) // Pass restaurantId to the service
    );

    // This logging can be useful for developers/admins
    if (result.matchedCount === 0 && result.modifiedCount === 0) {
      console.log(
        `No items found for category "${categoryName}" in menu "${menuId}", or category did not exist.`
      );
    }

    res.status(200).json({
      message: `Category "${categoryName}" processed. Items (if any) reassigned to "Non Assigned".`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --- Update Menu Activation Status ---
export const updateMenuActivationStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { menuId } = req.params;
    const { isActive } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return next(new AppError("User not associated with a restaurant.", 403));
    }

    if (typeof isActive !== "boolean") {
      return next(new AppError("isActive field (boolean) is required.", 400));
    }

    const updatedMenu = await MenuService.updateMenuActivationStatus(
      menuId,
      new mongoose.Types.ObjectId(restaurantId),
      isActive
    );

    if (!updatedMenu) {
      return next(
        new AppError("Menu not found or not authorized to update status.", 404)
      );
    }
    res.status(200).json({ success: true, data: updatedMenu });
  } catch (error) {
    next(error);
  }
};

// Placeholder for other menu controller functions if this is a new file
// export const createMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
// export const getMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
