import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { AppError } from "../utils/errorHandler";
import path from "path"; // Import path module
import fs from "fs"; // Import fs module

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

// Configure storage - we can use memory storage for simplicity if processing is quick
// or disk storage if files are large or processing is deferred.
// For this case, let's use disk storage as PDF parsing might take a moment.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR_ABSOLUTE); // Use the absolute path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + "." + file.mimetype.split("/")[1]
    );
  },
});

// File filter to accept only PDF files
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

export const uploadPdf = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 5 MB
  },
});

// It's good practice to ensure the 'uploads/' directory exists.
// This could be done at application startup.
// For example, in your main server.ts:
// import fs from 'fs';
// const uploadsDir = './uploads';
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir);
// }
