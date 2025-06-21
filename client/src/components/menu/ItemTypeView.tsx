import React, { useMemo, useState } from "react";
import { MenuItem } from "../../types/menuItemTypes";
import MenuItemCard from "./MenuItemCard";
import SmartSearchBar from "./SmartSearchBar";
import SortDropdown, { SortOption } from "./SortDropdown";
import BulkActionsBar from "../items/BulkActionsBar";
import Button from "../common/Button";
import { CheckIcon, FolderIcon, PlusIcon } from "@heroicons/react/24/outline";
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
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;

  // Bulk operations props
  onBulkDelete?: (itemIds: string[]) => void;
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
  sortBy,
  onSortChange,
  onBulkDelete,
}) => {
  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = filteredItems.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    // Sort categories alphabetically, but put "Uncategorized" at the end
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });

    return sortedCategories.map((category) => ({
      category,
      items: grouped[category],
    }));
  }, [filteredItems]);

  // Bulk operation handlers
  const handleToggleSelect = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(filteredItems.map((item) => item._id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleBulkDeleteAction = async () => {
    if (!onBulkDelete || selectedItems.size === 0) return;

    setIsBulkDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedItems));
      setSelectedItems(new Set());
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExitBulkMode = () => {
    setBulkMode(false);
    setSelectedItems(new Set());
  };

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

        <div className="flex items-center gap-2">
          {filteredItems.length > 0 && onBulkDelete && !bulkMode && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkMode(true)}
              className="flex items-center gap-1 text-xs"
            >
              <CheckIcon className="h-3 w-3" />
              Select
            </Button>
          )}

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
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <BulkActionsBar
          selectedCount={selectedItems.size}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkDelete={handleBulkDeleteAction}
          onExitBulkMode={handleExitBulkMode}
          totalItems={filteredItems.length}
          isDeleting={isBulkDeleting}
        />
      )}

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
          <SortDropdown
            currentSort={sortBy}
            onSortChange={onSortChange}
            itemType={itemType}
          />
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

      {/* Enhanced Items List Grouped by Category */}
      {filteredItems.length > 0 ? (
        <div className="space-y-6">
          {itemsByCategory.map(({ category, items }) => (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <FolderIcon className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category}
                    </h3>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                {/* Category-specific add button */}
                <button
                  onClick={() => {
                    // Set category context for new item
                    localStorage.setItem(
                      "pendingItemCategory",
                      category !== "Uncategorized" ? category : ""
                    );
                    onAddItem();
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200"
                >
                  <PlusIcon className="h-3 w-3" />
                  Add to {category}
                </button>
              </div>

              {/* Items in this category */}
              <div className="space-y-2">
                {items.map((item) => (
                  <MenuItemCard
                    key={item._id}
                    item={item}
                    isExpanded={expandedCards.has(item._id)}
                    onToggleExpansion={onToggleCardExpansion}
                    onEdit={onItemEdit}
                    onDelete={onItemDelete}
                    variant="mobile"
                    bulkMode={bulkMode}
                    isSelected={selectedItems.has(item._id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </div>
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
