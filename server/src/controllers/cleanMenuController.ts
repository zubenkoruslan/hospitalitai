import { Request, Response } from "express";
import {
  CleanMenuParserService,
  ParsedMenuData,
} from "../services/CleanMenuParserService";
import multer from "multer";
import path from "path";
import fs from "fs";
import { MenuCrudService } from "../services/MenuCrudService";
import MenuItem from "../models/MenuItem";
import { Types } from "mongoose";

// Simple request interfaces
interface AuthenticatedRequest extends Request {
  user?: any; // Simplified for now
}

interface MenuUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `menuFile-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Supported file types
const supportedMimeTypes = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/json",
  "text/plain",
];

const supportedExtensions = [
  ".pdf",
  ".csv",
  ".xls",
  ".xlsx",
  ".doc",
  ".docx",
  ".json",
  ".txt",
];

const isFileSupported = (file: Express.Multer.File): boolean => {
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Check by MIME type first
  if (supportedMimeTypes.includes(file.mimetype)) {
    return true;
  }

  // Check by file extension as fallback
  if (supportedExtensions.includes(fileExtension)) {
    return true;
  }

  return false;
};

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (isFileSupported(file)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type. Supported formats: ${supportedExtensions.join(
            ", "
          )}`
        )
      );
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB to match frontend
  },
});

export class CleanMenuController {
  private parserService: CleanMenuParserService;

  constructor() {
    this.parserService = new CleanMenuParserService();
  }

  /**
   * Upload and parse menu file
   */
  uploadMenu = async (req: MenuUploadRequest, res: Response): Promise<void> => {
    try {
      console.log("🍇 Clean menu upload request received");

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
        return;
      }

      const { originalname, path: filePath } = req.file;

      // Parse the menu
      const parseResult = await this.parserService.parseMenu(
        filePath,
        originalname
      );

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn("Failed to cleanup uploaded file:", cleanupError);
      }

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: "Failed to parse menu",
          errors: parseResult.errors,
        });
        return;
      }

      // Return parsed data for preview
      res.json({
        success: true,
        message: `Successfully parsed ${
          parseResult.data!.totalItemsFound
        } menu items`,
        data: {
          menuName: parseResult.data!.menuName,
          items: parseResult.data!.items,
          totalItemsFound: parseResult.data!.totalItemsFound,
          processingNotes: parseResult.data!.processingNotes,
        },
      });
    } catch (error: any) {
      console.error("Clean menu upload error:", error);

      // Clean up file if it exists
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn(
            "Failed to cleanup uploaded file after error:",
            cleanupError
          );
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * Import clean menu results directly to database
   */
  importCleanMenu = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("🍇 Clean menu import request received");

      const { cleanResult, restaurantId, targetMenuId, menuName } = req.body;

      if (!cleanResult || !restaurantId) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: cleanResult, restaurantId",
        });
        return;
      }

      // Convert restaurant ID to ObjectId
      const restaurantObjectId = new Types.ObjectId(restaurantId);
      let menuObjectId: Types.ObjectId;

      // Create or find target menu
      if (targetMenuId) {
        menuObjectId = new Types.ObjectId(targetMenuId);
      } else {
        // Create new menu
        const newMenu = await MenuCrudService.createMenu(
          {
            name: menuName || cleanResult.menuName || "Imported Menu",
            isActive: true,
          },
          restaurantObjectId
        );
        menuObjectId = newMenu._id as Types.ObjectId;
      }

      // Validate clean result has items
      if (
        !cleanResult ||
        !cleanResult.items ||
        !Array.isArray(cleanResult.items)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid clean result: missing or invalid items array",
        });
        return;
      }

      console.log(
        `🔍 Clean result has ${cleanResult.items.length} items to process`
      );

      // Filter out any invalid items before conversion
      const validItems = cleanResult.items.filter((item: any) => {
        const isValid = item && item.name && item.category && item.itemType;
        if (!isValid) {
          console.warn(`⚠️ Skipping invalid item:`, item);
        }
        return isValid;
      });

      console.log(`✅ ${validItems.length} valid items after filtering`);

      if (validItems.length === 0) {
        res.status(400).json({
          success: false,
          message: "No valid items found in clean result",
        });
        return;
      }

      // Convert clean items to MenuItem format
      const menuItems = await this.convertCleanItemsToMenuItems(
        validItems,
        menuObjectId,
        restaurantObjectId
      );

      // Import items to database
      const importResults = await this.importMenuItems(menuItems);

      res.json({
        success: true,
        data: {
          menuId: menuObjectId.toString(),
          menuName: cleanResult.menuName,
          totalItems: cleanResult.items.length,
          importedItems: importResults.success,
          failedItems: importResults.failed,
          processingNotes: cleanResult.processingNotes,
        },
        message: `Successfully imported ${importResults.success} items`,
      });
    } catch (error: any) {
      console.error("Clean menu import error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * Convert clean items to MenuItem format
   */
  private async convertCleanItemsToMenuItems(
    cleanItems: any[],
    menuId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<any[]> {
    console.log(
      `🔄 Converting ${cleanItems.length} clean items to MenuItem format`
    );

    return cleanItems
      .filter((item, index) => {
        // Basic validation
        if (!item.name && !item.category) {
          console.warn(
            `⚠️ Skipping item ${index + 1}: missing name and category`
          );
          return false;
        }
        return true;
      })
      .map((item, index) => {
        const menuItem = {
          menuId,
          restaurantId,
          name: item.name?.trim() || `Item ${index + 1}`, // Required field - use fallback if missing
          description: item.description?.trim() || undefined, // Now mapping description
          price: typeof item.price === "number" ? item.price : null,
          itemType: item.itemType || "food", // Required field - default to food if missing
          category: item.category?.trim() || "other", // Required field - default to other if missing
          ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],

          // Basic dietary fields
          isGlutenFree: Boolean(item.isGlutenFree),
          isDairyFree: Boolean(item.isDairyFree), // Now properly mapping from parsed data
          isVegan: Boolean(item.isVegan),
          isVegetarian: Boolean(item.isVegetarian),
          isActive: true,

          // Food-specific enhancement fields
          ...(item.itemType === "food" && {
            cookingMethods: Array.isArray(item.cookingMethods)
              ? item.cookingMethods
              : [],
            allergens: Array.isArray(item.allergens) ? item.allergens : [],
            isSpicy: Boolean(item.isSpicy),
          }),

          // Beverage-specific enhancement fields
          ...(item.itemType === "beverage" && {
            spiritType: item.spiritType?.trim() || undefined,
            beerStyle: item.beerStyle?.trim() || undefined,
            cocktailIngredients: Array.isArray(item.cocktailIngredients)
              ? item.cocktailIngredients
              : [],
            alcoholContent: item.alcoholContent?.trim() || undefined,
            servingStyle: item.servingStyle?.trim() || undefined,
            isNonAlcoholic: Boolean(item.isNonAlcoholic),
            temperature: item.temperature?.trim() || undefined,
          }),

          // Wine-specific fields
          ...(item.itemType === "wine" && {
            wineStyle: item.wineStyle || "still", // Default to still wine
            producer: item.producer?.trim() || undefined,
            grapeVariety: Array.isArray(item.grapeVariety)
              ? item.grapeVariety
              : [],
            vintage:
              typeof item.vintage === "number" ? item.vintage : undefined,
            region: item.region?.trim() || undefined,
            servingOptions: Array.isArray(item.servingOptions)
              ? item.servingOptions
              : [],
          }),
        };

        console.log(
          `📝 Converted item: ${menuItem.name} (${menuItem.category}, ${menuItem.itemType})`
        );
        return menuItem;
      });
  }

  /**
   * Import menu items to database
   */
  private async importMenuItems(menuItems: any[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    console.log(`🔄 Attempting to import ${menuItems.length} menu items`);

    for (const itemData of menuItems) {
      try {
        // Log item data for debugging
        console.log(`💾 Creating item:`, {
          name: itemData.name,
          category: itemData.category,
          itemType: itemData.itemType,
          price: itemData.price,
        });

        await MenuItem.create(itemData);
        successCount++;
        console.log(`✅ Successfully created: ${itemData.name}`);
      } catch (error: any) {
        failedCount++;
        const errorMsg = `Failed to create "${itemData.name || "Unknown"}": ${
          error.message
        }`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);

        // Log the full item data for debugging validation failures
        if (error.name === "ValidationError") {
          console.error(
            `📝 Full item data:`,
            JSON.stringify(itemData, null, 2)
          );
          console.error(`🔍 Validation errors:`, error.errors);
        }
      }
    }

    console.log(
      `📊 Import complete: ${successCount} successful, ${failedCount} failed`
    );

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  }

  /**
   * Get upload middleware
   */
  getUploadMiddleware() {
    return upload.single("menuFile");
  }

  /**
   * Test endpoint
   */
  testEndpoint = async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      message: "Clean menu controller is working!",
      timestamp: new Date().toISOString(),
    });
  };
}

// Export instance and middleware
export const cleanMenuController = new CleanMenuController();
export const uploadMiddleware = cleanMenuController.getUploadMiddleware();
