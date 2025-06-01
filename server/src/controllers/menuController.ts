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
import {
  MenuUploadPreview,
  FinalImportRequestBody,
  ProcessConflictResolutionRequest,
  ProcessConflictResolutionResponse,
  ImportResult,
} from "../types/menuUploadTypes"; // Import the new type
import { Types } from "mongoose";
import MenuImportJob from "../models/MenuImportJobModel"; // Import the correct model

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

// --- Create Menu ---
export const createMenu = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const menu = await MenuService.createMenu(req.body, restaurantId);
    res.status(201).json(menu);
  } catch (error) {
    next(error);
  }
};

// --- Get All Menus for a Restaurant ---
export const getAllMenus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const status = req.query.status as
      | "all"
      | "active"
      | "inactive"
      | undefined;
    const menus = await MenuService.getAllMenus(restaurantId, status);
    res.status(200).json(menus);
  } catch (error) {
    next(error);
  }
};

// --- Get Single Menu with its Items ---
export const getMenuById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const menu = await MenuService.getMenuById(req.params.menuId, restaurantId);
    if (!menu) {
      return next(new AppError("Menu not found", 404));
    }
    res.status(200).json(menu);
  } catch (error) {
    next(error);
  }
};

// --- Update Menu Details ---
export const updateMenu = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const menu = await MenuService.updateMenu(
      req.params.menuId,
      req.body,
      restaurantId
    );
    if (!menu) {
      return next(new AppError("Menu not found for update", 404));
    }
    res.status(200).json(menu);
  } catch (error) {
    next(error);
  }
};

// --- Delete Menu ---
export const deleteMenu = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const result = await MenuService.deleteMenu(
      req.params.menuId,
      restaurantId
    );
    if (result.deletedMenuCount === 0) {
      return next(new AppError("Menu not found for deletion", 404));
    }
    res.status(200).json({
      message: `Menu and ${result.deletedItemsCount} associated items deleted successfully.`,
      ...result,
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
    const restaurantIdString = req.user?.restaurantId;
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
export const updateMenuActivationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return next(new AppError("isActive field must be a boolean", 400));
    }

    const menu = await MenuService.updateMenuActivationStatus(
      req.params.menuId,
      restaurantId,
      isActive
    );

    if (!menu) {
      return next(new AppError("Menu not found or not updated", 404));
    }
    res.status(200).json(menu);
  } catch (error) {
    next(error);
  }
};

// --- NEW: Handle Menu Upload for Preview ---
export const handleMenuUploadPreview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError(
          "User not authenticated or restaurantId missing for preview",
          401
        )
      );
    }
    if (!req.file) {
      return next(new AppError("No PDF file uploaded for preview.", 400));
    }

    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const multerFilePath = req.file.path; // Path from multer
    const originalFileName = req.file.originalname;

    console.log(
      `[menuController.handleMenuUploadPreview] File received: ${originalFileName}, path: ${multerFilePath}`
    );

    const previewData: MenuUploadPreview =
      await MenuService.getMenuUploadPreview(
        multerFilePath,
        restaurantId,
        originalFileName
      );

    res.status(200).json(previewData);
  } catch (error) {
    console.error("[menuController.handleMenuUploadPreview] Error: ", error);
    // Ensure temp file is cleaned up if an error occurs before service could do it (e.g. auth error)
    // Note: MenuService.getMenuUploadPreview is expected NOT to delete the file.
    // Deletion for preview files might need a cron job or specific user action if not imported.
    next(error);
  }
};

// Controller for FINALIZING menu import from preview data
export const handleFinalizeMenuImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId || !req.user.userId) {
      return next(
        new AppError(
          "User not authenticated, restaurantId, or userId missing for import",
          401
        )
      );
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    const userId = new Types.ObjectId(req.user.userId);
    const importData: FinalImportRequestBody = req.body;

    if (
      !importData ||
      !importData.filePath ||
      !importData.previewId ||
      !importData.itemsToImport
    ) {
      return next(
        new AppError(
          "Invalid request body for menu import. Missing required fields (filePath, previewId, itemsToImport).",
          400
        )
      );
    }

    console.log(
      `[menuController.handleFinalizeMenuImport] Received request to finalize import for previewId: ${importData.previewId}`
    );

    const serviceResponse = await MenuService.finalizeMenuImport(
      importData,
      restaurantId,
      userId
    );

    if ("jobId" in serviceResponse) {
      res.status(202).json(serviceResponse);
    } else {
      const importResult = serviceResponse as ImportResult;
      if (importResult.overallStatus === "failed") {
        if (
          importResult.message.includes("not found") ||
          importResult.message.includes("must be provided") ||
          importResult.message.includes(
            "Failed to create asynchronous import job"
          )
        ) {
          return res.status(400).json(importResult);
        }
        return res.status(500).json(importResult);
      }
      res.status(200).json(importResult);
    }
  } catch (error) {
    console.error(
      "[menuController.handleFinalizeMenuImport] Unexpected controller error: ",
      error
    );
    next(error);
  }
};

export const handleProcessMenuForConflictResolution = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }

    console.log(
      "[handleProcessMenuForConflictResolution] Request body:",
      JSON.stringify(req.body, null, 2)
    );

    const restaurantIdString = req.user.restaurantId.toString();
    const { itemsToProcess, targetMenuId } =
      req.body as ProcessConflictResolutionRequest;

    // Enhanced validation with detailed logging
    if (
      !itemsToProcess ||
      !Array.isArray(itemsToProcess) ||
      itemsToProcess.length === 0
    ) {
      console.error(
        "[handleProcessMenuForConflictResolution] Invalid itemsToProcess:",
        {
          itemsToProcess,
          isArray: Array.isArray(itemsToProcess),
          length: itemsToProcess?.length,
        }
      );
      return next(
        new AppError("itemsToProcess must be a non-empty array.", 400)
      );
    }

    // Log each item for debugging
    itemsToProcess.forEach((item, index) => {
      console.log(`[handleProcessMenuForConflictResolution] Item ${index}:`, {
        id: item.id,
        hasFields: !!item.fields,
        itemType: item.fields?.itemType?.value,
        name: item.fields?.name?.value,
        category: item.fields?.category?.value,
        userAction: item.userAction,
        importAction: item.importAction,
      });
    });

    // Construct the request object for the service call
    const conflictRequestData: ProcessConflictResolutionRequest = {
      itemsToProcess,
      restaurantId: restaurantIdString,
      targetMenuId: targetMenuId,
    };

    console.log(
      "[handleProcessMenuForConflictResolution] Calling service with:",
      {
        restaurantId: restaurantIdString,
        targetMenuId,
        itemCount: itemsToProcess.length,
      }
    );

    const result = await MenuService.processMenuForConflictResolution(
      conflictRequestData // Pass the single object argument
    );

    console.log("[handleProcessMenuForConflictResolution] Service result:", {
      processedItemsCount: result.processedItems.length,
      summary: result.summary,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("[handleProcessMenuForConflictResolution] Error:", error);

    // Provide more detailed error information
    if (error instanceof Error) {
      console.error("[handleProcessMenuForConflictResolution] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    next(error);
  }
};

export const getMenuImportJobStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { jobId } = req.params;
    // No need to validate ObjectId format here if validateObjectId middleware is used in route

    if (!req.user || !req.user.restaurantId || !req.user.userId) {
      return next(
        new AppError("User not authenticated or missing required IDs.", 401)
      );
    }

    const job = await MenuImportJob.findById(jobId);

    if (!job) {
      return next(new AppError("Import job not found.", 404));
    }

    if (
      job.restaurantId.toString() !== req.user.restaurantId.toString() &&
      job.userId.toString() !== req.user.userId.toString()
    ) {
      return next(
        new AppError("Access denied to this import job status.", 403)
      );
    }

    // Access result fields from the result object or provide defaults
    const result = job.result;

    const jobStatusResponse = {
      jobId: job._id,
      status: job.status,
      message: job.errorMessage || result?.message || "Job status retrieved.",
      overallStatus: result?.overallStatus || job.status,
      menuId: result?.menuId,
      menuName: result?.menuName,
      itemsProcessed: result?.itemsProcessed || 0,
      itemsCreated: result?.itemsCreated || 0,
      itemsUpdated: result?.itemsUpdated || 0,
      itemsSkipped: result?.itemsSkipped || 0,
      itemsErrored: result?.itemsErrored || 0,
      createdAt: job.createdAt,
      processedAt: job.processedAt,
      completedAt: job.completedAt,
      errorDetails: result?.errorDetails,
      errorReport: result?.errorReport,
    };

    res.status(200).json(jobStatusResponse);
  } catch (error) {
    next(error);
  }
};

// Placeholder for other menu controller functions if this is a new file
// export const createMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
// export const getMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
