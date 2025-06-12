import mongoose, { Types } from "mongoose";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import pdfParse from "pdf-parse";

import { AppError } from "../utils/errorHandler";
import { MenuCrudService, MenuData } from "./MenuCrudService";
import {
  AIMenuProcessorService,
  AIProcessingOptions,
} from "./AIMenuProcessorService";
import {
  FileParserService,
  ParsedMenuData,
  RawMenuItem,
} from "./fileParserService";

import MenuItem, {
  IMenuItem,
  ILeanMenuItem,
  WINE_STYLES,
  WineStyleType,
} from "../models/MenuItem";
import MenuImportJobModel, {
  IMenuImportJobDocument,
} from "../models/MenuImportJobModel";
import { menuImportQueue } from "../queues/menuImportQueue";

import {
  MenuUploadPreview,
  ParsedMenuItem,
  FinalImportRequestBody,
  ImportResult,
  ImportResultItemDetail,
  ProcessConflictResolutionRequest,
  ProcessConflictResolutionResponse,
  MenuImportJobData,
  ImportActionStatus,
  ConflictResolutionStatus,
  IMenuImportJob,
  GeminiProcessedMenuItem,
  GeminiAIServiceOutput,
} from "../types/menuUploadTypes";

import {
  ASYNC_IMPORT_THRESHOLD,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_INGREDIENTS,
  MAX_INGREDIENT_LENGTH,
} from "../utils/constants";

import {
  processMenuItem,
  ProcessedMenuItem,
} from "../utils/ingredientIntelligence";

export interface ImportOptions {
  originalFileName?: string;
  replaceAllItems?: boolean;
  targetMenuId?: string;
}

export interface ImportPreviewOptions {
  originalFileName?: string;
  maxFileSizeMB?: number;
}

/**
 * Service responsible for menu import operations
 * Handles file parsing, AI processing, and data import
 */
export class MenuImportService {
  private readonly aiProcessor: AIMenuProcessorService;

  constructor() {
    this.aiProcessor = new AIMenuProcessorService();
  }

  /**
   * Generate upload preview from various file formats
   */
  async getMenuUploadPreview(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    options: ImportPreviewOptions = {}
  ): Promise<MenuUploadPreview> {
    const { originalFileName, maxFileSizeMB = 10 } = options;
    const previewId = uuidv4();
    const globalErrors: string[] = [];

    try {
      // 1. Validate file exists and is readable
      const fileValidation = this.validateUploadedFile(
        multerFilePath,
        maxFileSizeMB
      );
      if (!fileValidation.isValid) {
        return this.createErrorPreview(
          previewId,
          multerFilePath,
          fileValidation.errors,
          originalFileName
        );
      }

      // 2. Detect file format
      const sourceFormat = this.detectFileFormat(multerFilePath);
      if (!sourceFormat) {
        return this.createErrorPreview(
          previewId,
          multerFilePath,
          [
            `Unsupported file format. Supported: .pdf, .xlsx, .xls, .csv, .json, .docx`,
          ],
          originalFileName
        );
      }

      console.log(`📄 Processing ${sourceFormat} file: ${originalFileName}`);

      // 3. Parse file content
      const parseResult = await this.parseFileContent(
        multerFilePath,
        sourceFormat,
        originalFileName
      );
      if (!parseResult.success) {
        return this.createErrorPreview(
          previewId,
          multerFilePath,
          parseResult.errors,
          originalFileName,
          sourceFormat
        );
      }

      // 4. Process items and create preview
      const preview = await this.createMenuPreview(
        previewId,
        multerFilePath,
        sourceFormat,
        parseResult.data!,
        originalFileName
      );

      console.log(
        `✅ Preview created: ${preview.parsedItems.length} items processed`
      );
      return preview;
    } catch (error: any) {
      console.error("Unexpected error during preview generation:", error);
      return this.createErrorPreview(
        previewId,
        multerFilePath,
        [`Unexpected error: ${error.message || "Unknown error"}`],
        originalFileName
      );
    }
  }

  /**
   * Finalize menu import with conflict resolution
   */
  async finalizeMenuImport(
    data: FinalImportRequestBody,
    restaurantId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ImportResult | { jobId: string; message: string }> {
    const {
      filePath,
      parsedMenuName,
      targetMenuId,
      replaceAllItems,
      itemsToImport,
    } = data;

    // Check if we need async processing
    if (itemsToImport.length > ASYNC_IMPORT_THRESHOLD) {
      return this.queueAsyncImport(data, restaurantId, userId);
    }

    // Process synchronously
    console.log(`🔄 Processing ${itemsToImport.length} items synchronously`);
    return this.processSyncImport(data, restaurantId);
  }

  /**
   * Process queued menu import
   */
  async processQueuedMenuImport(
    menuImportJobDocumentId: string | Types.ObjectId
  ): Promise<ImportResult> {
    const jobDoc = await MenuImportJobModel.findById(menuImportJobDocumentId);
    if (!jobDoc) {
      return this.createFailedResult(
        `MenuImportJob document not found: ${menuImportJobDocumentId}`
      );
    }

    try {
      jobDoc.status = "processing";
      jobDoc.processedAt = new Date();
      await jobDoc.save();

      const result = await this.processSyncImport(
        {
          previewId: `queued_${jobDoc._id}`,
          filePath: jobDoc.originalFilePath,
          parsedMenuName: jobDoc.parsedMenuName,
          targetMenuId: jobDoc.targetMenuId?.toString(),
          replaceAllItems: jobDoc.replaceAllItems,
          itemsToImport: jobDoc.itemsToImport,
        },
        new Types.ObjectId(jobDoc.restaurantId)
      );

      // Update job with result
      jobDoc.status =
        result.overallStatus === "failed"
          ? "failed"
          : result.overallStatus === "partial_success"
          ? "partial_success"
          : "completed";
      jobDoc.result = result;
      jobDoc.completedAt = new Date();
      jobDoc.progress = 100;

      if (result.overallStatus === "failed") {
        jobDoc.errorMessage = result.message;
      }

      await jobDoc.save();

      // Clean up temp file if successful
      if (
        (jobDoc.status === "completed" ||
          jobDoc.status === "partial_success") &&
        jobDoc.originalFilePath &&
        fs.existsSync(jobDoc.originalFilePath)
      ) {
        this.cleanupTempFile(jobDoc.originalFilePath);
      }

      return result;
    } catch (error: any) {
      jobDoc.status = "failed";
      jobDoc.errorMessage = error.message;
      jobDoc.completedAt = new Date();
      await jobDoc.save();

      return this.createFailedResult(error.message);
    }
  }

  /**
   * Process conflict resolution for menu items
   */
  async processMenuForConflictResolution(
    data: ProcessConflictResolutionRequest
  ): Promise<ProcessConflictResolutionResponse> {
    const {
      itemsToProcess,
      restaurantId: restaurantIdFromData,
      targetMenuId,
    } = data;

    if (
      !restaurantIdFromData ||
      !mongoose.Types.ObjectId.isValid(restaurantIdFromData)
    ) {
      throw new AppError(
        "Invalid or missing restaurant ID for conflict resolution.",
        400
      );
    }

    const restaurantId = new mongoose.Types.ObjectId(restaurantIdFromData);
    const processedItems: ParsedMenuItem[] = [];
    let itemsRequiringUserAction = 0;
    let potentialUpdatesIdentified = 0;
    let newItemsConfirmed = 0;

    for (const item of itemsToProcess) {
      if (item.userAction === "ignore") {
        processedItems.push({
          ...item,
          conflictResolution: { status: "skipped_by_user" },
        });
        continue;
      }

      const conflictResult = await this.checkItemConflicts(
        item,
        restaurantId,
        targetMenuId
      );

      switch (conflictResult.status) {
        case "no_conflict":
          newItemsConfirmed++;
          break;
        case "update_candidate":
          potentialUpdatesIdentified++;
          break;
        case "multiple_candidates":
        case "error_processing_conflict":
          itemsRequiringUserAction++;
          break;
      }

      processedItems.push({
        ...item,
        conflictResolution: conflictResult,
      });
    }

    return {
      processedItems,
      summary: {
        itemsRequiringUserAction,
        potentialUpdatesIdentified,
        newItemsConfirmed,
        totalProcessed: itemsToProcess.length,
      },
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Validate uploaded file
   */
  private validateUploadedFile(
    filePath: string,
    maxSizeMB: number
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      errors.push("Uploaded file not found or was removed during processing");
      return { isValid: false, errors };
    }

    // Check file size
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      errors.push(
        `File size (${fileSizeMB.toFixed(
          1
        )}MB) exceeds the ${maxSizeMB}MB limit`
      );
    }

    if (stats.size === 0) {
      errors.push("File is empty");
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Detect file format from extension
   */
  private detectFileFormat(
    filePath: string
  ): "pdf" | "excel" | "csv" | "json" | "word" | null {
    const extension = path.extname(filePath).toLowerCase();

    const formatMap: Record<string, "pdf" | "excel" | "csv" | "json" | "word"> =
      {
        ".pdf": "pdf",
        ".xlsx": "excel",
        ".xls": "excel",
        ".csv": "csv",
        ".json": "json",
        ".docx": "word",
      };

    return formatMap[extension] || null;
  }

  /**
   * Parse file content based on format
   */
  private async parseFileContent(
    filePath: string,
    format: "pdf" | "excel" | "csv" | "json" | "word",
    originalFileName?: string
  ): Promise<{
    success: boolean;
    data?: {
      menuName: string;
      items: (GeminiProcessedMenuItem | RawMenuItem)[];
      sourceFormat: "pdf" | "excel" | "csv" | "json" | "word";
    };
    errors: string[];
  }> {
    try {
      if (format === "pdf") {
        return await this.parsePdfFile(filePath, originalFileName);
      } else {
        return await this.parseStructuredFile(
          filePath,
          format,
          originalFileName
        );
      }
    } catch (error: any) {
      console.error(`Error parsing ${format} file:`, error);
      return {
        success: false,
        errors: [
          `Failed to parse ${format.toUpperCase()} file: ${error.message}`,
        ],
      };
    }
  }

  /**
   * Parse PDF file using AI
   */
  private async parsePdfFile(
    filePath: string,
    originalFileName?: string
  ): Promise<{
    success: boolean;
    data?: {
      menuName: string;
      items: GeminiProcessedMenuItem[];
      sourceFormat: "pdf";
    };
    errors: string[];
  }> {
    try {
      // Extract text from PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const rawText = pdfData.text?.trim() || "";

      if (!rawText) {
        return {
          success: false,
          errors: ["No text content could be extracted from the PDF"],
        };
      }

      if (rawText.length < 50) {
        return {
          success: false,
          errors: [
            "Very little text content extracted from PDF. Results may be incomplete.",
          ],
        };
      }

      // Process with AI
      const aiOptions: AIProcessingOptions = {
        originalFileName,
        maxRetries: 3,
      };

      const aiResult = await this.aiProcessor.processMenuText(
        rawText,
        aiOptions
      );

      if (!aiResult.success) {
        return {
          success: false,
          errors: [`AI processing failed: ${aiResult.error}`],
        };
      }

      const menuName =
        aiResult.data!.menuName ||
        originalFileName?.replace(/\.pdf$/i, "") ||
        "Menu from PDF";

      return {
        success: true,
        data: {
          menuName,
          items: aiResult.data!.menuItems,
          sourceFormat: "pdf",
        },
        errors: [],
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [`PDF processing error: ${error.message}`],
      };
    }
  }

  /**
   * Parse structured file (Excel, CSV, JSON, Word)
   */
  private async parseStructuredFile(
    filePath: string,
    format: "excel" | "csv" | "json" | "word",
    originalFileName?: string
  ): Promise<{
    success: boolean;
    data?: {
      menuName: string;
      items: RawMenuItem[];
      sourceFormat: "excel" | "csv" | "json" | "word";
    };
    errors: string[];
  }> {
    try {
      const structuredData = await FileParserService.parseMenuFile(
        filePath,
        originalFileName || `menu.${format === "excel" ? "xlsx" : format}`
      );

      if (
        !structuredData ||
        !structuredData.items ||
        structuredData.items.length === 0
      ) {
        return {
          success: false,
          errors: [`No menu items found in the ${format.toUpperCase()} file`],
        };
      }

      const menuName =
        structuredData.menuName ||
        originalFileName?.replace(/\.[^.]+$/i, "") ||
        `Menu from ${format.toUpperCase()}`;

      return {
        success: true,
        data: {
          menuName,
          items: structuredData.items,
          sourceFormat: format,
        },
        errors: [],
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [`${format.toUpperCase()} parsing error: ${error.message}`],
      };
    }
  }

  /**
   * Create menu preview from parsed data
   */
  private async createMenuPreview(
    previewId: string,
    filePath: string,
    sourceFormat: "pdf" | "excel" | "csv" | "json" | "word",
    data: {
      menuName: string;
      items: (GeminiProcessedMenuItem | RawMenuItem)[];
    },
    originalFileName?: string
  ): Promise<MenuUploadPreview> {
    const parsedItems: ParsedMenuItem[] = [];
    const processingErrors: string[] = [];
    const detectedCategories = new Set<string>();

    // Process each item
    data.items.forEach((item, index) => {
      try {
        const enhancedItem = this.enhanceRawMenuItem(item);
        const parsedItem = this.createParsedMenuItem(enhancedItem, index);

        parsedItems.push(parsedItem);

        // Collect categories
        if (parsedItem.fields.category.value) {
          const normalizedCategory = this.normalizeCategory(
            String(parsedItem.fields.category.value)
          );
          detectedCategories.add(normalizedCategory);
          parsedItem.fields.category.value = normalizedCategory;
        }
      } catch (error: any) {
        processingErrors.push(`Item ${index + 1}: ${error.message}`);
      }
    });

    // Count items with errors
    const itemsWithPotentialErrors = parsedItems.filter(
      (item) =>
        !item.fields.name.isValid ||
        !item.fields.category.isValid ||
        !item.fields.price.isValid
    ).length;

    return {
      previewId,
      filePath,
      sourceFormat,
      parsedMenuName: data.menuName,
      parsedItems,
      detectedCategories: Array.from(detectedCategories).sort(),
      summary: {
        totalItemsParsed: parsedItems.length,
        itemsWithPotentialErrors,
      },
      globalErrors:
        processingErrors.length > 0 ? processingErrors.slice(0, 10) : [],
    };
  }

  /**
   * Enhance raw menu item with intelligence
   */
  private enhanceRawMenuItem(
    rawItem: GeminiProcessedMenuItem | RawMenuItem
  ): GeminiProcessedMenuItem {
    // Normalize to GeminiProcessedMenuItem format
    let normalizedItem: GeminiProcessedMenuItem;

    if ("itemName" in rawItem) {
      normalizedItem = rawItem as GeminiProcessedMenuItem;
    } else {
      const raw = rawItem as RawMenuItem;
      normalizedItem = {
        itemName: raw.name || "",
        itemPrice: raw.price,
        itemType: raw.itemType || "food",
        itemIngredients: raw.ingredients || [],
        itemCategory: raw.category || "Uncategorized",
        isGlutenFree: raw.isGlutenFree || false,
        isVegan: raw.isVegan || false,
        isVegetarian: raw.isVegetarian || false,
        wineStyle: raw.wineStyle,
        wineProducer: raw.producer,
        wineGrapeVariety: raw.grapeVariety,
        wineVintage: raw.vintage,
        wineRegion: raw.region,
        wineServingOptions: raw.servingOptions,
        winePairings: raw.pairings,
      };
    }

    // Apply enhanced processing
    try {
      const processedMenuItem = processMenuItem({
        itemName: normalizedItem.itemName,
        itemType: normalizedItem.itemType,
        itemCategory: normalizedItem.itemCategory,
        itemPrice: normalizedItem.itemPrice,
        itemIngredients: normalizedItem.itemIngredients,
        description: undefined,
        isVegan: normalizedItem.isVegan,
        isVegetarian: normalizedItem.isVegetarian,
        isGlutenFree: normalizedItem.isGlutenFree,
        wineRegion: normalizedItem.wineRegion,
        wineProducer: normalizedItem.wineProducer,
        wineStyle: normalizedItem.wineStyle,
        wineVintage: normalizedItem.wineVintage,
        winePairings: normalizedItem.winePairings,
      });

      // Apply enhancements
      const enhancedIngredients = processedMenuItem.enhancedIngredients;
      const coreIngredients = enhancedIngredients
        .filter((ing) => ing.isCore)
        .map((ing) => ing.name);

      return {
        ...normalizedItem,
        isVegan: processedMenuItem.isVegan,
        isVegetarian: processedMenuItem.isVegetarian,
        isGlutenFree: processedMenuItem.isGlutenFree,
        itemIngredients:
          coreIngredients.length > 0
            ? coreIngredients
            : normalizedItem.itemIngredients,
        wineGrapeVariety:
          processedMenuItem.wineIntelligence?.grapeVarieties.map(
            (g) => g.name
          ) || normalizedItem.wineGrapeVariety,
      };
    } catch (error) {
      console.error(
        `Error enhancing item "${normalizedItem.itemName}":`,
        error
      );
      return normalizedItem;
    }
  }

  /**
   * Create ParsedMenuItem from enhanced item
   */
  private createParsedMenuItem(
    enhancedItem: GeminiProcessedMenuItem,
    index: number
  ): ParsedMenuItem {
    const isNameValid = !!enhancedItem.itemName?.trim();
    const isCategoryValid = !!enhancedItem.itemCategory?.trim();
    const isPriceValid =
      enhancedItem.itemPrice === null ||
      enhancedItem.itemPrice === undefined ||
      enhancedItem.itemPrice >= 0;

    const fields: ParsedMenuItem["fields"] = {
      name: {
        value: enhancedItem.itemName || "",
        originalValue: enhancedItem.itemName || "",
        isValid: isNameValid,
        errorMessage: isNameValid ? undefined : "Name cannot be empty.",
      },
      price: {
        value: enhancedItem.itemPrice ?? null,
        originalValue: enhancedItem.itemPrice ?? null,
        isValid: isPriceValid,
        errorMessage: isPriceValid ? undefined : "Price cannot be negative",
      },
      category: {
        value: enhancedItem.itemCategory || "Uncategorized",
        originalValue: enhancedItem.itemCategory || "Uncategorized",
        isValid: isCategoryValid,
        errorMessage: isCategoryValid ? undefined : "Category cannot be empty.",
      },
      itemType: {
        value: enhancedItem.itemType || "food",
        originalValue: enhancedItem.itemType || "food",
        isValid: ["food", "beverage", "wine"].includes(
          enhancedItem.itemType || "food"
        ),
      },
      ingredients: {
        value: Array.isArray(enhancedItem.itemIngredients)
          ? enhancedItem.itemIngredients
          : [],
        originalValue: Array.isArray(enhancedItem.itemIngredients)
          ? enhancedItem.itemIngredients
          : [],
        isValid: true,
      },
      isGlutenFree: {
        value: Boolean(enhancedItem.isGlutenFree),
        originalValue: Boolean(enhancedItem.isGlutenFree),
        isValid: true,
      },
      isVegan: {
        value: Boolean(enhancedItem.isVegan),
        originalValue: Boolean(enhancedItem.isVegan),
        isValid: true,
      },
      isVegetarian: {
        value: Boolean(enhancedItem.isVegetarian),
        originalValue: Boolean(enhancedItem.isVegetarian),
        isValid: true,
      },
    };

    // Add wine-specific fields
    if (enhancedItem.itemType === "wine") {
      fields.wineStyle = {
        value: enhancedItem.wineStyle || null,
        originalValue: enhancedItem.wineStyle || null,
        isValid: true,
      };
      fields.wineProducer = {
        value: enhancedItem.wineProducer || null,
        originalValue: enhancedItem.wineProducer || null,
        isValid: true,
      };
      fields.wineGrapeVariety = {
        value: Array.isArray(enhancedItem.wineGrapeVariety)
          ? enhancedItem.wineGrapeVariety.join(", ")
          : enhancedItem.wineGrapeVariety || null,
        originalValue: Array.isArray(enhancedItem.wineGrapeVariety)
          ? enhancedItem.wineGrapeVariety.join(", ")
          : enhancedItem.wineGrapeVariety || null,
        isValid: true,
      };
      fields.wineVintage = {
        value: enhancedItem.wineVintage ?? null,
        originalValue: enhancedItem.wineVintage ?? null,
        isValid:
          !enhancedItem.wineVintage ||
          (enhancedItem.wineVintage >= 1800 &&
            enhancedItem.wineVintage <= new Date().getFullYear() + 5),
      };
      fields.wineRegion = {
        value: enhancedItem.wineRegion || null,
        originalValue: enhancedItem.wineRegion || null,
        isValid: true,
      };
      fields.wineServingOptions = {
        value: (enhancedItem.wineServingOptions || []).map((opt) => ({
          id: uuidv4(),
          size: opt.size || "",
          price:
            opt.price === null || opt.price === undefined
              ? ""
              : String(opt.price),
        })),
        originalValue: (enhancedItem.wineServingOptions || []).map((opt) => ({
          id: uuidv4(),
          size: opt.size || "",
          price:
            opt.price === null || opt.price === undefined
              ? ""
              : String(opt.price),
        })),
        isValid: true,
      };
      fields.winePairings = {
        value: Array.isArray(enhancedItem.winePairings)
          ? enhancedItem.winePairings.join(", ")
          : enhancedItem.winePairings || null,
        originalValue: Array.isArray(enhancedItem.winePairings)
          ? enhancedItem.winePairings.join(", ")
          : enhancedItem.winePairings || null,
        isValid: true,
      };
    }

    return {
      id: uuidv4(),
      internalIndex: index,
      fields,
      originalSourceData: enhancedItem,
      status: "new",
      conflictResolution: { status: "no_conflict" },
      userAction: "keep",
    };
  }

  /**
   * Normalize category name
   */
  private normalizeCategory(category: string): string {
    if (!category || category.trim() === "") return "Uncategorized";

    return category
      .trim()
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Create error preview
   */
  private createErrorPreview(
    previewId: string,
    filePath: string,
    errors: string[],
    originalFileName?: string,
    sourceFormat: "pdf" | "excel" | "csv" | "json" | "word" = "pdf"
  ): MenuUploadPreview {
    return {
      previewId,
      filePath,
      sourceFormat,
      parsedMenuName: originalFileName?.replace(/\.[^.]+$/i, "") || "Menu",
      parsedItems: [],
      detectedCategories: [],
      summary: { totalItemsParsed: 0, itemsWithPotentialErrors: 0 },
      globalErrors: errors,
    };
  }

  /**
   * Queue async import for large datasets
   */
  private async queueAsyncImport(
    data: FinalImportRequestBody,
    restaurantId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<{ jobId: string; message: string }> {
    const {
      filePath,
      parsedMenuName,
      targetMenuId,
      replaceAllItems,
      itemsToImport,
    } = data;

    const jobData = {
      userId,
      restaurantId,
      originalFilePath: filePath,
      parsedMenuName,
      targetMenuId: targetMenuId ? new Types.ObjectId(targetMenuId) : undefined,
      replaceAllItems,
      itemsToImport,
      status: "pending" as IMenuImportJob["status"],
      progress: 0,
      attempts: 0,
    };

    const jobDoc: IMenuImportJobDocument = new MenuImportJobModel(jobData);
    await jobDoc.save();

    const queueData: MenuImportJobData = {
      menuImportJobDocumentId: jobDoc._id.toString(),
    };

    await menuImportQueue.add("menu-import-job", queueData);

    return {
      jobId: jobDoc._id.toString(),
      message: `Menu import with ${itemsToImport.length} items queued. Job ID: ${jobDoc._id}`,
    };
  }

  /**
   * Process import synchronously
   */
  private async processSyncImport(
    data: FinalImportRequestBody,
    restaurantId: Types.ObjectId
  ): Promise<ImportResult> {
    const {
      filePath,
      parsedMenuName,
      targetMenuId,
      replaceAllItems,
      itemsToImport,
    } = data;

    const session = await mongoose.startSession();
    session.startTransaction();

    const result: ImportResult = {
      overallStatus: "success",
      message: "",
      menuId: undefined,
      menuName: undefined,
      itemsProcessed: itemsToImport.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsErrored: 0,
      errorDetails: [],
      errorReport: "",
    };

    try {
      // 1. Handle menu creation/selection
      const menuResult = await this.handleMenuSelection(
        targetMenuId,
        parsedMenuName,
        replaceAllItems,
        restaurantId,
        session
      );

      result.menuId = menuResult.menuId.toString();
      result.menuName = menuResult.menuName;

      // 2. Process items
      const itemResults = await this.processMenuItems(
        itemsToImport,
        menuResult.menuId,
        restaurantId,
        session
      );

      // Update result counters
      result.itemsCreated = itemResults.created;
      result.itemsUpdated = itemResults.updated;
      result.itemsSkipped = itemResults.skipped;
      result.itemsErrored = itemResults.errored;
      result.errorDetails = itemResults.errorDetails;

      // 3. Determine overall status
      result.overallStatus =
        result.itemsErrored > 0
          ? result.itemsErrored === itemsToImport.length - result.itemsSkipped
            ? "failed"
            : "partial_success"
          : "success";

      result.message =
        result.itemsErrored > 0
          ? `Import completed with ${result.itemsErrored} errors.`
          : `Successfully imported ${result.itemsCreated} new items and updated ${result.itemsUpdated} items. ${result.itemsSkipped} items were skipped.`;

      await session.commitTransaction();

      // Clean up temp file
      if (filePath && fs.existsSync(filePath)) {
        this.cleanupTempFile(filePath);
      }

      return result;
    } catch (error: any) {
      await session.abortTransaction();
      result.overallStatus = "failed";
      result.message = error.message || "Unexpected error during import.";

      result.errorDetails?.push({
        id: "global_error",
        name: "Global Import Error",
        status: "error",
        errorReason: error.message,
      });

      return result;
    } finally {
      session.endSession();
    }
  }

  // Helper methods for import processing...
  private async handleMenuSelection(
    targetMenuId: string | undefined,
    parsedMenuName: string,
    replaceAllItems: boolean,
    restaurantId: Types.ObjectId,
    session: mongoose.ClientSession
  ): Promise<{ menuId: Types.ObjectId; menuName: string }> {
    let menuId: Types.ObjectId;
    let menuName: string;

    if (targetMenuId) {
      const menu = await MenuCrudService.getMenuById(
        targetMenuId,
        restaurantId
      );
      if (!menu) {
        throw new AppError(
          `Target menu with ID "${targetMenuId}" not found.`,
          404
        );
      }

      menuId = new Types.ObjectId(menu._id);
      menuName = menu.name;

      if (replaceAllItems) {
        await MenuItem.deleteMany({ menuId, restaurantId }).session(session);
        console.log(`🗑️ Cleared existing items from menu: ${menuName}`);
      }
    } else {
      const menuData: MenuData = { name: parsedMenuName, isActive: true };
      const menu = await MenuCrudService.createMenu(
        menuData,
        restaurantId,
        session
      );

      menuId = menu._id as Types.ObjectId;
      menuName = menu.name;
    }

    return { menuId, menuName };
  }

  private async processMenuItems(
    itemsToImport: ParsedMenuItem[],
    menuId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    session: mongoose.ClientSession
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errored: number;
    errorDetails: ImportResultItemDetail[];
  }> {
    const bulkOperations: any[] = [];
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errored: 0,
      errorDetails: [] as ImportResultItemDetail[],
    };

    for (const item of itemsToImport) {
      try {
        if (item.importAction === "skip" || item.userAction === "ignore") {
          results.skipped++;
          continue;
        }

        if (item.importAction === "create") {
          const newItemData = this.prepareNewItemData(
            item.fields,
            menuId,
            restaurantId
          );
          bulkOperations.push({ insertOne: { document: newItemData } });
          results.created++;
        } else if (item.importAction === "update" && item.existingItemId) {
          const updateData = await this.prepareUpdateData(
            item,
            menuId,
            restaurantId,
            session
          );
          if (Object.keys(updateData).length > 0) {
            bulkOperations.push({
              updateOne: {
                filter: { _id: item.existingItemId },
                update: { $set: updateData },
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        }
      } catch (error: any) {
        results.errored++;
        results.errorDetails.push({
          id: item.id,
          name: String(item.fields.name.value || "N/A"),
          status: "error",
          errorReason: error.message,
          existingItemId: item.existingItemId,
        });
      }
    }

    // Execute bulk operations
    if (bulkOperations.length > 0) {
      const bulkResult = await MenuItem.bulkWrite(bulkOperations, { session });

      if (bulkResult.hasWriteErrors()) {
        bulkResult.getWriteErrors().forEach((error: any) => {
          results.errored++;
          results.errorDetails.push({
            id: `bulkError_${error.index}`,
            name: "Bulk Operation Error",
            status: "error",
            errorReason: error.errmsg,
          });
        });
      }
    }

    return results;
  }

  // ==================== ITEM PROCESSING HELPER METHODS ====================

  /**
   * Prepare new item data for creation
   */
  private prepareNewItemData(
    fields: any,
    menuId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): any {
    const itemData: any = {
      menuId,
      restaurantId,
      itemName: fields.name.value,
      itemPrice: fields.price.value,
      itemType: fields.itemType.value,
      itemIngredients: fields.ingredients.value || [],
      itemCategory: fields.category.value,
      isGlutenFree: fields.isGlutenFree.value,
      isVegan: fields.isVegan.value,
      isVegetarian: fields.isVegetarian.value,
      isActive: true,
    };

    // Add wine-specific fields if applicable
    if (fields.itemType.value === "wine") {
      if (
        fields.wineStyle?.value &&
        WINE_STYLES.includes(fields.wineStyle.value as WineStyleType)
      ) {
        itemData.wineStyle = fields.wineStyle.value as WineStyleType;
      }
      if (fields.wineProducer?.value) {
        itemData.wineProducer = fields.wineProducer.value;
      }
      if (fields.wineGrapeVariety?.value) {
        const varieties = fields.wineGrapeVariety.value
          .split(",")
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);
        if (varieties.length > 0) {
          itemData.wineGrapeVariety = varieties;
        }
      }
      if (fields.wineVintage?.value) {
        itemData.wineVintage = fields.wineVintage.value;
      }
      if (fields.wineRegion?.value) {
        itemData.wineRegion = fields.wineRegion.value;
      }
      if (
        fields.wineServingOptions?.value &&
        Array.isArray(fields.wineServingOptions.value)
      ) {
        const servingOptions = fields.wineServingOptions.value
          .filter((opt: any) => opt.size && opt.price)
          .map((opt: any) => ({
            size: opt.size,
            price: parseFloat(opt.price),
          }));
        if (servingOptions.length > 0) {
          itemData.servingOptions = servingOptions;
        }
      }
      if (fields.winePairings?.value) {
        const pairings = fields.winePairings.value
          .split(",")
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);
        if (pairings.length > 0) {
          itemData.winePairings = pairings;
        }
      }
    }

    return itemData;
  }

  /**
   * Prepare update data for existing item
   */
  private async prepareUpdateData(
    item: ParsedMenuItem,
    menuId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    session: mongoose.ClientSession
  ): Promise<any> {
    const updateData: any = {};

    // Only include changed fields
    if (item.fields.name.value !== item.fields.name.originalValue) {
      updateData.itemName = item.fields.name.value;
    }
    if (item.fields.price.value !== item.fields.price.originalValue) {
      updateData.itemPrice = item.fields.price.value;
    }
    if (item.fields.category.value !== item.fields.category.originalValue) {
      updateData.itemCategory = item.fields.category.value;
    }
    if (item.fields.itemType.value !== item.fields.itemType.originalValue) {
      updateData.itemType = item.fields.itemType.value;
    }
    if (
      JSON.stringify(item.fields.ingredients.value) !==
      JSON.stringify(item.fields.ingredients.originalValue)
    ) {
      updateData.itemIngredients = item.fields.ingredients.value;
    }
    if (
      item.fields.isGlutenFree.value !== item.fields.isGlutenFree.originalValue
    ) {
      updateData.isGlutenFree = item.fields.isGlutenFree.value;
    }
    if (item.fields.isVegan.value !== item.fields.isVegan.originalValue) {
      updateData.isVegan = item.fields.isVegan.value;
    }
    if (
      item.fields.isVegetarian.value !== item.fields.isVegetarian.originalValue
    ) {
      updateData.isVegetarian = item.fields.isVegetarian.value;
    }

    // Handle wine-specific fields
    if (item.fields.itemType.value === "wine") {
      if (
        item.fields.wineStyle?.value !== item.fields.wineStyle?.originalValue
      ) {
        updateData.wineStyle = item.fields.wineStyle.value;
      }
      if (
        item.fields.wineProducer?.value !==
        item.fields.wineProducer?.originalValue
      ) {
        updateData.wineProducer = item.fields.wineProducer.value;
      }
      if (
        item.fields.wineGrapeVariety?.value !==
        item.fields.wineGrapeVariety?.originalValue
      ) {
        const varieties = item.fields.wineGrapeVariety.value
          ?.split(",")
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);
        updateData.wineGrapeVariety = varieties;
      }
      if (
        item.fields.wineVintage?.value !==
        item.fields.wineVintage?.originalValue
      ) {
        updateData.wineVintage = item.fields.wineVintage.value;
      }
      if (
        item.fields.wineRegion?.value !== item.fields.wineRegion?.originalValue
      ) {
        updateData.wineRegion = item.fields.wineRegion.value;
      }
      if (
        JSON.stringify(item.fields.wineServingOptions?.value) !==
        JSON.stringify(item.fields.wineServingOptions?.originalValue)
      ) {
        const servingOptions = item.fields.wineServingOptions?.value
          ?.filter((opt: any) => opt.size && opt.price)
          .map((opt: any) => ({
            size: opt.size,
            price: parseFloat(opt.price),
          }));
        updateData.servingOptions = servingOptions;
      }
      if (
        item.fields.winePairings?.value !==
        item.fields.winePairings?.originalValue
      ) {
        const pairings = item.fields.winePairings?.value
          ?.split(",")
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);
        updateData.winePairings = pairings;
      }
    }

    return updateData;
  }

  /**
   * Check for conflicts with existing items
   */
  private async checkItemConflicts(
    item: ParsedMenuItem,
    restaurantId: Types.ObjectId,
    targetMenuId?: string
  ): Promise<{
    status: ConflictResolutionStatus;
    message?: string;
    existingItemId?: string;
    candidateItemIds?: string[];
  }> {
    try {
      const itemName = item.fields.name.value;
      if (!itemName) {
        return {
          status: "error_processing_conflict",
          message: "Item name is required for conflict checking",
        };
      }

      // Build search query
      const searchQuery: any = {
        restaurantId,
        itemName: { $regex: new RegExp(itemName, "i") },
        isActive: true,
      };

      // If targetMenuId is specified, search within that menu
      if (targetMenuId) {
        searchQuery.menuId = new Types.ObjectId(targetMenuId);
      }

      // Find potential conflicts
      const existingItems = await MenuItem.find(searchQuery).lean();

      if (existingItems.length === 0) {
        return { status: "no_conflict" };
      }

      // Check for exact name match
      const exactMatch = existingItems.find(
        (existing) => existing.itemName.toLowerCase() === itemName.toLowerCase()
      );

      if (exactMatch) {
        return {
          status: "update_candidate",
          message: `Item "${itemName}" already exists. Consider updating instead.`,
          existingItemId: exactMatch._id.toString(),
        };
      }

      // Check for similar names (fuzzy matching)
      const similarItems = existingItems.filter((existing) => {
        const similarity = this.calculateStringSimilarity(
          itemName.toLowerCase(),
          existing.itemName.toLowerCase()
        );
        return similarity > 0.7; // 70% similarity threshold
      });

      if (similarItems.length === 1) {
        return {
          status: "update_candidate",
          message: `Similar item "${similarItems[0].itemName}" found. Consider updating instead.`,
          existingItemId: similarItems[0]._id.toString(),
        };
      }

      if (similarItems.length > 1) {
        return {
          status: "multiple_candidates",
          message: `Multiple similar items found. Please review conflicts manually.`,
          candidateItemIds: similarItems.map((item) => item._id.toString()),
        };
      }

      return { status: "no_conflict" };
    } catch (error: any) {
      console.error("Error checking item conflicts:", error);
      return {
        status: "error_processing_conflict",
        message: `Error checking conflicts: ${error.message}`,
      };
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private createFailedResult(message: string): ImportResult {
    return {
      overallStatus: "failed",
      message,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsErrored: 0,
    };
  }

  private cleanupTempFile(filePath: string): void {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting temp file:", filePath, err);
      } else {
        console.log("Temp file deleted:", filePath);
      }
    });
  }
}
