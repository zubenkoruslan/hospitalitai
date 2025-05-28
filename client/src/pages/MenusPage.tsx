import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createMenu,
  deleteMenu,
  updateMenuActivationStatus,
} from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import { IMenuClient } from "../types/menuTypes";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import PdfMenuUpload from "../components/menu/PdfMenuUpload";
import { useMenus } from "../hooks/useMenus";
import Card from "../components/common/Card";

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
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log("MenusPage User:", user);
  console.log("Auth Token:", token);

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
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [currentMenu, setCurrentMenu] = useState<IMenuClient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] =
    useState<boolean>(false);
  const [isTogglingMenuStatus, setIsTogglingMenuStatus] = useState<
    string | null
  >(null);

  // Form state
  const initialFormData: MenuFormData = { name: "", description: "" };
  const [formData, setFormData] = useState<MenuFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Effect to refetch menus if navigated with newMenuImported state
  useEffect(() => {
    if (location.state?.newMenuImported) {
      refetchMenus();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, refetchMenus, navigate]);

  // --- Modal Handlers ---
  const openAddModal = () => {
    setCurrentMenu(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsAddMenuModalOpen(true);
  };

  const openDeleteModal = (menu: IMenuClient) => {
    setCurrentMenu(menu);
    setIsDeleteModalOpen(true);
  };

  const openPdfUploadModal = () => {
    setIsPdfUploadModalOpen(true);
  };

  const closeModal = () => {
    setIsAddMenuModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentMenu(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsSubmitting(false);
    setIsPdfUploadModalOpen(false);
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
    };

    try {
      await createMenu(payload);
      refetchMenus();
      setSuccessMessage("Menu added successfully.");
      closeModal();
    } catch (err: any) {
      const apiError = formatApiError(err, "adding menu");
      setFormError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteConfirm = async () => {
    if (!currentMenu) return;

    console.log("Attempting to delete menu with ID:", currentMenu._id);

    setIsSubmitting(true);
    setPageError(null);

    try {
      await deleteMenu(currentMenu._id);
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

  const handleToggleMenuStatus = async (
    menuId: string,
    currentIsActive: boolean
  ) => {
    setIsTogglingMenuStatus(menuId);
    setPageError(null);
    setSuccessMessage(null);
    try {
      await updateMenuActivationStatus(menuId, !currentIsActive);
      refetchMenus();
      setSuccessMessage(`Menu status updated successfully.`);
    } catch (err: any) {
      const apiError = formatApiError(err, "updating menu status");
      setPageError(apiError);
    } finally {
      setIsTogglingMenuStatus(null);
    }
  };

  const handleFileSelectedForUpload = (file: File) => {
    setIsPdfUploadModalOpen(false);
    navigate("/menu-upload-path", { state: { fileToUpload: file } });
  };

  // --- Render Logic ---
  const _renderMenusGrid = () => {
    if (isLoading) {
      return <LoadingSpinner message="Loading menus..." />;
    }
    const displayError = menusError || pageError;
    if (displayError) {
      return <ErrorMessage message={displayError} />;
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {menus.map((menu) => (
          <Card
            key={menu._id}
            className="bg-white shadow-lg rounded-xl p-4 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300"
          >
            <div>
              <Link
                to={`/menu/${menu._id}`}
                className="block hover:no-underline"
              >
                <h3 className="text-lg font-semibold text-gray-800 truncate hover:text-blue-600 transition-colors">
                  {menu.name}
                </h3>
              </Link>
              <p className="text-sm text-gray-600 mt-1 h-10 overflow-hidden text-ellipsis">
                {menu.description || (
                  <span className="italic text-gray-400">No description.</span>
                )}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
              <Link to={`/menu/${menu._id}`}>
                <Button
                  variant="secondary"
                  aria-label={`View items in ${menu.name}`}
                  className="text-xs p-1.5"
                >
                  View Items
                </Button>
              </Link>
              <Button
                variant="destructive"
                onClick={() => openDeleteModal(menu)}
                aria-label={`Delete ${menu.name}`}
                className="text-xs p-1.5"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        {/* Updated Page Title Header */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Restaurant Menus
            </h1>
            {/* Action buttons can remain here or be moved to a separate bar below */}
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Button
                variant="primary"
                onClick={openAddModal}
                disabled={isSubmitting}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New Menu
              </Button>
              <Button
                variant="secondary"
                onClick={openPdfUploadModal}
                disabled={isSubmitting}
              >
                <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                Upload PDF Menu
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {pageError && (
          <div className="mb-4">
            <ErrorMessage
              message={pageError}
              onDismiss={() => setPageError(null)}
            />
          </div>
        )}
        {successMessage && (
          <div className="mb-4">
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </div>
        )}
        {menusError && (
          <div className="mb-4">
            <ErrorMessage message={menusError} />
          </div>
        )}

        {/* Updated Card for Menus Grid */}
        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
          {isLoading && menus.length === 0 && (
            <div className="flex justify-center items-center py-10">
              <LoadingSpinner message="Loading menus..." />
            </div>
          )}
          {!isLoading && menus.length === 0 && !menusError && (
            <div className="text-center py-10">
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
                  d="M9.75 17L3 10.25V4.5h3.75L12 9l5.25-4.5H21v5.75L14.25 17h-4.5z"
                />
                <path
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 19L3 17V7.5M19 19l2-2V7.5"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No menus found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new menu or uploading a PDF.
              </p>
            </div>
          )}
          {menus.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {menus.map((menu) => (
                <Card
                  key={menu._id}
                  className="bg-white shadow-lg rounded-xl p-4 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300"
                >
                  <div>
                    <Link
                      to={`/menu/${menu._id}`}
                      className="block hover:no-underline"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 truncate hover:text-blue-600 transition-colors">
                        {menu.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600 mt-1 h-10 overflow-hidden text-ellipsis">
                      {menu.description || (
                        <span className="italic text-gray-400">
                          No description.
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                    <Link to={`/menu/${menu._id}`}>
                      <Button
                        variant="secondary"
                        aria-label={`View items in ${menu.name}`}
                        className="text-xs p-1.5"
                      >
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      onClick={() => openDeleteModal(menu)}
                      aria-label={`Delete ${menu.name}`}
                      className="text-xs p-1.5"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* Modals */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Menu</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Menu Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  maxLength={200}
                ></textarea>
              </div>
              {formError && <ErrorMessage message={formError} />}
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !formData.name.trim()}
                >
                  {isSubmitting ? <LoadingSpinner /> : "Add Menu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && currentMenu && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
            <p className="text-gray-600 mb-1">
              Are you sure you want to delete the menu &quot;
              <strong>{currentMenu.name}</strong>&quot;?
            </p>
            <p className="text-sm text-red-600 mb-4">
              This action will also delete all associated menu items. This
              cannot be undone.
            </p>
            {pageError && <ErrorMessage message={pageError} />}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner /> : "Delete Menu"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restored PdfMenuUpload Modal Usage with new onFileSelected prop */}
      {isPdfUploadModalOpen && (
        <PdfMenuUpload
          isOpen={isPdfUploadModalOpen}
          onClose={closeModal}
          onFileSelected={handleFileSelectedForUpload}
        />
      )}
    </div>
  );
};

export default MenusPage;
