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
  // Basic fields
  name: "",
  description: "",
  price: "",
  ingredients: "",
  itemType: "" as "" | "food" | "beverage" | "wine",
  category: "",

  // Dietary flags
  isGlutenFree: false,
  isDairyFree: false,
  isVegetarian: false,
  isVegan: false,

  // Food-specific enhancement fields
  cookingMethods: "",
  allergens: "",
  isSpicy: false,

  // Beverage-specific enhancement fields
  spiritType: "",
  beerStyle: "",
  cocktailIngredients: "",
  alcoholContent: "",
  servingStyle: "",
  isNonAlcoholic: false,
  temperature: "",

  // Wine-specific fields
  wineStyle: "",
  wineColor: "",
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
  isSubmitting: boolean;
  availableCategories?: string[]; // New prop for unique categories from the menu
  itemType: "food" | "beverage" | "wine"; // Add itemType as required prop
}

const AddEditMenuItemModal: React.FC<AddEditMenuItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentItem,
  menuId,
  isSubmitting,
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

  // State for expandable sections
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(true);
  const [isEnhancementFieldsExpanded, setIsEnhancementFieldsExpanded] =
    useState(false);
  const [isServingOptionsExpanded, setIsServingOptionsExpanded] =
    useState(false);
  const [isDietaryInfoExpanded, setIsDietaryInfoExpanded] = useState(false);

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

  // Add useEffect to handle pending item type
  useEffect(() => {
    const pendingItemType = localStorage.getItem("pendingItemType");
    if (pendingItemType && !currentItem) {
      // Set the item type from localStorage for new items
      setFormData((prev) => ({
        ...prev,
        itemType: pendingItemType as "food" | "beverage" | "wine",
      }));
      localStorage.removeItem("pendingItemType");
    }
  }, [currentItem]);

  useEffect(() => {
    // console.log("[Modal useEffect] Running. isEditMode:", isEditMode, "currentItem:", !!currentItem, "isOpen:", isOpen);
    if (isOpen) {
      // Always reset tempCategories when modal opens for a fresh start with category handling
      setTempCategories([]);

      if (isEditMode && currentItem) {
        try {
          const categoryToSet = currentItem.category || "";
          setFormData({
            ...baseInitialFormData,
            menuId: menuId,
            name: currentItem.name,
            description: currentItem.description || "",
            price: currentItem.price?.toString() || "",
            ingredients: currentItem.ingredients?.join(", ") || "",
            itemType: itemType, // Use itemType from prop instead of currentItem
            category: categoryToSet,

            // Dietary flags
            isGlutenFree: currentItem.isGlutenFree ?? false,
            isDairyFree: currentItem.isDairyFree ?? false,
            isVegetarian: currentItem.isVegetarian ?? false,
            isVegan: currentItem.isVegan ?? false,

            // Food-specific enhancement fields
            cookingMethods: currentItem.cookingMethods?.join(", ") || "",
            allergens: currentItem.allergens?.join(", ") || "",
            isSpicy: currentItem.isSpicy ?? false,

            // Beverage-specific enhancement fields
            spiritType: currentItem.spiritType || "",
            beerStyle: currentItem.beerStyle || "",
            cocktailIngredients:
              currentItem.cocktailIngredients?.join(", ") || "",
            alcoholContent: currentItem.alcoholContent || "",
            servingStyle: currentItem.servingStyle || "",
            isNonAlcoholic: currentItem.isNonAlcoholic ?? false,
            temperature: currentItem.temperature || "",

            // Wine-specific fields
            wineStyle: currentItem.wineStyle || "",
            wineColor: currentItem.wineColor || "",
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

          // Auto-expand sections with content
          setIsBasicInfoExpanded(true);
          setIsEnhancementFieldsExpanded(
            !!(
              currentItem.cookingMethods?.length ||
              currentItem.allergens?.length ||
              currentItem.spiritType ||
              currentItem.beerStyle ||
              currentItem.cocktailIngredients?.length ||
              currentItem.alcoholContent ||
              currentItem.servingStyle ||
              currentItem.temperature
            )
          );
          setIsServingOptionsExpanded(
            itemType === "wine" && !!currentItem.servingOptions?.length
          );
          setIsDietaryInfoExpanded(
            !!(
              currentItem.isGlutenFree ||
              currentItem.isDairyFree ||
              currentItem.isVegetarian ||
              currentItem.isVegan ||
              currentItem.isSpicy ||
              currentItem.isNonAlcoholic
            )
          );

          setFormError(null);

          // If the current item's category isn't in the availableCategories prop,
          // add it to tempCategories so it appears in the dropdown. This ensures the current category is selectable.
          if (
            categoryToSet &&
            availableCategories &&
            !availableCategories.includes(categoryToSet)
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
        } catch {
          setFormError("Failed to load item data for editing.");
        }
      } else if (!isEditMode) {
        // Reset for add mode
        // Check if there's a pending category from localStorage
        const pendingCategory = localStorage.getItem("pendingItemCategory");
        const categoryToUse = pendingCategory || "";

        // Clear the pending category after using it
        if (pendingCategory) {
          localStorage.removeItem("pendingItemCategory");
        }

        setFormData({
          ...baseInitialFormData,
          menuId: menuId,
          itemType: itemType, // Use itemType from prop
          category: categoryToUse, // Pre-populate with pending category
        });
        setServingOptionsArray([]);
        setIsBasicInfoExpanded(true);
        setIsEnhancementFieldsExpanded(false);
        setIsServingOptionsExpanded(false);
        setIsDietaryInfoExpanded(false);
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
      // Wine style is required for wine items
      if (!formData.wineStyle?.trim()) {
        setFormError("Wine style is required for wine items.");
        return;
      }

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Menu Item" : "Add New Menu Item"}
      size="xl"
    >
      {formError && <ErrorMessage message={formError} />}
      <form
        onSubmit={handleSubmit}
        id="add-edit-item-form"
        className="space-y-6"
      >
        {/* Basic Information Section */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
          >
            <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Basic Information
            </h3>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${
                isBasicInfoExpanded ? "transform rotate-180" : ""
              }`}
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
          </div>

          {isBasicInfoExpanded && (
            <div className="p-4 space-y-6 bg-white">
              {/* Item Name */}
              <div>
                <label
                  htmlFor="itemName"
                  className="block text-sm font-medium text-slate-700 mb-2"
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

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700 mb-2"
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
                  placeholder="Describe this item..."
                  disabled={isSubmitting}
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="itemCategory"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    id="itemCategory"
                    name="category"
                    value={
                      isAddingNewCategory
                        ? "_add_new_category_"
                        : formData.category
                    }
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                    disabled={
                      isSubmitting || (!isAddingNewCategory && !itemType)
                    }
                    required={!isAddingNewCategory}
                  >
                    <option value="">Select or Add Category...</option>
                    {combinedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="_add_new_category_">
                      Add New Category...
                    </option>
                  </select>
                </div>
              </div>

              {isAddingNewCategory && (
                <div className="p-4 border border-sky-200 bg-sky-50 rounded-lg">
                  <label
                    htmlFor="newCategoryName"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    New Category Name <span className="text-red-500">*</span>
                  </label>
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
              )}

              {/* Price - Hidden for wine items */}
              {itemType !== "wine" && (
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Price{" "}
                    <span className="text-sm text-slate-500">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                      £
                    </span>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="appearance-none block w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Basic Ingredients for non-wine items */}
              {itemType !== "wine" && (
                <div>
                  <label
                    htmlFor="ingredients"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Key Ingredients{" "}
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
              )}
            </div>
          )}
        </div>

        {/* Item Type Specific Enhancement Fields */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() =>
              setIsEnhancementFieldsExpanded(!isEnhancementFieldsExpanded)
            }
          >
            <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                />
              </svg>
              {itemType === "wine"
                ? "Wine Details"
                : itemType === "beverage"
                ? "Beverage Details"
                : "Food Details"}
            </h3>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${
                isEnhancementFieldsExpanded ? "transform rotate-180" : ""
              }`}
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
          </div>

          {isEnhancementFieldsExpanded && (
            <div className="p-4 space-y-6 bg-white">
              {/* Wine-specific fields */}
              {itemType === "wine" && (
                <>
                  {/* Wine Style - Required for wine items */}
                  <div>
                    <label
                      htmlFor="wineStyle"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Wine Style <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="wineStyle"
                      name="wineStyle"
                      value={formData.wineStyle}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">Select wine style...</option>
                      <option value="still">Still</option>
                      <option value="sparkling">Sparkling</option>
                      <option value="champagne">Champagne</option>
                      <option value="dessert">Dessert</option>
                      <option value="fortified">Fortified</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Wine Color - Variety Type */}
                  <div>
                    <label
                      htmlFor="wineColor"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Variety Type{" "}
                      <span className="text-sm text-slate-500">(optional)</span>
                    </label>
                    <select
                      id="wineColor"
                      name="wineColor"
                      value={formData.wineColor}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                      disabled={isSubmitting}
                    >
                      <option value="">Select variety type...</option>
                      <option value="red">Red Wine</option>
                      <option value="white">White Wine</option>
                      <option value="rosé">Rosé Wine</option>
                      <option value="sparkling">Sparkling Wine</option>
                      <option value="champagne">Champagne</option>
                      <option value="cava">Cava</option>
                      <option value="crémant">Crémant</option>
                      <option value="orange">Orange Wine</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Grape Variety */}
                  <div>
                    <label
                      htmlFor="grapeVariety"
                      className="block text-sm font-medium text-slate-700 mb-2"
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
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Vintage{" "}
                        <span className="text-sm text-slate-500">
                          (optional)
                        </span>
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
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Producer{" "}
                        <span className="text-sm text-slate-500">
                          (optional)
                        </span>
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
                      className="block text-sm font-medium text-slate-700 mb-2"
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
                      className="block text-sm font-medium text-slate-700 mb-2"
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

              {/* Food-specific enhancement fields */}
              {itemType === "food" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cooking Methods */}
                    <div>
                      <label
                        htmlFor="cookingMethods"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Cooking Methods{" "}
                        <span className="text-sm text-slate-500">
                          (comma-separated, optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="cookingMethods"
                        name="cookingMethods"
                        value={formData.cookingMethods}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                        placeholder="e.g., Grilled, Baked, Steamed"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Allergens */}
                    <div>
                      <label
                        htmlFor="allergens"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Allergens{" "}
                        <span className="text-sm text-slate-500">
                          (comma-separated, optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="allergens"
                        name="allergens"
                        value={formData.allergens}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                        placeholder="e.g., Nuts, Dairy, Gluten"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Beverage-specific enhancement fields */}
              {itemType === "beverage" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Spirit Type */}
                    <div>
                      <label
                        htmlFor="spiritType"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Spirit Type{" "}
                        <span className="text-sm text-slate-500">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="spiritType"
                        name="spiritType"
                        value={formData.spiritType}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                        placeholder="e.g., Vodka, Gin, Rum"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Beer Style */}
                    <div>
                      <label
                        htmlFor="beerStyle"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Beer Style{" "}
                        <span className="text-sm text-slate-500">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="beerStyle"
                        name="beerStyle"
                        value={formData.beerStyle}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                        placeholder="e.g., IPA, Lager, Stout"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Alcohol Content */}
                    <div>
                      <label
                        htmlFor="alcoholContent"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Alcohol Content{" "}
                        <span className="text-sm text-slate-500">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="alcoholContent"
                        name="alcoholContent"
                        value={formData.alcoholContent}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                        placeholder="e.g., 5.2% ABV, 40% vol"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Serving Style */}
                    <div>
                      <label
                        htmlFor="servingStyle"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Serving Style{" "}
                        <span className="text-sm text-slate-500">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="servingStyle"
                        name="servingStyle"
                        value={formData.servingStyle}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                        placeholder="e.g., Neat, On the rocks, Shaken"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Cocktail Ingredients */}
                  <div>
                    <label
                      htmlFor="cocktailIngredients"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Cocktail Ingredients{" "}
                      <span className="text-sm text-slate-500">
                        (comma-separated, optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      id="cocktailIngredients"
                      name="cocktailIngredients"
                      value={formData.cocktailIngredients}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                      placeholder="e.g., Vodka, Lime juice, Mint"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <label
                      htmlFor="temperature"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Temperature{" "}
                      <span className="text-sm text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      id="temperature"
                      name="temperature"
                      value={formData.temperature}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50"
                      placeholder="e.g., Hot, Cold, Iced, Frozen"
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}
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

        {/* Dietary Information Section */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setIsDietaryInfoExpanded(!isDietaryInfoExpanded)}
          >
            <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Dietary & Special Information
            </h3>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${
                isDietaryInfoExpanded ? "transform rotate-180" : ""
              }`}
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
          </div>

          {isDietaryInfoExpanded && (
            <div className="p-4 space-y-6 bg-white">
              {/* Common dietary flags */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Dietary Restrictions{" "}
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
                          formData[
                            flag.name as keyof MenuItemFormData
                          ] as boolean
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

              {/* Special characteristics */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Special Characteristics{" "}
                  <span className="text-xs text-slate-500">(optional)</span>
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  {/* Spicy for food items */}
                  {itemType === "food" && (
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        id="isSpicy"
                        name="isSpicy"
                        checked={formData.isSpicy}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-slate-700">Spicy</span>
                    </label>
                  )}

                  {/* Non-alcoholic for beverages */}
                  {itemType === "beverage" && (
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        id="isNonAlcoholic"
                        name="isNonAlcoholic"
                        checked={formData.isNonAlcoholic}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-slate-700">
                        Non-Alcoholic
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !!formError}
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
      </div>

      {/* Sub-Modal for Adding New Category */}
      {isNewCategoryInputModalOpen && (
        <Modal
          isOpen={isNewCategoryInputModalOpen}
          onClose={() => setIsNewCategoryInputModalOpen(false)}
          title="Add New Category"
          size="sm" // Smaller modal for simple input
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
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setIsNewCategoryInputModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveNewCategory}>
                Save Category
              </Button>
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
