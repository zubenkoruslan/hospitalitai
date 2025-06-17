import express from "express";
import {
  createMenu,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  updateMenuActivationStatus,
  deleteCategoryAndReassignItems,
  exportMenu,
} from "../controllers/menuController";
import { protect, restrictTo } from "../middleware/authMiddleware";

import {
  handleValidationErrors,
  validateCreateMenu,
  validateUpdateMenu,
  validateObjectId,
  validateMenuIdParam,
  validateCategoryNameParam,
} from "../middleware/validationMiddleware";
import { body } from "express-validator";

const router = express.Router();

// ... (other menu routes, e.g., get all menus for a restaurant)
router.get(
  "/restaurant/:restaurantId",
  protect,
  validateObjectId("restaurantId"),
  handleValidationErrors,
  getMenus
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

// Route to export menu
router.post(
  "/:menuId/export",
  protect,
  restrictTo("restaurant"),
  validateMenuIdParam,
  body("format")
    .isIn(["csv", "excel", "json", "word"])
    .withMessage("Invalid export format"),
  body("includeImages").optional().isBoolean(),
  body("includeMetadata").optional().isBoolean(),
  body("includePricing").optional().isBoolean(),
  body("includeDescriptions").optional().isBoolean(),
  handleValidationErrors,
  exportMenu
);

export default router;
