import express, { Router } from "express";
import * as menuController from "../controllers/menuController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { uploadPdf } from "../middleware/uploadMiddleware"; // Assuming this is your correct multer middleware for PDF

const router: Router = express.Router();

// ... (other menu routes, e.g., get all menus for a restaurant)
router.get(
  "/restaurant/:restaurantId",
  protect,
  menuController.getMenusByRestaurant
);

// GET a single menu by its ID, including its items
router.get(
  "/:menuId",
  protect, // Ensure user is logged in
  // Optional: Add role-based access if needed, e.g., only restaurant staff/admin
  // restrictTo(['restaurantAdmin', 'manager', 'staff']),
  menuController.getMenuByIdWithItems
);

// POST - Create a new menu
// Ensure only authorized users (e.g., restaurant admins/managers) can create menus.
router.post(
  "/",
  protect,
  restrictTo("restaurantAdmin"), // Example: Only restaurant admins can create a base menu
  menuController.createMenu
);

// PUT - Update an existing menu's details (e.g., name, description)
router.put(
  "/:menuId",
  protect,
  restrictTo("restaurantAdmin"), // Example: Only restaurant admins can update menu details
  menuController.updateMenuDetails
);

// DELETE - Delete a menu
// Ensure only authorized users (e.g., restaurant admins) can delete menus.
router.delete(
  "/:menuId",
  protect,
  restrictTo("restaurantAdmin"), // Example: Only restaurant admins can delete menus
  menuController.deleteMenu
);

// Route to upload a menu PDF for a specific restaurant
router.post(
  "/upload/pdf/:restaurantId",
  protect,
  restrictTo("restaurant"), // Changed from "restaurantAdmin" to "restaurant"
  uploadPdf.single("menuPdf"),
  menuController.uploadMenuPdf
);

// New route for deleting a category within a specific menu
router.delete(
  "/:menuId/categories/:categoryName",
  protect,
  restrictTo("restaurant"), // Also ensure this is "restaurant" if intended for restaurant owners/managers
  menuController.deleteCategoryAndReassignItems
);

export default router;
