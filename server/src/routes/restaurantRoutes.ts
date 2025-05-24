import express, { Request, Response, Router, NextFunction } from "express";
import { protect, restrictTo } from "../middleware/authMiddleware";
import RestaurantService, {
  RestaurantProfileUpdateData,
} from "../services/RestaurantService";
import {
  handleValidationErrors,
  validateObjectId,
} from "../middleware/validationMiddleware";
import { body } from "express-validator";
import { AppError } from "../utils/errorHandler";
import mongoose from "mongoose";

const router: Router = express.Router();

// Validation middleware for restaurant profile update
const validateRestaurantProfileUpdate = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Restaurant name cannot be empty.")
    .trim()
    .isLength({ min: 2, max: 100 }),
  body("contactEmail")
    .optional()
    .isEmail()
    .withMessage("Must be a valid email address.")
    .normalizeEmail()
    .isLength({ max: 100 }),
  // Ensure at least one field is being updated
  body().custom((value, { req }) => {
    if (
      !req.body.name &&
      !req.body.contactEmail /* && !req.body.otherField */
    ) {
      throw new Error(
        "At least one field (name or contactEmail) must be provided for update."
      );
    }
    return true;
  }),
];

/**
 * @route   PUT /api/restaurants/:restaurantId
 * @desc    Update restaurant profile details
 * @access  Private (Restaurant Owner)
 */
router.put(
  "/:restaurantId",
  protect,
  restrictTo("restaurant"), // Ensure only users with 'restaurant' role (assumed to be owners for their own restaurant)
  validateObjectId("restaurantId"),
  validateRestaurantProfileUpdate,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        // This should ideally be caught by 'protect' middleware, but defensive check
        return next(new AppError("Authentication required.", 401));
      }

      // The restrictTo('restaurant') ensures the user has the general role.
      // The service layer (RestaurantService.updateRestaurantProfile) will verify ownership (user.id === restaurant.owner)

      const updateData = req.body as RestaurantProfileUpdateData;

      const updatedRestaurant = await RestaurantService.updateRestaurantProfile(
        restaurantId,
        userId,
        updateData
      );

      res.status(200).json({
        message: "Restaurant profile updated successfully.",
        restaurant: updatedRestaurant,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Validation for staff invite
const validateStaffInvite = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required for invitation.")
    .normalizeEmail(),
  // Potentially add 'name' or 'professionalRole' if inviting and creating a placeholder user immediately
];

/**
 * @route   POST /api/restaurants/:restaurantId/staff/invite
 * @desc    Invite a new staff member to the restaurant
 * @access  Private (Restaurant Owner)
 */
router.post(
  "/:restaurantId/staff/invite",
  protect,
  restrictTo("restaurant"),
  validateObjectId("restaurantId"),
  validateStaffInvite,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId } = req.params;
      const invitingUserId = req.user?.userId;
      const { email: staffEmailToInvite } = req.body; // Add other fields like name, role if needed

      if (!invitingUserId) {
        return next(new AppError("Authentication required.", 401));
      }

      // RestaurantService will handle logic including ownership check and user creation/linking
      await RestaurantService.inviteStaffToRestaurant(
        restaurantId,
        invitingUserId,
        staffEmailToInvite /*, other details */
      );

      res.status(200).json({
        message: `Invitation successfully sent to ${staffEmailToInvite}.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/restaurants/:restaurantId
 * @desc    Delete a restaurant (and handle its staff)
 * @access  Private (Restaurant Owner)
 */
router.delete(
  "/:restaurantId",
  protect,
  restrictTo("restaurant"),
  validateObjectId("restaurantId"),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError("Authentication required.", 401));
      }

      // RestaurantService.deleteRestaurant will handle ownership check and cascading logic
      await RestaurantService.deleteRestaurant(restaurantId, userId);

      res
        .status(200)
        .json({
          message: "Restaurant and associated data deleted successfully.",
        });
    } catch (error) {
      next(error);
    }
  }
);

// Future: Add other restaurant-specific routes here (e.g., GET /:restaurantId, DELETE /:restaurantId)

export default router;
