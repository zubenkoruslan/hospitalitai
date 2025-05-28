import express from "express";
import {
  createMenu,
  getAllMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  updateMenuActivationStatus,
  handleMenuUploadPreview,
  handleFinalizeMenuImport,
  uploadMenuPdf,
  deleteCategoryAndReassignItems,
  handleProcessMenuForConflictResolution,
  getMenuImportJobStatus,
} from "../controllers/menuController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { uploadPdf } from "../middleware/uploadMiddleware";
import {
  handleValidationErrors,
  validateCreateMenu,
  validateUpdateMenu,
  validateObjectId,
  validateMenuIdParam,
  validateCategoryNameParam,
  validateFinalMenuImportData,
  validateProcessConflictResolutionData,
} from "../middleware/validationMiddleware";
import { body } from "express-validator";

const router = express.Router();

// ... (other menu routes, e.g., get all menus for a restaurant)
router.get(
  "/restaurant/:restaurantId",
  protect,
  validateObjectId("restaurantId"),
  handleValidationErrors,
  getAllMenus
);

// GET a single menu by its ID, including its items
router.get(
  "/:menuId",
  protect, // Ensure user is logged in
  validateMenuIdParam,
  handleValidationErrors,
  // Optional: Add role-based access if needed, e.g., only restaurant staff/admin
  // restrictTo(['restaurantAdmin', 'manager', 'staff']),
  getMenuById
);

// POST - Create a new menu
// Ensure only authorized users (e.g., restaurant admins/managers) can create menus.
router.post(
  "/",
  protect,
  restrictTo("restaurant"),
  validateCreateMenu,
  handleValidationErrors,
  createMenu
);

// PUT - Update an existing menu's details (e.g., name, description)
router.put(
  "/:menuId",
  protect,
  restrictTo("restaurant"),
  validateMenuIdParam,
  validateUpdateMenu,
  handleValidationErrors,
  updateMenu
);

// DELETE - Delete a menu
// Ensure only authorized users (e.g., restaurant admins) can delete menus.
router.delete(
  "/:menuId",
  protect,
  restrictTo("restaurant"),
  validateMenuIdParam,
  handleValidationErrors,
  deleteMenu
);

// Route to upload a menu PDF for a specific restaurant
router.post(
  "/upload/pdf/:restaurantId",
  protect,
  restrictTo("restaurant"),
  uploadPdf.single("menuPdf"),
  validateObjectId("restaurantId"),
  handleValidationErrors,
  uploadMenuPdf
);

// NEW Route: Upload a menu PDF to get a preview for interactive correction
router.post(
  "/upload/preview", // No restaurantId in path, will be taken from req.user
  protect, // Ensure user is authenticated
  restrictTo("restaurant"),
  uploadPdf.single("menuPdf"), // Use the same multer middleware for PDF upload
  // No specific body/param validation here as we rely on file upload and auth context
  // handleValidationErrors, // Not strictly needed if no preceding validators that add to req.errors
  handleMenuUploadPreview
);

// New route for deleting a category within a specific menu
router.delete(
  "/:menuId/categories/:categoryName",
  protect,
  restrictTo("restaurant"),
  validateMenuIdParam,
  validateCategoryNameParam,
  handleValidationErrors,
  deleteCategoryAndReassignItems
);

// Route to update menu activation status
router.patch(
  "/:menuId/status",
  protect, // General auth
  restrictTo("restaurant"),
  validateMenuIdParam, // Validate menuId in params
  body("isActive").isBoolean().withMessage("isActive must be a boolean."), // Validate isActive in body
  handleValidationErrors,
  updateMenuActivationStatus
);

// POST /api/menus/upload/import
router.post(
  "/upload/import",
  protect,
  restrictTo("restaurant"),
  validateFinalMenuImportData,
  handleFinalizeMenuImport
);

// POST /api/menus/upload/process - For conflict resolution
router.post(
  "/upload/process",
  protect,
  restrictTo("restaurant"),
  validateProcessConflictResolutionData,
  handleValidationErrors,
  handleProcessMenuForConflictResolution
);

// GET /api/menus/upload/status/:jobId - For async import job status
router.get(
  "/upload/status/:jobId",
  protect,
  restrictTo("restaurant"),
  validateObjectId("jobId"), // Validate that jobId is a valid ObjectId
  handleValidationErrors,
  getMenuImportJobStatus
);

export default router;
