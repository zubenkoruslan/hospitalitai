import Notification, { INotification } from "../models/Notification";
import { Types } from "mongoose";
import { AppError } from "../utils/errorHandler";

export interface CreateNotificationData {
  type: "new_assignment" | "completed_training" | "new_staff" | "new_quiz";
  content: string;
  relatedId?: Types.ObjectId;
  metadata?: {
    staffId?: Types.ObjectId;
    quizId?: Types.ObjectId;
    [key: string]: any;
  };
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
}

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(
    data: CreateNotificationData
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        type: data.type,
        content: data.content,
        relatedId: data.relatedId,
        metadata: data.metadata || {},
        userId: data.userId,
        restaurantId: data.restaurantId,
        isRead: false,
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new AppError("Failed to create notification", 500);
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotificationsForUser(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId,
    limit: number = 50
  ): Promise<INotification[]> {
    try {
      const notifications = await Notification.find({
        userId: userId,
        restaurantId: restaurantId,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();

      return notifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw new AppError("Failed to fetch notifications", 500);
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<number> {
    try {
      const count = await Notification.countDocuments({
        userId: userId,
        restaurantId: restaurantId,
        isRead: false,
      });

      return count;
    } catch (error) {
      console.error("Error counting unread notifications:", error);
      throw new AppError("Failed to count unread notifications", 500);
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<INotification | null> {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: notificationId,
          userId: userId,
          restaurantId: restaurantId,
        },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        throw new AppError("Notification not found", 404);
      }

      return notification;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error marking notification as read:", error);
      throw new AppError("Failed to mark notification as read", 500);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ modifiedCount: number }> {
    try {
      const result = await Notification.updateMany(
        {
          userId: userId,
          restaurantId: restaurantId,
          isRead: false,
        },
        { isRead: true }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw new AppError("Failed to mark all notifications as read", 500);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<boolean> {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        userId: userId,
        restaurantId: restaurantId,
      });

      if (!result) {
        throw new AppError("Notification not found", 404);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error deleting notification:", error);
      throw new AppError("Failed to delete notification", 500);
    }
  }

  /**
   * Create notifications for multiple users (bulk operation)
   */
  async createBulkNotifications(
    notifications: CreateNotificationData[]
  ): Promise<INotification[]> {
    try {
      const createdNotifications = await Notification.insertMany(
        notifications.map((data) => ({
          ...data,
          isRead: false,
        }))
      );

      return createdNotifications;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      throw new AppError("Failed to create bulk notifications", 500);
    }
  }

  /**
   * Clean up old notifications (can be used in a cron job)
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
      throw new AppError("Failed to cleanup old notifications", 500);
    }
  }
}

export default new NotificationService();
