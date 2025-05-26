export interface ISopCategory {
  name: string;
  content?: string; // Uncommented and made optional
  _id?: string; // Optional, may or may not be present depending on source
  subCategories?: ISopCategory[]; // Added for recursive structure, if not already present
}

export type SopDocumentStatus =
  | "pending_upload"
  | "pending_processing"
  | "processing"
  | "processed"
  | "processing_error"
  | "archived";

export type QuestionGenerationStatus =
  | "NONE"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

export interface ISopDocument {
  _id: string;
  title: string;
  description?: string;
  restaurantId: string;
  categories: ISopCategory[]; // Array of category objects/names
  status: SopDocumentStatus;
  uploadedAt: string; // Date string
  updatedAt: string; // Date string
  // Optional fields based on backend model, if needed by UI
  s3Key?: string;
  originalFileName?: string;
  fileType?: string;
  extractedText?: string; // Likely not needed for listing, but good to have in full type
  questionGenerationStatus?: QuestionGenerationStatus;
  questionBankId?: string;
  errorMessage?: string;
}

// Added SopDocumentUploadData for client-side uploads
export interface SopDocumentUploadData {
  title: string;
  description?: string;
  sopDocument: File; // The actual file to upload
  restaurantId?: string; // Optional: May be inferred from context or user session on backend
}
