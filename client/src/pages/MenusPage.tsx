import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import { Menu } from "../types/menuItemTypes";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

// --- Interfaces ---
// Define FormData specific to this page's modal
interface MenuFormData {
  name: string;
  description: string;
}

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

// --- Main Component ---
const MenusPage: React.FC = () => {
  const { user } = useAuth();

  // State variables
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state
  const initialFormData: MenuFormData = { name: "", description: "" };
  const [formData, setFormData] = useState<MenuFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Fetch menus
  const fetchMenus = useCallback(async () => {
    if (!restaurantId) {
      setError("User restaurant information not found.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ menus: Menu[] }>("/menus", {
        params: { restaurantId },
      });
      setMenus(response.data.menus || []);
    } catch (err: any) {
      setError(formatApiError(err, "fetching menus"));
      setMenus([]);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      fetchMenus();
    }
  }, [fetchMenus, restaurantId]);

  // --- Modal Handlers ---
  const openAddModal = () => {
    setCurrentMenu(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setCurrentMenu(menu);
    setFormData({
      name: menu.name,
      description: menu.description || "",
    });
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openDeleteModal = (menu: Menu) => {
    setCurrentMenu(menu);
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsAddEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentMenu(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsSubmitting(false);
  };

  // --- Form Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: MenuFormData) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation
    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();

    // Check name validity
    if (!trimmedName) {
      setFormError("Menu name is required.");
      return;
    }

    if (trimmedName.length < 2) {
      setFormError("Menu name must be at least 2 characters.");
      return;
    }

    if (trimmedName.length > 50) {
      setFormError("Menu name cannot exceed 50 characters.");
      return;
    }

    if (!restaurantId) {
      setFormError("Restaurant context is missing.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setError(null);

    const payload = {
      name: trimmedName,
      description: trimmedDescription || undefined,
      restaurantId: restaurantId!,
    };

    try {
      let response: AxiosResponse<{ menu: Menu }>;

      if (currentMenu) {
        // Edit existing menu
        response = await api.put<{ menu: Menu }>(
          `/menus/${currentMenu._id}`,
          payload
        );
        setMenus((prev) =>
          prev.map((menu) =>
            menu._id === currentMenu._id ? response.data.menu : menu
          )
        );
        setSuccessMessage("Menu updated successfully.");
      } else {
        // Add new menu
        response = await api.post<{ menu: Menu }>("/menus", payload);
        setMenus((prev) => [...prev, response.data.menu]);
        setSuccessMessage("Menu added successfully.");
      }
      closeModal();
    } catch (err: any) {
      // Enhanced error handling
      if (err.response?.data?.message) {
        setFormError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        // Handle validation errors from the server
        const errorMessages = Object.values(err.response.data.errors).join(
          ", "
        );
        setFormError(errorMessages || "Validation failed.");
      } else if (err.message) {
        setFormError(err.message);
      } else {
        setFormError(
          currentMenu ? "Failed to update menu." : "Failed to add menu."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteConfirm = async () => {
    if (!currentMenu) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.delete(`/menus/${currentMenu._id}`);
      setMenus((prev) => prev.filter((menu) => menu._id !== currentMenu._id));
      setSuccessMessage("Menu deleted successfully.");
      closeModal();
    } catch (err: any) {
      // Use the helper for the main page error display
      setError(formatApiError(err, "deleting menu"));
      setIsSubmitting(false); // Stop submitting indicator on error
    }
    // No finally needed here as isSubmitting should remain true only on success path before modal close
  };

  // Display menus in a responsive grid
  const renderMenusGrid = () => {
    if (!isLoading && menus.length === 0 && !error) {
      return (
        <p className="text-center text-gray-500 py-8">
          No menus created yet. Click "Add New Menu" to get started.
        </p>
      );
    }
    if (menus.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {menus.map((menu) => (
            <Card
              key={menu._id}
              className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in-out"
            >
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-blue-700 truncate mb-1">
                  {menu.name}
                </h3>
                <p className="text-sm text-gray-600 min-h-[2.5em] line-clamp-2">
                  {menu.description || (
                    <span className="italic text-gray-400">No description</span>
                  )}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  to={`/menu/${menu._id}/items`}
                  className="block w-full mb-2"
                >
                  <Button variant="primary" className="w-full">
                    View Menu
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => openDeleteModal(menu)}
                  className="w-full text-sm"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      );
    }
    return null;
  };

  // --- Render Logic ---
  if (isLoading && menus.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex justify-center items-center">
          <LoadingSpinner message="Loading menus..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              Menus
            </h1>
            <Button variant="primary" onClick={openAddModal}>
              Add New Menu
            </Button>
          </div>

          {/* Notifications */}
          {error && <ErrorMessage message={error} />}
          {successMessage && (
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          )}

          {/* Content Area */}
          {isLoading && menus.length > 0 ? (
            <div className="text-center py-10">
              <LoadingSpinner message="Refreshing menus list..." />
            </div>
          ) : (
            renderMenusGrid()
          )}
        </div>
      </main>

      {/* --- Modals --- */}

      {/* Add/Edit Menu Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 my-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {currentMenu ? "Edit Menu" : "Add New Menu"}
            </h2>
            <form onSubmit={handleFormSubmit}>
              {formError && <ErrorMessage message={formError} />}
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Menu Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse px-4 py-3 bg-gray-50 sm:px-6">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="ml-3 inline-flex justify-center"
                >
                  {isSubmitting
                    ? currentMenu
                      ? "Saving..."
                      : "Adding..."
                    : currentMenu
                    ? "Save Changes"
                    : "Add Menu"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentMenu && (
        <div
          className="fixed z-10 inset-0 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            ></div>

            {/* Modal panel */}
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    {/* Heroicon name: outline/exclamation */}
                    <svg
                      className="h-6 w-6 text-red-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3
                      className="text-lg leading-6 font-medium text-gray-900"
                      id="modal-title"
                    >
                      Delete Menu
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the menu "
                        <strong>{currentMenu.name}</strong>"? This action cannot
                        be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={handleDeleteConfirm}
                  className="inline-flex justify-center w-full sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  className="mt-3 inline-flex justify-center w-full sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenusPage;
