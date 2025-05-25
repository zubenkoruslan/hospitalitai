import express from "express";
import { SopDocumentEditController } from "../controllers/sopDocumentEditController";
import { protect } from "../middleware/authMiddleware"; // Assuming this is your auth middleware
// import { validateRequestBody } from '../middleware/validationMiddleware'; // Optional: if you have specific validation schemas

const router = express.Router();

// All routes in this file will be protected and pertain to editing SOP documents.
// They are scoped under something like /api/sop-documents/:documentId/...

/**
 * @route   PUT /api/sop-documents/:documentId/title
 * @desc    Update the title of a specific SOP document
 * @access  Private (Requires authentication, user must be associated with the restaurant)
 */
router.put(
  "/:documentId/title",
  protect,
  // validateRequestBody(someTitleUpdateSchema), // Example: if using Joi or express-validator schemas
  SopDocumentEditController.updateTitle
);

/**
 * @route   PUT /api/sop-documents/:documentId/description
 * @desc    Update the description of a specific SOP document
 * @access  Private
 */
router.put(
  "/:documentId/description",
  protect,
  SopDocumentEditController.updateDescription
);

/**
 * @route   POST /api/sop-documents/:documentId/categories
 * @desc    Add a new category (or subcategory) to an SOP document
 * @access  Private
 */
router.post(
  "/:documentId/categories",
  protect,
  // validateRequestBody(someAddCategorySchema),
  SopDocumentEditController.addCategory
);

/**
 * @route   PUT /api/sop-documents/:documentId/categories/:categoryId
 * @desc    Update a specific category/subcategory within an SOP document
 * @access  Private
 */
router.put(
  "/:documentId/categories/:categoryId",
  protect,
  // validateRequestBody(someUpdateCategorySchema),
  SopDocumentEditController.updateCategory
);

/**
 * @route   DELETE /api/sop-documents/:documentId/categories/:categoryId
 * @desc    Delete a specific category/subcategory from an SOP document
 * @access  Private
 */
router.delete(
  "/:documentId/categories/:categoryId",
  protect,
  SopDocumentEditController.deleteCategory
);

export default router;
