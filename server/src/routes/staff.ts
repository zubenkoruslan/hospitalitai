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
import { Types } from "mongoose"; // ADDED: Import Types for ObjectId conversion
import { body } from "express-validator"; // ADDED: For request body validation

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

// /**
//  * @route   PATCH /api/staff/:id
//  * @desc    Update professional role for a specific staff member
//  * @access  Private (Restaurant Role)
//  */
// router.patch(
//   "/:id",
//   validateStaffIdParam, // Added validator
//   validateProfessionalRoleBody, // Added validator
//   handleValidationErrors, // Added error handler
//   async (req: Request, res: Response, next: NextFunction): Promise<any> => {
//     const restaurantId = req.user?.restaurantId;
//     const { id: staffId } = req.params;
//     const { professionalRole } = req.body;
//
//     if (!restaurantId) {
//       // This check remains for now
//       return next(new AppError("Restaurant ID not found for user.", 400));
//     }
//     // Removed: mongoose.Types.ObjectId.isValid(staffId) check (handled by validateStaffIdParam)
//     // Removed: professionalRole === undefined check (handled by validateProfessionalRoleBody)
//
//     try {
//       const staffResponse = await StaffService.updateStaffMemberRole(
//         staffId,
//         professionalRole,
//         restaurantId
//       );
//       res.status(200).json({
//         message: "Staff details updated successfully.",
//         staff: staffResponse,
//       });
//     } catch (error: any) {
//       next(error);
//     }
//   }
// );

// UPDATED: Route to update staff's assigned role
/**
 * @route   PATCH /api/staff/:id/assigned-role
 * @desc    Update the assigned Role for a specific staff member. Send null to unassign.
 * @access  Private (Restaurant Role)
 */
router.patch(
  "/:id/assigned-role", // Changed path
  validateStaffIdParam, // Validates req.params.id as staffId
  [
    body("assignedRoleId")
      .optional({ nullable: true }) // Allows it to be absent or explicitly null
      .custom((value: any) => {
        // Custom validator to check for MongoId only if value is not null and not undefined
        if (value !== null && value !== undefined) {
          if (!Types.ObjectId.isValid(value)) {
            throw new Error(
              "assignedRoleId must be a valid MongoDB ObjectId string if provided."
            );
          }
        }
        return true; // Pass validation if null, undefined, or a valid ObjectId
      }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const restaurantId = req.user?.restaurantId;
    const { id: staffId } = req.params;
    // Body can contain assignedRoleId: string | null, or it might be undefined if not sent
    const {
      assignedRoleId: assignedRoleIdString,
    }: { assignedRoleId?: string | null } = req.body;

    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }

    try {
      let assignedRoleObjectId: Types.ObjectId | null = null;
      if (assignedRoleIdString !== null && assignedRoleIdString !== undefined) {
        // We already validated it's a valid ObjectId string if present and not null
        assignedRoleObjectId = new Types.ObjectId(assignedRoleIdString);
      } else if (assignedRoleIdString === null) {
        // Explicitly passed as null to unassign
        assignedRoleObjectId = null;
      }
      // If assignedRoleIdString is undefined (not in body), assignedRoleObjectId remains null,
      // which means StaffService.updateStaffAssignedRole will effectively unassign or make no change if already null.
      // Depending on desired behavior, one might want to throw an error if it's undefined and an update is expected.
      // For now, undefined or null both lead to unassignment or no change.

      const updatedStaff = await StaffService.updateStaffAssignedRole(
        staffId,
        assignedRoleObjectId, // Pass ObjectId or null
        restaurantId
      );

      // StaffService.updateStaffAssignedRole throws AppError if staff not found.
      // So, no need to check for !updatedStaff here if that service handles it.
      // The previous code had a check, but the new service method seems robust.

      res.status(200).json({
        message: "Staff assigned role updated successfully.", // Updated message
        staff: updatedStaff,
      });
    } catch (error) {
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
