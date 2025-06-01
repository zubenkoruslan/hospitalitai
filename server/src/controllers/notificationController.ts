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
    if (!req.user || !req.user.userId || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or missing required data", 401)
      );
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await NotificationService.getNotificationsForUser(
      req.user.userId,
      req.user.restaurantId,
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
    if (!req.user || !req.user.userId || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or missing required data", 401)
      );
    }

    const count = await NotificationService.getUnreadCount(
      req.user.userId,
      req.user.restaurantId
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
    if (!req.user || !req.user.userId || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or missing required data", 401)
      );
    }

    const notificationId = new Types.ObjectId(req.params.id);
    const notification = await NotificationService.markAsRead(
      notificationId,
      req.user.userId,
      req.user.restaurantId
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
    if (!req.user || !req.user.userId || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or missing required data", 401)
      );
    }

    const result = await NotificationService.markAllAsRead(
      req.user.userId,
      req.user.restaurantId
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
    if (!req.user || !req.user.userId || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or missing required data", 401)
      );
    }

    const notificationId = new Types.ObjectId(req.params.id);
    await NotificationService.deleteNotification(
      notificationId,
      req.user.userId,
      req.user.restaurantId
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
    if (!req.user || !req.user.userId || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or missing required data", 401)
      );
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
      restaurantId: req.user.restaurantId,
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
