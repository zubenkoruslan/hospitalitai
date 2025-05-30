import express, { Request, Response, NextFunction } from "express";
import { body, param } from "express-validator";
import { InvitationService } from "../services/invitationService";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { handleValidationErrors } from "../middleware/validationMiddleware";

const router = express.Router();
const invitationService = new InvitationService();

// Validation middleware
const validateInviteStaff = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Name must not be empty"),
  body("assignedRoleId").optional().isMongoId().withMessage("Invalid role ID"),
];

const validateAcceptInvitation = [
  param("token")
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid invitation token"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Name must not be empty"),
];

// Send staff invitation (Restaurant owners only)
router.post(
  "/staff",
  protect,
  restrictTo("restaurant"),
  validateInviteStaff,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, name, assignedRoleId } = req.body;
      const restaurantId = req.user?.restaurantId?.toString();
      const invitedByUserId = req.user?.userId?.toString();

      if (!restaurantId || !invitedByUserId) {
        res.status(400).json({
          message: "Restaurant ID or user ID not found",
        });
        return;
      }

      const result = await invitationService.createStaffInvitation(
        restaurantId,
        invitedByUserId,
        email,
        { name, assignedRoleId }
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get invitation details (Public route)
router.get(
  "/details/:token",
  param("token").isLength({ min: 64, max: 64 }),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const invitation = await invitationService.getInvitationByToken(token);
      res.status(200).json(invitation);
    } catch (error) {
      next(error);
    }
  }
);

// Accept invitation (Public route)
router.post(
  "/accept/:token",
  validateAcceptInvitation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const { password, name } = req.body;

      const result = await invitationService.acceptInvitation(token, {
        password,
        name,
      });

      res.status(201).json({
        message: "Invitation accepted successfully",
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get restaurant's pending invitations (Restaurant owners only)
router.get(
  "/restaurant",
  protect,
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId?.toString();

      if (!restaurantId) {
        res.status(400).json({
          message: "Restaurant ID not found",
        });
        return;
      }

      const invitations = await invitationService.getRestaurantInvitations(
        restaurantId
      );

      res.status(200).json({
        invitations,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cancel invitation (Restaurant owners only)
router.delete(
  "/:invitationId",
  protect,
  restrictTo("restaurant"),
  param("invitationId").isMongoId().withMessage("Invalid invitation ID"),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { invitationId } = req.params;
      const restaurantId = req.user?.restaurantId?.toString();

      if (!restaurantId) {
        res.status(400).json({
          message: "Restaurant ID not found",
        });
        return;
      }

      const result = await invitationService.cancelInvitation(
        invitationId,
        restaurantId
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
