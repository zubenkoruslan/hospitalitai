import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  AcademicCapIcon,
  TrophyIcon,
  UserIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  AcademicCapIcon as AcademicCapIconSolid,
  TrophyIcon as TrophyIconSolid,
  UserIcon as UserIconSolid,
  ChartBarIcon as ChartBarIconSolid,
} from "@heroicons/react/24/solid";

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
    path: "/staff/quizzes",
    label: "Quizzes",
    icon: AcademicCapIcon,
    iconSolid: AcademicCapIconSolid,
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

  const isActive = (path: string) => {
    if (path === "/staff/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-40 safe-area-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = active ? item.iconSolid : item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex flex-col items-center justify-center h-16 space-y-1 transition-all duration-200
                ${
                  active
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-slate-800 active:bg-slate-50"
                }
              `}
            >
              <Icon className="w-6 h-6" />
              <span
                className={`text-xs font-medium ${
                  active ? "font-semibold" : ""
                }`}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {active && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
