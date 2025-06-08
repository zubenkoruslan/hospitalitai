import * as XLSX from "xlsx";
import csv from "csv-parser";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { AppError } from "../utils/errorHandler";

// Core interfaces for file parsing
export interface ParsedMenuData {
  menuName: string;
  items: RawMenuItem[];
  sourceFormat: "pdf" | "excel" | "csv" | "json" | "word";
  metadata?: FileMetadata;
}

export interface RawMenuItem {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  ingredients?: string[];
  allergens?: string[];
  itemType?: "food" | "beverage" | "wine";

  // Dietary flags
  isVegan?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;

  // Wine specific fields
  wineStyle?: string;
  grapeVariety?: string[];
  vintage?: number;
  region?: string;
  producer?: string;
  servingOptions?: Array<{ size: string; price: number }>;
  pairings?: string[];
}

export interface FileMetadata {
  worksheetName?: string;
  headers?: string[];
  totalRows?: number;
  fileSize?: number;
  processingTime?: number;
  warnings?: string[];
  // Phase 4.2: Enhanced intelligence metadata
  schemaValid?: boolean;
  documentStructure?: {
    categories: string[];
    hasTableStructure: boolean;
    hasFormattedSections: boolean;
  };
  // Phase 4.4: Validation metadata
  validationSummary?: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    warningsCount: number;
  };
}

// Column mapping interface for structured formats
interface ColumnMapping {
  name?: number;
  description?: number;
  price?: number;
  category?: number;
  ingredients?: number;
  allergens?: number;
  itemType?: number;
  isVegan?: number;
  isVegetarian?: number;
  isGlutenFree?: number;
  isDairyFree?: number;
  wineStyle?: number;
  grapeVariety?: number;
  vintage?: number;
  region?: number;
  producer?: number;
  servingOptions?: number;
  pairings?: number;
}

export class FileParserService {
  /**
   * Main entry point for file parsing
   * Phase 4.2: Enhanced with format-specific intelligence
   */
  static async parseMenuFile(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    const startTime = Date.now();
    const extension = path.extname(originalFileName).toLowerCase();

    let result: ParsedMenuData;

    try {
      switch (extension) {
        case ".pdf":
          result = await this.parsePDF(filePath, originalFileName);
          break;
        case ".xlsx":
        case ".xls":
          result = await this.parseExcelWithIntelligence(
            filePath,
            originalFileName
          );
          break;
        case ".csv":
          result = await this.parseCSVWithIntelligence(
            filePath,
            originalFileName
          );
          break;
        case ".json":
          result = await this.parseJSONWithIntelligence(
            filePath,
            originalFileName
          );
          break;
        case ".docx":
          result = await this.parseWordWithIntelligence(
            filePath,
            originalFileName
          );
          break;
        default:
          throw new AppError(`Unsupported file format: ${extension}`, 400);
      }

      // Add processing time to metadata
      if (result.metadata) {
        result.metadata.processingTime = Date.now() - startTime;
      }

      // Apply format-specific intelligence post-processing
      result = await this.applyFormatSpecificIntelligence(result, extension);

      return result;
    } catch (error) {
      console.error(`Error parsing ${extension} file:`, error);
      throw error instanceof AppError
        ? error
        : new AppError(
            `Failed to parse ${extension} file: ${(error as Error).message}`,
            500
          );
    }
  }

  /**
   * Apply format-specific intelligence enhancements
   * Phase 4.2: Format-Specific Intelligence
   */
  private static async applyFormatSpecificIntelligence(
    data: ParsedMenuData,
    extension: string
  ): Promise<ParsedMenuData> {
    const warnings: string[] = data.metadata?.warnings || [];

    // Apply validation and intelligence based on source format
    switch (extension) {
      case ".xlsx":
      case ".xls":
        return this.applyExcelIntelligence(data, warnings);
      case ".csv":
        return this.applyCSVIntelligence(data, warnings);
      case ".json":
        return this.applyJSONIntelligence(data, warnings);
      case ".docx":
        return this.applyWordIntelligence(data, warnings);
      default:
        return data;
    }
  }

  /**
   * Parse PDF files (delegated to existing AI processing)
   */
  private static async parsePDF(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    // This method will be implemented to interface with existing PDF processing
    // For now, we'll throw an error indicating PDF should use the existing pipeline
    throw new AppError(
      "PDF parsing should use the existing AI pipeline via MenuService.getMenuUploadPreview()",
      500
    );
  }

  /**
   * Parse Excel files (.xlsx, .xls)
   */
  private static async parseExcel(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON with header row recognition
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][];

      if (rawData.length === 0) {
        throw new AppError("Excel file is empty or has no data", 400);
      }

      // Get headers from first row
      const headers = this.normalizeHeaders(rawData[0] as string[]);
      const columnMap = this.createColumnMapping(headers);

      // Validate that we have at least a name column
      if (columnMap.name === undefined) {
        throw new AppError(
          "Excel file must have a 'name' or 'item' column for menu items",
          400
        );
      }

      const items: RawMenuItem[] = [];
      const warnings: string[] = [];

      // Process data rows (skip header)
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        if (this.isValidRow(row, columnMap)) {
          try {
            const item = this.mapRowToMenuItem(row, columnMap);
            if (item) items.push(item);
          } catch (error) {
            warnings.push(`Row ${i + 1}: ${(error as Error).message}`);
          }
        }
      }

      return {
        menuName: this.extractMenuName(originalFileName, sheetName),
        items,
        sourceFormat: "excel",
        metadata: {
          worksheetName: sheetName,
          headers,
          totalRows: rawData.length - 1,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to parse Excel file: ${(error as Error).message}`,
        400
      );
    }
  }

  /**
   * Parse CSV files
   */
  private static async parseCSV(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    return new Promise((resolve, reject) => {
      const items: RawMenuItem[] = [];
      let headers: string[] = [];
      const warnings: string[] = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(
          csv({
            mapHeaders: ({ header }) =>
              header
                .toLowerCase()
                .trim()
                .replace(/^["']|["']$/g, ""),
          })
        )
        .on("headers", (headerList) => {
          headers = headerList;
          console.log(
            `[FileParserService.parseCSV] Headers detected:`,
            headers
          );
        })
        .on("data", (row) => {
          rowCount++;
          console.log(
            `[FileParserService.parseCSV] Processing row ${rowCount}:`,
            row
          );
          try {
            // Check if row is empty first
            if (this.isEmptyCSVRow(row)) {
              console.log(
                `[FileParserService.parseCSV] Skipping empty row ${rowCount}`
              );
              return;
            }

            const item = this.mapCSVRowToMenuItem(row);
            if (item) {
              console.log(
                `[FileParserService.parseCSV] Successfully mapped row ${rowCount} to item:`,
                item.name
              );
              items.push(item);
            } else {
              console.log(
                `[FileParserService.parseCSV] Row ${rowCount} did not map to an item`
              );
            }
          } catch (error) {
            console.error(
              `[FileParserService.parseCSV] Error processing row ${rowCount}:`,
              error
            );
            warnings.push(`Row ${rowCount}: ${(error as Error).message}`);
          }
        })
        .on("end", () => {
          console.log(
            `[FileParserService.parseCSV] Parsing complete. Total rows: ${rowCount}, Items found: ${items.length}, Warnings: ${warnings.length}`
          );
          if (warnings.length > 0) {
            console.log(`[FileParserService.parseCSV] Warnings:`, warnings);
          }

          resolve({
            menuName: this.extractMenuName(originalFileName),
            items,
            sourceFormat: "csv",
            metadata: {
              headers,
              totalRows: rowCount,
              warnings: warnings.length > 0 ? warnings : undefined,
            },
          });
        })
        .on("error", (error) => {
          reject(
            new AppError(
              `Failed to parse CSV file: ${(error as Error).message}`,
              400
            )
          );
        });
    });
  }

  /**
   * Parse JSON files
   */
  private static async parseJSON(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    try {
      const jsonContent = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(jsonContent);

      // Support multiple JSON structures
      let menuData: any;
      let menuName: string;

      if (data.menu) {
        menuData = data.menu;
        menuName =
          menuData.name ||
          menuData.menuName ||
          this.extractMenuName(originalFileName);
      } else if (data.items || Array.isArray(data)) {
        menuData = { items: data.items || data };
        menuName =
          data.name || data.menuName || this.extractMenuName(originalFileName);
      } else {
        menuData = data;
        menuName =
          data.name || data.menuName || this.extractMenuName(originalFileName);
      }

      const items: RawMenuItem[] = [];
      const menuItems = menuData.items || menuData.menuItems || [];
      const warnings: string[] = [];

      if (!Array.isArray(menuItems)) {
        throw new AppError(
          "JSON file must contain an array of menu items",
          400
        );
      }

      menuItems.forEach((item: any, index: number) => {
        try {
          const mappedItem = this.mapJSONToMenuItem(item);
          if (mappedItem) items.push(mappedItem);
        } catch (error) {
          warnings.push(`Item ${index + 1}: ${(error as Error).message}`);
        }
      });

      return {
        menuName,
        items,
        sourceFormat: "json",
        metadata: {
          totalRows: menuItems.length,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof SyntaxError) {
        throw new AppError("Invalid JSON format", 400);
      }
      throw new AppError(
        `Failed to parse JSON file: ${(error as Error).message}`,
        400
      );
    }
  }

  /**
   * Parse Word documents (.docx)
   */
  private static async parseWord(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;

      if (!text.trim()) {
        throw new AppError(
          "Word document is empty or contains no readable text",
          400
        );
      }

      // Parse the text content to extract menu items
      const items = this.parseWordTextContent(text);

      return {
        menuName: this.extractMenuName(originalFileName),
        items,
        sourceFormat: "word",
        metadata: {
          totalRows: items.length,
          warnings:
            result.messages.length > 0
              ? result.messages.map((msg) => msg.message)
              : undefined,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to parse Word document: ${(error as Error).message}`,
        400
      );
    }
  }

  /**
   * Helper Methods
   */

  /**
   * Normalize headers for consistent column mapping
   */
  private static normalizeHeaders(headers: string[]): string[] {
    return headers.map((header) =>
      (header || "").toString().toLowerCase().trim().replace(/\s+/g, "_")
    );
  }

  /**
   * Create column mapping from headers with enhanced Excel-specific mapping
   */
  private static createColumnMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    headers.forEach((header, index) => {
      const normalized = header
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w]/g, "");

      // Enhanced column mapping with more variations

      // Name variations (most important field)
      if (
        [
          "name",
          "item",
          "item_name",
          "dish",
          "dish_name",
          "menu_item",
          "product",
          "food_item",
        ].includes(normalized)
      ) {
        mapping.name = index;
      }

      // Price variations (including currency symbols)
      else if (
        [
          "price",
          "cost",
          "amount",
          "$",
          "usd",
          "eur",
          "gbp",
          "dollars",
          "euro",
        ].includes(normalized)
      ) {
        mapping.price = index;
      }

      // Category/Section variations
      else if (
        [
          "category",
          "section",
          "type",
          "menu_section",
          "course",
          "group",
          "classification",
        ].includes(normalized)
      ) {
        mapping.category = index;
      }

      // Description variations
      else if (
        [
          "description",
          "desc",
          "details",
          "info",
          "information",
          "about",
        ].includes(normalized)
      ) {
        mapping.description = index;
      }

      // Ingredients variations
      else if (
        [
          "ingredients",
          "ingredient_list",
          "contains",
          "made_with",
          "includes",
          "components",
        ].includes(normalized)
      ) {
        mapping.ingredients = index;
      }

      // Allergen variations
      else if (
        [
          "allergens",
          "allergen_info",
          "allergies",
          "allergen_warning",
          "contains_allergens",
          "allergy_info",
        ].includes(normalized)
      ) {
        mapping.allergens = index;
      }

      // Item type variations
      else if (
        [
          "item_type",
          "type",
          "kind",
          "food_type",
          "product_type",
          "menu_type",
        ].includes(normalized)
      ) {
        mapping.itemType = index;
      }

      // Dietary flags - Vegan
      else if (
        ["vegan", "is_vegan", "v", "vegan_friendly", "plant_based"].includes(
          normalized
        )
      ) {
        mapping.isVegan = index;
      }

      // Dietary flags - Vegetarian
      else if (
        [
          "vegetarian",
          "is_vegetarian",
          "veg",
          "vegetarian_friendly",
          "veggie",
        ].includes(normalized)
      ) {
        mapping.isVegetarian = index;
      }

      // Dietary flags - Gluten Free
      else if (
        [
          "gluten_free",
          "is_gluten_free",
          "glutenfree",
          "gf",
          "gluten_friendly",
          "no_gluten",
        ].includes(normalized)
      ) {
        mapping.isGlutenFree = index;
      }

      // Dietary flags - Dairy Free
      else if (
        [
          "dairy_free",
          "is_dairy_free",
          "dairyfree",
          "df",
          "lactose_free",
          "no_dairy",
        ].includes(normalized)
      ) {
        mapping.isDairyFree = index;
      }

      // Wine-specific fields - Style
      else if (
        [
          "wine_style",
          "style",
          "wine_type",
          "type_of_wine",
          "classification",
        ].includes(normalized)
      ) {
        mapping.wineStyle = index;
      }

      // Wine-specific fields - Grape Variety
      else if (
        [
          "grape_variety",
          "grape",
          "varietal",
          "grapes",
          "varieties",
          "grape_type",
          "wine_grape",
        ].includes(normalized)
      ) {
        mapping.grapeVariety = index;
      }

      // Wine-specific fields - Vintage
      else if (
        ["vintage", "year", "harvest_year", "wine_year"].includes(normalized)
      ) {
        mapping.vintage = index;
      }

      // Wine-specific fields - Region
      else if (
        [
          "region",
          "appellation",
          "area",
          "origin",
          "wine_region",
          "location",
          "terroir",
        ].includes(normalized)
      ) {
        mapping.region = index;
      }

      // Wine-specific fields - Producer
      else if (
        [
          "producer",
          "winery",
          "maker",
          "brand",
          "estate",
          "vineyard",
          "chateau",
          "domaine",
        ].includes(normalized)
      ) {
        mapping.producer = index;
      }

      // Serving options
      else if (
        [
          "serving_options",
          "sizes",
          "options",
          "portions",
          "servings",
          "size_options",
        ].includes(normalized)
      ) {
        mapping.servingOptions = index;
      }

      // Food pairings
      else if (
        [
          "pairings",
          "pairs_with",
          "food_pairings",
          "goes_with",
          "matches",
          "complements",
        ].includes(normalized)
      ) {
        mapping.pairings = index;
      }
    });

    return mapping;
  }

  /**
   * Check if a row has valid data
   */
  private static isValidRow(row: any[], columnMap: ColumnMapping): boolean {
    // Must have a name to be valid
    const nameIndex = columnMap.name;
    return (
      nameIndex !== undefined &&
      row[nameIndex] !== undefined &&
      row[nameIndex] !== null &&
      String(row[nameIndex]).trim() !== ""
    );
  }

  /**
   * Map Excel row to menu item
   */
  private static mapRowToMenuItem(
    row: any[],
    columnMap: ColumnMapping
  ): RawMenuItem | null {
    try {
      const name = String(row[columnMap.name!]).trim();
      if (!name) return null;

      const item: RawMenuItem = { name };

      // Map optional fields
      if (columnMap.description !== undefined && row[columnMap.description]) {
        item.description = String(row[columnMap.description]).trim();
      }

      if (columnMap.price !== undefined && row[columnMap.price]) {
        const priceValue = this.parsePrice(row[columnMap.price]);
        if (priceValue !== null) item.price = priceValue;
      }

      if (columnMap.category !== undefined && row[columnMap.category]) {
        item.category = String(row[columnMap.category]).trim();
      }

      // Parse array fields (ingredients, allergens, etc.)
      if (columnMap.ingredients !== undefined && row[columnMap.ingredients]) {
        item.ingredients = this.parseArrayField(row[columnMap.ingredients]);
      }

      if (columnMap.allergens !== undefined && row[columnMap.allergens]) {
        item.allergens = this.parseArrayField(row[columnMap.allergens]);
      }

      if (columnMap.grapeVariety !== undefined && row[columnMap.grapeVariety]) {
        item.grapeVariety = this.parseArrayField(row[columnMap.grapeVariety]);
      }

      // Parse boolean fields
      if (columnMap.isVegan !== undefined) {
        item.isVegan = this.parseBoolean(row[columnMap.isVegan]);
      }

      if (columnMap.isVegetarian !== undefined) {
        item.isVegetarian = this.parseBoolean(row[columnMap.isVegetarian]);
      }

      if (columnMap.isGlutenFree !== undefined) {
        item.isGlutenFree = this.parseBoolean(row[columnMap.isGlutenFree]);
      }

      if (columnMap.isDairyFree !== undefined) {
        item.isDairyFree = this.parseBoolean(row[columnMap.isDairyFree]);
      }

      // Parse other wine fields
      if (columnMap.wineStyle !== undefined && row[columnMap.wineStyle]) {
        item.wineStyle = String(row[columnMap.wineStyle]).trim();
      }

      if (columnMap.vintage !== undefined && row[columnMap.vintage]) {
        const vintage = this.parseNumber(row[columnMap.vintage]);
        if (vintage !== null) item.vintage = vintage;
      }

      if (columnMap.region !== undefined && row[columnMap.region]) {
        item.region = String(row[columnMap.region]).trim();
      }

      if (columnMap.producer !== undefined && row[columnMap.producer]) {
        item.producer = String(row[columnMap.producer]).trim();
      }

      if (columnMap.itemType !== undefined && row[columnMap.itemType]) {
        const itemType = String(row[columnMap.itemType]).toLowerCase().trim();
        if (["food", "beverage", "wine"].includes(itemType)) {
          item.itemType = itemType as "food" | "beverage" | "wine";
        }
      }

      return item;
    } catch (error) {
      throw new Error(`Failed to parse row: ${(error as Error).message}`);
    }
  }

  /**
   * Map CSV row to menu item
   */
  private static mapCSVRowToMenuItem(
    row: Record<string, string>
  ): RawMenuItem | null {
    try {
      // Find name field - try multiple variations
      const name =
        row.name || row.item || row.dish || row.item_name || row.dish_name;
      if (!name || !name.trim()) return null;

      const item: RawMenuItem = { name: name.trim() };

      // Map fields directly from CSV keys
      if (row.description) item.description = row.description.trim();
      if (row.category) item.category = row.category.trim();

      const price = this.parsePrice(row.price);
      if (price !== null) item.price = price;

      // Parse array fields
      if (row.ingredients)
        item.ingredients = this.parseArrayField(row.ingredients);
      if (row.allergens) item.allergens = this.parseArrayField(row.allergens);
      if (row.grape_variety || row.grapes) {
        item.grapeVariety = this.parseArrayField(
          row.grape_variety || row.grapes
        );
      }

      // Parse boolean fields
      item.isVegan = this.parseBoolean(row.vegan || row.is_vegan);
      item.isVegetarian = this.parseBoolean(
        row.vegetarian || row.is_vegetarian
      );
      item.isGlutenFree = this.parseBoolean(
        row.gluten_free || row.is_gluten_free
      );
      item.isDairyFree = this.parseBoolean(row.dairy_free || row.is_dairy_free);

      // Wine fields
      if (row.wine_style || row.style)
        item.wineStyle = (row.wine_style || row.style).trim();
      if (row.region) item.region = row.region.trim();
      if (row.producer || row.winery)
        item.producer = (row.producer || row.winery).trim();

      const vintage = this.parseNumber(row.vintage || row.year);
      if (vintage !== null) item.vintage = vintage;

      // Item type
      if (row.item_type || row.type) {
        const itemType = (row.item_type || row.type).toLowerCase().trim();
        if (["food", "beverage", "wine"].includes(itemType)) {
          item.itemType = itemType as "food" | "beverage" | "wine";
        }
      }

      return item;
    } catch (error) {
      throw new Error(`Failed to parse CSV row: ${(error as Error).message}`);
    }
  }

  /**
   * Map JSON object to menu item
   */
  private static mapJSONToMenuItem(item: any): RawMenuItem | null {
    try {
      if (!item.name && !item.itemName) return null;

      const menuItem: RawMenuItem = {
        name: (item.name || item.itemName).trim(),
      };

      // Direct field mapping
      if (item.description)
        menuItem.description = String(item.description).trim();
      if (item.category) menuItem.category = String(item.category).trim();
      if (item.price !== undefined) {
        const price = this.parsePrice(item.price);
        if (price !== null) menuItem.price = price;
      }

      // Array fields
      if (item.ingredients) {
        menuItem.ingredients = Array.isArray(item.ingredients)
          ? item.ingredients
              .map((ing: any) => String(ing).trim())
              .filter(Boolean)
          : this.parseArrayField(item.ingredients);
      }

      if (item.allergens) {
        menuItem.allergens = Array.isArray(item.allergens)
          ? item.allergens.map((all: any) => String(all).trim()).filter(Boolean)
          : this.parseArrayField(item.allergens);
      }

      // Boolean fields
      if (item.isVegan !== undefined) menuItem.isVegan = Boolean(item.isVegan);
      if (item.isVegetarian !== undefined)
        menuItem.isVegetarian = Boolean(item.isVegetarian);
      if (item.isGlutenFree !== undefined)
        menuItem.isGlutenFree = Boolean(item.isGlutenFree);
      if (item.isDairyFree !== undefined)
        menuItem.isDairyFree = Boolean(item.isDairyFree);

      // Wine fields
      if (item.wineStyle) menuItem.wineStyle = String(item.wineStyle).trim();
      if (item.region) menuItem.region = String(item.region).trim();
      if (item.producer) menuItem.producer = String(item.producer).trim();
      if (item.vintage !== undefined) {
        const vintage = this.parseNumber(item.vintage);
        if (vintage !== null) menuItem.vintage = vintage;
      }

      if (item.grapeVariety) {
        menuItem.grapeVariety = Array.isArray(item.grapeVariety)
          ? item.grapeVariety
              .map((grape: any) => String(grape).trim())
              .filter(Boolean)
          : this.parseArrayField(item.grapeVariety);
      }

      // Item type
      if (
        item.itemType &&
        ["food", "beverage", "wine"].includes(
          String(item.itemType).toLowerCase()
        )
      ) {
        menuItem.itemType = String(item.itemType).toLowerCase() as
          | "food"
          | "beverage"
          | "wine";
      }

      return menuItem;
    } catch (error) {
      throw new Error(`Failed to parse JSON item: ${(error as Error).message}`);
    }
  }

  /**
   * Parse Word document text content
   */
  private static parseWordTextContent(text: string): RawMenuItem[] {
    const items: RawMenuItem[] = [];
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let currentCategory = "";
    let currentItem: Partial<RawMenuItem> | null = null;

    for (const line of lines) {
      // Check if line is a section header
      if (this.isWordSectionHeader(line)) {
        currentCategory = this.extractWordSectionName(line);
        continue;
      }

      // Check if line is a menu item with price
      const itemMatch = this.parseWordMenuItem(line);
      if (itemMatch) {
        // Save previous item if exists
        if (currentItem && currentItem.name) {
          items.push(currentItem as RawMenuItem);
        }

        // Start new item
        currentItem = {
          name: itemMatch.name,
          price: itemMatch.price,
          category: currentCategory || "Menu Items",
        };

        // If there's a description on the same line
        if (itemMatch.description) {
          currentItem.description = itemMatch.description;
        }
        continue;
      }

      // Check if line contains additional item information
      if (currentItem) {
        const additionalInfo = this.parseWordAdditionalInfo(line);
        if (additionalInfo.ingredients) {
          currentItem.ingredients = additionalInfo.ingredients;
        }
        if (additionalInfo.allergens) {
          currentItem.allergens = additionalInfo.allergens;
        }
        if (additionalInfo.dietary) {
          Object.assign(currentItem, additionalInfo.dietary);
        }
        if (additionalInfo.wine) {
          Object.assign(currentItem, additionalInfo.wine);
        }
        if (additionalInfo.description && !currentItem.description) {
          currentItem.description = additionalInfo.description;
        }
      }
    }

    // Add final item if exists
    if (currentItem && currentItem.name) {
      items.push(currentItem as RawMenuItem);
    }

    return items;
  }

  // Word parsing helper methods
  private static isWordSectionHeader(line: string): boolean {
    // Look for section indicators
    return (
      /^={2,}/.test(line) ||
      /^-{2,}/.test(line) ||
      /^\*{2,}/.test(line) ||
      /^[A-Z\s]{3,}$/.test(line) ||
      /(appetizer|entree|main|dessert|wine|beverage|drink)/i.test(line)
    );
  }

  private static extractWordSectionName(line: string): string {
    return line.replace(/[=\-*]/g, "").trim();
  }

  private static parseWordMenuItem(
    line: string
  ): { name: string; price?: number; description?: string } | null {
    // Pattern: "Item Name - $12.99" or "Item Name ($12.99)" or "Item Name | $12.99"
    const pricePatterns = [
      /^(.+?)\s*[-–—]\s*\$?(\d+\.?\d*)\s*(.*)$/,
      /^(.+?)\s*\(\s*\$?(\d+\.?\d*)\s*\)\s*(.*)$/,
      /^(.+?)\s*[|]\s*\$?(\d+\.?\d*)\s*(.*)$/,
      /^(.+?)\s*\$(\d+\.?\d*)\s*(.*)$/,
    ];

    for (const pattern of pricePatterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          name: match[1].trim(),
          price: parseFloat(match[2]),
          description: match[3]?.trim() || undefined,
        };
      }
    }

    return null;
  }

  private static parseWordAdditionalInfo(line: string): {
    ingredients?: string[];
    allergens?: string[];
    dietary?: Partial<RawMenuItem>;
    wine?: Partial<RawMenuItem>;
    description?: string;
  } {
    const result: any = {};

    // Parse ingredients
    const ingredientMatch = line.match(/ingredients?:\s*(.+?)(?:\||$)/i);
    if (ingredientMatch) {
      result.ingredients = this.parseArrayField(ingredientMatch[1]);
    }

    // Parse allergens
    const allergenMatch = line.match(/allergens?:\s*(.+?)(?:\||$)/i);
    if (allergenMatch) {
      result.allergens = this.parseArrayField(allergenMatch[1]);
    }

    // Parse dietary information
    if (/vegan:\s*yes/i.test(line))
      result.dietary = { ...result.dietary, isVegan: true };
    if (/vegetarian:\s*yes/i.test(line))
      result.dietary = { ...result.dietary, isVegetarian: true };
    if (/gluten[- ]free:\s*yes/i.test(line))
      result.dietary = { ...result.dietary, isGlutenFree: true };

    // Parse wine information
    const producerMatch = line.match(/producer:\s*(.+?)(?:\||$)/i);
    if (producerMatch)
      result.wine = { ...result.wine, producer: producerMatch[1].trim() };

    const vintageMatch = line.match(/vintage:\s*(\d{4})/i);
    if (vintageMatch)
      result.wine = { ...result.wine, vintage: parseInt(vintageMatch[1]) };

    const regionMatch = line.match(/region:\s*(.+?)(?:\||$)/i);
    if (regionMatch)
      result.wine = { ...result.wine, region: regionMatch[1].trim() };

    const grapeMatch = line.match(/grape\s*variety:\s*(.+?)(?:\||$)/i);
    if (grapeMatch)
      result.wine = {
        ...result.wine,
        grapeVariety: this.parseArrayField(grapeMatch[1]),
      };

    // If no specific info found, treat as description
    if (
      !result.ingredients &&
      !result.allergens &&
      !result.dietary &&
      !result.wine
    ) {
      if (line.length > 10 && !line.includes(":")) {
        result.description = line;
      }
    }

    return result;
  }

  /**
   * Extract menu name from filename
   */
  private static extractMenuName(fileName: string, sheetName?: string): string {
    const baseName = path.basename(fileName, path.extname(fileName));

    if (sheetName && sheetName !== "Sheet1" && sheetName !== "Worksheet") {
      return `${baseName} - ${sheetName}`;
    }

    return baseName
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Parse price from various formats with enhanced Excel support
   */
  private static parsePrice(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;

    // Handle numeric values directly (Excel often stores as numbers)
    if (typeof value === "number" && !isNaN(value)) {
      return Math.round(value * 100) / 100;
    }

    // Convert to string and clean
    const strValue = String(value).trim();

    // Handle various currency formats
    // $12.99, €12,99, £12.99, 12.99$, 12,99 EUR, etc.
    const cleanValue = strValue
      .replace(/[$£€¥₹₽¢]/g, "") // Remove currency symbols
      .replace(/[^\d.,\-]/g, "") // Keep only digits, decimals, commas, and minus
      .replace(/,(\d{3})/g, "$1") // Remove thousands separators (1,234 -> 1234)
      .replace(/,(\d{1,2})$/, ".$1"); // Convert European decimal comma (12,99 -> 12.99)

    // Handle negative values
    const isNegative = strValue.includes("-") || strValue.includes("(");

    const numValue = parseFloat(cleanValue);

    if (isNaN(numValue)) return null;

    const result = Math.round(numValue * 100) / 100;
    return isNegative ? -result : result;
  }

  /**
   * Parse array field from string or array
   */
  private static parseArrayField(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Parse boolean from various formats
   */
  private static parseBoolean(value: any): boolean | undefined {
    if (value === null || value === undefined || value === "") return undefined;

    const strValue = String(value).toLowerCase().trim();

    if (["true", "yes", "1", "y", "on"].includes(strValue)) return true;
    if (["false", "no", "0", "n", "off"].includes(strValue)) return false;

    return undefined;
  }

  /**
   * Parse number from various formats
   */
  private static parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;

    const numValue = Number(value);
    return isNaN(numValue) ? null : numValue;
  }

  /**
   * Detect CSV delimiter and encoding
   */
  private static detectCSVOptions(filePath: string): {
    delimiter: string;
    encoding: BufferEncoding;
  } {
    try {
      // Read first few lines to detect delimiter
      const sample = fs
        .readFileSync(filePath, { encoding: "utf8" })
        .substring(0, 1000);

      // Count occurrences of potential delimiters
      const delimiters = [",", ";", "\t", "|"];
      const counts = delimiters.map((delimiter) => ({
        delimiter,
        count: (sample.match(new RegExp(`\\${delimiter}`, "g")) || []).length,
      }));

      // Choose delimiter with highest count
      const bestDelimiter = counts.reduce((prev, current) =>
        current.count > prev.count ? current : prev
      );

      // Simple encoding detection - check for BOM or non-ASCII chars
      const buffer = fs.readFileSync(filePath);
      let encoding: BufferEncoding = "utf8";

      // Check for UTF-8 BOM
      if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        encoding = "utf8";
      }
      // Check for extended ASCII characters (might indicate latin1)
      else if (buffer.some((byte) => byte > 127 && byte < 160)) {
        encoding = "latin1";
      }

      return {
        delimiter: bestDelimiter.delimiter,
        encoding,
      };
    } catch (error) {
      // Default fallback
      return { delimiter: ",", encoding: "utf8" };
    }
  }

  /**
   * Check if CSV has valid headers
   */
  private static hasValidCSVHeaders(headers: string[]): boolean {
    const nameFields = [
      "name",
      "item",
      "dish",
      "item_name",
      "dish_name",
      "menu_item",
    ];
    return headers.some((header) =>
      nameFields.includes(header.toLowerCase().replace(/\s+/g, "_"))
    );
  }

  /**
   * Check if CSV row is empty
   */
  private static isEmptyCSVRow(row: Record<string, string>): boolean {
    return Object.values(row).every((value) => !value || value.trim() === "");
  }

  // ========== PHASE 4.2: FORMAT-SPECIFIC INTELLIGENCE METHODS ==========

  /**
   * Parse Excel with enhanced intelligence
   * Phase 4.2: Excel Intelligence
   */
  private static async parseExcelWithIntelligence(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    // Use existing Excel parser as base
    const result = await this.parseExcel(filePath, originalFileName);

    // Apply Excel-specific enhancements
    console.log(
      `[FileParserService] Applying Excel intelligence to ${result.items.length} items`
    );

    return result;
  }

  /**
   * Parse CSV with enhanced intelligence
   * Phase 4.2: CSV Intelligence
   */
  private static async parseCSVWithIntelligence(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    // Use existing CSV parser as base
    const result = await this.parseCSV(filePath, originalFileName);

    // Apply CSV-specific enhancements
    console.log(
      `[FileParserService] Applying CSV intelligence to ${result.items.length} items`
    );

    return result;
  }

  /**
   * Parse JSON with enhanced intelligence
   * Phase 4.2: JSON Intelligence
   */
  private static async parseJSONWithIntelligence(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    // Use existing JSON parser as base
    const result = await this.parseJSON(filePath, originalFileName);

    // Apply JSON-specific enhancements
    console.log(
      `[FileParserService] Applying JSON intelligence to ${result.items.length} items`
    );

    return result;
  }

  /**
   * Parse Word with enhanced intelligence
   * Phase 4.2: Word Intelligence
   */
  private static async parseWordWithIntelligence(
    filePath: string,
    originalFileName: string
  ): Promise<ParsedMenuData> {
    // Use existing Word parser as base
    const result = await this.parseWord(filePath, originalFileName);

    // Apply Word-specific enhancements
    console.log(
      `[FileParserService] Applying Word intelligence to ${result.items.length} items`
    );

    return result;
  }

  /**
   * Apply Excel-specific intelligence enhancements
   * Phase 4.2: Excel Intelligence
   */
  private static applyExcelIntelligence(
    data: ParsedMenuData,
    warnings: string[]
  ): ParsedMenuData {
    console.log(`[FileParserService] Applying Excel intelligence enhancements`);

    // Validate data types against columns
    data.items = data.items.map((item) => {
      // Price validation for Excel (often contains formulas or formatting)
      if (item.price !== undefined && item.price !== null) {
        if (item.price < 0) {
          warnings.push(
            `Invalid negative price for "${item.name}": ${item.price}`
          );
          item.price = Math.abs(item.price);
        }
        if (item.price > 10000) {
          warnings.push(
            `Unusually high price for "${item.name}": ${item.price} (possible formatting error)`
          );
        }
      }

      // Validate wine data consistency for Excel
      if (item.itemType === "wine") {
        this.validateWineDataConsistency(item, warnings);
      }

      // Clean up Excel formatting artifacts
      if (item.name) {
        item.name = item.name.replace(/[\r\n\t]/g, " ").trim();
      }
      if (item.description) {
        item.description = item.description.replace(/[\r\n\t]/g, " ").trim();
      }

      return item;
    });

    // Update metadata with intelligence warnings
    if (!data.metadata) data.metadata = {};
    data.metadata.warnings = [...(data.metadata.warnings || []), ...warnings];

    return data;
  }

  /**
   * Apply CSV-specific intelligence enhancements
   * Phase 4.2: CSV Intelligence
   */
  private static applyCSVIntelligence(
    data: ParsedMenuData,
    warnings: string[]
  ): ParsedMenuData {
    console.log(`[FileParserService] Applying CSV intelligence enhancements`);

    // Handle encoding issues gracefully
    data.items = data.items.map((item) => {
      // Fix common encoding issues in CSV
      if (item.name) {
        item.name = this.fixEncodingIssues(item.name);
      }
      if (item.description) {
        item.description = this.fixEncodingIssues(item.description);
      }
      if (item.ingredients) {
        item.ingredients = item.ingredients.map((ing) =>
          this.fixEncodingIssues(ing)
        );
      }

      // Clean CSV artifacts (quotes, escaped characters)
      if (item.name) {
        item.name = item.name.replace(/^["']|["']$/g, "").trim();
      }

      return item;
    });

    // Update metadata
    if (!data.metadata) data.metadata = {};
    data.metadata.warnings = [...(data.metadata.warnings || []), ...warnings];

    return data;
  }

  /**
   * Apply JSON-specific intelligence enhancements
   * Phase 4.2: JSON Intelligence
   */
  private static applyJSONIntelligence(
    data: ParsedMenuData,
    warnings: string[]
  ): ParsedMenuData {
    console.log(`[FileParserService] Applying JSON intelligence enhancements`);

    // Schema validation against menu structure
    let schemaValid = true;

    data.items.forEach((item, index) => {
      // Validate required fields exist
      if (!item.name || item.name.trim() === "") {
        warnings.push(`Item ${index + 1}: Missing required "name" field`);
        schemaValid = false;
      }

      // Validate data types
      if (
        item.price !== undefined &&
        item.price !== null &&
        typeof item.price !== "number"
      ) {
        warnings.push(
          `Item ${
            index + 1
          }: Price should be a number, got ${typeof item.price}`
        );
      }

      // Validate arrays
      if (item.ingredients && !Array.isArray(item.ingredients)) {
        warnings.push(`Item ${index + 1}: Ingredients should be an array`);
        // Try to convert to array
        if (typeof item.ingredients === "string") {
          item.ingredients = this.parseArrayField(item.ingredients);
        }
      }

      // Validate wine-specific fields for JSON structure
      if (item.itemType === "wine") {
        this.validateJSONWineStructure(item, warnings, index + 1);
      }
    });

    // Update metadata
    if (!data.metadata) data.metadata = {};
    data.metadata.warnings = [...(data.metadata.warnings || []), ...warnings];
    data.metadata.schemaValid = schemaValid;

    return data;
  }

  /**
   * Apply Word-specific intelligence enhancements
   * Phase 4.2: Word Intelligence
   */
  private static applyWordIntelligence(
    data: ParsedMenuData,
    warnings: string[]
  ): ParsedMenuData {
    console.log(`[FileParserService] Applying Word intelligence enhancements`);

    // Document structure recognition and enhancement
    const categories = new Set<string>();

    data.items = data.items.map((item) => {
      // Track categories for structure analysis
      if (item.category) {
        categories.add(item.category);
      }

      // Enhanced price pattern recognition for Word documents
      if (!item.price && item.description) {
        const priceFromDescription = this.extractPriceFromWordText(
          item.description
        );
        if (priceFromDescription) {
          item.price = priceFromDescription;
          // Remove price from description to avoid duplication
          item.description = item.description
            .replace(/\$\d+\.?\d*/g, "")
            .trim();
        }
      }

      // Smart section header detection and categorization
      if (!item.category || item.category === "Uncategorized") {
        item.category = this.inferCategoryFromWordContext(item.name);
      }

      // Handle multi-column layouts by cleaning up formatting artifacts
      if (item.name) {
        item.name = item.name.replace(/\s{2,}/g, " ").trim();
      }

      return item;
    });

    // Add structure analysis to metadata
    if (!data.metadata) data.metadata = {};
    data.metadata.warnings = [...(data.metadata.warnings || []), ...warnings];
    data.metadata.documentStructure = {
      categories: Array.from(categories),
      hasTableStructure: data.items.some((item) => item.price !== undefined),
      hasFormattedSections: categories.size > 1,
    };

    return data;
  }

  // ========== HELPER METHODS FOR FORMAT-SPECIFIC INTELLIGENCE ==========

  /**
   * Validate wine data consistency
   */
  private static validateWineDataConsistency(
    item: RawMenuItem,
    warnings: string[]
  ): void {
    if (item.itemType !== "wine") return;

    // Check vintage validity
    if (item.vintage !== undefined) {
      const currentYear = new Date().getFullYear();
      if (item.vintage < 1800 || item.vintage > currentYear + 2) {
        warnings.push(`Invalid vintage for "${item.name}": ${item.vintage}`);
      }
    }

    // Check wine style consistency
    if (
      item.wineStyle &&
      ![
        "still",
        "sparkling",
        "champagne",
        "dessert",
        "fortified",
        "other",
      ].includes(item.wineStyle)
    ) {
      warnings.push(`Invalid wine style for "${item.name}": ${item.wineStyle}`);
    }

    // Validate grape varieties format
    if (item.grapeVariety && Array.isArray(item.grapeVariety)) {
      item.grapeVariety = item.grapeVariety.filter(
        (grape) => grape && typeof grape === "string" && grape.trim().length > 0
      );
    }
  }

  /**
   * Fix common encoding issues in text
   */
  private static fixEncodingIssues(text: string): string {
    if (!text) return text;

    return text
      .replace(/Ã¡/g, "á")
      .replace(/Ã©/g, "é")
      .replace(/Ã­/g, "í")
      .replace(/Ã³/g, "ó")
      .replace(/Ãº/g, "ú")
      .replace(/Ã±/g, "ñ")
      .replace(/Ã¢/g, "â")
      .replace(/Ã§/g, "ç")
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¦/g, "...")
      .trim();
  }

  /**
   * Validate JSON wine structure
   */
  private static validateJSONWineStructure(
    item: RawMenuItem,
    warnings: string[],
    index: number
  ): void {
    if (item.grapeVariety && !Array.isArray(item.grapeVariety)) {
      warnings.push(`Item ${index}: Wine grape varieties should be an array`);
      // Try to convert
      if (typeof item.grapeVariety === "string") {
        item.grapeVariety = this.parseArrayField(item.grapeVariety);
      }
    }

    if (item.servingOptions && !Array.isArray(item.servingOptions)) {
      warnings.push(`Item ${index}: Wine serving options should be an array`);
    }
  }

  /**
   * Extract price from Word document text
   */
  private static extractPriceFromWordText(text: string): number | null {
    const pricePattern = /\$(\d+\.?\d*)/;
    const match = text.match(pricePattern);

    if (match) {
      const price = parseFloat(match[1]);
      return isNaN(price) ? null : price;
    }

    return null;
  }

  /**
   * Infer category from Word document context
   */
  private static inferCategoryFromWordContext(itemName: string): string {
    const name = itemName.toLowerCase();

    // Common menu categories based on item names
    if (
      name.includes("salad") ||
      name.includes("soup") ||
      name.includes("appetizer") ||
      name.includes("starter") ||
      name.includes("bruschetta")
    ) {
      return "Appetizers";
    }

    if (
      name.includes("steak") ||
      name.includes("chicken") ||
      name.includes("fish") ||
      name.includes("pasta") ||
      name.includes("burger") ||
      name.includes("salmon")
    ) {
      return "Main Courses";
    }

    if (
      name.includes("dessert") ||
      name.includes("cake") ||
      name.includes("ice cream") ||
      name.includes("chocolate") ||
      name.includes("tart")
    ) {
      return "Desserts";
    }

    if (
      name.includes("wine") ||
      name.includes("chardonnay") ||
      name.includes("pinot") ||
      name.includes("cabernet") ||
      name.includes("merlot") ||
      name.includes("champagne")
    ) {
      return "Wine";
    }

    if (
      name.includes("beer") ||
      name.includes("cocktail") ||
      name.includes("martini") ||
      name.includes("whiskey") ||
      name.includes("vodka")
    ) {
      return "Beverages";
    }

    return "Uncategorized";
  }

  // ========== PHASE 4.4: COMPREHENSIVE VALIDATION ENHANCEMENT ==========

  /**
   * Validate parsed menu data with comprehensive business rules
   * Phase 4.4: Validation Enhancement
   */
  private static validateParsedData(data: ParsedMenuData): ParsedMenuData {
    const warnings: string[] = data.metadata?.warnings || [];
    const validatedItems: RawMenuItem[] = [];

    console.log(
      `[FileParserService] Validating ${data.items.length} parsed items`
    );

    data.items.forEach((item, index) => {
      const validatedItem = this.validateMenuItem(item, index + 1, warnings);
      if (validatedItem) {
        validatedItems.push(validatedItem);
      }
    });

    // Update metadata with validation results
    if (!data.metadata) data.metadata = {};
    data.metadata.warnings = warnings;
    data.metadata.validationSummary = {
      totalItems: data.items.length,
      validItems: validatedItems.length,
      invalidItems: data.items.length - validatedItems.length,
      warningsCount: warnings.length,
    };

    return {
      ...data,
      items: validatedItems,
    };
  }

  /**
   * Validate individual menu item with business rules
   * Phase 4.4: Item Validation
   */
  private static validateMenuItem(
    item: RawMenuItem,
    itemIndex: number,
    warnings: string[]
  ): RawMenuItem | null {
    let isValid = true;
    const validatedItem: RawMenuItem = { ...item };

    // Required field validation
    if (!item.name || item.name.trim() === "") {
      warnings.push(`Item ${itemIndex}: Name is required`);
      isValid = false;
    } else if (item.name.length > 200) {
      warnings.push(`Item ${itemIndex}: Name too long (max 200 characters)`);
      validatedItem.name = item.name.substring(0, 200);
    }

    // Price validation
    if (item.price !== undefined && item.price !== null) {
      if (typeof item.price !== "number" || isNaN(item.price)) {
        warnings.push(`Item ${itemIndex}: Invalid price format`);
        validatedItem.price = undefined;
      } else if (item.price < 0) {
        warnings.push(`Item ${itemIndex}: Price cannot be negative`);
        validatedItem.price = Math.abs(item.price);
      } else if (item.price > 10000) {
        warnings.push(
          `Item ${itemIndex}: Unusually high price (${item.price})`
        );
      }
    }

    // Category validation
    if (!item.category || item.category.trim() === "") {
      validatedItem.category = "Uncategorized";
    } else if (item.category.length > 100) {
      warnings.push(`Item ${itemIndex}: Category name too long`);
      validatedItem.category = item.category.substring(0, 100);
    }

    // Item type validation
    const validItemTypes = ["food", "beverage", "wine"];
    if (item.itemType && !validItemTypes.includes(item.itemType)) {
      warnings.push(
        `Item ${itemIndex}: Invalid item type "${item.itemType}", defaulting to "food"`
      );
      validatedItem.itemType = "food";
    }

    // Ingredients validation
    if (item.ingredients) {
      if (!Array.isArray(item.ingredients)) {
        warnings.push(`Item ${itemIndex}: Ingredients should be an array`);
        validatedItem.ingredients = [];
      } else {
        validatedItem.ingredients = item.ingredients
          .filter((ing) => ing && ing.trim() !== "")
          .map((ing) => ing.trim())
          .slice(0, 50); // Max 50 ingredients

        if (item.ingredients.length > 50) {
          warnings.push(
            `Item ${itemIndex}: Too many ingredients (max 50), truncated`
          );
        }
      }
    }

    // Allergen validation
    if (item.allergens) {
      if (!Array.isArray(item.allergens)) {
        warnings.push(`Item ${itemIndex}: Allergens should be an array`);
        validatedItem.allergens = [];
      } else {
        const validAllergens = [
          "dairy",
          "gluten",
          "nuts",
          "seafood",
          "eggs",
          "soy",
          "sesame",
          "sulfites",
        ];
        validatedItem.allergens = item.allergens
          .filter((allergen) => validAllergens.includes(allergen.toLowerCase()))
          .map((allergen) => allergen.toLowerCase());

        const invalidAllergens = item.allergens.filter(
          (allergen) => !validAllergens.includes(allergen.toLowerCase())
        );
        if (invalidAllergens.length > 0) {
          warnings.push(
            `Item ${itemIndex}: Unknown allergens: ${invalidAllergens.join(
              ", "
            )}`
          );
        }
      }
    }

    // Wine-specific validation
    if (item.itemType === "wine") {
      this.validateWineFields(validatedItem, itemIndex, warnings);
    }

    // Cross-field validation
    this.performCrossFieldValidation(validatedItem, itemIndex, warnings);

    return isValid ? validatedItem : null;
  }

  /**
   * Validate wine-specific fields
   * Phase 4.4: Wine Field Validation
   */
  private static validateWineFields(
    item: RawMenuItem,
    itemIndex: number,
    warnings: string[]
  ): void {
    // Wine style validation
    const validWineStyles = [
      "still",
      "sparkling",
      "champagne",
      "dessert",
      "fortified",
      "other",
    ];
    if (item.wineStyle && !validWineStyles.includes(item.wineStyle)) {
      warnings.push(
        `Item ${itemIndex}: Invalid wine style "${item.wineStyle}"`
      );
      item.wineStyle = "other";
    }

    // Vintage validation
    if (item.vintage !== undefined && item.vintage !== null) {
      const currentYear = new Date().getFullYear();
      if (
        typeof item.vintage !== "number" ||
        item.vintage < 1800 ||
        item.vintage > currentYear + 5
      ) {
        warnings.push(`Item ${itemIndex}: Invalid vintage "${item.vintage}"`);
        item.vintage = undefined;
      }
    }

    // Grape variety validation
    if (item.grapeVariety) {
      if (!Array.isArray(item.grapeVariety)) {
        warnings.push(`Item ${itemIndex}: Grape varieties should be an array`);
        item.grapeVariety = [];
      } else {
        item.grapeVariety = item.grapeVariety
          .filter((grape) => grape && grape.trim() !== "")
          .map((grape) => grape.trim())
          .slice(0, 10); // Max 10 grape varieties
      }
    }

    // Producer validation
    if (item.producer && item.producer.length > 200) {
      warnings.push(`Item ${itemIndex}: Producer name too long`);
      item.producer = item.producer.substring(0, 200);
    }

    // Region validation
    if (item.region && item.region.length > 100) {
      warnings.push(`Item ${itemIndex}: Region name too long`);
      item.region = item.region.substring(0, 100);
    }

    // Serving options validation
    if (item.servingOptions) {
      if (!Array.isArray(item.servingOptions)) {
        warnings.push(`Item ${itemIndex}: Serving options should be an array`);
        item.servingOptions = [];
      } else {
        item.servingOptions = item.servingOptions
          .filter((option) => option.size && option.price !== undefined)
          .slice(0, 10); // Max 10 serving options
      }
    }
  }

  /**
   * Perform cross-field validation
   * Phase 4.4: Cross-Field Validation
   */
  private static performCrossFieldValidation(
    item: RawMenuItem,
    itemIndex: number,
    warnings: string[]
  ): void {
    // Wine items should have wine-specific fields
    if (item.itemType === "wine") {
      if (!item.wineStyle) {
        warnings.push(`Item ${itemIndex}: Wine items should have a wine style`);
      }

      // If it has wine characteristics but isn't marked as wine
    } else if (
      item.wineStyle ||
      item.grapeVariety ||
      item.vintage ||
      item.producer ||
      (item.region && this.isWineRegion(item.region))
    ) {
      warnings.push(
        `Item ${itemIndex}: Has wine characteristics but not marked as wine item`
      );
    }

    // Dietary consistency validation
    if (item.isVegan === true && item.isVegetarian === false) {
      warnings.push(`Item ${itemIndex}: Vegan items should also be vegetarian`);
      item.isVegetarian = true;
    }

    // Price consistency with item type
    if (item.itemType === "wine" && item.price && item.price < 5) {
      warnings.push(
        `Item ${itemIndex}: Unusually low price for wine (${item.price})`
      );
    }

    // Ingredients vs dietary flags consistency
    if (item.ingredients && item.isVegan === true) {
      const nonVeganIngredients = item.ingredients.filter((ing) =>
        this.isNonVeganIngredient(ing.toLowerCase())
      );
      if (nonVeganIngredients.length > 0) {
        warnings.push(
          `Item ${itemIndex}: Marked as vegan but contains: ${nonVeganIngredients.join(
            ", "
          )}`
        );
      }
    }
  }

  /**
   * Check if a region is known wine region
   */
  private static isWineRegion(region: string): boolean {
    const wineRegions = [
      "bordeaux",
      "burgundy",
      "champagne",
      "rhone",
      "loire",
      "alsace",
      "tuscany",
      "piedmont",
      "veneto",
      "rioja",
      "ribera del duero",
      "napa",
      "sonoma",
      "willamette",
      "barossa",
      "hunter valley",
      "marlborough",
      "mendoza",
      "douro",
      "mosel",
      "rheingau",
    ];
    return wineRegions.some((wr) => region.toLowerCase().includes(wr));
  }

  /**
   * Check if ingredient is typically non-vegan
   */
  private static isNonVeganIngredient(ingredient: string): boolean {
    const nonVeganIngredients = [
      "meat",
      "beef",
      "chicken",
      "pork",
      "lamb",
      "fish",
      "salmon",
      "tuna",
      "cheese",
      "milk",
      "cream",
      "butter",
      "yogurt",
      "egg",
      "honey",
      "bacon",
      "ham",
      "sausage",
      "prosciutto",
      "pancetta",
      "duck",
      "turkey",
    ];
    return nonVeganIngredients.some((nvi) => ingredient.includes(nvi));
  }
}
