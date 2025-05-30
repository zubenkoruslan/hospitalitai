import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createMenu,
  deleteMenu,
  updateMenuActivationStatus,
} from "../services/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import { IMenuClient } from "../types/menuTypes";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  ClipboardDocumentListIcon,
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

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardLayout>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
          {/* Modern Page Header */}
          <div className="bg-white shadow-sm rounded-2xl p-8 mb-8 border border-slate-200">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Restaurant Menus
                </h1>
                <p className="text-slate-600 text-lg">
                  Manage your restaurant's menus and menu items
                </p>
              </div>
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Button
                  variant="primary"
                  onClick={openAddModal}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Menu
                </Button>
                <Button
                  variant="secondary"
                  onClick={openPdfUploadModal}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                  Upload PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          {pageError && (
            <div className="mb-6">
              <ErrorMessage
                message={pageError}
                onDismiss={() => setPageError(null)}
              />
            </div>
          )}
          {successMessage && (
            <div className="mb-6">
              <SuccessNotification
                message={successMessage}
                onDismiss={() => setSuccessMessage(null)}
              />
            </div>
          )}
          {menusError && (
            <div className="mb-6">
              <ErrorMessage message={menusError} />
            </div>
          )}

          {/* Main Content Area */}
          <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
            {isLoading && menus.length === 0 && (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner message="Loading menus..." />
              </div>
            )}

            {!isLoading && menus.length === 0 && !menusError && (
              <div className="text-center py-20 px-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-6">
                  <DocumentTextIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No menus found
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  Get started by creating your first menu or uploading a PDF
                  menu to automatically extract items.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                  <Button
                    variant="primary"
                    onClick={openAddModal}
                    className="w-full sm:w-auto"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" /> Create First Menu
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
            )}

            {menus.length > 0 && (
              <div className="p-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {menus.map((menu) => (
                    <div
                      key={menu._id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-200 group"
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex-1">
                          <Link
                            to={`/menu/${menu._id}`}
                            className="block hover:no-underline"
                          >
                            <h3 className="text-lg font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors mb-2">
                              {menu.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">
                            {menu.description || (
                              <span className="italic text-slate-400">
                                No description provided
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                          <Link to={`/menu/${menu._id}`}>
                            <Button
                              variant="secondary"
                              aria-label={`View items in ${menu.name}`}
                              className="text-sm px-4 py-2"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              View Items
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            onClick={() => openDeleteModal(menu)}
                            aria-label={`Delete ${menu.name}`}
                            className="text-sm p-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </DashboardLayout>

      {/* Modern Add Menu Modal */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Create New Menu
              </h2>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Menu Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter menu name"
                    required
                    minLength={2}
                    maxLength={50}
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Describe this menu (optional)"
                    maxLength={200}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.description.length}/200 characters
                  </p>
                </div>
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <ErrorMessage message={formError} />
                  </div>
                )}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? "Creating..." : "Create Menu"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modern Delete Confirmation Modal */}
      {isDeleteModalOpen && currentMenu && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Delete Menu
                </h2>
                <p className="text-slate-600 mb-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900">
                    "{currentMenu.name}"
                  </span>
                  ?
                </p>
                <p className="text-sm text-red-600">
                  This will permanently delete the menu and all its items. This
                  action cannot be undone.
                </p>
              </div>
              {pageError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <ErrorMessage message={pageError} />
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "Deleting..." : "Delete Menu"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Upload Modal */}
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
