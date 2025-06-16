import React from "react";
import { motion } from "framer-motion";
import {
  HomeIcon,
  BeakerIcon,
  CakeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { MenuView } from "../../hooks/useMenuViews";
import {
  tabAnimations,
  staggerContainer,
  badgeAnimation,
} from "../../utils/animations";

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
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.nav
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex space-x-2 lg:space-x-8 px-3 lg:px-6 overflow-x-auto"
        aria-label="Menu sections"
      >
        {navigationTabs.map((tab) => {
          const isActive = currentView === tab.key;
          return (
            <motion.button
              key={tab.key}
              onClick={() => onViewChange(tab.key)}
              variants={tabAnimations}
              initial="inactive"
              animate={isActive ? "active" : "inactive"}
              whileHover={!isActive ? "hover" : undefined}
              whileTap={{ scale: 0.98 }}
              className={`${
                isActive
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500"
              } whitespace-nowrap py-4 px-1 lg:px-2 border-b-2 font-medium text-sm flex items-center space-x-1 lg:space-x-2 flex-shrink-0 relative`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.shortLabel}</span>
              {tab.count !== undefined && (
                <motion.span
                  variants={badgeAnimation}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  className={`${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  } py-0.5 px-1 lg:px-2 rounded-full text-xs font-medium`}
                >
                  {tab.count}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </motion.nav>
    </motion.div>
  );
};

export default MenuNavigationTabs;
