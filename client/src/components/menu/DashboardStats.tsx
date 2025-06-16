import React from "react";
import {
  ClipboardDocumentListIcon,
  CakeIcon,
  BeakerIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
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
        relative overflow-hidden rounded-xl border ${borderColor} bg-white p-6 shadow-sm transition-all duration-200
        ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${bgColor}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
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
  const {
    totalItems,
    foodCount,
    beverageCount,
    wineCount,
    averagePrice,
    priceRange,
    itemsWithoutPrices,
    itemsWithoutDescriptions,
    recentlyAdded,
  } = stats;

  // Calculate completion percentages
  const priceCompletionRate =
    totalItems > 0
      ? Math.round(((totalItems - itemsWithoutPrices) / totalItems) * 100)
      : 100;

  const descriptionCompletionRate =
    totalItems > 0
      ? Math.round(((totalItems - itemsWithoutDescriptions) / totalItems) * 100)
      : 100;

  // Format price range
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const priceRangeText =
    priceRange[0] !== Infinity
      ? `${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])}`
      : "No prices set";

  return (
    <div className="space-y-6">
      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Price Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Average Price */}
        <StatCard
          title="Average Price"
          value={averagePrice > 0 ? formatPrice(averagePrice) : "N/A"}
          icon={CurrencyDollarIcon}
          color="text-green-600"
          bgColor="bg-green-100"
          borderColor="border-green-200"
          subtitle={`Range: ${priceRangeText}`}
        />

        {/* Price Completion */}
        <StatCard
          title="Price Completion"
          value={`${priceCompletionRate}%`}
          icon={CurrencyDollarIcon}
          color={
            priceCompletionRate >= 90
              ? "text-green-600"
              : priceCompletionRate >= 70
              ? "text-yellow-600"
              : "text-red-600"
          }
          bgColor={
            priceCompletionRate >= 90
              ? "bg-green-100"
              : priceCompletionRate >= 70
              ? "bg-yellow-100"
              : "bg-red-100"
          }
          borderColor={
            priceCompletionRate >= 90
              ? "border-green-200"
              : priceCompletionRate >= 70
              ? "border-yellow-200"
              : "border-red-200"
          }
          subtitle={
            itemsWithoutPrices > 0
              ? `${itemsWithoutPrices} items missing prices`
              : "All items have prices"
          }
        />

        {/* Description Completion */}
        <StatCard
          title="Description Completion"
          value={`${descriptionCompletionRate}%`}
          icon={DocumentTextIcon}
          color={
            descriptionCompletionRate >= 90
              ? "text-green-600"
              : descriptionCompletionRate >= 70
              ? "text-yellow-600"
              : "text-red-600"
          }
          bgColor={
            descriptionCompletionRate >= 90
              ? "bg-green-100"
              : descriptionCompletionRate >= 70
              ? "bg-yellow-100"
              : "bg-red-100"
          }
          borderColor={
            descriptionCompletionRate >= 90
              ? "border-green-200"
              : descriptionCompletionRate >= 70
              ? "border-yellow-200"
              : "border-red-200"
          }
          subtitle={
            itemsWithoutDescriptions > 0
              ? `${itemsWithoutDescriptions} items missing descriptions`
              : "All items have descriptions"
          }
        />
      </div>

      {/* Health Alerts */}
      {(itemsWithoutPrices > 0 || itemsWithoutDescriptions > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Menu Completion Recommendations
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="space-y-1">
                  {itemsWithoutPrices > 0 && (
                    <li>
                      • Add prices to {itemsWithoutPrices} item
                      {itemsWithoutPrices > 1 ? "s" : ""} to improve menu
                      completeness
                    </li>
                  )}
                  {itemsWithoutDescriptions > 0 && (
                    <li>
                      • Add descriptions to {itemsWithoutDescriptions} item
                      {itemsWithoutDescriptions > 1 ? "s" : ""} to help
                      customers make informed choices
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
