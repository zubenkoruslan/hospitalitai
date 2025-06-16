import React, { useMemo } from "react";
import { MenuView } from "../../hooks/useMenuViews";
import { MenuItem } from "../../types/menuItemTypes";
import DashboardView from "./DashboardView";
import ItemTypeView from "./ItemTypeView";
import { SortOption } from "./SortDropdown";
import { FilterOptions } from "../../utils/menuSearchUtils";

interface MenuViewContainerProps {
  currentView: MenuView;
  items: MenuItem[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onItemEdit: (item: MenuItem) => void;
  onItemDelete: (item: MenuItem) => void;
  onAddItem: () => void;
  onViewChange: (view: MenuView) => void;
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

const MenuViewContainer: React.FC<MenuViewContainerProps> = ({
  currentView,
  items,
  selectedCategory,
  onCategoryChange,
  onItemEdit,
  onItemDelete,
  onAddItem,
  onViewChange,
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
  // Filter items based on current view
  const filteredItems = useMemo(() => {
    if (currentView === "dashboard") return items;

    const typeMap = {
      food: "food",
      beverages: "beverage",
      wines: "wine",
    };

    return items.filter((item) => item.itemType === typeMap[currentView]);
  }, [items, currentView]);

  switch (currentView) {
    case "dashboard":
      return (
        <DashboardView
          items={items}
          onViewChange={onViewChange}
          onAddItem={onAddItem}
        />
      );

    case "food":
      return (
        <ItemTypeView
          title="Food Items"
          items={filteredItems}
          itemType="food"
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          onItemEdit={onItemEdit}
          onItemDelete={onItemDelete}
          onAddItem={onAddItem}
          expandedCards={expandedCards}
          onToggleCardExpansion={onToggleCardExpansion}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          filters={filters}
          onFiltersChange={onFiltersChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
        />
      );

    case "beverages":
      return (
        <ItemTypeView
          title="Beverages"
          items={filteredItems}
          itemType="beverage"
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          onItemEdit={onItemEdit}
          onItemDelete={onItemDelete}
          onAddItem={onAddItem}
          expandedCards={expandedCards}
          onToggleCardExpansion={onToggleCardExpansion}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          filters={filters}
          onFiltersChange={onFiltersChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
        />
      );

    case "wines":
      return (
        <ItemTypeView
          title="Wine List"
          items={filteredItems}
          itemType="wine"
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          onItemEdit={onItemEdit}
          onItemDelete={onItemDelete}
          onAddItem={onAddItem}
          expandedCards={expandedCards}
          onToggleCardExpansion={onToggleCardExpansion}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          filters={filters}
          onFiltersChange={onFiltersChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
        />
      );

    default:
      return null;
  }
};

export default MenuViewContainer;
