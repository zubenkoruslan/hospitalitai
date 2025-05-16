import React, { useEffect, useState } from "react";
import {
  CreateQuestionBankData,
  CreateQuestionBankFromMenuClientData,
  MenuAiGenerationClientParams,
} from "../../types/questionBankTypes";
import { IMenuClient } from "../../types/menuTypes"; // IMenuWithItemsClient seems unused directly
import {
  getMenusByRestaurant,
  getMenuWithItems,
  createQuestionBankFromMenu,
  createQuestionBank as apiCreateQuestionBank,
} from "../../services/api";
import Button from "../common/Button";
import Card from "../common/Card";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import { useValidation } from "../../context/ValidationContext"; // Import useValidation

interface CreateQuestionBankFormProps {
  onBankCreated: () => void;
  onCancel: () => void;
}

const CreateQuestionBankForm: React.FC<CreateQuestionBankFormProps> = ({
  onBankCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const { formatErrorMessage } = useValidation(); // Get formatErrorMessage
  const restaurantId = user?.restaurantId;

  const [newBankName, setNewBankName] = useState("");
  const [newBankDescription, setNewBankDescription] = useState("");

  const [menus, setMenus] = useState<IMenuClient[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isAiGenerationEnabled, setIsAiGenerationEnabled] = useState(false);
  const [aiTargetQuestionCount, setAiTargetQuestionCount] =
    useState<number>(10);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // For API call errors
  const [nameError, setNameError] = useState<string | null>(null); // For name validation

  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [menusError, setMenusError] = useState<string | null>(null); // Changed to string | null
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null); // Changed to string | null

  useEffect(() => {
    const loadMenus = async () => {
      if (!restaurantId || user?.role !== "restaurant") {
        setMenus([]);
        if (user?.role !== "restaurant" && restaurantId) {
          setMenusError(
            "Only restaurant accounts can create banks from menus."
          );
        } else if (!restaurantId) {
          setMenusError("Restaurant ID not available. Cannot load menus.");
        }
        return;
      }
      setIsLoadingMenus(true);
      setMenusError(null);
      try {
        const fetchedMenus = await getMenusByRestaurant(restaurantId);
        setMenus(fetchedMenus);
      } catch (err: any) {
        console.error("Error fetching menus:", err);
        setMenusError(formatErrorMessage(err));
      }
      setIsLoadingMenus(false);
    };
    loadMenus();
  }, [restaurantId, user?.role, formatErrorMessage]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!selectedMenuId) {
        setMenuCategories([]);
        setSelectedCategories([]);
        return;
      }
      setIsLoadingCategories(true);
      setCategoriesError(null);
      try {
        const menuWithItems = await getMenuWithItems(selectedMenuId);
        const uniqueCategories = Array.from(
          new Set(menuWithItems.items.map((item) => item.category))
        );
        setMenuCategories(uniqueCategories);
      } catch (err: any) {
        console.error("Error fetching menu categories:", err);
        setCategoriesError(formatErrorMessage(err));
      }
      setIsLoadingCategories(false);
    };
    if (selectedMenuId) {
      loadCategories();
    }
  }, [selectedMenuId, formatErrorMessage]);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Clear previous API errors
    setNameError(null); // Clear previous name validation error

    if (!newBankName.trim()) {
      setNameError("Question bank name cannot be empty.");
      return;
    }
    setIsLoading(true);

    try {
      if (selectedMenuId && selectedCategories.length > 0 && restaurantId) {
        const aiParams: MenuAiGenerationClientParams | undefined =
          isAiGenerationEnabled
            ? { targetQuestionCount: aiTargetQuestionCount }
            : undefined;

        const menuData: CreateQuestionBankFromMenuClientData = {
          name: newBankName.trim(),
          description: newBankDescription.trim() || undefined,
          menuId: selectedMenuId,
          selectedCategoryNames: selectedCategories,
          generateAiQuestions: isAiGenerationEnabled,
          aiParams,
        };
        await createQuestionBankFromMenu(menuData);
      } else {
        const data: CreateQuestionBankData = {
          name: newBankName.trim(),
          description: newBankDescription.trim() || undefined,
        };
        await apiCreateQuestionBank(data);
      }
      onBankCreated();
    } catch (error: any) {
      console.error("Error creating bank:", error);
      setFormError(formatErrorMessage(error)); // Use formatted error message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Create New Question Bank" className="mb-6">
      <form onSubmit={handleCreateBank} className="p-4 space-y-4">
        {formError && (
          <div className="p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-md">
            {formError}
          </div>
        )}
        <div>
          <label
            htmlFor="bankName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="bankName"
            type="text"
            value={newBankName}
            onChange={(e) => {
              setNewBankName(e.target.value);
              if (nameError && e.target.value.trim()) {
                setNameError(null); // Clear error once user starts typing valid name
              }
            }}
            placeholder="e.g., Wine Knowledge, Cocktail Recipes"
            required
            className={`mt-1 block w-full px-3 py-2 border ${
              nameError ? "border-red-500" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "bankName-error" : undefined}
          />
          {nameError && (
            <p className="mt-1 text-xs text-red-600" id="bankName-error">
              {nameError}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="bankDescription"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (Optional)
          </label>
          <textarea
            id="bankDescription"
            value={newBankDescription}
            onChange={(e) => setNewBankDescription(e.target.value)}
            placeholder="A brief description of what this question bank covers"
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="pt-2 border-t mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Create from Menu (Optional)
          </h3>
          <div>
            <label
              htmlFor="menuSelect"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select a Menu
            </label>
            <select
              id="menuSelect"
              value={selectedMenuId}
              onChange={(e) => setSelectedMenuId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100"
              disabled={
                isLoadingMenus || !restaurantId || user?.role !== "restaurant"
              }
            >
              <option value="">-- Select a Menu --</option>
              {menus.map((menu) => (
                <option key={menu._id} value={menu._id}>
                  {menu.name}
                </option>
              ))}
            </select>
            {isLoadingMenus && (
              <p className="text-sm text-gray-500 mt-1">Loading menus...</p>
            )}
            {menusError && (
              <p className="text-sm text-red-500 mt-1">Error: {menusError}</p>
            )}
            {!isLoadingMenus &&
              menus.length === 0 &&
              restaurantId &&
              user?.role === "restaurant" &&
              !menusError && (
                <p className="text-sm text-gray-500 mt-1">
                  No menus found for this restaurant.
                </p>
              )}
          </div>
        </div>

        {selectedMenuId &&
          !isLoadingCategories &&
          menuCategories.length > 0 && (
            <fieldset className="pt-2">
              <legend className="block text-sm font-medium text-gray-700 mb-1">
                Select Categories from Menu (for Bank & AI)
              </legend>
              <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                {menuCategories.map((category) => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={category}
                      checked={selectedCategories.includes(category)}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setSelectedCategories((prev) =>
                          prev.includes(cat)
                            ? prev.filter((c) => c !== cat)
                            : [...prev, cat]
                        );
                      }}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        {selectedMenuId && !isLoadingCategories && categoriesError && (
          <p className="text-sm text-red-500 mt-1">
            Error loading categories: {categoriesError}
          </p>
        )}

        {selectedMenuId && selectedCategories.length > 0 && (
          <div className="pt-2 border-t mt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isAiGenerationEnabled}
                onChange={(e) => setIsAiGenerationEnabled(e.target.checked)}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Generate Questions with AI for selected categories
              </span>
            </label>
            {isAiGenerationEnabled && (
              <div className="mt-2 pl-6">
                <label
                  htmlFor="aiTargetQuestionCount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Questions to Generate (approx.)
                </label>
                <input
                  id="aiTargetQuestionCount"
                  type="number"
                  value={aiTargetQuestionCount}
                  onChange={(e) =>
                    setAiTargetQuestionCount(parseInt(e.target.value, 10) || 1)
                  }
                  min="1"
                  max="50" // Example max
                  className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : "Create Bank"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CreateQuestionBankForm;
