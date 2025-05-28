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
import { TrashIcon } from "@heroicons/react/24/outline"; // Ensure TrashIcon is imported
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid"; // ADDED: Icons for collapsibles
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
  const [activeTab, setActiveTab] = useState<"food" | "beverage">("food");

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // New: Memoize unique food and beverage categories separately
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
    if (!items || items.length === 0) {
      return { food: {}, beverage: {} }; // Ensure structure exists
    }

    return items.reduce(
      (acc, item) => {
        const typeKey = item.itemType; // "food" or "beverage"
        const categoryKey = toTitleCase(item.category || "Uncategorized");

        if (!acc[typeKey]) {
          // This case should ideally not happen if types are always food/beverage
          // but as a fallback, initialize it.
          acc[typeKey] = {};
        }
        if (!acc[typeKey][categoryKey]) {
          acc[typeKey][categoryKey] = [];
        }
        acc[typeKey][categoryKey].push(item);
        return acc;
      },
      { food: {}, beverage: {} } as Record<
        string, // "food" or "beverage"
        Record<string, MenuItem[]> // Categories within that type
      >
    );
  }, [items]);

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
    <div className="mb-6 border-b border-gray-200 bg-white shadow-sm rounded-t-lg px-4 sm:px-6">
      <nav className="-mb-px flex space-x-6 sm:space-x-8" aria-label="Tabs">
        <button
          type="button"
          onClick={() => setActiveTab("food")}
          className={`whitespace-nowrap py-3 px-3 sm:py-4 sm:px-4 border-b-2 font-semibold text-sm transition-colors duration-150 focus:outline-none ${
            activeTab === "food"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400"
          }`}
          aria-current={activeTab === "food" ? "page" : undefined}
        >
          Food Items
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("beverage")}
          className={`whitespace-nowrap py-3 px-3 sm:py-4 sm:px-4 border-b-2 font-semibold text-sm transition-colors duration-150 focus:outline-none ${
            activeTab === "beverage"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400"
          }`}
          aria-current={activeTab === "beverage" ? "page" : undefined}
        >
          Beverage Items
        </button>
      </nav>
    </div>
  );

  // --- Render Logic for Categorized Items (Tab Content) ---
  const renderCategorizedItems = () => {
    const itemsToDisplay =
      activeTab === "food"
        ? groupedItemsByTypeAndCategory.food
        : groupedItemsByTypeAndCategory.beverage;

    const uniqueCategoriesForTab =
      activeTab === "food" ? uniqueFoodCategories : uniqueBeverageCategories;

    const hasItemsInTab =
      itemsToDisplay &&
      Object.keys(itemsToDisplay).some((cat) => itemsToDisplay[cat].length > 0);

    if (!hasItemsInTab) {
      return (
        <Card className="bg-white shadow-sm rounded-b-lg p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-3-3m-10 3l-3-3m10 0l-4 4m-2 0l-4-4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No {activeTab} items in this menu yet.
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add a new item or switch tabs to view other items.
          </p>
          <Button variant="primary" onClick={openAddModal} className="mt-6">
            Add Menu Item
          </Button>
        </Card>
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
      <div className="bg-white shadow-sm rounded-b-lg p-4 sm:p-6">
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
              <div
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors duration-150 border border-gray-200 shadow-sm"
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
                <h3 className="text-lg font-medium text-gray-700 flex items-center">
                  {toTitleCase(category)}
                  {expandedCategories[uniqueCategoryKey] ? (
                    <ChevronUpIcon className="h-5 w-5 ml-2 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 ml-2 text-gray-500" />
                  )}
                </h3>
                {category !== "Uncategorized" && (
                  <Button
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteCategoryModal(category);
                    }}
                    className="text-xs z-10 relative px-2 py-1"
                    aria-label={`Delete ${category} category`}
                  >
                    <TrashIcon className="h-4 w-4 mr-1 inline-block" /> Delete
                  </Button>
                )}
              </div>
              {expandedCategories[uniqueCategoryKey] && (
                <div
                  id={`category-items-${uniqueCategoryKey}`}
                  className="mt-1 p-3 border border-gray-200 border-t-0 rounded-b-md bg-white shadow-inner"
                >
                  <MenuItemList
                    items={itemsInCategory}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // --- Render Logic ---
  if (loading && !menuDetails) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading menu items..." />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <ErrorMessage message={error} />
            <Button
              variant="secondary"
              onClick={() => navigate("/menu")}
              className="mt-6"
            >
              &larr; Back to Menus
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!menuDetails) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-700 mb-4">
              Menu Not Found
            </h1>
            <p className="text-gray-600">
              The requested menu could not be found.
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate("/menu")}
              className="mt-6"
            >
              &larr; Back to Menus
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        {/* Back to Menus Link */}
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={() => navigate("/menu")}
            className="text-sm"
          >
            &larr; Back to All Menus
          </Button>
        </div>

        {/* Page Title Header */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 truncate">
              {menuDetails.name}
            </h1>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button variant="secondary" onClick={openMenuDetailsModal}>
                Edit Menu Details
              </Button>
              <Button variant="primary" onClick={openAddModal}>
                Add New Item
              </Button>
            </div>
          </div>
          {menuDetails.description && (
            <p className="mt-2 text-sm text-gray-600">
              {menuDetails.description}
            </p>
          )}
        </div>

        {/* Success and Error Messages */}
        {successMessage && (
          <div className="mb-4">
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </div>
        )}
        {/* Display hook's error if not in loading state and menuDetails exist (to avoid showing during initial load error) */}
        {error && !loading && menuDetails && (
          <div className="mb-4">
            <ErrorMessage message={error} onDismiss={clearError} />
          </div>
        )}

        {/* Loading state for items if menuDetails are already loaded */}
        {loading && menuDetails && (
          <div className="text-center py-10">
            <LoadingSpinner message="Loading items..." />
          </div>
        )}

        {/* Render tabs */}
        {renderTabs()}

        {/* Render categorized items or placeholder */}
        {!loading && renderCategorizedItems()}
      </main>

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
          availableCategories={
            currentItem?.itemType === "beverage"
              ? uniqueBeverageCategories
              : currentItem?.itemType === "food"
              ? uniqueFoodCategories
              : activeTab === "beverage" // Fallback to activeTab for new items
              ? uniqueBeverageCategories
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
  );
};

export default MenuItemsPage;
