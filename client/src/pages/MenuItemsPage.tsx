import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AxiosResponse } from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";

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
  const { user } = useAuth();
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

    // Reset error state
    setFormError(null);

    // Extensive validation
    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedIngredients = formData.ingredients.trim();
    const trimmedPrice = formData.price.trim();

    // Required fields validation
    if (!trimmedName) {
      setFormError("Item name is required.");
      return;
    }

    if (trimmedName.length < 2) {
      setFormError("Item name must be at least 2 characters.");
      return;
    }

    if (trimmedName.length > 50) {
      setFormError("Item name cannot exceed 50 characters.");
      return;
    }

    if (!formData.itemType) {
      setFormError("Item type is required.");
      return;
    }

    if (!formData.category) {
      setFormError("Category is required.");
      return;
    }

    // Price validation
    let priceValue: number | undefined = undefined;

    if (trimmedPrice) {
      priceValue = parseFloat(trimmedPrice);

      if (isNaN(priceValue)) {
        setFormError("Price must be a valid number.");
        return;
      }

      if (priceValue < 0) {
        setFormError("Price cannot be negative.");
        return;
      }

      if (priceValue > 1000) {
        setFormError("Price exceeds maximum allowed value (1000).");
        return;
      }
    }

    // Prepare ingredients
    const ingredientsArray = trimmedIngredients
      ? trimmedIngredients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Check individual ingredients
    for (const ingredient of ingredientsArray) {
      if (ingredient.length > 50) {
        setFormError("Ingredient names cannot exceed 50 characters.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let response: AxiosResponse<{ item: MenuItem }>;

      const payload = {
        name: trimmedName,
        description: trimmedDescription || undefined,
        price: priceValue,
        ingredients: ingredientsArray,
        itemType: formData.itemType,
        category: formData.category,
        isGlutenFree: formData.isGlutenFree,
        isDairyFree: formData.isDairyFree,
        isVegetarian: formData.isVegetarian,
        isVegan: formData.isVegan,
      };

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
        setFormError("Operation failed. Please try again.");
      }

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
  if (!menuId) {
    return <ErrorMessage message="Menu ID is missing from the URL." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 pb-4 border-b border-gray-200 gap-4 sm:gap-0">
            <div>
              <Link
                to={`/menu`}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-1 inline-block"
              >
                &larr; Back to Menus
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                {menuDetails ? (
                  <>
                    Items for:{" "}
                    <span className="ml-2 font-bold text-blue-700">
                      {menuDetails.name}
                    </span>
                  </>
                ) : (
                  "Menu Items"
                )}
                {isLoading && !menuDetails && (
                  <span className="ml-3 h-5 w-5 border-t-2 border-blue-200 border-solid rounded-full animate-spin"></span>
                )}
              </h1>
            </div>
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out text-sm font-medium"
            >
              Add New Item
            </button>
          </div>

          {error && <ErrorMessage message={error} />}
          {successMessage && (
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          )}

          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {items.length > 0 ? (
                <ul
                  className="divide-y divide-gray-200"
                  aria-labelledby="menu-item-list-title"
                >
                  {items.map((item) => (
                    <li
                      key={item._id}
                      className="px-4 py-4 sm:px-6 hover:bg-gray-50"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                          <div className="flex items-baseline mb-1">
                            <p className="text-lg font-medium text-gray-900 truncate mr-3">
                              {item.name}
                            </p>
                            {item.price !== undefined && (
                              <p className="text-sm font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                ${item.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {/* Conditionally render description only if it exists AND is different from the name */}
                          {item.description &&
                            item.description !== item.name && (
                              <p className="text-sm text-gray-500 mt-1 truncate">
                                {item.description}
                              </p>
                            )}
                          {/* Ingredients */}
                          {item.ingredients && item.ingredients.length > 0 && (
                            <p className="text-sm text-gray-600 mt-1.5">
                              <span className="font-medium">Ingredients:</span>{" "}
                              {item.ingredients.join(", ")}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mt-1.5 capitalize">
                            Type: {item.itemType} | Category: {item.category}
                          </p>
                          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5">
                            {item.isGlutenFree && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                GF
                              </span>
                            )}
                            {item.isDairyFree && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                DF
                              </span>
                            )}
                            {item.isVegetarian && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                V
                              </span>
                            )}
                            {item.isVegan && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                VG
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex space-x-2 self-start sm:self-center">
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                            aria-label={`Edit item ${item.name}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            aria-label={`Delete item ${item.name}`}
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
                  No items found for this menu. Add one to get started!
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 my-8">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">
              {currentItem ? "Edit Menu Item" : "Add New Menu Item"}
            </h2>
            <form onSubmit={handleFormSubmit}>
              {formError && <ErrorMessage message={formError} />}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <div className="mb-4">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Item Name <span className="text-red-500">*</span>
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
                      htmlFor="price"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Price ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
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
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm capitalize"
                      disabled={isSubmitting}
                    >
                      <option value="" disabled>
                        Select type...
                      </option>
                      <option value="food">Food</option>
                      <option value="beverage">Beverage</option>
                    </select>
                  </div>
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
                      disabled={!formData.itemType || isSubmitting}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm capitalize disabled:bg-gray-100"
                    >
                      <option value="" disabled>
                        {formData.itemType
                          ? "Select category..."
                          : "Select type first..."}
                      </option>
                      {formData.itemType === "food" &&
                        FOOD_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      {formData.itemType === "beverage" &&
                        BEVERAGE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
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
                  <div className="mb-4">
                    <label
                      htmlFor="ingredients"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Ingredients (Optional, comma-separated)
                    </label>
                    <input
                      type="text"
                      id="ingredients"
                      name="ingredients"
                      value={formData.ingredients}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <fieldset className="mt-2">
                    <legend className="block text-sm font-medium text-gray-700 mb-1">
                      Dietary Information
                    </legend>
                    <div className="space-y-2">
                      {[
                        "isGlutenFree",
                        "isDairyFree",
                        "isVegetarian",
                        "isVegan",
                      ].map((flag) => (
                        <div key={flag} className="relative flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id={flag}
                              name={flag}
                              type="checkbox"
                              checked={
                                formData[
                                  flag as keyof MenuItemFormData
                                ] as boolean
                              }
                              onChange={handleInputChange}
                              disabled={isSubmitting}
                              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label
                              htmlFor={flag}
                              className="font-medium text-gray-700 capitalize"
                            >
                              {flag
                                .substring(2)
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-200">
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
                    : currentItem
                    ? "Save Changes"
                    : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && currentItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 my-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Confirm Deletion
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete the item "
              <strong>{currentItem.name}</strong>"? This action cannot be
              undone.
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
                {isSubmitting ? "Deleting..." : "Delete Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuItemsPage;
