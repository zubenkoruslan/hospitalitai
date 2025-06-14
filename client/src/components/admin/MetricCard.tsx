import React from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange" | "red";
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color,
  loading = false,
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          iconBg: "bg-blue-100",
          iconText: "text-blue-600",
          text: "text-blue-900",
        };
      case "green":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          iconBg: "bg-green-100",
          iconText: "text-green-600",
          text: "text-green-900",
        };
      case "purple":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          iconBg: "bg-purple-100",
          iconText: "text-purple-600",
          text: "text-purple-900",
        };
      case "orange":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          iconBg: "bg-orange-100",
          iconText: "text-orange-600",
          text: "text-orange-900",
        };
      case "red":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          iconBg: "bg-red-100",
          iconText: "text-red-600",
          text: "text-red-900",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          iconBg: "bg-gray-100",
          iconText: "text-gray-600",
          text: "text-gray-900",
        };
    }
  };

  const colorClasses = getColorClasses(color);

  const getTrendDisplay = () => {
    if (trend === undefined || trend === null) return null;

    const isPositive = trend > 0;

    if (trend === 0) return null;

    return (
      <div
        className={`flex items-center text-sm ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        {isPositive ? (
          <ArrowUpIcon className="h-4 w-4 mr-1" />
        ) : (
          <ArrowDownIcon className="h-4 w-4 mr-1" />
        )}
        <span>{Math.abs(trend)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${colorClasses.bg} rounded-xl p-6 shadow-sm border ${colorClasses.border} transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-medium ${colorClasses.text}`}>{title}</h3>
        <div
          className={`${colorClasses.iconBg} ${colorClasses.iconText} p-2 rounded-lg`}
        >
          {icon}
        </div>
      </div>

      <div className={`text-2xl font-bold ${colorClasses.text} mb-2`}>
        {typeof value === "number" && value >= 1000
          ? value.toLocaleString()
          : value}
      </div>

      <div className="flex items-center justify-between">
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        {getTrendDisplay()}
      </div>
    </div>
  );
};

export default MetricCard;
