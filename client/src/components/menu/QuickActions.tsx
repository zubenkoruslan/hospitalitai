import React from "react";
import {
  PlusIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
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
        w-full p-3 text-left rounded-lg border ${borderColor} bg-white transition-all duration-200
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-md hover:bg-gray-50"
        }
        group
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 rounded-lg ${bgColor} ${
            disabled ? "opacity-70" : ""
          } transition-all duration-200`}
        >
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900 group-hover:text-gray-700">
            {title}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
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
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-blue-100 rounded-lg mr-3">
          <PlusIcon className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
      </div>

      <div className="space-y-4">
        {/* Add Items Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Add New Items
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <ActionButton
              title="Add Food Item"
              description="Create new food menu item"
              icon={CakeIcon}
              onClick={onAddFood}
              color="text-blue-700"
              bgColor="bg-blue-200"
              borderColor="border-blue-300"
            />

            <ActionButton
              title="Add Beverage"
              description="Create new beverage item"
              icon={BeakerIcon}
              onClick={onAddBeverage}
              color="text-green-600"
              bgColor="bg-green-100"
              borderColor="border-green-200"
            />

            <ActionButton
              title="Add Wine"
              description="Create new wine item"
              icon={SparklesIcon}
              onClick={onAddWine}
              color="text-purple-600"
              bgColor="bg-purple-100"
              borderColor="border-purple-200"
            />
          </div>
        </div>

        {/* Bulk Operations Section */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Bulk Operations
          </h4>
          <div className="space-y-2">
            <ActionButton
              title="Import Menu"
              description="Upload PDF or other formats"
              icon={ArrowUpTrayIcon}
              onClick={onBulkImport}
              color="text-green-600"
              bgColor="bg-green-100"
              borderColor="border-green-300"
            />

            <ActionButton
              title="Export Menu"
              description="Download in various formats"
              icon={DocumentArrowDownIcon}
              onClick={onExportMenu}
              color="text-blue-600"
              bgColor="bg-blue-100"
              borderColor="border-blue-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
