import express, { Request, Response, Router, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import User from "../models/User"; // Staff and Restaurant are Users
import QuizResult from "../models/QuizResult";
import Quiz from "../models/Quiz";
import QuizResultService from "../services/quizResultService"; // Import the service
import StaffService from "../services/staffService"; // Import the new service
import { AppError } from "../utils/errorHandler"; // Import AppError for consistency

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
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    const { id: staffId } = req.params;

    // Basic validation
    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return next(new AppError("Invalid Staff ID format.", 400));
    }

    try {
      // Delegate fetching and processing to the service
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
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    const { id: staffId } = req.params;
    const { professionalRole } = req.body;

    // Basic validation
    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return next(new AppError("Invalid Staff ID format.", 400));
    }
    // Basic check for presence, service handles more detail
    if (professionalRole === undefined) {
      return next(new AppError("Professional role is required.", 400));
    }

    try {
      // Delegate update logic to the service
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
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    const { id: staffId } = req.params;

    // Basic validation
    if (!restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return next(new AppError("Invalid Staff ID format.", 400));
    }

    try {
      // Delegate deletion logic to the service
      await StaffService.deleteStaffMember(staffId, restaurantId);
      res.status(200).json({ message: "Staff member deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
