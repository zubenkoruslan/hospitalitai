import React from "react";
import { ISopCategory } from "../../types/sopTypes";

interface SopCategoryRecursiveSelectorProps {
  categories: ISopCategory[];
  selectedCategoryIds: string[];
  onCategoryToggle: (categoryId: string, categoryName: string) => void;
  level?: number;
}

const SopCategoryRecursiveSelector: React.FC<
  SopCategoryRecursiveSelectorProps
> = ({ categories, selectedCategoryIds, onCategoryToggle, level = 0 }) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className={`ml-${level * 4}`}>
      {categories.map((category) => (
        <div key={category._id || category.name} className="my-1">
          <label className="flex items-center text-sm text-slate-700 hover:bg-slate-50 p-1 rounded-md transition-colors">
            <input
              type="checkbox"
              checked={selectedCategoryIds.includes(category.name)}
              onChange={() =>
                category._id && onCategoryToggle(category._id, category.name)
              }
              disabled={!category._id}
              className="h-4 w-4 text-indigo-600 border-slate-400 rounded focus:ring-indigo-500 mr-2"
            />
            <span className={!category._id ? "text-slate-400 italic" : ""}>
              {category.name}
              {!category._id && " (cannot be selected - missing ID)"}
            </span>
          </label>
          {category.subCategories && category.subCategories.length > 0 && (
            <SopCategoryRecursiveSelector
              categories={category.subCategories}
              selectedCategoryIds={selectedCategoryIds}
              onCategoryToggle={onCategoryToggle}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default SopCategoryRecursiveSelector;
