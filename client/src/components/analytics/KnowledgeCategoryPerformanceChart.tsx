import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { KnowledgeCategory } from "../../types/questionBankTypes";
import {
  CakeIcon,
  BoltIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Interface for category performance data
export interface CategoryPerformanceData {
  category: KnowledgeCategory;
  averageAccuracy: number;
  staffParticipation: number;
  totalQuestions: number;
  improvementTrend: number;
}

interface KnowledgeCategoryPerformanceChartProps {
  data: CategoryPerformanceData[];
  className?: string;
  showParticipation?: boolean;
  showTrends?: boolean;
  height?: number;
}

// Category configuration with colors and icons
const CATEGORY_CONFIG = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: {
    icon: CakeIcon,
    label: "Food Knowledge",
    color: "rgba(34, 197, 94, 0.8)", // Green
    borderColor: "rgb(34, 197, 94)",
    lightColor: "rgba(34, 197, 94, 0.1)",
  },
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    color: "rgba(59, 130, 246, 0.8)", // Blue
    borderColor: "rgb(59, 130, 246)",
    lightColor: "rgba(59, 130, 246, 0.1)",
  },
  [KnowledgeCategory.WINE_KNOWLEDGE]: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    color: "rgba(147, 51, 234, 0.8)", // Purple
    borderColor: "rgb(147, 51, 234)",
    lightColor: "rgba(147, 51, 234, 0.1)",
  },
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    color: "rgba(249, 115, 22, 0.8)", // Orange
    borderColor: "rgb(249, 115, 22)",
    lightColor: "rgba(249, 115, 22, 0.1)",
  },
};

const KnowledgeCategoryPerformanceChart: React.FC<
  KnowledgeCategoryPerformanceChartProps
> = ({
  data,
  className = "",
  showParticipation = false,
  showTrends = false,
  height = 400,
}) => {
  // Prepare chart data
  const chartData = {
    labels: data.map((item) => CATEGORY_CONFIG[item.category].label),
    datasets: [
      {
        label: "Average Accuracy (%)",
        data: data.map((item) => Math.round(item.averageAccuracy * 10) / 10),
        backgroundColor: data.map(
          (item) => CATEGORY_CONFIG[item.category].color
        ),
        borderColor: data.map(
          (item) => CATEGORY_CONFIG[item.category].borderColor
        ),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      ...(showParticipation
        ? [
            {
              label: "Staff Participation (%)",
              data: data.map(
                (item) => Math.round(item.staffParticipation * 10) / 10
              ),
              backgroundColor: data.map(
                (item) => CATEGORY_CONFIG[item.category].lightColor
              ),
              borderColor: data.map(
                (item) => CATEGORY_CONFIG[item.category].borderColor
              ),
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false,
            },
          ]
        : []),
    ],
  };

  // Chart options
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: "Inter, system-ui, sans-serif",
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(59, 130, 246, 0.5)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          beforeBody: (context) => {
            const dataIndex = context[0].dataIndex;
            const categoryData = data[dataIndex];

            return [
              `Questions Available: ${categoryData.totalQuestions}`,
              ...(showTrends && categoryData.improvementTrend !== 0
                ? [
                    `Trend: ${
                      categoryData.improvementTrend > 0 ? "+" : ""
                    }${categoryData.improvementTrend.toFixed(1)}%`,
                  ]
                : []),
            ];
          },
          label: (context) => {
            const value = context.parsed.y;
            const label = context.dataset.label;
            return `${label}: ${value}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgba(100, 116, 139, 0.8)",
          font: {
            size: 11,
            family: "Inter, system-ui, sans-serif",
          },
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
        },
        ticks: {
          color: "rgba(100, 116, 139, 0.8)",
          font: {
            size: 11,
            family: "Inter, system-ui, sans-serif",
          },
          callback: function (value) {
            return value + "%";
          },
        },
      },
    },
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Category Performance Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.map((categoryData) => {
          const config = CATEGORY_CONFIG[categoryData.category];
          const IconComponent = config.icon;

          return (
            <div
              key={categoryData.category}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: config.lightColor }}
                >
                  <IconComponent
                    className="h-5 w-5"
                    style={{ color: config.borderColor }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">
                    {config.label}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {Math.round(categoryData.averageAccuracy)}%
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{categoryData.totalQuestions} questions</span>
                    {showTrends && categoryData.improvementTrend !== 0 && (
                      <span
                        className={`font-medium ${
                          categoryData.improvementTrend > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {categoryData.improvementTrend > 0 ? "+" : ""}
                        {categoryData.improvementTrend.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <Bar data={chartData} options={options} />
      </div>

      {/* Performance Insights */}
      <div className="mt-4 space-y-2">
        {data.map((categoryData) => {
          const config = CATEGORY_CONFIG[categoryData.category];
          const performance = categoryData.averageAccuracy;

          let insight = "";
          let insightColor = "";

          if (performance >= 85) {
            insight = "Excellent performance";
            insightColor = "text-green-600 bg-green-50";
          } else if (performance >= 70) {
            insight = "Good performance";
            insightColor = "text-blue-600 bg-blue-50";
          } else if (performance >= 60) {
            insight = "Needs improvement";
            insightColor = "text-yellow-600 bg-yellow-50";
          } else {
            insight = "Requires attention";
            insightColor = "text-red-600 bg-red-50";
          }

          return (
            <div
              key={categoryData.category}
              className={`flex items-center justify-between p-2 rounded-lg ${insightColor}`}
            >
              <span className="text-sm font-medium">{config.label}</span>
              <span className="text-sm">
                {insight} ({Math.round(categoryData.averageAccuracy)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KnowledgeCategoryPerformanceChart;
