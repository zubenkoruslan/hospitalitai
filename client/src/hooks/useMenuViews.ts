import { useState, useCallback } from "react";
import { SortOption } from "../components/menu/SortDropdown";
import { FilterOptions, getDefaultFilters } from "../utils/menuSearchUtils";

export type MenuView = "dashboard" | "food" | "beverages" | "wines";

export interface MenuViewsHookReturn {
  // View state
  currentView: MenuView;
  selectedCategory: string | null;

  // Search and filter state
  searchTerm: string;
  filters: FilterOptions;
  sortBy: SortOption;

  // Actions
  handleViewChange: (view: MenuView) => void;
  handleCategoryFilter: (category: string | null) => void;
  handleSearchChange: (term: string) => void;
  handleClearSearch: () => void;
  handleFiltersChange: (filters: FilterOptions) => void;
  handleSortChange: (sort: SortOption) => void;
  setSortBy: (sortBy: SortOption) => void;
  resetAllFilters: () => void;
}

export const useMenuViews = (
  initialView: MenuView = "dashboard"
): MenuViewsHookReturn => {
  const [currentView, setCurrentView] = useState<MenuView>(initialView);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filters, setFilters] = useState<FilterOptions>(getDefaultFilters());

  const handleViewChange = useCallback(
    (view: MenuView) => {
      setCurrentView(view);
      // Clear category filter when switching views
      if (view !== currentView) {
        setSelectedCategory(null);
      }
    },
    [currentView]
  );

  const handleCategoryFilter = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortBy(newSort);
  }, []);

  const resetAllFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory(null);
    setFilters(getDefaultFilters());
    setSortBy("name-asc");
  }, []);

  return {
    // View state
    currentView,
    selectedCategory,

    // Search and filter state
    searchTerm,
    filters,
    sortBy,

    // Actions
    handleViewChange,
    handleCategoryFilter,
    handleSearchChange,
    handleClearSearch,
    handleFiltersChange,
    handleSortChange,
    setSortBy,
    resetAllFilters,
  };
};
