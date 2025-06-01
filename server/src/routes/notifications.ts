import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
} from "../controllers/notificationController";
import { protect } from "../middleware/authMiddleware";
import {
  handleValidationErrors,
  validateObjectId,
} from "../middleware/validationMiddleware";
import { body } from "express-validator";
import NotificationService from "../services/notificationService";
import { Types } from "mongoose";

const router = express.Router();

// All notification routes require authentication
router.use(protect);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 */
router.get("/", getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count for the authenticated user
 * @access  Private
 */
router.get("/unread-count", getUnreadCount);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read for the authenticated user
 * @access  Private
 */
router.put("/mark-all-read", markAllAsRead);

/**
 * @route   PUT /api/notifications/:id
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.put("/:id", validateObjectId("id"), handleValidationErrors, markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a specific notification
 * @access  Private
 */
router.delete(
  "/:id",
  validateObjectId("id"),
  handleValidationErrors,
  deleteNotification
);

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification (for internal use or admin)
 * @access  Private
 */
router.post(
  "/",
  [
    body("type")
      .isIn(["new_assignment", "completed_training", "new_staff", "new_quiz"])
      .withMessage("Invalid notification type"),
    body("content")
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Content must be between 1 and 500 characters"),
    body("relatedId")
      .optional()
      .isMongoId()
      .withMessage("Related ID must be a valid MongoDB ObjectId"),
    body("userId")
      .optional()
      .isMongoId()
      .withMessage("User ID must be a valid MongoDB ObjectId"),
    body("metadata")
      .optional()
      .isObject()
      .withMessage("Metadata must be an object"),
  ],
  handleValidationErrors,
  createNotification
);

export default router;
