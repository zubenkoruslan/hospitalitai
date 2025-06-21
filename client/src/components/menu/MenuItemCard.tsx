import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  CakeIcon,
  BeakerIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { cardAnimations } from "../../utils/animations";
import { usePerformanceMonitor } from "../../hooks/usePerformanceMonitor";
import { MenuItem } from "../../types/menuItemTypes";

interface MenuItemCardProps {
  item: MenuItem;
  isExpanded?: boolean;
  onToggleExpansion?: (itemId: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;

  // Bulk selection props
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (itemId: string) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  isExpanded = false,
  onToggleExpansion,
  onEdit,
  onDelete,

  bulkMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  // Performance monitoring for this component
  usePerformanceMonitor("MenuItemCard");

  // Get item type icon and color
  const getItemTypeConfig = () => {
    switch (item.itemType) {
      case "food":
        return {
          icon: CakeIcon,
          color: "text-amber-600",
          bgColor: "bg-amber-100",
          borderColor: "border-amber-200",
        };
      case "beverage":
        return {
          icon: BeakerIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          borderColor: "border-blue-200",
        };
      case "wine":
        return {
          icon: SparklesIcon,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          borderColor: "border-purple-200",
        };
      default:
        return {
          icon: CakeIcon,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          borderColor: "border-gray-200",
        };
    }
  };

  const { icon: ItemIcon, color, bgColor } = getItemTypeConfig();

  const handleCardClick = () => {
    if (onToggleExpansion) {
      onToggleExpansion(item._id);
    }
  };

  // Unified price rendering with consistent layout
  const renderPrice = () => {
    // Handle wine serving options
    if (
      item.itemType === "wine" &&
      item.servingOptions &&
      item.servingOptions.length > 0
    ) {
      return (
        <div className="text-right">
          {item.servingOptions.map((option, index) => (
            <div
              key={index}
              className="flex justify-between items-center min-w-[120px]"
            >
              <span className="text-xs text-gray-600 font-medium">
                {option.size}:
              </span>
              <span className="text-sm font-bold text-gray-900 ml-2">
                ${option.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // Handle regular price for non-wine items
    if (!item.price)
      return <span className="text-gray-500 text-sm">Price not set</span>;

    const price =
      typeof item.price === "number"
        ? item.price
        : parseFloat(String(item.price));
    if (isNaN(price)) {
      return <span className="text-gray-500 text-sm">Invalid price</span>;
    }

    return (
      <span className="text-base font-bold text-gray-900">
        ${price.toFixed(2)}
      </span>
    );
  };

  // Unified category badge rendering

  // Enhanced wine color badge with support for new wine types
  const getWineColorBadge = (wineColor: string) => {
    const colorMap = {
      red: "bg-red-100 text-red-700 border-red-200",
      white: "bg-yellow-100 text-yellow-700 border-yellow-200",
      rosé: "bg-pink-100 text-pink-700 border-pink-200",
      sparkling: "bg-blue-100 text-blue-700 border-blue-200",
      champagne: "bg-yellow-200 text-yellow-800 border-yellow-300",
      cava: "bg-orange-100 text-orange-700 border-orange-200",
      crémant: "bg-green-100 text-green-700 border-green-200",
      orange: "bg-orange-100 text-orange-700 border-orange-200",
      other: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return colorMap[wineColor as keyof typeof colorMap] || colorMap.other;
  };

  // Unified rendering for enhanced details section
  const renderEnhancedDetails = () => {
    if (item.itemType === "wine") {
      return (
        <div className="space-y-3">
          {/* Wine Type Badge Row */}
          {item.wineColor && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Type:
              </span>
              <span
                className={`px-2 py-1 rounded-md text-xs border font-medium capitalize ${getWineColorBadge(
                  item.wineColor
                )}`}
              >
                {item.wineColor}
              </span>
            </div>
          )}

          {/* Wine Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {item.vintage && (
              <div>
                <span className="font-medium text-gray-700">Vintage:</span>
                <p className="text-gray-600 font-mono">{item.vintage}</p>
              </div>
            )}
            {item.region && (
              <div>
                <span className="font-medium text-gray-700">Region:</span>
                <p className="text-gray-600">{item.region}</p>
              </div>
            )}
          </div>

          {/* Grape Varieties */}
          {item.grapeVariety && item.grapeVariety.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Grape Varieties:
              </span>
              <div className="flex flex-wrap gap-1">
                {item.grapeVariety.map((grape, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-700 border border-purple-200 font-medium"
                  >
                    {grape}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (item.itemType === "food") {
      return (
        <div className="space-y-3">
          {/* Ingredients */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Ingredients:
              </span>
              <div className="flex flex-wrap gap-1">
                {item.ingredients
                  .slice(0, !isExpanded ? 3 : undefined)
                  .map((ingredient, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 text-green-700 border border-green-200 font-medium"
                    >
                      {ingredient}
                    </span>
                  ))}
                {!isExpanded && item.ingredients.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-200 text-gray-600 font-medium">
                    +{item.ingredients.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Food Enhancement Details */}
          {(item.cookingMethods?.length ||
            item.allergens?.length ||
            item.isSpicy) && (
            <div className="grid grid-cols-1 gap-3 text-sm">
              {item.cookingMethods && item.cookingMethods.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
                    Cooking Methods:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.cookingMethods.map((method, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700 border border-blue-200 font-medium"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.allergens && item.allergens.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-red-600 uppercase tracking-wide block mb-1">
                    Allergens:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.allergens.map((allergen, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-red-100 text-red-700 border border-red-200 font-medium"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.isSpicy && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-orange-100 text-orange-700 border border-orange-200 font-medium">
                    🌶️ Spicy
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (item.itemType === "beverage") {
      return (
        <div className="space-y-3">
          {/* Beverage Enhancement Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {item.spiritType && (
              <div>
                <span className="font-medium text-gray-700">Spirit Type:</span>
                <p className="text-gray-600">{item.spiritType}</p>
              </div>
            )}
            {item.beerStyle && (
              <div>
                <span className="font-medium text-gray-700">Beer Style:</span>
                <p className="text-gray-600">{item.beerStyle}</p>
              </div>
            )}
            {item.alcoholContent && (
              <div>
                <span className="font-medium text-gray-700">ABV:</span>
                <p className="text-gray-600 font-mono">{item.alcoholContent}</p>
              </div>
            )}
            {item.servingStyle && (
              <div>
                <span className="font-medium text-gray-700">Serving:</span>
                <p className="text-gray-600">{item.servingStyle}</p>
              </div>
            )}
          </div>

          {/* Cocktail Ingredients */}
          {item.cocktailIngredients && item.cocktailIngredients.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Ingredients:
              </span>
              <div className="flex flex-wrap gap-1">
                {item.cocktailIngredients.map((ingredient, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700 border border-blue-200 font-medium"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Special Badges */}
          <div className="flex flex-wrap gap-2">
            {item.isNonAlcoholic && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 text-green-700 border border-green-200 font-medium">
                Non-Alcoholic
              </span>
            )}
            {item.temperature && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-cyan-100 text-cyan-700 border border-cyan-200 font-medium">
                {item.temperature}
              </span>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Unified dietary badges rendering
  const renderDietaryBadges = () => {
    const badges = [];

    if (item.isGlutenFree) {
      badges.push(
        <span
          key="gluten-free"
          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium"
        >
          Gluten-Free
        </span>
      );
    }

    if (item.isDairyFree) {
      badges.push(
        <span
          key="dairy-free"
          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700 border border-blue-200 font-medium"
        >
          Dairy-Free
        </span>
      );
    }

    if (item.isVegetarian) {
      badges.push(
        <span
          key="vegetarian"
          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 text-green-700 border border-green-200 font-medium"
        >
          Vegetarian
        </span>
      );
    }

    if (item.isVegan) {
      badges.push(
        <span
          key="vegan"
          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-lime-100 text-lime-700 border border-lime-200 font-medium"
        >
          Vegan
        </span>
      );
    }

    if (badges.length === 0) return null;

    return <div className="flex flex-wrap gap-1">{badges}</div>;
  };

  const renderActionButtons = () => {
    const showActions = isExpanded && !bulkMode;
    if (!showActions) return null;

    return (
      <div className="flex gap-2 pt-4 mt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-150 flex items-center gap-2 font-medium"
        >
          <PencilIcon className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-150 flex items-center gap-2 font-medium"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
    );
  };

  const shouldShowExpandedContent = isExpanded;

  return (
    <motion.div
      variants={cardAnimations}
      initial="initial"
      animate="animate"
      exit="exit"
      whileTap="tap"
      className={`bg-white rounded-lg border border-gray-200 transition-all duration-150 cursor-pointer hover:shadow-sm hover:border-gray-300 ${
        isExpanded ? "shadow-md border-blue-200 bg-blue-50/30" : "shadow-sm"
      } ${
        bulkMode && isSelected
          ? "ring-2 ring-blue-500 border-blue-300 shadow-md"
          : ""
      }`}
      onClick={
        bulkMode && onToggleSelect
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleSelect(item._id);
            }
          : handleCardClick
      }
    >
      <div className="p-4">
        {/* Collapsed View - Horizontal Layout */}
        <div className="flex items-center justify-between">
          {/* Left Section - Icon, Name, Category */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Bulk Selection Checkbox */}
            {bulkMode && onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(item._id);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* Item Type Icon */}
            <div className={`p-2 rounded-lg ${bgColor} flex-shrink-0`}>
              <ItemIcon className={`h-4 w-4 ${color}`} />
            </div>

            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
                  {item.name}
                </h3>
              </div>
              {!isExpanded && item.description && (
                <p className="text-gray-600 text-sm line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {/* Right Section - Price and Expand Icon */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Price */}
            <div className="text-right">{renderPrice()}</div>

            {/* Expand/Collapse Icon */}
            {onToggleExpansion && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-150" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-150" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {shouldShowExpandedContent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="mt-4 pt-4 border-t border-gray-200">
                {/* Full Description */}
                {item.description && (
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                )}

                {/* Dietary Badges - Compact horizontal layout */}
                {item.itemType !== "wine" && renderDietaryBadges() && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                      Dietary:
                    </div>
                    {renderDietaryBadges()}
                  </div>
                )}

                {/* Enhanced Details Section - Type-specific content */}
                {renderEnhancedDetails()}

                {/* Action Buttons - Horizontal layout */}
                {renderActionButtons()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MenuItemCard;
