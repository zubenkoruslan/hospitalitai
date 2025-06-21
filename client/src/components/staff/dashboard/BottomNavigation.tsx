import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  TrophyIcon,
  UserIcon,
  ChartBarIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  TrophyIcon as TrophyIconSolid,
  UserIcon as UserIconSolid,
  ChartBarIcon as ChartBarIconSolid,
} from "@heroicons/react/24/solid";
import QuizTypeSelectionModal from "../../quiz/QuizTypeSelectionModal";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    path: "/staff/dashboard",
    label: "Home",
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    path: "/staff/progress",
    label: "Progress",
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
  },
  {
    path: "/staff/achievements",
    label: "Awards",
    icon: TrophyIcon,
    iconSolid: TrophyIconSolid,
  },
  {
    path: "/staff/profile",
    label: "Profile",
    icon: UserIcon,
    iconSolid: UserIconSolid,
  },
];

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isQuizTypeModalOpen, setIsQuizTypeModalOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/staff/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Split nav items into two groups for left and right of the CTA button
  const leftNavItems = navItems.slice(0, 2);
  const rightNavItems = navItems.slice(2);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg lg:hidden z-40 safe-area-bottom">
        <div className="relative flex h-20 px-4">
          {/* Left nav items */}
          <div className="flex flex-1 justify-around items-center">
            {leftNavItems.map((item) => {
              const active = isActive(item.path);
              const Icon = active ? item.iconSolid : item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200
                    ${
                      active
                        ? "text-blue-600"
                        : "text-gray-400 hover:text-gray-600 active:bg-gray-50"
                    }
                  `}
                >
                  <Icon className="w-7 h-7 mb-1" />
                </button>
              );
            })}
          </div>

          {/* Central Take Quiz CTA Button */}
          <div className="flex items-center justify-center px-8">
            <button
              onClick={() => setIsQuizTypeModalOpen(true)}
              className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
            >
              <PlayIcon className="w-6 h-6 text-white ml-0.5" />
            </button>
          </div>

          {/* Right nav items */}
          <div className="flex flex-1 justify-around items-center">
            {rightNavItems.map((item) => {
              const active = isActive(item.path);
              const Icon = active ? item.iconSolid : item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200
                    ${
                      active
                        ? "text-blue-600"
                        : "text-gray-400 hover:text-gray-600 active:bg-gray-50"
                    }
                  `}
                >
                  <Icon className="w-7 h-7 mb-1" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quiz Type Selection Modal */}
      <QuizTypeSelectionModal
        isOpen={isQuizTypeModalOpen}
        onClose={() => setIsQuizTypeModalOpen(false)}
      />
    </>
  );
};

export default BottomNavigation;
