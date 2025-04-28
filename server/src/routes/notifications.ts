import express, { Request, Response, Router, NextFunction } from "express";
import Notification from "../models/Notification";
import { protect } from "../middleware/authMiddleware";
import mongoose from "mongoose";

const router: Router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for a user
 * @access  Private
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      // Parse query parameters for pagination and filtering
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const isRead = req.query.isRead ? req.query.isRead === "true" : undefined;
      const type = req.query.type as string;

      // Build query
      const query: any = { recipient: userId };

      if (isRead !== undefined) {
        query.isRead = isRead;
      }

      if (type) {
        query.type = type;
      }

      // Get total count for pagination
      const total = await Notification.countDocuments(query);

      // Get notifications with pagination
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 }) // Sort by newest first
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        notifications,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching notifications", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get(
  "/unread-count",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @route   PUT /api/notifications/:id
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put(
  "/:id",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const notificationId = req.params.id;

      // Verify object ID
      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        res.status(400).json({ message: "Invalid notification ID" });
        return;
      }

      // Find notification and update
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        res.status(404).json({ message: "Notification not found" });
        return;
      }

      res.json(notification);
    } catch (error) {
      console.error("Error updating notification", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  "/mark-all-read",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );

      res.json({
        message: "All notifications marked as read",
        count: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error marking all notifications as read", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete(
  "/:id",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const notificationId = req.params.id;

      // Verify object ID
      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        res.status(400).json({ message: "Invalid notification ID" });
        return;
      }

      // Find notification and delete
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId,
      });

      if (!notification) {
        res.status(404).json({ message: "Notification not found" });
        return;
      }

      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
