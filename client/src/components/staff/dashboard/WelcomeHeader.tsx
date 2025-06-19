import React from "react";
import { UserIcon, FireIcon, StarIcon } from "@heroicons/react/24/outline";

interface WelcomeHeaderProps {
  staffMember: {
    firstName: string;
    lastName: string;
  };
  currentStreak: number;
  totalCompleted: number;
  averageScore: number;
}

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getMotivationalMessage = (streak: number): string => {
  if (streak >= 7) return "You're on fire! Amazing dedication! 🌟";
  if (streak >= 3) return "Building great habits! Keep it up! 💪";
  if (streak >= 1) return "Great start! You're doing awesome! 🎯";
  return "Ready to begin your learning journey? Let's go! 🚀";
};

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  staffMember,
  currentStreak,
  totalCompleted,
  averageScore,
}) => {
  const timeOfDay = getTimeOfDayGreeting();

  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 lg:p-6 mb-6 shadow-sm">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
          <UserIcon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
            {timeOfDay}, {staffMember.firstName}! 👋
          </h1>
          <p className="text-slate-600 text-sm lg:text-base">
            {getMotivationalMessage(currentStreak)}
          </p>
        </div>
      </div>

      {/* Quick achievements */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
          <div className="flex items-center justify-center mb-2">
            <FireIcon className="w-5 h-5 lg:w-6 lg:h-6 text-orange-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-orange-600">
            {currentStreak}
          </div>
          <div className="text-xs lg:text-sm text-slate-600 font-medium">
            Day Streak
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
          <div className="flex items-center justify-center mb-2">
            <StarIcon className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-green-600">
            {totalCompleted}
          </div>
          <div className="text-xs lg:text-sm text-slate-600 font-medium">
            Completed
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
          <div className="flex items-center justify-center mb-2">
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">%</span>
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-blue-600">
            {averageScore}%
          </div>
          <div className="text-xs lg:text-sm text-slate-600 font-medium">
            Avg Score
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
