import React, { useState, FormEvent, useEffect } from "react";
import { IQuestion } from "../../types/questionBankTypes";
import Button from "../common/Button";
import {
  generateMenuAiQuestions as apiTriggerAiGeneration,
  getMenuWithItems,
} from "../../services/api";
import { useValidation } from "../../context/ValidationContext";
import LoadingSpinner from "../common/LoadingSpinner";
import { MenuItem } from "../../types/menuItemTypes";

interface MenuCategoryDisplayItem {
  id: string;
  name: string;
}

// Dynamic focus areas based on category type
const FOCUS_AREAS_BY_TYPE = {
  wine: [
    { id: "Varieties", label: "Wine Varieties" },
    { id: "Regions", label: "Wine Regions" },
    { id: "Vintages", label: "Vintages" },
    { id: "Pairings", label: "Wine Pairings" },
    { id: "Service", label: "Wine Service" },
    { id: "Styles", label: "Wine Styles" },
    { id: "Producers", label: "Producers" },
    { id: "TastingNotes", label: "Tasting Notes" },
  ],
  beverage: [
    { id: "Preparation", label: "Drink Preparation" },
    { id: "Ingredients", label: "Ingredients" },
    { id: "Techniques", label: "Mixing Techniques" },
    { id: "Equipment", label: "Equipment" },
    { id: "Temperature", label: "Temperature" },
    { id: "Garnishes", label: "Garnishes" },
  ],
  food: [
    { id: "Name", label: "Item Name" },
    { id: "Ingredients", label: "Ingredients" },
    { id: "Dietary", label: "Dietary Information" },
    { id: "Description", label: "Description Details" },
    { id: "Allergens", label: "Allergens" },
    { id: "Preparation", label: "Preparation Methods" },
  ],
  procedures: [
    { id: "Safety", label: "Safety Protocols" },
    { id: "Hygiene", label: "Hygiene Standards" },
    { id: "Service", label: "Service Procedures" },
    { id: "Emergency", label: "Emergency Protocols" },
    { id: "CustomerService", label: "Customer Service" },
    { id: "Compliance", label: "Compliance Standards" },
  ],
};

// Helper function to determine category type from category names
const getCategoryType = (categoryNames: string[]) => {
  const combinedText = categoryNames.join(" ").toLowerCase();

  // Check for wine indicators
  if (
    /wine|vintage|grape|vineyard|cabernet|merlot|chardonnay|pinot|sauvignon|bordeaux|tuscany|napa|rioja|chianti|prosecco|riesling|syrah|shiraz|tempranillo|sangiovese|nebbiolo|moscato|chablis|barolo|brunello/i.test(
      combinedText
    )
  ) {
    return "wine";
  }

  // Check for beverage indicators (excluding wine)
  if (
    /beverage|drink|cocktail|coffee|tea|juice|smoothie|soda|beer|ale|lager|spirits|liqueur/i.test(
      combinedText
    )
  ) {
    return "beverage";
  }

  // Check for procedure indicators
  if (
    /procedure|protocol|safety|hygiene|policy|sop|standard|guideline|emergency/i.test(
      combinedText
    )
  ) {
    return "procedures";
  }

  // Default to food
  return "food";
};

interface GenerateAiQuestionsFormProps {
  bankId: string;
  menuId: string;
  onAiQuestionsGenerated: (questions: IQuestion[]) => void;
  onCloseRequest: () => void;
  initialCategories?: string[];
}

const GenerateAiQuestionsForm: React.FC<GenerateAiQuestionsFormProps> = ({
  bankId,
  menuId,
  onAiQuestionsGenerated,
  onCloseRequest,
  initialCategories,
}) => {
  const { formatErrorMessage } = useValidation();
  const [targetQuestionCountPerItemFocus, setTargetQuestionCountPerItemFocus] =
    useState<number>(3);

  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(false);

  const [selectedMenuCategories, setSelectedMenuCategories] = useState<
    string[]
  >(initialCategories || []);
  const [availableMenuCategories, setAvailableMenuCategories] = useState<
    MenuCategoryDisplayItem[]
  >([]);
  const [isLoadingMenuCategories, setIsLoadingMenuCategories] = useState(false);
  const [errorMenuCategories, setErrorMenuCategories] = useState<string | null>(
    null
  );

  // Determine current focus areas based on selected categories
  const currentCategoryType = getCategoryType(selectedMenuCategories);
  const currentFocusAreas = FOCUS_AREAS_BY_TYPE[currentCategoryType];

  // Clear selected focus areas when category type changes
  useEffect(() => {
    setSelectedFocusAreas([]);
  }, [currentCategoryType]);

  // Effect to fetch available categories when menuId changes
  useEffect(() => {
    if (!menuId) {
      setErrorMenuCategories("Menu ID is not provided.");
      setAvailableMenuCategories([]);
      // Don't reset selectedMenuCategories here, let the other effect handle initial state based on props
      return;
    }
    const fetchCategories = async () => {
      setIsLoadingMenuCategories(true);
      setErrorMenuCategories(null);
      setAvailableMenuCategories([]); // Reset before fetching new ones
      try {
        const menuDetails = await getMenuWithItems(menuId);
        if (menuDetails && menuDetails.items && menuDetails.items.length > 0) {
          const uniqueCategoryNames = Array.from(
            new Set(
              menuDetails.items
                .map((item: MenuItem) => item.category)
                .filter(Boolean)
            )
          );
          setAvailableMenuCategories(
            uniqueCategoryNames.map((name) => ({ id: name, name }))
          );
        } else {
          // setErrorMenuCategories("No categories found in the selected menu or menu has no items.");
        }
      } catch (err: unknown) {
        console.error("Error fetching menu categories:", err);

        // Type guard for axios error
        const isAxiosError = (
          error: unknown
        ): error is {
          response: { status: number };
        } => {
          return (
            typeof error === "object" && error !== null && "response" in error
          );
        };

        // Check if it's a 404 error (menu not found)
        if (isAxiosError(err) && err.response.status === 404) {
          setErrorMenuCategories(
            "The linked menu no longer exists. Please select a different menu."
          );
        } else {
          setErrorMenuCategories("Failed to load categories from the menu.");
        }
      } finally {
        setIsLoadingMenuCategories(false);
      }
    };
    fetchCategories();
  }, [menuId]);

  // Effect to set selected categories from initialCategories once availableMenuCategories are loaded
  useEffect(() => {
    if (
      initialCategories &&
      initialCategories.length > 0 &&
      availableMenuCategories.length > 0
    ) {
      const validInitialCategories = initialCategories.filter((initCat) =>
        availableMenuCategories.some((availCat) => availCat.id === initCat)
      );
      // Only set if different to avoid potential loops if not managed carefully, though with current deps it should be fine.
      // This also ensures that if a user deselects all, and then initialCategories prop somehow changes without menuId changing,
      // it correctly re-applies the initial prop based selection.
      setSelectedMenuCategories(validInitialCategories);
    } else if (
      initialCategories &&
      initialCategories.length > 0 &&
      availableMenuCategories.length === 0 &&
      !isLoadingMenuCategories
    ) {
      // This case means initialCategories were provided, but the fetched menu has no categories.
      // We should probably clear selectedMenuCategories or rely on the initial state from the prop (which might be [])
      setSelectedMenuCategories([]);
    } else if (!initialCategories || initialCategories.length === 0) {
      // If no initialCategories are provided (e.g. on subsequent uses of the form for the same menu after initial load)
      // we don't want to clear user's manual selections. But if it's truly the first load with no initial, it's fine.
      // The `useState(initialCategories || [])` handles the very first load case.
      // This block might be redundant if `useState` already correctly handles it.
    }
  }, [initialCategories, availableMenuCategories, isLoadingMenuCategories]);

  const handleFocusAreaChange = (focusAreaId: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(focusAreaId)
        ? prev.filter((id) => id !== focusAreaId)
        : [...prev, focusAreaId]
    );
  };

  // ADDED: Handler for menu category selection
  const handleMenuCategoryToggle = (categoryId: string) => {
    setSelectedMenuCategories((prevSelected) =>
      prevSelected.includes(categoryId)
        ? prevSelected.filter((id) => id !== categoryId)
        : [...prevSelected, categoryId]
    );
  };

  // ADDED: Handler for select/deselect all menu categories
  const handleToggleSelectAllMenuCategories = () => {
    if (selectedMenuCategories.length === availableMenuCategories.length) {
      setSelectedMenuCategories([]);
    } else {
      setSelectedMenuCategories(availableMenuCategories.map((cat) => cat.id));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!menuId) {
      setFormError("A Menu ID is required but was not provided.");
      return;
    }
    if (availableMenuCategories.length === 0) {
      setFormError(
        "No menu categories are available for this menu. Cannot generate AI questions without categories."
      );
      return;
    }
    if (selectedMenuCategories.length === 0) {
      setFormError(
        "Please select at least one menu category for AI generation."
      );
      return;
    }
    if (selectedFocusAreas.length === 0) {
      setFormError(
        `Please select at least one Question Focus Area for ${currentCategoryType} questions.`
      );
      return;
    }
    if (targetQuestionCountPerItemFocus <= 0) {
      setFormError(
        "Target question count per item/focus must be a positive number."
      );
      return;
    }
    if (targetQuestionCountPerItemFocus > 10) {
      setFormError(
        "Target question count per item/focus should not exceed 10."
      );
      return;
    }
    setInternalIsLoading(true);

    const payload = {
      menuId: menuId,
      bankId: bankId,
      categoriesToFocus: selectedMenuCategories,
      numQuestionsPerItem: targetQuestionCountPerItemFocus,
    };

    console.log("AI Generation Payload:", JSON.stringify(payload, null, 2));

    try {
      const generatedQuestions = await apiTriggerAiGeneration(payload);
      if (generatedQuestions && generatedQuestions.length > 0) {
        onAiQuestionsGenerated(generatedQuestions);
      } else {
        setFormError(
          "The AI did not generate any questions for the given criteria. Try adjusting the input."
        );
      }
    } catch (err) {
      console.error("Error generating AI questions:", err);
      setFormError(formatErrorMessage(err));
    } finally {
      setInternalIsLoading(false);
    }
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="p-1 space-y-4">
      {formError && (
        <div
          className="p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-md"
          role="alert"
        >
          {formError}
        </div>
      )}

      {/* ADDED: Menu Category Selection Section */}
      <div className="pt-2">
        <div className="flex justify-between items-center mb-1">
          <label className={`${commonLabelClass}`}>
            Menu Categories (Select at least one)
          </label>
          {availableMenuCategories.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleToggleSelectAllMenuCategories}
              disabled={internalIsLoading || isLoadingMenuCategories}
              className="text-xs px-2 py-1"
            >
              {selectedMenuCategories.length === availableMenuCategories.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          )}
        </div>
        {isLoadingMenuCategories && (
          <LoadingSpinner message="Loading menu categories..." />
        )}
        {errorMenuCategories && (
          <p className="text-xs text-red-500">{errorMenuCategories}</p>
        )}
        {!isLoadingMenuCategories &&
          !errorMenuCategories &&
          availableMenuCategories.length === 0 && (
            <p className="text-xs text-gray-500 italic">
              No categories available for this menu or menu is empty.
            </p>
          )}
        {!isLoadingMenuCategories &&
          !errorMenuCategories &&
          availableMenuCategories.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 p-2 border rounded-md bg-gray-50 max-h-48 overflow-y-auto">
              {availableMenuCategories.map((category) => (
                <div key={category.id} className="flex items-center">
                  <input
                    id={`menu-category-${category.id}-${bankId}`}
                    type="checkbox"
                    value={category.id}
                    checked={selectedMenuCategories.includes(category.id)}
                    onChange={() => handleMenuCategoryToggle(category.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                    disabled={internalIsLoading}
                  />
                  <label
                    htmlFor={`menu-category-${category.id}-${bankId}`}
                    className="ml-2 text-sm text-gray-600 truncate"
                    title={category.name}
                  >
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* REMOVED: Old categories input field */}
      {/* <div> ... </div> */}

      <div>
        <label
          htmlFor="targetQuestionCountPerItemFocus"
          className={commonLabelClass}
        >
          Number of Questions per Item/Focus
        </label>
        <input
          id="targetQuestionCountPerItemFocus"
          type="number"
          value={targetQuestionCountPerItemFocus}
          onChange={(e) =>
            setTargetQuestionCountPerItemFocus(
              parseInt(e.target.value, 10) || 1
            )
          }
          min="1"
          max="10"
          required
          className={commonInputClass}
          disabled={internalIsLoading}
        />
      </div>

      <div className="pt-2">
        <label className={`${commonLabelClass} mb-1`}>
          Question Focus Areas (Select at least one)
          {selectedMenuCategories.length > 0 && (
            <span className="text-xs text-gray-500 ml-2">
              - {currentCategoryType} categories
            </span>
          )}
        </label>
        {selectedMenuCategories.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 bg-gray-50 rounded-md border">
            Please select menu categories first to see relevant focus areas.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-2 p-2 border rounded-md bg-gray-50">
            {currentFocusAreas.map((area) => (
              <div key={area.id} className="flex items-center">
                <input
                  id={`focus-${area.id}-${bankId}`}
                  type="checkbox"
                  value={area.id}
                  checked={selectedFocusAreas.includes(area.id)}
                  onChange={() => handleFocusAreaChange(area.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  disabled={internalIsLoading}
                />
                <label
                  htmlFor={`focus-${area.id}-${bankId}`}
                  className="ml-2 text-sm text-gray-600"
                >
                  {area.label}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REMOVED: Question Difficulty Selection */}
      {/* <div className="pt-2"> ... </div> */}

      <div className="flex justify-end space-x-2 pt-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCloseRequest}
          disabled={internalIsLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={internalIsLoading || isLoadingMenuCategories}
        >
          {internalIsLoading ? <LoadingSpinner /> : "Generate Questions"}
        </Button>
      </div>
    </form>
  );
};

export default GenerateAiQuestionsForm;
