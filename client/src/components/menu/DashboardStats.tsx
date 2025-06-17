import React from "react";
import {
  ClipboardDocumentListIcon,
  CakeIcon,
  BeakerIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

interface DashboardStatsProps {
  stats: {
    totalItems: number;
    foodCount: number;
    beverageCount: number;
    wineCount: number;
    categoryCounts: Record<string, number>;
    averagePrice: number;
    priceRange: [number, number];
    itemsWithoutPrices: number;
    itemsWithoutDescriptions: number;
    recentlyAdded: number;
  };
  onNavigateToType?: (type: "food" | "beverage" | "wine") => void;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  onClick?: () => void;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  trend,
  onClick,
  subtitle,
}) => {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${borderColor} bg-white p-4 lg:p-6 shadow-sm transition-all duration-200
        ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className={`p-2 lg:p-3 rounded-lg ${bgColor}`}>
              <Icon className={`h-5 w-5 lg:h-6 lg:w-6 ${color}`} />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">
                {title}
              </p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {trend && (
          <div className="text-right">
            <div
              className={`flex items-center space-x-1 ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
            </div>
            <p className="text-xs text-gray-500">{trend.period}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  onNavigateToType,
}) => {
  const { totalItems, foodCount, beverageCount, wineCount, recentlyAdded } =
    stats;

  return (
    <div className="space-y-6">
      {/* Main Statistics Grid - 2x2 on mobile, 1 row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Items */}
        <StatCard
          title="Total Items"
          value={totalItems}
          icon={ClipboardDocumentListIcon}
          color="text-blue-600"
          bgColor="bg-blue-100"
          borderColor="border-blue-200"
          subtitle={`${recentlyAdded} added this week`}
        />

        {/* Food Items */}
        <StatCard
          title="Food Items"
          value={foodCount}
          icon={CakeIcon}
          color="text-amber-600"
          bgColor="bg-amber-100"
          borderColor="border-amber-200"
          onClick={() => onNavigateToType?.("food")}
          subtitle={
            totalItems > 0
              ? `${Math.round((foodCount / totalItems) * 100)}% of menu`
              : undefined
          }
        />

        {/* Beverages */}
        <StatCard
          title="Beverages"
          value={beverageCount}
          icon={BeakerIcon}
          color="text-blue-600"
          bgColor="bg-blue-100"
          borderColor="border-blue-200"
          onClick={() => onNavigateToType?.("beverage")}
          subtitle={
            totalItems > 0
              ? `${Math.round((beverageCount / totalItems) * 100)}% of menu`
              : undefined
          }
        />

        {/* Wine Items */}
        <StatCard
          title="Wines"
          value={wineCount}
          icon={SparklesIcon}
          color="text-purple-600"
          bgColor="bg-purple-100"
          borderColor="border-purple-200"
          onClick={() => onNavigateToType?.("wine")}
          subtitle={
            totalItems > 0
              ? `${Math.round((wineCount / totalItems) * 100)}% of menu`
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default DashboardStats;
