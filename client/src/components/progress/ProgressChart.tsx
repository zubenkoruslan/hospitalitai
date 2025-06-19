import React from "react";
import Card from "../common/Card";

interface ProgressDataPoint {
  date: string;
  score: number;
  quizTitle: string;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  className?: string;
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  className = "",
}) => {
  if (!data || data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Progress Over Time
        </h3>
        <div className="flex items-center justify-center h-48 text-slate-500">
          <div className="text-center">
            <div className="text-slate-300 mb-2">📈</div>
            <p>No progress data available yet</p>
            <p className="text-sm">
              Complete more quizzes to see your progress!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Calculate chart dimensions and scales
  const chartWidth = 400;
  const chartHeight = 200;
  const padding = 40;
  const maxScore = Math.max(...data.map((d) => d.score), 100);
  const minScore = Math.min(...data.map((d) => d.score), 0);

  // Create SVG path for the line
  const createPath = (points: ProgressDataPoint[]) => {
    if (points.length === 0) return "";

    return points
      .map((point, index) => {
        const x =
          padding +
          (index * (chartWidth - 2 * padding)) / (points.length - 1 || 1);
        const y =
          chartHeight -
          padding -
          ((point.score - minScore) * (chartHeight - 2 * padding)) /
            (maxScore - minScore || 1);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const pathData = createPath(data);

  // Generate grid lines
  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const y = padding + (i * (chartHeight - 2 * padding)) / 4;
    const score = maxScore - (i * (maxScore - minScore)) / 4;
    gridLines.push(
      <g key={i}>
        <line
          x1={padding}
          y1={y}
          x2={chartWidth - padding}
          y2={y}
          stroke="#e2e8f0"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        <text
          x={padding - 10}
          y={y + 4}
          fontSize="12"
          fill="#64748b"
          textAnchor="end"
        >
          {Math.round(score)}%
        </text>
      </g>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Progress Over Time
      </h3>

      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
          {/* Grid lines */}
          {gridLines}

          {/* Progress line */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x =
              padding +
              (index * (chartWidth - 2 * padding)) / (data.length - 1 || 1);
            const y =
              chartHeight -
              padding -
              ((point.score - minScore) * (chartHeight - 2 * padding)) /
                (maxScore - minScore || 1);

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="2"
                  className="hover:r-6 transition-all duration-200 cursor-pointer"
                />
                <title>{`${point.quizTitle}: ${point.score}%`}</title>
              </g>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <div>
          {data.length > 0 && (
            <span>
              Latest: {data[data.length - 1]?.score}% (
              {new Date(data[data.length - 1]?.date).toLocaleDateString()})
            </span>
          )}
        </div>
        <div>
          {data.length > 1 && (
            <span
              className={`font-medium ${
                data[data.length - 1]?.score >= data[data.length - 2]?.score
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {data[data.length - 1]?.score >= data[data.length - 2]?.score
                ? "↗"
                : "↘"}
              {Math.abs(
                data[data.length - 1]?.score - data[data.length - 2]?.score
              ).toFixed(1)}
              %
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProgressChart;
