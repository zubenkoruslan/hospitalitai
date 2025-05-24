import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { SopDocumentController } from "../controllers/sopDocumentController";
import { protect, restrictTo } from "../middleware/authMiddleware"; // Correctly import restrictTo
import { validateObjectId } from "../middleware/validationMiddleware"; // For validating :documentId

const router = express.Router();

// --- Multer Configuration for SOP Document Uploads ---
const sopUploadsDir = path.join(__dirname, "../..", "uploads", "sop_documents");

// Ensure the upload directory exists
if (!fs.existsSync(sopUploadsDir)) {
  fs.mkdirSync(sopUploadsDir, { recursive: true });
}

const sopStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sopUploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename to prevent overwrites and include original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

const sopFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed file types (mimetypes)
  const allowedMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    // 'application/msword', // .doc (consider if needed, mammoth might handle some .doc)
    "text/plain", // .txt
    "text/markdown", // .md
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOCX, TXT, and MD are allowed."
      ) as any
    );
  }
};

const uploadSop = multer({
  storage: sopStorage,
  fileFilter: sopFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10 MB file size limit
  },
});

// --- SOP Document Routes ---

// Protect all SOP document routes
router.use(protect);

// Route for uploading a new SOP document
// Only restaurant admins and managers can upload SOP documents.
router.post(
  "/upload",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  uploadSop.single("sopDocument"), // CORRECTED: Use the locally defined 'uploadSop'
  SopDocumentController.uploadSopDocument
);

// ADDED: Route to list all SOP documents for the restaurant
// Restaurant admins, managers, and potentially staff should be able to list documents.
router.get(
  "/",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  SopDocumentController.listSopDocuments
);

// ADDED: Routes for specific SOP document operations (get details, delete, get status)
// These operations are likely restricted to restaurant admins and managers.
router.get(
  "/:documentId",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  validateObjectId("documentId"),
  SopDocumentController.getSopDocumentDetails
);

router.delete(
  "/:documentId",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateObjectId("documentId"),
  SopDocumentController.deleteSopDocument
);

router.get(
  "/:documentId/status",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  validateObjectId("documentId"),
  SopDocumentController.getSopDocumentProcessingStatus
);

// TODO: Add routes for GET /api/sop-documents, GET /api/sop-documents/:id, DELETE /api/sop-documents/:id, etc.

export default router;
