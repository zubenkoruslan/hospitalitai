import React, { useState } from "react";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

// Matches the NestedSopCategory interface in EditQuestionBankForm.tsx
export interface NestedSopCategoryItem {
  id: string;
  name: string;
  fullName: string; // Path-like name, e.g., "Parent > Child", used for selection state
  subCategories: NestedSopCategoryItem[];
  level: number;
}

interface RecursiveSopCategoryListProps {
  categories: NestedSopCategoryItem[];
  selectedCategories: string[]; // Stores fullNames of selected categories
  onCategoryToggle: (categoryFullName: string) => void;
  // parentIsSelected?: boolean; // Could be used for cascading select, if desired
}

const RecursiveSopCategoryList: React.FC<RecursiveSopCategoryListProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
}) => {
  const [openStates, setOpenStates] = useState<{
    [categoryId: string]: boolean;
  }>({});

  const toggleSubCategories = (categoryId: string) => {
    setOpenStates((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1 list-none">
      {categories.map((category) => {
        const isSelected = selectedCategories.includes(category.fullName);
        const isOpen = openStates[category.id] || false; // Default to closed
        const hasSubCategories =
          category.subCategories && category.subCategories.length > 0;

        return (
          <li
            key={category.id}
            style={{ marginLeft: `${category.level * 20}px` }}
          >
            <div className="flex items-center p-1.5 hover:bg-slate-200 rounded-md transition-colors duration-150">
              {hasSubCategories && (
                <button
                  type="button"
                  onClick={() => toggleSubCategories(category.id)}
                  className="mr-1 p-0.5 rounded hover:bg-slate-300"
                  aria-expanded={isOpen}
                  aria-label={
                    isOpen
                      ? `Collapse ${category.name}`
                      : `Expand ${category.name}`
                  }
                >
                  {isOpen ? (
                    <ChevronDownIcon className="h-4 w-4 text-slate-600" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              )}
              {!hasSubCategories && <span className="w-5 mr-1"></span>}{" "}
              {/* Placeholder for alignment */}
              <input
                type="checkbox"
                id={`sop-cat-${category.id}`}
                checked={isSelected}
                onChange={() => onCategoryToggle(category.fullName)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor={`sop-cat-${category.id}`}
                className="ml-2 text-sm text-slate-700 cursor-pointer select-none flex-grow"
                onClick={() => onCategoryToggle(category.fullName)} // Allow clicking label to toggle
              >
                {category.name}
              </label>
            </div>
            {hasSubCategories && isOpen && (
              <div className="mt-1">
                <RecursiveSopCategoryList
                  categories={category.subCategories}
                  selectedCategories={selectedCategories}
                  onCategoryToggle={onCategoryToggle}
                  // Pass level if RecursiveSopCategoryList expects it for its own direct rendering logic
                  // but marginLeft above handles it based on category.level from props
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default RecursiveSopCategoryList;
