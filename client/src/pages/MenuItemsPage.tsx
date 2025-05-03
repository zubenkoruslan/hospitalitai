import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
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
import QuizResultsModal from "../components/quiz/QuizResultsModal";
// Import item components
import AddEditMenuItemModal from "../components/items/AddEditMenuItemModal"; // Import the new modal
import MenuItemList from "../components/items/MenuItemList"; // Import the item list
import DeleteMenuItemModal from "../components/items/DeleteMenuItemModal"; // Import the delete modal
// Import the custom hook
import { useMenuData } from "../hooks/useMenuData";

// --- Main Component ---
const MenuItemsPage: React.FC = () => {
  const { menuId } = useParams<{ menuId: string }>();
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Remove the useEffect for fetching data - handled by the hook
  /*
  const fetchData = useCallback(async () => {
    if (!menuId || !restaurantId) {
      setError("Menu ID or restaurant information is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const menuDetailsResponse = await api.get<{ menu: Menu }>(
        `/menus/${menuId}`
      );
      setMenuDetails(menuDetailsResponse.data.menu);
      const itemsResponse = await api.get<{ items: MenuItem[] }>("/items", {
        params: { menuId },
      });
      setItems(itemsResponse.data.items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch menu data.");
      setMenuDetails(null);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [menuId, restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  */

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
    setCurrentItem(null);
  }, []);

  // --- Form Submission (Callback for Modal) ---
  const handleFormSubmit = useCallback(
    async (
      submittedFormData: MenuItemFormData,
      currentItemId: string | null
    ) => {
      if (!menuId || !restaurantId) return;

      setIsSubmitting(true);
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
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
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
        setIsSubmitting(false);
      }
    },
    [menuId, restaurantId, fetchData, closeModal]
  );

  // --- Delete Confirmation ---
  const handleDeleteConfirm = useCallback(async () => {
    if (!currentItem || !currentItem._id) return;

    setIsSubmitting(true);
    // setError(null); // Use hook error for fetch errors
    setSuccessMessage(null);

    try {
      await api.delete(`/items/${currentItem._id}`);
      setSuccessMessage("Menu item deleted successfully.");
      fetchData(); // Re-fetch data using the hook's function
      closeModal();
    } catch (err: any) {
      console.error("Error deleting item:", err);
      // setError(err.response?.data?.message || "Failed to delete menu item.");
      setSuccessMessage(null);
      // setSubmitError(err.response?.data?.message || "Failed to delete item.")
    } finally {
      setIsSubmitting(false);
    }
  }, [currentItem, fetchData, closeModal]);

  // --- Data Grouping for Display ---
  // Memoize grouped items to avoid recalculation on every render
  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) {
      return {};
    }

    // Group by itemType (food/beverage)
    return items.reduce((acc, item) => {
      const typeKey = item.itemType || "uncategorized"; // Group items lacking type under 'uncategorized'
      if (!acc[typeKey]) {
        acc[typeKey] = [];
      }
      acc[typeKey].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [items]);

  // --- Render Logic ---
  if (!menuId && !loading) {
    return <ErrorMessage message="Menu ID is missing from the URL." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Menu Items {menuDetails ? `for "${menuDetails.name}"` : ""}
              </h1>
              <Link
                to={`/menu`}
                className="text-sm text-blue-600 hover:underline mt-1"
              >
                &larr; Back to Menus
              </Link>
            </div>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out text-sm font-medium"
            >
              Add New Item
            </button>
          </div>

          {/* Notifications */}
          {error && <ErrorMessage message={error} />}
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
            <MenuItemList
              items={items}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          )}
          {!loading && error && items.length === 0 && (
            <p className="text-center text-gray-500 py-6">
              Could not load items.
            </p>
          )}
        </div>

        {/* --- Modals --- */}

        {/* Add/Edit Modal - Use the new component */}
        <AddEditMenuItemModal
          isOpen={isAddEditModalOpen}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
          currentItem={currentItem}
          menuId={menuId || ""}
          restaurantId={restaurantId || ""}
          isSubmitting={isSubmitting}
        />

        {/* Delete Confirmation Modal (Use the new component) */}
        <DeleteMenuItemModal
          isOpen={isDeleteModalOpen}
          onClose={closeModal}
          onConfirm={handleDeleteConfirm}
          itemName={currentItem?.name || ""}
          isSubmitting={isSubmitting}
        />
      </main>
    </div>
  );
};

export default MenuItemsPage;
