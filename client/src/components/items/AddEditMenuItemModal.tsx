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
import Button from "../common/Button";
import Modal from "../common/Modal";

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

  // Restore useState for form data
  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = currentItem !== null;
  // Use formData for available categories
  const availableCategories =
    formData.itemType === "food" ? FOOD_CATEGORIES : BEVERAGE_CATEGORIES;

  // Restore useEffect using useState
  useEffect(() => {
    // Added isOpen check to prevent updates when closed
    console.log(
      "[Modal useEffect] Running. isEditMode:",
      isEditMode,
      "currentItem:",
      !!currentItem,
      "isOpen:",
      isOpen
    );
    if (isOpen) {
      // Only run logic when modal is open
      if (isEditMode && currentItem) {
        try {
          console.log("[Modal useEffect] Populating form for edit.");
          // Validate category based on item type
          let categoryToSet: ItemCategory | "" = currentItem.category;
          const currentTypeCategories =
            currentItem.itemType === "food"
              ? FOOD_CATEGORIES
              : BEVERAGE_CATEGORIES;
          if (
            !(currentTypeCategories as ReadonlyArray<string>).includes(
              currentItem.category
            )
          ) {
            console.warn(
              `[Modal useEffect] Category '${currentItem.category}' invalid for type '${currentItem.itemType}'. Resetting.`
            );
            categoryToSet = "";
          }

          // Map MenuItem to MenuItemFormData, handle potential missing fields
          const newData: MenuItemFormData = {
            name: currentItem.name,
            description: currentItem.description || "",
            price: currentItem.price != null ? String(currentItem.price) : "", // Convert price to string
            ingredients: (currentItem.ingredients || []).join(", "), // Join array to string
            itemType: currentItem.itemType,
            category: categoryToSet,
            // Assuming dietary flags are directly on MenuItem based on previous context
            // If they were nested under dietaryInfo, this needs adjustment
            isGlutenFree: currentItem.isGlutenFree ?? false,
            isDairyFree: currentItem.isDairyFree ?? false,
            isVegetarian: currentItem.isVegetarian ?? false,
            isVegan: currentItem.isVegan ?? false,
          };
          console.log("[Modal useEffect] Setting form data:", newData);
          setFormData(newData);
          setFormError(null); // Clear error when repopulating
          console.log("[Modal useEffect] Form data set for edit.");
        } catch (error) {
          console.error(
            "[Modal useEffect] Error during edit mode population:",
            error
          );
          setFormError("Failed to load item data for editing.");
        }
      } else if (!isEditMode) {
        console.log("[Modal useEffect] Resetting form for add mode.");
        setFormData(initialFormData); // Reset form for Add mode
        setFormError(null); // Clear error when resetting
      }
    }
    // Rerun when modal opens/closes, mode changes, or item changes
  }, [currentItem, isEditMode, isOpen, initialFormData]); // Added initialFormData dependency

  // Restore handleInputChange using useState
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
        console.log(
          `[Modal InputChange] Item type changed from ${prev.itemType} to ${newValue}. Resetting category.`
        );
        updatedData.category = ""; // Reset category selection
      }
      // Auto-check vegetarian if vegan is checked
      if (name === "isVegan" && newValue === true) {
        updatedData.isVegetarian = true;
      }
      // Uncheck vegan if vegetarian is unchecked (and the change was to vegetarian)
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

  // Restore handleSubmit using useState
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Modal] handleSubmit triggered with formData:", formData);
    setFormError(null); // Clear previous errors

    // Basic Validation
    console.log("[Modal] Running validation. Name:", formData.name);
    if (!formData.name.trim()) {
      console.log("[Modal] Validation failed: Name required");
      setFormError("Item name is required.");
      return;
    }
    console.log("[Modal] Running validation. Type:", formData.itemType);
    if (!formData.itemType) {
      console.log("[Modal] Validation failed: Type required");
      setFormError("Item type is required.");
      return;
    }
    console.log("[Modal] Running validation. Category:", formData.category);
    if (!formData.category) {
      console.log("[Modal] Validation failed: Category required");
      setFormError("Category is required.");
      return;
    }
    console.log("[Modal] Running validation. Price:", formData.price);
    // Price is optional, but if provided, must be valid non-negative number
    if (
      formData.price &&
      (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0)
    ) {
      console.log("[Modal] Validation failed: Invalid Price", formData.price);
      setFormError("Price must be a valid non-negative number.");
      return;
    }

    // Prepare data for submission (e.g., convert price string back to number if needed)
    // NOTE: The parent onSubmit expects MenuItemFormData, which currently has price as string.
    // If the API expects a number, conversion should happen here or in the parent.
    const dataToSubmit: MenuItemFormData = {
      ...formData,
      // Example conversion if API needed number:
      // price: formData.price ? parseFloat(formData.price) : undefined,
    };

    console.log(
      "[Modal] Validation passed. Calling onSubmit with:",
      dataToSubmit
    );
    onSubmit(dataToSubmit, currentItem?._id || null);
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || !!formError}
        className="ml-3"
        form="add-edit-item-form"
      >
        {isSubmitting
          ? isEditMode
            ? "Saving..."
            : "Adding..."
          : isEditMode
          ? "Save Changes"
          : "Add Item"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Menu Item" : "Add New Menu Item"}
      size="2xl"
      footerContent={footer}
    >
      {formError && <ErrorMessage message={formError} />}
      <form
        onSubmit={handleSubmit}
        id="add-edit-item-form"
        className="space-y-4"
      >
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
          />
        </div>

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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
          ></textarea>
        </div>

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
            min="0"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
            placeholder="e.g., 12.99"
          />
        </div>

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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
            placeholder="e.g., Flour, Sugar, Eggs"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated list.</p>
        </div>

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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
            >
              <option value="" disabled>
                {formData.itemType
                  ? "Select Category..."
                  : "Select Item Type First"}
              </option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Dietary Information
          </legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {(
              [
                "isGlutenFree",
                "isDairyFree",
                "isVegetarian",
                "isVegan",
              ] as const
            ).map((flag) => {
              const label = flag
                .substring(2)
                .replace(/([A-Z])/g, " $1")
                .trim();
              const isVegetarianDisabled =
                flag === "isVegetarian" && formData.isVegan;
              return (
                <div key={flag} className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={flag}
                      name={flag}
                      type="checkbox"
                      checked={formData[flag]}
                      onChange={handleInputChange}
                      disabled={isVegetarianDisabled}
                      className={`focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50`}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label
                      htmlFor={flag}
                      className={`font-medium text-gray-700 capitalize ${
                        isVegetarianDisabled ? "text-gray-400" : ""
                      }`}
                    >
                      {label}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};

export default AddEditMenuItemModal;
