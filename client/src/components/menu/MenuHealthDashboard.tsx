import React, { useState } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhotoIcon,
  TagIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface MenuHealthMetrics {
  overallScore: number; // 0-100
  completeness: {
    descriptions: number; // 0-100
    prices: number; // 0-100
    categories: number; // 0-100
    images: number; // 0-100
  };
  recommendations: string[];
  warnings: string[];
}

interface MenuHealthDashboardProps {
  health: MenuHealthMetrics;
}

interface ScoreBarProps {
  label: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  score,
  icon: Icon,
  color,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 90) return "text-green-700";
    if (score >= 70) return "text-yellow-700";
    return "text-red-700";
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2 flex-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getScoreColor(
              score
            )}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span
          className={`text-sm font-medium ${getScoreTextColor(
            score
          )} w-8 text-right`}
        >
          {score}%
        </span>
      </div>
    </div>
  );
};

const MenuHealthDashboard: React.FC<MenuHealthDashboardProps> = ({
  health,
}) => {
  const { overallScore, completeness, recommendations, warnings } = health;
  const [isExpanded, setIsExpanded] = useState(false);

  const getOverallScoreColor = (score: number) => {
    if (score >= 90)
      return {
        bg: "bg-green-100",
        border: "border-green-200",
        text: "text-green-800",
        ring: "ring-green-500",
      };
    if (score >= 70)
      return {
        bg: "bg-yellow-100",
        border: "border-yellow-200",
        text: "text-yellow-800",
        ring: "ring-yellow-500",
      };
    return {
      bg: "bg-red-100",
      border: "border-red-200",
      text: "text-red-800",
      ring: "ring-red-500",
    };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 95) return "Excellent";
    if (score >= 85) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Work";
    return "Poor";
  };

  const scoreColors = getOverallScoreColor(overallScore);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Mobile Expandable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full lg:hidden bg-white p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Menu Health</h3>
            <p className="text-sm text-gray-500">
              {overallScore}% - {getScoreLabel(overallScore)}
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
        <h2 className="text-lg font-semibold text-gray-900">Menu Health</h2>
        <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />
      </div>

      {/* Content */}
      <div
        className={`${
          !isExpanded ? "hidden lg:block" : ""
        } px-4 pb-4 lg:px-6 lg:pb-6 lg:pt-0`}
      >
        {/* Overall Score */}
        <div
          className={`p-4 rounded-xl ${scoreColors.bg} ${scoreColors.border} border mb-6`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Score</p>
              <p className={`text-2xl font-bold ${scoreColors.text}`}>
                {overallScore}%
              </p>
              <p className={`text-sm ${scoreColors.text} font-medium`}>
                {getScoreLabel(overallScore)}
              </p>
            </div>
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-full border-4 ${scoreColors.ring} flex items-center justify-center`}
              >
                <div
                  className={`w-12 h-12 rounded-full ${scoreColors.bg} flex items-center justify-center`}
                >
                  {overallScore >= 90 ? (
                    <CheckCircleIcon
                      className={`h-6 w-6 ${scoreColors.text}`}
                    />
                  ) : overallScore >= 70 ? (
                    <ExclamationTriangleIcon
                      className={`h-6 w-6 ${scoreColors.text}`}
                    />
                  ) : (
                    <InformationCircleIcon
                      className={`h-6 w-6 ${scoreColors.text}`}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Completeness Breakdown */}
        <div className="space-y-1 mb-6">
          <h3 className="text-sm font-medium text-gray-800 mb-3">
            Completeness Breakdown
          </h3>

          <ScoreBar
            label="Descriptions"
            score={completeness.descriptions}
            icon={DocumentTextIcon}
            color="text-blue-600"
          />

          <ScoreBar
            label="Prices"
            score={completeness.prices}
            icon={CurrencyDollarIcon}
            color="text-green-600"
          />

          <ScoreBar
            label="Categories"
            score={completeness.categories}
            icon={TagIcon}
            color="text-purple-600"
          />

          <ScoreBar
            label="Images"
            score={completeness.images}
            icon={PhotoIcon}
            color="text-gray-600"
          />
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              💡 Recommendations
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">
              ⚠️ Issues to Address
            </h4>
            <ul className="text-sm text-red-700 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuHealthDashboard;
