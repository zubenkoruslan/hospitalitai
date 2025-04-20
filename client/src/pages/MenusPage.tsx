import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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
  const { user, logout } = useAuth();

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
    if (!formData.name.trim()) {
      setFormError("Menu name is required.");
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
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
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
      setFormError(
        err.response?.data?.message ||
          (currentMenu ? "Failed to update menu." : "Failed to add menu.")
      );
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
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Handle case where user is not a restaurant owner (should be caught by ProtectedRoute ideally)
  if (user?.role !== "restaurant") {
    return (
      <ErrorMessage message="Access Denied. Only restaurant owners can manage menus." />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                &larr; Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            Menus
          </h1>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Menu
          </button>
        </div>
        {/* Notifications */}
        {error && <ErrorMessage message={error} />} {/* Main error display */}
        {successMessage && (
          <SuccessNotification
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}
        {/* Menus List/Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {menus.length === 0 && !isLoading ? (
            <p className="text-center text-gray-500 py-8">
              No menus found. Add one to get started!
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* Table for larger screens */}
              <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menus.map((menu) => (
                    <tr key={menu._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {/* Optional: Make name clickable */}
                        {/* <Link to={`/menu/${menu._id}/items`} className="hover:underline">{menu.name}</Link> */}
                        {menu.name}
                      </td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-md break-words">
                        {menu.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        {" "}
                        {/* Increased space slightly */}
                        <Link
                          to={`/menu/${menu._id}/items`}
                          className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded"
                          aria-label={`View items in ${menu.name}`}
                        >
                          Items
                        </Link>
                        <button
                          onClick={() => openEditModal(menu)}
                          className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                          aria-label={`Edit ${menu.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(menu)}
                          className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                          aria-label={`Delete ${menu.name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cards for smaller screens */}
              <div className="divide-y divide-gray-200 md:hidden">
                {menus.map((menu) => (
                  <div key={menu._id} className="px-4 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {/* Optional: Make name clickable */}
                        {/* <Link to={`/menu/${menu._id}/items`} className="hover:underline">{menu.name}</Link> */}
                        {menu.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex space-x-3">
                        {" "}
                        {/* Increased space slightly */}
                        <Link
                          to={`/menu/${menu._id}/items`}
                          className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded px-1 py-0.5 text-xs"
                          aria-label={`View items in ${menu.name}`}
                        >
                          Items
                        </Link>
                        <button
                          onClick={() => openEditModal(menu)}
                          className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-0.5 text-xs"
                          aria-label={`Edit ${menu.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(menu)}
                          className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded px-1 py-0.5 text-xs"
                          aria-label={`Delete ${menu.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p className="whitespace-normal break-words">
                        <span className="font-medium">Desc:</span>{" "}
                        {menu.description || "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {isAddEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden">
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-4">
                <h2
                  id="menu-modal-title"
                  className="text-xl font-semibold text-gray-800 mb-4"
                >
                  {currentMenu ? "Edit Menu" : "Add New Menu"}
                </h2>

                {formError && <ErrorMessage message={formError} />}

                <div className="mb-4">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    aria-describedby={formError ? "form-error" : undefined}
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
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  ) : null}
                  {currentMenu ? "Save Changes" : "Add Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden">
            <div className="px-6 py-4">
              <h2
                id="delete-modal-title"
                className="text-xl font-semibold text-gray-800 mb-2"
              >
                Confirm Deletion
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete the menu "
                <span className="font-medium">{currentMenu.name}</span>"? This
                action cannot be undone.
              </p>
              {/* Show error within the delete modal if delete fails */}
              {error && <ErrorMessage message={error} />}
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                ) : null}
                Delete Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenusPage;
