import React, { useState, useEffect, useMemo } from "react";
import {
  MenuItem,
  MenuItemFormData,
  ItemType,
  // ItemCategory, // No longer directly used here for fixed lists
  FOOD_CATEGORIES,
  BEVERAGE_CATEGORIES,
} from "../../types/menuItemTypes";
import ErrorMessage from "../common/ErrorMessage";
// import LoadingSpinner from "../common/LoadingSpinner"; // Not used
import Button from "../common/Button";
import Modal from "../common/Modal";

// Define initialFormData outside the component for a stable reference
const initialFormDataConstant: MenuItemFormData = {
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
  restaurantId,
  isSubmitting,
  allItemsInMenu,
  availableCategories, // Destructure the new prop
}) => {
  // Use the constant for initial state
  const [formData, setFormData] = useState<MenuItemFormData>(
    initialFormDataConstant
  );
  const [formError, setFormError] = useState<string | null>(null);
  // State to manage if user is typing a new category
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isNewCategoryInputModalOpen, setIsNewCategoryInputModalOpen] =
    useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>([]); // To hold newly added categories not yet in parent

  const isEditMode = currentItem !== null;

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
        } catch (error) {
          // console.error("[Modal useEffect] Error during edit mode population:", error);
          setFormError("Failed to load item data for editing.");
        }
      } else if (!isEditMode) {
        // console.log("[Modal useEffect] Resetting form for add mode.");
        setFormData(initialFormDataConstant); // Use the stable constant here
        setFormError(null);
      }
    }
  }, [
    currentItem,
    isEditMode,
    isOpen,
    availableCategories,
    categorySuggestions,
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

  // Consolidate available categories for the dropdown, ensuring current item's category is an option
  // And also adding standard categories if availableCategories is empty.
  const displayCategories = useMemo(() => {
    const cats = new Set<string>(availableCategories || []);
    if (
      isEditMode &&
      currentItem?.category &&
      !cats.has(currentItem.category)
    ) {
      cats.add(currentItem.category);
    }
    // If no categories from prop and no current item category, use suggestions (which might have standard fallbacks)
    if (cats.size === 0) {
      categorySuggestions.forEach((cat) => cats.add(cat));
    }
    tempCategories.forEach((cat) => cats.add(cat)); // Include temporarily added categories
    return Array.from(cats).sort();
  }, [
    availableCategories,
    currentItem,
    isEditMode,
    categorySuggestions,
    tempCategories,
  ]);

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
        {/* Name, Description, Price, Ingredients fields remain the same */}
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
              value={
                isAddingNewCategory ? "_add_new_category_" : formData.category
              }
              onChange={handleInputChange}
              required={!isAddingNewCategory} // Category is required if not adding a new one
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="" disabled>
                Select Category...
              </option>
              {displayCategories.length === 0 && !isEditMode && (
                <option value="" disabled>
                  No existing categories. Add one below.
                </option>
              )}
              {displayCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="_add_new_category_">Add new category...</option>
            </select>

            {isAddingNewCategory && (
              <div className="mt-2">
                <label
                  htmlFor="newCategoryName"
                  className="block text-xs font-medium text-gray-600"
                >
                  New Category Name:
                </label>
                <input
                  type="text"
                  name="newCategoryName"
                  id="newCategoryName"
                  value={newCategoryName}
                  onChange={handleInputChange}
                  placeholder="Enter new category name"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            )}
            {/* Datalist is no longer needed as primary input is a select now */}
            {/* <datalist id="category-suggestions">
              {categorySuggestions.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist> */}
          </div>
        </div>

        {/* Dietary Information fieldset remains the same */}
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
