import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import { Menu } from "../types/menuItemTypes";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import PdfMenuUpload from "../components/menu/PdfMenuUpload";
import { useMenus } from "../hooks/useMenus";

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

  // Use the useMenus hook for menu data, loading, and error states
  const {
    menus,
    loading: isLoading,
    error: menusError,
    fetchMenus: refetchMenus,
  } = useMenus();

  // Local state for page-specific success messages, modals, form data, etc.
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] =
    useState<boolean>(false);

  // Form state
  const initialFormData: MenuFormData = { name: "", description: "" };
  const [formData, setFormData] = useState<MenuFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

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

  const openPdfUploadModal = () => {
    setIsPdfUploadModalOpen(true);
  };

  const closePdfUploadModal = () => {
    setIsPdfUploadModalOpen(false);
  };

  const handlePdfUploadSuccess = (newMenuData: any) => {
    setSuccessMessage(
      `Menu "${newMenuData.name}" imported successfully from PDF!`
    );
    refetchMenus();
    closePdfUploadModal();
  };

  const handlePdfUploadError = (errorMessage: string) => {
    setPageError(`PDF Upload Failed: ${errorMessage}`);
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
    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();

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
    setPageError(null);

    const payload = {
      name: trimmedName,
      description: trimmedDescription || undefined,
      restaurantId: restaurantId!,
    };

    try {
      if (currentMenu) {
        await api.put<{ menu: Menu }>(`/menus/${currentMenu._id}`, payload);
      } else {
        await api.post<{ menu: Menu }>("/menus", payload);
      }
      refetchMenus();
      setSuccessMessage(
        currentMenu ? "Menu updated successfully." : "Menu added successfully."
      );
      closeModal();
    } catch (err: any) {
      const apiError = formatApiError(
        err,
        currentMenu ? "updating menu" : "adding menu"
      );
      setFormError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteConfirm = async () => {
    if (!currentMenu) return;
    setIsSubmitting(true);
    setPageError(null);

    try {
      await api.delete(`/menus/${currentMenu._id}`);
      refetchMenus();
      setSuccessMessage("Menu deleted successfully.");
      closeModal();
    } catch (err: any) {
      const apiError = formatApiError(err, "deleting menu");
      setPageError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  const renderMenusGrid = () => {
    if (isLoading) {
      return <LoadingSpinner message="Loading menus..." />;
    }
    if (menusError) {
      return <ErrorMessage message={menusError} />;
    }
    if (!menus || menus.length === 0) {
      return (
        <div className="text-center py-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m7.5-5.25L12 16.5m0 0L7.5 21M12 16.5V3m0 13.5L16.5 21m0 0L21 16.5m-4.5 4.5V7.5"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-800">
            No menus found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating a new menu or uploading a PDF.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              variant="primary"
              onClick={openAddModal}
              className="w-full sm:w-auto"
            >
              <PlusIcon className="h-5 w-5 mr-2" /> Create New Menu
            </Button>
            <Button
              variant="secondary"
              onClick={openPdfUploadModal}
              className="w-full sm:w-auto"
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" /> Upload PDF Menu
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul role="list" className="divide-y divide-gray-200">
          {menus.map((menu) => (
            <li key={menu._id}>
              <Link
                to={`/menu/${menu._id}`}
                className="block hover:bg-gray-50 group"
              >
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg font-medium text-blue-700 truncate group-hover:text-blue-800 group-hover:underline">
                      {menu.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {menu.description || (
                        <span className="italic text-gray-400">
                          No description available
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex items-center space-x-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                    <Button
                      variant="white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditModal(menu);
                      }}
                      aria-label={`Edit menu ${menu.name}`}
                      className="p-1.5 rounded-full !shadow-none hover:bg-gray-200 focus:ring-2 focus:ring-blue-500"
                      title={`Edit ${menu.name}`}
                    >
                      <PencilIcon className="h-5 w-5 text-gray-500" />
                    </Button>
                    <Button
                      variant="white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDeleteModal(menu);
                      }}
                      aria-label={`Delete menu ${menu.name}`}
                      className="p-1.5 rounded-full !shadow-none hover:bg-red-100 focus:ring-2 focus:ring-red-500"
                      title={`Delete ${menu.name}`}
                    >
                      <TrashIcon className="h-5 w-5 text-gray-500 hover:text-red-600" />
                    </Button>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3 sm:mb-0">
              My Menus
            </h1>
            <div className="flex space-x-3">
              <Button variant="secondary" onClick={openPdfUploadModal}>
                <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                Upload PDF
              </Button>
              <Button variant="primary" onClick={openAddModal}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New Menu
              </Button>
            </div>
          </div>

          {/* Notifications */}
          {pageError && (
            <ErrorMessage
              message={pageError}
              onDismiss={() => setPageError(null)}
            />
          )}
          {successMessage && (
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          )}

          {renderMenusGrid()}
        </div>

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
                    className="ml-3 inline-flex justify-center w-full sm:w-auto"
                  >
                    {isSubmitting
                      ? currentMenu
                        ? "Saving..."
                        : "Adding..."
                      : currentMenu
                      ? "Save Changes"
                      : "Add Menu"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    className="mt-3 inline-flex justify-center w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Menu Confirmation Modal */}
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
                          <strong>{currentMenu.name}</strong>"? This action
                          cannot be undone.
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
                    className="inline-flex justify-center w-full sm:ml-3 sm:w-auto"
                  >
                    {isSubmitting ? "Deleting..." : "Delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    className="mt-3 inline-flex justify-center w-full sm:mt-0 sm:ml-3 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Upload Modal */}
        {isPdfUploadModalOpen && restaurantId && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-auto my-8 relative">
              <button
                onClick={closePdfUploadModal}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <PdfMenuUpload
                restaurantId={restaurantId}
                onUploadSuccess={handlePdfUploadSuccess}
                onUploadError={handlePdfUploadError}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MenusPage;
