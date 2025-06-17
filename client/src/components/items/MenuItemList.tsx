import React from "react";
import { MenuItem } from "../../types/menuItemTypes"; // Import shared type
import Button from "../common/Button"; // Added import for Button component

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
  if (!items) {
    // Parent should handle loading/error state, but return null if no items prop
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
      {items.map((item) => (
        <div
          key={item._id}
          className={`bg-white border border-gray-200 shadow-sm rounded-lg p-3 flex flex-col justify-between h-full hover:shadow-lg transition-all duration-200 ${
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
                onClick={(e) => e.stopPropagation()} // Prevent event bubbling
              />
              <span className="text-sm text-gray-600">
                {selectedItems.has(item._id) ? "Selected" : "Select"}
              </span>
            </div>
          )}

          <div className="flex-grow mb-2">
            <h3
              className="text-md font-semibold text-gray-700 mb-1 truncate"
              title={item.name}
            >
              {item.name}
            </h3>
            {item.description && (
              <p className="text-xs text-gray-500 mb-1 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Price/Serving Options Display */}
            {item.itemType === "wine" &&
            item.servingOptions &&
            item.servingOptions.length > 0 ? (
              <div className="mb-1">
                <div className="text-xs text-gray-600 font-medium mb-1">
                  Serving Options:
                </div>
                <div className="space-y-1">
                  {item.servingOptions.map((option, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="text-gray-700">{option.size}</span>
                      <span className="font-bold text-green-700">
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
              </div>
            ) : (
              <div className="flex items-center text-xs mb-1">
                <span className="text-lg font-bold text-green-700">
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
              </div>
            )}
            <div className="flex flex-wrap gap-1 text-xs mb-2">
              {item.isGlutenFree && (
                <span className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded-full text-xxs">
                  GF
                </span>
              )}
              {item.isDairyFree && (
                <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded-full text-xxs">
                  DF
                </span>
              )}
              {item.isVegetarian && (
                <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded-full text-xxs">
                  V
                </span>
              )}
              {item.isVegan && (
                <span className="bg-teal-100 text-teal-800 px-1 py-0.5 rounded-full text-xxs">
                  VG
                </span>
              )}
              {item.isSpicy && (
                <span className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded-full text-xxs">
                  Spicy
                </span>
              )}
              {item.isNonAlcoholic && (
                <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded-full text-xxs">
                  Non-Alcoholic
                </span>
              )}
            </div>

            {/* Enhanced Data Display */}
            {/* Ingredients */}
            {item.ingredients && item.ingredients.length > 0 && (
              <div className="mb-2">
                <div className="text-xxs text-gray-600 font-medium mb-1">
                  Ingredients:
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.ingredients.slice(0, 3).map((ingredient, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-green-100 text-green-700 text-xxs rounded-full"
                    >
                      {ingredient}
                    </span>
                  ))}
                  {item.ingredients.length > 3 && (
                    <span className="text-xxs text-gray-500">
                      +{item.ingredients.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Cooking Methods */}
            {item.cookingMethods && item.cookingMethods.length > 0 && (
              <div className="mb-2">
                <div className="text-xxs text-gray-600 font-medium mb-1">
                  Cooking:
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.cookingMethods.slice(0, 2).map((method, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xxs rounded-full"
                    >
                      {method}
                    </span>
                  ))}
                  {item.cookingMethods.length > 2 && (
                    <span className="text-xxs text-gray-500">
                      +{item.cookingMethods.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Allergens */}
            {item.allergens && item.allergens.length > 0 && (
              <div className="mb-2">
                <div className="text-xxs text-gray-600 font-medium mb-1">
                  Allergens:
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.allergens.slice(0, 3).map((allergen, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-red-100 text-red-700 text-xxs rounded-full"
                    >
                      {allergen}
                    </span>
                  ))}
                  {item.allergens.length > 3 && (
                    <span className="text-xxs text-gray-500">
                      +{item.allergens.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Wine-specific info */}
            {item.itemType === "wine" && (
              <div className="mb-2">
                {item.grapeVariety && item.grapeVariety.length > 0 && (
                  <div className="mb-1">
                    <div className="text-xxs text-gray-600 font-medium mb-1">
                      Grape Variety:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.grapeVariety.slice(0, 2).map((grape, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xxs rounded-full"
                        >
                          {grape}
                        </span>
                      ))}
                      {item.grapeVariety.length > 2 && (
                        <span className="text-xxs text-gray-500">
                          +{item.grapeVariety.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 text-xxs">
                  {item.vintage && (
                    <span className="text-gray-600">{item.vintage}</span>
                  )}
                  {item.producer && (
                    <span className="text-gray-600">{item.producer}</span>
                  )}
                  {item.region && (
                    <span className="text-gray-600">{item.region}</span>
                  )}
                </div>
              </div>
            )}

            {/* Beverage-specific info */}
            {item.itemType === "beverage" && (
              <div className="mb-2">
                <div className="flex flex-wrap gap-1 text-xxs">
                  {item.spiritType && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xxs rounded-full">
                      {item.spiritType}
                    </span>
                  )}
                  {item.beerStyle && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xxs rounded-full">
                      {item.beerStyle}
                    </span>
                  )}
                  {item.alcoholContent && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xxs rounded-full">
                      {item.alcoholContent}
                    </span>
                  )}
                  {item.temperature && (
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xxs rounded-full">
                      {item.temperature}
                    </span>
                  )}
                </div>
                {item.cocktailIngredients &&
                  item.cocktailIngredients.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xxs text-gray-600 font-medium mb-1">
                        Cocktail Ingredients:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.cocktailIngredients
                          .slice(0, 3)
                          .map((ingredient, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xxs rounded-full"
                            >
                              {ingredient}
                            </span>
                          ))}
                        {item.cocktailIngredients.length > 3 && (
                          <span className="text-xxs text-gray-500">
                            +{item.cocktailIngredients.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          {!bulkMode && (
            <div className="flex-shrink-0 flex flex-row space-x-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => onEdit(item)}
                className="text-xs px-2 py-1"
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDelete(item)}
                className="text-xs px-2 py-1"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuItemList;
