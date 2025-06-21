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
  ChartData,
  ChartOptions,
} from "chart.js";
import ChartDataLabels, { Context } from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface BarChartProps {
  data: ChartData<"bar">;
  options?: ChartOptions<"bar">;
  titleText?: string;
  className?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  options,
  titleText,
  className = "",
}) => {
  const defaultOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: {
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 13,
            weight: 500,
          },
          color: "#64748b", // slate-500
          padding: 24,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      title: {
        display: !!titleText,
        text: titleText || "",
        font: {
          family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 20,
          weight: 700,
        },
        color: "#0f172a", // slate-900
        padding: {
          top: 16,
          bottom: 32,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(15, 23, 42, 0.95)", // slate-900 with opacity
        titleFont: {
          family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 14,
          weight: 600,
        },
        bodyFont: {
          family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          size: 13,
          weight: 400,
        },
        padding: 16,
        cornerRadius: 12,
        displayColors: true,
        borderColor: "#e2e8f0", // slate-200
        borderWidth: 1,
        titleColor: "#f8fafc", // slate-50
        bodyColor: "#f1f5f9", // slate-100
      },
      datalabels: {
        anchor: "end",
        align: "top",
        formatter: (value: unknown, context: Context) => {
          const datasetLabel = context.dataset.label || "";
          // Conservative type guard - only handle what we actually use
          if (typeof value === "number" || typeof value === "string") {
            return datasetLabel.includes("%") ? `${value}%` : value;
          }
          return value;
        },
        font: {
          family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          weight: 600,
          size: 12,
        },
        color: "#475569", // slate-600
        offset: 4,
        backgroundColor: "rgba(248, 250, 252, 0.9)", // slate-50 with opacity
        borderColor: "#e2e8f0", // slate-200
        borderWidth: 1,
        borderRadius: 6,
        padding: {
          top: 4,
          bottom: 4,
          left: 8,
          right: 8,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          color: "#e2e8f0", // slate-200
        },
        ticks: {
          font: {
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
            weight: 500,
          },
          color: "#64748b", // slate-500
          padding: 12,
        },
      },
      y: {
        beginAtZero: true,
        border: {
          color: "#e2e8f0", // slate-200
        },
        grid: {
          color: "#f1f5f9", // slate-100
          lineWidth: 1,
        },
        ticks: {
          font: {
            family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
            weight: 500,
          },
          color: "#64748b", // slate-500
          padding: 12,
          callback: function (value: string | number) {
            if (typeof value === "number") {
              const hasPercentageDataset = data.datasets.some((ds) =>
                ds.label?.includes("%")
              );
              if (hasPercentageDataset && value > 1 && value <= 100)
                return value + "%";
              if (Number.isInteger(value)) return value;
            }
            return value;
          },
        },
      },
    },
    elements: {
      bar: {
        borderRadius: {
          topLeft: 8,
          topRight: 8,
          bottomLeft: 0,
          bottomRight: 0,
        },
        borderSkipped: false,
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    animation: {
      duration: 800,
      easing: "easeInOutQuart",
    },
  };

  const mergedOptions = { ...defaultOptions };
  if (options) {
    Object.keys(options).forEach((key) => {
      const optionKey = key as keyof ChartOptions<"bar">;
      if (
        optionKey === "plugins" &&
        options.plugins &&
        defaultOptions.plugins
      ) {
        mergedOptions.plugins = {
          ...defaultOptions.plugins,
          ...options.plugins,
        };
        if (options.plugins.datalabels) {
          mergedOptions.plugins.datalabels = {
            ...(defaultOptions.plugins?.datalabels || {}),
            ...(options.plugins.datalabels || {}),
          };
        }
      } else if (
        optionKey === "scales" &&
        options.scales &&
        defaultOptions.scales
      ) {
        mergedOptions.scales = { ...defaultOptions.scales, ...options.scales };
      } else {
        // Conservative fallback for other option types - preserve type safety
        const optionValue = options[optionKey];
        if (optionValue !== undefined) {
          (mergedOptions as Record<string, unknown>)[optionKey] = optionValue;
        }
      }
    });
  }

  if (titleText && mergedOptions.plugins?.title) {
    mergedOptions.plugins.title.display = true;
    mergedOptions.plugins.title.text = titleText;
  }

  // Modern color palette
  const modernColors = [
    {
      bg: "rgba(99, 102, 241, 0.8)", // indigo-500
      border: "rgba(99, 102, 241, 1)",
      hover: "rgba(99, 102, 241, 0.9)",
    },
    {
      bg: "rgba(16, 185, 129, 0.8)", // emerald-500
      border: "rgba(16, 185, 129, 1)",
      hover: "rgba(16, 185, 129, 0.9)",
    },
    {
      bg: "rgba(245, 158, 11, 0.8)", // amber-500
      border: "rgba(245, 158, 11, 1)",
      hover: "rgba(245, 158, 11, 0.9)",
    },
    {
      bg: "rgba(239, 68, 68, 0.8)", // red-500
      border: "rgba(239, 68, 68, 1)",
      hover: "rgba(239, 68, 68, 0.9)",
    },
    {
      bg: "rgba(168, 85, 247, 0.8)", // violet-500
      border: "rgba(168, 85, 247, 1)",
      hover: "rgba(168, 85, 247, 0.9)",
    },
  ];

  const updatedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => {
      const colorIndex = index % modernColors.length;
      const colors = modernColors[colorIndex];

      return {
        ...dataset,
        barThickness: "flex" as const,
        maxBarThickness: 48,
        backgroundColor: dataset.backgroundColor || colors.bg,
        borderColor: dataset.borderColor || colors.border,
        hoverBackgroundColor: colors.hover,
        borderWidth: 0,
        borderRadius: 8,
      };
    }),
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}
    >
      <Bar options={mergedOptions} data={updatedData} />
    </div>
  );
};

export default BarChart;
