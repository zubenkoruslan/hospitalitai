import React, { useState, useEffect, useCallback, useMemo } from "react";
import { /* Link, */ useParams, useNavigate } from "react-router-dom"; // Removed Link
import { useAuth } from "../context/AuthContext";
import { useMenuViews, MenuView } from "../hooks/useMenuViews";
import MenuNavigationTabs from "../components/menu/MenuNavigationTabs";
import MenuViewContainer from "../components/menu/MenuViewContainer";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  bulkDeleteMenuItems,
  updateMenu,
  deleteMenuCategory,
} from "../services/api";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import Button from "../components/common/Button"; // Import Button
import {
  TrashIcon,
  PlusIcon,
  PencilIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  SparklesIcon, // For wine (elegant/premium feel)
  CakeIcon, // For food
  BeakerIcon, // For beverages (glass/liquid container)
  ArrowUpTrayIcon, // For upload functionality
  XMarkIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline"; // Ensure TrashIcon is imported
// Import shared types
import {
  MenuItem,
  MenuItemFormData,
  // ItemType, // Removed
  // ItemCategory, // Removed
  // FoodCategory, // Removed
  // BeverageCategory, // Removed
  // FOOD_CATEGORIES, // Removed
  // BEVERAGE_CATEGORIES, // Removed
} from "../types/menuItemTypes";
// import { IMenuClient } from "../types/menuTypes"; // Removed IMenuClient
// Import quiz components
// import QuizList from "../components/quiz/QuizList"; // Removed QuizList
// import CreateQuizModal from "../components/quiz/CreateQuizModal"; // Removed CreateQuizModal
// import QuizEditorModal from "../components/quiz/QuizEditorModal"; // Removed QuizEditorModal
// Import item components
import AddEditMenuItemModal from "../components/items/AddEditMenuItemModal"; // Import the new modal
import MenuItemList from "../components/items/MenuItemList"; // Import the item list
import DeleteMenuItemModal from "../components/items/DeleteMenuItemModal";

// Import the custom hook
import { useMenuData } from "../hooks/useMenuData";
import MenuDetailsEditModal from "../components/menu/MenuDetailsEditModal"; // Import the new menu details modal
import DeleteCategoryModal from "../components/category/DeleteCategoryModal"; // Import DeleteCategoryModal

// --- Error Formatting Helper ---
const formatApiError = (err: any, context: string): string => {
  console.error(`Error ${context}:`, err);
  if (err.response) {
    let message =
      err.response.data?.message ||
      `Request failed with status ${err.response.status}.`;
    if (err.response.status >= 500) {
      message += " Please try again later.";
    }
    return message;
  } else if (err.request) {
    return `Network error while ${context}. Please check your connection and try again.`;
  } else {
    return `An unexpected error occurred while ${context}. Please try again.`;
  }
};

// --- Helper function to convert string to Title Case ---
const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// --- Main Component ---
const MenuItemsPage: React.FC = () => {
  const { menuId } = useParams<{ menuId: string }>();

  // Add console logs here
  console.log("[MenuItemsPage] Raw menuId from useParams:", menuId);
  console.log("[MenuItemsPage] menuId type:", typeof menuId);
  console.log("[MenuItemsPage] menuId length:", menuId?.length);
  if (menuId) {
    const charCodes = [];
    for (let i = 0; i < menuId.length; i++) {
      charCodes.push(menuId.charCodeAt(i));
    }
    console.log("[MenuItemsPage] menuId charCodes:", charCodes.join(", "));
    // You can also try to see if trimming it makes a difference for validation
    // This is just for logging, don't use the trimmed version for API calls yet
    const trimmedMenuId = menuId.trim();
    console.log("[MenuItemsPage] trimmedMenuId for logging:", trimmedMenuId);
    console.log("[MenuItemsPage] trimmedMenuId length:", trimmedMenuId.length);
  }
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use the custom hook for menu details, items, loading, and error
  const { menuDetails, items, loading, error, fetchData, clearError } =
    useMenuData(menuId);

  // NEW: Replace complex state with simple view management
  const {
    currentView,
    selectedCategory,
    searchTerm,
    filters,
    sortBy,
    handleViewChange,
    handleCategoryFilter,
    handleSearchChange,
    handleClearSearch,
    handleFiltersChange,
    handleSortChange,
    setSortBy,
  } = useMenuViews("dashboard");

  // Remove state managed by the hook
  // const [menuDetails, setMenuDetails] = useState<Menu | null>(null); // Handled by hook
  // const [items, setItems] = useState<MenuItem[]>([]); // Handled by hook
  // const [isLoading, setIsLoading] = useState<boolean>(true); // Handled by hook
  // const [error, setError] = useState<string | null>(null); // Handled by hook

  // Keep state specific to this page (modals, submission status, success messages)
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<MenuItem | null>(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState<boolean>(false);

  // State for editing menu details (name, description)
  const [isMenuDetailsModalOpen, setIsMenuDetailsModalOpen] =
    useState<boolean>(false); // New state for modal

  const [isSavingMenuDetails, setIsSavingMenuDetails] =
    useState<boolean>(false);
  const [menuDetailsError, setMenuDetailsError] = useState<string | null>(null);

  // NEW: Simple expandable cards state for mobile
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Keep only essential state for modal management
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Add missing state for table of contents search functionality
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    food: false,
    beverage: false,
    wine: false,
  });
  const [searchResults, setSearchResults] = useState<{
    categories: string[];
    items: string[];
  }>({
    categories: [],
    items: [],
  });

  // Add state for tracking selected items in navigation (for table of contents only)
  const [selectedItemType, setSelectedItemType] = useState<
    "food" | "beverage" | "wine" | null
  >(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Add missing search utility functions
  const clearSearch = useCallback(() => {
    handleClearSearch();
    setSearchResults({ categories: [], items: [] });
    setSelectedItemType(null);
    setSelectedCategoryId(null);
    setSelectedItemId(null);
  }, [handleClearSearch]);

  const isSearchMatch = useCallback(
    (type: "itemType" | "category" | "item", key: string) => {
      if (!searchTerm.trim()) return false;

      if (type === "itemType") {
        return key.toLowerCase().includes(searchTerm.toLowerCase());
      } else if (type === "category") {
        return key.toLowerCase().includes(searchTerm.toLowerCase());
      } else if (type === "item") {
        const item = items?.find((item) => item._id === key);
        if (!item) return false;

        const searchTermLower = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower) ||
          item.category?.toLowerCase().includes(searchTermLower) ||
          item.ingredients?.some((ing) =>
            ing.toLowerCase().includes(searchTermLower)
          )
        );
      }

      return false;
    },
    [searchTerm, items]
  );

  // NEW: Handle card expansion for mobile
  const toggleCardExpansion = useCallback((cardId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  // Updated stats calculation (keep existing logic)
  const stats = useMemo(() => {
    const currentItems = items || [];
    const foodItems = currentItems.filter((item) => item.itemType === "food");
    const beverageItems = currentItems.filter(
      (item) => item.itemType === "beverage"
    );
    const wineItems = currentItems.filter((item) => item.itemType === "wine");

    return {
      totalItems: currentItems.length,
      foodCount: foodItems.length,
      beverageCount: beverageItems.length,
      wineCount: wineItems.length,
    };
  }, [items]);

  // New: Memoize unique food, beverage, and wine categories separately
  const uniqueFoodCategories = useMemo(() => {
    if (!items) return [];
    return [
      ...new Set(
        items
          .filter((item) => item.itemType === "food" && item.category)
          .map((item) => toTitleCase(item.category!))
      ),
    ].sort();
  }, [items]);

  const uniqueBeverageCategories = useMemo(() => {
    if (!items) return [];
    return [
      ...new Set(
        items
          .filter((item) => item.itemType === "beverage" && item.category)
          .map((item) => toTitleCase(item.category!))
      ),
    ].sort();
  }, [items]);

  const uniqueWineCategories = useMemo(() => {
    if (!items) return [];
    return [
      ...new Set(
        items
          .filter((item) => item.itemType === "wine" && item.category)
          .map((item) => toTitleCase(item.category!))
      ),
    ].sort();
  }, [items]);

  // --- Modal Handlers ---
  const openAddModal = useCallback(() => {
    setCurrentItem(null);
    setIsAddEditModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: MenuItem) => {
    setCurrentItem(item);
    setIsAddEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((item: MenuItem) => {
    setCurrentItem(item);
    setIsDeleteModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsAddEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsMenuDetailsModalOpen(false);
    setCurrentItem(null);
  }, []);

  const openMenuDetailsModal = useCallback(() => {
    setIsMenuDetailsModalOpen(true);
    setMenuDetailsError(null); // Clear previous errors when opening modal
  }, []);

  const closeMenuDetailsModal = useCallback(() => {
    setIsMenuDetailsModalOpen(false);
    setMenuDetailsError(null); // Clear errors when closing modal
  }, []);

  // --- Form Submission (Callback for Modal) ---
  const handleMenuItemFormSubmit = useCallback(
    async (
      submittedFormData: MenuItemFormData,
      currentItemId: string | null
    ) => {
      if (!menuId || !restaurantId) return;

      console.log("[MenuItemsPage] Starting menu item submission...");
      console.log("[MenuItemsPage] User data:", {
        userId: user?._id,
        role: user?.role,
        restaurantId: user?.restaurantId,
        isAuthenticated: !!user,
      });
      console.log("[MenuItemsPage] Submission data:", {
        currentItemId,
        isEditMode: currentItemId !== null,
        formData: submittedFormData,
      });

      setIsSubmittingItem(true);
      setSuccessMessage(null);

      try {
        // Data transformation is handled by transformMenuItemFormData in api.ts

        const isEditMode = currentItemId !== null;

        if (isEditMode && currentItemId) {
          console.log(
            "[MenuItemsPage] Attempting to update menu item:",
            currentItemId
          );
          // Ensure currentItemId is not null for edit mode
          // updateMenuItem expects Partial<MenuItemFormData>
          // transformMenuItemFormData in api.ts handles the conversion
          await updateMenuItem(currentItemId, submittedFormData); // Pass submittedFormData directly
          console.log("[MenuItemsPage] Menu item updated successfully");
          setSuccessMessage("Menu item updated successfully.");

          // Navigate to the appropriate item type tab after updating an item
          const itemType = submittedFormData.itemType as
            | "food"
            | "beverage"
            | "wine";

          // Use the proper view system to navigate
          const targetView: MenuView =
            itemType === "beverage"
              ? "beverages"
              : itemType === "wine"
              ? "wines"
              : "food";
          console.log(
            "[MenuItemsPage] Navigating to view:",
            targetView,
            "for itemType:",
            itemType
          );
          handleViewChange(targetView);

          // Also set category filter if available
          if (submittedFormData.category) {
            console.log(
              "[MenuItemsPage] Setting category filter:",
              toTitleCase(submittedFormData.category)
            );
            handleCategoryFilter(toTitleCase(submittedFormData.category));
          }
        } else {
          console.log("[MenuItemsPage] Attempting to create new menu item");
          // createMenuItem expects MenuItemFormData
          await createMenuItem(submittedFormData); // Pass submittedFormData directly
          console.log("[MenuItemsPage] Menu item created successfully");
          setSuccessMessage("Menu item added successfully.");

          // Navigate to the appropriate item type tab after creating a new item
          const itemType = submittedFormData.itemType as
            | "food"
            | "beverage"
            | "wine";

          // Use the proper view system to navigate
          const targetView: MenuView =
            itemType === "beverage"
              ? "beverages"
              : itemType === "wine"
              ? "wines"
              : "food";
          console.log(
            "[MenuItemsPage] Navigating to view:",
            targetView,
            "for itemType:",
            itemType
          );
          handleViewChange(targetView);

          // Also set category filter if available
          if (submittedFormData.category) {
            console.log(
              "[MenuItemsPage] Setting category filter:",
              toTitleCase(submittedFormData.category)
            );
            handleCategoryFilter(toTitleCase(submittedFormData.category));
          }
        }
        fetchData();
        closeModal();
      } catch (err: any) {
        console.error("Error submitting item:", err);
        console.error("Error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText,
        });

        // Display the actual error to the user
        if (err.response?.status === 403) {
          setSuccessMessage(
            "Permission denied. Please ensure you are logged in as a restaurant user."
          );
        } else if (err.response?.status === 401) {
          setSuccessMessage("Authentication required. Please log in again.");
        } else {
          setSuccessMessage(
            `Error: ${
              err.response?.data?.message ||
              err.message ||
              "Unknown error occurred"
            }`
          );
        }
      } finally {
        setIsSubmittingItem(false);
      }
    },
    [
      menuId,
      restaurantId,
      fetchData,
      closeModal,
      user,
      handleViewChange,
      handleCategoryFilter,
    ] // Add navigation functions to dependencies
  );

  // --- Delete Confirmation ---
  const handleDeleteMenuItemConfirm = useCallback(async () => {
    if (!currentItem || !currentItem._id) return;
    setIsSubmittingItem(true);
    setSuccessMessage(null);
    try {
      // await api.delete(`/items/${currentItem._id}`);
      await deleteMenuItem(currentItem._id); // Use service function
      setSuccessMessage("Menu item deleted successfully.");
      fetchData();
      closeModal();
    } catch (err: any) {
      console.error(formatApiError(err, "deleting menu item"));
      setSuccessMessage(null);
    } finally {
      setIsSubmittingItem(false);
    }
  }, [currentItem, fetchData, closeModal]);

  // --- Menu Details Edit Handlers ---
  const handleSaveMenuDetails = useCallback(
    async (name: string, description: string) => {
      if (!menuId) {
        setMenuDetailsError("Menu ID is missing. Cannot save details.");
        return;
      }
      // Basic validation (optional, can be in modal too)
      if (!name.trim()) {
        setMenuDetailsError("Menu name cannot be empty.");
        // Potentially return error or throw to be caught by modal
        return;
      }

      setIsSavingMenuDetails(true);
      setMenuDetailsError(null);
      setSuccessMessage(null);

      try {
        // await api.put(`/menus/${menuId}`, {
        //   name: name.trim(),
        //   description: description.trim(),
        // });
        await updateMenu(menuId, {
          // Use service function
          name: name.trim(),
          description: description.trim(),
        });
        setSuccessMessage("Menu details updated successfully.");
        fetchData();
        closeMenuDetailsModal();
      } catch (err: any) {
        setMenuDetailsError(formatApiError(err, "saving menu details"));
      } finally {
        setIsSavingMenuDetails(false);
      }
    },
    [menuId, fetchData, closeMenuDetailsModal]
  );

  // --- Data Grouping for Display ---
  // Memoize grouped items to avoid recalculation on every render
  const groupedItemsByTypeAndCategory = useMemo(() => {
    if (!items || items.length === 0) {
      return { food: {}, beverage: {}, wine: {} }; // Ensure structure exists
    }

    return items.reduce(
      (acc, item) => {
        const typeKey = item.itemType; // "food", "beverage", or "wine"
        const categoryKey = toTitleCase(item.category || "Uncategorized");

        if (!acc[typeKey]) {
          // This case should ideally not happen if types are always food/beverage/wine
          // but as a fallback, initialize it.
          acc[typeKey] = {};
        }
        if (!acc[typeKey][categoryKey]) {
          acc[typeKey][categoryKey] = [];
        }
        acc[typeKey][categoryKey].push(item);
        return acc;
      },
      { food: {}, beverage: {}, wine: {} } as Record<
        string, // "food", "beverage", or "wine"
        Record<string, MenuItem[]> // Categories within that type
      >
    );
  }, [items]);

  // --- Category Delete Handlers ---
  const openDeleteCategoryModal = useCallback((category: string) => {
    // Prevent deletion of special categories
    if (
      category.toLowerCase() === "uncategorized" ||
      category.toLowerCase() === "non assigned"
    ) {
      // Optionally show a message that these categories cannot be deleted
      alert(`The category "${category}" cannot be deleted.`);
      return;
    }
    setCategoryToDelete(category);
    setIsDeleteCategoryModalOpen(true);
  }, []);

  const closeDeleteCategoryModal = useCallback(() => {
    setIsDeleteCategoryModalOpen(false);
    setCategoryToDelete(null);
  }, []);

  const handleConfirmDeleteCategory = useCallback(async () => {
    if (!categoryToDelete || !menuId) return;

    setIsDeletingCategory(true);
    setSuccessMessage(null);

    try {
      // await api.delete(
      //   `/menus/${menuId}/categories/${encodeURIComponent(categoryToDelete)}`
      // );
      await deleteMenuCategory(menuId, categoryToDelete); // Use service function

      setSuccessMessage(
        `Category "${categoryToDelete}" deleted successfully. Items reassigned.`
      );
      fetchData();
      closeDeleteCategoryModal();
    } catch (err: any) {
      console.error(
        formatApiError(err, `deleting category ${categoryToDelete}`)
      );
      alert(
        `Failed to delete category "${categoryToDelete}". ${formatApiError(
          err,
          "deleting category"
        )}`
      );
      closeDeleteCategoryModal();
    } finally {
      setIsDeletingCategory(false);
    }
  }, [categoryToDelete, menuId, fetchData, closeDeleteCategoryModal]);

  // --- Bulk Delete Handler ---
  const handleBulkDelete = useCallback(
    async (itemIds: string[]) => {
      if (itemIds.length === 0) return;

      const confirmed = window.confirm(
        `Are you sure you want to delete ${itemIds.length} item${
          itemIds.length !== 1 ? "s" : ""
        }? This action cannot be undone.`
      );

      if (!confirmed) return;

      try {
        const result = await bulkDeleteMenuItems(itemIds);
        setSuccessMessage(result.message);
        fetchData(); // Refresh the data
      } catch (err: any) {
        console.error(formatApiError(err, "bulk deleting menu items"));
        setSuccessMessage(
          `Error: ${formatApiError(err, "bulk deleting menu items")}`
        );
      }
    },
    [fetchData]
  );

  // --- Import/Export Handlers ---
  const handleImportMenu = useCallback(() => {
    navigate("/upload");
  }, [navigate]);

  const handleExportMenu = useCallback(() => {
    console.log("Export menu clicked - handled by DashboardView");
  }, []);

  // --- Table of Contents Component ---
  const renderTableOfContents = () => {
    const itemTypes: Array<{
      key: "food" | "beverage" | "wine";
      label: string;
      icon: any;
      count: number;
    }> = [
      { key: "food", label: "Food", icon: CakeIcon, count: stats.foodCount },
      {
        key: "beverage",
        label: "Beverages",
        icon: BeakerIcon,
        count: stats.beverageCount,
      },
      {
        key: "wine",
        label: "Wines",
        icon: SparklesIcon,
        count: stats.wineCount,
      },
    ];

    const isSearchActive = searchTerm.trim() !== "";

    const shouldShowItemType = (itemType: "food" | "beverage" | "wine") => {
      if (!isSearchActive) return true;
      // Show if item type matches search or has matching categories/items
      return (
        isSearchMatch("itemType", itemType) ||
        searchResults.categories.some((cat) =>
          cat.startsWith(`${itemType}-`)
        ) ||
        searchResults.items.length > 0
      );
    };

    const shouldShowCategory = (
      itemType: "food" | "beverage" | "wine",
      category: string
    ) => {
      if (!isSearchActive) return true;
      const categoryKey = `${itemType}-${category}`;
      // Show if category matches search or has matching items
      return (
        isSearchMatch("category", categoryKey) ||
        groupedItemsByTypeAndCategory[itemType]?.[category]?.some((item) =>
          isSearchMatch("item", item._id)
        )
      );
    };

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
        {/* Search Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Menu Navigation
              </h3>
              {/* Item count badge */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 min-w-[24px] justify-center">
                {stats.totalItems}
              </span>
            </div>
            <Button
              variant="primary"
              onClick={openAddModal}
              className="flex items-center gap-2 text-sm px-3 py-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Add Item</span>
            </Button>
          </div>

          {/* Enhanced Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items, categories, ingredients..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 bg-white/80 backdrop-blur-sm"
              aria-label="Search menu items"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                aria-label="Clear search"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results Summary */}
          {isSearchActive && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                {searchResults.items.length} items found
              </span>
              {searchTerm && (
                <span className="text-slate-500">
                  Searching for "{searchTerm}"
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table of Contents with improved scrolling and hierarchy */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 max-h-full">
          {itemTypes.map((itemType, index) => {
            if (!shouldShowItemType(itemType.key)) return null;

            const categories =
              itemType.key === "food"
                ? uniqueFoodCategories
                : itemType.key === "beverage"
                ? uniqueBeverageCategories
                : uniqueWineCategories;

            const isExpanded = expandedCategories[itemType.key];
            const Icon = itemType.icon;
            const isSelected =
              selectedItemType === itemType.key && !selectedCategoryId;

            return (
              <div key={itemType.key}>
                {/* Visual separator between item types */}
                {index > 0 && (
                  <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                    <div className="px-3 text-xs font-medium text-slate-500 bg-white">
                      {itemType.label} Section
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Item Type Button with enhanced visual feedback and hierarchy distinction */}
                  <button
                    onClick={() => {
                      setSelectedItemType(itemType.key);
                      setSelectedCategoryId(null);
                      setSelectedItemId(null);
                      setExpandedCategories((prev) => ({
                        ...prev,
                        [itemType.key]: !prev[itemType.key],
                      }));
                    }}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-200 group relative overflow-hidden ${
                      isSearchMatch("itemType", itemType.key)
                        ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900 shadow-md"
                        : isSelected
                        ? "bg-gradient-to-r from-blue-50 via-blue-100 to-indigo-50 border-2 border-blue-300 text-blue-800 shadow-lg"
                        : "hover:bg-gradient-to-r hover:from-slate-50 hover:via-slate-100 hover:to-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:shadow-md"
                    }`}
                    aria-expanded={isExpanded}
                    aria-controls={`${itemType.key}-categories`}
                  >
                    {/* Primary level indicator - thick left border */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-2 transition-all duration-200 ${
                        isSelected
                          ? "bg-gradient-to-b from-blue-400 to-blue-600"
                          : "bg-transparent group-hover:bg-gradient-to-b group-hover:from-slate-300 group-hover:to-slate-400"
                      }`}
                    />

                    {/* Background pattern for primary level */}
                    <div
                      className={`absolute inset-0 opacity-5 ${
                        isSelected ? "bg-blue-600" : "bg-slate-600"
                      }`}
                      style={{
                        backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px)`,
                        backgroundSize: "20px 20px",
                      }}
                    />

                    <div className="flex items-center space-x-4 relative z-10">
                      <div
                        className={`p-3 rounded-2xl transition-all duration-200 ${
                          isSelected
                            ? "bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-100 shadow-md"
                            : "bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300 group-hover:shadow-sm"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            isSelected
                              ? "text-blue-700"
                              : "text-slate-600 group-hover:text-slate-700"
                          }`}
                        />
                      </div>
                      <div className="text-left">
                        <span
                          className={`font-bold text-lg ${
                            isSearchMatch("itemType", itemType.key)
                              ? "text-yellow-900"
                              : isSelected
                              ? "text-blue-900"
                              : "text-slate-800 group-hover:text-slate-900"
                          }`}
                        >
                          {itemType.label}
                        </span>
                        <div
                          className={`text-sm mt-1 font-medium ${
                            isSearchMatch("itemType", itemType.key)
                              ? "text-yellow-700"
                              : isSelected
                              ? "text-blue-600"
                              : "text-slate-500 group-hover:text-slate-600"
                          }`}
                        >
                          Primary Category • {categories.length} subcategories
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 relative z-10">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm min-w-[24px] text-center ${
                          isSelected
                            ? "bg-blue-200 text-blue-800 border border-blue-300"
                            : "bg-slate-200 text-slate-700 border border-slate-300 group-hover:bg-slate-300 group-hover:border-slate-400"
                        }`}
                      >
                        {itemType.count}
                      </span>
                      {categories.length > 0 && (
                        <div
                          className={`p-2 rounded-full transition-all duration-200 ${
                            isSelected
                              ? "bg-blue-200"
                              : "bg-slate-200 group-hover:bg-slate-300"
                          }`}
                        >
                          <ChevronRightIcon
                            className={`h-5 w-5 transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            } ${
                              isSelected
                                ? "text-blue-700"
                                : "text-slate-600 group-hover:text-slate-700"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Categories with improved animation and better distinction */}
                  <div
                    id={`${itemType.key}-categories`}
                    className={`transition-all duration-300 ease-in-out ${
                      isExpanded
                        ? "max-h-96 opacity-100 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
                        : "max-h-0 opacity-0 overflow-hidden"
                    }`}
                  >
                    {/* Category container with enhanced visual hierarchy */}
                    <div className="ml-6 mt-3 space-y-3 relative">
                      {/* Hierarchy connection line */}
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent"></div>

                      <div className="pl-6 space-y-3">
                        {categories.map((category, categoryIndex) => {
                          if (!shouldShowCategory(itemType.key, category))
                            return null;

                          const categoryItems =
                            groupedItemsByTypeAndCategory[itemType.key]?.[
                              category
                            ] || [];
                          const categoryKey = `${itemType.key}-${category}`;
                          const isCategorySelected =
                            selectedCategoryId === categoryKey &&
                            !selectedItemId;

                          return (
                            <div key={categoryKey} className="space-y-2">
                              {/* Category separator */}
                              {categoryIndex > 0 && (
                                <div className="flex items-center my-4">
                                  <div className="flex-1 h-px bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200"></div>
                                </div>
                              )}

                              {/* Enhanced Category Button with distinct styling and expansion */}
                              <button
                                onClick={() => {
                                  setSelectedItemType(itemType.key);
                                  setSelectedCategoryId(categoryKey);
                                  setSelectedItemId(null);
                                  // Toggle subcategory expansion
                                  setExpandedCategories((prev) => ({
                                    ...prev,
                                    [categoryKey]: !prev[categoryKey],
                                  }));
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group relative ${
                                  isSearchMatch("category", categoryKey)
                                    ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900 shadow-md"
                                    : isCategorySelected
                                    ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-800 shadow-md"
                                    : "hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 text-slate-700 border-2 border-transparent hover:border-slate-300"
                                } text-sm`}
                                aria-expanded={expandedCategories[categoryKey]}
                                aria-controls={`${categoryKey}-items`}
                              >
                                {/* Category indicator line */}
                                <div
                                  className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-200 ${
                                    isCategorySelected
                                      ? "bg-amber-400"
                                      : "bg-transparent group-hover:bg-slate-300"
                                  }`}
                                />

                                <div className="flex items-center space-x-4">
                                  <div
                                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                                      isCategorySelected
                                        ? "bg-gradient-to-br from-amber-100 to-orange-100 shadow-sm"
                                        : "bg-slate-100 group-hover:bg-slate-200 group-hover:shadow-sm"
                                    }`}
                                  >
                                    <FolderIcon
                                      className={`h-5 w-5 ${
                                        isCategorySelected
                                          ? "text-amber-600"
                                          : "text-slate-500 group-hover:text-slate-600"
                                      }`}
                                    />
                                  </div>
                                  <div className="text-left">
                                    <span
                                      className={`font-semibold text-base ${
                                        isSearchMatch("category", categoryKey)
                                          ? "text-yellow-900"
                                          : isCategorySelected
                                          ? "text-amber-900"
                                          : "text-slate-800"
                                      }`}
                                    >
                                      {toTitleCase(category)}
                                    </span>
                                    <div
                                      className={`text-xs mt-0.5 ${
                                        isSearchMatch("category", categoryKey)
                                          ? "text-yellow-700"
                                          : isCategorySelected
                                          ? "text-amber-600"
                                          : "text-slate-500"
                                      }`}
                                    >
                                      Subcategory • {categoryItems.length} items
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center ${
                                      isCategorySelected
                                        ? "bg-amber-200 text-amber-800"
                                        : "bg-slate-200 text-slate-600 group-hover:bg-slate-300"
                                    }`}
                                  >
                                    {categoryItems.length}
                                  </span>
                                  <div
                                    className={`p-1.5 rounded-full transition-all duration-200 ${
                                      isCategorySelected
                                        ? "bg-amber-200"
                                        : "bg-slate-200 group-hover:bg-slate-300"
                                    }`}
                                  >
                                    <ChevronRightIcon
                                      className={`h-4 w-4 transition-transform duration-200 ${
                                        expandedCategories[categoryKey]
                                          ? "rotate-90"
                                          : ""
                                      } ${
                                        isCategorySelected
                                          ? "text-amber-600"
                                          : "text-slate-400 group-hover:text-slate-600"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </button>

                              {/* Individual Items with enhanced subcategory styling - Collapsible */}
                              <div
                                id={`${categoryKey}-items`}
                                className={`ml-8 overflow-hidden transition-all duration-300 ease-in-out ${
                                  expandedCategories[categoryKey] ||
                                  (isSearchActive &&
                                    searchResults.items.some((itemId) =>
                                      categoryItems.some(
                                        (item) => item._id === itemId
                                      )
                                    ))
                                    ? "max-h-64 opacity-100"
                                    : "max-h-0 opacity-0"
                                }`}
                              >
                                <div className="space-y-1 relative pt-2">
                                  {/* Items connection line */}
                                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-green-200 via-green-300 to-transparent"></div>

                                  <div className="pl-4 space-y-1">
                                    {(isSearchActive
                                      ? categoryItems.filter((item) =>
                                          isSearchMatch("item", item._id)
                                        )
                                      : categoryItems.slice(0, 5)
                                    ).map((item) => {
                                      const isItemSelected =
                                        selectedItemId === item._id;
                                      return (
                                        <button
                                          key={item._id}
                                          onClick={() => {
                                            setSelectedItemType(itemType.key);
                                            setSelectedCategoryId(categoryKey);
                                            setSelectedItemId(item._id);
                                          }}
                                          className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group relative ${
                                            isSearchMatch("item", item._id)
                                              ? "bg-yellow-100 border border-yellow-300 text-yellow-900 shadow-md"
                                              : isItemSelected
                                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 text-green-800 shadow-sm"
                                              : "hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200 hover:shadow-sm"
                                          } text-sm`}
                                        >
                                          {/* Item indicator dot */}
                                          <div
                                            className={`w-2 h-2 rounded-full mr-3 transition-all duration-200 ${
                                              isItemSelected
                                                ? "bg-green-400 shadow-sm"
                                                : "bg-slate-300 group-hover:bg-slate-400"
                                            }`}
                                          />

                                          <div
                                            className={`p-1.5 rounded-lg mr-3 transition-all duration-200 ${
                                              isItemSelected
                                                ? "bg-green-100"
                                                : "bg-slate-100 group-hover:bg-slate-200"
                                            }`}
                                          >
                                            <ClipboardDocumentListIcon
                                              className={`h-3.5 w-3.5 ${
                                                isItemSelected
                                                  ? "text-green-600"
                                                  : "text-slate-500 group-hover:text-slate-600"
                                              }`}
                                            />
                                          </div>

                                          <div className="flex-1 text-left min-w-0">
                                            <span
                                              className={`font-medium ${
                                                isSearchMatch("item", item._id)
                                                  ? "text-yellow-900"
                                                  : isItemSelected
                                                  ? "text-green-900"
                                                  : "text-slate-800"
                                              }`}
                                            >
                                              {item.name}
                                            </span>
                                            {item.description && (
                                              <div
                                                className={`text-xs mt-0.5 line-clamp-2 ${
                                                  isSearchMatch(
                                                    "item",
                                                    item._id
                                                  )
                                                    ? "text-yellow-700"
                                                    : isItemSelected
                                                    ? "text-green-600"
                                                    : "text-slate-500"
                                                }`}
                                              >
                                                {item.description}
                                              </div>
                                            )}
                                          </div>

                                          {item.price && (
                                            <span
                                              className={`text-xs font-bold px-2 py-1 rounded ${
                                                isItemSelected
                                                  ? "bg-green-100 text-green-700"
                                                  : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                                              }`}
                                            >
                                              ${item.price}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}

                                    {/* Enhanced "Show more" indicator */}
                                    {categoryItems.length > 5 && (
                                      <button
                                        onClick={() => {
                                          setSelectedItemType(itemType.key);
                                          setSelectedCategoryId(categoryKey);
                                          setSelectedItemId(null);
                                        }}
                                        className="w-full p-3 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-200 border-2 border-dashed border-slate-200 hover:border-slate-300 group"
                                      >
                                        <div className="flex items-center justify-center space-x-2">
                                          <div className="flex space-x-1">
                                            <div className="w-1 h-1 bg-slate-400 rounded-full group-hover:bg-slate-600 transition-colors duration-200"></div>
                                            <div className="w-1 h-1 bg-slate-400 rounded-full group-hover:bg-slate-600 transition-colors duration-200"></div>
                                            <div className="w-1 h-1 bg-slate-400 rounded-full group-hover:bg-slate-600 transition-colors duration-200"></div>
                                          </div>
                                          <span className="font-medium">
                                            View all {categoryItems.length}{" "}
                                            items in {toTitleCase(category)}
                                          </span>
                                        </div>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Enhanced Empty Search State */}
          {isSearchActive &&
            Object.keys(searchResults.categories).length === 0 && (
              <div className="text-center py-12 px-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
                  <MagnifyingGlassIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No items found
                </h3>
                <p className="text-slate-500 mb-4">
                  No items match "{searchTerm}". Try a different search term.
                </p>
                <Button
                  variant="secondary"
                  onClick={clearSearch}
                  className="text-sm"
                >
                  Clear search
                </Button>
              </div>
            )}
        </div>
      </div>
    );
  };

  // --- Enhanced Content Display Component ---
  const ContentDisplay: React.FC = () => {
    // Breadcrumb component for better navigation
    const Breadcrumb: React.FC = () => {
      if (!selectedItemType) return null;

      const breadcrumbItems = [
        {
          label: toTitleCase(selectedItemType),
          onClick: () => {
            setSelectedCategoryId(null);
            setSelectedItemId(null);
          },
        },
      ];

      if (selectedCategoryId) {
        const [, category] = selectedCategoryId.split("-", 2);
        breadcrumbItems.push({
          label: toTitleCase(category),
          onClick: () => setSelectedItemId(null),
        });
      }

      if (selectedItemId) {
        const selectedItem = items?.find((item) => item._id === selectedItemId);
        if (selectedItem) {
          breadcrumbItems.push({
            label: selectedItem.name,
            onClick: () => {},
          });
        }
      }

      return (
        <nav
          className="flex items-center space-x-2 text-sm text-slate-600 mb-4"
          aria-label="Breadcrumb"
        >
          <button
            onClick={() => {
              setSelectedItemType(null);
              setSelectedCategoryId(null);
              setSelectedItemId(null);
            }}
            className="hover:text-slate-900 transition-colors duration-200"
          >
            Menu
          </button>
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
              <button
                onClick={item.onClick}
                className={`hover:text-slate-900 transition-colors duration-200 ${
                  index === breadcrumbItems.length - 1
                    ? "text-slate-900 font-medium"
                    : ""
                }`}
              >
                {item.label}
              </button>
            </div>
          ))}
        </nav>
      );
    };

    // Loading skeleton component
    const ContentSkeleton: React.FC = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );

    if (loading) {
      return <ContentSkeleton />;
    }

    // Enhanced empty state
    if (!selectedItemType && !selectedCategoryId && !selectedItemId) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col justify-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-6">
            <ClipboardDocumentListIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900 mb-3">
            Welcome to Menu Management
          </h3>
          <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
            Select an item type or category from the navigation panel to view
            and manage your menu items, or use the search to find specific items
            quickly.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              variant="primary"
              onClick={openAddModal}
              className="flex items-center gap-2 px-6 py-3"
            >
              <PlusIcon className="h-5 w-5" />
              Add New Item
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/upload")}
              className="flex items-center gap-2 px-6 py-3"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              Upload Menu
            </Button>
          </div>
        </div>
      );
    }

    // Display individual item
    if (selectedItemId) {
      const selectedItem = items?.find((item) => item._id === selectedItemId);
      if (!selectedItem) {
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Item not found
            </h3>
            <p className="text-slate-600">
              The selected item could not be found.
            </p>
          </div>
        );
      }

      const Icon =
        selectedItem.itemType === "food"
          ? CakeIcon
          : selectedItem.itemType === "beverage"
          ? BeakerIcon
          : SparklesIcon;

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
          <Breadcrumb />

          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200 rounded-t-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl shadow-sm">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl lg:text-2xl font-bold text-white">
                    {selectedItem.name}
                  </h1>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {toTitleCase(selectedItem.itemType)}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {toTitleCase(selectedItem.category || "Uncategorized")}
                    </span>
                  </div>
                  {selectedItem.price && (
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-green-600">
                        ${selectedItem.price}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => openEditModal(selectedItem)}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openDeleteModal(selectedItem)}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="flex-1 p-6 space-y-8 overflow-y-auto">
            {/* Description Section */}
            {selectedItem.description && (
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-slate-600" />
                  Description
                </h3>
                <p className="text-slate-700 leading-relaxed text-base">
                  {selectedItem.description}
                </p>
              </div>
            )}

            {/* Ingredients & Allergens Grid */}
            {((selectedItem.ingredients &&
              selectedItem.ingredients.length > 0) ||
              (selectedItem.allergens &&
                selectedItem.allergens.length > 0)) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ingredients */}
                {selectedItem.ingredients &&
                  selectedItem.ingredients.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                        <BeakerIcon className="h-5 w-5 mr-2 text-amber-600" />
                        Ingredients
                        <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                          {selectedItem.ingredients.length}
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.ingredients.map((ingredient, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium border border-amber-200 hover:bg-amber-200 transition-colors duration-200"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Allergens */}
                {selectedItem.allergens &&
                  selectedItem.allergens.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
                        Allergens
                        <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                          {selectedItem.allergens.length}
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.allergens.map((allergen, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-200 transition-colors duration-200"
                          >
                            ⚠️ {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Wine-specific Information */}
            {selectedItem.itemType === "wine" && (
              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Wine Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {selectedItem.vintage && (
                    <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {selectedItem.vintage}
                      </div>
                      <div className="text-sm text-slate-600">Vintage</div>
                    </div>
                  )}
                  {selectedItem.region && (
                    <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                      <div className="text-lg font-semibold text-slate-900 mb-1">
                        {selectedItem.region}
                      </div>
                      <div className="text-sm text-slate-600">Region</div>
                    </div>
                  )}
                  {selectedItem.grapeVariety && (
                    <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                      <div className="inline-flex items-center px-3 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        🍇 {selectedItem.grapeVariety}
                      </div>
                      <div className="text-sm text-slate-600 mt-2">
                        Grape Variety
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => openEditModal(selectedItem)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Item
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Create a duplicate item
                    const duplicateItem = {
                      ...selectedItem,
                      name: `${selectedItem.name} (Copy)`,
                    };
                    delete (duplicateItem as any)._id;
                    openEditModal(duplicateItem as any);
                  }}
                  className="flex items-center gap-2"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openDeleteModal(selectedItem)}
                  className="flex items-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete Item
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Display category items
    if (selectedCategoryId) {
      const [itemType, category] = selectedCategoryId.split("-", 2);
      const categoryItems =
        groupedItemsByTypeAndCategory[
          itemType as keyof typeof groupedItemsByTypeAndCategory
        ]?.[category] || [];

      const Icon =
        itemType === "food"
          ? CakeIcon
          : itemType === "beverage"
          ? BeakerIcon
          : SparklesIcon;

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
          <Breadcrumb />

          {/* Enhanced Category Header */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 border-b border-amber-200 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl shadow-sm">
                  <Icon className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {toTitleCase(category)}
                  </h1>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-200 text-amber-800">
                      {toTitleCase(itemType)}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-600">
                      {categoryItems.length}{" "}
                      {categoryItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Item</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openDeleteCategoryModal(category)}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete Category</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Items Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {categoryItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-6">
                  <FolderIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No items in this category
                </h3>
                <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                  This category is empty. Add your first item to get started.
                </p>
                <Button
                  variant="primary"
                  onClick={openAddModal}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add First Item
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group hover:border-slate-300"
                    onClick={() => {
                      setSelectedItemId(item._id);
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.price && (
                        <div className="text-right">
                          <span className="text-xl font-bold text-green-600">
                            ${item.price}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Item Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.ingredients &&
                        item.ingredients
                          .slice(0, 3)
                          .map((ingredient, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium"
                            >
                              {ingredient}
                            </span>
                          ))}
                      {item.ingredients && item.ingredients.length > 3 && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          +{item.ingredients.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Wine-specific info */}
                    {item.itemType === "wine" && (
                      <div className="flex items-center space-x-4 text-xs text-slate-600 mb-4">
                        {item.vintage && (
                          <span className="flex items-center">
                            <span className="font-medium">{item.vintage}</span>
                          </span>
                        )}
                        {item.region && (
                          <span className="flex items-center">
                            📍 {item.region}
                          </span>
                        )}
                        {item.grapeVariety && (
                          <span className="flex items-center">
                            🍇 {item.grapeVariety}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(item);
                        }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5"
                      >
                        <PencilIcon className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(item);
                        }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5"
                      >
                        <TrashIcon className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Display item type overview
    if (selectedItemType) {
      const itemTypeItems =
        items?.filter((item) => item.itemType === selectedItemType) || [];
      const Icon =
        selectedItemType === "food"
          ? CakeIcon
          : selectedItemType === "beverage"
          ? BeakerIcon
          : SparklesIcon;
      const categories =
        selectedItemType === "food"
          ? uniqueFoodCategories
          : selectedItemType === "beverage"
          ? uniqueBeverageCategories
          : uniqueWineCategories;

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {toTitleCase(selectedItemType)} Items
                  </h2>
                  <p className="text-slate-600">
                    {itemTypeItems.length} total items • {categories.length}{" "}
                    categories
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={openAddModal}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add {toTitleCase(selectedItemType)} Item
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-4">
              {categories.map((category) => {
                const categoryItems =
                  groupedItemsByTypeAndCategory[selectedItemType]?.[category] ||
                  [];
                if (categoryItems.length === 0) return null;

                return (
                  <div
                    key={category}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedCategoryId(`${selectedItemType}-${category}`);
                      setSelectedItemId(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FolderIcon className="h-5 w-5 text-slate-500" />
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {toTitleCase(category)}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {categoryItems.length} item
                            {categoryItems.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // --- Render Logic ---
  if (loading && !menuDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="Loading menu items..." />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
                  <div className="p-3 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <DocumentTextIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Error Loading Menu
                  </h1>
                  <ErrorMessage message={error} />
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/menu")}
                    className="mt-6"
                  >
                    ← Back to Menus
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!menuDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                  <div className="p-3 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <DocumentTextIcon className="h-8 w-8 text-slate-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-700 mb-4">
                    Menu Not Found
                  </h1>
                  <p className="text-slate-600 mb-6">
                    The requested menu could not be found.
                  </p>
                  <Button variant="secondary" onClick={() => navigate("/menu")}>
                    ← Back to Menus
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Header Section */}
              {/* Page Header */}
              <div className="mb-6 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-2xl p-4 lg:p-6 border border-primary/10 shadow-md backdrop-blur-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-gradient-to-r from-primary to-accent rounded-lg shadow-md">
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <button
                            onClick={() => navigate("/menu")}
                            className="flex items-center text-muted-gray hover:text-primary transition-colors duration-200 text-sm"
                          >
                            <ArrowLeftIcon className="h-4 w-4 mr-1" />
                            Back to Menus
                          </button>
                          <span className="text-muted-gray">•</span>
                          <span className="text-muted-gray text-sm">
                            Menu Items
                          </span>
                        </div>
                        <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {menuDetails.name}
                        </h1>
                      </div>
                    </div>
                    {menuDetails.description && (
                      <p className="text-muted-gray text-sm mb-3">
                        {menuDetails.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex">
                    <button
                      onClick={openMenuDetailsModal}
                      className="group inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">Edit Menu</span>
                      <span className="sm:hidden">Edit</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Success and Error Messages */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <SuccessNotification
                    message={successMessage}
                    onDismiss={() => setSuccessMessage(null)}
                  />
                </div>
              )}

              {/* Display hook's error if not in loading state and menuDetails exist */}
              {error && !loading && menuDetails && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <ErrorMessage message={error} onDismiss={clearError} />
                </div>
              )}

              {/* Loading state for items if menuDetails are already loaded */}
              {loading && menuDetails && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
                  <div className="text-center">
                    <LoadingSpinner message="Loading items..." />
                  </div>
                </div>
              )}

              {/* NEW: Tab Navigation */}
              <div className="sticky top-0 z-50 bg-gray-50 pb-6">
                <MenuNavigationTabs
                  currentView={currentView}
                  onViewChange={handleViewChange}
                  stats={stats}
                />
              </div>

              {/* Content */}
              {!loading && (
                <div className="mt-6">
                  <MenuViewContainer
                    currentView={currentView}
                    items={items || []}
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryFilter}
                    onItemEdit={openEditModal}
                    onItemDelete={openDeleteModal}
                    onAddItem={openAddModal}
                    onViewChange={handleViewChange}
                    expandedCards={expandedCards}
                    onToggleCardExpansion={toggleCardExpansion}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onClearSearch={handleClearSearch}
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    onBulkDelete={handleBulkDelete}
                    onImportMenu={handleImportMenu}
                    onExportMenu={handleExportMenu}
                    menuId={menuId}
                    menuName={menuDetails?.name}
                  />
                </div>
              )}
            </div>

            {/* Modals */}
            {isAddEditModalOpen && (
              <AddEditMenuItemModal
                isOpen={isAddEditModalOpen}
                onClose={closeModal}
                onSubmit={handleMenuItemFormSubmit}
                currentItem={currentItem}
                isSubmitting={isSubmittingItem}
                menuId={menuId ?? ""}
                allItemsInMenu={items}
                restaurantId={restaurantId ?? ""}
                itemType={
                  currentItem?.itemType ?? // Use existing item's type when editing
                  (localStorage.getItem("pendingItemType") as
                    | "food"
                    | "beverage"
                    | "wine") ?? // Check localStorage first for new items
                  (selectedItemType === "beverage"
                    ? "beverage"
                    : selectedItemType === "wine"
                    ? "wine"
                    : "food") // Default to selectedItemType for new items
                }
                availableCategories={
                  currentItem?.itemType === "beverage"
                    ? uniqueBeverageCategories
                    : currentItem?.itemType === "food"
                    ? uniqueFoodCategories
                    : currentItem?.itemType === "wine"
                    ? uniqueWineCategories
                    : localStorage.getItem("pendingItemType") === "beverage" // Check localStorage for new items
                    ? uniqueBeverageCategories
                    : localStorage.getItem("pendingItemType") === "wine"
                    ? uniqueWineCategories
                    : selectedItemType === "beverage" // Fallback to selectedItemType for new items
                    ? uniqueBeverageCategories
                    : selectedItemType === "wine"
                    ? uniqueWineCategories
                    : uniqueFoodCategories // Default to food categories for new items
                }
              />
            )}

            {/* Delete Confirmation Modal (Use the new component) */}
            {isDeleteModalOpen && currentItem && (
              <DeleteMenuItemModal
                isOpen={isDeleteModalOpen}
                onClose={closeModal}
                onConfirm={handleDeleteMenuItemConfirm}
                itemName={currentItem.name}
                isSubmitting={isSubmittingItem}
              />
            )}

            {menuDetails && (
              <MenuDetailsEditModal
                isOpen={isMenuDetailsModalOpen}
                onClose={closeMenuDetailsModal}
                onSubmit={handleSaveMenuDetails}
                initialName={menuDetails.name} // Pass current name
                initialDescription={menuDetails.description || ""} // Pass current description
                isSaving={isSavingMenuDetails}
                error={menuDetailsError}
              />
            )}

            {/* Delete Category Modal */}
            <DeleteCategoryModal
              isOpen={isDeleteCategoryModalOpen}
              onClose={closeDeleteCategoryModal}
              onConfirm={handleConfirmDeleteCategory}
              categoryName={categoryToDelete}
              isDeleting={isDeletingCategory}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MenuItemsPage;
