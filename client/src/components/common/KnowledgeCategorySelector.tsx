import React, { useState, useCallback } from "react";
import {
  // Food Knowledge - using cake icon as closest match for food
  CakeIcon,
  // Beverage Knowledge - using coffee cup icon
  BoltIcon, // We'll use bolt for energy/caffeine
  // Wine Knowledge - using wine glass equivalent
  GiftIcon, // We'll use gift as closest match
  // Procedures Knowledge - using clipboard
  ClipboardDocumentListIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Knowledge category types
export enum KnowledgeCategory {
  FOOD_KNOWLEDGE = "food-knowledge",
  BEVERAGE_KNOWLEDGE = "beverage-knowledge",
  WINE_KNOWLEDGE = "wine-knowledge",
  PROCEDURES_KNOWLEDGE = "procedures-knowledge",
}

// Category metadata
const CATEGORY_INFO = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: {
    icon: CakeIcon,
    title: "Food Knowledge",
    description: "Menu items, ingredients, dietary restrictions, allergens",
    color: "bg-green-500",
    lightColor: "bg-green-50 border-green-200",
    textColor: "text-green-700",
  },
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
    icon: BoltIcon,
    title: "Beverage Knowledge",
    description: "Coffee, tea, soft drinks, cocktails, spirits, beer",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
  },
  [KnowledgeCategory.WINE_KNOWLEDGE]: {
    icon: GiftIcon,
    title: "Wine Knowledge",
    description: "Wine varieties, regions, pairings, tasting notes",
    color: "bg-purple-500",
    lightColor: "bg-purple-50 border-purple-200",
    textColor: "text-purple-700",
  },
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
    icon: ClipboardDocumentListIcon,
    title: "Procedures Knowledge",
    description: "SOPs, safety protocols, service standards, policies",
    color: "bg-orange-500",
    lightColor: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
  },
};

export interface KnowledgeCategorySelectorProps {
  selectedCategory: KnowledgeCategory;
  onCategoryChange: (category: KnowledgeCategory) => void;
  required?: boolean;
  disabled?: boolean;
  showTooltips?: boolean;
  className?: string;
}

const KnowledgeCategorySelector: React.FC<KnowledgeCategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  required = false,
  disabled = false,
  showTooltips = true,
  className = "",
}) => {
  const [errors, setErrors] = useState<string[]>([]);

  // Validate selections
  const validateSelections = useCallback(() => {
    const newErrors: string[] = [];

    if (required && !selectedCategory) {
      newErrors.push("Knowledge category is required");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [selectedCategory, required]);

  // Handle category selection
  const handleCategorySelect = (category: KnowledgeCategory) => {
    if (disabled) return;

    onCategoryChange(category);

    // Validate after change
    setTimeout(validateSelections, 0);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Knowledge Category
          {required && <span className="text-red-500 ml-1">*</span>}
          {showTooltips && (
            <div className="inline-flex items-center ml-2">
              <InformationCircleIcon className="h-4 w-4 text-gray-400" />
              <span className="sr-only">
                Select the primary knowledge area this question tests
              </span>
            </div>
          )}
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(KnowledgeCategory).map((category) => {
            const info = CATEGORY_INFO[category];
            const IconComponent = info.icon;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategorySelect(category)}
                disabled={disabled}
                className={`
                  relative p-4 rounded-lg border-2 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${
                    isSelected
                      ? `${info.lightColor} border-current ${info.textColor} ring-2 ring-blue-500`
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                  ${
                    disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                `}
                aria-pressed={isSelected}
                aria-describedby={
                  showTooltips ? `${category}-tooltip` : undefined
                }
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`
                      flex-shrink-0 p-2 rounded-lg
                      ${isSelected ? info.color : "bg-gray-100"}
                    `}
                  >
                    <IconComponent
                      className={`h-6 w-6 ${
                        isSelected ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h3
                      className={`font-medium ${
                        isSelected ? info.textColor : "text-gray-900"
                      }`}
                    >
                      {info.title}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        isSelected ? info.textColor : "text-gray-500"
                      }`}
                    >
                      {info.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${info.color}`} />
                    </div>
                  )}
                </div>

                {showTooltips && (
                  <div id={`${category}-tooltip`} className="sr-only">
                    Questions in this category focus on{" "}
                    {info.description.toLowerCase()}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p
              key={index}
              className="text-sm text-red-600 bg-red-50 p-2 rounded-md"
            >
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Help Text */}
      {showTooltips && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <p>
            <strong>Knowledge Categories</strong> help organize questions and
            track staff learning progress across different areas of expertise.
            Choose the category that best matches what this question tests.
          </p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeCategorySelector;
