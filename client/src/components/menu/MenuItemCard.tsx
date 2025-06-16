import React from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  CakeIcon,
  BeakerIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { MenuItem } from "../../types/menuItemTypes";

interface MenuItemCardProps {
  item: MenuItem;
  isExpanded?: boolean;
  onToggleExpansion?: (itemId: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  variant?: "mobile" | "desktop";
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  isExpanded = false,
  onToggleExpansion,
  onEdit,
  onDelete,
  variant = "desktop",
}) => {
  const isMobile = variant === "mobile";

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

  const { icon: ItemIcon, color, bgColor, borderColor } = getItemTypeConfig();

  const handleCardClick = () => {
    if (isMobile && onToggleExpansion) {
      onToggleExpansion(item._id);
    }
  };

  const renderPrice = () => {
    if (!item.price)
      return <span className="text-gray-500 text-sm">Price not set</span>;
    return (
      <span className="text-lg font-bold text-gray-900">
        ${item.price.toFixed(2)}
      </span>
    );
  };

  const renderCategoryBadge = () => {
    if (!item.category) return null;
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${color} ${borderColor} border`}
      >
        {item.category}
      </span>
    );
  };

  const renderIngredients = () => {
    if (!item.ingredients || item.ingredients.length === 0) return null;

    return (
      <div className="mt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Ingredients:</h4>
        <div className="flex flex-wrap gap-1">
          {item.ingredients
            .slice(0, isMobile && !isExpanded ? 3 : undefined)
            .map((ingredient, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
              >
                {ingredient}
              </span>
            ))}
          {isMobile && !isExpanded && item.ingredients.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-200 text-gray-600">
              +{item.ingredients.length - 3} more
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderWineDetails = () => {
    if (item.itemType !== "wine") return null;

    return (
      <div className="mt-3 space-y-2">
        {item.vintage && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Vintage:</span>
            <span className="ml-2 text-gray-600">{item.vintage}</span>
          </div>
        )}
        {item.region && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Region:</span>
            <span className="ml-2 text-gray-600">{item.region}</span>
          </div>
        )}
        {item.grapeVariety && item.grapeVariety.length > 0 && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Grape Varieties:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {item.grapeVariety.map((grape, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-700 border border-purple-200"
                >
                  {grape}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActionButtons = () => {
    const showActions = !isMobile || isExpanded;
    if (!showActions) return null;

    return (
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <PencilIcon className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center gap-1"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
    );
  };

  const shouldShowExpandedContent = !isMobile || isExpanded;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 transition-all duration-200 ${
        isMobile ? "cursor-pointer hover:shadow-md" : "hover:shadow-lg"
      } ${isExpanded ? "shadow-md" : "hover:border-gray-300"}`}
      onClick={handleCardClick}
    >
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Item Type Icon */}
            <div className={`p-2 rounded-lg ${bgColor} flex-shrink-0`}>
              <ItemIcon className={`h-5 w-5 ${color}`} />
            </div>

            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-lg">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {renderCategoryBadge()}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">{renderPrice()}</div>
              </div>
            </div>

            {/* Mobile Expand/Collapse Icon */}
            {isMobile && onToggleExpansion && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description - Always show first line, full on expansion */}
        {item.description && (
          <div className="mb-3">
            <p
              className={`text-gray-600 text-sm ${
                isMobile && !isExpanded ? "line-clamp-2" : ""
              }`}
            >
              {item.description}
            </p>
          </div>
        )}

        {/* Expanded Content */}
        {shouldShowExpandedContent && (
          <div>
            {/* Ingredients for food items */}
            {renderIngredients()}

            {/* Wine-specific details */}
            {renderWineDetails()}

            {/* Action Buttons */}
            {renderActionButtons()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItemCard;
