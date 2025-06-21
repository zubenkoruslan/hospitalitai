import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  Notification as ApiNotification,
} from "../services/api";

// Using Notification interface from API services

// Interface for notification context values
interface NotificationContextType {
  notifications: ApiNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotificationById: (notificationId: string) => Promise<void>;
  clearError: () => void;
}

// Create context with default values
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Props for NotificationProvider
interface NotificationProviderProps {
  children: ReactNode;
}

// Provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err.response?.data?.message || "Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err: any) {
      console.error("Error fetching unread count:", err);
      // Don't set error for unread count failures, it's non-critical
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error("Error marking notification as read:", err);
      setError(
        err.response?.data?.message || "Failed to mark notification as read"
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err: any) {
      console.error("Error marking all notifications as read:", err);
      setError(
        err.response?.data?.message ||
          "Failed to mark all notifications as read"
      );
    }
  }, []);

  const deleteNotificationById = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotification(notificationId);

        // Update local state
        setNotifications((prev) => {
          const deletedNotification = prev.find(
            (n) => n._id === notificationId
          );

          // Update unread count if the deleted notification was unread
          if (deletedNotification && !deletedNotification.isRead) {
            setUnreadCount((current) => Math.max(0, current - 1));
          }

          return prev.filter(
            (notification) => notification._id !== notificationId
          );
        });
      } catch (err: any) {
        console.error("Error deleting notification:", err);
        setError(
          err.response?.data?.message || "Failed to delete notification"
        );
      }
    },
    [] // Remove notifications dependency since we use functional updates
  );

  // Auto-fetch notifications and unread count when user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Auto-refresh unread count periodically (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    clearError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

// Export the hook separately to fix Fast Refresh
export { useNotifications };

// Removed default export to fix Fast Refresh compatibility
// Use named exports: NotificationProvider and useNotifications
