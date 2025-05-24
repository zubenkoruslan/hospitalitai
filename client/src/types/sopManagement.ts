export type SopDocumentStatus =
  | "uploaded"
  | "parsing"
  | "categorizing"
  | "processed"
  | "error";

export type SopFileType = "pdf" | "docx" | "txt" | "md" | "other";

export interface ISopCategory {
  _id?: string; // Optional: usually present when fetched, not on creation from client
  name: string;
  content: string;
  startOffset?: number;
  endOffset?: number;
}

export interface ISopDocument {
  _id: string; // Typically present when fetched from backend
  title: string;
  originalFileName: string;
  // storagePath?: string; // Likely not directly used by frontend for display
  fileType: SopFileType;
  restaurantId: string; // Assuming string representation of ObjectId
  status: SopDocumentStatus;
  uploadedAt: string; // Date as string (ISO format)
  updatedAt: string; // Date as string (ISO format)
  extractedText?: string; // Optional, might be large and fetched on demand
  categories: ISopCategory[];
  errorMessage?: string;
}

// For list views, we might want a slimmer version without large text fields
export interface ISopDocumentListItem
  extends Omit<ISopDocument, "extractedText" | "categories"> {
  categoryCount: number; // Example: derived or summarized data for list
  categories: Pick<ISopCategory, "name">[]; // Just names for quick view
}

// Type for uploading a new SOP document (title + file)
export interface SopDocumentUploadData {
  title: string;
  sopDocument: File; // The actual file object
}

// For API responses that might be paginated or have metadata
export interface SopDocumentListResponse {
  status: string;
  results: number;
  data: ISopDocumentListItem[]; // Or ISopDocument[] if full details are sent
}

export interface SopDocumentDetailResponse {
  status: string;
  data: ISopDocument;
}

export interface SopDocumentStatusResponse {
  status: string;
  data: {
    _id?: string; // Backend might not send this, but good to have if it does
    title?: string;
    uploadedAt?: string; // Date as string
    status: SopDocumentStatus;
    message?: string; // Corresponds to errorMessage in the backend model
  };
}
