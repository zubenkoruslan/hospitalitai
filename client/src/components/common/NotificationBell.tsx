import React, { useState, useRef, useEffect } from "react";
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { BellIcon as BellSolidIcon } from "@heroicons/react/24/solid";
import { useNotifications } from "../../context/NotificationContext";
import { Notification } from "../../services/api";
import { Link } from "react-router-dom";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldOpenRight, setShouldOpenRight] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications = [], // Add default empty array fallback
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    createTestNotificationsAction,
    clearError,
  } = useNotifications();

  // Check positioning when opening dropdown
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 384; // w-96 = 24rem = 384px
      const viewportWidth = window.innerWidth;

      // If the dropdown would go off the left edge of the screen, open it to the right
      const wouldOverflowLeft = buttonRect.left + dropdownWidth > viewportWidth;
      const hasSpaceOnRight = buttonRect.right + dropdownWidth <= viewportWidth;

      // Open to the right if it would overflow left and there's space on the right
      setShouldOpenRight(
        wouldOverflowLeft || buttonRect.left < dropdownWidth / 2
      );
    }
  }, [isOpen]);

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

  const getNotificationColor = (
    type: Notification["type"],
    isRead: boolean
  ) => {
    const baseClasses = isRead ? "opacity-60" : "";

    switch (type) {
      case "new_quiz":
        return `bg-blue-50 border-blue-200 ${baseClasses}`;
      case "completed_training":
        return `bg-green-50 border-green-200 ${baseClasses}`;
      case "new_staff":
        return `bg-purple-50 border-purple-200 ${baseClasses}`;
      case "new_assignment":
        return `bg-yellow-50 border-yellow-200 ${baseClasses}`;
      default:
        return `bg-gray-50 border-gray-200 ${baseClasses}`;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
        aria-label={`Notifications ${
          unreadCount > 0 ? `(${unreadCount} unread)` : ""
        }`}
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[1.25rem] h-5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Smart positioning */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden ${
            shouldOpenRight ? "left-0" : "right-0"
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({unreadCount} unread)
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    title="Mark all as read"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner message="Loading notifications..." />
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <Button variant="secondary" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">
                  No notifications yet
                </p>
                <Button
                  variant="secondary"
                  onClick={createTestNotificationsAction}
                >
                  Create Test Notifications
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications &&
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? "bg-blue-50" : ""
                      }`}
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
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
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
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(notification.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification._id)}
                                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                  title="Mark as read"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  deleteNotificationById(notification._id)
                                }
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete notification"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <Link
                to="/notifications"
                className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
                View All Notifications
              </Link>
              {notifications && notifications.length > 0 && (
                <button
                  onClick={createTestNotificationsAction}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Add Test Notifications
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
