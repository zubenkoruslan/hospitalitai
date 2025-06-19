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
    sm: { container: "w-20 h-20", stroke: 6, radius: 34 },
    md: { container: "w-28 h-28", stroke: 8, radius: 46 },
    lg: { container: "w-36 h-36", stroke: 10, radius: 58 },
  };

  const { container, stroke, radius } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${
    (progress / 100) * circumference
  } ${circumference}`;

  return (
    <div className={`relative ${container} mx-auto`}>
      {/* Background Circle */}
      <svg
        className={`${container} transform -rotate-90`}
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="none"
          className="opacity-30"
        />

        {/* Progress Circle */}
        <circle
          cx="60"
          cy="60"
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
