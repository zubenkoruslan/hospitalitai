import React from "react";
import {
  TrophyIcon,
  StarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Card from "../../common/Card";

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  earnedAt: string;
  isNew?: boolean;
}

interface AchievementsBannerProps {
  recentAchievements: Achievement[];
  totalAchievements: number;
  onViewAll: () => void;
}

const getTierColor = (tier: Achievement["tier"]) => {
  switch (tier) {
    case "bronze":
      return "from-amber-600 to-orange-600";
    case "silver":
      return "from-slate-400 to-gray-500";
    case "gold":
      return "from-yellow-400 to-yellow-600";
    case "platinum":
      return "from-purple-400 to-indigo-600";
    default:
      return "from-blue-400 to-blue-600";
  }
};

const getTierBg = (tier: Achievement["tier"]) => {
  switch (tier) {
    case "bronze":
      return "bg-amber-50 border-amber-200";
    case "silver":
      return "bg-slate-50 border-slate-200";
    case "gold":
      return "bg-yellow-50 border-yellow-200";
    case "platinum":
      return "bg-purple-50 border-purple-200";
    default:
      return "bg-blue-50 border-blue-200";
  }
};

const AchievementsBanner: React.FC<AchievementsBannerProps> = ({
  recentAchievements,
  totalAchievements,
  onViewAll,
}) => {
  if (recentAchievements.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-200 hover:border-slate-300 transition-colors duration-200 mb-6">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrophyIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Start Earning Achievements!
          </h3>
          <p className="text-slate-600 text-sm">
            Complete quizzes to unlock badges and trophies
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl lg:text-2xl font-semibold text-slate-800">
          Your Achievements 🏆
        </h2>
        {totalAchievements > 0 && (
          <button
            onClick={onViewAll}
            className="text-blue-600 hover:text-blue-700 text-sm lg:text-base font-medium transition-colors duration-200"
          >
            View All ({totalAchievements})
          </button>
        )}
      </div>

      {/* Recent Achievement Spotlight */}
      {recentAchievements.length > 0 && recentAchievements[0].isNew && (
        <div
          className="text-white border-0 rounded-2xl mb-4 shadow-lg transform hover:scale-[1.02] transition-all duration-200"
          style={{
            background: "linear-gradient(to right, #F59E0B, #D97706)",
          }}
        >
          <div className="p-4 lg:p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">
                    {recentAchievements[0].emoji}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-white text-xs lg:text-sm font-bold mb-1 bg-white/20 px-2 py-1 rounded-full inline-block">
                  🎉 NEW ACHIEVEMENT!
                </div>
                <h3 className="text-lg lg:text-xl font-bold mb-1 text-white">
                  {recentAchievements[0].title}
                </h3>
                <p className="text-amber-100 text-sm lg:text-base">
                  {recentAchievements[0].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {recentAchievements
          .slice(recentAchievements[0]?.isNew ? 1 : 0, 4)
          .map((achievement) => (
            <Card
              key={achievement.id}
              className={`${getTierBg(
                achievement.tier
              )} border-2 hover:scale-105 transition-all duration-200 cursor-pointer`}
            >
              <div className="p-3 lg:p-4 text-center">
                <div className="relative mb-3">
                  <div
                    className={`w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br ${getTierColor(
                      achievement.tier
                    )} rounded-full flex items-center justify-center mx-auto shadow-lg`}
                  >
                    <span className="text-lg lg:text-xl">
                      {achievement.emoji}
                    </span>
                  </div>
                  {achievement.tier === "gold" && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <StarIcon className="w-3 h-3 text-yellow-800" />
                    </div>
                  )}
                </div>
                <h4 className="font-semibold text-slate-800 text-xs lg:text-sm mb-1 line-clamp-2">
                  {achievement.title}
                </h4>
                <p className="text-slate-600 text-xs line-clamp-2">
                  {achievement.description}
                </p>
              </div>
            </Card>
          ))}

        {/* View More Card */}
        {totalAchievements > 4 && (
          <Card
            className="border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors duration-200 cursor-pointer"
            onClick={onViewAll}
          >
            <div className="p-3 lg:p-4 text-center h-full flex flex-col justify-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrophyIcon className="w-5 h-5 lg:w-6 lg:h-6 text-slate-500" />
              </div>
              <p className="text-slate-600 text-xs lg:text-sm font-medium">
                +{totalAchievements - 4} more
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AchievementsBanner;
