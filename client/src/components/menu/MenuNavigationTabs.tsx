import React from "react";
import {
  HomeIcon,
  BeakerIcon,
  CakeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { MenuView } from "../../hooks/useMenuViews";

interface MenuNavigationTabsProps {
  currentView: MenuView;
  onViewChange: (view: MenuView) => void;
  stats: {
    totalItems: number;
    foodCount: number;
    beverageCount: number;
    wineCount: number;
  };
}

const MenuNavigationTabs: React.FC<MenuNavigationTabsProps> = ({
  currentView,
  onViewChange,
  stats,
}) => {
  const navigationTabs = [
    {
      key: "dashboard" as MenuView,
      label: "Overview",
      shortLabel: "Home",
      icon: HomeIcon,
    },
    {
      key: "food" as MenuView,
      label: "Food Items",
      shortLabel: "Food",
      icon: CakeIcon,
      count: stats.foodCount,
    },
    {
      key: "beverages" as MenuView,
      label: "Beverages",
      shortLabel: "Drinks",
      icon: BeakerIcon,
      count: stats.beverageCount,
    },
    {
      key: "wines" as MenuView,
      label: "Wine List",
      shortLabel: "Wines",
      icon: SparklesIcon,
      count: stats.wineCount,
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <nav
        className="flex space-x-2 lg:space-x-8 px-3 lg:px-6 overflow-x-auto"
        aria-label="Menu sections"
      >
        {navigationTabs.map((tab) => {
          const isActive = currentView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onViewChange(tab.key)}
              className={`${
                isActive
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 lg:px-2 border-b-2 font-medium text-sm flex items-center space-x-1 lg:space-x-2 flex-shrink-0 transition-colors duration-200`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.shortLabel}</span>
              {tab.count !== undefined && (
                <span
                  className={`${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  } py-0.5 px-1 lg:px-2 rounded-full text-xs font-medium`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default MenuNavigationTabs;
