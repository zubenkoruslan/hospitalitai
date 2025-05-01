import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

// Interface for notification objects
interface Notification {
  _id: string;
  type: "new_assignment" | "completed_training" | "new_staff" | "new_quiz";
  content: string;
  isRead: boolean;
  relatedId?: string;
  metadata?: {
    staffId?: string;
    quizId?: string;
    [key: string]: any;
  };
  createdAt: string;
}

// Interface for notification context values
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (
    notification: Omit<Notification, "_id" | "createdAt">
  ) => Promise<void>;
}

// Create context with default values
const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  addNotification: async () => {},
});

// Props for NotificationProvider
interface NotificationProviderProps {
  children: ReactNode;
}

// Provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { token, isLoading } = useAuth();

  // Use refs to track active fetch operations and prevent duplicate calls
  const isFetchingNotifications = useRef(false);
  const isFetchingUnreadCount = useRef(false);
  const lastFetchTime = useRef(0);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const networkErrorCount = useRef(0);

  // Debounce function to prevent too many API calls
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ) => {
    let timeoutId: number;
    return (...args: Parameters<T>): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Function to safely make API calls with retry logic
  const safeApiCall = async <T,>(
    apiCallFn: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      return await apiCallFn();
    } catch (err: any) {
      console.error(`${errorMessage}:`, err);

      // Only increment network error count for network-related errors
      if (
        !err.response ||
        err.code === "ECONNABORTED" ||
        err.message.includes("Network Error")
      ) {
        networkErrorCount.current += 1;

        // If we have consistent network errors, increase the polling interval dynamically
        if (networkErrorCount.current > 2) {
          console.log(
            "Multiple network errors detected, reducing polling frequency"
          );
        }
      }

      return null;
    }
  };

  // Function to fetch notifications from the API with debouncing and error handling
  const fetchNotifications = useCallback(async () => {
    if (!token || isLoading || isFetchingNotifications.current) return;

    // Debounce requests to prevent overloading
    const now = Date.now();
    if (now - lastFetchTime.current < 3000) {
      // Increased from 2000ms to 3000ms
      console.log("Skipping fetch - too soon since last fetch");
      return;
    }

    lastFetchTime.current = now;
    isFetchingNotifications.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response && response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(
          (response.data.notifications || []).filter(
            (n: Notification) => !n.isRead
          ).length
        );
        networkErrorCount.current = 0; // Reset network error counter on success
        retryCount.current = 0;
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);

      // Only set error in UI for non-network errors
      if (err.response) {
        setError(
          err.response?.data?.message || "Failed to fetch notifications"
        );
      } else {
        console.log(
          "Network error when fetching notifications - will retry later"
        );
      }

      // Keep existing notifications instead of clearing on error
    } finally {
      setLoading(false);
      isFetchingNotifications.current = false;
    }
  }, [token, isLoading]);

  // Function to fetch unread count with better error handling
  const fetchUnreadCount = useCallback(async () => {
    if (!token || isLoading || isFetchingUnreadCount.current) return;

    isFetchingUnreadCount.current = true;

    try {
      const response = await api.get("/notifications/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 8000, // 8 second timeout
      });

      if (response && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (err: any) {
      console.error("Error fetching unread count:", err);
      // Don't update UI state on network errors for count
    } finally {
      isFetchingUnreadCount.current = false;
    }
  }, [token, isLoading]);

  // Debounced version of fetch functions with Promise support
  const debouncedFetchNotifications = useCallback(() => {
    return new Promise<void>((resolve) => {
      debounce(() => {
        fetchNotifications().then(resolve);
      }, 500)(); // Increased from 300ms to 500ms
    });
  }, [fetchNotifications]);

  const debouncedFetchUnreadCount = useCallback(() => {
    return new Promise<void>((resolve) => {
      debounce(() => {
        fetchUnreadCount().then(resolve);
      }, 500)(); // Increased from 300ms to 500ms
    });
  }, [fetchUnreadCount]);

  // Function to mark a notification as read with better error handling
  const markAsRead = async (id: string) => {
    if (!token) return;

    // Update local state optimistically
    setNotifications((prev) =>
      prev.map((notification) =>
        notification._id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );
    setUnreadCount((prev) => {
      const notification = notifications.find((n) => n._id === id);
      return notification && !notification.isRead ? prev - 1 : prev;
    });

    try {
      await api.put(
        `/notifications/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 8000,
        }
      );
    } catch (err: any) {
      console.error("Error marking notification as read:", err);

      // Revert the optimistic update if there's a non-network error
      if (err.response) {
        setError(
          err.response?.data?.message || "Failed to mark notification as read"
        );

        // Revert the optimistic update
        setNotifications((prev) => [...prev]); // Trigger re-render
        await debouncedFetchNotifications(); // Reload actual state
      }
    }
  };

  // Function to mark all notifications as read with better error handling
  const markAllAsRead = async () => {
    if (!token) return;

    // Update local state optimistically
    const previousNotifications = [...notifications];
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);

    try {
      await api.put(
        "/notifications/mark-all-read",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 8000,
        }
      );
    } catch (err: any) {
      console.error("Error marking all notifications as read:", err);

      // Revert optimistic update on non-network errors
      if (err.response) {
        setError(
          err.response?.data?.message ||
            "Failed to mark all notifications as read"
        );

        // Revert the optimistic updates
        setNotifications(previousNotifications);
        setUnreadCount(previousNotifications.filter((n) => !n.isRead).length);
      }
    }
  };

  // Function to delete a notification with better error handling
  const deleteNotification = async (id: string) => {
    if (!token) return;

    // Optimistic update
    const previousNotifications = [...notifications];
    const deletedNotification = notifications.find((n) => n._id === id);

    setNotifications((prev) =>
      prev.filter((notification) => notification._id !== id)
    );

    // Update unread count if we're deleting an unread notification
    if (deletedNotification && !deletedNotification.isRead) {
      setUnreadCount((prev) => prev - 1);
    }

    try {
      await api.delete(`/notifications/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 8000,
      });
    } catch (err: any) {
      console.error("Error deleting notification:", err);

      // Revert optimistic update on non-network errors
      if (err.response) {
        setError(
          err.response?.data?.message || "Failed to delete notification"
        );
        setNotifications(previousNotifications);
        setUnreadCount(previousNotifications.filter((n) => !n.isRead).length);
      }
    }
  };

  // Function to add a new notification (to be called from other components that trigger notifications)
  const addNotification = async (
    notification: Omit<Notification, "_id" | "createdAt">
  ) => {
    if (!token) return;

    try {
      const response = await api.post("/notifications", notification, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 8000,
      });

      if (response && response.data) {
        // Add the new notification to state
        setNotifications((prev) => [response.data.notification, ...prev]);

        // Update unread count if the new notification is unread
        if (!notification.isRead) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    } catch (err: any) {
      console.error("Error adding notification:", err);
      if (err.response) {
        setError(err.response?.data?.message || "Failed to add notification");
      }
    }
  };

  // Initial fetch of notifications on mount
  useEffect(() => {
    if (token && !isLoading) {
      fetchNotifications();
    }
  }, [token, isLoading, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications: debouncedFetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;
