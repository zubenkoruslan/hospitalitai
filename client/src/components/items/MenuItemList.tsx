import React, { useState } from "react";
import { MenuItem } from "../../types/menuItemTypes"; // Import shared type
import Button from "../common/Button"; // Added import for Button component
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

// Helper function to convert string to Title Case
const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface MenuItemListProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  // Bulk selection props
  selectedItems?: Set<string>;
  onToggleSelect?: (itemId: string) => void;
  bulkMode?: boolean;
}

const MenuItemList: React.FC<MenuItemListProps> = ({
  items,
  onEdit,
  onDelete,
  selectedItems = new Set(),
  onToggleSelect,
  bulkMode = false,
}) => {
  // State to track which cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (itemId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (!items) {
    return null;
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No menu items found for this menu. Add one to get started!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => {
        const isExpanded = expandedCards.has(item._id);

        return (
          <div
            key={item._id}
            className={`bg-white border border-gray-200 shadow-sm rounded-lg p-3 hover:shadow-lg transition-all duration-200 ${
              bulkMode && selectedItems.has(item._id)
                ? "ring-2 ring-blue-500 border-blue-300"
                : ""
            }`}
          >
            {/* Bulk Selection Checkbox */}
            {bulkMode && onToggleSelect && (
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item._id)}
                  onChange={() => onToggleSelect(item._id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm text-gray-600">
                  {selectedItems.has(item._id) ? "Selected" : "Select"}
                </span>
              </div>
            )}

            {/* Collapsed view - Name, Price, and Expand button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-medium text-gray-900 truncate"
                  title={item.name}
                >
                  {item.name}
                </h3>
              </div>

              <div className="flex items-center space-x-3 ml-4">
                {/* Price Display */}
                <div className="text-right">
                  {item.itemType === "wine" &&
                  item.servingOptions &&
                  item.servingOptions.length > 0 ? (
                    <div className="space-y-1">
                      {item.servingOptions.map((option, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-xs text-gray-500">
                            {option.size}:
                          </span>
                          <span className="font-semibold text-green-600 ml-1">
                            $
                            {(() => {
                              const price =
                                typeof option.price === "number"
                                  ? option.price
                                  : parseFloat(String(option.price));
                              return !isNaN(price) ? price.toFixed(2) : "0.00";
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-lg font-semibold text-green-600">
                      $
                      {(() => {
                        if (!item.price) return "N/A";
                        const price =
                          typeof item.price === "number"
                            ? item.price
                            : parseFloat(String(item.price));
                        return !isNaN(price) ? price.toFixed(2) : "N/A";
                      })()}
                    </span>
                  )}
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleCardExpansion(item._id)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  aria-label={
                    isExpanded ? "Collapse details" : "Expand details"
                  }
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable content - Only shown when expanded */}
            {isExpanded && (
              <div className="border-t border-gray-100 pt-3 space-y-3">
                {/* Category */}
                {item.category && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Category:</span>{" "}
                    {toTitleCase(item.category)}
                  </div>
                )}

                {/* Description */}
                {item.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Description
                    </div>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                )}

                {/* Dietary tags */}
                {(item.isGlutenFree ||
                  item.isDairyFree ||
                  item.isVegetarian ||
                  item.isVegan ||
                  item.isSpicy ||
                  item.isNonAlcoholic) && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Dietary Information
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.isGlutenFree && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                          Gluten Free
                        </span>
                      )}
                      {item.isDairyFree && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                          Dairy Free
                        </span>
                      )}
                      {item.isVegetarian && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          Vegetarian
                        </span>
                      )}
                      {item.isVegan && (
                        <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded-full text-xs">
                          Vegan
                        </span>
                      )}
                      {item.isSpicy && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                          Spicy
                        </span>
                      )}
                      {item.isNonAlcoholic && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          Non-Alcoholic
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Ingredients */}
                {item.ingredients && item.ingredients.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Ingredients
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.ingredients.map((ingredient, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cooking Methods */}
                {item.cookingMethods && item.cookingMethods.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Cooking Methods
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.cookingMethods.map((method, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergens */}
                {item.allergens && item.allergens.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Allergens
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.allergens.map((allergen, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                        >
                          ⚠️ {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wine-specific info */}
                {item.itemType === "wine" && (
                  <div>
                    {item.grapeVariety && item.grapeVariety.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Grape Variety
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.grapeVariety.map((grape, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                            >
                              {grape}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(item.vintage || item.producer || item.region) && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Wine Details
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                          {item.vintage && <span>Vintage: {item.vintage}</span>}
                          {item.producer && (
                            <span>Producer: {item.producer}</span>
                          )}
                          {item.region && <span>Region: {item.region}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Beverage-specific info */}
                {item.itemType === "beverage" && (
                  <div>
                    {(item.spiritType ||
                      item.beerStyle ||
                      item.alcoholContent ||
                      item.temperature) && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Beverage Details
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.spiritType && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                              {item.spiritType}
                            </span>
                          )}
                          {item.beerStyle && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                              {item.beerStyle}
                            </span>
                          )}
                          {item.alcoholContent && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {item.alcoholContent}
                            </span>
                          )}
                          {item.temperature && (
                            <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">
                              {item.temperature}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {item.cocktailIngredients &&
                      item.cocktailIngredients.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Cocktail Ingredients
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.cocktailIngredients.map((ingredient, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons - Always visible at bottom */}
            {!bulkMode && (
              <div className="flex space-x-2 justify-end mt-3 pt-2 border-t border-gray-100">
                <Button
                  variant="secondary"
                  onClick={() => onEdit(item)}
                  className="text-xs px-3 py-1"
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDelete(item)}
                  className="text-xs px-3 py-1"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MenuItemList;
