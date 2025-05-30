import React, { useMemo } from "react";
import { StaffMemberWithData } from "../../types/staffTypes"; // Corrected import path, Removed ResultSummary

// Interfaces (Copied from parent - consider moving to shared types)
// // Removed local definitions

// Prop Interface for the chart component
interface ScoreDistributionChartProps {
  staffData: StaffMemberWithData[];
  selectedCategory: string | null;
  onSelectCategory: (categoryKey: string | null) => void;
  className?: string;
}

// Enhanced bar chart component for visualizing score distribution
const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  staffData,
  selectedCategory,
  onSelectCategory,
  className = "",
}) => {
  const scoreDistribution = useMemo(() => {
    const distribution = {
      excellent: 0, // 90-100
      good: 0, // 75-89
      average: 0, // 60-74
      needsWork: 0, // 0-59
      noResults: 0, // averageScore is null
    };

    staffData.forEach((staff) => {
      const avgScore = staff.averageScore;

      if (avgScore === null) {
        distribution.noResults++;
        return;
      }

      // Assuming averageScore is a percentage score (0-100)
      if (avgScore >= 90) distribution.excellent++;
      else if (avgScore >= 75) distribution.good++;
      else if (avgScore >= 60) distribution.average++;
      else distribution.needsWork++;
    });

    return distribution;
  }, [staffData]);

  const totalStaff = Object.values(scoreDistribution).reduce(
    (a, b) => a + b,
    0
  );

  // Calculate percentages for each category
  const getPercentage = (count: number) => {
    return totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0;
  };

  // Distribution categories configuration with modern colors
  const categories = [
    {
      key: "excellent",
      label: "Excellent",
      range: "90+",
      color: "bg-emerald-500",
      hoverColor: "bg-emerald-600",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      iconColor: "text-emerald-600",
      count: scoreDistribution.excellent,
      percentage: getPercentage(scoreDistribution.excellent),
    },
    {
      key: "good",
      label: "Good",
      range: "75-89",
      color: "bg-blue-500",
      hoverColor: "bg-blue-600",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-600",
      count: scoreDistribution.good,
      percentage: getPercentage(scoreDistribution.good),
    },
    {
      key: "average",
      label: "Average",
      range: "60-74",
      color: "bg-amber-500",
      hoverColor: "bg-amber-600",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      iconColor: "text-amber-600",
      count: scoreDistribution.average,
      percentage: getPercentage(scoreDistribution.average),
    },
    {
      key: "needsWork",
      label: "Needs Work",
      range: "<60",
      color: "bg-red-500",
      hoverColor: "bg-red-600",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      iconColor: "text-red-600",
      count: scoreDistribution.needsWork,
      percentage: getPercentage(scoreDistribution.needsWork),
    },
    {
      key: "noResults",
      label: "No Results",
      range: "N/A",
      color: "bg-slate-400",
      hoverColor: "bg-slate-500",
      textColor: "text-slate-700",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      iconColor: "text-slate-500",
      count: scoreDistribution.noResults,
      percentage: getPercentage(scoreDistribution.noResults),
    },
  ];

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}
    >
      {/* Header Section */}
      <div className="p-6 pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Staff Performance Overview
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Distribution of quiz scores across all staff members
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-slate-500">Total Staff:</div>
            <div className="bg-slate-100 rounded-lg px-3 py-1">
              <span className="font-semibold text-slate-900">{totalStaff}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.key;
            return (
              <div
                key={category.key}
                className={`
                  group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer
                  ${
                    isSelected
                      ? `${category.borderColor} shadow-lg scale-[1.02] bg-white`
                      : `border-slate-200 hover:border-slate-300 hover:shadow-md bg-slate-50 hover:bg-white`
                  }
                `}
                onClick={() =>
                  onSelectCategory(isSelected ? null : category.key)
                }
                role="button"
                aria-pressed={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectCategory(isSelected ? null : category.key);
                  }
                }}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div
                    className={`absolute top-0 left-0 w-full h-1 ${category.color}`}
                  />
                )}

                <div className="p-5">
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3
                        className={`font-semibold text-lg ${category.textColor}`}
                      >
                        {category.label}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Score: {category.range}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <div
                        className={`w-3 h-3 rounded-full ${category.color}`}
                      />
                    </div>
                  </div>

                  {/* Count Display */}
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-slate-900 leading-none">
                      {category.count}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {category.percentage}% of total
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`
                          ${
                            category.color
                          } h-full rounded-full transition-all duration-700 ease-out
                          ${
                            isSelected
                              ? "shadow-sm"
                              : "group-hover:brightness-110"
                          }
                        `}
                        style={{
                          width: `${Math.max(category.percentage, 2)}%`,
                          transition:
                            "width 0.7s ease-out, filter 0.2s ease-out",
                        }}
                      />
                    </div>

                    {/* Interactive Feedback */}
                    <div className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                      {isSelected ? "Click to deselect" : "Click to filter"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        {totalStaff > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span>
                  High Performers:{" "}
                  {scoreDistribution.excellent + scoreDistribution.good}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span>
                  Needs Attention:{" "}
                  {scoreDistribution.average + scoreDistribution.needsWork}
                </span>
              </div>
              {scoreDistribution.noResults > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-400 rounded-full" />
                  <span>No Data: {scoreDistribution.noResults}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalStaff === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-slate-300 rounded-full" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No Staff Data
            </h3>
            <p className="text-slate-600">
              Staff performance data will appear here once quiz results are
              available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ScoreDistributionChart);
