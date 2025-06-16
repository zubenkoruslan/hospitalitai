import React, { useMemo } from "react";
import { MenuItem } from "../../types/menuItemTypes";
import { useIsMobile } from "../../hooks/useIsMobile";
import MenuItemCard from "./MenuItemCard";
import SmartSearchBar from "./SmartSearchBar";
import SortDropdown, { SortOption } from "./SortDropdown";
import {
  searchItems,
  sortItems,
  filterItems,
  FilterOptions,
} from "../../utils/menuSearchUtils";

interface ItemTypeViewProps {
  title: string;
  items: MenuItem[];
  itemType: "food" | "beverage" | "wine";
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onItemEdit: (item: MenuItem) => void;
  onItemDelete: (item: MenuItem) => void;
  onAddItem: () => void;
  expandedCards: Set<string>;
  onToggleCardExpansion: (cardId: string) => void;

  // Search and filter props
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClearSearch: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const ItemTypeView: React.FC<ItemTypeViewProps> = ({
  title,
  items,
  itemType,
  selectedCategory,
  onCategoryChange,
  onItemEdit,
  onItemDelete,
  onAddItem,
  expandedCards,
  onToggleCardExpansion,
  searchTerm,
  onSearchChange,
  onClearSearch,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
}) => {
  const isMobile = useIsMobile();

  // Get unique categories for this item type
  const categories = [...new Set(items.map((item) => item.category))].filter(
    Boolean
  );

  // Apply all filters, search, and sorting
  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply search
    if (searchTerm.trim()) {
      result = searchItems(result, searchTerm);
    }

    // Apply category filter
    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Apply advanced filters
    result = filterItems(result, filters);

    // Apply sorting
    result = sortItems(result, sortBy);

    return result;
  }, [items, searchTerm, selectedCategory, filters, sortBy]);

  // Keep legacy filteredItems for backward compatibility
  const filteredItems = processedItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-gray-600 text-sm">
            {filteredItems.length} of {items.length} items
            {selectedCategory && ` in "${selectedCategory}"`}
          </p>
        </div>

        <button
          onClick={onAddItem}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Add{" "}
          {itemType === "food"
            ? "Food"
            : itemType === "beverage"
            ? "Beverage"
            : "Wine"}
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <SmartSearchBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          placeholder={`Search ${title.toLowerCase()}...`}
          resultCount={filteredItems.length}
          totalCount={items.length}
        />

        {/* Sort Control */}
        <div className="flex justify-end">
          <SortDropdown currentSort={sortBy} onSortChange={onSortChange} />
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCategoryChange(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === null
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({items.length})
            </button>
            {categories.map((category) => {
              const count = items.filter(
                (item) => item.category === category
              ).length;
              return (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Items Grid with Expandable Cards */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item._id}
              item={item}
              isExpanded={expandedCards.has(item._id)}
              onToggleExpansion={onToggleCardExpansion}
              onEdit={onItemEdit}
              onDelete={onItemDelete}
              variant={isMobile ? "mobile" : "desktop"}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <div className="text-gray-500">
            {selectedCategory
              ? `No ${itemType} items found in "${selectedCategory}" category.`
              : `No ${itemType} items found. Start by adding your first ${itemType} item!`}
          </div>
          <button
            onClick={onAddItem}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Add{" "}
            {itemType === "food"
              ? "Food"
              : itemType === "beverage"
              ? "Beverage"
              : "Wine"}{" "}
            Item
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemTypeView;
