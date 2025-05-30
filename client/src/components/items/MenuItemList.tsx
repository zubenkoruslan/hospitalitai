import React from "react";
import { MenuItem } from "../../types/menuItemTypes"; // Import shared type
import Button from "../common/Button"; // Added import for Button component

interface MenuItemListProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

const MenuItemList: React.FC<MenuItemListProps> = ({
  items,
  onEdit,
  onDelete,
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
          className="bg-white border border-gray-200 shadow-sm rounded-lg p-3 flex flex-col justify-between h-full hover:shadow-lg transition-shadow duration-200"
        >
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
                        ${option.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center text-xs mb-1">
                <span className="text-lg font-bold text-green-700">
                  ${item.price?.toFixed(2) ?? "N/A"}
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
            </div>
          </div>

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
        </div>
      ))}
    </div>
  );
};

export default MenuItemList;
