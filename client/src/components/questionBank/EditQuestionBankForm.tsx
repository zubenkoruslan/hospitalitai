import React, { useState, useEffect, useCallback } from "react";
import {
  IQuestionBank,
  UpdateQuestionBankData,
} from "../../types/questionBankTypes";
import {
  updateQuestionBank,
  getSopDocumentDetails,
  getMenuWithItems,
  getMenusByRestaurant,
} from "../../services/api";
import { IMenuClient } from "../../types/menuTypes";
import Button from "../common/Button";
import Input from "../common/Input";
import TextArea from "../common/TextArea";
import LoadingSpinner from "../common/LoadingSpinner";
import { ISopCategory } from "../../types/sopTypes";
import RecursiveSopCategoryList, {
  NestedSopCategoryItem,
} from "./RecursiveSopCategoryList";
import { MenuItem } from "../../types/menuItemTypes";

interface EditQuestionBankFormProps {
  bankToEdit: IQuestionBank;
  onBankUpdated: (updatedBank: IQuestionBank) => void;
  onCancel: () => void;
}

const EditQuestionBankForm: React.FC<EditQuestionBankFormProps> = ({
  bankToEdit,
  onBankUpdated,
  onCancel,
}) => {
  const [name, setName] = useState(bankToEdit.name);
  const [description, setDescription] = useState(bankToEdit.description || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    ...bankToEdit.categories,
  ]);
  const [manualCategoriesInput, setManualCategoriesInput] = useState(
    bankToEdit.sourceType === "MANUAL" ? bankToEdit.categories.join(", ") : ""
  );

  const [availableSourceCategories, setAvailableSourceCategories] = useState<
    NestedSopCategoryItem[]
  >([]);
  const [isLoadingSourceCategories, setIsLoadingSourceCategories] =
    useState(false);
  const [sourceCategoryError, setSourceCategoryError] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ADDED: Menu connection management
  const [availableMenus, setAvailableMenus] = useState<IMenuClient[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string>(
    bankToEdit.sourceMenuId || ""
  );
  const [showMenuSelector, setShowMenuSelector] = useState(false);

  const buildNestedSopCategories = useCallback(
    (
      sopCategories: ISopCategory[],
      level = 0,
      parentFullName = ""
    ): NestedSopCategoryItem[] => {
      return sopCategories.map((cat) => {
        const currentFullName = parentFullName
          ? `${parentFullName} > ${cat.name}`
          : cat.name;
        return {
          id: cat._id || `generated-${cat.name}-${level}`,
          name: cat.name,
          fullName: currentFullName,
          subCategories: cat.subCategories
            ? buildNestedSopCategories(
                cat.subCategories,
                level + 1,
                currentFullName
              )
            : [],
          level,
        };
      });
    },
    []
  );

  const getAllFullNamesRecursive = useCallback(
    (nestedCats: NestedSopCategoryItem[]): string[] => {
      let fullNames: string[] = [];
      for (const cat of nestedCats) {
        fullNames.push(cat.fullName);
        if (cat.subCategories && cat.subCategories.length > 0) {
          fullNames = fullNames.concat(
            getAllFullNamesRecursive(cat.subCategories)
          );
        }
      }
      return fullNames;
    },
    []
  );

  const getDescendantFullNames = useCallback(
    (
      categoryFullName: string,
      allNestedCategories: NestedSopCategoryItem[]
    ): string[] => {
      const descendants: string[] = [];
      const findAndCollect = (
        currentCategories: NestedSopCategoryItem[],
        targetParentFullName: string,
        isParentFound: boolean
      ) => {
        for (const cat of currentCategories) {
          if (isParentFound) {
            descendants.push(cat.fullName);
            if (cat.subCategories && cat.subCategories.length > 0) {
              findAndCollect(cat.subCategories, cat.fullName, true);
            }
          } else if (cat.fullName === targetParentFullName) {
            if (cat.subCategories && cat.subCategories.length > 0) {
              findAndCollect(cat.subCategories, cat.fullName, true);
            }
            // Stop searching other top-level branches once the target parent is found
            return;
          }
          // If not yet found parent and category has subcategories, search deeper
          // This part is only relevant if we are searching for a specific parent to start from
          // For getDescendantFullNames, we assume categoryFullName IS the parent
          if (
            !isParentFound &&
            cat.subCategories &&
            cat.subCategories.length > 0 &&
            cat.fullName !== targetParentFullName
          ) {
            // findAndCollect(cat.subCategories, targetParentFullName, false); // Not needed for this simplified version
          }
        }
      };

      // Find the starting category and then collect its descendants
      const startingCategory = allNestedCategories.find(
        (c) => c.fullName === categoryFullName
      );
      if (startingCategory && startingCategory.subCategories) {
        findAndCollect(startingCategory.subCategories, categoryFullName, true);
      }

      return descendants;
    },
    []
  );

  // ADDED: Function to fetch available menus
  const fetchAvailableMenus = useCallback(async () => {
    setIsLoadingMenus(true);
    try {
      const menus = await getMenusByRestaurant(bankToEdit.restaurantId);
      setAvailableMenus(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      setError("Failed to load available menus");
    } finally {
      setIsLoadingMenus(false);
    }
  }, [bankToEdit.restaurantId]);

  const fetchAndSetSourceCategories = useCallback(async () => {
    if (
      !bankToEdit ||
      (bankToEdit.sourceType !== "SOP" && bankToEdit.sourceType !== "MENU") ||
      (bankToEdit.sourceType === "SOP" && !bankToEdit.sourceSopDocumentId) ||
      (bankToEdit.sourceType === "MENU" && !bankToEdit.sourceMenuId)
    ) {
      setAvailableSourceCategories([]);
      if (bankToEdit.sourceType === "MANUAL") {
        setManualCategoriesInput(bankToEdit.categories.join(", "));
      } else {
        setManualCategoriesInput("");
      }
      // Clear errors if conditions for fetching aren't met initially
      setSourceCategoryError(null);
      // Specific error messages if an ID is missing for a type that needs it
      if (bankToEdit.sourceType === "SOP" && !bankToEdit.sourceSopDocumentId) {
        setSourceCategoryError(
          "SOP-sourced bank is missing its source SOP Document ID."
        );
      }
      if (bankToEdit.sourceType === "MENU" && !bankToEdit.sourceMenuId) {
        setSourceCategoryError(
          "Menu-sourced bank is missing its source Menu ID."
        );
      }
      return;
    }

    setIsLoadingSourceCategories(true);
    setSourceCategoryError(null);
    setAvailableSourceCategories([]);

    try {
      if (bankToEdit.sourceType === "SOP") {
        const docId = bankToEdit.sourceSopDocumentId;
        if (typeof docId === "string") {
          const sopDoc = await getSopDocumentDetails(docId);
          if (sopDoc && sopDoc.categories) {
            const nested = buildNestedSopCategories(sopDoc.categories);
            setAvailableSourceCategories(nested);
          } else {
            setSourceCategoryError(
              "Could not load categories from the SOP document."
            );
          }
        } else {
          setSourceCategoryError(
            "SOP Document ID is missing or invalid for this SOP-sourced bank."
          );
        }
      } else if (bankToEdit.sourceType === "MENU") {
        const menuId = bankToEdit.sourceMenuId;
        if (typeof menuId === "string") {
          try {
            const menuDoc = await getMenuWithItems(menuId);
            if (menuDoc && menuDoc.items && menuDoc.items.length > 0) {
              const uniqueCategoryNames = Array.from(
                new Set(menuDoc.items.map((item: MenuItem) => item.category))
              );
              const menuCategoriesAsNested: NestedSopCategoryItem[] =
                uniqueCategoryNames.map((name) => ({
                  id: name,
                  name: name,
                  fullName: name,
                  subCategories: [],
                  level: 0,
                }));
              setAvailableSourceCategories(menuCategoriesAsNested);
            } else if (
              menuDoc &&
              (!menuDoc.items || menuDoc.items.length === 0)
            ) {
              setAvailableSourceCategories([]);
              // setSourceCategoryError("The linked menu has no items or no categories defined.");
            } else {
              setSourceCategoryError(
                "Could not load categories from the linked Menu (or menu has no items)."
              );
            }
          } catch (error: unknown) {
            // Check if it's a 404 error (menu not found)
            const isAxiosError = (
              err: unknown
            ): err is {
              response: { status: number };
            } => {
              return (
                typeof err === "object" && err !== null && "response" in err
              );
            };

            if (isAxiosError(error) && error.response.status === 404) {
              setSourceCategoryError(
                "The linked menu no longer exists. The question bank may need to be updated with a new menu reference."
              );
            } else {
              setSourceCategoryError(
                "Could not load categories from the linked Menu (or menu has no items)."
              );
            }
          }
        } else {
          setSourceCategoryError(
            "Menu ID is missing or invalid for this Menu-sourced bank."
          );
        }
      }
    } catch (err: unknown) {
      console.error("Error fetching source categories:", err);

      // Type guard for axios error
      const isAxiosError = (
        error: unknown
      ): error is {
        response: { data?: { message?: string } };
        message: string;
      } => {
        return (
          typeof error === "object" && error !== null && "response" in error
        );
      };

      const isErrorWithMessage = (
        error: unknown
      ): error is { message: string } => {
        return (
          typeof error === "object" && error !== null && "message" in error
        );
      };

      if (isAxiosError(err)) {
        setSourceCategoryError(
          err.response.data?.message ||
            err.message ||
            (bankToEdit.sourceType === "SOP"
              ? "Failed to load source categories for SOP."
              : "Failed to load source categories for Menu.")
        );
      } else if (isErrorWithMessage(err)) {
        setSourceCategoryError(
          err.message ||
            (bankToEdit.sourceType === "SOP"
              ? "Failed to load source categories for SOP."
              : "Failed to load source categories for Menu.")
        );
      } else {
        setSourceCategoryError(
          bankToEdit.sourceType === "SOP"
            ? "Failed to load source categories for SOP."
            : "Failed to load source categories for Menu."
        );
      }
    } finally {
      setIsLoadingSourceCategories(false);
    }
  }, [bankToEdit, buildNestedSopCategories]);

  useEffect(() => {
    setName(bankToEdit.name);
    setDescription(bankToEdit.description || "");
    setSelectedCategories([...bankToEdit.categories]);
    setError(null);
    fetchAndSetSourceCategories();
  }, [bankToEdit, fetchAndSetSourceCategories]);

  useEffect(() => {
    if (bankToEdit.sourceType === "MANUAL") {
      const catsFromInput = manualCategoriesInput
        .split(",")
        .map((cat) => cat.trim())
        .filter(Boolean);
      if (
        JSON.stringify(catsFromInput) !== JSON.stringify(selectedCategories)
      ) {
        setSelectedCategories(catsFromInput);
      }
    }
  }, [manualCategoriesInput, bankToEdit.sourceType, selectedCategories]);

  useEffect(() => {
    if (bankToEdit.sourceType === "MANUAL") {
      setManualCategoriesInput(bankToEdit.categories.join(", "));
    } else {
      setManualCategoriesInput("");
    }
  }, [bankToEdit.categories, bankToEdit.sourceType]);

  const handleCategoryToggle = (categoryFullName: string) => {
    const isCurrentlySelected = selectedCategories.includes(categoryFullName);
    const descendantFullNames = getDescendantFullNames(
      categoryFullName,
      availableSourceCategories
    );
    const affectedFullNames = [categoryFullName, ...descendantFullNames];

    setSelectedCategories((prev) => {
      let newSelection = [...prev];
      if (isCurrentlySelected) {
        newSelection = newSelection.filter(
          (name) => !affectedFullNames.includes(name)
        );
      } else {
        affectedFullNames.forEach((name) => {
          if (!newSelection.includes(name)) {
            newSelection.push(name);
          }
        });
      }
      return newSelection;
    });
  };

  const handleToggleSelectAllSopCategories = () => {
    if (availableSourceCategories.length === 0) return;

    const allAvailableCategoryFullNames = getAllFullNamesRecursive(
      availableSourceCategories
    );
    const allSelected = allAvailableCategoryFullNames.every((name) =>
      selectedCategories.includes(name)
    );

    if (allSelected) {
      setSelectedCategories((prev) =>
        prev.filter(
          (catName) => !allAvailableCategoryFullNames.includes(catName)
        )
      );
    } else {
      setSelectedCategories((prev) => {
        const newSelection = [...prev];
        allAvailableCategoryFullNames.forEach((name) => {
          if (!newSelection.includes(name)) {
            newSelection.push(name);
          }
        });
        return newSelection;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bank name cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);

    let finalCategories: string[];

    if (bankToEdit.sourceType === "MANUAL") {
      finalCategories = manualCategoriesInput
        .split(",")
        .map((cat) => cat.trim())
        .filter(Boolean);
    } else {
      finalCategories = [...selectedCategories];
    }

    const updateData: UpdateQuestionBankData = {};
    let hasChanges = false;

    if (name.trim() !== bankToEdit.name) {
      updateData.name = name.trim();
      hasChanges = true;
    }
    if (description.trim() !== (bankToEdit.description || "")) {
      updateData.description = description.trim();
      hasChanges = true;
    }

    const sortedSelected = [...finalCategories].sort();
    const sortedOriginal = [...bankToEdit.categories].sort();
    if (JSON.stringify(sortedSelected) !== JSON.stringify(sortedOriginal)) {
      updateData.categories = finalCategories;
      hasChanges = true;
    }

    // Check for menu connection changes
    if (selectedMenuId !== (bankToEdit.sourceMenuId || "")) {
      updateData.sourceMenuId = selectedMenuId || null;
      hasChanges = true;
    }

    if (!hasChanges) {
      setIsLoading(false);
      onCancel();
      return;
    }

    try {
      const updatedBank = await updateQuestionBank(bankToEdit._id, updateData);
      if (updatedBank) {
        onBankUpdated(updatedBank);
      } else {
        setError(
          "Failed to update bank. Bank not found or an unexpected error occurred."
        );
      }
    } catch (err: unknown) {
      console.error("Error updating bank:", err);

      // Type guard for axios error
      const isAxiosError = (
        error: unknown
      ): error is {
        response: { data?: { message?: string } };
        message: string;
      } => {
        return (
          typeof error === "object" && error !== null && "response" in error
        );
      };

      const isErrorWithMessage = (
        error: unknown
      ): error is { message: string } => {
        return (
          typeof error === "object" && error !== null && "message" in error
        );
      };

      if (isAxiosError(err)) {
        setError(
          err.response.data?.message || err.message || "Failed to update bank."
        );
      } else if (isErrorWithMessage(err)) {
        setError(err.message || "Failed to update bank.");
      } else {
        setError("Failed to update bank.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderCategorySelector = () => {
    if (bankToEdit.sourceType === "SOP" || bankToEdit.sourceType === "MENU") {
      if (isLoadingSourceCategories) {
        return (
          <LoadingSpinner
            message={`Loading categories from ${bankToEdit.sourceType}...`}
          />
        );
      }
      if (sourceCategoryError) {
        return (
          <p className="text-red-500 text-sm">Error: {sourceCategoryError}</p>
        );
      }
      if (availableSourceCategories.length === 0) {
        return (
          <p className="text-sm text-gray-500 italic">
            No categories available from the linked{" "}
            {bankToEdit.sourceType === "SOP" ? "SOP document" : "Menu"}.
            {bankToEdit.sourceType === "MENU" &&
              " Ensure the menu has items with categories defined."}
          </p>
        );
      }
      return (
        <div className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleToggleSelectAllSopCategories}
            className="text-xs"
          >
            Select All / Deselect All Available
          </Button>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
            <RecursiveSopCategoryList
              categories={availableSourceCategories}
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
            />
          </div>
        </div>
      );
    } else if (bankToEdit.sourceType === "MANUAL") {
      return (
        <Input
          label="Categories (comma-separated)"
          id="manualCategoriesInput"
          type="text"
          value={manualCategoriesInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setManualCategoriesInput(e.target.value)
          }
          placeholder="e.g., Appetizers, Main Course, Desserts"
        />
      );
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Bank Name"
        id="bankName"
        type="text"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setName(e.target.value)
        }
        required
        disabled={isLoading}
      />
      <TextArea
        label="Description (Optional)"
        id="bankDescription"
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setDescription(e.target.value)
        }
        rows={3}
        disabled={isLoading}
      />

      {/* ADDED: Menu Connection Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-800">Menu Connection</h3>
          {bankToEdit.sourceType === "MENU" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!showMenuSelector && availableMenus.length === 0) {
                  fetchAvailableMenus();
                }
                setShowMenuSelector(!showMenuSelector);
              }}
              disabled={isLoading}
              className="text-xs"
            >
              {showMenuSelector ? "Cancel" : "Change Menu"}
            </Button>
          )}
        </div>

        {bankToEdit.sourceType === "MENU" && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Currently connected to:</strong>{" "}
              {bankToEdit.sourceMenuName || "Unknown Menu"}
              {bankToEdit.sourceMenuId && (
                <span className="text-xs text-gray-500 ml-2">
                  (ID: {bankToEdit.sourceMenuId})
                </span>
              )}
            </p>

            {showMenuSelector && (
              <div className="mt-3">
                {isLoadingMenus ? (
                  <LoadingSpinner message="Loading available menus..." />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select New Menu:
                    </label>
                    <select
                      value={selectedMenuId}
                      onChange={(e) => setSelectedMenuId(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    >
                      <option value="">-- No Menu Connection --</option>
                      {availableMenus.map((menu) => (
                        <option key={menu._id} value={menu._id}>
                          {menu.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Warning:</strong> Changing the menu connection
                      will clear all existing questions in this bank. You'll
                      need to regenerate questions after saving.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {bankToEdit.sourceType !== "MENU" && (
          <p className="text-sm text-gray-500 mb-4">
            This question bank is not connected to a menu (Source type:{" "}
            {bankToEdit.sourceType}).
          </p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Categories</h3>
        {renderCategorySelector()}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !name.trim()}
        >
          {isLoading ? <LoadingSpinner /> : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default EditQuestionBankForm;
