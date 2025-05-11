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
  const { menuDetails, items, loading, error, fetchData } = useMenuData(menuId);

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
  if (!menuId && !loading) {
    return <ErrorMessage message="Menu ID is missing from the URL." />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner message="Loading menu items..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header: Menu Title, Description, and Actions */}
          {menuDetails && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              {" "}
              {/* Outer container for spacing and border */}
              {/* Back to Menus Link - Positioned on top */}
              <div className="mb-4">
                <Link
                  to={`/menu`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  &larr; Back to Menus
                </Link>
              </div>
              {/* Container for Title/Description and Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                {/* Left: Title & Description */}
                <div className="flex-grow mb-4 sm:mb-0 sm:mr-4">
                  <h1 className="text-3xl font-bold text-gray-800 break-words">
                    {menuDetails.name}
                  </h1>
                  {menuDetails.description && (
                    <p className="text-gray-600 mt-2 text-sm">
                      {menuDetails.description}
                    </p>
                  )}
                </div>

                {/* Right: Action Buttons (Edit, Add New) */}
                <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button
                    onClick={openMenuDetailsModal}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    Edit Details
                  </Button>
                  <Button
                    variant="primary"
                    onClick={openAddModal}
                    className="w-full sm:w-auto"
                  >
                    Add New Item
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {error && (!menuDetails || items.length === 0) && (
            <ErrorMessage message={error} />
          )}
          {successMessage && (
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          )}

          {/* Loading State */}
          {loading && <LoadingSpinner />}

          {/* Item List / Grid Area */}
          {!loading && !error && (
            <>
              {Object.keys(groupedItems).length > 0 ? (
                Object.entries(groupedItems).map(([category, itemList]) => (
                  <div key={category} className="mb-6">
                    <div // Changed from button to div to contain multiple interactive elements
                      className="w-full text-left px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-t-md focus:outline-none flex justify-between items-center"
                    >
                      <button // Button for expanding/collapsing
                        onClick={() => toggleCategory(category)}
                        className="flex-grow flex items-center focus:outline-none"
                      >
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                          {toTitleCase(category)}
                          <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                            {itemList.length}
                          </span>
                        </h2>
                      </button>

                      <div className="flex items-center">
                        {" "}
                        {/* Container for action icons */}
                        {category.toLowerCase() !== "uncategorized" &&
                          category.toLowerCase() !== "non assigned" && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card from toggling
                                openDeleteCategoryModal(category);
                              }}
                              aria-label={`Delete category ${category}`}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 mr-2" // Adjusted for icon button appearance
                              type="button" // Explicitly type button
                            >
                              <TrashIcon className="h-5 w-5" />
                            </Button>
                          )}
                        <button // Chevron button remains for expand/collapse visual cue, though outer click also works
                          onClick={() => toggleCategory(category)}
                          className="focus:outline-none"
                          aria-label={
                            expandedCategories[category]
                              ? "Collapse category"
                              : "Expand category"
                          }
                        >
                          {expandedCategories[category] ? (
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 15l7-7 7 7"
                              ></path>
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              ></path>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {expandedCategories[category] && (
                      <div className="border border-t-0 border-gray-200 rounded-b-md p-4">
                        <MenuItemList
                          items={itemList}
                          onEdit={openEditModal}
                          onDelete={openDeleteModal}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No menu items found. Click "Add New Item" to get started.
                </p>
              )}
            </>
          )}
        </div>

        {/* --- Modals --- */}

        {/* Add/Edit Modal - Use the new component */}
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
      </main>
    </div>
  );
};

export default MenuItemsPage;
