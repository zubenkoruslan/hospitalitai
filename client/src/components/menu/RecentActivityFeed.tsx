import React, { useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CakeIcon,
  BeakerIcon,
  SparklesIcon,
  DocumentArrowUpIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface ActivityItem {
  id: string;
  type: "created" | "updated" | "deleted" | "bulk_import";
  itemName: string;
  itemType: "food" | "beverage" | "wine" | "multiple";
  timestamp: Date;
  user?: string;
  changes?: string[];
  itemCount?: number; // For bulk operations
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  onViewAll?: () => void;
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  maxItems = 8,
  onViewAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort activities by timestamp (most recent first) and limit
  const sortedActivities = activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, maxItems);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "created":
        return PlusIcon;
      case "updated":
        return PencilIcon;
      case "deleted":
        return TrashIcon;
      case "bulk_import":
        return DocumentArrowUpIcon;
      default:
        return ClockIcon;
    }
  };

  const getItemTypeIcon = (itemType: ActivityItem["itemType"]) => {
    switch (itemType) {
      case "food":
        return CakeIcon;
      case "beverage":
        return BeakerIcon;
      case "wine":
        return SparklesIcon;
      default:
        return ClockIcon;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "created":
        return {
          bg: "bg-green-100",
          border: "border-green-200",
          icon: "text-green-600",
          text: "text-green-800",
        };
      case "updated":
        return {
          bg: "bg-blue-100",
          border: "border-blue-200",
          icon: "text-blue-600",
          text: "text-blue-800",
        };
      case "deleted":
        return {
          bg: "bg-red-100",
          border: "border-red-200",
          icon: "text-red-600",
          text: "text-red-800",
        };
      case "bulk_import":
        return {
          bg: "bg-purple-100",
          border: "border-purple-200",
          icon: "text-purple-600",
          text: "text-purple-800",
        };
      default:
        return {
          bg: "bg-gray-100",
          border: "border-gray-200",
          icon: "text-gray-600",
          text: "text-gray-800",
        };
    }
  };

  const getItemTypeColor = (itemType: ActivityItem["itemType"]) => {
    switch (itemType) {
      case "food":
        return "text-amber-600";
      case "beverage":
        return "text-blue-600";
      case "wine":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - timestamp.getTime()) / 1000
    );

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return timestamp.toLocaleDateString();
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const { type, itemName, itemType, changes, itemCount } = activity;

    switch (type) {
      case "created":
        return `Created new ${itemType} item "${itemName}"`;
      case "updated":
        if (changes && changes.length > 0) {
          return `Updated "${itemName}" - ${changes.slice(0, 2).join(", ")}${
            changes.length > 2 ? "..." : ""
          }`;
        }
        return `Updated ${itemType} item "${itemName}"`;
      case "deleted":
        return `Deleted ${itemType} item "${itemName}"`;
      case "bulk_import":
        return `Imported ${itemCount || 0} menu items`;
      default:
        return `${type} "${itemName}"`;
    }
  };

  if (sortedActivities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Mobile Expandable Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full lg:hidden bg-white p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          </div>
          <div
            className={`transform transition-transform duration-200 ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          </div>
        </button>

        {/* Desktop Header (always visible) */}
        <div className="hidden lg:flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <ClockIcon className="h-5 w-5 text-gray-400" />
        </div>

        {/* Content */}
        <div
          className={`${
            !isExpanded ? "hidden lg:block" : ""
          } px-4 pb-4 lg:px-6 lg:pb-6 lg:pt-0`}
        >
          <div className="text-center py-8">
            <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No recent activity</p>
            <p className="text-gray-400 text-xs mt-1">
              Menu changes will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Mobile Expandable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full lg:hidden bg-white p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClockIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-500">
              {sortedActivities.length} recent changes
            </p>
          </div>
        </div>
        <div
          className={`transform transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        </div>
      </button>

      {/* Desktop Header (always visible) */}
      <div className="hidden lg:flex items-center justify-between p-6 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      {/* Content */}
      <div
        className={`${
          !isExpanded ? "hidden lg:block" : ""
        } px-4 pb-4 lg:px-6 lg:pb-6 lg:pt-0`}
      >
        <div className="space-y-3">
          {sortedActivities.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.type);
            const ItemTypeIcon = getItemTypeIcon(activity.itemType);
            const colors = getActivityColor(activity.type);
            const itemTypeColor = getItemTypeColor(activity.itemType);

            return (
              <div
                key={activity.id}
                className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                {/* Activity Icon */}
                <div
                  className={`flex-shrink-0 p-2 rounded-lg ${colors.bg} ${colors.border} border`}
                >
                  <ActivityIcon className={`h-4 w-4 ${colors.icon}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 group-hover:text-gray-700 leading-5">
                        {getActivityDescription(activity)}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <ItemTypeIcon
                          className={`h-3 w-3 ${itemTypeColor} flex-shrink-0`}
                        />
                        <p className="text-xs text-gray-500 capitalize">
                          {activity.itemType === "multiple"
                            ? "Multiple items"
                            : activity.itemType}
                        </p>
                        {activity.user && (
                          <>
                            <span className="text-xs text-gray-300">•</span>
                            <p className="text-xs text-gray-500">
                              by {activity.user}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 ml-2">
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        {onViewAll && sortedActivities.length >= maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={onViewAll}
              className="w-full py-2 px-3 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-150"
            >
              View All Activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivityFeed;
