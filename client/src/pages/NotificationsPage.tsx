import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const { user } = useAuth();
  const isRestaurant = user?.role === "restaurant";
  const isStaff = user?.role === "staff";

  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications based on selected filter and search term
  const filteredNotifications = notifications.filter((notification) => {
    // Apply type filter
    if (filter !== "all" && notification.type !== filter) {
      return false;
    }

    // Apply search term filter
    if (
      searchTerm &&
      !notification.content.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Function to get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_assignment":
        return (
          <div className="p-2 bg-blue-100 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
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
          </div>
        );
      case "completed_training":
        return (
          <div className="p-2 bg-green-100 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "new_staff":
        return (
          <div className="p-2 bg-purple-100 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-purple-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        );
      case "new_quiz":
        return (
          <div className="p-2 bg-yellow-100 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-yellow-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
    }
  };

  // Function to get notification label
  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "new_assignment":
        return "New Assignment";
      case "completed_training":
        return "Completed Training";
      case "new_staff":
        return "New Staff";
      case "new_quiz":
        return "New Quiz";
      default:
        return "Notification";
    }
  };

  // Function to handle mark all as read
  const handleMarkAllAsRead = () => {
    if (notifications.some((n) => !n.isRead)) {
      markAllAsRead();
    }
  };

  const hasUnreadNotifications = notifications.some((n) => !n.isRead);

  // Function to handle notification click with role-based redirects
  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification._id);

    // Debug notification data
    console.log("Clicked notification in page:", notification);
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
            console.log("Fetching quiz result details for:", resultId);
            // Try to fetch the result to get the staff ID
            const response = await api.get(`/api/results/${resultId}/detail`);
            console.log("API response:", response.data);

            if (response.data && response.data.result) {
              console.log("Navigating to quiz result:", resultId);
              // Navigate directly to the result
              navigate(`/quiz-results/${resultId}`);
              return;
            } else {
              console.log("Quiz result data not found in response");
            }
          } catch (error) {
            console.error("Error fetching quiz result:", error);
            if (error.response) {
              console.error("Error response status:", error.response.status);
              console.error("Error response data:", error.response.data);
            }

            // Fallback navigation
            console.log("Using fallback navigation to /staff/results");
            navigate("/staff/results");
            return;
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
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <button
            onClick={handleMarkAllAsRead}
            className={`px-4 py-2 rounded-md transition-colors ${
              hasUnreadNotifications
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!hasUnreadNotifications}
          >
            Mark all as read
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Filter and search section */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-md ${
                    filter === "all"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  All
                </button>

                {/* Show New Quiz filter for staff */}
                {isStaff && (
                  <button
                    onClick={() => setFilter("new_quiz")}
                    className={`px-3 py-1 rounded-md ${
                      filter === "new_quiz"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    New Quizzes
                  </button>
                )}

                {/* Show Completed Training filter only for restaurant */}
                {isRestaurant && (
                  <button
                    onClick={() => setFilter("completed_training")}
                    className={`px-3 py-1 rounded-md ${
                      filter === "completed_training"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Completed
                  </button>
                )}

                {/* Show New Staff filter only for restaurant */}
                {isRestaurant && (
                  <button
                    onClick={() => setFilter("new_staff")}
                    className={`px-3 py-1 rounded-md ${
                      filter === "new_staff"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    New Staff
                  </button>
                )}
              </div>

              <div className="flex-1 md:ml-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    className="w-full p-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications list */}
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {notifications.length === 0
                ? "No notifications yet"
                : "No notifications match your filters"}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <li
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-4">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium rounded-full px-2 py-0.5 mr-2 bg-gray-200 text-gray-700">
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                            }
                          )}
                        </span>
                        {!notification.isRead && (
                          <span className="ml-2 inline-flex items-center justify-center h-2 w-2 rounded-full bg-blue-500"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">
                        {notification.content}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 ml-2 space-x-2 self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the li's onClick
                          deleteNotification(notification._id);
                        }}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        aria-label="Delete notification"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;
