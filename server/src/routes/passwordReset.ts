import express, { Request, Response, NextFunction } from "express";
import { body, param } from "express-validator";
import { PasswordResetService } from "../services/passwordResetService";
import { handleValidationErrors } from "../middleware/validationMiddleware";

const router = express.Router();
const passwordResetService = new PasswordResetService();

// Validation middleware
const validateForgotPassword = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];

const validateResetPassword = [
  param("token")
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid reset token"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const validateVerifyToken = [
  param("token")
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid reset token"),
];

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  "/forgot-password",
  validateForgotPassword,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const result = await passwordResetService.requestPasswordReset(email);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/verify-reset-token/:token
 * Verify if reset token is valid (for UI feedback)
 */
router.get(
  "/verify-reset-token/:token",
  validateVerifyToken,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      const result = await passwordResetService.verifyResetToken(token);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password/:token
 * Reset password using token
 */
router.post(
  "/reset-password/:token",
  validateResetPassword,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const result = await passwordResetService.resetPassword(token, password);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/cleanup-expired-tokens
 * Cleanup expired password reset tokens (admin/maintenance endpoint)
 */
router.post(
  "/cleanup-expired-tokens",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await passwordResetService.cleanupExpiredTokens();

      res.status(200).json({
        message: `Cleaned up ${result.deletedCount} expired password reset tokens`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
