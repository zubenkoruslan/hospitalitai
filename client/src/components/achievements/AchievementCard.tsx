import React from "react";
import {
  CheckCircleIcon,
  LockClosedIcon,
  CalendarIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import Card from "../common/Card";

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "legendary";
  earnedAt?: string;
  isUnlocked: boolean;
  progress?: number;
  target?: number;
  points: number;
  isRare?: boolean;
}

interface AchievementCardProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  size = "md",
  onClick,
  className = "",
}) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "legendary":
        return "from-purple-500 to-pink-500";
      case "platinum":
        return "from-gray-400 to-gray-600";
      case "gold":
        return "from-yellow-400 to-yellow-600";
      case "silver":
        return "from-gray-300 to-gray-500";
      case "bronze":
        return "from-orange-400 to-orange-600";
      default:
        return "from-gray-200 to-gray-400";
    }
  };

  const getTierTextColor = (tier: string) => {
    switch (tier) {
      case "legendary":
        return "text-purple-600";
      case "platinum":
        return "text-gray-600";
      case "gold":
        return "text-yellow-600";
      case "silver":
        return "text-gray-600";
      case "bronze":
        return "text-orange-600";
      default:
        return "text-gray-500";
    }
  };

  const getTierBorderColor = (tier: string) => {
    switch (tier) {
      case "legendary":
        return "border-purple-300";
      case "platinum":
        return "border-gray-300";
      case "gold":
        return "border-yellow-300";
      case "silver":
        return "border-gray-300";
      case "bronze":
        return "border-orange-300";
      default:
        return "border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const sizeClasses = {
    sm: {
      card: "p-3",
      emoji: "w-8 h-8 text-lg",
      title: "text-sm font-semibold",
      description: "text-xs",
      badge: "text-xs px-2 py-1",
      points: "text-sm",
    },
    md: {
      card: "p-4",
      emoji: "w-10 h-10 text-xl",
      title: "text-base font-semibold",
      description: "text-sm",
      badge: "text-xs px-2 py-1",
      points: "text-base",
    },
    lg: {
      card: "p-6",
      emoji: "w-12 h-12 text-2xl",
      title: "text-lg font-bold",
      description: "text-base",
      badge: "text-sm px-3 py-1",
      points: "text-lg",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <Card
      className={`
        ${currentSize.card}
        ${
          onClick
            ? "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            : ""
        }
        ${
          achievement.isUnlocked
            ? `bg-gradient-to-br from-white to-slate-50 ${getTierBorderColor(
                achievement.tier
              )} border-2`
            : "bg-slate-50 border-2 border-slate-200"
        }
        ${achievement.isRare ? "ring-2 ring-purple-300 ring-opacity-50" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`
              ${currentSize.emoji} rounded-full flex items-center justify-center
              ${
                achievement.isUnlocked
                  ? `bg-gradient-to-br ${getTierColor(
                      achievement.tier
                    )} shadow-lg`
                  : "bg-slate-200 grayscale"
              }
            `}
          >
            {achievement.isUnlocked ? achievement.emoji : "🔒"}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={`${currentSize.title} ${
                achievement.isUnlocked ? "text-slate-800" : "text-slate-500"
              } truncate`}
            >
              {achievement.title}
            </h3>
            <div className="flex items-center space-x-1 mt-1">
              <span
                className={`${
                  currentSize.badge
                } font-medium rounded-full ${getTierTextColor(
                  achievement.tier
                )} bg-white`}
              >
                {achievement.tier.toUpperCase()}
              </span>
              {achievement.isRare && (
                <span
                  className={`${currentSize.badge} font-medium rounded-full text-purple-600 bg-purple-100`}
                >
                  RARE
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`text-right ${
              achievement.isUnlocked ? "text-slate-600" : "text-slate-400"
            }`}
          >
            <div className={`${currentSize.points} font-bold`}>
              {achievement.points}
            </div>
            <div className="text-xs">pts</div>
          </div>
          {achievement.isUnlocked ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <LockClosedIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
          )}
        </div>
      </div>

      <p
        className={`${currentSize.description} mb-3 ${
          achievement.isUnlocked ? "text-slate-600" : "text-slate-400"
        } line-clamp-2`}
      >
        {achievement.description}
      </p>

      {achievement.isUnlocked ? (
        <div className="flex items-center space-x-2 text-green-600">
          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-medium">
            Unlocked {formatDate(achievement.earnedAt!)}
          </span>
        </div>
      ) : achievement.progress !== undefined ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-600">Progress</span>
            <span className="text-slate-800 font-medium">
              {achievement.progress}/{achievement.target}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`bg-gradient-to-r ${getTierColor(
                achievement.tier
              )} h-2 rounded-full transition-all duration-500`}
              style={{
                width: `${
                  ((achievement.progress || 0) / (achievement.target || 1)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic">Not started</div>
      )}
    </Card>
  );
};

export default AchievementCard;
