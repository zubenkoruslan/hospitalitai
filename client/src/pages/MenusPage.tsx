import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";

// --- Interfaces ---
interface Menu {
  _id: string;
  name: string;
  description?: string;
  restaurantId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MenuData {
  name: string;
  description: string;
}

// --- Helper Components ---

// Simple Loading Spinner
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

// Simple Error Message
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

// Simple Success Notification (Disappears after a delay)
const SuccessNotification: React.FC<{
  message: string;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative my-4"
      role="alert"
    >
      <span className="block sm:inline">{message}</span>
      <button
        onClick={onDismiss}
        className="absolute top-0 bottom-0 right-0 px-4 py-3"
        aria-label="Dismiss notification"
      >
        <span className="text-xl font-bold">&times;</span>
      </button>
    </div>
  );
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
  const initialFormData: MenuData = { name: "", description: "" };
  const [formData, setFormData] = useState<MenuData>(initialFormData);
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
      const response = await api.get<{ menus: Menu[] }>("/menus");
      setMenus(response.data.menus || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch menus.");
      setMenus([]);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      setError(err.response?.data?.message || "Failed to delete menu.");
      setIsSubmitting(false);
    } finally {
      // No need to set isSubmitting to false here if modal closes on success
    }
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">
              Menu Management
            </h1>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out text-sm font-medium"
            >
              Add New Menu
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

          {/* Content Area */}
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {menus.length > 0 ? (
                <ul
                  className="divide-y divide-gray-200"
                  aria-labelledby="menu-list-title"
                >
                  {menus.map((menu) => (
                    <li
                      key={menu._id}
                      className="px-4 py-4 sm:px-6 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Link to view items within this menu */}
                          <Link
                            to={`/menu/${menu._id}/items`} // Navigate to items page
                            className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
                            aria-label={`View items for ${menu.name}`}
                          >
                            {menu.name}
                          </Link>
                          {menu.description && (
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {menu.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Created:{" "}
                            {menu.createdAt
                              ? new Date(menu.createdAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex space-x-2">
                          <button
                            onClick={() => openEditModal(menu)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            aria-label={`Edit menu ${menu.name}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(menu)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            aria-label={`Delete menu ${menu.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No menus found. Add one to get started!
                </p>
              )}
            </div>
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
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : currentMenu
                    ? "Save Changes"
                    : "Add Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentMenu && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 my-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Confirm Deletion
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete the menu "
              <strong>{currentMenu.name}</strong>"? This action cannot be
              undone.
              <br />
              <span className="text-red-600 font-medium">
                Note: Deleting a menu will NOT delete its associated items.
              </span>
              {/* TODO: Decide if items should be deleted or unlinked when menu is deleted */}
            </p>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete Menu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenusPage;
