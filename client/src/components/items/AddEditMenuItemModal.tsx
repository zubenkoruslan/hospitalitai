import React, { useState, useEffect, useMemo } from "react";
import {
  MenuItem,
  MenuItemFormData,
  // ItemType,
  // ItemCategory, // No longer directly used here for fixed lists
  FOOD_CATEGORIES,
  BEVERAGE_CATEGORIES,
} from "../../types/menuItemTypes";
import ErrorMessage from "../common/ErrorMessage";
// import LoadingSpinner from "../common/LoadingSpinner"; // Not used
import Button from "../common/Button";
import Modal from "../common/Modal";

// Define initialFormData outside the component for a stable reference
const baseInitialFormData = {
  // Renamed to avoid confusion, menuId will be added dynamically
  name: "",
  description: "",
  price: "",
  ingredients: "",
  itemType: "" as "" | "food" | "beverage", // Ensure type matches MenuItemFormData
  category: "",
  isGlutenFree: false,
  isDairyFree: false,
  isVegetarian: false,
  isVegan: false,
};

interface AddEditMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: MenuItemFormData, currentItemId: string | null) => void;
  currentItem: MenuItem | null; // If null, it's an Add operation
  menuId: string; // Needed for context or potentially validation
  restaurantId: string; // Needed for context or potentially validation
  isSubmitting: boolean;
  allItemsInMenu?: MenuItem[]; // Existing prop for all items
  availableCategories?: string[]; // New prop for unique categories from the menu
}

const AddEditMenuItemModal: React.FC<AddEditMenuItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentItem,
  menuId,
  restaurantId: _restaurantId,
  isSubmitting,
  allItemsInMenu: _allItemsInMenu,
  availableCategories, // Destructure the new prop
}) => {
  // Initialize formData with menuId from props
  const [formData, setFormData] = useState<MenuItemFormData>(() => ({
    ...baseInitialFormData,
    menuId: menuId, // Corrected: Use menuId from props
  }));
  const [formError, setFormError] = useState<string | null>(null);
  // State to manage if user is typing a new category
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isNewCategoryInputModalOpen, setIsNewCategoryInputModalOpen] =
    useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>([]); // To hold newly added categories not yet in parent

  const isEditMode = currentItem !== null;

  // Combine provided categories with temporarily added ones for the dropdown
  const combinedCategories = useMemo(() => {
    const base = availableCategories || [];
    return [...new Set([...base, ...tempCategories])].sort();
  }, [availableCategories, tempCategories]);

  // This useMemo is now less critical if `availableCategories` is the primary source for the dropdown.
  // It could still be useful if we want to merge `availableCategories` with standard fallbacks,
  // or for a secondary "suggestion" mechanism if we re-introduce a text input for "Other".
  // For now, the primary list for the dropdown will be `availableCategories`.
  const categorySuggestions = useMemo(() => {
    const suggestions = new Set<string>(availableCategories || []);

    // Add categories from all items in the current menu (already covered by availableCategories)
    // if (allItemsInMenu) {
    //   allItemsInMenu.forEach((item) => {
    //     if (item.category) {
    //       suggestions.add(item.category);
    //     }
    //   });
    // }

    // Ensure current item's category is in suggestions if editing and it exists
    if (
      isEditMode &&
      currentItem?.category &&
      !suggestions.has(currentItem.category)
    ) {
      suggestions.add(currentItem.category); // Add it if it's not in the passed list (e.g. if items list was filtered)
    }

    // Fallback to standard categories if itemType is selected and no suggestions yet
    // This ensures there are some options if availableCategories is empty and itemType is selected.
    if (suggestions.size === 0 && formData.itemType) {
      const standardCategoriesFallback =
        formData.itemType === "food" ? FOOD_CATEGORIES : BEVERAGE_CATEGORIES;
      standardCategoriesFallback.forEach((cat) => suggestions.add(cat));
    }

    // console.log("[AddEditModal] categorySuggestions for datalist/fallback computed:", {
    //   itemType: formData.itemType,
    //   availableCategoriesCount: availableCategories?.length,
    //   finalSuggestions: Array.from(suggestions).sort(),
    // });

    return Array.from(suggestions).sort();
  }, [formData.itemType, availableCategories, currentItem, isEditMode]);

  useEffect(() => {
    // console.log("[Modal useEffect] Running. isEditMode:", isEditMode, "currentItem:", !!currentItem, "isOpen:", isOpen);
    if (isOpen) {
      setTempCategories([]); // Reset temp categories when modal opens
      if (isEditMode && currentItem) {
        try {
          // console.log("[Modal useEffect] Populating form for edit.");
          const categoryToSet: string = currentItem.category || "";
          // Create a new object for edit mode to avoid mutating the constant
          const newData: MenuItemFormData = {
            name: currentItem.name,
            description: currentItem.description || "",
            price: currentItem.price != null ? String(currentItem.price) : "",
            ingredients: (currentItem.ingredients || []).join(", "),
            itemType: currentItem.itemType,
            category: categoryToSet,
            menuId: currentItem.menuId, // Ensure menuId is included from currentItem
            isGlutenFree: currentItem.isGlutenFree ?? false,
            isDairyFree: currentItem.isDairyFree ?? false,
            isVegetarian: currentItem.isVegetarian ?? false,
            isVegan: currentItem.isVegan ?? false,
          };
          // console.log("[Modal useEffect] Setting form data:", newData);
          setFormData(newData);
          setFormError(null);
          if (
            categoryToSet &&
            !categorySuggestions.includes(categoryToSet) &&
            (!availableCategories ||
              !availableCategories.includes(categoryToSet))
          ) {
            setTempCategories((prev) => [...new Set([...prev, categoryToSet])]);
          }
        } catch (_error) {
          // Prefixed error
          // console.error("[Modal useEffect] Error during edit mode population:", _error);
          setFormError("Failed to load item data for editing.");
        }
      } else if (!isEditMode) {
        // console.log("[Modal useEffect] Resetting form for add mode.");
        setFormData({
          // Reset with menuId from props
          ...baseInitialFormData,
          menuId: menuId, // Corrected: Use menuId from props
        });
        setFormError(null);
      }
    }
  }, [
    currentItem,
    isEditMode,
    isOpen,
    availableCategories,
    categorySuggestions,
    menuId, // menuId from props is a dependency now
  ]);

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

    if (name === "category") {
      if (value === "_add_new_category_") {
        setIsAddingNewCategory(true);
        // Do not set formData.category to "_add_new_category_"
        // Instead, we will use newCategoryName for the actual category value if this option is chosen
        // For now, let's keep formData.category as is, or clear it, until new name is typed
        setFormData((prev) => ({ ...prev, category: "" })); // Clear or keep previous category? Let's clear.
        return; // Exit early, newCategoryName will be handled by its own input
      } else {
        setIsAddingNewCategory(false);
        setNewCategoryName(""); // Clear new category name if a regular one is selected
      }
    }

    if (name === "newCategoryName") {
      setNewCategoryName(value);
      // Update formData.category in real-time if adding new category
      // This ensures validation and submission logic use the typed name
      setFormData((prev) => ({ ...prev, category: value.trim() }));
      if (formError) setFormError(null);
      return;
    }

    setFormData((prev) => {
      const updatedData = { ...prev, [name]: newValue };
      if (name === "isVegan" && newValue === true)
        updatedData.isVegetarian = true;
      if (name === "isVegetarian" && newValue === false)
        updatedData.isVegan = false;
      return updatedData;
    });

    if (formError) setFormError(null);
  };

  const handleSaveNewCategory = () => {
    const trimmedNewCategory = newCategoryName.trim();
    if (!trimmedNewCategory) {
      // Optionally, show an error in the sub-modal or prevent closing
      alert("New category name cannot be empty."); // Simple alert for now
      return;
    }
    setFormData((prev) => ({ ...prev, category: trimmedNewCategory }));
    if (
      !tempCategories.includes(trimmedNewCategory) &&
      (!availableCategories ||
        !availableCategories.includes(trimmedNewCategory)) &&
      !categorySuggestions.includes(trimmedNewCategory)
    ) {
      setTempCategories((prev) =>
        [...new Set([...prev, trimmedNewCategory])].sort()
      );
    }
    setIsNewCategoryInputModalOpen(false);
    setNewCategoryName(""); // Clear for next time
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalCategory = isAddingNewCategory
      ? newCategoryName.trim()
      : formData.category;

    if (!formData.name.trim()) {
      setFormError("Item name is required.");
      return;
    }
    if (!formData.itemType) {
      setFormError("Item type is required.");
      return;
    }
    // Use finalCategory for validation
    if (!finalCategory) {
      setFormError("Category is required.");
      return;
    }
    if (
      formData.price &&
      (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0)
    ) {
      setFormError("Price must be a valid non-negative number.");
      return;
    }

    const dataToSubmit: MenuItemFormData = {
      ...formData,
      category: finalCategory, // Ensure the correct category is submitted
    };

    // console.log("[Modal] Validation passed. Calling onSubmit with:", dataToSubmit);
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
        className="space-y-6"
      >
        {/* Item Name */}
        <div>
          <label
            htmlFor="itemName"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="itemName"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item Type */}
          <div>
            <label
              htmlFor="itemType"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Item Type <span className="text-red-500">*</span>
            </label>
            <select
              id="itemType"
              name="itemType"
              value={formData.itemType}
              onChange={handleInputChange}
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
              disabled={isSubmitting}
              required
            >
              <option value="">Select Type...</option>
              <option value="food">Food</option>
              <option value="beverage">Beverage</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="itemCategory"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                id="itemCategory"
                name="category"
                value={
                  isAddingNewCategory ? "_add_new_category_" : formData.category
                }
                onChange={handleInputChange}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                disabled={
                  isSubmitting || (!isAddingNewCategory && !formData.itemType)
                }
                required={!isAddingNewCategory}
              >
                <option value="">Select or Add Category...</option>
                {combinedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="_add_new_category_">Add New Category...</option>
              </select>
            </div>
          </div>
        </div>

        {isAddingNewCategory && (
          <div className="mt-4 p-4 border border-sky-200 bg-sky-50 rounded-lg">
            <label
              htmlFor="newCategoryName"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              New Category Name <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="newCategoryName"
                name="newCategoryName" // Ensure this name is handled in handleInputChange
                value={newCategoryName}
                onChange={handleInputChange} // Use generic handleInputChange
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out"
                placeholder="Enter new category name"
                disabled={isSubmitting}
                required
              />
              {/* The button to confirm/save the new category name from the simple modal can be removed if direct input is preferred. 
                    Or, keep if a sub-modal for confirmation is used. For simplicity, direct input is assumed for now.
                    If a sub-modal was used, its open state was setIsNewCategoryInputModalOpen, and save was handleSaveNewCategory.
                    Let's remove the explicit button for now and assume typing in the field is sufficient.
                  */}
            </div>
          </div>
        )}

        {/* Price */}
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Price <span className="text-sm text-slate-500">(optional)</span>
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Hide number spinners
            placeholder="e.g., 12.99"
            step="0.01"
            min="0"
            disabled={isSubmitting}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description{" "}
            <span className="text-sm text-slate-500">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
            disabled={isSubmitting}
          />
        </div>

        {/* Ingredients */}
        <div>
          <label
            htmlFor="ingredients"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Ingredients{" "}
            <span className="text-sm text-slate-500">
              (comma-separated, optional)
            </span>
          </label>
          <input
            type="text"
            id="ingredients"
            name="ingredients"
            value={formData.ingredients}
            onChange={handleInputChange}
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
            placeholder="e.g., Flour, Tomato, Cheese"
            disabled={isSubmitting}
          />
        </div>

        {/* Dietary Flags */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            Dietary Information{" "}
            <span className="text-xs text-slate-500">(optional)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            {[
              { name: "isGlutenFree", label: "Gluten-Free" },
              { name: "isDairyFree", label: "Dairy-Free" },
              { name: "isVegetarian", label: "Vegetarian" },
              { name: "isVegan", label: "Vegan" },
            ].map((flag) => (
              <label
                key={flag.name}
                className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                <input
                  type="checkbox"
                  id={flag.name}
                  name={flag.name}
                  checked={
                    formData[flag.name as keyof MenuItemFormData] as boolean
                  }
                  onChange={handleInputChange}
                  className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
                  disabled={
                    isSubmitting ||
                    (flag.name === "isVegetarian" && formData.isVegan)
                  }
                />
                <span
                  className={`text-sm ${
                    isSubmitting ||
                    (flag.name === "isVegetarian" && formData.isVegan)
                      ? "text-slate-400"
                      : "text-slate-700"
                  }`}
                >
                  {flag.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </form>

      {/* Sub-Modal for Adding New Category */}
      {isNewCategoryInputModalOpen && (
        <Modal
          isOpen={isNewCategoryInputModalOpen}
          onClose={() => setIsNewCategoryInputModalOpen(false)}
          title="Add New Category"
          size="sm" // Smaller modal for simple input
          footerContent={
            <>
              <Button
                variant="secondary"
                onClick={() => setIsNewCategoryInputModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveNewCategory}
                className="ml-3"
              >
                Save Category
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="newCategoryNameInput"
                className="block text-sm font-medium text-gray-700"
              >
                Category Name
              </label>
              <input
                type="text"
                name="newCategoryNameInput" // Different name to avoid conflict if any
                id="newCategoryNameInput"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name"
                required
                className="mt-1 block w-full default-input-styles"
              />
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default AddEditMenuItemModal;
