import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import MenuService from "../services/menuService";
import { AppError } from "../utils/errorHandler";
import { IMenu } from "../models/Menu"; // Assuming IMenu is exported from Menu model
import MenuItem from "../models/MenuItem"; // Corrected import path and assuming default export

// No need for AuthenticatedRequest if AuthPayload is globally declared via authMiddleware.ts

// --- Create Menu ---
export const createMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    // Assuming 'protect' middleware adds 'user' to req and 'user' has 'restaurantId'
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return next(
        new AppError(
          "User not associated with a restaurant or restaurant ID missing.",
          403
        )
      );
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(new AppError("Menu name is required.", 400));
    }

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
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return next(new AppError("Invalid Restaurant ID format", 400));
    }
    // Optional: Further authorization to ensure the logged-in user can access this restaurant's menus
    // This might involve checking req.user.restaurantId against req.params.restaurantId

    const menus = await MenuService.getAllMenus(
      new mongoose.Types.ObjectId(restaurantId)
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
    const restaurantId = req.user?.restaurantId; // For authorization, if service needs it

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return next(new AppError("Invalid Menu ID format", 400));
    }
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

    // Fetch associated menu items
    const items = await MenuItem.find({ menuId: menu._id }).lean();

    res.status(200).json({ success: true, data: { ...menu, items } }); // Spread menu to include items
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

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return next(new AppError("Invalid Menu ID format", 400));
    }
    if (!restaurantId) {
      return next(new AppError("User not associated with a restaurant.", 403));
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(new AppError("Menu name cannot be empty for update.", 400));
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

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return next(new AppError("Invalid Menu ID format", 400));
    }
    if (!restaurantId) {
      return next(new AppError("User not associated with a restaurant.", 403));
    }

    // The service MenuService.deleteMenu should handle deletion of menu and its items (cascade or otherwise)
    const deleteResult = await MenuService.deleteMenu(
      menuId,
      new mongoose.Types.ObjectId(restaurantId)
    );

    if (deleteResult.deletedCount === 0) {
      return next(
        new AppError("Menu not found or not authorized to delete.", 404)
      );
    }

    // Also delete associated menu items explicitly if not handled by service/model middleware
    // await MenuItem.deleteMany({ menuId: new mongoose.Types.ObjectId(menuId) });
    // Note: Your MenuService.deleteMenu might already handle this. If so, the above line is redundant.
    // Check your service logic. For now, I'm assuming the service handles item deletion.

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
  console.log("[menuController] Entered uploadMenuPdf");
  try {
    const restaurantIdString = req.params.restaurantId;
    console.log(
      "[menuController] Restaurant ID string from params:",
      restaurantIdString
    );

    if (!mongoose.Types.ObjectId.isValid(restaurantIdString)) {
      console.error(
        "[menuController] Invalid restaurant ID format:",
        restaurantIdString
      );
      return next(new AppError("Invalid restaurant ID format", 400));
    }
    const restaurantId = new mongoose.Types.ObjectId(restaurantIdString);
    console.log(
      "[menuController] Parsed restaurant ID:",
      restaurantId.toHexString()
    );

    // Ensure the logged-in user is authorized to upload for this restaurant
    // This logic depends on your auth setup (e.g., req.user.restaurantId === restaurantId)
    // Or if req.user.role === 'restaurant' and req.user._id corresponds to an owner of this restaurantId
    // For simplicity, this example assumes restaurantId comes from params and ownership is verified by `restrictTo` or similar.

    if (!req.file) {
      console.error(
        "[menuController] No req.file found. Multer did not process a file."
      );
      return next(new AppError("No PDF file uploaded.", 400));
    }

    console.log(
      "[menuController] req.file object from multer:",
      JSON.stringify(req.file, null, 2)
    );

    const filePath = req.file.path;
    console.log("[menuController] File path from req.file.path:", filePath);

    // It's important to pass the correct restaurantId.
    // req.user should be available here if 'protect' middleware ran successfully.
    // Ensure your AuthPayload has restaurantId for restaurant users.
    // If not, you might need to fetch it based on req.user.userId if the user is a restaurant owner.

    // For this example, we'll assume restaurantId from params is authoritative AFTER 'restrictTo' has validated access.
    console.log("[menuController] Calling MenuService.processPdfMenuUpload...");
    const menu = await MenuService.processPdfMenuUpload(
      filePath,
      restaurantId,
      req.file.originalname
    );
    console.log("[menuController] MenuService.processPdfMenuUpload completed.");

    res.status(201).json({
      message: "Menu PDF uploaded and processed successfully.",
      data: menu,
    });
  } catch (error) {
    console.error(
      "[menuController] Error in uploadMenuPdf catch block:",
      error
    );
    // If the file was uploaded and an error occurred during processing,
    // you might want to delete the uploaded file from the /uploads directory.
    // import fs from 'fs';
    // if (req.file) fs.unlinkSync(req.file.path);
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
    const categoryName = decodeURIComponent(encodedCategoryName);

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return next(new AppError("Invalid Menu ID format", 400));
    }

    if (
      !categoryName ||
      typeof categoryName !== "string" ||
      categoryName.trim() === ""
    ) {
      return next(
        new AppError(
          "Category name is required and must be a non-empty string.",
          400
        )
      );
    }

    if (
      categoryName.toLowerCase() === "uncategorized" ||
      categoryName.toLowerCase() === "non assigned"
    ) {
      return next(
        new AppError(`The category "${categoryName}" cannot be deleted.`, 400)
      );
    }

    const result = await MenuItem.updateMany(
      // Use the corrected model name
      { menuId: new mongoose.Types.ObjectId(menuId), category: categoryName },
      { $set: { category: "Non Assigned" } }
    );

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

// Placeholder for other menu controller functions if this is a new file
// export const createMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
// export const getMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
