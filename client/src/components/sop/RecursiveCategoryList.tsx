import React, { useState } from "react";
import { ISopCategory } from "../../types/sopTypes"; // Changed path
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid";

// Renamed and redefined to be modal triggers
export interface CategoryModalTriggers {
  onTriggerAddSubCategory: (parentCategory: ISopCategory) => void;
  onTriggerEditCategory: (categoryToEdit: ISopCategory) => void;
  onTriggerDeleteCategory: (categoryToDelete: ISopCategory) => void; // Changed to pass full category for context if needed, or just use ID
}

interface RecursiveCategoryListProps extends CategoryModalTriggers {
  // Updated interface extension
  categories: ISopCategory[];
  level?: number; // To manage indentation and styling for nesting
  selectedCategoryIds?: Set<string>; // Made optional
  onCategorySelect?: (categoryId: string, isSelected: boolean) => void; // Made optional
  // parentId is not strictly needed here if triggers pass the full parent category object
}

const RecursiveCategoryList: React.FC<RecursiveCategoryListProps> = ({
  categories,
  level = 0,
  // Remove direct consumption of onAddSubCategory, onUpdateCategory, onDeleteCategory from props
  // Instead, use the new trigger props
  onTriggerAddSubCategory,
  onTriggerEditCategory,
  onTriggerDeleteCategory,
  selectedCategoryIds, // Remains, but usage is conditional
  onCategorySelect, // Remains, but usage is conditional
}) => {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  const getCategoryKey = (category: ISopCategory, index: number): string => {
    return category._id || `${category.name}-${index}-${level}`;
  };

  // Placeholder handlers - these would typically open modals/forms
  const handleEditClick = (category: ISopCategory) => {
    console.log("Edit category trigger:", category._id, category.name);
    onTriggerEditCategory(category);
  };

  const handleDeleteClick = (category: ISopCategory) => {
    // Confirmation can happen here or in the parent detail page
    // For consistency, let's assume parent handles confirmation if modal is involved,
    // or if direct action, confirm here.
    // window.confirm is okay for now but a modal confirmation is better UX for destructive actions.
    console.log("Delete category trigger:", category._id);
    onTriggerDeleteCategory(category);
  };

  const handleAddSubCategoryClick = (currentCategory: ISopCategory) => {
    console.log(
      "Add subcategory trigger for:",
      currentCategory._id,
      currentCategory.name
    );
    onTriggerAddSubCategory(currentCategory);
  };

  return (
    <div
      className={`space-y-${level > 0 ? 2 : 3} ${
        level > 0 ? `ml-${level * 4}` : ""
      }`}
    >
      {categories.map((category, index) => {
        const categoryKey = getCategoryKey(category, index);
        const isExpanded = !!expandedItems[categoryKey];

        // Determine font size and padding based on level
        let headerFontSize = "text-lg"; // text-lg (18px) for level 0
        let contentFontSize = "text-sm"; // text-sm (14px) for level 0 content
        let headerPadding = "p-4";
        let contentPadding = "p-5";

        if (level === 1) {
          headerFontSize = "text-md"; // text-base (16px) for level 1
          contentFontSize = "text-sm";
          headerPadding = "p-3";
          contentPadding = "p-4";
        } else if (level >= 2) {
          headerFontSize = "text-sm font-semibold"; // text-sm (14px) bold for level 2+
          contentFontSize = "text-xs"; // text-xs (12px) for deeper content
          headerPadding = "p-2";
          contentPadding = "p-3";
        }

        return (
          <div
            key={categoryKey}
            className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden transition-all duration-300 ease-in-out group mb-2"
          >
            <div
              className={`flex items-center ${headerPadding} transition-colors duration-150 ease-in-out relative ${
                isExpanded
                  ? level > 0
                    ? "bg-indigo-100"
                    : "bg-indigo-50"
                  : level > 0
                  ? "bg-slate-100 hover:bg-slate-200"
                  : "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              {onCategorySelect &&
                selectedCategoryIds && ( // Conditionally render checkbox
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mr-3 flex-shrink-0"
                    checked={selectedCategoryIds.has(
                      category._id || categoryKey
                    )}
                    onChange={(e) => {
                      if (category._id) {
                        onCategorySelect(category._id, e.target.checked);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!category._id}
                    aria-label={`Select category ${category.name}`}
                  />
                )}
              <div
                className="flex-grow cursor-pointer"
                onClick={() => toggleExpand(categoryKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ")
                    toggleExpand(categoryKey);
                }}
                aria-expanded={isExpanded}
                aria-controls={`category-content-${categoryKey}-${level}`}
              >
                <h3
                  className={`font-semibold ${headerFontSize} ${
                    level > 0 ? "text-indigo-700" : "text-indigo-800"
                  }`}
                >
                  {category.name}
                </h3>
              </div>
              {isExpanded ? (
                <ChevronUpIcon
                  className={`h-5 w-5 ${
                    level > 0 ? "text-indigo-600" : "text-indigo-700"
                  } flex-shrink-0 ml-2 cursor-pointer`}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    toggleExpand(categoryKey);
                  }}
                />
              ) : (
                <ChevronDownIcon
                  className={`h-5 w-5 ${
                    level > 0 ? "text-indigo-600" : "text-indigo-700"
                  } flex-shrink-0 ml-2 cursor-pointer`}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    toggleExpand(categoryKey);
                  }}
                />
              )}
              {/* Action buttons - shown on hover of parent or if expanded for clarity */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-2 md:mr-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 pr-8">
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleEditClick(category);
                  }}
                  title="Edit Category"
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <PencilSquareIcon className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                {level === 0 && ( // Only show Add Subcategory for top-level categories (level 0)
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleAddSubCategoryClick(category);
                    }}
                    title="Add Subcategory"
                    className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                  >
                    <PlusCircleIcon className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                )}
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDeleteClick(category);
                  }}
                  title="Delete Category"
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                >
                  <TrashIcon className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>
            {isExpanded && (
              <div
                id={`category-content-${categoryKey}-${level}`}
                className={`${contentPadding} border-t border-slate-200 bg-white`}
              >
                {category.content && category.content.trim() !== "" && (
                  <pre
                    className={`whitespace-pre-wrap ${contentFontSize} text-slate-700 font-sans leading-relaxed mb-3`}
                  >
                    {category.content}
                  </pre>
                )}
                {category.subCategories &&
                  category.subCategories.length > 0 && (
                    <RecursiveCategoryList
                      categories={category.subCategories}
                      level={level + 1}
                      // Pass down the trigger handlers
                      onTriggerAddSubCategory={onTriggerAddSubCategory}
                      onTriggerEditCategory={onTriggerEditCategory}
                      onTriggerDeleteCategory={onTriggerDeleteCategory}
                      selectedCategoryIds={selectedCategoryIds} // Pass down, will be undefined if not provided
                      onCategorySelect={onCategorySelect} // Pass down, will be undefined if not provided
                    />
                  )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RecursiveCategoryList;
