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
    <div className="divide-y divide-gray-200">
      {items.map((item) => (
        <div
          key={item._id}
          className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-start"
        >
          <div className="flex-grow mb-3 sm:mb-0 sm:mr-4">
            <h3
              className="text-lg font-semibold text-gray-800 mb-1"
              title={item.name}
            >
              {item.name}
            </h3>
            {item.description && (
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
            )}
            <div className="flex items-center text-sm mb-2">
              <span className="text-xl font-bold text-green-600">
                ${item.price?.toFixed(2) ?? "N/A"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {item.isGlutenFree && (
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                  GF
                </span>
              )}
              {item.isDairyFree && (
                <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                  DF
                </span>
              )}
              {item.isVegetarian && (
                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  V
                </span>
              )}
              {item.isVegan && (
                <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full">
                  VG
                </span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
            <Button
              variant="secondary"
              onClick={() => onEdit(item)}
              className="w-full sm:w-auto text-sm"
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(item)}
              className="w-full sm:w-auto text-sm"
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
