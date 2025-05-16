import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
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
  Menu,
  MenuItemFormData,
  ItemType,
  ItemCategory,
  FoodCategory,
  BeverageCategory,
  FOOD_CATEGORIES,
  BEVERAGE_CATEGORIES,
} from "../types/menuItemTypes";
// Import quiz components
import QuizList from "../components/quiz/QuizList";
import CreateQuizModal from "../components/quiz/CreateQuizModal";
import QuizEditorModal from "../components/quiz/QuizEditorModal";
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
  console.log(`[MenuItemsPage] menuId from useParams: ${menuId}`);
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
  const [editedMenuName, setEditedMenuName] = useState<string>("");
  const [editedMenuDescription, setEditedMenuDescription] =
    useState<string>("");
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

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Memoize unique categories from the current menu items
  const uniqueCategories = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }
    const categories = items.map((item) => item.category).filter(Boolean); // Filter out empty/null categories
    return [...new Set(categories)].sort(); // Get unique, sorted categories
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
      // setError(null); // Error from hook will be used for fetch errors
      setSuccessMessage(null); // Clear previous success message

      try {
        // Prepare data for API
        const apiData = {
          ...submittedFormData,
          price: submittedFormData.price
            ? parseFloat(submittedFormData.price)
            : undefined,
          ingredients: submittedFormData.ingredients
            ? submittedFormData.ingredients.split(",").map((s) => s.trim())
            : [],
          // Ensure all boolean flags are present, even if false, as per IMenuItem expectations
          isGlutenFree: submittedFormData.isGlutenFree ?? false,
          isDairyFree: submittedFormData.isDairyFree ?? false,
          isVegetarian: submittedFormData.isVegetarian ?? false,
          isVegan: submittedFormData.isVegan ?? false,
          menuId: menuId,
          restaurantId: restaurantId,
        };

        let response: AxiosResponse<{ item: MenuItem }>;
        const isEditMode = currentItemId !== null;

        if (isEditMode) {
          response = await api.put(`/items/${currentItemId}`, apiData);
          setSuccessMessage("Menu item updated successfully.");
        } else {
          response = await api.post("/items", apiData);
          setSuccessMessage("Menu item added successfully.");
        }
        fetchData(); // Re-fetch data using the hook's function
        closeModal();
      } catch (err: any) {
        // Handle submit-specific error differently if needed
        console.error("Error submitting item:", err);
        // Maybe set a specific submitError state?
        // For now, rely on the main error display if it catches API errors
        // Or display a generic submit error message
        setSuccessMessage(null); // Ensure no success message is shown on error
        // Consider adding a submitError state: setSubmitError(err.response?.data?.message || "Failed to save item.")
      } finally {
        setIsSubmittingItem(false);
      }
    },
    [menuId, restaurantId, fetchData, closeModal]
  );

  // --- Delete Confirmation ---
  const handleDeleteMenuItemConfirm = useCallback(async () => {
    if (!currentItem || !currentItem._id) return;

    setIsSubmittingItem(true);
    // setError(null); // Error state from hook is for fetching, maybe avoid setting it here?
    // Let's introduce a temporary page-level error for this action if needed
    // Or perhaps pass an onError callback to the DeleteModal
    // For now, we will update the main error state from the hook, assuming it's okay.
    // const { setError } = useMenuData(menuId); // This wouldn't work, hook is called at top level.
    // We need to decide where delete errors are displayed. Let's use the main 'error' for now.
    // To do this properly, the hook might need an `setError` function returned.
    // **Alternative for now: Just log formatted error, rely on console.**
    setSuccessMessage(null);

    try {
      await api.delete(`/items/${currentItem._id}`);
      setSuccessMessage("Menu item deleted successfully.");
      fetchData(); // Re-fetch data using the hook's function
      closeModal();
    } catch (err: any) {
      // Log formatted error, but don't set state directly here without clear display target
      console.error(formatApiError(err, "deleting menu item"));
      setSuccessMessage(null);
      // Maybe add a specific deleteError state?
      // setDeleteError(formatApiError(err, "deleting menu item"));
    } finally {
      setIsSubmittingItem(false);
    }
  }, [currentItem, fetchData, closeModal]);

  // --- Menu Details Edit Handlers ---
  const handleSaveMenuDetails = useCallback(
    async (name: string, description: string) => {
      // Modified to accept name/desc from modal
      if (!menuId) return;
      if (!name.trim()) {
        setMenuDetailsError("Menu name cannot be empty.");
        // Potentially return error or throw to be caught by modal
        return;
      }

      setIsSavingMenuDetails(true);
      setMenuDetailsError(null);
      setSuccessMessage(null);

      try {
        await api.put(`/menus/${menuId}`, {
          name: name.trim(),
          description: description.trim(),
        });
        setSuccessMessage("Menu details updated successfully.");
        // setIsEditingMenuDetails(false); // No longer needed
        fetchData(); // Refresh all data including menu details
        closeMenuDetailsModal(); // Close modal on success
      } catch (err: any) {
        // Use the helper for the specific modal error state
        setMenuDetailsError(formatApiError(err, "saving menu details"));
      } finally {
        setIsSavingMenuDetails(false);
      }
    },
    [menuId, fetchData, closeMenuDetailsModal]
  );

  // --- Data Grouping for Display ---
  // Memoize grouped items to avoid recalculation on every render
  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) {
      return {};
    }

    // Group by itemCategory (e.g., Appetizer, Main Course, Dessert, Soft Drink)
    return items.reduce((acc, item) => {
      const categoryKey = item.category || "Uncategorized"; // Default for items without a category
      if (!acc[categoryKey]) {
        acc[categoryKey] = [];
      }
      acc[categoryKey].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
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
    // setError(null); // Error is handled by the hook, let's manage specific delete error if needed

    try {
      // Replace the placeholder with an actual API call
      // The backend would handle finding items in `categoryToDelete` for this `menuId`
      // and reassigning them to "Non Assigned".
      await api.delete(
        `/menus/${menuId}/categories/${encodeURIComponent(categoryToDelete)}`
      );

      setSuccessMessage(
        `Category "${categoryToDelete}" deleted successfully. Items reassigned.`
      );
      fetchData(); // Refresh data from the server
      closeDeleteCategoryModal();
    } catch (err: any) {
      console.error(
        formatApiError(err, `deleting category ${categoryToDelete}`)
      );
      // If you have a dedicated error state for this modal/action, set it here.
      // For now, relying on console and potentially a general error message if fetchData fails.
      // setError(formatApiError(err, `deleting category ${categoryToDelete}`));
      alert(
        `Failed to delete category "${categoryToDelete}". ${formatApiError(
          err,
          "deleting category"
        )}`
      );
      closeDeleteCategoryModal(); // Still close modal on error
    } finally {
      setIsDeletingCategory(false);
    }
  }, [categoryToDelete, menuId, fetchData, closeDeleteCategoryModal]);

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

  // Render categorized items
  const renderCategorizedItems = () => {
    if (!items || items.length === 0) {
      return (
        <Card className="bg-white shadow-lg rounded-xl p-6 text-center">
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
            No items in this menu yet.
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a new item.
          </p>
          <Button variant="primary" onClick={openAddModal} className="mt-6">
            Add Menu Item
          </Button>
        </Card>
      );
    }

    const categorized = items.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    // Ensure uniqueCategories are up-to-date for rendering order
    const displayCategoriesOrder =
      uniqueCategories.length > 0
        ? uniqueCategories
        : Object.keys(categorized).sort();
    if (displayCategoriesOrder.length === 0 && categorized["Uncategorized"]) {
      displayCategoriesOrder.push("Uncategorized"); // Ensure "Uncategorized" is shown if it's the only one
    }

    return displayCategoriesOrder.map((category) => (
      <Card
        key={category}
        className="bg-white shadow-lg rounded-xl mb-6 overflow-hidden" // Added overflow-hidden for clean collapse
      >
        <div
          className="flex justify-between items-center p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
          onClick={() => toggleCategory(category)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleCategory(category);
          }}
          aria-expanded={!!expandedCategories[category]}
          aria-controls={`category-items-${category}`}
        >
          <h3 className="text-xl font-semibold text-gray-700 flex items-center">
            {toTitleCase(category)}
            {expandedCategories[category] ? (
              <ChevronUpIcon className="h-5 w-5 ml-2 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 ml-2 text-gray-500" />
            )}
          </h3>
          {category !== "Uncategorized" && (
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation(); // Prevent toggleCategory when clicking delete
                openDeleteCategoryModal(category);
              }}
              className="text-xs px-2 py-1 z-10 relative" // Ensure button is clickable over the div
              aria-label={`Delete ${category} category`}
            >
              <TrashIcon className="h-4 w-4 mr-1 inline-block" /> Delete
            </Button>
          )}
        </div>
        {expandedCategories[category] && (
          <div
            id={`category-items-${category}`}
            className="p-4 sm:p-6 border-t border-gray-200"
          >
            <MenuItemList
              items={categorized[category]}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          </div>
        )}
      </Card>
    ));
  };

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
          availableCategories={uniqueCategories}
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
