import React from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { KnowledgeCategory } from "../../types/questionBankTypes";

interface QuestionFiltersProps {
  searchTerm: string;
  selectedCategory: KnowledgeCategory | null;
  selectedMenuCategory: string | null;
  showFilters: boolean;
  onSearchChange: (term: string) => void;
  onCategoryChange: (category: KnowledgeCategory | null) => void;
  onMenuCategoryChange: (category: string | null) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  availableMenuCategories: string[];
  categoryCounts: Record<KnowledgeCategory, number>;
  menuCategoryCounts: Record<string, number>;
  totalQuestions: number;
}

const QuestionFilters: React.FC<QuestionFiltersProps> = ({
  searchTerm,
  selectedCategory,
  selectedMenuCategory,
  showFilters,
  onSearchChange,
  onCategoryChange,
  onMenuCategoryChange,
  onToggleFilters,
  onClearFilters,
  availableMenuCategories,
  categoryCounts,
  menuCategoryCounts,
  totalQuestions,
}) => {
  const categoryOptions = [
    { value: "food-knowledge", label: "Food Knowledge" },
    { value: "beverage-knowledge", label: "Beverage Knowledge" },
    { value: "wine-knowledge", label: "Wine Knowledge" },
    { value: "procedures-knowledge", label: "Procedures Knowledge" },
  ];

  const hasActiveFilters = selectedCategory || selectedMenuCategory;

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions by text or category..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full">
                {(selectedCategory ? 1 : 0) + (selectedMenuCategory ? 1 : 0)}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Knowledge Category Filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">
                Knowledge Category:
              </span>
              <button
                onClick={() => onCategoryChange(null)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                All ({totalQuestions})
              </button>
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    onCategoryChange(option.value as KnowledgeCategory)
                  }
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === option.value
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  {option.label} (
                  {categoryCounts[option.value as KnowledgeCategory] || 0})
                </button>
              ))}
            </div>

            {/* Menu Category Filter */}
            {availableMenuCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-gray-700">
                  Menu Category:
                </span>
                <button
                  onClick={() => onMenuCategoryChange(null)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedMenuCategory === null
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  All Categories
                </button>
                {availableMenuCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => onMenuCategoryChange(category)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedMenuCategory === category
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                    }`}
                  >
                    {category} ({menuCategoryCounts[category] || 0})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionFilters;
