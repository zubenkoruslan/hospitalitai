import express, { Router } from "express";
import {
  createRoleController,
  getRoleByIdController,
  getRolesByRestaurantController,
  updateRoleController,
  deleteRoleController,
} from "../controllers/roleController";
import { protect, restrictTo } from "../middleware/authMiddleware"; // Corrected to restrictTo
import {
  validateObjectId, // Corrected to use validateObjectId
  handleValidationErrors,
} from "../middleware/validationMiddleware";
import { body } from "express-validator";

const router: Router = express.Router();

// --- Middleware for all role routes ---
router.use(protect); // All role routes require authentication
// .cursorrules mentions restrictTo("restaurant") for quiz management type tasks.
// This assumes that users with the "restaurant" role are authorized to manage roles.
router.use(restrictTo("restaurant"));

// --- Role Routes ---

// POST /api/roles - Create a new role
router.post(
  "/",
  [
    body("name")
      .notEmpty()
      .withMessage("Role name is required.")
      .isString()
      .trim(),
    body("description").optional().isString().trim(),
  ],
  handleValidationErrors,
  createRoleController
);

// GET /api/roles - Get all roles for the user's restaurant
router.get("/", getRolesByRestaurantController);

// GET /api/roles/:roleId - Get a specific role by ID
router.get(
  "/:roleId",
  validateObjectId("roleId"), // Use the existing validateObjectId for param validation
  handleValidationErrors,
  getRoleByIdController
);

// PUT /api/roles/:roleId - Update a specific role
router.put(
  "/:roleId",
  validateObjectId("roleId"),
  [
    body("name").optional().isString().trim(),
    body("description").optional().isString().trim(),
    body().custom((value, { req }) => {
      if (req.body.name === undefined && req.body.description === undefined) {
        throw new Error(
          "At least one field (name or description) must be provided for update."
        );
      }
      return true;
    }),
  ],
  handleValidationErrors,
  updateRoleController
);

// DELETE /api/roles/:roleId - Delete a specific role
router.delete(
  "/:roleId",
  validateObjectId("roleId"),
  handleValidationErrors,
  deleteRoleController
);

export { router as roleRouter };
