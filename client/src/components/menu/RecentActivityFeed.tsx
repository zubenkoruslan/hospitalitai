import React from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CakeIcon,
  BeakerIcon,
  SparklesIcon,
  DocumentArrowUpIcon,
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <ClockIcon className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-center py-8">
          <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No recent activity</p>
          <p className="text-gray-400 text-xs mt-1">
            Menu changes will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {sortedActivities.map((activity) => {
          const ActivityIcon = getActivityIcon(activity.type);
          const ItemTypeIcon = getItemTypeIcon(activity.itemType);
          const colors = getActivityColor(activity.type);
          const itemTypeColor = getItemTypeColor(activity.itemType);

          return (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              {/* Activity Type Icon */}
              <div
                className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}
              >
                <ActivityIcon className={`h-4 w-4 ${colors.icon}`} />
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {activity.itemType !== "multiple" && (
                        <ItemTypeIcon className={`h-4 w-4 ${itemTypeColor}`} />
                      )}
                      <p className="text-sm text-gray-900 font-medium">
                        {getActivityDescription(activity)}
                      </p>
                    </div>

                    {activity.user && (
                      <p className="text-xs text-gray-500 mt-1">
                        by {activity.user}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activities.length > maxItems && onViewAll && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={onViewAll}
            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-150"
          >
            View all activity ({activities.length} items)
          </button>
        </div>
      )}

      {/* Activity Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Today</p>
            <p className="text-sm font-medium text-gray-900">
              {
                activities.filter((a) => {
                  const today = new Date();
                  const activityDate = new Date(a.timestamp);
                  return activityDate.toDateString() === today.toDateString();
                }).length
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">This Week</p>
            <p className="text-sm font-medium text-gray-900">
              {
                activities.filter((a) => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(a.timestamp) > weekAgo;
                }).length
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-sm font-medium text-gray-900">
              {activities.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivityFeed;
