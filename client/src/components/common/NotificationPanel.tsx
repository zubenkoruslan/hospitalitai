import React, { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "../../context/NotificationContext";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    deleteNotification,
  } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Function to handle notification click with role-based redirects
  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification._id);
    onClose();

    // Debug notification data
    console.log("Clicked notification:", notification);
    console.log("Notification type:", notification.type);
    console.log("Notification metadata:", notification.metadata);
    console.log("User role:", user?.role);

    // Role-based redirects
    if (user?.role === "staff") {
      if (notification.type === "new_quiz") {
        navigate("/staff/quizzes");
        return;
      }
    } else if (user?.role === "restaurant") {
      if (
        notification.type === "completed_training" ||
        notification.type === "new_staff"
      ) {
        console.log(
          "Should redirect to staff details with ID:",
          notification.metadata?.staffId
        );

        let staffId;
        let resultId;

        // Try getting staffId from metadata first
        if (notification.metadata?.staffId) {
          staffId = notification.metadata.staffId;

          // For completed training, also get resultId if available
          if (notification.type === "completed_training") {
            resultId = notification.metadata.resultId || notification.relatedId;
          }
        }
        // For new_staff notifications, relatedId IS the staffId
        else if (notification.type === "new_staff" && notification.relatedId) {
          staffId = notification.relatedId;
        }
        // For completed_training, relatedId is the resultId
        else if (
          notification.type === "completed_training" &&
          notification.relatedId
        ) {
          // For older notifications, relatedId is the resultId
          resultId = notification.relatedId;

          try {
            // Try to fetch the result to get the staff ID
            const response = await api.get(`/api/results/${resultId}/detail`);
            if (response.data && response.data.result) {
              // Navigate directly to the result
              navigate(`/quiz-results/${resultId}`);
              return;
            }
          } catch (error) {
            console.error("Error fetching quiz result:", error);
          }
        }

        console.log("Using staffId:", staffId);
        console.log("Using resultId:", resultId);

        if (staffId) {
          // For completed training with resultId, include it in the URL
          if (notification.type === "completed_training" && resultId) {
            navigate(`/staff/${staffId}?resultId=${resultId}`);
            return;
          }

          // Otherwise just go to the staff profile
          navigate(`/staff/${staffId}`);
          return;
        } else if (resultId) {
          // If we have a resultId but no staffId, go to the result directly
          navigate(`/quiz-results/${resultId}`);
          return;
        } else {
          console.log("No staffId or resultId found in notification");
        }
      }
    }

    // Default redirect if no specific redirect is configured
    navigate("/notifications");
  };

  // Function to get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_assignment":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "completed_training":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "new_staff":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-purple-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
        );
      case "new_quiz":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-700">Notifications</h3>
        <div className="flex space-x-2">
          <Link
            to="/notifications"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            View all
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <div
              key={notification._id}
              className={`p-4 hover:bg-gray-50 ${
                !notification.isRead ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="block w-full text-left text-sm font-medium text-gray-900 hover:text-blue-700"
                  >
                    {notification.content}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <button
                  onClick={() => deleteNotification(notification._id)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  aria-label="Delete notification"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 5 && (
        <div className="p-3 bg-gray-50 border-t text-center">
          <Link
            to="/notifications"
            onClick={onClose}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View all ({notifications.length}) notifications
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
