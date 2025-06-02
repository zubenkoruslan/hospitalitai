import React from "react";
import { KnowledgeCategory } from "../../types/questionBankTypes";
import {
  CakeIcon,
  BoltIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface KnowledgeCategoryFilterProps {
  selectedCategories: KnowledgeCategory[];
  onCategoryToggle: (category: KnowledgeCategory) => void;
  onClearAll: () => void;
  className?: string;
  showClearAll?: boolean;
  allowMultiple?: boolean;
}

// Category configuration with visual elements
const CATEGORY_CONFIG = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: {
    icon: CakeIcon,
    label: "Food Knowledge",
    description: "Menu items, ingredients, allergens",
    color: "bg-green-500",
    lightColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    hoverColor: "hover:bg-green-100",
  },
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    description: "Coffee, tea, cocktails, spirits",
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    hoverColor: "hover:bg-blue-100",
  },
  [KnowledgeCategory.WINE_KNOWLEDGE]: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    description: "Wine varieties, pairings, regions",
    color: "bg-purple-500",
    lightColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    hoverColor: "hover:bg-purple-100",
  },
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    description: "SOPs, safety protocols, service",
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    hoverColor: "hover:bg-orange-100",
  },
};

const KnowledgeCategoryFilter: React.FC<KnowledgeCategoryFilterProps> = ({
  selectedCategories,
  onCategoryToggle,
  onClearAll,
  className = "",
  showClearAll = true,
  allowMultiple = true,
}) => {
  const handleCategoryClick = (category: KnowledgeCategory) => {
    if (!allowMultiple) {
      // Single selection mode
      if (selectedCategories.includes(category)) {
        onClearAll(); // Deselect if clicking the same category
      } else {
        onCategoryToggle(category); // This should clear others and select this one
      }
    } else {
      // Multiple selection mode
      onCategoryToggle(category);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Filter by Knowledge Category
        </h3>
        {showClearAll && selectedCategories.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category Filter Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {Object.values(KnowledgeCategory).map((category) => {
          const config = CATEGORY_CONFIG[category];
          const IconComponent = config.icon;
          const isSelected = selectedCategories.includes(category);

          return (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`
                relative p-3 rounded-lg border transition-all duration-200 text-left
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${
                  isSelected
                    ? `${config.lightColor} ${config.borderColor} ${config.textColor} ring-2 ring-blue-500 ring-offset-1`
                    : `border-gray-200 ${config.hoverColor} hover:border-gray-300`
                }
              `}
              title={config.description}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`
                    flex-shrink-0 p-1.5 rounded
                    ${isSelected ? config.color : "bg-gray-100"}
                  `}
                >
                  <IconComponent
                    className={`h-4 w-4 ${
                      isSelected ? "text-white" : "text-gray-600"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-medium ${
                      isSelected ? config.textColor : "text-gray-900"
                    }`}
                  >
                    {config.label.replace(" Knowledge", "")}
                  </div>
                  <div
                    className={`text-xs ${
                      isSelected ? config.textColor : "text-gray-500"
                    } truncate`}
                  >
                    {config.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${config.color}`} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Categories Summary */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map((category) => {
            const config = CATEGORY_CONFIG[category];
            const IconComponent = config.icon;

            return (
              <span
                key={category}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.lightColor} ${config.textColor}`}
              >
                <IconComponent className="h-3 w-3" />
                {config.label.replace(" Knowledge", "")}
                {allowMultiple && (
                  <button
                    onClick={() => onCategoryToggle(category)}
                    className="ml-1 hover:bg-white hover:bg-opacity-50 rounded-full p-0.5"
                    aria-label={`Remove ${config.label} filter`}
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        {allowMultiple
          ? "Select one or more categories to filter questions. Click a selected category to remove it."
          : "Select a category to filter questions. Click again to clear the filter."}
      </p>
    </div>
  );
};

export default KnowledgeCategoryFilter;
