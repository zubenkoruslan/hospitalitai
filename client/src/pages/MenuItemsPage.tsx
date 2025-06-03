import React, { useState, useEffect, useCallback, useMemo } from "react";
import { /* Link, */ useParams, useNavigate } from "react-router-dom"; // Removed Link
import { useAuth } from "../context/AuthContext";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
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
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CubeIcon,
  CalendarIcon,
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
import DeleteMenuItemModal from "../components/items/DeleteMenuItemModal"; // Import the delete modal
// Import the custom hook
import { useMenuData } from "../hooks/useMenuData";
import MenuDetailsEditModal from "../components/menu/MenuDetailsEditModal"; // Import the new menu details modal
import DeleteCategoryModal from "../components/category/DeleteCategoryModal"; // Import DeleteCategoryModal
import Card from "../components/common/Card"; // ADDED: Import Card component

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
  const [_editedMenuName, setEditedMenuName] = useState<string>(""); // Prefixed
  const [_editedMenuDescription, setEditedMenuDescription] =
    useState<string>(""); // Prefixed
  const [isSavingMenuDetails, setIsSavingMenuDetails] =
    useState<boolean>(false);
  const [menuDetailsError, setMenuDetailsError] = useState<string | null>(null);

  // State for managing expanded categories
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  // State for deleting categories
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // NEW: State for active tab
  const [activeTab, setActiveTab] = useState<"food" | "beverage" | "wine">(
    "food"
  );

  // Search functionality
  const [searchTerm, setSearchTerm] = useState<string>("");

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Filtered items based on search term
  const filteredItems = useMemo(() => {
    if (!items || !searchTerm.trim()) return items;

    const search = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.ingredients?.some((ingredient) =>
          ingredient.toLowerCase().includes(search)
        )
    );
  }, [items, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const currentItems = filteredItems || [];
    const foodItems = currentItems.filter((item) => item.itemType === "food");
    const beverageItems = currentItems.filter(
      (item) => item.itemType === "beverage"
    );
    const wineItems = currentItems.filter((item) => item.itemType === "wine");

    const currentTabItems =
      activeTab === "food"
        ? foodItems
        : activeTab === "beverage"
        ? beverageItems
        : wineItems;

    return {
      totalItems: currentItems.length,
      foodCount: foodItems.length,
      beverageCount: beverageItems.length,
      wineCount: wineItems.length,
      currentTabCount: currentTabItems.length,
      hasSearchResults: searchTerm.trim() !== "",
    };
  }, [filteredItems, activeTab, searchTerm]);

  // New: Memoize unique food, beverage, and wine categories separately
  const uniqueFoodCategories = useMemo(() => {
    if (!filteredItems) return [];
    return [
      ...new Set(
        filteredItems
          .filter((item) => item.itemType === "food" && item.category)
          .map((item) => toTitleCase(item.category!))
      ),
    ].sort();
  }, [filteredItems]);

  const uniqueBeverageCategories = useMemo(() => {
    if (!filteredItems) return [];
    return [
      ...new Set(
        filteredItems
          .filter((item) => item.itemType === "beverage" && item.category)
          .map((item) => toTitleCase(item.category!))
      ),
    ].sort();
  }, [filteredItems]);

  const uniqueWineCategories = useMemo(() => {
    if (!filteredItems) return [];
    return [
      ...new Set(
        filteredItems
          .filter((item) => item.itemType === "wine" && item.category)
          .map((item) => toTitleCase(item.category!))
      ),
    ].sort();
  }, [filteredItems]);

  // Effect to initialize editing fields when menuDetails load or change
  useEffect(() => {
    if (menuDetails) {
      // Simpler condition, modal will handle its own state sync
      setEditedMenuName(menuDetails.name);
      setEditedMenuDescription(menuDetails.description || "");
    }
  }, [menuDetails]);

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
    if (menuDetails) {
      setEditedMenuName(menuDetails.name);
      setEditedMenuDescription(menuDetails.description || "");
    }
    setIsMenuDetailsModalOpen(true);
    setMenuDetailsError(null); // Clear previous errors when opening modal
  }, [menuDetails]);

  const closeMenuDetailsModal = useCallback(() => {
    setIsMenuDetailsModalOpen(false);
    setMenuDetailsError(null); // Clear errors when closing modal
    // Optionally, reset editedName/Description if menuDetails have not changed
    if (menuDetails) {
      setEditedMenuName(menuDetails.name);
      setEditedMenuDescription(menuDetails.description || "");
    }
  }, [menuDetails]);

  // --- Form Submission (Callback for Modal) ---
  const handleMenuItemFormSubmit = useCallback(
    async (
      submittedFormData: MenuItemFormData,
      currentItemId: string | null
    ) => {
      if (!menuId || !restaurantId) return;

      setIsSubmittingItem(true);
      setSuccessMessage(null);

      try {
        // Prepare data for API based on MenuItemFormData, menuId is already in submittedFormData
        const _dataForService: MenuItemFormData = {
          // Prefixed
          ...submittedFormData,
          // price string to number conversion is handled by transformMenuItemFormData in api.ts
          // ingredients string to array is handled by transformMenuItemFormData in api.ts
        };
        // Ensure boolean flags are correctly passed if not handled by transformMenuItemFormData for partial updates
        // However, createMenuItem and updateMenuItem in api.ts use transformMenuItemFormData which handles this.

        const isEditMode = currentItemId !== null;

        if (isEditMode && currentItemId) {
          // Ensure currentItemId is not null for edit mode
          // updateMenuItem expects Partial<MenuItemFormData>
          // transformMenuItemFormData in api.ts handles the conversion
          await updateMenuItem(currentItemId, submittedFormData); // Pass submittedFormData directly
          setSuccessMessage("Menu item updated successfully.");
        } else {
          // createMenuItem expects MenuItemFormData
          await createMenuItem(submittedFormData); // Pass submittedFormData directly
          setSuccessMessage("Menu item added successfully.");
        }
        fetchData();
        closeModal();
      } catch (err: any) {
        console.error("Error submitting item:", err);
        // TODO: Set a specific submit error state for the modal instead of general page error
      } finally {
        setIsSubmittingItem(false);
      }
    },
    [menuId, restaurantId, fetchData, closeModal] // restaurantId might be removed from deps if not used directly
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
    if (!filteredItems || filteredItems.length === 0) {
      return { food: {}, beverage: {}, wine: {} }; // Ensure structure exists
    }

    return filteredItems.reduce(
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
  }, [filteredItems]);

  // --- Toggle Category Expansion ---
  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  }, []);

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

  // --- Tab Navigation UI ---
  const renderTabs = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Tab Header with Search */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-slate-900">Menu Items</h3>
            <span className="text-sm text-slate-600">
              {stats.hasSearchResults
                ? `${stats.currentTabCount} found`
                : `${stats.currentTabCount} total`}
            </span>
          </div>
          <div className="relative max-w-md flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("food")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "food"
                ? "border-amber-600 text-amber-700 bg-amber-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <CubeIcon className="h-4 w-4" />
            <span>Food</span>
            <span
              className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                activeTab === "food"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {stats.foodCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("beverage")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "beverage"
                ? "border-amber-600 text-amber-700 bg-amber-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ChartBarIcon className="h-4 w-4" />
            <span>Beverages</span>
            <span
              className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                activeTab === "beverage"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {stats.beverageCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wine")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "wine"
                ? "border-amber-600 text-amber-700 bg-amber-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Wines</span>
            <span
              className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                activeTab === "wine"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {stats.wineCount}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );

  // --- Render Logic for Categorized Items (Tab Content) ---
  const renderCategorizedItems = () => {
    const itemsToDisplay =
      activeTab === "food"
        ? groupedItemsByTypeAndCategory.food
        : activeTab === "beverage"
        ? groupedItemsByTypeAndCategory.beverage
        : groupedItemsByTypeAndCategory.wine;

    const uniqueCategoriesForTab =
      activeTab === "food"
        ? uniqueFoodCategories
        : activeTab === "beverage"
        ? uniqueBeverageCategories
        : uniqueWineCategories;

    const hasItemsInTab =
      itemsToDisplay &&
      Object.keys(itemsToDisplay).some((cat) => itemsToDisplay[cat].length > 0);

    if (!hasItemsInTab) {
      const isEmptyDueToSearch = stats.hasSearchResults && searchTerm.trim();

      return (
        <div className="bg-white rounded-b-2xl p-12 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-6">
            {isEmptyDueToSearch ? (
              <MagnifyingGlassIcon className="h-8 w-8 text-slate-400" />
            ) : (
              <CubeIcon className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {isEmptyDueToSearch
              ? `No ${activeTab} items found`
              : `No ${activeTab} items yet`}
          </h3>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            {isEmptyDueToSearch
              ? `Try adjusting your search criteria or add new ${activeTab} items to this menu.`
              : `Get started by adding your first ${activeTab} item to this menu.`}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            {isEmptyDueToSearch && (
              <Button
                variant="secondary"
                onClick={() => setSearchTerm("")}
                className="flex items-center gap-2"
              >
                Clear Search
              </Button>
            )}
            <Button
              variant="primary"
              onClick={openAddModal}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item
            </Button>
          </div>
        </div>
      );
    }

    const displayCategoriesOrder =
      uniqueCategoriesForTab.length > 0
        ? uniqueCategoriesForTab
        : Object.keys(itemsToDisplay).sort();

    if (
      uniqueCategoriesForTab.length === 0 &&
      itemsToDisplay["Uncategorized"]
    ) {
      const idx = displayCategoriesOrder.indexOf("Uncategorized");
      if (idx > -1) {
        displayCategoriesOrder.splice(idx, 1);
        displayCategoriesOrder.push("Uncategorized");
      }
    }

    return (
      <div className="bg-white rounded-b-2xl p-6">
        {displayCategoriesOrder.map((category) => {
          const itemsInCategory = itemsToDisplay[category];
          if (!itemsInCategory || itemsInCategory.length === 0) return null;

          console.log(
            `[MenuItemsPage] Rendering category: "${category}", itemsInCategory:`,
            JSON.stringify(itemsInCategory, null, 2)
          );

          const uniqueCategoryKey = `${activeTab}-${category}`;
          console.log(
            `[MenuItemsPage] Category: "${category}", Is Expanded: ${!!expandedCategories[
              uniqueCategoryKey
            ]}`
          );

          return (
            <div key={uniqueCategoryKey} className="mb-6 last:mb-0">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div
                  className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-50 to-slate-100 cursor-pointer hover:from-slate-100 hover:to-slate-200 transition-all duration-200"
                  onClick={() => toggleCategory(uniqueCategoryKey)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      toggleCategory(uniqueCategoryKey);
                  }}
                  aria-expanded={!!expandedCategories[uniqueCategoryKey]}
                  aria-controls={`category-items-${uniqueCategoryKey}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {toTitleCase(category)}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {itemsInCategory.length} item
                        {itemsInCategory.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {category !== "Uncategorized" && (
                      <Button
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteCategoryModal(category);
                        }}
                        className="text-xs px-3 py-1 shadow-sm"
                        aria-label={`Delete ${category} category`}
                      >
                        <TrashIcon className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                    <div className="p-1">
                      {expandedCategories[uniqueCategoryKey] ? (
                        <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedCategories[uniqueCategoryKey] && (
                  <div
                    id={`category-items-${uniqueCategoryKey}`}
                    className="p-4 bg-white border-t border-slate-200"
                  >
                    <MenuItemList
                      items={itemsInCategory}
                      onEdit={openEditModal}
                      onDelete={openDeleteModal}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
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
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white border border-slate-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-600 rounded-xl shadow-lg">
                      <DocumentTextIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <button
                          onClick={() => navigate("/menu")}
                          className="flex items-center text-slate-300 hover:text-white transition-colors duration-200 text-sm"
                        >
                          <ArrowLeftIcon className="h-4 w-4 mr-1" />
                          Back to Menus
                        </button>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 text-sm">
                          Menu Items
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-white">
                        {menuDetails.name}
                      </h1>
                      {menuDetails.description && (
                        <p className="text-slate-300 mt-2 font-medium">
                          {menuDetails.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="secondary"
                      onClick={openMenuDetailsModal}
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-lg"
                    >
                      <PencilIcon className="h-5 w-5 mr-2" />
                      Edit Menu
                    </Button>
                    <Button
                      variant="primary"
                      onClick={openAddModal}
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Total Items
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.totalItems}
                        </p>
                      </div>
                      <ClipboardDocumentListIcon className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Food Items
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.foodCount}
                        </p>
                      </div>
                      <CubeIcon className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Beverages
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.beverageCount}
                        </p>
                      </div>
                      <ChartBarIcon className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Wines
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.wineCount}
                        </p>
                      </div>
                      <CalendarIcon className="h-8 w-8 text-amber-400" />
                    </div>
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

              {/* Render tabs and categorized items */}
              {!loading && (
                <>
                  {renderTabs()}
                  <div className="mt-6">{renderCategorizedItems()}</div>
                </>
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
                  (activeTab === "beverage"
                    ? "beverage"
                    : activeTab === "wine"
                    ? "wine"
                    : "food") // Default to activeTab for new items
                }
                availableCategories={
                  currentItem?.itemType === "beverage"
                    ? uniqueBeverageCategories
                    : currentItem?.itemType === "food"
                    ? uniqueFoodCategories
                    : currentItem?.itemType === "wine"
                    ? uniqueWineCategories
                    : activeTab === "beverage" // Fallback to activeTab for new items
                    ? uniqueBeverageCategories
                    : activeTab === "wine"
                    ? uniqueWineCategories
                    : uniqueFoodCategories // Default to food categories for new items if food tab active or other cases
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
