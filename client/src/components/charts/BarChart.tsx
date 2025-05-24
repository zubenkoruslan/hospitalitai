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
}

const BarChart: React.FC<BarChartProps> = ({ data, options, titleText }) => {
  const defaultOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          color: "#4A5568",
          padding: 20,
        },
      },
      title: {
        display: !!titleText,
        text: titleText || "",
        font: {
          family: "'Inter', sans-serif",
          size: 18,
          weight: 600,
        },
        color: "#2D3748",
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          family: "'Inter', sans-serif",
          size: 14,
          weight: "bold",
        },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 4,
        displayColors: false,
      },
      datalabels: {
        anchor: "end",
        align: "top",
        formatter: (value: any, context: Context) => {
          const datasetLabel = context.dataset.label || "";
          return datasetLabel.includes("%") ? `${value}%` : value;
        },
        font: {
          family: "'Inter', sans-serif",
          weight: 500,
          size: 11,
        },
        color: "#4A5568",
        offset: -4,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11,
          },
          color: "#718096",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#E2E8F0",
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11,
          },
          color: "#718096",
          padding: 8,
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
        borderRadius: 5,
        borderSkipped: false,
      },
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
        (mergedOptions as any)[optionKey] = (options as any)[optionKey];
      }
    });
  }

  if (titleText && mergedOptions.plugins?.title) {
    mergedOptions.plugins.title.display = true;
    mergedOptions.plugins.title.text = titleText;
  }

  const updatedData = {
    ...data,
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      barThickness: "flex" as const,
      maxBarThickness: 40,
      backgroundColor: dataset.backgroundColor || "rgba(75, 192, 192, 0.6)",
      borderColor: dataset.borderColor || "rgba(75, 192, 192, 1)",
    })),
  };

  return <Bar options={mergedOptions} data={updatedData} />;
};

export default BarChart;
