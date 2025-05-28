import { Document, Types } from "mongoose";

/**
 * Represents a single menu item as directly returned by the Gemini AI function call.
 * This aligns with `ExtractedMenuAIResponse.menuItems[0]` from menuService.ts.
 */
export interface GeminiProcessedMenuItem {
  itemName: string;
  itemPrice?: number | null; // Gemini schema has number, allow null
  itemType: "food" | "beverage"; // Matches your ExtractedMenuItem and Gemini schema
  itemIngredients: string[];
  itemCategory: string;
  isGlutenFree: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  // If Gemini can provide originalText or sourceCoordinates per item, add here.
  // e.g., originalItemText?: string;
  // e.g., itemSourceCoordinates?: any;
}

/**
 * Represents the overall structure of the parsed menu from the Gemini AI function call.
 * This aligns with `ExtractedMenuAIResponse` from menuService.ts.
 */
export interface GeminiAIServiceOutput {
  menuName: string;
  menuItems: GeminiProcessedMenuItem[];
  // If Gemini call provides any global processing info or errors, add here.
  // e.g., aiProcessingErrors?: string[];
}

/**
 * Represents a single menu item as extracted by Gemini AI.
 * This is an example structure and should be adjusted to match actual Gemini output.
 */
export interface GeminiMenuItem {
  itemName: { value: string; confidence?: number; originalText?: string };
  description?: { value: string; confidence?: number; originalText?: string };
  price: { value: string; confidence?: number; originalText?: string }; // Price might be a string initially
  // Add other fields Gemini might extract, like ingredients, dietary_flags, etc.
  // It's useful to include originalText or coordinates if Gemini provides them for traceability.
  sourceCoordinates?: any; // e.g., bounding box
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
  // Any global metadata Gemini might provide
  processingInfo?: {
    modelUsed?: string;
    parseDurationMs?: number;
  };
}

// --- Standardized Structures for Frontend Preview ---

/**
 * Represents a single field of a parsed menu item for the preview table.
 * Includes validation status.
 */
export interface ParsedMenuItemField {
  value: string | number | boolean | string[] | null; // Expanded to include boolean and string[]
  originalValue?: string | number | boolean | string[] | null; // Expanded as well
  isValid: boolean;
  errorMessage?: string;
  confidence?: number; // Optional: confidence score from AI. Not directly available in current ExtractedMenuAIResponse.
}

/**
 * Represents a standardized menu item row for the frontend preview table.
 */
export interface ParsedMenuItem {
  id: string; // A temporary client-side or backend-generated ID for the row
  internalIndex: number; // original index from AI output array, useful for debugging AI mapping
  fields: {
    name: ParsedMenuItemField;
    description?: ParsedMenuItemField; // Note: GeminiAIServiceOutput doesn't have description directly, may need to map from ingredients or add to AI schema
    price: ParsedMenuItemField;
    category: ParsedMenuItemField; // Category name
    itemType: ParsedMenuItemField; // "food" | "beverage"
    ingredients: ParsedMenuItemField; // Representing array of strings perhaps as a comma-separated string or a more complex field type
    isGlutenFree: ParsedMenuItemField; // boolean
    isVegan: ParsedMenuItemField; // boolean
    isVegetarian: ParsedMenuItemField; // boolean
    // Add other standardized fields as needed
  };
  originalSourceData?: GeminiProcessedMenuItem; // Store the original AI item for reference
  status: "new" | "edited" | "error" | "ignored" | "error_system_validation"; // Status for UI tracking during PREVIEW/EDIT stage

  // Fields for conflict resolution - populated by backend /process endpoint
  conflictResolution?: {
    status:
      | "no_conflict"
      | "update_candidate"
      | "multiple_candidates"
      | "error_processing_conflict"
      | "skipped_by_user";
    message?: string;
    existingItemId?: string; // For 'update_candidate'
    candidateItemIds?: string[]; // For 'multiple_candidates'
  };

  importAction?: "create" | "update" | "skip"; // User's choice for conflict resolution, set by FE before final import
  existingItemId?: string; // If importAction is 'update', this specifies which item to update. Set by FE after conflict resolution.
  userAction?: "keep" | "ignore"; // User's explicit choice on the item from the frontend
}

/**
 * The overall structure returned by the menu upload preview API endpoint.
 */
export interface MenuUploadPreview {
  previewId: string; // Unique ID for this upload session (e.g., based on temp file path or a UUID)
  filePath: string; // Path to the temporarily stored uploaded file
  sourceFormat: "pdf"; // Initially supporting PDF, can extend later
  parsedMenuName?: string; // The menu name as parsed by AI
  parsedItems: ParsedMenuItem[];
  detectedCategories: string[]; // Unique categories detected from all items
  globalErrors?: string[]; // Errors not specific to one item (e.g., "File too large", "AI parsing failed")
  summary?: {
    totalItemsParsed: number;
    itemsWithPotentialErrors: number;
  };
  rawAIText?: string; // Full raw text extracted from PDF, truncated if very long
  rawAIOutput?: GeminiAIServiceOutput | null; // Raw output from Gemini AI service for debugging
}

// --- Structures for Final Menu Import ---

// Request for POST /api/menus/upload/process (Conflict Resolution)
export interface ProcessConflictResolutionRequest {
  itemsToProcess: ParsedMenuItem[];
  restaurantId: string; // Ensure this is present and mandatory
  targetMenuId?: string; // Optional: if resolving conflicts against a specific existing menu
}

// Response for POST /api/menus/upload/process (Conflict Resolution)
export interface ProcessConflictResolutionResponse {
  processedItems: ParsedMenuItem[]; // The itemsToProcess, now augmented with conflictResolution details
  summary: {
    itemsRequiringUserAction: number; // Count of items with multiple_candidates or error_processing_conflict
    potentialUpdatesIdentified: number; // Count of items with update_candidate
    newItemsConfirmed: number; // Count of items with no_conflict
    totalProcessed: number;
  };
}

export interface FinalImportRequestBody {
  previewId: string; // The ID received from the initial /upload/preview response
  filePath: string; // The path to the temp file, also from /upload/preview response
  parsedMenuName?: string; // Name for a new menu, or new name for an existing targeted menu
  targetMenuId?: string; // Optional: ID of an existing menu to add/update items in
  replaceAllItems?: boolean; // If true and targetMenuId is set, existing items in that menu will be deleted first. Also applies if a menu is implicitly found by parsedMenuName and needs replacement.
  itemsToImport: ParsedMenuItem[]; // The array of items, with user corrections and importAction set
}

export interface ImportResultItemDetail {
  id: string; // Original temporary ID from ParsedMenuItem.id
  name: string; // Name of the item processed
  status: "created" | "updated" | "skipped" | "error";
  newItemId?: string; // If created/updated, the new MongoDB _id of the MenuItem
  existingItemId?: string; // If action was 'update', the MongoDB _id of the item intended for update
  errorReason?: string;
}

export interface ImportResult {
  overallStatus: "success" | "partial_success" | "failed";
  message: string;
  menuId?: string;
  menuName?: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsErrored: number;
  errorDetails?: ImportResultItemDetail[];
  errorReport?: string; // CSV string of errors
  jobId?: string; // if processed asynchronously
}

// For MenuImportJobModel schema
export interface IMenuImportJob {
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  originalFilePath: string;
  parsedMenuName?: string;
  targetMenuId?: Types.ObjectId;
  replaceAllItems?: boolean;
  itemsToImport: ParsedMenuItem[]; // The state of items at the point of queuing
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "partial_success";
  progress: number; // 0-100
  result?: ImportResult;
  errorMessage?: string;
  errorDetails?: any; // Could be more specific based on error types
  attempts: number;
  processedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Data payload for BullMQ jobs
export interface MenuImportJobData {
  menuImportJobDocumentId: string; // The _id of the MenuImportJob document in MongoDB
  // Any other critical data that might be needed immediately by the worker
  // without fetching from DB, though typically jobId is enough.
}

// For menu items that are processed by the AI and then presented in the preview table.
// This status is primarily for server-side initial validation against AI output.
export type ParsedItemPreviewStatus =
  | "new"
  | "edited"
  | "error_system_validation"
  | "error"
  | "ignored";

// For ImportResultItemDetail, what happened during the actual import to DB
export type ImportActionStatus = "created" | "updated" | "skipped" | "error";

// For ParsedMenuItem.conflictResolution.status
export type ConflictResolutionStatus =
  | "no_conflict"
  | "update_candidate"
  | "multiple_candidates"
  | "error_processing_conflict"
  | "skipped_by_user"; // Added to handle user explicitly ignoring an item before conflict check

// For MenuImportJobModel status
export type JobProcessStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "partial_success";

// Make sure ParsedMenuItem.status uses the broader set of statuses needed.
// Re-evaluating ParsedMenuItem.status definition to ensure it covers states from AI validation, user edits, and general errors.
// The previous edit included "error_system_validation". "error" can be a general error. "ignored" is if the user ignores it.
// "new" is initial state. "edited" if user changed it. This seems comprehensive for the preview stage.
