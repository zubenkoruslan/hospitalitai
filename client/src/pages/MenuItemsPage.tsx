import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// --- Interfaces ---
// Reintroduce MenuItem, specific to items within a menu
interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  allergens?: string[];
  itemType: ItemType;
  category: ItemCategory;
  menuId: string; // Foreign key linking to the Menu
  restaurantId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Re-import types from model file if possible, or redefine here
// Assuming redefinition for simplicity if model file isn't easily importable to frontend
type ItemType = "food" | "beverage";
type FoodCategory = "starter" | "main" | "dessert";
type BeverageCategory = "cold" | "hot" | "wine" | "alcohol" | "cocktail";
type ItemCategory = FoodCategory | BeverageCategory;

// Interface for the parent Menu (optional, for displaying name)
interface Menu {
  _id: string;
  name: string;
  description?: string;
}

interface MenuItemFormData {
  name: string;
  description: string;
  price: string; // Use string for form input, convert later
  ingredients: string; // Comma-separated string
  allergens: string;
  itemType: ItemType | "";
  category: ItemCategory | "";
}

// Define constants locally for frontend use
const FOOD_CATEGORIES = ["starter", "main", "dessert"] as const;
const BEVERAGE_CATEGORIES = [
  "cold",
  "hot",
  "wine",
  "alcohol",
  "cocktail",
] as const;

// --- Helper Components (Reusing LoadingSpinner, ErrorMessage, SuccessNotification) ---

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

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

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
const MenuItemsPage: React.FC = () => {
  const { menuId } = useParams<{ menuId: string }>(); // Get menuId from URL
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State for menu details (optional)
  const [menuDetails, setMenuDetails] = useState<Menu | null>(null);
  // State for menu items
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state - include new fields
  const initialFormData: MenuItemFormData = {
    name: "",
    description: "",
    price: "",
    ingredients: "",
    allergens: "",
    itemType: "",
    category: "",
  };
  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  const restaurantId = useMemo(() => user?.restaurantId, [user]);

  // Fetch menu details and items
  const fetchData = useCallback(async () => {
    if (!menuId || !restaurantId) {
      setError("Menu ID or restaurant information is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Fetch menu details (optional but helpful for context)
      const menuDetailsResponse = await api.get<{ menu: Menu }>(
        `/menus/${menuId}`
      );
      setMenuDetails(menuDetailsResponse.data.menu);

      // Fetch items for this menu - Adjust endpoint as needed
      // Option 1: Nested route `/menus/:menuId/items`
      // const itemsResponse = await api.get<{ items: MenuItem[] }>(`/menus/${menuId}/items`);
      // Option 2: Filtered items `/items?menuId=:menuId` (Using this one for example)
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

  // --- Modal Handlers ---
  const openAddModal = () => {
    setCurrentItem(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price?.toString() || "",
      ingredients: (item.ingredients || []).join(", "),
      allergens: (item.allergens || []).join(", "),
      itemType: item.itemType,
      category: item.category,
    });
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  const openDeleteModal = (item: MenuItem) => {
    setCurrentItem(item);
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsAddEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentItem(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsSubmitting(false);
  };

  // --- Form Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "itemType") {
      const newType = value as ItemType | "";
      const currentCategory = formData.category;
      let resetCategory = false;

      if (
        newType === "food" &&
        !FOOD_CATEGORIES.includes(currentCategory as any)
      ) {
        resetCategory = true;
      } else if (
        newType === "beverage" &&
        !BEVERAGE_CATEGORIES.includes(currentCategory as any)
      ) {
        resetCategory = true;
      } else if (newType === "") {
        resetCategory = true;
      }

      setFormData((prev) => ({
        ...prev,
        [name]: value as ItemType | "",
        ...(resetCategory && { category: "" }),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Item name is required.");
      return;
    }
    if (!formData.itemType) {
      setFormError("Item type is required.");
      return;
    }
    if (!formData.category) {
      setFormError("Item category is required.");
      return;
    }
    if (!menuId || !restaurantId) {
      setFormError("Menu or Restaurant context is missing.");
      return;
    }

    const priceValue = parseFloat(formData.price);
    if (formData.price.trim() && (isNaN(priceValue) || priceValue < 0)) {
      setFormError("Please enter a valid positive price.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      price: formData.price.trim() ? priceValue : undefined,
      ingredients: formData.ingredients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergens: formData.allergens
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      itemType: formData.itemType as ItemType,
      category: formData.category as ItemCategory,
      menuId: menuId,
      restaurantId: restaurantId,
    };

    try {
      let response: AxiosResponse<{ item: MenuItem }>;

      if (currentItem) {
        response = await api.put<{ item: MenuItem }>(
          `/items/${currentItem._id}`,
          payload
        );
        setItems((prev) =>
          prev.map((item) =>
            item._id === currentItem._id ? response.data.item : item
          )
        );
        setSuccessMessage("Menu item updated successfully.");
      } else {
        response = await api.post<{ item: MenuItem }>("/items", payload);
        setItems((prev) => [...prev, response.data.item]);
        setSuccessMessage("Menu item added successfully.");
      }
      closeModal();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message ||
          (currentItem ? "Failed to update item." : "Failed to add item.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteConfirm = async () => {
    if (!currentItem) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.delete(`/items/${currentItem._id}`);
      setItems((prev) => prev.filter((item) => item._id !== currentItem._id));
      setSuccessMessage("Menu item deleted successfully.");
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete menu item.");
      setIsSubmitting(false);
    }
  };

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
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (user?.role !== "restaurant") {
    return <ErrorMessage message="Access Denied." />;
  }

  if (!menuId) {
    return <ErrorMessage message="Menu ID not found in URL." />;
  }

  if (error && !menuDetails && !items.length) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <Link
          to="/menu"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Menus
        </Link>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar - Consider making a reusable Navbar component */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                &larr; Dashboard
              </Link>
              <Link
                to="/menu"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                &larr; Menus
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
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              {menuDetails ? menuDetails.name : "Menu Items"}
            </h1>
            {menuDetails?.description && (
              <p className="text-sm text-gray-600 mt-1">
                {menuDetails.description}
              </p>
            )}
          </div>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Menu Item
          </button>
        </div>
        {/* Notifications */}
        {error && <ErrorMessage message={error} />}{" "}
        {/* Show non-fatal errors here */}
        {successMessage && (
          <SuccessNotification
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}
        {/* Menu Items Display - Grouped */}
        {items.length === 0 && !isLoading ? (
          <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
            No items found in this menu. Add one to get started!
          </div>
        ) : (
          <div className="space-y-8">
            {/* Iterate over grouped types (e.g., 'food', 'beverage') */}
            {Object.entries(groupedItems).map(([type, itemsOfType]) => (
              <div
                key={type}
                className="bg-white shadow rounded-lg overflow-hidden"
              >
                <h2 className="px-4 py-3 border-b border-gray-200 text-lg leading-6 font-medium text-gray-900 capitalize">
                  {type}s {/* Simple pluralization */}
                </h2>
                <div className="overflow-x-auto">
                  {/* Table for larger screens */}
                  <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50">
                      <tr>
                        {/* Update Table Headers */}
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
                          Category
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Price
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Description
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Ingredients
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Allergens
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
                      {itemsOfType.map((item) => (
                        <tr key={item._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {item.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.price !== undefined
                              ? `$${item.price.toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs break-words">
                            {item.description || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs break-words">
                            {item.ingredients && item.ingredients.length > 0
                              ? item.ingredients.join(", ")
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs break-words">
                            {item.allergens && item.allergens.length > 0
                              ? item.allergens.join(", ")
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                              aria-label={`Edit ${item.name}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteModal(item)}
                              className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                              aria-label={`Delete ${item.name}`}
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
                    {itemsOfType.map((item) => (
                      <div key={item._id} className="px-4 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {item.category} -{" "}
                              {item.price !== undefined
                                ? `$${item.price.toFixed(2)}`
                                : "N/A"}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex space-x-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-0.5 text-xs"
                              aria-label={`Edit ${item.name}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteModal(item)}
                              className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded px-1 py-0.5 text-xs"
                              aria-label={`Delete ${item.name}`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 space-y-1 mt-2">
                          <p className="whitespace-normal break-words">
                            <span className="font-medium">Desc:</span>{" "}
                            {item.description || "-"}
                          </p>
                          <p className="whitespace-normal break-words">
                            <span className="font-medium">Ingredients:</span>{" "}
                            {item.ingredients && item.ingredients.length > 0
                              ? item.ingredients.join(", ")
                              : "-"}
                          </p>
                          <p className="whitespace-normal break-words">
                            <span className="font-medium">Allergens:</span>{" "}
                            {item.allergens && item.allergens.length > 0
                              ? item.allergens.join(", ")
                              : "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Item Modal - Update Form Structure */}
      {isAddEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-item-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden">
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-4">
                <h2
                  id="menu-item-modal-title"
                  className="text-xl font-semibold text-gray-800 mb-4"
                >
                  {currentItem ? "Edit Menu Item" : "Add New Menu Item"}
                </h2>
                {formError && <ErrorMessage message={formError} />}

                {/* Name Field */}
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
                  />
                </div>

                {/* Type Selection */}
                <div className="mb-4">
                  <label
                    htmlFor="itemType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Item Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="itemType"
                    name="itemType"
                    value={formData.itemType}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="" disabled>
                      Select type...
                    </option>
                    <option value="food">Food</option>
                    <option value="beverage">Beverage</option>
                  </select>
                </div>

                {/* Category Selection (Conditional) */}
                <div className="mb-4">
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.itemType}
                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !formData.itemType ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="" disabled>
                      Select category...
                    </option>
                    {formData.itemType === "food" &&
                      FOOD_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="capitalize">
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    {formData.itemType === "beverage" &&
                      BEVERAGE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="capitalize">
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Price Field */}
                <div className="mb-4">
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Price
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., 12.99"
                  />
                </div>

                {/* Description Field */}
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

                {/* Ingredients Field */}
                <div className="mb-4">
                  <label
                    htmlFor="ingredients"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ingredients (comma-separated)
                  </label>
                  <textarea
                    id="ingredients"
                    name="ingredients"
                    value={formData.ingredients}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Allergens Field */}
                <div className="mb-4">
                  <label
                    htmlFor="allergens"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Allergens (comma-separated)
                  </label>
                  <textarea
                    id="allergens"
                    name="allergens"
                    value={formData.allergens}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
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
                  {currentItem ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-item-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden">
            <div className="px-6 py-4">
              <h2
                id="delete-item-modal-title"
                className="text-xl font-semibold text-gray-800 mb-2"
              >
                Confirm Deletion
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete the menu item "
                <span className="font-medium">{currentItem.name}</span>"? This
                action cannot be undone.
              </p>
              {error && <ErrorMessage message={error} />}{" "}
              {/* Modal-specific error for delete failure */}
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
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuItemsPage;
