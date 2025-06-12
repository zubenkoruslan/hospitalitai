import mongoose, { Types } from "mongoose";
import { MenuCrudService, MenuData, MenuWithItems } from "./MenuCrudService";
import { MenuImportService } from "./MenuImportService";
import {
  MenuErrorHandler,
  MenuValidationError,
  MenuNotFoundError,
  MenuConflictError,
  ErrorContextBuilder,
} from "./MenuErrorHandler";

import {
  MenuUploadPreview,
  FinalImportRequestBody,
  ImportResult,
  ProcessConflictResolutionRequest,
  ProcessConflictResolutionResponse,
} from "../types/menuUploadTypes";

import { IMenu } from "../models/Menu";

/**
 * Refactored MenuService that delegates to specialized services
 * This provides the same API as the original MenuService but with better architecture
 */
class MenuServiceRefactored {
  private readonly importService: MenuImportService;

  constructor() {
    this.importService = new MenuImportService();
  }

  // ==================== MENU CRUD OPERATIONS ====================

  /**
   * Create a new menu
   */
  async createMenu(
    data: MenuData,
    restaurantId: Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IMenu> {
    try {
      return await MenuCrudService.createMenu(data, restaurantId, session);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        throw new MenuConflictError(
          `A menu with the name "${data.name}" already exists for this restaurant.`,
          ErrorContextBuilder.create()
            .withRestaurantId(restaurantId.toString())
            .withValidationDetails("name", data.name, "duplicate")
            .build()
        );
      }
      throw MenuErrorHandler.handleValidationError("menu", data, error.message);
    }
  }

  /**
   * Get all menus for a restaurant
   */
  async getAllMenus(
    restaurantId: Types.ObjectId,
    status?: "all" | "active" | "inactive"
  ): Promise<IMenu[]> {
    try {
      return await MenuCrudService.getAllMenus(restaurantId, status);
    } catch (error: any) {
      MenuErrorHandler.logError(
        MenuErrorHandler.handleValidationError(
          "restaurant",
          restaurantId,
          error.message
        ),
        "getAllMenus"
      );
      throw error;
    }
  }

  /**
   * Get a menu by ID with its items
   */
  async getMenuById(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<MenuWithItems | null> {
    try {
      const result = await MenuCrudService.getMenuById(menuId, restaurantId);

      if (!result) {
        throw new MenuNotFoundError(menuId.toString(), restaurantId.toString());
      }

      return result;
    } catch (error: any) {
      if (error instanceof MenuNotFoundError) {
        throw error;
      }

      if (error.message?.includes("Invalid menu ID")) {
        throw new MenuValidationError(
          "Invalid menu ID format",
          ErrorContextBuilder.create()
            .withMenuId(menuId.toString())
            .withValidationDetails("menuId", menuId, "invalid_format")
            .build()
        );
      }

      MenuErrorHandler.logError(
        MenuErrorHandler.handleValidationError("menuId", menuId, error.message),
        "getMenuById"
      );
      throw error;
    }
  }

  /**
   * Update an existing menu
   */
  async updateMenu(
    menuId: string | Types.ObjectId,
    updateData: Partial<MenuData>,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    try {
      return await MenuCrudService.updateMenu(menuId, updateData, restaurantId);
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        throw new MenuNotFoundError(menuId.toString(), restaurantId.toString());
      }

      if (error.message?.includes("already exists")) {
        throw new MenuConflictError(
          `Another menu with the name "${updateData.name}" already exists.`,
          ErrorContextBuilder.create()
            .withMenuId(menuId.toString())
            .withRestaurantId(restaurantId.toString())
            .withValidationDetails("name", updateData.name, "duplicate")
            .build()
        );
      }

      MenuErrorHandler.logError(
        MenuErrorHandler.handleValidationError(
          "menu",
          updateData,
          error.message
        ),
        "updateMenu"
      );
      throw error;
    }
  }

  /**
   * Delete a menu and all its items
   */
  async deleteMenu(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedMenuCount: number; deletedItemsCount: number }> {
    try {
      return await MenuCrudService.deleteMenu(menuId, restaurantId);
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        throw new MenuNotFoundError(menuId.toString(), restaurantId.toString());
      }

      MenuErrorHandler.logError(
        MenuErrorHandler.handleImportError(error, 0, "delete"),
        "deleteMenu"
      );
      throw error;
    }
  }

  /**
   * Update menu activation status
   */
  async updateMenuActivationStatus(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId,
    isActive: boolean
  ): Promise<IMenu | null> {
    try {
      return await MenuCrudService.updateMenuActivationStatus(
        menuId,
        restaurantId,
        isActive
      );
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        throw new MenuNotFoundError(menuId.toString(), restaurantId.toString());
      }

      MenuErrorHandler.logError(
        MenuErrorHandler.handleValidationError(
          "menuActivation",
          { menuId, isActive },
          error.message
        ),
        "updateMenuActivationStatus"
      );
      throw error;
    }
  }

  // ==================== MENU IMPORT OPERATIONS ====================

  /**
   * Get menu upload preview from various file formats
   */
  async getMenuUploadPreview(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    originalFileName?: string
  ): Promise<MenuUploadPreview> {
    const startTime = Date.now();

    try {
      console.log(`📤 Starting upload preview for: ${originalFileName}`);

      const result = await this.importService.getMenuUploadPreview(
        multerFilePath,
        restaurantId,
        { originalFileName, maxFileSizeMB: 10 }
      );

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ Upload preview completed in ${processingTime}ms: ${result.parsedItems.length} items`
      );

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      const fileError = MenuErrorHandler.handleFileError(
        error,
        originalFileName
      );

      MenuErrorHandler.logError(fileError, "getMenuUploadPreview");

      // Return error preview instead of throwing
      return {
        previewId: `error_${Date.now()}`,
        filePath: multerFilePath,
        sourceFormat: "pdf", // Default for typing
        parsedMenuName: originalFileName?.replace(/\.[^.]+$/i, "") || "Menu",
        parsedItems: [],
        detectedCategories: [],
        summary: { totalItemsParsed: 0, itemsWithPotentialErrors: 0 },
        globalErrors: [MenuErrorHandler.createUserFriendlyMessage(fileError)],
      };
    }
  }

  /**
   * Process deprecated PDF menu upload (for backward compatibility)
   */
  async processPdfMenuUpload(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    originalFileName?: string
  ): Promise<never> {
    const error = new MenuValidationError(
      "processPdfMenuUpload is deprecated. Use getMenuUploadPreview and finalizeMenuImport instead.",
      ErrorContextBuilder.create()
        .withFileName(originalFileName || "unknown")
        .withRestaurantId(restaurantId.toString())
        .build()
    );

    MenuErrorHandler.logError(error, "processPdfMenuUpload");
    throw error;
  }

  /**
   * Finalize menu import after preview and conflict resolution
   */
  async finalizeMenuImport(
    data: FinalImportRequestBody,
    restaurantId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ImportResult | { jobId: string; message: string }> {
    const startTime = Date.now();

    try {
      console.log(
        `🔄 Starting import finalization: ${data.itemsToImport.length} items`
      );

      const result = await this.importService.finalizeMenuImport(
        data,
        restaurantId,
        userId
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ Import finalization completed in ${processingTime}ms`);

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      const importError = MenuErrorHandler.handleImportError(
        error,
        data.itemsToImport.length,
        "create"
      );

      MenuErrorHandler.logError(importError, "finalizeMenuImport");
      throw importError;
    }
  }

  /**
   * Process queued menu import
   */
  async processQueuedMenuImport(
    menuImportJobDocumentId: string | Types.ObjectId
  ): Promise<ImportResult> {
    try {
      console.log(`⚙️ Processing queued import: ${menuImportJobDocumentId}`);

      const result = await this.importService.processQueuedMenuImport(
        menuImportJobDocumentId
      );

      console.log(`✅ Queued import completed: ${result.overallStatus}`);
      return result;
    } catch (error: any) {
      const importError = MenuErrorHandler.handleImportError(
        error,
        0,
        "create"
      );
      MenuErrorHandler.logError(importError, "processQueuedMenuImport");
      throw importError;
    }
  }

  /**
   * Process menu for conflict resolution
   */
  async processMenuForConflictResolution(
    data: ProcessConflictResolutionRequest
  ): Promise<ProcessConflictResolutionResponse> {
    try {
      console.log(
        `🔍 Processing conflict resolution: ${data.itemsToProcess.length} items`
      );

      const result = await this.importService.processMenuForConflictResolution(
        data
      );

      console.log(
        `✅ Conflict resolution completed: ${result.summary.totalProcessed} processed`
      );
      return result;
    } catch (error: any) {
      const importError = MenuErrorHandler.handleImportError(
        error,
        data.itemsToProcess.length,
        "update"
      );

      MenuErrorHandler.logError(
        importError,
        "processMenuForConflictResolution"
      );
      throw importError;
    }
  }

  // ==================== ADDITIONAL UTILITY METHODS ====================

  /**
   * Get menu statistics for a restaurant
   */
  async getMenuStatistics(restaurantId: Types.ObjectId) {
    try {
      return await MenuCrudService.getMenuStatistics(restaurantId);
    } catch (error: any) {
      MenuErrorHandler.logError(
        MenuErrorHandler.handleValidationError(
          "restaurant",
          restaurantId,
          error.message
        ),
        "getMenuStatistics"
      );
      throw error;
    }
  }

  /**
   * Check if a menu name is available
   */
  async isMenuNameAvailable(
    menuName: string,
    restaurantId: Types.ObjectId,
    excludeMenuId?: string | Types.ObjectId
  ): Promise<boolean> {
    try {
      return await MenuCrudService.isMenuNameAvailable(
        menuName,
        restaurantId,
        excludeMenuId
      );
    } catch (error: any) {
      MenuErrorHandler.logError(
        MenuErrorHandler.handleValidationError(
          "menuName",
          menuName,
          error.message
        ),
        "isMenuNameAvailable"
      );
      throw error;
    }
  }

  /**
   * Get menus by status with pagination
   */
  async getMenusByStatus(
    restaurantId: Types.ObjectId,
    isActive: boolean,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      return await MenuCrudService.getMenusByStatus(
        restaurantId,
        isActive,
        page,
        limit
      );
    } catch (error: any) {
      MenuErrorHandler.logError(
        MenuErrorHandler.handleValidationError(
          "pagination",
          { page, limit },
          error.message
        ),
        "getMenusByStatus"
      );
      throw error;
    }
  }

  // ==================== HEALTH CHECK METHODS ====================

  /**
   * Perform system health check
   */
  async performHealthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    services: {
      crud: "ok" | "error";
      import: "ok" | "error";
      ai: "ok" | "error";
    };
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    const services: {
      crud: "ok" | "error";
      import: "ok" | "error";
      ai: "ok" | "error";
    } = {
      crud: "ok",
      import: "ok",
      ai: "ok",
    };

    // Test CRUD service
    try {
      // Simple validation test
      await MenuCrudService.isMenuNameAvailable(
        "__health_check__",
        new Types.ObjectId()
      );
      services.crud = "ok";
    } catch (error) {
      services.crud = "error";
      console.error("CRUD service health check failed:", error);
    }

    // Test import service
    try {
      // Import service is always available (no external dependencies)
      services.import = "ok";
    } catch (error) {
      services.import = "error";
      console.error("Import service health check failed:", error);
    }

    // Test AI service (basic validation)
    try {
      // Check if API key is available
      if (process.env.GEMINI_API_KEY) {
        services.ai = "ok";
      } else {
        services.ai = "error";
      }
    } catch (error) {
      services.ai = "error";
      console.error("AI service health check failed:", error);
    }

    // Determine overall status
    const errorCount = Object.values(services).filter(
      (status) => status === "error"
    ).length;
    const status =
      errorCount === 0 ? "healthy" : errorCount <= 1 ? "degraded" : "unhealthy";

    return { status, services, timestamp };
  }
}

// Export singleton instance
const MenuService = new MenuServiceRefactored();
export default MenuService;

// Also export the class for testing
export { MenuServiceRefactored };
