import React from "react";
import {
  PlusIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  CogIcon,
  TagIcon,
  CakeIcon,
  BeakerIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface QuickActionsProps {
  onAddFood: () => void;
  onAddBeverage: () => void;
  onAddWine: () => void;
  onBulkImport: () => void;
  onExportMenu: () => void;
  onAnalytics: () => void;
  onSettings?: () => void;
  onManageCategories?: () => void;
}

interface ActionButtonProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color: string;
  bgColor: string;
  borderColor: string;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  color,
  bgColor,
  borderColor,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-4 text-left rounded-xl border ${borderColor} bg-white transition-all duration-200
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-md hover:scale-[1.02] hover:border-opacity-80"
        }
        group
      `}
    >
      <div className="flex items-start space-x-3">
        <div
          className={`p-2 rounded-lg ${bgColor} ${
            disabled ? "opacity-70" : "group-hover:scale-110"
          } transition-transform duration-200`}
        >
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
};

const QuickActions: React.FC<QuickActionsProps> = ({
  onAddFood,
  onAddBeverage,
  onAddWine,
  onBulkImport,
  onExportMenu,
  onAnalytics,
  onSettings,
  onManageCategories,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <PlusIcon className="h-4 w-4 text-blue-600" />
        </div>
      </div>

      <div className="space-y-3">
        {/* Add Items Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Add New Items
          </h3>

          <div className="grid grid-cols-1 gap-2">
            <ActionButton
              title="Add Food Item"
              description="Create a new food menu item with ingredients and details"
              icon={CakeIcon}
              onClick={onAddFood}
              color="text-amber-600"
              bgColor="bg-amber-100"
              borderColor="border-amber-200"
            />

            <ActionButton
              title="Add Beverage"
              description="Add cocktails, soft drinks, or other beverages"
              icon={BeakerIcon}
              onClick={onAddBeverage}
              color="text-blue-600"
              bgColor="bg-blue-100"
              borderColor="border-blue-200"
            />

            <ActionButton
              title="Add Wine"
              description="Create wine entries with vintage and tasting notes"
              icon={SparklesIcon}
              onClick={onAddWine}
              color="text-purple-600"
              bgColor="bg-purple-100"
              borderColor="border-purple-200"
            />
          </div>
        </div>

        {/* Bulk Operations Section */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Bulk Operations
          </h3>

          <div className="grid grid-cols-1 gap-2">
            <ActionButton
              title="Import Menu"
              description="Upload CSV or Excel file to import multiple items"
              icon={ArrowUpTrayIcon}
              onClick={onBulkImport}
              color="text-green-600"
              bgColor="bg-green-100"
              borderColor="border-green-200"
            />

            <ActionButton
              title="Export Menu"
              description="Download your menu as PDF or CSV for printing"
              icon={ArrowDownTrayIcon}
              onClick={onExportMenu}
              color="text-indigo-600"
              bgColor="bg-indigo-100"
              borderColor="border-indigo-200"
            />
          </div>
        </div>

        {/* Management Section */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Management
          </h3>

          <div className="grid grid-cols-1 gap-2">
            <ActionButton
              title="View Analytics"
              description="See detailed insights about your menu performance"
              icon={ChartBarIcon}
              onClick={onAnalytics}
              color="text-cyan-600"
              bgColor="bg-cyan-100"
              borderColor="border-cyan-200"
            />

            {onManageCategories && (
              <ActionButton
                title="Manage Categories"
                description="Organize and edit menu categories and sections"
                icon={TagIcon}
                onClick={onManageCategories}
                color="text-pink-600"
                bgColor="bg-pink-100"
                borderColor="border-pink-200"
              />
            )}

            {onSettings && (
              <ActionButton
                title="Menu Settings"
                description="Configure menu display options and preferences"
                icon={CogIcon}
                onClick={onSettings}
                color="text-gray-600"
                bgColor="bg-gray-100"
                borderColor="border-gray-200"
              />
            )}
          </div>
        </div>
      </div>

      {/* Pro Tip */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
            <span className="text-xs text-white font-bold">i</span>
          </div>
          <div>
            <p className="text-xs text-blue-700 font-medium">Pro Tip</p>
            <p className="text-xs text-blue-600 mt-1 leading-relaxed">
              Use bulk import to quickly add multiple items from a spreadsheet.
              Our AI will automatically categorize and enhance your menu items.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
