import React, { useMemo } from "react";
import { ResultSummary, StaffMemberWithData } from "../../types/staffTypes"; // Corrected import path

// Interfaces (Copied from parent - consider moving to shared types)
// // Removed local definitions

// Prop Interface for the chart component
interface ScoreDistributionChartProps {
  staffData: StaffMemberWithData[];
  selectedCategory: string | null;
  onSelectCategory: (categoryKey: string | null) => void;
}

// Enhanced bar chart component for visualizing score distribution
const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  staffData,
  selectedCategory,
  onSelectCategory,
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

  const maxCount = Math.max(...Object.values(scoreDistribution));
  const totalStaff = Object.values(scoreDistribution).reduce(
    (a, b) => a + b,
    0
  );

  // Calculate percentages for each category
  const getPercentage = (count: number) => {
    return totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0;
  };

  // Distribution categories configuration
  const categories = [
    {
      key: "excellent",
      label: "Excellent",
      range: "90+",
      color: "bg-green-500",
      hoverColor: "bg-green-600",
      textColor: "text-green-800",
      count: scoreDistribution.excellent,
      percentage: getPercentage(scoreDistribution.excellent),
    },
    {
      key: "good",
      label: "Good",
      range: "75-89",
      color: "bg-blue-500",
      hoverColor: "bg-blue-600",
      textColor: "text-blue-800",
      count: scoreDistribution.good,
      percentage: getPercentage(scoreDistribution.good),
    },
    {
      key: "average",
      label: "Average",
      range: "60-74",
      color: "bg-yellow-500",
      hoverColor: "bg-yellow-600",
      textColor: "text-yellow-800",
      count: scoreDistribution.average,
      percentage: getPercentage(scoreDistribution.average),
    },
    {
      key: "needsWork",
      label: "Needs Work",
      range: "<60",
      color: "bg-red-500",
      hoverColor: "bg-red-600",
      textColor: "text-red-800",
      count: scoreDistribution.needsWork,
      percentage: getPercentage(scoreDistribution.needsWork),
    },
    {
      key: "noResults",
      label: "No Results",
      range: "N/A",
      color: "bg-gray-300",
      hoverColor: "bg-gray-400",
      textColor: "text-gray-800",
      count: scoreDistribution.noResults,
      percentage: getPercentage(scoreDistribution.noResults),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Staff Performance Overview
        </h2>
        <div className="text-sm text-gray-500">
          Total Staff: <span className="font-semibold">{totalStaff}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.key;
          return (
            <div
              key={category.key}
              className={`flex flex-col bg-gray-50 rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "ring-2 ring-blue-500 shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => onSelectCategory(isSelected ? null : category.key)}
              role="button"
              aria-pressed={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  onSelectCategory(isSelected ? null : category.key);
              }}
            >
              <div className="mb-2">
                <div className="flex justify-between items-center">
                  <h3 className={`font-semibold ${category.textColor}`}>
                    {category.label}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {category.range}
                  </span>
                </div>
                <div className="text-3xl font-bold mt-1">{category.count}</div>
                <div className="text-sm text-gray-500">
                  {category.percentage}% of staff
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`${category.color} h-2.5 rounded-full transition-all duration-500 ease-out hover:${category.hoverColor}`}
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ScoreDistributionChart);
