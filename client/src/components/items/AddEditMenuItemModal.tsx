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
  itemType: "" as "" | "food" | "beverage" | "wine", // Include wine type
  category: "",
  isGlutenFree: false,
  isDairyFree: false,
  isVegetarian: false,
  isVegan: false,
  // Wine-specific fields
  producer: "",
  grapeVariety: "",
  vintage: "",
  region: "",
  servingOptions: "",
  suggestedPairingsText: "",
};

// Wine categories for fallback
const WINE_CATEGORIES = [
  "Red Wine",
  "White Wine",
  "Rosé Wine",
  "Sparkling Wine",
  "Dessert Wine",
  "Fortified Wine",
  "Other",
] as const;

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
  itemType: "food" | "beverage" | "wine"; // Add itemType as required prop
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
  itemType, // Destructure the new prop
}) => {
  // Initialize formData with menuId from props
  const [formData, setFormData] = useState<MenuItemFormData>(() => ({
    ...baseInitialFormData,
    menuId: menuId, // Corrected: Use menuId from props
    itemType: itemType, // Set itemType from prop
  }));
  const [formError, setFormError] = useState<string | null>(null);
  // State to manage if user is typing a new category
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isNewCategoryInputModalOpen, setIsNewCategoryInputModalOpen] =
    useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>([]); // To hold newly added categories not yet in parent

  // State for wine serving options
  const [servingOptionsArray, setServingOptionsArray] = useState<
    Array<{ size: string; price: string }>
  >([]);

  // State for expandable sections in wine modal
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isServingOptionsExpanded, setIsServingOptionsExpanded] =
    useState(false);

  const isEditMode = currentItem !== null;

  // Combine provided categories with temporarily added ones for the dropdown
  const combinedCategories = useMemo(() => {
    const base = availableCategories
      ? availableCategories.map((cat) => toTitleCase(cat))
      : []; // Ensure availableCategories are title cased
    const temp = tempCategories.map((cat) => toTitleCase(cat)); // Ensure tempCategories are title cased
    return [...new Set([...base, ...temp])].sort();
  }, [availableCategories, tempCategories]);

  // This useMemo is now less critical if `availableCategories` is the primary source for the dropdown.
  // It could still be useful if we want to merge `availableCategories` with standard fallbacks,
  // or for a secondary "suggestion" mechanism if we re-introduce a text input for "Other".
  // For now, the primary list for the dropdown will be `availableCategories`.
  const categorySuggestions = useMemo(() => {
    const suggestions = new Set<string>(
      availableCategories
        ? availableCategories.map((cat) => toTitleCase(cat))
        : []
    ); // Ensure availableCategories are title cased

    // Add categories from all items in the current menu (already covered by availableCategories)
    // if (allItemsInMenu) {
    //   allItemsInMenu.forEach((item) => {
    //     if (item.category) {
    //       suggestions.add(toTitleCase(item.category)); // Normalize
    //     }
    //   });
    // }

    // Ensure current item's category is in suggestions if editing and it exists
    if (isEditMode && currentItem?.category) {
      const currentItemCategoryTitleCase = toTitleCase(currentItem.category); // Normalize
      if (!suggestions.has(currentItemCategoryTitleCase)) {
        suggestions.add(currentItemCategoryTitleCase); // Add it if it's not in the passed list
      }
    }

    // Fallback to standard categories if itemType is selected and no suggestions yet
    // This ensures there are some options if availableCategories is empty and itemType is selected.
    if (suggestions.size === 0 && itemType) {
      const standardCategoriesFallback =
        itemType === "food"
          ? FOOD_CATEGORIES.map((cat) => toTitleCase(cat))
          : itemType === "beverage"
          ? BEVERAGE_CATEGORIES.map((cat) => toTitleCase(cat))
          : WINE_CATEGORIES.map((cat) => toTitleCase(cat)); // Wine categories fallback
      standardCategoriesFallback.forEach((cat) => suggestions.add(cat));
    }

    // console.log("[AddEditModal] categorySuggestions for datalist/fallback computed:", {
    //   itemType: formData.itemType,
    //   availableCategoriesCount: availableCategories?.length,
    //   finalSuggestions: Array.from(suggestions).sort(),
    // });

    return Array.from(suggestions).sort();
  }, [itemType, availableCategories, currentItem, isEditMode]);

  useEffect(() => {
    // console.log("[Modal useEffect] Running. isEditMode:", isEditMode, "currentItem:", !!currentItem, "isOpen:", isOpen);
    if (isOpen) {
      // Always reset tempCategories when modal opens for a fresh start with category handling
      setTempCategories([]);

      if (isEditMode && currentItem) {
        try {
          const categoryToSet = toTitleCase(currentItem.category || "");
          setFormData({
            ...baseInitialFormData,
            menuId: menuId,
            name: currentItem.name,
            description: currentItem.description || "",
            price: currentItem.price?.toString() || "",
            ingredients: currentItem.ingredients?.join(", ") || "",
            itemType: itemType, // Use itemType from prop instead of currentItem
            category: categoryToSet,
            isGlutenFree: currentItem.isGlutenFree ?? false,
            isDairyFree: currentItem.isDairyFree ?? false,
            isVegetarian: currentItem.isVegetarian ?? false,
            isVegan: currentItem.isVegan ?? false,
            producer: currentItem.producer || "",
            grapeVariety: currentItem.grapeVariety?.join(", ") || "",
            vintage: currentItem.vintage?.toString() || "",
            region: currentItem.region || "",
            servingOptions: currentItem.servingOptions
              ? JSON.stringify(currentItem.servingOptions)
              : "",
            suggestedPairingsText:
              currentItem.suggestedPairingsText?.join(", ") || "",
          });

          // Initialize serving options array for wine items
          if (itemType === "wine" && currentItem.servingOptions) {
            setServingOptionsArray(
              currentItem.servingOptions.map((option) => ({
                size: option.size,
                price: option.price.toString(),
              }))
            );
          } else {
            setServingOptionsArray([]);
          }

          // Auto-expand sections with content for wine items
          if (itemType === "wine") {
            setIsDescriptionExpanded(!!currentItem.description);
            setIsServingOptionsExpanded(!!currentItem.servingOptions?.length);
          } else {
            setIsDescriptionExpanded(false);
            setIsServingOptionsExpanded(false);
          }

          setFormError(null);

          // If the current item's category (after title-casing) isn't in the availableCategories prop (also title-cased for comparison),
          // add it to tempCategories so it appears in the dropdown. This ensures the current category is selectable.
          const titleCasedAvailableCategories = availableCategories
            ? availableCategories.map((cat) => toTitleCase(cat))
            : [];
          if (
            categoryToSet &&
            !titleCasedAvailableCategories.includes(categoryToSet)
          ) {
            // This updates tempCategories. It's okay if availableCategories changes and this runs again,
            // as setTempCategories will handle duplicates if any.
            setTempCategories((prevTemp) => {
              if (!prevTemp.includes(categoryToSet)) {
                return [...new Set([...prevTemp, categoryToSet])].sort();
              }
              return prevTemp;
            });
          }
        } catch (_error) {
          setFormError("Failed to load item data for editing.");
        }
      } else if (!isEditMode) {
        // Reset for add mode
        setFormData({
          ...baseInitialFormData,
          menuId: menuId,
          itemType: itemType, // Use itemType from prop
        });
        setServingOptionsArray([]);
        setIsDescriptionExpanded(false);
        setIsServingOptionsExpanded(false);
        setFormError(null);
      }
    }
  }, [
    currentItem,
    isEditMode,
    isOpen,
    menuId,
    itemType, // Add itemType to dependencies
    availableCategories, // Primary dependencies for form initialization and category setup
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

  // Serving options handlers for wine items
  const addServingOption = () => {
    setServingOptionsArray((prev) => [...prev, { size: "", price: "" }]);
  };

  const removeServingOption = (index: number) => {
    setServingOptionsArray((prev) => prev.filter((_, i) => i !== index));
  };

  const updateServingOption = (
    index: number,
    field: "size" | "price",
    value: string
  ) => {
    setServingOptionsArray((prev) =>
      prev.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      )
    );
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

    // Wine-specific validation
    if (itemType === "wine") {
      if (
        formData.vintage &&
        (isNaN(parseInt(formData.vintage)) ||
          parseInt(formData.vintage) < 1800 ||
          parseInt(formData.vintage) > 2030)
      ) {
        setFormError("Vintage must be a valid year between 1800 and 2030.");
        return;
      }

      // Validate serving options for wine items
      for (let i = 0; i < servingOptionsArray.length; i++) {
        const option = servingOptionsArray[i];
        if (option.size && !option.price) {
          setFormError(
            `Serving option ${i + 1}: Price is required when size is specified.`
          );
          return;
        }
        if (option.price && !option.size) {
          setFormError(
            `Serving option ${i + 1}: Size is required when price is specified.`
          );
          return;
        }
        if (
          option.price &&
          (isNaN(parseFloat(option.price)) || parseFloat(option.price) < 0)
        ) {
          setFormError(
            `Serving option ${
              i + 1
            }: Price must be a valid non-negative number.`
          );
          return;
        }
      }
    }

    const dataToSubmit: MenuItemFormData = {
      ...formData,
      category: finalCategory, // Ensure the correct category is submitted
    };

    // For wine items, convert serving options array to proper format
    if (itemType === "wine") {
      const validServingOptions = servingOptionsArray
        .filter((option) => option.size.trim() && option.price.trim())
        .map((option) => ({
          size: option.size.trim(),
          price: parseFloat(option.price),
        }));
      dataToSubmit.servingOptions = JSON.stringify(validServingOptions);
    }

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

        {/* Wine-specific fields in new order */}
        {itemType === "wine" && (
          <>
            {/* Grape Variety */}
            <div>
              <label
                htmlFor="grapeVariety"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Grape Variety{" "}
                <span className="text-sm text-slate-500">
                  (comma-separated, optional)
                </span>
              </label>
              <input
                type="text"
                id="grapeVariety"
                name="grapeVariety"
                value={formData.grapeVariety}
                onChange={handleInputChange}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                placeholder="e.g., Chardonnay, Pinot Noir"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vintage */}
              <div>
                <label
                  htmlFor="vintage"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Vintage{" "}
                  <span className="text-sm text-slate-500">(optional)</span>
                </label>
                <input
                  type="number"
                  id="vintage"
                  name="vintage"
                  value={formData.vintage}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="e.g., 2020"
                  min="1800"
                  max="2030"
                  disabled={isSubmitting}
                />
              </div>

              {/* Producer */}
              <div>
                <label
                  htmlFor="producer"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Producer{" "}
                  <span className="text-sm text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  id="producer"
                  name="producer"
                  value={formData.producer}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                  placeholder="e.g., Château Margaux"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Region */}
            <div>
              <label
                htmlFor="region"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Region{" "}
                <span className="text-sm text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                placeholder="e.g., Bordeaux, France"
                disabled={isSubmitting}
              />
            </div>

            {/* Suggested Food Pairings */}
            <div>
              <label
                htmlFor="suggestedPairingsText"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Suggested Food Pairings{" "}
                <span className="text-sm text-slate-500">
                  (comma-separated, optional)
                </span>
              </label>
              <input
                type="text"
                id="suggestedPairingsText"
                name="suggestedPairingsText"
                value={formData.suggestedPairingsText}
                onChange={handleInputChange}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                placeholder="e.g., Grilled salmon, Roasted chicken"
                disabled={isSubmitting}
              />
            </div>
          </>
        )}

        {/* Category - Show for all item types but positioned after wine fields for wine items */}
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
              disabled={isSubmitting || (!isAddingNewCategory && !itemType)}
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
                name="newCategoryName"
                value={newCategoryName}
                onChange={handleInputChange}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out"
                placeholder="Enter new category name"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
        )}

        {/* Description - Expandable section */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">
              Description{" "}
              <span className="text-sm text-slate-500">(optional)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-sky-600 hover:text-sky-700 text-sm font-medium flex items-center gap-1"
            >
              {isDescriptionExpanded ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  Expand
                </>
              )}
            </button>
          </div>

          {isDescriptionExpanded && (
            <div className="mt-2">
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
          )}
        </div>

        {/* Wine Serving Options - Expandable section */}
        {itemType === "wine" && (
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                Serving Options{" "}
                <span className="text-sm text-slate-500">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setIsServingOptionsExpanded(!isServingOptionsExpanded)
                }
                className="text-sky-600 hover:text-sky-700 text-sm font-medium flex items-center gap-1"
              >
                {isServingOptionsExpanded ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    Collapse
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    Expand
                  </>
                )}
              </button>
            </div>

            {isServingOptionsExpanded && (
              <div className="mt-3 space-y-4">
                {servingOptionsArray.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                            Size
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                            Price
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {servingOptionsArray.map((option, index) => (
                          <tr key={index} className="bg-white">
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={option.size}
                                onChange={(e) =>
                                  updateServingOption(
                                    index,
                                    "size",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                placeholder="e.g., Glass, Bottle, Half Bottle"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={option.price}
                                onChange={(e) =>
                                  updateServingOption(
                                    index,
                                    "price",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => removeServingOption(index)}
                                disabled={isSubmitting}
                                className="text-xs px-2 py-1"
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={addServingOption}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  Add Serving Option
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Non-wine fields */}
        {itemType !== "wine" && (
          <>
            {/* Ingredients / Grape Variety */}
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

            {/* Description for non-wine items (always visible) */}
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
          </>
        )}

        {/* Price - Hidden for wine items */}
        {itemType !== "wine" && (
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
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="e.g., 12.99"
              step="0.01"
              min="0"
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Dietary Flags - Hidden for wine items */}
        {itemType !== "wine" && (
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
        )}
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

const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default AddEditMenuItemModal;
