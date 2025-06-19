import React from "react";

interface ProgressRingProps {
  progress: number; // 0-100
  level: number;
  size?: "sm" | "md" | "lg";
  showXP?: boolean;
  currentXP?: number;
  xpToNextLevel?: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  level,
  size = "md",
  showXP = false,
  currentXP = 0,
  xpToNextLevel = 100,
}) => {
  const sizes = {
    sm: { container: "w-24 h-24", stroke: 4, radius: 40, viewBox: 100 },
    md: { container: "w-32 h-32", stroke: 6, radius: 42, viewBox: 100 },
    lg: { container: "w-40 h-40", stroke: 8, radius: 42, viewBox: 100 },
  };

  const { container, stroke, radius, viewBox } = sizes[size];
  const center = viewBox / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${
    (progress / 100) * circumference
  } ${circumference}`;

  return (
    <div className={`relative ${container} mx-auto`}>
      {/* Background Circle */}
      <svg
        className={`w-full h-full transform -rotate-90`}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="none"
          className="opacity-30"
        />

        {/* Progress Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-center">
          <div
            className={`font-bold text-slate-800 ${
              size === "sm"
                ? "text-lg"
                : size === "md"
                ? "text-2xl"
                : "text-3xl"
            }`}
          >
            Lvl {level}
          </div>
          <div
            className={`text-slate-600 ${
              size === "sm"
                ? "text-xs"
                : size === "md"
                ? "text-sm"
                : "text-base"
            }`}
          >
            {Math.round(progress)}%
          </div>
          {showXP && (
            <div
              className={`text-slate-500 ${
                size === "sm"
                  ? "text-xs"
                  : size === "md"
                  ? "text-xs"
                  : "text-sm"
              } mt-1`}
            >
              {currentXP}/{currentXP + xpToNextLevel} XP
            </div>
          )}
        </div>
      </div>

      {/* Glowing Effect for High Progress */}
      {progress > 80 && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-green-400 opacity-20 blur-md animate-pulse" />
      )}
    </div>
  );
};

export default ProgressRing;
