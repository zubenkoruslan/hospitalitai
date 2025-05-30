import React, { useState, useEffect, Fragment } from "react";
import * as MenuUploadTypes from "../../types/menuUploadTypes"; // Use namespace import
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon, // For Edit
  TrashIcon, // For Delete
} from "@heroicons/react/24/solid"; // Icons for expand/collapse
import { normalizeCategory } from "../../utils/stringUtils"; // Import the shared utility
import { v4 as uuidv4 } from "uuid"; // Import uuid

// Explicitly define EditableItem to ensure all fields, including optional wine fields, are recognized.
interface EditableItem
  extends Omit<
    MenuUploadTypes.ParsedMenuItem,
    "fields" | "userAction" | "importAction"
  > {
  fields: MenuUploadTypes.ParsedMenuItem["fields"]; // This will pull in all fields, including optional wine ones
  userAction: "keep" | "ignore";
  importAction: MenuUploadTypes.ParsedMenuItem["importAction"];
}

interface EditableMenuTableProps {
  groupedItems: Record<string, MenuUploadTypes.ParsedMenuItem[]>;
  categoryOrder: string[];
  expandedCategories: Record<string, boolean>;
  toggleCategoryExpansion: (categoryKey: string) => void;
  onItemsChange: (updatedItems: MenuUploadTypes.ParsedMenuItem[]) => void; // Output items are still ParsedMenuItem
  availableCategories?: string[]; // Added availableCategories prop
  onRenameCategory: (oldName: string, newName: string) => void; // New prop
  onDeleteCategory: (categoryName: string) => void; // New prop
  onItemMove: (
    itemId: string,
    newCategoryKey: string,
    oldCategoryKey: string
  ) => void; // New prop for item move
}

const EditableMenuTable: React.FC<EditableMenuTableProps> = ({
  groupedItems,
  categoryOrder,
  expandedCategories,
  toggleCategoryExpansion,
  onItemsChange,
  availableCategories = [], // Default to empty array
  onRenameCategory, // New prop
  onDeleteCategory, // New prop
  onItemMove, // New prop
}) => {
  const [allEditableItems, setAllEditableItems] = useState<EditableItem[]>([]);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(
    null
  );
  const [currentEditValue, setCurrentEditValue] = useState<string>("");
  const [draggingOverCategory, setDraggingOverCategory] = useState<
    string | null
  >(null);

  useEffect(() => {
    const flatItems: MenuUploadTypes.ParsedMenuItem[] = [];
    categoryOrder.forEach((catKey) => {
      if (groupedItems[catKey]) {
        flatItems.push(...groupedItems[catKey]);
      }
    });

    setAllEditableItems(
      flatItems.map((item): EditableItem => {
        const determinedUserAction = item.userAction || "keep";
        const determinedImportAction = (item.importAction ||
          (determinedUserAction === "ignore"
            ? "skip"
            : item.conflictResolution?.status === "no_conflict"
            ? "create"
            : item.conflictResolution?.status === "update_candidate" &&
              item.conflictResolution.existingItemId
            ? "update"
            : undefined)) as MenuUploadTypes.ParsedMenuItem["importAction"];

        // Revert to spreading fields; explicit listing didn't solve the root type issue
        return {
          ...item,
          fields: { ...item.fields },
          userAction: determinedUserAction,
          importAction: determinedImportAction,
        };
      })
    );
  }, [groupedItems, categoryOrder]);

  const validateField = (
    fieldName: keyof MenuUploadTypes.ParsedMenuItem["fields"],
    value:
      | string
      | number
      | boolean
      | string[]
      | MenuUploadTypes.WineServingOption[]
      | null
  ): { isValid: boolean; errorMessage?: string } => {
    switch (fieldName) {
      case "name":
        if (!value || String(value).trim() === "") {
          return { isValid: false, errorMessage: "Name is required." };
        }
        if (String(value).length > 100) {
          // Example max length
          return {
            isValid: false,
            errorMessage: "Name cannot exceed 100 characters.",
          };
        }
        break;
      case "price":
        if (value !== null && value !== "" && Number(value) < 0) {
          return { isValid: false, errorMessage: "Price cannot be negative." };
        }
        // Check if it's a valid number format if not null or empty
        if (value !== null && value !== "" && isNaN(Number(value))) {
          return {
            isValid: false,
            errorMessage: "Price must be a valid number.",
          };
        }
        break;
      case "wineVintage":
        if (
          value !== null &&
          value !== "" &&
          (isNaN(Number(value)) ||
            Number(value) < 1000 ||
            Number(value) > new Date().getFullYear() + 10)
        ) {
          return { isValid: false, errorMessage: "Enter a valid year." };
        }
        break;
      case "wineServingOptions": // For the field itself, assume valid if it's an array or null. Individual options validated elsewhere.
        if (value !== null && !Array.isArray(value)) {
          return {
            isValid: false,
            errorMessage: "Serving options should be a list.",
          };
        }
        break;
      // For other wine string fields like wineProducer, wineRegion, wineGrapeVariety, winePairings, wineStyle
      // we can rely on general string length validation if needed, or assume valid if not empty.
      // For now, no specific validation beyond what might be implicitly handled by string inputs.
      default:
        break;
    }
    return { isValid: true };
  };

  const handleFieldChange = (
    itemId: string,
    fieldName: keyof MenuUploadTypes.ParsedMenuItem["fields"],
    newValue:
      | string
      | number
      | boolean
      | string[]
      | MenuUploadTypes.WineServingOption[]
      | null
  ) => {
    // For fields other than wineServingOptions, newValue will not be WineServingOption[]
    // So, we cast it for the call to validateField for these cases.
    const valueForGeneralValidation =
      fieldName === "wineServingOptions"
        ? newValue
        : (newValue as string | number | boolean | string[] | null);

    const validationResult = validateField(
      fieldName,
      valueForGeneralValidation
    );

    const updatedAllItems = allEditableItems.map((item) => {
      if (item.id === itemId) {
        const newFields = { ...item.fields };

        if (fieldName === "wineServingOptions") {
          newFields[fieldName] = {
            ...(newFields[fieldName] as
              | MenuUploadTypes.ParsedWineServingOptionsField
              | undefined),
            value: newValue as MenuUploadTypes.WineServingOption[] | null,
            isValid: validationResult.isValid,
            errorMessage: validationResult.errorMessage,
          };
        } else {
          // Here, newValue is one of string | number | boolean | string[] | null
          newFields[fieldName] = {
            ...(newFields[fieldName] as
              | MenuUploadTypes.ParsedMenuItemField
              | undefined),
            value: newValue as string | number | boolean | string[] | null, // Assert more specific type
            isValid: validationResult.isValid,
            errorMessage: validationResult.errorMessage,
          };
        }

        let newStatus: MenuUploadTypes.ItemStatus = item.status;
        if (validationResult.isValid) {
          if (
            item.status === "new" ||
            item.status === "edited" ||
            item.status === "error_client_validation"
          ) {
            newStatus = "edited";
          }
        } else {
          newStatus = "error_client_validation";
        }

        return {
          ...item,
          fields: newFields,
          status: newStatus,
        } as EditableItem;
      }
      return item;
    });
    setAllEditableItems(updatedAllItems);
    onItemsChange(updatedAllItems as MenuUploadTypes.ParsedMenuItem[]);
  };

  const handleUserActionChange = (
    itemId: string,
    action: "keep" | "ignore"
  ) => {
    const updatedAllItems = allEditableItems.map((item) => {
      if (item.id === itemId) {
        const newImportAction: MenuUploadTypes.ParsedMenuItem["importAction"] =
          action === "ignore"
            ? "skip"
            : item.conflictResolution?.status === "no_conflict"
            ? "create"
            : item.conflictResolution?.status === "update_candidate" &&
              item.conflictResolution.existingItemId
            ? "update"
            : undefined;
        return {
          ...item,
          userAction: action,
          importAction: newImportAction,
        } as EditableItem;
      }
      return item;
    });
    setAllEditableItems(updatedAllItems);
    onItemsChange(updatedAllItems as MenuUploadTypes.ParsedMenuItem[]);
  };

  const handleImportActionChange = (
    itemId: string,
    action: MenuUploadTypes.ParsedMenuItem["importAction"],
    existingIdToUpdate?: string
  ) => {
    const updatedAllItems = allEditableItems.map((item) =>
      item.id === itemId
        ? ({
            ...item,
            importAction: action,
            existingItemId:
              action === "update" ? existingIdToUpdate : item.existingItemId,
          } as EditableItem)
        : item
    );
    setAllEditableItems(updatedAllItems);
    onItemsChange(updatedAllItems as MenuUploadTypes.ParsedMenuItem[]);
  };

  const handleStartEditCategory = (categoryKey: string) => {
    setEditingCategoryKey(categoryKey);
    setCurrentEditValue(categoryKey); // Initialize with current name
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryKey(null);
    setCurrentEditValue("");
  };

  const handleSaveCategoryName = (oldName: string) => {
    if (currentEditValue.trim() === "") {
      alert("Category name cannot be empty.");
      return;
    }
    const normalizedNewName = normalizeCategory(currentEditValue.trim());
    if (normalizedNewName === oldName) {
      // No actual change
      handleCancelEditCategory();
      return;
    }
    // Check if new name (excluding current oldName) already exists in availableCategories
    if (
      availableCategories
        .filter((cat) => cat !== oldName)
        .includes(normalizedNewName)
    ) {
      alert(`Category "${normalizedNewName}" already exists.`);
      return;
    }
    onRenameCategory(oldName, normalizedNewName);
    handleCancelEditCategory();
  };

  const handleDragStartItem = (
    event: React.DragEvent<HTMLTableRowElement>,
    itemId: string,
    originalCategoryKey: string
  ) => {
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ itemId, originalCategoryKey })
    );
    event.dataTransfer.effectAllowed = "move";
    // Optional: add a class to the dragged element for visual feedback
    // event.currentTarget.classList.add('dragging-item');
  };

  const handleDragOverCategory = (
    event: React.DragEvent<HTMLDivElement>,
    categoryKey: string
  ) => {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer.dropEffect = "move";
    setDraggingOverCategory(categoryKey);
  };

  const handleDragLeaveCategory = () => {
    setDraggingOverCategory(null);
  };

  const handleDropOnCategory = (
    event: React.DragEvent<HTMLDivElement>,
    targetCategoryKey: string
  ) => {
    event.preventDefault();
    setDraggingOverCategory(null);
    try {
      const data = event.dataTransfer.getData("application/json");
      if (!data) return;
      const { itemId, originalCategoryKey } = JSON.parse(data) as {
        itemId: string;
        originalCategoryKey: string;
      };

      if (
        itemId &&
        originalCategoryKey &&
        targetCategoryKey !== originalCategoryKey
      ) {
        onItemMove(itemId, targetCategoryKey, originalCategoryKey);
      }
    } catch (e) {
      console.error("Error parsing dragged item data:", e);
    }
    // Optional: remove class from dragged element if added in onDragStart
    // const draggedElement = document.querySelector('.dragging-item');
    // draggedElement?.classList.remove('dragging-item');
  };

  const addServingOption = (itemId: string) => {
    const updatedAllItems = allEditableItems.map((item) => {
      if (item.id === itemId && item.fields.itemType.value === "wine") {
        const newOption: MenuUploadTypes.WineServingOption = {
          id: uuidv4(),
          size: "",
          price: "",
          isValidSize: true, // Default to true, will be validated on change
          isValidPrice: true, // Default to true
        };

        const wineServingOptionsField =
          item.fields.wineServingOptions ||
          ({
            value: [],
            isValid: true,
            errorMessage: undefined,
          } as MenuUploadTypes.ParsedWineServingOptionsField);

        const currentOptions = (wineServingOptionsField.value || []).filter(
          (opt: MenuUploadTypes.WineServingOption | null) => opt !== null
        ) as MenuUploadTypes.WineServingOption[];
        const updatedOptions = [...currentOptions, newOption];

        return {
          ...item,
          fields: {
            ...item.fields,
            wineServingOptions: {
              ...wineServingOptionsField,
              value: updatedOptions,
              isValid: true, // Consider more robust validation here
            },
          },
        } as EditableItem;
      }
      return item;
    });
    setAllEditableItems(updatedAllItems);
    onItemsChange(updatedAllItems as MenuUploadTypes.ParsedMenuItem[]);
  };

  const removeServingOption = (itemId: string, optionId: string) => {
    const updatedAllItems = allEditableItems.map((item) => {
      if (item.id === itemId && item.fields.itemType.value === "wine") {
        const currentOptions = (item.fields.wineServingOptions?.value ||
          []) as MenuUploadTypes.WineServingOption[];
        const updatedOptions = currentOptions.filter(
          (opt: MenuUploadTypes.WineServingOption) => opt.id !== optionId
        );

        // Overall validity of the serving options field (e.g., if all individual options are valid)
        const areAllRemainingOptionsValid = updatedOptions.every(
          (opt) =>
            (opt.isValidSize === undefined || opt.isValidSize) &&
            (opt.isValidPrice === undefined || opt.isValidPrice)
        );

        return {
          ...item,
          fields: {
            ...item.fields,
            wineServingOptions: {
              ...(item.fields.wineServingOptions || {
                value: [] as MenuUploadTypes.WineServingOption[],
                isValid: true, // This isValid is for the whole field
              }),
              value: updatedOptions,
              isValid: areAllRemainingOptionsValid, // Update field validity
              errorMessage: areAllRemainingOptionsValid
                ? undefined
                : "One or more serving options are invalid.",
            },
          },
        } as EditableItem;
      }
      return item;
    });
    setAllEditableItems(updatedAllItems);
    onItemsChange(updatedAllItems as MenuUploadTypes.ParsedMenuItem[]);
  };

  const handleServingOptionChange = (
    itemId: string,
    optionId: string,
    field: "size" | "price",
    newValue: string
  ) => {
    let overallItemIsValid = true;
    const updatedAllItems = allEditableItems.map((item) => {
      if (item.id === itemId && item.fields.itemType.value === "wine") {
        const currentOptions = (item.fields.wineServingOptions?.value ||
          []) as MenuUploadTypes.WineServingOption[];

        const updatedOptions = currentOptions.map(
          (opt: MenuUploadTypes.WineServingOption) => {
            if (opt.id === optionId) {
              let updatedOpt = { ...opt, [field]: newValue };
              let fieldIsValid = true;
              let fieldErrorMessage: string | undefined = undefined;

              if (field === "price") {
                if (newValue.trim() === "") {
                  // Allow empty price for now, could be made invalid if required
                  fieldIsValid = true;
                } else {
                  const priceNum = parseFloat(newValue);
                  if (isNaN(priceNum) || priceNum < 0) {
                    fieldIsValid = false;
                    fieldErrorMessage = "Price must be a non-negative number.";
                  }
                }
                updatedOpt = {
                  ...updatedOpt,
                  isValidPrice: fieldIsValid,
                  priceErrorMessage: fieldErrorMessage,
                };
              }

              if (field === "size") {
                if (newValue.trim() === "") {
                  fieldIsValid = false;
                  fieldErrorMessage = "Size cannot be empty.";
                } else {
                  fieldIsValid = true; // Basic validation, could add length etc.
                }
                updatedOpt = {
                  ...updatedOpt,
                  isValidSize: fieldIsValid,
                  sizeErrorMessage: fieldErrorMessage,
                };
              }
              return updatedOpt;
            }
            return opt;
          }
        );

        const areAllOptionsNowValid = updatedOptions.every(
          (opt) =>
            (opt.isValidSize === undefined || opt.isValidSize) &&
            (opt.isValidPrice === undefined || opt.isValidPrice)
        );

        overallItemIsValid = areAllOptionsNowValid;

        return {
          ...item,
          fields: {
            ...item.fields,
            wineServingOptions: {
              ...(item.fields.wineServingOptions || {
                value: [] as MenuUploadTypes.WineServingOption[],
                isValid: true,
              }),
              value: updatedOptions,
              isValid: areAllOptionsNowValid,
              errorMessage: areAllOptionsNowValid
                ? undefined
                : "One or more serving options have errors.", // More generic message for the field
            },
          },
        } as EditableItem;
      }
      return item;
    });
    setAllEditableItems(updatedAllItems);
    onItemsChange(updatedAllItems as MenuUploadTypes.ParsedMenuItem[]);
  };

  if (categoryOrder.length === 0 || Object.keys(groupedItems).length === 0) {
    return (
      <p className="text-gray-600 py-4">No menu items to display or edit.</p>
    );
  }

  const inputBaseClasses =
    "block w-full text-sm p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500";
  const invalidInputClasses =
    "border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500";
  const validInputClasses = "border-gray-300 text-gray-700";

  // Table Headers
  const [expandedWineDetails, setExpandedWineDetails] = useState<
    Record<string, boolean>
  >({});
  const toggleWineDetailsExpansion = (itemId: string) => {
    setExpandedWineDetails((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Separate headers for different item types
  const foodBeverageTableHeaders = [
    "Action",
    "Name",
    "Ingredients",
    "Type",
    "Import Action / Conflict",
    "Price",
    "Status",
  ];

  const wineTableHeaders = [
    "Action",
    "Name",
    "Grapes",
    "Type",
    "Wine Style",
    "Import Action / Conflict",
    "Price",
    "Status",
  ];

  // Helper function to group items by itemType
  const groupItemsByType = (items: EditableItem[]) => {
    const foodBeverageItems = items.filter(
      (item) =>
        item.fields.itemType.value === "food" ||
        item.fields.itemType.value === "beverage"
    );
    const wineItems = items.filter(
      (item) => item.fields.itemType.value === "wine"
    );
    return { foodBeverageItems, wineItems };
  };

  const wineSpecificDetailFields = [
    {
      key: "wineProducer",
      label: "Producer",
      placeholder: "e.g. Chateau Montelena",
    },
    {
      key: "wineVintage",
      label: "Vintage",
      placeholder: "e.g. 2020",
      type: "number",
    },
    { key: "wineRegion", label: "Region", placeholder: "e.g. Napa Valley" },
    {
      key: "winePairings",
      label: "Suggested Pairings (comma-separated)",
      placeholder: "e.g. Steak, Aged Cheese",
    },
  ];

  // Render function for food/beverage items table
  const renderFoodBeverageTable = (
    items: EditableItem[],
    categoryKey: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Food & Beverage Items
        </h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {foodBeverageTableHeaders.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                    header === "Action" ? "w-24" : ""
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const isConflicted =
                item.conflictResolution &&
                item.conflictResolution.status !== "no_conflict" &&
                item.conflictResolution.status !== "error_processing_conflict";

              return (
                <tr
                  key={item.id}
                  draggable={item.userAction === "keep"}
                  onDragStart={(e) =>
                    handleDragStartItem(e, item.id, categoryKey)
                  }
                  className={`transition-colors ${
                    item.userAction === "ignore"
                      ? "bg-gray-200 opacity-70"
                      : isConflicted
                      ? "bg-red-50 hover:bg-red-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {/* Action Checkbox */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={item.userAction === "keep"}
                        onChange={(e) =>
                          handleUserActionChange(
                            item.id,
                            e.target.checked ? "keep" : "ignore"
                          )
                        }
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        aria-label={`Mark item ${item.fields.name.value} as ${
                          item.userAction === "keep" ? "ignore" : "keep"
                        }`}
                      />
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={String(item.fields.name.value || "")}
                      onChange={(e) =>
                        handleFieldChange(item.id, "name", e.target.value)
                      }
                      className={`${inputBaseClasses} ${
                        item.fields.name.isValid
                          ? validInputClasses
                          : invalidInputClasses
                      }`}
                    />
                    {!item.fields.name.isValid &&
                      item.fields.name.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">
                          {item.fields.name.errorMessage}
                        </p>
                      )}
                  </td>

                  {/* Ingredients */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={String(
                        (
                          (item.fields.ingredients.value as string[]) || []
                        ).join(", ")
                      )}
                      onChange={(e) =>
                        handleFieldChange(
                          item.id,
                          "ingredients",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter((s) => s)
                        )
                      }
                      className={`${inputBaseClasses} ${
                        item.fields.ingredients.isValid
                          ? validInputClasses
                          : invalidInputClasses
                      }`}
                    />
                    {!item.fields.ingredients.isValid &&
                      item.fields.ingredients.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">
                          {item.fields.ingredients.errorMessage}
                        </p>
                      )}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={String(item.fields.itemType.value || "")}
                      onChange={(e) =>
                        handleFieldChange(item.id, "itemType", e.target.value)
                      }
                      className={`${inputBaseClasses} ${
                        item.fields.itemType.isValid
                          ? validInputClasses
                          : invalidInputClasses
                      }`}
                    >
                      <option value="">Select...</option>
                      <option value="food">Food</option>
                      <option value="beverage">Beverage</option>
                      <option value="wine">Wine</option>
                    </select>
                    {!item.fields.itemType.isValid &&
                      item.fields.itemType.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">
                          {item.fields.itemType.errorMessage}
                        </p>
                      )}
                  </td>

                  {/* Import Action / Conflict */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {item.conflictResolution && (
                      <div
                        className={`p-1 rounded ${
                          item.conflictResolution.status === "no_conflict"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        <p>
                          <strong>Status:</strong>{" "}
                          {item.conflictResolution.status}
                        </p>
                        {item.conflictResolution.message && (
                          <p>{item.conflictResolution.message}</p>
                        )}
                        {item.conflictResolution.existingItemId && (
                          <p>
                            Existing ID: ...
                            {item.conflictResolution.existingItemId.slice(-6)}
                          </p>
                        )}
                      </div>
                    )}
                    <select
                      value={item.importAction || ""}
                      onChange={(e) =>
                        handleImportActionChange(
                          item.id,
                          e.target
                            .value as MenuUploadTypes.ParsedMenuItem["importAction"]
                        )
                      }
                      className={`${inputBaseClasses} mt-1`}
                      disabled={item.userAction === "ignore"}
                    >
                      <option value="">Select Action...</option>
                      <option value="create">Create New</option>
                      <option value="update">Update Existing</option>
                      <option value="skip">Skip This Item</option>
                    </select>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={String(
                        item.fields.price.value === null ||
                          item.fields.price.value === undefined
                          ? ""
                          : item.fields.price.value
                      )}
                      onChange={(e) =>
                        handleFieldChange(item.id, "price", e.target.value)
                      }
                      className={`${inputBaseClasses} ${
                        item.fields.price.isValid !== false
                          ? validInputClasses
                          : invalidInputClasses
                      }`}
                      placeholder="e.g. 12.99"
                      disabled={item.userAction === "ignore"}
                    />
                    {item.fields.price.isValid === false &&
                      item.fields.price.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">
                          {item.fields.price.errorMessage}
                        </p>
                      )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    {item.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Render function for wine items table
  const renderWineTable = (items: EditableItem[], categoryKey: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Wine Items</h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {wineTableHeaders.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                    header === "Action" ? "w-24" : ""
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const isConflicted =
                item.conflictResolution &&
                item.conflictResolution.status !== "no_conflict" &&
                item.conflictResolution.status !== "error_processing_conflict";

              return (
                <Fragment key={item.id}>
                  <tr
                    draggable={item.userAction === "keep"}
                    onDragStart={(e) =>
                      handleDragStartItem(e, item.id, categoryKey)
                    }
                    className={`transition-colors ${
                      item.userAction === "ignore"
                        ? "bg-gray-200 opacity-70"
                        : isConflicted
                        ? "bg-red-50 hover:bg-red-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Action Checkbox */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={item.userAction === "keep"}
                          onChange={(e) =>
                            handleUserActionChange(
                              item.id,
                              e.target.checked ? "keep" : "ignore"
                            )
                          }
                          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          aria-label={`Mark item ${item.fields.name.value} as ${
                            item.userAction === "keep" ? "ignore" : "keep"
                          }`}
                        />
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={String(item.fields.name.value || "")}
                        onChange={(e) =>
                          handleFieldChange(item.id, "name", e.target.value)
                        }
                        className={`${inputBaseClasses} ${
                          item.fields.name.isValid
                            ? validInputClasses
                            : invalidInputClasses
                        }`}
                      />
                      {!item.fields.name.isValid &&
                        item.fields.name.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">
                            {item.fields.name.errorMessage}
                          </p>
                        )}
                    </td>

                    {/* Grapes (using wineGrapeVariety instead of ingredients for wine items) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={String(
                          item.fields.wineGrapeVariety?.value || ""
                        )}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            "wineGrapeVariety",
                            e.target.value
                          )
                        }
                        className={`${inputBaseClasses} ${
                          item.fields.wineGrapeVariety?.isValid !== false
                            ? validInputClasses
                            : invalidInputClasses
                        }`}
                        placeholder="e.g. Chardonnay, Pinot Noir"
                      />
                      {item.fields.wineGrapeVariety?.isValid === false &&
                        item.fields.wineGrapeVariety?.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">
                            {item.fields.wineGrapeVariety.errorMessage}
                          </p>
                        )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={String(item.fields.itemType.value || "")}
                        onChange={(e) =>
                          handleFieldChange(item.id, "itemType", e.target.value)
                        }
                        className={`${inputBaseClasses} ${
                          item.fields.itemType.isValid
                            ? validInputClasses
                            : invalidInputClasses
                        }`}
                      >
                        <option value="">Select...</option>
                        <option value="food">Food</option>
                        <option value="beverage">Beverage</option>
                        <option value="wine">Wine</option>
                      </select>
                      {!item.fields.itemType.isValid &&
                        item.fields.itemType.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">
                            {item.fields.itemType.errorMessage}
                          </p>
                        )}
                    </td>

                    {/* Wine Style */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={String(item.fields.wineStyle?.value || "")}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            "wineStyle",
                            e.target.value
                          )
                        }
                        className={`${inputBaseClasses} ${
                          item.fields.wineStyle?.isValid !== false
                            ? validInputClasses
                            : invalidInputClasses
                        }`}
                      >
                        <option value="">Select Style...</option>
                        <option value="still">Still</option>
                        <option value="sparkling">Sparkling</option>
                        <option value="champagne">Champagne</option>
                        <option value="dessert">Dessert</option>
                        <option value="fortified">Fortified</option>
                        <option value="other">Other</option>
                      </select>
                      {item.fields.wineStyle?.isValid === false &&
                        item.fields.wineStyle?.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">
                            {item.fields.wineStyle.errorMessage}
                          </p>
                        )}
                    </td>

                    {/* Import Action / Conflict */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {item.conflictResolution && (
                        <div
                          className={`p-1 rounded ${
                            item.conflictResolution.status === "no_conflict"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <p>
                            <strong>Status:</strong>{" "}
                            {item.conflictResolution.status}
                          </p>
                          {item.conflictResolution.message && (
                            <p>{item.conflictResolution.message}</p>
                          )}
                          {item.conflictResolution.existingItemId && (
                            <p>
                              Existing ID: ...
                              {item.conflictResolution.existingItemId.slice(-6)}
                            </p>
                          )}
                        </div>
                      )}
                      <select
                        value={item.importAction || ""}
                        onChange={(e) =>
                          handleImportActionChange(
                            item.id,
                            e.target
                              .value as MenuUploadTypes.ParsedMenuItem["importAction"]
                          )
                        }
                        className={`${inputBaseClasses} mt-1`}
                        disabled={item.userAction === "ignore"}
                      >
                        <option value="">Select Action...</option>
                        <option value="create">Create New</option>
                        <option value="update">Update Existing</option>
                        <option value="skip">Skip This Item</option>
                      </select>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        (See Serving Options)
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {item.status}
                    </td>
                  </tr>

                  {/* Collapsible: Additional Wine Details */}
                  <tr
                    className={`${
                      item.userAction === "ignore" ? "opacity-70" : ""
                    }`}
                  >
                    <td colSpan={wineTableHeaders.length} className="p-0">
                      <div
                        className={`p-3 ${
                          item.userAction === "ignore"
                            ? "bg-gray-100"
                            : "bg-gray-50"
                        } border-t border-gray-200`}
                      >
                        <button
                          onClick={() => toggleWineDetailsExpansion(item.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center mb-2"
                        >
                          {expandedWineDetails[item.id] ? (
                            <ChevronUpIcon className="h-4 w-4 mr-1" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 mr-1" />
                          )}
                          Additional Wine Details
                        </button>
                        {expandedWineDetails[item.id] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {wineSpecificDetailFields.map((detailField) => {
                              const fieldName =
                                detailField.key as keyof MenuUploadTypes.ParsedMenuItem["fields"];
                              const fieldData = item.fields[fieldName] as
                                | MenuUploadTypes.ParsedMenuItemField
                                | undefined;
                              return (
                                <div key={detailField.key}>
                                  <label
                                    htmlFor={`${item.id}-${detailField.key}`}
                                    className="block text-xs font-medium text-gray-700 mb-1"
                                  >
                                    {detailField.label}
                                  </label>
                                  <input
                                    id={`${item.id}-${detailField.key}`}
                                    type={detailField.type || "text"}
                                    value={String(fieldData?.value || "")}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        item.id,
                                        fieldName,
                                        detailField.type === "number" &&
                                          e.target.value === ""
                                          ? null
                                          : detailField.type === "number"
                                          ? Number(e.target.value)
                                          : e.target.value
                                      )
                                    }
                                    className={`${inputBaseClasses} ${
                                      fieldData?.isValid !== false
                                        ? validInputClasses
                                        : invalidInputClasses
                                    }`}
                                    placeholder={detailField.placeholder}
                                  />
                                  {fieldData?.isValid === false &&
                                    fieldData?.errorMessage && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {fieldData.errorMessage}
                                      </p>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Wine Serving Options */}
                  <tr
                    className={`${
                      item.userAction === "ignore"
                        ? "bg-gray-200 opacity-70"
                        : "bg-white"
                    }`}
                  >
                    <td colSpan={wineTableHeaders.length} className="p-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-600">
                          Serving Options:
                        </h4>
                        {item.fields.wineServingOptions?.value &&
                        item.fields.wineServingOptions.value.length > 0 ? (
                          item.fields.wineServingOptions.value.map(
                            (opt, index) => (
                              <div
                                key={opt.id || index}
                                className="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                              >
                                <input
                                  type="text"
                                  value={opt.size}
                                  onChange={(e) =>
                                    handleServingOptionChange(
                                      item.id,
                                      opt.id,
                                      "size",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Size (e.g., Glass)"
                                  className={`${inputBaseClasses} w-1/3 ${
                                    opt.isValidSize === false
                                      ? invalidInputClasses
                                      : validInputClasses
                                  }`}
                                />
                                {opt.isValidSize === false &&
                                  opt.sizeErrorMessage && (
                                    <p className="text-xs text-red-500 mt-1 w-full">
                                      {opt.sizeErrorMessage}
                                    </p>
                                  )}
                                <input
                                  type="text"
                                  value={opt.price}
                                  onChange={(e) =>
                                    handleServingOptionChange(
                                      item.id,
                                      opt.id,
                                      "price",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Price (e.g., 12.50)"
                                  className={`${inputBaseClasses} w-1/3 ${
                                    opt.isValidPrice === false
                                      ? invalidInputClasses
                                      : validInputClasses
                                  }`}
                                />
                                {opt.isValidPrice === false &&
                                  opt.priceErrorMessage && (
                                    <p className="text-xs text-red-500 mt-1 w-full">
                                      {opt.priceErrorMessage}
                                    </p>
                                  )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeServingOption(item.id, opt.id)
                                  }
                                  className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                                  disabled={item.userAction === "ignore"}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            )
                          )
                        ) : (
                          <p className="text-xs text-gray-500">
                            No serving options defined.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => addServingOption(item.id)}
                          className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                          disabled={item.userAction === "ignore"}
                        >
                          Add Serving Option
                        </button>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {categoryOrder.map((categoryKey) => {
        const itemsInCategory = groupedItems[categoryKey] || [];
        const isExpanded = expandedCategories[categoryKey] || false;
        const editableItemsInCategory = allEditableItems.filter(
          (item) =>
            (item.fields.category.value as string | undefined) === categoryKey
        );

        if (
          itemsInCategory.length === 0 &&
          editableItemsInCategory.length === 0
        )
          return null;

        // Group items by type within this category
        const { foodBeverageItems, wineItems } = groupItemsByType(
          editableItemsInCategory
        );

        return (
          <div key={categoryKey} className="bg-white shadow-md rounded-lg">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-100 hover:bg-gray-200 cursor-pointer border-b border-gray-300 rounded-t-lg">
              {editingCategoryKey === categoryKey ? (
                <div className="flex-grow mr-2">
                  <input
                    type="text"
                    value={currentEditValue}
                    onChange={(e) => setCurrentEditValue(e.target.value)}
                    onBlur={() => handleSaveCategoryName(categoryKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleSaveCategoryName(categoryKey);
                      if (e.key === "Escape") handleCancelEditCategory();
                    }}
                    className="w-full px-2 py-1 text-lg font-semibold border border-blue-500 rounded focus:ring-2 focus:ring-blue-300"
                    autoFocus
                  />
                </div>
              ) : (
                <h3
                  className="text-lg font-semibold text-gray-700 cursor-pointer flex-grow"
                  onClick={() => toggleCategoryExpansion(categoryKey)}
                >
                  {categoryKey} ({editableItemsInCategory.length})
                </h3>
              )}
              <div className="flex items-center space-x-2 ml-2">
                {editingCategoryKey === categoryKey ? (
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleSaveCategoryName(categoryKey);
                    }}
                    className="p-1 text-green-600 hover:text-green-800"
                    title="Save Category Name"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleStartEditCategory(categoryKey);
                    }}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="Edit Category Name"
                    disabled={categoryKey === "Uncategorized"}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDeleteCategory(categoryKey);
                  }}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Delete Category"
                  disabled={
                    categoryKey === "Uncategorized" ||
                    (groupedItems[categoryKey] &&
                      groupedItems[categoryKey].length > 0)
                  }
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
                {isExpanded ? (
                  <ChevronUpIcon
                    className="h-6 w-6 text-gray-600 cursor-pointer"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleCategoryExpansion(categoryKey);
                    }}
                  />
                ) : (
                  <ChevronDownIcon
                    className="h-6 w-6 text-gray-600 cursor-pointer"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleCategoryExpansion(categoryKey);
                    }}
                  />
                )}
              </div>
            </div>
            {isExpanded && (
              <div
                className={`overflow-x-auto p-2 ${
                  draggingOverCategory === categoryKey
                    ? "bg-blue-100 border-2 border-dashed border-blue-400"
                    : ""
                }`}
                onDragOver={(e) => handleDragOverCategory(e, categoryKey)}
                onDrop={(e) => handleDropOnCategory(e, categoryKey)}
                onDragLeave={handleDragLeaveCategory}
              >
                {editableItemsInCategory.length > 0 ? (
                  <div className="space-y-4">
                    {renderFoodBeverageTable(foodBeverageItems, categoryKey)}
                    {renderWineTable(wineItems, categoryKey)}
                  </div>
                ) : (
                  <p className="text-gray-500 p-4 text-sm">
                    No items in this category or all items filtered out.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EditableMenuTable;
