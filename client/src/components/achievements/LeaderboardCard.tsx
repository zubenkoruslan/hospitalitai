import React from "react";
import Card from "../common/Card";
import { UserIcon } from "@heroicons/react/24/outline";

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  achievementsCount: number;
  avatar?: string;
  isCurrentUser?: boolean;
}

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  title?: string;
  maxEntries?: number;
  showAchievementCount?: boolean;
  className?: string;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  entries,
  title = "Leaderboard",
  maxEntries = 10,
  showAchievementCount = true,
  className = "",
}) => {
  const getRankDisplay = (rank: number) => {
    if (rank === 1)
      return {
        emoji: "🥇",
        text: "1st",
        color: "from-yellow-400 to-yellow-600",
      };
    if (rank === 2)
      return { emoji: "🥈", text: "2nd", color: "from-gray-300 to-gray-500" };
    if (rank === 3)
      return {
        emoji: "🥉",
        text: "3rd",
        color: "from-orange-400 to-orange-600",
      };
    return {
      emoji: `#${rank}`,
      text: `${rank}th`,
      color: "from-slate-400 to-slate-600",
    };
  };

  const displayEntries = entries.slice(0, maxEntries);

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>

      {displayEntries.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500">No leaderboard data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayEntries.map((entry) => {
            const rankDisplay = getRankDisplay(entry.rank);
            return (
              <div
                key={`${entry.rank}-${entry.name}`}
                className={`
                  flex items-center justify-between p-4 rounded-lg transition-all duration-200
                  ${
                    entry.isCurrentUser
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100"
                  }
                `}
              >
                <div className="flex items-center space-x-4">
                  {/* Rank Badge */}
                  <div
                    className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm
                    ${
                      entry.rank <= 3
                        ? `bg-gradient-to-br ${rankDisplay.color}`
                        : "bg-gradient-to-br from-slate-400 to-slate-600"
                    }
                  `}
                  >
                    {entry.rank <= 3 ? rankDisplay.emoji : `#${entry.rank}`}
                  </div>

                  {/* User Info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4
                        className={`font-semibold ${
                          entry.isCurrentUser
                            ? "text-blue-800"
                            : "text-slate-800"
                        }`}
                      >
                        {entry.name}
                      </h4>
                      {entry.isCurrentUser && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          You
                        </span>
                      )}
                    </div>
                    {showAchievementCount && (
                      <p className="text-sm text-slate-600">
                        {entry.achievementsCount} achievement
                        {entry.achievementsCount !== 1 ? "s" : ""} unlocked
                      </p>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      entry.isCurrentUser ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {entry.points.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500">points</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show more indicator */}
      {entries.length > maxEntries && (
        <div className="text-center mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            +{entries.length - maxEntries} more participants
          </p>
        </div>
      )}
    </Card>
  );
};

export default LeaderboardCard;
