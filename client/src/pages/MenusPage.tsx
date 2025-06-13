import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createMenu,
  deleteMenu,
  updateMenuActivationStatus,
} from "../services/api";
import Button from "../components/common/Button";
import Navbar from "../components/Navbar";
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
  DocumentIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ListBulletIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";

import TemplateDownloadSection from "../components/menu/TemplateDownloadSection";
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
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal state
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [currentMenu, setCurrentMenu] = useState<IMenuClient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [isTemplatesSectionExpanded, setIsTemplatesSectionExpanded] =
    useState<boolean>(false);
  const [isTogglingMenuStatus, setIsTogglingMenuStatus] = useState<
    string | null
  >(null);

  // Form state
  const initialFormData: MenuFormData = { name: "", description: "" };
  const [formData, setFormData] = useState<MenuFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Filtered menus based on search
  const filteredMenus = useMemo(() => {
    if (!searchTerm.trim()) return menus;

    const search = searchTerm.toLowerCase();
    return menus.filter(
      (menu) =>
        menu.name.toLowerCase().includes(search) ||
        menu.description?.toLowerCase().includes(search)
    );
  }, [menus, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalMenus: menus.length,
      totalFiltered: filteredMenus.length,
      hasSearchResults: searchTerm.trim() !== "",
    };
  }, [menus, filteredMenus, searchTerm]);

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

  const toggleTemplatesSection = () => {
    setIsTemplatesSectionExpanded(!isTemplatesSectionExpanded);
  };

  const openMenuUploadModal = () => {
    navigate("/upload");
  };

  const closeModal = () => {
    setIsAddMenuModalOpen(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white border border-slate-700 shadow-md mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                    <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Menu Management
                    </h1>
                    <p className="text-slate-300 text-sm">
                      {stats.totalMenus} menu{stats.totalMenus !== 1 ? "s" : ""}{" "}
                      • {user?.restaurantName || "My Restaurant"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={openMenuUploadModal}
                    className="inline-flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg border border-slate-600 shadow-sm transition-colors duration-200"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4 mr-1.5" />
                    Upload
                  </button>
                  <button
                    onClick={toggleTemplatesSection}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border shadow-sm transition-colors duration-200 ${
                      isTemplatesSectionExpanded
                        ? "bg-slate-600 hover:bg-slate-500 text-white border-slate-500"
                        : "bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                    }`}
                  >
                    <DocumentIcon className="h-4 w-4 mr-1.5" />
                    Templates
                  </button>
                  <Button
                    variant="primary"
                    onClick={openAddModal}
                    className="shadow-sm text-sm px-3 py-2"
                  >
                    <PlusIcon className="h-4 w-4 mr-1.5" />
                    Create
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
            <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
              {/* Search and Actions Bar */}
              {menus.length > 0 && (
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative max-w-sm flex-1">
                      <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search menus..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 text-sm px-3 py-2"
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Create</span>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={openMenuUploadModal}
                        className="flex items-center gap-1.5 text-sm px-3 py-2"
                      >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Upload</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && menus.length === 0 && (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner message="Loading menus..." />
                </div>
              )}

              {/* Empty State */}
              {!isLoading && menus.length === 0 && !menusError && (
                <div className="text-center py-12 px-6">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No menus yet
                  </h3>
                  <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">
                    Get started by creating your first menu or uploading a menu
                    file to automatically extract items
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={openAddModal}
                      className="text-sm px-3 py-2"
                    >
                      <PlusIcon className="h-4 w-4 mr-1.5" />
                      Create First Menu
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={openMenuUploadModal}
                      className="text-sm px-3 py-2"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4 mr-1.5" />
                      Upload Menu File
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={toggleTemplatesSection}
                      className="text-sm px-3 py-2"
                    >
                      <DocumentIcon className="h-4 w-4 mr-1.5" />
                      Templates
                    </Button>
                  </div>
                </div>
              )}

              {/* No Search Results */}
              {!isLoading &&
                menus.length > 0 &&
                filteredMenus.length === 0 &&
                searchTerm.trim() && (
                  <div className="text-center py-12 px-6">
                    <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No menus found
                    </h3>
                    <p className="text-gray-500 mb-4 text-sm">
                      Try adjusting your search criteria or create a new menu
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setSearchTerm("")}
                      className="text-sm px-3 py-2"
                    >
                      Clear Search
                    </Button>
                  </div>
                )}

              {/* Menu Grid */}
              {filteredMenus.length > 0 && (
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredMenus.map((menu) => (
                      <div
                        key={menu._id}
                        className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden group"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <Link
                                to={`/menu/${menu._id}`}
                                className="block hover:no-underline"
                              >
                                <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {menu.name}
                                </h3>
                              </Link>
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-2 mb-3 min-h-[2rem]">
                            {menu.description || (
                              <span className="italic text-gray-400">
                                No description provided
                              </span>
                            )}
                          </p>

                          <div className="flex items-center text-xs text-gray-500 mb-3">
                            <span>
                              Created{" "}
                              {new Date(menu.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <Link to={`/menu/${menu._id}`}>
                              <Button
                                variant="secondary"
                                className="text-sm px-3 py-1.5"
                              >
                                <EyeIcon className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="destructive"
                              onClick={() => openDeleteModal(menu)}
                              className="text-sm p-1.5"
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

            {/* Template Download Section - Below Menus */}
            {isTemplatesSectionExpanded && (
              <div className="mt-8">
                <TemplateDownloadSection />
              </div>
            )}
          </div>
        </div>
      </main>

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
    </div>
  );
};

export default MenusPage;
