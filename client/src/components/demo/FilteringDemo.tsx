import React from "react";

const FilteringDemo: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="font-medium text-blue-900 mb-2">
        🎯 New Feature: Item Type Filtering
      </h3>
      <div className="text-sm text-blue-800 space-y-2">
        <p>
          <strong>How to use:</strong> Click on any of the item type cards (All
          Items, Food Items, Beverages, Wines) to filter the displayed items by
          that type.
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>
            <strong>All Items:</strong> Shows all parsed items (default view)
          </li>
          <li>
            <strong>Food Items:</strong> Shows only food items
          </li>
          <li>
            <strong>Beverages:</strong> Shows only beverage items (cocktails,
            beers, spirits)
          </li>
          <li>
            <strong>Wines:</strong> Shows only wine items
          </li>
        </ul>
        <p>
          <strong>Visual indicators:</strong> The active filter is highlighted
          with a border and darker background. When filtering is active, you'll
          see "Showing only [type] items" below the item count.
        </p>
        <p>
          <strong>Quick reset:</strong> Click "Show All Items" button or the
          "All Items" card to clear the filter.
        </p>
      </div>
    </div>
  );
};

export default FilteringDemo;
