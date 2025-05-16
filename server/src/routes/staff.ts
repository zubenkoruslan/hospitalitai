import express, { Request, Response, Router, NextFunction } from "express";
// import mongoose as _mongoose from "mongoose"; // Removing unused mongoose import
import { protect, restrictTo } from "../middleware/authMiddleware";
import StaffService from "../services/staffService"; // Import the new service
import { AppError } from "../utils/errorHandler"; // Import AppError for consistency
import {
  handleValidationErrors,
  validateStaffIdParam,
  validateProfessionalRoleBody,
} from "../middleware/validationMiddleware";

const router: Router = express.Router();

// --- Middleware: Apply to all routes in this file ---
router.use(protect); // Ensure user is logged in
router.use(restrictTo("restaurant")); // Ensure user is a restaurant owner

// --- Routes ---

/**
 * @route   GET /api/staff
 * @desc    Get all staff members with average scores
 * @access  Private (Restaurant Role)
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }

    try {
      // Delegate fetching and processing to the service
      const staffWithData = await StaffService.getStaffListWithAverages(
        restaurantId
      );
      res.status(200).json({ staff: staffWithData });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/staff/:id
 * @desc    Get details for a specific staff member
 * @access  Private (Restaurant Role)
 */
router.get(
  "/:id",
  validateStaffIdParam, // Added validator
  handleValidationErrors, // Added error handler
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    const { id: staffId } = req.params;

    if (!restaurantId) {
      // This check remains for now
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    // Removed: mongoose.Types.ObjectId.isValid(staffId) check (handled by validateStaffIdParam)

    try {
      const responseData = await StaffService.getStaffMemberDetails(
        staffId,
        restaurantId
      );
      res.status(200).json({ staff: responseData });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/staff/:id
 * @desc    Update professional role for a specific staff member
 * @access  Private (Restaurant Role)
 */
router.patch(
  "/:id",
  validateStaffIdParam, // Added validator
  validateProfessionalRoleBody, // Added validator
  handleValidationErrors, // Added error handler
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    const { id: staffId } = req.params;
    const { professionalRole } = req.body;

    if (!restaurantId) {
      // This check remains for now
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    // Removed: mongoose.Types.ObjectId.isValid(staffId) check (handled by validateStaffIdParam)
    // Removed: professionalRole === undefined check (handled by validateProfessionalRoleBody)

    try {
      const staffResponse = await StaffService.updateStaffMemberRole(
        staffId,
        professionalRole,
        restaurantId
      );
      res.status(200).json({
        message: "Staff details updated successfully.",
        staff: staffResponse,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/staff/:id
 * @desc    Delete a specific staff member and their associated quiz results
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:id",
  validateStaffIdParam, // Added validator
  handleValidationErrors, // Added error handler
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    const { id: staffId } = req.params;

    if (!restaurantId) {
      // This check remains for now
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    // Removed: mongoose.Types.ObjectId.isValid(staffId) check (handled by validateStaffIdParam)

    try {
      await StaffService.deleteStaffMember(staffId, restaurantId);
      res.status(200).json({ message: "Staff member deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
