import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { AppError } from "../utils/errorHandler";
import path from "path"; // Import path module
import fs from "fs"; // Import fs module

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Increased file size limit for Excel files
const MAX_EXCEL_FILE_SIZE_MB = 10;
const MAX_EXCEL_FILE_SIZE_BYTES = MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024;

// Define the absolute path for the uploads directory
// Assuming this middleware file is at PROJECT_ROOT/server/src/middleware/uploadMiddleware.ts
const projectRootDir = path.resolve(__dirname, "../../..");
const UPLOADS_DIR_ABSOLUTE = path.resolve(projectRootDir, "uploads");

// Ensure the uploads directory exists at startup or when this module is loaded
if (!fs.existsSync(UPLOADS_DIR_ABSOLUTE)) {
  try {
    fs.mkdirSync(UPLOADS_DIR_ABSOLUTE, { recursive: true });
    console.log(
      `[uploadMiddleware] Created uploads directory at: ${UPLOADS_DIR_ABSOLUTE}`
    );
  } catch (err) {
    console.error(
      `[uploadMiddleware] Error creating uploads directory at ${UPLOADS_DIR_ABSOLUTE}:`,
      err
    );
    // Depending on your error strategy, you might want to throw here or exit
  }
}

// Configure storage - using disk storage for all file types
// Files can be large (especially Excel) and processing may take time
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR_ABSOLUTE); // Use the absolute path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Get file extension from original name as fallback
    const originalExt = path.extname(file.originalname);
    const mimeExt = file.mimetype.split("/")[1];

    // Use original extension if available, otherwise use mime type
    const extension = originalExt || `.${mimeExt}`;

    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

// File filter to accept only PDF files (for backwards compatibility)
const pdfFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new AppError("Invalid file type. Only PDF files are allowed.", 400));
  }
};

// Enhanced file filter to accept multiple menu formats
const menuFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = [
    "application/pdf", // PDF
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv", // CSV
    "application/json", // JSON
    "text/plain", // May be CSV with wrong mime type
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ];

  const allowedExtensions = [".pdf", ".xlsx", ".xls", ".csv", ".json", ".docx"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Check both MIME type and file extension for robust validation
  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type. Supported formats: PDF, Excel (.xlsx/.xls), CSV, JSON, Word (.docx)",
        400
      )
    );
  }
};

// Helper function to determine file size limit based on file type
const getFileSizeLimit = (req: Request, file: Express.Multer.File): number => {
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Excel files can be larger due to formatting and multiple sheets
  if (
    fileExtension === ".xlsx" ||
    fileExtension === ".xls" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel"
  ) {
    return MAX_EXCEL_FILE_SIZE_BYTES;
  }

  // Default size limit for other formats
  return MAX_FILE_SIZE_BYTES;
};

// Original PDF-only upload middleware (for backwards compatibility)
export const uploadPdf = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 5 MB
  },
});

// Enhanced multi-format upload middleware
export const uploadMenu = multer({
  storage: storage,
  fileFilter: menuFileFilter,
  limits: {
    fileSize: MAX_EXCEL_FILE_SIZE_BYTES, // Use the largest limit (10 MB) for all formats
    // We could implement dynamic limits per file type in the future
  },
});

// Export constants for use in other modules
export {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  MAX_EXCEL_FILE_SIZE_MB,
  MAX_EXCEL_FILE_SIZE_BYTES,
};
