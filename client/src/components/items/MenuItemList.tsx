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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        // TODO: Consider extracting this card into MenuItemCard.tsx if it gets more complex
        <div
          key={item._id}
          className="bg-white rounded-lg shadow overflow-hidden transition hover:shadow-md flex flex-col"
        >
          <div className="p-4 flex-grow">
            <h3
              className="text-lg font-semibold text-gray-800 mb-1 truncate"
              title={item.name}
            >
              {item.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2 h-10 overflow-hidden line-clamp-2">
              {item.description || (
                <span className="italic text-gray-400">No description</span>
              )}
            </p>
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-green-600">
                ${item.price?.toFixed(2) ?? "N/A"}
              </span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full capitalize">
                {item.category}
              </span>
            </div>
            {/* Optional: Display Dietary Flags */}
            <div className="flex flex-wrap gap-1 mt-2 text-xs">
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
          {/* Responsive Card Footer Buttons */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col space-y-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2">
            <Button
              variant="secondary" // Using secondary for edit action
              onClick={() => onEdit(item)}
              className="w-full sm:w-auto text-sm" // Ensure text size is appropriate if needed
            >
              Edit
            </Button>
            <Button
              variant="destructive" // Using destructive for delete action
              onClick={() => onDelete(item)}
              className="w-full sm:w-auto text-sm" // Ensure text size is appropriate if needed
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
