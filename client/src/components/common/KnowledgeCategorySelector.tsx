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
  ChevronDownIcon,
  XMarkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Knowledge category types
export enum KnowledgeCategory {
  FOOD_KNOWLEDGE = "food-knowledge",
  BEVERAGE_KNOWLEDGE = "beverage-knowledge",
  WINE_KNOWLEDGE = "wine-knowledge",
  PROCEDURES_KNOWLEDGE = "procedures-knowledge",
}

// Subcategory definitions
const SUBCATEGORIES = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: [
    "ingredients",
    "allergens",
    "preparation",
    "nutrition",
    "menu-items",
    "dietary-restrictions",
    "cooking-methods",
    "food-safety",
  ],
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: [
    "coffee",
    "tea",
    "soft-drinks",
    "juices",
    "preparation",
    "equipment",
    "temperature",
  ],
  [KnowledgeCategory.WINE_KNOWLEDGE]: [
    "varieties",
    "regions",
    "vintages",
    "pairings",
    "service",
    "storage",
    "tasting-notes",
    "production",
  ],
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: [
    "safety",
    "hygiene",
    "service-standards",
    "opening-procedures",
    "closing-procedures",
    "emergency-protocols",
    "customer-service",
  ],
};

// Category metadata
const CATEGORY_INFO = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: {
    icon: CakeIcon,
    title: "Food Knowledge",
    description:
      "Menu items, ingredients, preparation, allergens, and nutrition",
    color: "bg-green-500",
    lightColor: "bg-green-50 border-green-200",
    textColor: "text-green-700",
  },
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
    icon: BoltIcon,
    title: "Beverage Knowledge",
    description: "Non-alcoholic drinks, coffee, tea, preparation methods",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
  },
  [KnowledgeCategory.WINE_KNOWLEDGE]: {
    icon: GiftIcon,
    title: "Wine Knowledge",
    description: "Wine varieties, regions, pairings, service, and storage",
    color: "bg-purple-500",
    lightColor: "bg-purple-50 border-purple-200",
    textColor: "text-purple-700",
  },
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
    icon: ClipboardDocumentListIcon,
    title: "Procedures Knowledge",
    description: "SOPs, safety protocols, service standards, and policies",
    color: "bg-orange-500",
    lightColor: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
  },
};

export interface KnowledgeCategorySelectorProps {
  selectedCategory: KnowledgeCategory;
  selectedSubcategories: string[];
  onCategoryChange: (category: KnowledgeCategory) => void;
  onSubcategoriesChange: (subcategories: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  showTooltips?: boolean;
  className?: string;
}

const KnowledgeCategorySelector: React.FC<KnowledgeCategorySelectorProps> = ({
  selectedCategory,
  selectedSubcategories,
  onCategoryChange,
  onSubcategoriesChange,
  required = false,
  disabled = false,
  showTooltips = true,
  className = "",
}) => {
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] =
    useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Validate selections
  const validateSelections = useCallback(() => {
    const newErrors: string[] = [];

    if (required && !selectedCategory) {
      newErrors.push("Knowledge category is required");
    }

    if (selectedSubcategories.length > 3) {
      newErrors.push("Maximum 3 subcategories allowed");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [selectedCategory, selectedSubcategories, required]);

  // Handle category selection
  const handleCategorySelect = (category: KnowledgeCategory) => {
    if (disabled) return;

    onCategoryChange(category);

    // Clear subcategories if switching categories
    if (category !== selectedCategory) {
      onSubcategoriesChange([]);
    }

    // Validate after change
    setTimeout(validateSelections, 0);
  };

  // Handle subcategory toggle
  const handleSubcategoryToggle = (subcategory: string) => {
    if (disabled) return;

    let newSubcategories: string[];

    if (selectedSubcategories.includes(subcategory)) {
      // Remove subcategory
      newSubcategories = selectedSubcategories.filter(
        (sub) => sub !== subcategory
      );
    } else {
      // Add subcategory (if under limit)
      if (selectedSubcategories.length < 3) {
        newSubcategories = [...selectedSubcategories, subcategory];
      } else {
        return; // Don't add if at limit
      }
    }

    onSubcategoriesChange(newSubcategories);
    setTimeout(validateSelections, 0);
  };

  // Remove subcategory tag
  const removeSubcategory = (subcategory: string) => {
    if (disabled) return;
    handleSubcategoryToggle(subcategory);
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
          {Object.entries(CATEGORY_INFO).map(([category, info]) => {
            const Icon = info.icon;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleCategorySelect(category as KnowledgeCategory)
                }
                className={`
                  p-4 rounded-lg border-2 text-left transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isSelected
                      ? `${info.lightColor} border-current ${info.textColor} ring-2 ring-blue-500 ring-offset-1`
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm"
                  }
                `}
                aria-pressed={isSelected}
                aria-describedby={`${category}-description`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`
                    flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected ? info.color : "bg-gray-100"}
                  `}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isSelected ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{info.title}</h3>
                    <p
                      id={`${category}-description`}
                      className="text-xs text-gray-500 mt-1"
                    >
                      {info.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory Selection */}
      {selectedCategory && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategories (Optional)
            <span className="text-gray-500 text-xs ml-2">
              Select up to 3 specific areas
            </span>
          </label>

          {/* Selected subcategories as tags */}
          {selectedSubcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSubcategories.map((subcategory) => (
                <span
                  key={subcategory}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {subcategory.replace("-", " ")}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeSubcategory(subcategory)}
                      className="ml-2 h-4 w-4 text-blue-600 hover:text-blue-800 focus:outline-none"
                      aria-label={`Remove ${subcategory}`}
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Subcategory dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={disabled || selectedSubcategories.length >= 3}
              onClick={() =>
                setIsSubcategoryDropdownOpen(!isSubcategoryDropdownOpen)
              }
              className={`
                w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm
                focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-50 disabled:cursor-not-allowed
                ${
                  selectedSubcategories.length >= 3
                    ? "bg-gray-50 text-gray-400"
                    : "bg-white"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {selectedSubcategories.length >= 3
                    ? "Maximum subcategories selected"
                    : "Add subcategory..."}
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${
                    isSubcategoryDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isSubcategoryDropdownOpen &&
              !disabled &&
              selectedSubcategories.length < 3 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="py-1">
                    {SUBCATEGORIES[selectedCategory]
                      .filter(
                        (subcategory) =>
                          !selectedSubcategories.includes(subcategory)
                      )
                      .map((subcategory) => (
                        <button
                          key={subcategory}
                          type="button"
                          onClick={() => {
                            handleSubcategoryToggle(subcategory);
                            setIsSubcategoryDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                        >
                          {subcategory.replace("-", " ")}
                        </button>
                      ))}

                    {SUBCATEGORIES[selectedCategory].filter(
                      (subcategory) =>
                        !selectedSubcategories.includes(subcategory)
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        All subcategories selected
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 p-3">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please correct the following:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility instructions */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedCategory &&
          `Selected knowledge category: ${
            CATEGORY_INFO[selectedCategory].title
          }. 
           ${
             selectedSubcategories.length
           } subcategories selected: ${selectedSubcategories.join(", ")}`}
      </div>
    </div>
  );
};

export default KnowledgeCategorySelector;
