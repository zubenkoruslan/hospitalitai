import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import NotificationService, {
  CreateNotificationData,
} from "../services/notificationService";
import { AppError } from "../utils/errorHandler";

// Extend the Request interface to include user data
interface AuthenticatedRequest extends Request {
  user?: {
    userId: Types.ObjectId;
    restaurantId?: Types.ObjectId;
    role: string;
    name: string;
  };
}

/**
 * Get all notifications for the authenticated user
 * GET /api/notifications
 */
export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Admin users don't need restaurantId, but other users do
    if (req.user.role !== "admin" && !req.user.restaurantId) {
      return next(new AppError("Missing required restaurant data", 401));
    }

    const limit = parseInt(req.query.limit as string) || 50;

    // Admin users get platform-wide notifications (or empty array for now)
    if (req.user.role === "admin") {
      // For now, admins don't have notifications - return empty array
      const notifications: any[] = [];
      return res.status(200).json({
        status: "success",
        notifications,
      });
    }

    const notifications = await NotificationService.getNotificationsForUser(
      req.user.userId,
      req.user.restaurantId!,
      limit
    );

    res.status(200).json({
      status: "success",
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count for the authenticated user
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Admin users don't need restaurantId, but other users do
    if (req.user.role !== "admin" && !req.user.restaurantId) {
      return next(new AppError("Missing required restaurant data", 401));
    }

    // Admin users get 0 unread count for now
    if (req.user.role === "admin") {
      return res.status(200).json({
        status: "success",
        count: 0,
      });
    }

    const count = await NotificationService.getUnreadCount(
      req.user.userId,
      req.user.restaurantId!
    );

    res.status(200).json({
      status: "success",
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a notification as read
 * PUT /api/notifications/:id
 */
export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Admin users don't need restaurantId, but other users do
    if (req.user.role !== "admin" && !req.user.restaurantId) {
      return next(new AppError("Missing required restaurant data", 401));
    }

    // Admin users don't have notifications to mark as read
    if (req.user.role === "admin") {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    const notificationId = new Types.ObjectId(req.params.id);
    const notification = await NotificationService.markAsRead(
      notificationId,
      req.user.userId,
      req.user.restaurantId!
    );

    res.status(200).json({
      status: "success",
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/mark-all-read
 */
export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Admin users don't need restaurantId, but other users do
    if (req.user.role !== "admin" && !req.user.restaurantId) {
      return next(new AppError("Missing required restaurant data", 401));
    }

    // Admin users don't have notifications to mark as read
    if (req.user.role === "admin") {
      return res.status(200).json({
        status: "success",
        message: "0 notifications marked as read",
        modifiedCount: 0,
      });
    }

    const result = await NotificationService.markAllAsRead(
      req.user.userId,
      req.user.restaurantId!
    );

    res.status(200).json({
      status: "success",
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Admin users don't need restaurantId, but other users do
    if (req.user.role !== "admin" && !req.user.restaurantId) {
      return next(new AppError("Missing required restaurant data", 401));
    }

    // Admin users don't have notifications to delete
    if (req.user.role === "admin") {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    const notificationId = new Types.ObjectId(req.params.id);
    await NotificationService.deleteNotification(
      notificationId,
      req.user.userId,
      req.user.restaurantId!
    );

    res.status(200).json({
      status: "success",
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new notification (typically used internally)
 * POST /api/notifications
 */
export const createNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Admin users don't need restaurantId, but other users do
    if (req.user.role !== "admin" && !req.user.restaurantId) {
      return next(new AppError("Missing required restaurant data", 401));
    }

    const notificationData: CreateNotificationData = {
      type: req.body.type,
      content: req.body.content,
      relatedId: req.body.relatedId
        ? new Types.ObjectId(req.body.relatedId)
        : undefined,
      metadata: req.body.metadata,
      userId: req.body.userId
        ? new Types.ObjectId(req.body.userId)
        : req.user.userId,
      restaurantId: req.user.restaurantId || new Types.ObjectId(), // Admin users can use a placeholder
    };

    const notification = await NotificationService.createNotification(
      notificationData
    );

    res.status(201).json({
      status: "success",
      notification,
    });
  } catch (error) {
    next(error);
  }
};
