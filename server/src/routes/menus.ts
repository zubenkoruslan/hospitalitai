import express, { Router } from "express";
import * as menuController from "../controllers/menuController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { uploadPdf } from "../middleware/uploadMiddleware"; // Assuming this is your correct multer middleware for PDF
import {
  handleValidationErrors,
  validateCreateMenu,
  validateObjectId,
  validateMenuIdParam,
  validateUpdateMenu,
  validateCategoryNameParam,
} from "../middleware/validationMiddleware";

const router: Router = express.Router();

// ... (other menu routes, e.g., get all menus for a restaurant)
router.get(
  "/restaurant/:restaurantId",
  protect,
  validateObjectId("restaurantId"),
  handleValidationErrors,
  menuController.getMenusByRestaurant
);

// GET a single menu by its ID, including its items
router.get(
  "/:menuId",
  protect, // Ensure user is logged in
  validateMenuIdParam,
  handleValidationErrors,
  // Optional: Add role-based access if needed, e.g., only restaurant staff/admin
  // restrictTo(['restaurantAdmin', 'manager', 'staff']),
  menuController.getMenuByIdWithItems
);

// POST - Create a new menu
// Ensure only authorized users (e.g., restaurant admins/managers) can create menus.
router.post(
  "/",
  protect,
  restrictTo("restaurant"), // Example: Only restaurant admins can create a base menu
  validateCreateMenu,
  handleValidationErrors,
  menuController.createMenu
);

// PUT - Update an existing menu's details (e.g., name, description)
router.put(
  "/:menuId",
  protect,
  restrictTo("restaurant"), // Example: Only restaurant admins can update menu details
  validateMenuIdParam,
  validateUpdateMenu,
  handleValidationErrors,
  menuController.updateMenuDetails
);

// DELETE - Delete a menu
// Ensure only authorized users (e.g., restaurant admins) can delete menus.
router.delete(
  "/:menuId",
  protect,
  restrictTo("restaurant"), // Example: Only restaurant admins can delete menus
  validateMenuIdParam,
  handleValidationErrors,
  menuController.deleteMenu
);

// Route to upload a menu PDF for a specific restaurant
router.post(
  "/upload/pdf/:restaurantId",
  protect,
  restrictTo("restaurant"), // Changed from "restaurantAdmin" to "restaurant"
  uploadPdf.single("menuPdf"),
  validateObjectId("restaurantId"),
  handleValidationErrors,
  menuController.uploadMenuPdf
);

// New route for deleting a category within a specific menu
router.delete(
  "/:menuId/categories/:categoryName",
  protect,
  restrictTo("restaurant"), // Also ensure this is "restaurant" if intended for restaurant owners/managers
  validateMenuIdParam,
  validateCategoryNameParam,
  handleValidationErrors,
  menuController.deleteCategoryAndReassignItems
);

// Route to update menu activation status
router.patch(
  "/:menuId/status",
  protect, // Protect the route
  validateMenuIdParam, // Validate menuId in params
  menuController.updateMenuActivationStatusHandler // Corrected handler name
);

export default router;
