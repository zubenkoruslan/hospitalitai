import React, { useEffect, useState } from "react";
import {
  CreateQuestionBankData,
  CreateQuestionBankFromMenuClientData,
  MenuAiGenerationClientParams,
} from "../../types/questionBankTypes";
import { IMenuClient, IMenuWithItemsClient } from "../../types/menuTypes";
import {
  getRestaurantMenus,
  getMenuWithItems,
  createQuestionBankFromMenu,
  createQuestionBank as apiCreateQuestionBank, // Renaming to avoid conflict if useQuestionBanks is used
} from "../../services/api";
import Button from "../common/Button";
import Card from "../common/Card";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

interface CreateQuestionBankFormProps {
  onBankCreated: () => void;
  onCancel: () => void;
  // We'll manage loading state internally primarily, but parent might have an overall loading state.
  // For now, let's assume internal management is sufficient.
}

const CreateQuestionBankForm: React.FC<CreateQuestionBankFormProps> = ({
  onBankCreated,
  onCancel,
}) => {
  const { user } = useAuth();
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

  const [isLoading, setIsLoading] = useState(false); // General loading for form submission
  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [menusError, setMenusError] = useState<Error | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<Error | null>(null);

  useEffect(() => {
    const loadMenus = async () => {
      if (!restaurantId || user?.role !== "restaurant") {
        setMenus([]);
        if (user?.role !== "restaurant" && restaurantId) {
          setMenusError(
            new Error("Only restaurant accounts can create banks from menus.")
          );
        } else if (!restaurantId) {
          setMenusError(
            new Error("Restaurant ID not available. Cannot load menus.")
          );
        }
        return;
      }
      setIsLoadingMenus(true);
      setMenusError(null);
      try {
        const fetchedMenus = await getRestaurantMenus(restaurantId);
        setMenus(fetchedMenus);
      } catch (err: any) {
        console.error("Error fetching menus:", err);
        setMenusError(err);
      }
      setIsLoadingMenus(false);
    };
    loadMenus();
  }, [restaurantId, user?.role]);

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
        setCategoriesError(err);
      }
      setIsLoadingCategories(false);
    };
    if (selectedMenuId) {
      loadCategories();
    }
  }, [selectedMenuId]);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      alert("Question bank name cannot be empty.");
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
        // Directly use the imported API service
        await apiCreateQuestionBank(data);
      }
      onBankCreated(); // Notify parent
    } catch (error: any) {
      console.error("Error creating bank:", error);
      alert(
        `Failed to create bank: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Create New Question Bank" className="mb-6">
      <form onSubmit={handleCreateBank} className="p-4 space-y-4">
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
            onChange={(e) => setNewBankName(e.target.value)}
            placeholder="e.g., Wine Knowledge, Cocktail Recipes"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
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
              <p className="text-sm text-red-500 mt-1">
                Error: {menusError.message}
              </p>
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
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Categories from Menu (for Bank & AI)
              </label>
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
                    <span>{category}</span>
                  </label>
                ))}
              </div>
              {selectedCategories.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Select at least one category if creating from this menu.
                </p>
              )}
            </div>
          )}
        {isLoadingCategories && (
          <p className="text-sm text-gray-500 mt-1">Loading categories...</p>
        )}
        {categoriesError && (
          <p className="text-sm text-red-500 mt-1">
            Error: {categoriesError.message}
          </p>
        )}
        {selectedMenuId &&
          !isLoadingCategories &&
          menuCategories.length === 0 &&
          !categoriesError && (
            <p className="text-sm text-gray-500 mt-1">
              No categories found for the selected menu.
            </p>
          )}

        {selectedMenuId && selectedCategories.length > 0 && (
          <div className="pt-2 border-t mt-4">
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={isAiGenerationEnabled}
                onChange={(e) => setIsAiGenerationEnabled(e.target.checked)}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Generate Questions with AI
              </span>
            </label>
            {isAiGenerationEnabled && (
              <div>
                <label
                  htmlFor="aiQuestionCount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Questions to Generate
                </label>
                <input
                  id="aiQuestionCount"
                  type="number"
                  value={aiTargetQuestionCount}
                  onChange={(e) =>
                    setAiTargetQuestionCount(parseInt(e.target.value, 10) || 1)
                  }
                  min="1"
                  max="50"
                  className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 space-x-3">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isLoading ||
              !newBankName.trim() ||
              (!!selectedMenuId && selectedCategories.length === 0)
            }
            variant="primary"
          >
            {isLoading ? <LoadingSpinner /> : "Save Bank"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CreateQuestionBankForm;
