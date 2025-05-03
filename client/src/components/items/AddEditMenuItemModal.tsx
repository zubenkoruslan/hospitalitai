import React, { useState, useEffect } from "react";
import {
  MenuItem,
  MenuItemFormData,
  ItemType,
  ItemCategory,
  FOOD_CATEGORIES,
  BEVERAGE_CATEGORIES,
} from "../../types/menuItemTypes";
import ErrorMessage from "../common/ErrorMessage";
import LoadingSpinner from "../common/LoadingSpinner";

interface AddEditMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: MenuItemFormData, currentItemId: string | null) => void;
  currentItem: MenuItem | null; // If null, it's an Add operation
  menuId: string; // Needed for context or potentially validation
  restaurantId: string; // Needed for context or potentially validation
  isSubmitting: boolean;
}

const AddEditMenuItemModal: React.FC<AddEditMenuItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentItem,
  menuId, // Currently unused, but good to have for context
  restaurantId, // Currently unused
  isSubmitting,
}) => {
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

  const isEditMode = currentItem !== null;
  const availableCategories =
    formData.itemType === "food" ? FOOD_CATEGORIES : BEVERAGE_CATEGORIES;

  // Populate form when currentItem changes (for editing)
  useEffect(() => {
    if (isEditMode && currentItem) {
      // Add validation/reset for category if needed (copied from MenuItemsPage)
      let categoryToSet: ItemCategory | "" = currentItem.category;
      if (
        currentItem.itemType === "food" &&
        !(FOOD_CATEGORIES as ReadonlyArray<string>).includes(
          currentItem.category
        )
      ) {
        categoryToSet = "";
      } else if (
        currentItem.itemType === "beverage" &&
        !(BEVERAGE_CATEGORIES as ReadonlyArray<string>).includes(
          currentItem.category
        )
      ) {
        categoryToSet = "";
      }

      setFormData({
        name: currentItem.name,
        description: currentItem.description || "",
        price: currentItem.price?.toString() || "",
        ingredients: (currentItem.ingredients || []).join(", "),
        itemType: currentItem.itemType,
        category: categoryToSet,
        isGlutenFree: currentItem.isGlutenFree ?? false,
        isDairyFree: currentItem.isDairyFree ?? false,
        isVegetarian: currentItem.isVegetarian ?? false,
        isVegan: currentItem.isVegan ?? false,
      });
      setFormError(null);
    } else if (!isEditMode) {
      // Reset form for Add mode
      setFormData(initialFormData);
      setFormError(null);
    }
  }, [currentItem, isEditMode, isOpen]); // Rerun effect when modal opens too

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    let newValue: string | boolean = value;
    if (type === "checkbox" && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }

    setFormData((prev) => {
      const updatedData = { ...prev, [name]: newValue };

      // Reset category if itemType changes
      if (name === "itemType" && prev.itemType !== newValue) {
        updatedData.category = "";
      }
      // Auto-check vegetarian if vegan is checked
      if (name === "isVegan" && newValue === true) {
        updatedData.isVegetarian = true;
      }
      // Uncheck vegan if vegetarian is unchecked
      if (name === "isVegetarian" && newValue === false) {
        updatedData.isVegan = false;
      }

      return updatedData;
    });

    // Clear error on input change
    if (formError) {
      setFormError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Clear previous errors

    // Basic Validation
    if (!formData.name.trim()) {
      setFormError("Item name is required.");
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
    if (formData.price && isNaN(parseFloat(formData.price))) {
      setFormError("Price must be a valid number.");
      return;
    }

    onSubmit(formData, currentItem?._id || null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-5 text-gray-800">
          {isEditMode ? "Edit Menu Item" : "Add New Menu Item"}
        </h2>

        {formError && <ErrorMessage message={formError} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
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
            ></textarea>
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700"
            >
              Price ($)
            </label>
            <input
              type="number"
              name="price"
              id="price"
              value={formData.price}
              onChange={handleInputChange}
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., 12.99"
            />
          </div>

          {/* Ingredients */}
          <div>
            <label
              htmlFor="ingredients"
              className="block text-sm font-medium text-gray-700"
            >
              Ingredients
            </label>
            <input
              type="text"
              name="ingredients"
              id="ingredients"
              value={formData.ingredients}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Flour, Sugar, Eggs"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list.</p>
          </div>

          {/* Item Type & Category (Side-by-side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="itemType"
                className="block text-sm font-medium text-gray-700"
              >
                Item Type <span className="text-red-500">*</span>
              </label>
              <select
                name="itemType"
                id="itemType"
                value={formData.itemType}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="" disabled>
                  Select Type...
                </option>
                <option value="food">Food</option>
                <option value="beverage">Beverage</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                id="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                disabled={!formData.itemType}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              >
                <option value="" disabled>
                  Select Category...
                </option>
                {formData.itemType &&
                  (availableCategories as ReadonlyArray<string>).map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Dietary Flags */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Dietary Information
            </legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {["isGlutenFree", "isDairyFree", "isVegetarian", "isVegan"].map(
                (flag) => (
                  <div key={flag} className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={flag}
                        name={flag}
                        type="checkbox"
                        checked={
                          formData[flag as keyof MenuItemFormData] as boolean
                        }
                        onChange={handleInputChange}
                        disabled={flag === "isVegetarian" && formData.isVegan} // Disable Vegetarian if Vegan is checked
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label
                        htmlFor={flag}
                        className={`font-medium text-gray-700 capitalize ${
                          flag === "isVegetarian" && formData.isVegan
                            ? "text-gray-400"
                            : ""
                        }`}
                      >
                        {flag
                          .replace("is", "")
                          .replace(/([A-Z])/g, " $1")
                          .trim()}
                      </label>
                    </div>
                  </div>
                )
              )}
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <LoadingSpinner />
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Add Item"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditMenuItemModal;
