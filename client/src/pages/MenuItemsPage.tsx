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
  itemType: ItemType;
  category: ItemCategory;
  menuId: string; // Foreign key linking to the Menu
  restaurantId: string;
  createdAt?: string;
  updatedAt?: string;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
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

// Update FormData interface to allow empty category string
interface MenuItemFormData {
  name: string;
  description: string;
  price: string; // Use string for form input, convert later
  ingredients: string; // Comma-separated string
  itemType: ItemType | "";
  category: ItemCategory | ""; // Explicitly allow empty string
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
}

// Define constants locally for frontend use - UPDATE THESE TO MATCH BACKEND MODEL
const FOOD_CATEGORIES = [
  "appetizer",
  "main",
  "side",
  "dessert",
  "other",
] as const;
const BEVERAGE_CATEGORIES = [
  "hot",
  "cold",
  "alcoholic",
  "non-alcoholic",
  "other",
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
    itemType: "",
    category: "",
    isGlutenFree: false,
    isDairyFree: false,
    isVegetarian: false,
    isVegan: false,
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

    let categoryToSet: ItemCategory | "" = item.category; // Initialize with the correct type
    const foodCategories = ["appetizer", "main", "side", "dessert", "other"];
    if (
      item.itemType === "food" &&
      !foodCategories.includes(item.category as any)
    ) {
      console.warn(
        `Item '${item.name}' has outdated category '${item.category}'. Resetting.`
      );
      categoryToSet = "" as ItemCategory | ""; // Explicitly cast empty string
    }
    // Add similar check for beverage categories if they changed significantly

    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price?.toString() || "",
      ingredients: (item.ingredients || []).join(", "),
      itemType: item.itemType,
      category: categoryToSet, // Assign the potentially reset value
      isGlutenFree: item.isGlutenFree ?? false,
      isDairyFree: item.isDairyFree ?? false,
      isVegetarian: item.isVegetarian ?? false,
      isVegan: item.isVegan ?? false,
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
    const { name, value, type } = e.target;

    // Handle checkboxes differently
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: checked, // Use the boolean checked state
      }));
      // Enforce consistency: If Vegan is checked, Vegetarian must be checked
      if (name === "isVegan" && checked) {
        setFormData((prev) => ({ ...prev, isVegetarian: true }));
      }
      // If Vegetarian is unchecked, Vegan must be unchecked
      if (name === "isVegetarian" && !checked) {
        setFormData((prev) => ({ ...prev, isVegan: false }));
      }
      // Add other consistency checks if needed (e.g., Vegan -> Dairy Free)
    } else if (name === "itemType") {
      // --- Keep existing itemType/category reset logic ---
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
      }

      setFormData((prev) => ({
        ...prev,
        itemType: newType,
        // Reset category only if it becomes invalid for the new type
        category: resetCategory ? "" : prev.category,
      }));
    } else {
      // Handle regular inputs (text, textarea, select)
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemType || !formData.category) {
      setFormError("Item Type and Category are required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    try {
      let response: AxiosResponse<{ item: MenuItem }>;
      const priceValue = parseFloat(formData.price);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price.trim() ? priceValue : undefined,
        ingredients: formData.ingredients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        itemType: formData.itemType,
        category: formData.category,
        isGlutenFree: formData.isGlutenFree,
        isDairyFree: formData.isDairyFree,
        isVegetarian: formData.isVegetarian,
        isVegan: formData.isVegan,
      };

      if (!payload.name) {
        setFormError("Item name is required.");
        setIsSubmitting(false);
        return;
      }
      if (!payload.itemType) {
        setFormError("Item type is required.");
        setIsSubmitting(false);
        return;
      }
      if (!payload.category) {
        setFormError("Item category is required.");
        setIsSubmitting(false);
        return;
      }

      if (currentItem) {
        response = await api.put<{ item: MenuItem }>(
          `/items/${currentItem._id}`,
          payload
        );
        setSuccessMessage("Item updated successfully!");
      } else {
        response = await api.post<{ item: MenuItem }>("/items", {
          ...payload,
          menuId: menuId,
        });
        setSuccessMessage("Item created successfully!");
      }

      fetchData();
      closeModal();
    } catch (err: any) {
      const message = err.response?.data?.message || "Operation failed.";
      setFormError(message);
      console.error("Submit error:", err);
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

  // Determine available categories based on selected itemType
  const availableCategories = useMemo(() => {
    if (formData.itemType === "food") return FOOD_CATEGORIES;
    if (formData.itemType === "beverage") return BEVERAGE_CATEGORIES;
    return [];
  }, [formData.itemType]);

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
                          Dietary
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-1">
                            {item.isGlutenFree && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                GF
                              </span>
                            )}
                            {item.isDairyFree && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                DF
                              </span>
                            )}
                            {item.isVegetarian && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                VG
                              </span>
                            )}
                            {item.isVegan && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                V
                              </span>
                            )}
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
                            <span className="font-medium">Dietary:</span>{" "}
                            {item.isGlutenFree
                              ? "Gluten-free"
                              : "Contains gluten"}
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
                    {availableCategories.map((cat) => (
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

                {/* Dietary Checkboxes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Information
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Gluten Free */}
                    <div className="flex items-center">
                      <input
                        id="isGlutenFree"
                        name="isGlutenFree"
                        type="checkbox"
                        checked={formData.isGlutenFree}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="isGlutenFree"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Gluten Free (GF)
                      </label>
                    </div>
                    {/* Dairy Free */}
                    <div className="flex items-center">
                      <input
                        id="isDairyFree"
                        name="isDairyFree"
                        type="checkbox"
                        checked={formData.isDairyFree}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="isDairyFree"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Dairy Free (DF)
                      </label>
                    </div>
                    {/* Vegetarian */}
                    <div className="flex items-center">
                      <input
                        id="isVegetarian"
                        name="isVegetarian"
                        type="checkbox"
                        checked={formData.isVegetarian}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="isVegetarian"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Vegetarian (VG)
                      </label>
                    </div>
                    {/* Vegan */}
                    <div className="flex items-center">
                      <input
                        id="isVegan"
                        name="isVegan"
                        type="checkbox"
                        checked={formData.isVegan}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="isVegan"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Vegan (V)
                      </label>
                    </div>
                  </div>
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
