import React, { useState, useEffect, useMemo } from "react";
import { useNotifications } from "../context/NotificationContext";
import { Notification } from "../services/api";
import Navbar from "../components/Navbar";
import {
  BellIcon,
  FunnelIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import {
  BellIcon as BellSolidIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";

type FilterType = "all" | "unread" | "read";
type NotificationType =
  | "all"
  | "new_assignment"
  | "completed_training"
  | "new_staff"
  | "new_quiz";

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    fetchNotifications,
    clearError,
  } = useNotifications();

  // Filter and search states
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [notificationType, setNotificationType] =
    useState<NotificationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotifications, setSelectedNotifications] = useState<
    Set<string>
  >(new Set());

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Refresh notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter and search logic
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Filter by read status
    if (filterType === "read") {
      filtered = filtered.filter((n) => n.isRead);
    } else if (filterType === "unread") {
      filtered = filtered.filter((n) => !n.isRead);
    }

    // Filter by notification type
    if (notificationType !== "all") {
      filtered = filtered.filter((n) => n.type === notificationType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((n) =>
        n.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filterType, notificationType, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredNotifications.slice(
    startIndex,
    endIndex
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, notificationType, searchQuery]);

  // Helper functions
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

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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

  const getNotificationTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "new_quiz":
        return "New Quiz";
      case "completed_training":
        return "Training Completed";
      case "new_staff":
        return "New Staff";
      case "new_assignment":
        return "New Assignment";
      default:
        return "Notification";
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "new_quiz":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "completed_training":
        return "bg-green-50 border-green-200 text-green-800";
      case "new_staff":
        return "bg-purple-50 border-purple-200 text-purple-800";
      case "new_assignment":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  // Selection handlers
  const handleSelectNotification = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === currentNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(currentNotifications.map((n) => n._id)));
    }
  };

  // Bulk actions
  const handleBulkMarkAsRead = async () => {
    const promises = Array.from(selectedNotifications)
      .filter((id) => !notifications.find((n) => n._id === id)?.isRead)
      .map((id) => markAsRead(id));

    await Promise.all(promises);
    setSelectedNotifications(new Set());
  };

  const handleBulkDelete = async () => {
    const promises = Array.from(selectedNotifications).map((id) =>
      deleteNotificationById(id)
    );
    await Promise.all(promises);
    setSelectedNotifications(new Set());
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasSelectedNotifications = selectedNotifications.size > 0;
  const selectedUnreadCount = Array.from(selectedNotifications).filter(
    (id) => !notifications.find((n) => n._id === id)?.isRead
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <BellSolidIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                Manage your notifications and stay updated with the latest
                activities.
              </p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4 mb-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select
                      value={filterType}
                      onChange={(e) =>
                        setFilterType(e.target.value as FilterType)
                      }
                      className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                    </select>
                  </div>

                  <select
                    value={notificationType}
                    onChange={(e) =>
                      setNotificationType(e.target.value as NotificationType)
                    }
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="new_quiz">New Quiz</option>
                    <option value="completed_training">
                      Training Completed
                    </option>
                    <option value="new_staff">New Staff</option>
                    <option value="new_assignment">New Assignment</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              {hasSelectedNotifications && (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <span className="text-sm text-blue-700">
                    {selectedNotifications.size} notification
                    {selectedNotifications.size === 1 ? "" : "s"} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    {selectedUnreadCount > 0 && (
                      <Button
                        variant="secondary"
                        onClick={handleBulkMarkAsRead}
                        className="text-sm"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Mark as Read ({selectedUnreadCount})
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      className="text-sm"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete ({selectedNotifications.size})
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedNotifications(new Set())}
                      className="text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={
                      currentNotifications.length > 0 &&
                      selectedNotifications.size === currentNotifications.length
                    }
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Select all on this page
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="secondary"
                      onClick={markAllAsRead}
                      className="text-sm"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Mark All as Read
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={fetchNotifications}
                    className="text-sm"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner message="Loading notifications..." />
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <div className="text-red-600 mb-4">
                    <XMarkIcon className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">
                      Error loading notifications
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{error}</p>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Button variant="secondary" onClick={clearError}>
                      Dismiss
                    </Button>
                    <Button variant="primary" onClick={fetchNotifications}>
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <BellIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ||
                    filterType !== "all" ||
                    notificationType !== "all"
                      ? "No notifications match your filters"
                      : "No notifications yet"}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery ||
                    filterType !== "all" ||
                    notificationType !== "all"
                      ? "Try adjusting your search terms or filters."
                      : "When you receive notifications, they will appear here."}
                  </p>
                  {(searchQuery ||
                    filterType !== "all" ||
                    notificationType !== "all") && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterType("all");
                        setNotificationType("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Notifications List */}
                  <div className="divide-y divide-gray-200">
                    {currentNotifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`p-6 hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedNotifications.has(
                              notification._id
                            )}
                            onChange={() =>
                              handleSelectNotification(notification._id)
                            }
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />

                          {/* Notification Icon */}
                          <div className="flex-shrink-0 mt-1">
                            <span className="text-2xl">
                              {getNotificationIcon(notification.type)}
                            </span>
                          </div>

                          {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Type Badge */}
                                <div className="flex items-center space-x-2 mb-2">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getNotificationColor(
                                      notification.type
                                    )}`}
                                  >
                                    {getNotificationTypeLabel(
                                      notification.type
                                    )}
                                  </span>
                                  {!notification.isRead && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      New
                                    </span>
                                  )}
                                </div>

                                {/* Content */}
                                <p
                                  className={`text-base ${
                                    notification.isRead
                                      ? "text-gray-700"
                                      : "text-gray-900 font-medium"
                                  }`}
                                >
                                  {notification.content}
                                </p>

                                {/* Timestamp */}
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                  <span>
                                    {formatTimeAgo(notification.createdAt)}
                                  </span>
                                  <span
                                    title={formatFullDate(
                                      notification.createdAt
                                    )}
                                  >
                                    {formatFullDate(notification.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-2 ml-4">
                                {!notification.isRead ? (
                                  <button
                                    onClick={() => markAsRead(notification._id)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Mark as read"
                                  >
                                    <EyeIcon className="h-5 w-5" />
                                  </button>
                                ) : (
                                  <div
                                    className="p-1 text-green-500"
                                    title="Read"
                                  >
                                    <EyeSlashIcon className="h-5 w-5" />
                                  </div>
                                )}
                                <button
                                  onClick={() =>
                                    deleteNotificationById(notification._id)
                                  }
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete notification"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {startIndex + 1} to{" "}
                          {Math.min(endIndex, filteredNotifications.length)} of{" "}
                          {filteredNotifications.length} notifications
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={currentPage === 1}
                            className="text-sm"
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, totalPages)
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="text-sm"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
