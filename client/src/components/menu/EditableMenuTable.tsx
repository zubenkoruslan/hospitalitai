import React, { useState, useEffect, Fragment } from "react";
import {
  ParsedMenuItem,
  ParsedMenuItemField,
  ItemStatus,
} from "../../types/menuUploadTypes"; // Adjust path as needed
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid"; // Icons for expand/collapse

// Define a more specific type for items in the editable state
type EditableItem = Omit<ParsedMenuItem, "userAction" | "importAction"> & {
  userAction: "keep" | "ignore";
  importAction: ParsedMenuItem["importAction"]; // Ensure this is also non-optional if defaulted
  // Retain other fields from ParsedMenuItem implicitly via Omit and intersection
};

interface EditableMenuTableProps {
  items: ParsedMenuItem[]; // Input items can have optional userAction
  onItemsChange: (updatedItems: ParsedMenuItem[]) => void; // Output items are still ParsedMenuItem
  availableCategories?: string[]; // Added availableCategories prop
}

const EditableMenuTable: React.FC<EditableMenuTableProps> = ({
  items,
  onItemsChange,
  availableCategories = [], // Default to empty array
}) => {
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    new Set()
  ); // State for expanded rows

  useEffect(() => {
    // Initialize or update local state when props.items change
    setEditableItems(
      items.map((item): EditableItem => {
        // Explicit return type for map
        const determinedUserAction = item.userAction || "keep";
        const determinedImportAction = (item.importAction ||
          (determinedUserAction === "ignore"
            ? "skip"
            : item.conflictResolution?.status === "no_conflict"
            ? "create"
            : item.conflictResolution?.status === "update_candidate" &&
              item.conflictResolution.existingItemId
            ? "update"
            : undefined)) as ParsedMenuItem["importAction"];
        return {
          ...item,
          fields: { ...item.fields },
          userAction: determinedUserAction,
          importAction: determinedImportAction,
        };
      })
    );
  }, [items]);

  const validateField = (
    fieldName: keyof ParsedMenuItem["fields"],
    value: string | number | boolean | string[] | null
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
      // Add other field validations here
      default:
        break;
    }
    return { isValid: true };
  };

  const handleFieldChange = (
    itemId: string,
    fieldName: keyof ParsedMenuItem["fields"],
    newValue: string | number | boolean | string[] | null
  ) => {
    const validationResult = validateField(fieldName, newValue);

    const updatedItems = editableItems.map((item) => {
      if (item.id === itemId) {
        const newFields = { ...item.fields };
        newFields[fieldName] = {
          ...(newFields[fieldName] as ParsedMenuItemField),
          value: newValue,
          isValid: validationResult.isValid,
          errorMessage: validationResult.errorMessage,
        };

        let newStatus: ItemStatus = item.status;
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
        } as EditableItem; // Cast to EditableItem
      }
      return item;
    });
    setEditableItems(updatedItems);
    onItemsChange(updatedItems as ParsedMenuItem[]); // Cast back for prop
  };

  const handleUserActionChange = (
    itemId: string,
    action: "keep" | "ignore"
  ) => {
    const updatedItems = editableItems.map((item) => {
      if (item.id === itemId) {
        const newImportAction: ParsedMenuItem["importAction"] =
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
    setEditableItems(updatedItems);
    onItemsChange(updatedItems as ParsedMenuItem[]);
  };

  const handleImportActionChange = (
    itemId: string,
    action: ParsedMenuItem["importAction"],
    existingIdToUpdate?: string
  ) => {
    const updatedItems = editableItems.map((item) =>
      item.id === itemId
        ? ({
            ...item,
            importAction: action,
            existingItemId:
              action === "update" ? existingIdToUpdate : item.existingItemId,
          } as EditableItem)
        : item
    );
    setEditableItems(updatedItems);
    onItemsChange(updatedItems as ParsedMenuItem[]);
  };

  const toggleExpandItem = (itemId: string) => {
    setExpandedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (editableItems.length === 0) {
    return (
      <p className="text-gray-600 py-4">No menu items to display or edit.</p>
    );
  }

  const inputBaseClasses =
    "block w-full text-sm p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500";
  const invalidInputClasses =
    "border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500";
  const validInputClasses = "border-gray-300 text-gray-700";

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      {" "}
      {/* For wider tables */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Item Action",
              "Name",
              "Category",
              "Ingredients",
              "Type",
              "Import Action / Conflict",
              "Price",
              "Status",
              "", // For expand button
            ].map((header) => (
              <th
                key={header}
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {editableItems.map((item) => (
            <Fragment key={item.id}>
              {/* Use Fragment to group main row and detail row */}
              <tr
                className={`${
                  item.userAction === "ignore"
                    ? "bg-gray-100 opacity-60"
                    : "hover:bg-gray-50"
                } transition-colors`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <select
                    value={item.userAction}
                    onChange={(e) =>
                      handleUserActionChange(
                        item.id,
                        e.target.value as "keep" | "ignore"
                      )
                    }
                    disabled={item.status === "error"}
                    className={`${inputBaseClasses} ${validInputClasses} w-auto`}
                  >
                    <option value="keep">Keep</option>
                    <option value="ignore">Ignore</option>
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                  <input
                    type="text"
                    value={String(item.fields.name.value ?? "")}
                    onChange={(e) =>
                      handleFieldChange(item.id, "name", e.target.value)
                    }
                    disabled={item.userAction === "ignore"}
                    className={`${inputBaseClasses} ${
                      item.fields.name.isValid
                        ? validInputClasses
                        : invalidInputClasses
                    }`}
                    aria-label="Item name"
                  />
                  {!item.fields.name.isValid && (
                    <p className="text-xs text-red-500 mt-1">
                      {item.fields.name.errorMessage}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap min-w-[180px]">
                  <select
                    value={String(item.fields.category.value ?? "")}
                    onChange={(e) =>
                      handleFieldChange(item.id, "category", e.target.value)
                    }
                    disabled={item.userAction === "ignore"}
                    className={`${inputBaseClasses} ${
                      item.fields.category.isValid
                        ? validInputClasses
                        : invalidInputClasses
                    }`}
                    aria-label="Item category"
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    {item.fields.category.value &&
                      !availableCategories.includes(
                        String(item.fields.category.value)
                      ) && (
                        <option
                          key={String(item.fields.category.value)}
                          value={String(item.fields.category.value)}
                        >
                          {String(item.fields.category.value)} (Current)
                        </option>
                      )}
                  </select>
                  {!item.fields.category.isValid && (
                    <p className="text-xs text-red-500 mt-1">
                      {item.fields.category.errorMessage}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap min-w-[250px]">
                  <textarea
                    value={
                      Array.isArray(item.fields.ingredients.value)
                        ? item.fields.ingredients.value.join(", ")
                        : ""
                    }
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
                    disabled={item.userAction === "ignore"}
                    rows={1}
                    className={`${inputBaseClasses} ${
                      item.fields.ingredients.isValid
                        ? validInputClasses
                        : invalidInputClasses
                    } mt-1`}
                    aria-label="Item ingredients"
                    placeholder="e.g., flour, sugar"
                  />
                  {!item.fields.ingredients.isValid && (
                    <p className="text-xs text-red-500 mt-1">
                      {item.fields.ingredients.errorMessage}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap min-w-[120px]">
                  <select
                    value={String(item.fields.itemType.value ?? "food")}
                    onChange={(e) =>
                      handleFieldChange(item.id, "itemType", e.target.value)
                    }
                    disabled={item.userAction === "ignore"}
                    className={`${inputBaseClasses} ${
                      item.fields.itemType.isValid
                        ? validInputClasses
                        : invalidInputClasses
                    }`}
                    aria-label="Item type"
                  >
                    <option value="food">Food</option>
                    <option value="beverage">Beverage</option>
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-normal min-w-[280px]">
                  {item.userAction === "ignore" ? (
                    <em className="text-sm text-gray-500">
                      Item will be skipped.
                    </em>
                  ) : item.conflictResolution ? (
                    <div className="space-y-1">
                      <div>
                        <strong className="capitalize text-xs font-semibold text-gray-700">
                          {item.conflictResolution.status.replace(/_/g, " ")}
                        </strong>
                        {item.conflictResolution.message && (
                          <p className="text-xs text-gray-500 italic">
                            {item.conflictResolution.message}
                          </p>
                        )}
                        {item.conflictResolution.status ===
                          "update_candidate" &&
                          item.conflictResolution.existingItemId && (
                            <p className="text-xs text-gray-500">
                              Matches: ...
                              {item.conflictResolution.existingItemId.slice(-6)}
                            </p>
                          )}
                        {item.conflictResolution.status ===
                          "multiple_candidates" &&
                          item.conflictResolution.candidateItemIds &&
                          item.conflictResolution.candidateItemIds.length >
                            0 && (
                            <p className="text-xs text-gray-500">
                              Potential Matches:{" "}
                              {item.conflictResolution.candidateItemIds
                                .map((id) => `...${id.slice(-6)}`)
                                .join(", ")}
                            </p>
                          )}
                      </div>
                      <select
                        value={item.importAction || ""}
                        onChange={(e) =>
                          handleImportActionChange(
                            item.id,
                            e.target.value as ParsedMenuItem["importAction"],
                            e.target.value === "update" &&
                              item.conflictResolution?.status ===
                                "update_candidate"
                              ? item.conflictResolution?.existingItemId
                              : undefined
                          )
                        }
                        className={`${inputBaseClasses} ${validInputClasses} w-full`}
                        // @ts-expect-error - userAction is correctly typed as 'keep' | 'ignore' in EditableItem
                        disabled={item.userAction === "ignore"}
                      >
                        <option value="">Select Import Action...</option>
                        <option value="create">Create as New Item</option>
                        {item.conflictResolution.status ===
                          "update_candidate" &&
                          item.conflictResolution.existingItemId && (
                            <option value="update">
                              Update Existing (...
                              {item.conflictResolution.existingItemId.slice(-6)}
                              )
                            </option>
                          )}
                        {item.conflictResolution.status ===
                          "multiple_candidates" && (
                          <option value="create">
                            Create New (despite matches)
                          </option>
                        )}
                        <option value="skip">Skip (Do Not Import)</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {item.status === "error" ? (
                        <p className="text-xs text-red-500 italic">
                          Item has parsing errors.
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          Pending conflict check.
                        </p>
                      )}
                      <select
                        value={item.importAction || "create"}
                        onChange={(e) =>
                          handleImportActionChange(
                            item.id,
                            e.target.value as ParsedMenuItem["importAction"]
                          )
                        }
                        className={`${inputBaseClasses} ${validInputClasses} w-full`}
                        disabled={
                          // @ts-expect-error - userAction is correctly typed as 'keep' | 'ignore' in EditableItem
                          item.userAction === "ignore" ||
                          item.status === "error"
                        }
                      >
                        <option value="create">Create as New Item</option>
                        <option value="skip">Skip (Do Not Import)</option>
                      </select>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">
                  <input
                    type="number"
                    value={String(item.fields.price.value ?? "")}
                    onChange={(e) =>
                      handleFieldChange(
                        item.id,
                        "price",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    disabled={item.userAction === "ignore"}
                    className={`${inputBaseClasses} ${
                      item.fields.price.isValid
                        ? validInputClasses
                        : invalidInputClasses
                    } w-24`}
                    aria-label="Item price"
                    step="0.01"
                  />
                  {!item.fields.price.isValid && (
                    <p className="text-xs text-red-500 mt-1">
                      {item.fields.price.errorMessage}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === "new"
                        ? "bg-blue-100 text-blue-800"
                        : item.status === "edited"
                        ? "bg-yellow-100 text-yellow-800"
                        : item.status?.startsWith("error")
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.status || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => toggleExpandItem(item.id)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    aria-expanded={expandedItemIds.has(item.id)}
                    aria-label={
                      expandedItemIds.has(item.id)
                        ? "Collapse item details"
                        : "Expand item details"
                    }
                  >
                    {expandedItemIds.has(item.id) ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </button>
                </td>
              </tr>
              {/* Expandable Detail Row */}
              {expandedItemIds.has(item.id) && item.userAction !== "ignore" && (
                <tr className="bg-gray-50">
                  <td colSpan={9} className="px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {/* Description */}
                      <div className="col-span-1 md:col-span-2">
                        <label
                          htmlFor={`description-${item.id}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Description
                        </label>
                        <textarea
                          id={`description-${item.id}`}
                          value={String(item.fields.description?.value ?? "")}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                          // @ts-expect-error - userAction is correctly typed as 'keep' | 'ignore' in EditableItem
                          disabled={item.userAction === "ignore"}
                          rows={2}
                          className={`${inputBaseClasses} ${
                            item.fields.description?.isValid !== false
                              ? validInputClasses
                              : invalidInputClasses
                          } mt-1`}
                          aria-label="Item description"
                        />
                        {item.fields.description?.isValid === false && (
                          <p className="text-xs text-red-500 mt-1">
                            {item.fields.description.errorMessage}
                          </p>
                        )}
                      </div>

                      {/* Dietary Flags */}
                      <div className="col-span-1 md:col-span-2">
                        <p className="block text-sm font-medium text-gray-700 mb-1">
                          Dietary Flags:
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {["isGlutenFree", "isVegan", "isVegetarian"].map(
                            (flagKey) => {
                              const fieldKey =
                                flagKey as keyof ParsedMenuItem["fields"];
                              const field = item.fields[
                                fieldKey
                              ] as ParsedMenuItemField;
                              return (
                                <div
                                  key={flagKey}
                                  className="flex items-center"
                                >
                                  <input
                                    type="checkbox"
                                    id={`${flagKey}-${item.id}`}
                                    checked={Boolean(field.value)}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        item.id,
                                        flagKey as keyof ParsedMenuItem["fields"],
                                        e.target.checked
                                      )
                                    }
                                    disabled={item.userAction === "ignore"}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                  />
                                  <label
                                    htmlFor={`${flagKey}-${item.id}`}
                                    className="ml-2 text-sm text-gray-700"
                                  >
                                    {flagKey.replace("is", "")}
                                  </label>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Validation Issues Display */}
                      {(
                        Object.values(item.fields) as ParsedMenuItemField[]
                      ).some((f) => f && !f.isValid && f.errorMessage) && (
                        <div className="col-span-1 md:col-span-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                          <h4 className="text-sm font-semibold text-red-700 mb-1">
                            Validation Issues:
                          </h4>
                          <ul className="list-disc list-inside text-xs text-red-600">
                            {(
                              Object.entries(item.fields) as [
                                string,
                                ParsedMenuItemField
                              ][]
                            )
                              .filter(
                                ([key, field]) =>
                                  field && !field.isValid && field.errorMessage
                              )
                              .map(([key, field]) => (
                                <li key={key}>
                                  <strong>
                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                    :
                                  </strong>{" "}
                                  {field.errorMessage}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EditableMenuTable;
