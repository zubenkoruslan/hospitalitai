import express from "express";
import { SopDocumentController } from "../controllers/sopDocumentController";
import { protect as authMiddleware } from "../middleware/authMiddleware"; // Correctly import 'protect' and alias it
import { sopUpload } from "../middleware/multerConfig"; // Assuming multer config is used for uploads

const router = express.Router();

// Existing route for uploading SOP documents (example, adjust if different)
router.post(
  "/",
  authMiddleware,
  sopUpload.single("sopDocument"), // 'sopDocument' is the field name for the file
  SopDocumentController.uploadSopDocument
);

// Existing route for listing SOP documents (example)
router.get("/", authMiddleware, SopDocumentController.listSopDocuments);

// Existing route for getting SOP document details (example)
router.get(
  "/:documentId",
  authMiddleware,
  SopDocumentController.getSopDocumentDetails
);

// Existing route for deleting an SOP document (example)
router.delete(
  "/:documentId",
  authMiddleware,
  SopDocumentController.deleteSopDocument
);

// Existing route for getting SOP document processing status (example)
router.get(
  "/:documentId/status",
  authMiddleware,
  SopDocumentController.getSopDocumentProcessingStatus
);

// --- NEW ROUTE FOR SELECTIVE QUESTION GENERATION ---
router.post(
  "/:documentId/generate-questions",
  authMiddleware,
  SopDocumentController.generateQuestionsForSopBankController
);
// --- END OF NEW ROUTE ---

// Example routes for editing SOP title, description, and categories - (ensure these exist or adapt)
router.patch(
  "/:documentId/title",
  authMiddleware,
  SopDocumentController.updateSopDocumentTitle // Assuming this controller method exists
);
router.patch(
  "/:documentId/description",
  authMiddleware,
  SopDocumentController.updateSopDocumentDescription // Assuming this controller method exists
);
router.post(
  "/:documentId/categories",
  authMiddleware,
  SopDocumentController.addSopCategory // Assuming this controller method exists
);
router.patch(
  "/:documentId/categories/:categoryId",
  authMiddleware,
  SopDocumentController.updateSopCategory // Assuming this controller method exists
);
router.delete(
  "/:documentId/categories/:categoryId",
  authMiddleware,
  SopDocumentController.deleteSopCategory // Assuming this controller method exists
);

export default router;
