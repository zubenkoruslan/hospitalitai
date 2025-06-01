import React, { useState, useRef, useEffect } from "react";
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { BellIcon as BellSolidIcon } from "@heroicons/react/24/solid";
import { useNotifications } from "../../context/NotificationContext";
import { Notification } from "../../services/api";
import { Link } from "react-router-dom";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications = [],
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    clearError,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_quiz":
        return "🎯";
      case "completed_training":
        return "🎉";
      case "new_staff":
        return "👋";
      case "new_assignment":
        return "📋";
      default:
        return "📢";
    }
  };

  const getNotificationPriority = (type: Notification["type"]) => {
    switch (type) {
      case "new_quiz":
      case "new_assignment":
        return "high";
      case "completed_training":
        return "medium";
      case "new_staff":
        return "low";
      default:
        return "medium";
    }
  };

  const getPriorityColor = (priority: string, isRead: boolean) => {
    const opacity = isRead ? "opacity-60" : "";
    switch (priority) {
      case "high":
        return `border-l-4 border-red-400 ${opacity}`;
      case "medium":
        return `border-l-4 border-yellow-400 ${opacity}`;
      case "low":
        return `border-l-4 border-green-400 ${opacity}`;
      default:
        return `border-l-4 border-gray-400 ${opacity}`;
    }
  };

  // Group notifications by time periods
  const groupedNotifications = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as Notification[],
      yesterday: [] as Notification[],
      thisWeek: [] as Notification[],
      older: [] as Notification[],
    };

    notifications.forEach((notification) => {
      const notificationDate = new Date(notification.createdAt);

      if (notificationDate >= today) {
        groups.today.push(notification);
      } else if (notificationDate >= yesterday) {
        groups.yesterday.push(notification);
      } else if (notificationDate >= thisWeek) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  }, [notifications]);

  const renderNotificationGroup = (
    title: string,
    notifications: Notification[]
  ) => {
    if (notifications.length === 0) return null;

    return (
      <div key={title}>
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {title}
          </h4>
        </div>
        <div className="divide-y divide-gray-100">
          {notifications.slice(0, 3).map((notification) => {
            const priority = getNotificationPriority(notification.type);
            return (
              <div
                key={notification._id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? "bg-blue-50" : ""
                } ${getPriorityColor(priority, notification.isRead)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p
                          className={`text-sm ${
                            notification.isRead
                              ? "text-gray-600"
                              : "text-gray-900 font-medium"
                          }`}
                        >
                          {notification.content}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <ClockIcon className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                          {priority === "high" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification._id);
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors rounded"
                            title="Mark as read"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationById(notification._id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                          title="Delete notification"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Notification Bell Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="relative bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 ease-out flex items-center justify-center w-14 h-14 rounded-full group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`Notifications ${
              unreadCount > 0 ? `(${unreadCount} unread)` : ""
            }`}
          >
            {unreadCount > 0 ? (
              <BellSolidIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
            ) : (
              <BellIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
            )}

            {/* Improved Unread Count Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[1.5rem] h-6 border-2 border-white shadow-md animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Enhanced Dropdown Panel - Bottom Right Positioned */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute bottom-full right-0 mb-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
            >
              {/* Enhanced Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BellSolidIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                        title="Mark all as read"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-white/50"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Content with Loading States */}
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <LoadingSpinner />
                      <p className="text-sm text-gray-500 mt-3">
                        Loading notifications...
                      </p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="px-4 py-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                      <XMarkIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-sm text-red-600 mb-3 font-medium">
                      Unable to load notifications
                    </p>
                    <p className="text-xs text-gray-500 mb-4">{error}</p>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="secondary"
                        onClick={clearError}
                        className="text-xs"
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => window.location.reload()}
                        className="text-xs"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : !notifications || notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <BellIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      No notifications yet
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      You'll see updates about quizzes, training, and team
                      activities here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {/* Grouped Notifications */}
                    {renderNotificationGroup(
                      "Today",
                      groupedNotifications.today
                    )}
                    {renderNotificationGroup(
                      "Yesterday",
                      groupedNotifications.yesterday
                    )}
                    {renderNotificationGroup(
                      "This Week",
                      groupedNotifications.thisWeek
                    )}
                    {renderNotificationGroup(
                      "Older",
                      groupedNotifications.older
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <Link
                    to="/notifications"
                    className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
                    View All Notifications
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationBell;
