import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import MenuServiceRefactored from "../services/MenuServiceRefactored";
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
import {
  MenuUploadPreview,
  FinalImportRequestBody,
  ProcessConflictResolutionRequest,
  ProcessConflictResolutionResponse,
  ImportResult,
} from "../types/menuUploadTypes"; // Import the new type
import { Types } from "mongoose";
import MenuImportJob from "../models/MenuImportJobModel"; // Import the correct model
import { AuthenticatedRequest } from "../middleware/authMiddleware";

// Using Express Request type and will work with the existing global AuthPayload if possible.
// This local type definition is a temporary workaround if global augmentation isn't perfectly matched.
// TODO: Ensure AuthenticatedRequest is consistently defined globally (e.g., server/src/types/express/index.d.ts)

interface UserPayload {
  userId: Types.ObjectId;
  restaurantId?: Types.ObjectId; // Changed to optional Types.ObjectId to match AuthPayload
  role: string;
  name: string;
  // Add other properties from your JWT payload if necessary
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  file?: Express.Multer.File;
}

// ================= MENU CRUD OPERATIONS =================

/**
 * Get all menus for a restaurant
 */
export const getMenus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { restaurantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const isActive = req.query.isActive as string;

    const options = {
      page,
      limit,
      search,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
    };

    const result = await MenuServiceRefactored.getMenus(restaurantId, options);
    res.json(result);
  } catch (error: any) {
    console.error("Error fetching menus:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error fetching menus",
    });
  }
};

/**
 * Get a specific menu by ID
 */
export const getMenuById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { restaurantId } = req.user!;
    const { menuId } = req.params;

    const menu = await MenuServiceRefactored.getMenuById(menuId, restaurantId);
    if (!menu) {
      return res.status(404).json({ message: "Menu not found" });
    }

    res.json(menu);
  } catch (error: any) {
    console.error("Error fetching menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error fetching menu",
    });
  }
};

/**
 * Create a new menu
 */
export const createMenu = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { restaurantId } = req.user!;
    const { name, isActive = true } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Menu name is required" });
    }

    const menuData = { name, isActive };
    const menu = await MenuServiceRefactored.createMenu(menuData, restaurantId);

    res.status(201).json(menu);
  } catch (error: any) {
    console.error("Error creating menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error creating menu",
    });
  }
};

/**
 * Update a menu
 */
export const updateMenu = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { restaurantId } = req.user!;
    const { menuId } = req.params;
    const updates = req.body;

    const menu = await MenuServiceRefactored.updateMenu(
      menuId,
      updates,
      restaurantId
    );
    if (!menu) {
      return res.status(404).json({ message: "Menu not found" });
    }

    res.json(menu);
  } catch (error: any) {
    console.error("Error updating menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error updating menu",
    });
  }
};

/**
 * Delete a menu
 */
export const deleteMenu = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { restaurantId } = req.user!;
    const { menuId } = req.params;

    await MenuServiceRefactored.deleteMenu(menuId, restaurantId);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting menu:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error deleting menu",
    });
  }
};

// ================= MENU UPLOAD & IMPORT OPERATIONS =================

/**
 * Upload and preview menu file
 */
export const uploadMenuPreview = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { restaurantId } = req.user!;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await MenuServiceRefactored.getMenuUploadPreview(
      req.file.path,
      req.file.originalname,
      restaurantId
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error in menu upload preview:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error processing uploaded file",
    });
  }
};

/**
 * Finalize menu import
 */
export const finalizeMenuImport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { restaurantId } = req.user!;

    const result = await MenuServiceRefactored.finalizeMenuImport(
      req.body,
      restaurantId
    );
    res.json(result);
  } catch (error: any) {
    console.error("Error finalizing menu import:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error finalizing menu import",
    });
  }
};

/**
 * Process conflict resolution
 */
export const processConflictResolution = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { restaurantId } = req.user!;

    const result = await MenuServiceRefactored.processConflictResolution({
      ...req.body,
      restaurantId,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error processing conflict resolution:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error processing conflict resolution",
    });
  }
};

/**
 * Get menu import job status
 */
export const getMenuImportJobStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { jobId } = req.params;

    const status = await MenuServiceRefactored.getMenuImportJobStatus(jobId);
    res.json(status);
  } catch (error: any) {
    console.error("Error getting job status:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error getting job status",
    });
  }
};

// ================= MENU STATISTICS =================

/**
 * Get menu statistics
 */
export const getMenuStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { restaurantId } = req.user!;

    const stats = await MenuServiceRefactored.getMenuStats(restaurantId);
    res.json(stats);
  } catch (error: any) {
    console.error("Error getting menu stats:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error getting menu statistics",
    });
  }
};

// ================= LEGACY COMPATIBILITY =================

/**
 * Legacy method names for backward compatibility
 */
export const getMenusForRestaurant = getMenus;
export const createMenuForRestaurant = createMenu;
export const getMenusByRestaurant = getMenus;
