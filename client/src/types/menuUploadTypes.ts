/**
 * Represents a single menu item as directly returned by the Gemini AI function call.
 * This aligns with `ExtractedMenuAIResponse.menuItems[0]` from menuService.ts.
 */
export interface GeminiProcessedMenuItem {
  itemName: string;
  itemPrice?: number | null;
  itemType: "food" | "beverage";
  itemIngredients: string[];
  itemCategory: string;
  isGlutenFree: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
}

/**
 * Represents the overall structure of the parsed menu from the Gemini AI function call.
 */
export interface GeminiAIServiceOutput {
  menuName: string;
  menuItems: GeminiProcessedMenuItem[];
}

/**
 * Represents a single menu item as extracted by Gemini AI.
 */
export interface GeminiMenuItem {
  itemName: { value: string; confidence?: number; originalText?: string };
  description?: { value: string; confidence?: number; originalText?: string };
  price: { value: string; confidence?: number; originalText?: string };
  sourceCoordinates?: any;
}

/**
 * Represents a menu section as extracted by Gemini AI.
 */
export interface GeminiMenuSection {
  sectionName: { value: string; confidence?: number; originalText?: string };
  items: GeminiMenuItem[];
  sourceCoordinates?: any;
}

/**
 * Represents the overall structure of the parsed menu from Gemini AI.
 */
export interface GeminiParseOutput {
  menuTitle?: { value: string; confidence?: number };
  sections: GeminiMenuSection[];
  processingInfo?: {
    modelUsed?: string;
    parseDurationMs?: number;
  };
}

// --- Standardized Structures for Frontend Preview ---

export interface ParsedMenuItemField {
  value: string | number | boolean | string[] | null;
  originalValue?: string | number | boolean | string[] | null;
  isValid: boolean;
  errorMessage?: string;
  confidence?: number;
}

// Represents the status of a parsed item during the preview and import process
export type ItemStatus =
  | "new"
  | "edited"
  | "error"
  | "ignored"
  | "error_client_validation";

export interface ParsedMenuItem {
  id: string;
  fields: {
    name: ParsedMenuItemField;
    description?: ParsedMenuItemField;
    price: ParsedMenuItemField;
    category: ParsedMenuItemField;
    itemType: ParsedMenuItemField;
    ingredients: ParsedMenuItemField;
    isGlutenFree: ParsedMenuItemField;
    isVegan: ParsedMenuItemField;
    isVegetarian: ParsedMenuItemField;
  };
  originalSourceData?: GeminiProcessedMenuItem;
  status: ItemStatus;

  conflictResolution?: {
    status:
      | "no_conflict"
      | "update_candidate"
      | "multiple_candidates"
      | "error_processing_conflict";
    message?: string;
    existingItemId?: string;
    candidateItemIds?: string[];
  };

  userAction?: "keep" | "ignore";
  importAction?: "create" | "update" | "skip";
  existingItemId?: string;
}

export interface MenuUploadPreview {
  previewId: string;
  filePath: string;
  sourceFormat: "pdf";
  parsedMenuName?: string;
  parsedItems: ParsedMenuItem[];
  detectedCategories: string[];
  globalErrors?: string[];
  summary?: {
    totalItemsParsed: number;
    itemsWithPotentialErrors: number;
  };
}

// --- Structures for Final Menu Import ---

export interface ProcessConflictResolutionRequest {
  itemsToProcess: ParsedMenuItem[];
  restaurantId: string;
  targetMenuId?: string;
}

export interface ProcessConflictResolutionResponse {
  processedItems: ParsedMenuItem[];
  summary?: {
    itemsRequiringUserAction: number;
    potentialUpdatesIdentified: number;
    newItemsConfirmed: number;
    totalProcessed: number;
  };
}

export interface FinalImportRequestBody {
  previewId: string;
  filePath: string;
  parsedMenuName?: string;
  targetMenuId?: string;
  replaceAllItems?: boolean;
  itemsToImport: ParsedMenuItem[];
}

export interface ImportResultItemDetail {
  id: string;
  name: string;
  status: "created" | "updated" | "skipped" | "error";
  newItemId?: string;
  existingItemId?: string;
  errorReason?: string;
}

export interface ImportResult {
  overallStatus: "completed" | "partial" | "failed";
  message: string;
  menuId?: string;
  menuName?: string;
  totalItemsInRequest: number;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsErrored: number;
  errorDetails: ImportResultItemDetail[];
  errorReport?: any;
}
