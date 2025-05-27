import React, { useEffect, useState } from "react";
import {
  CreateQuestionBankData,
  // CreateQuestionBankFromMenuClientData, // Remove this import
  // MenuAiGenerationClientParams, // No longer needed
  // NewAiQuestionGenerationParams, // No longer needed
  // IQuestion, // No longer needed for review modal here
  CreateQuestionBankClientData,
  IQuestionBank, // Added for onBankCreated details
} from "../../types/questionBankTypes";
import { IMenuClient } from "../../types/menuTypes";
import { MenuItem } from "../../types/menuItemTypes"; // ADDED: Import MenuItem
import { ISopDocument, ISopCategory } from "../../types/sopTypes"; // Import ISopCategory
import {
  getMenusByRestaurant,
  getMenuWithItems,
  createQuestionBankFromMenu,
  createQuestionBank as apiCreateQuestionBank,
  listSopDocumentsFiltered,
  getSopDocumentDetails,
  // triggerAiQuestionGenerationProcess, // No longer needed
} from "../../services/api";
import Button from "../common/Button";
import Card from "../common/Card";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import { useValidation } from "../../context/ValidationContext";
import SopCategoryRecursiveSelector from "./SopCategoryRecursiveSelector"; // Import the new component

// Keywords to identify beverage categories (case-insensitive check)
const BEVERAGE_CATEGORY_KEYWORDS = [
  "beverage",
  "drink",
  "coffee",
  "tea",
  "soda",
  "wine",
  "beer",
  "cocktail",
  "juice",
  "smoothie",
  "milkshake",
  "water",
  "spirit",
  "liqueur",
];

interface CreateQuestionBankFormProps {
  onBankCreated: (details: {
    bankId: string;
    sourceType: "manual" | "menu" | "sop";
    // generationMethod?: "ai" | "manual"; // Removed generationMethod
  }) => void;
  onCancel: () => void;
}

// Helper function to get all category names from a nested structure
const getAllCategoryNames = (categories: ISopCategory[]): string[] => {
  let names: string[] = [];
  categories.forEach((category) => {
    names.push(category.name);
    if (category.subCategories) {
      names = names.concat(getAllCategoryNames(category.subCategories));
    }
  });
  return names;
};

const CreateQuestionBankForm: React.FC<CreateQuestionBankFormProps> = ({
  onBankCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const { formatErrorMessage } = useValidation();
  const restaurantId = user?.restaurantId;

  // Source Type
  const [sourceType, setSourceType] = useState<"menu" | "sop" | "manual">(
    "manual"
  ); // Default to manual

  // General Bank Details
  const [newBankName, setNewBankName] = useState("");
  const [newBankDescription, setNewBankDescription] = useState("");

  // Menu Specific State
  const [menus, setMenus] = useState<IMenuClient[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [areAllCategoriesSelected, setAreAllCategoriesSelected] =
    useState(false);

  // ADDED: State for beverage category handling
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]); // All items of the selected menu
  const [beverageItemCategories, setBeverageItemCategories] = useState<
    string[]
  >([]); // Unique categories of beverage items
  const [nonBeverageItemCategories, setNonBeverageItemCategories] = useState<
    string[]
  >([]); // Unique categories of non-beverage items
  const [isBeverageMenu, setIsBeverageMenu] = useState<boolean>(false); // True if menu contains any beverage items/categories
  const [includeBeverageCategoriesInBank, setIncludeBeverageCategoriesInBank] =
    useState<boolean>(false); // Checkbox state
  const [
    selectedBeverageCategoriesForBank,
    setSelectedBeverageCategoriesForBank,
  ] = useState<string[]>([]); // Selected beverage categories for the bank
  const [
    areAllBeverageCategoriesSelected,
    setAreAllBeverageCategoriesSelected,
  ] = useState(false);

  // SOP Specific State
  const [sopDocuments, setSopDocuments] = useState<ISopDocument[]>([]);
  const [selectedSopDocumentId, setSelectedSopDocumentId] =
    useState<string>("");
  const [sopCategories, setSopCategories] = useState<ISopCategory[]>([]); // Changed to ISopCategory[]
  const [selectedSopCategories, setSelectedSopCategories] = useState<string[]>(
    []
  ); // Stores category names
  const [areAllSopCategoriesSelected, setAreAllSopCategoriesSelected] =
    useState(false);
  const [isLoadingSops, setIsLoadingSops] = useState(false);
  const [sopsError, setSopsError] = useState<string | null>(null);
  const [isLoadingSopCategories, setIsLoadingSopCategories] = useState(false);
  const [sopCategoriesError, setSopCategoriesError] = useState<string | null>(
    null
  );

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [menusError, setMenusError] = useState<string | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Removed States for AI Question Review Modal
  // const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  // const [questionsForReview, setQuestionsForReview] = useState<IQuestion[]>([]);
  // const [reviewTargetBankId, setReviewTargetBankId] = useState<string>("");

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
        setMenuItems([]);
        setBeverageItemCategories([]);
        setNonBeverageItemCategories([]);
        setIsBeverageMenu(false);
        setSelectedCategories([]);
        setSelectedBeverageCategoriesForBank([]);
        setIncludeBeverageCategoriesInBank(false);
        setAreAllCategoriesSelected(false);
        setAreAllBeverageCategoriesSelected(false);
        return;
      }
      setIsLoadingCategories(true);
      setCategoriesError(null);
      try {
        const menuWithItems = await getMenuWithItems(selectedMenuId);
        setMenuItems(menuWithItems.items || []); // Store all items

        const allItems = menuWithItems.items || [];
        const bevCats: string[] = [];
        const nonBevCats: string[] = [];
        const uniqueItemCategories = new Set<string>();

        allItems.forEach((item) => {
          const categoryLower = item.category?.toLowerCase() || "";
          const isBeverage = BEVERAGE_CATEGORY_KEYWORDS.some((keyword) =>
            categoryLower.includes(keyword)
          );
          if (item.category) {
            uniqueItemCategories.add(item.category); // Add to overall unique set first
          }
        });

        uniqueItemCategories.forEach((cat) => {
          const categoryLower = cat.toLowerCase();
          const isBeverage = BEVERAGE_CATEGORY_KEYWORDS.some((keyword) =>
            categoryLower.includes(keyword)
          );
          if (isBeverage) {
            bevCats.push(cat);
          } else {
            nonBevCats.push(cat);
          }
        });

        setBeverageItemCategories(Array.from(new Set(bevCats)));
        setNonBeverageItemCategories(Array.from(new Set(nonBevCats)));
        setIsBeverageMenu(bevCats.length > 0);

        // Reset selections when menu changes
        setSelectedCategories([]);
        setSelectedBeverageCategoriesForBank([]);
        setIncludeBeverageCategoriesInBank(false);
        setAreAllCategoriesSelected(false);
        setAreAllBeverageCategoriesSelected(false);
      } catch (err: any) {
        console.error("Error fetching menu categories:", err);
        setCategoriesError(formatErrorMessage(err));
        setBeverageItemCategories([]);
        setNonBeverageItemCategories([]);
        setIsBeverageMenu(false);
      }
      setIsLoadingCategories(false);
    };
    if (selectedMenuId) {
      loadCategories();
    } else {
      // Clear all menu related states if no menu is selected
      setMenuItems([]);
      setBeverageItemCategories([]);
      setNonBeverageItemCategories([]);
      setIsBeverageMenu(false);
      setSelectedCategories([]);
      setSelectedBeverageCategoriesForBank([]);
      setIncludeBeverageCategoriesInBank(false);
      setAreAllCategoriesSelected(false);
      setAreAllBeverageCategoriesSelected(false);
    }
  }, [selectedMenuId, formatErrorMessage]);

  // Effect to sync areAllCategoriesSelected with individual selections (for NON-BEVERAGE categories)
  useEffect(() => {
    if (
      nonBeverageItemCategories.length > 0 &&
      selectedCategories.length === nonBeverageItemCategories.length
    ) {
      setAreAllCategoriesSelected(true);
    } else {
      setAreAllCategoriesSelected(false);
    }
  }, [selectedCategories, nonBeverageItemCategories]);

  // ADDED: Effect to sync areAllBeverageCategoriesSelected with individual selections
  useEffect(() => {
    if (
      beverageItemCategories.length > 0 &&
      selectedBeverageCategoriesForBank.length === beverageItemCategories.length
    ) {
      setAreAllBeverageCategoriesSelected(true);
    } else {
      setAreAllBeverageCategoriesSelected(false);
    }
  }, [selectedBeverageCategoriesForBank, beverageItemCategories]);

  const handleSelectAllCategories = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = e.target.checked;
    setAreAllCategoriesSelected(isChecked);
    if (isChecked) {
      setSelectedCategories([...nonBeverageItemCategories]);
    } else {
      setSelectedCategories([]);
    }
  };

  // ADDED: Handler for selecting/deselecting all BEVERAGE categories
  const handleSelectAllBeverageCategories = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = e.target.checked;
    setAreAllBeverageCategoriesSelected(isChecked);
    if (isChecked) {
      setSelectedBeverageCategoriesForBank([...beverageItemCategories]);
    } else {
      setSelectedBeverageCategoriesForBank([]);
    }
  };

  const handleSelectAllSopCategories = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = e.target.checked;
    setAreAllSopCategoriesSelected(isChecked);
    if (isChecked) {
      setSelectedSopCategories(getAllCategoryNames(sopCategories));
    } else {
      setSelectedSopCategories([]);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNameError(null);

    if (!newBankName.trim()) {
      setNameError("Question bank name cannot be empty.");
      return;
    }
    if (!restaurantId) {
      setFormError("Restaurant ID is not available. Cannot create bank.");
      return;
    }

    setIsLoading(true);

    const commonData = {
      name: newBankName.trim(),
      description: newBankDescription.trim() || undefined,
      restaurantId,
    };

    let dataToSend: CreateQuestionBankClientData;

    if (sourceType === "manual") {
      dataToSend = {
        ...commonData,
        sourceType: "MANUAL",
      };
    } else if (sourceType === "menu") {
      if (!selectedMenuId || selectedCategories.length === 0) {
        setFormError(
          "Please select a menu and at least one category for a menu-sourced bank."
        );
        setIsLoading(false);
        return;
      }
      dataToSend = {
        ...commonData,
        sourceType: "MENU",
        sourceMenuId: selectedMenuId,
        categoriesToInclude: selectedCategories, // These are now selected non-beverage categories
        beverageCategoriesToInclude:
          includeBeverageCategoriesInBank &&
          selectedBeverageCategoriesForBank.length > 0
            ? selectedBeverageCategoriesForBank
            : undefined,
      };
    } else if (sourceType === "sop") {
      if (!selectedSopDocumentId) {
        setFormError("Please select an SOP document for an SOP-sourced bank.");
        setIsLoading(false);
        return;
      }
      if (selectedSopCategories.length === 0) {
        setFormError(
          "Please select at least one category for an SOP-sourced bank."
        );
        setIsLoading(false);
        return;
      }
      dataToSend = {
        ...commonData,
        sourceType: "SOP",
        sourceSopDocumentId: selectedSopDocumentId,
        categories: selectedSopCategories, // These are SOP category names
        generationMethod: "MANUAL", // ADDED: Default to MANUAL for now
      };
    } else {
      setFormError("Invalid source type selected.");
      setIsLoading(false);
      return;
    }

    try {
      const createdBank = await apiCreateQuestionBank(dataToSend);
      onBankCreated({
        bankId: createdBank._id,
        sourceType: dataToSend.sourceType.toLowerCase() as
          | "manual"
          | "menu"
          | "sop",
      });
    } catch (err: any) {
      console.error("Error creating question bank:", err);
      setFormError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Removed handleReviewComplete and handleReviewModalClose functions
  // const handleReviewComplete = () => {
  //   setIsReviewModalOpen(false);
  //   setQuestionsForReview([]);
  //   setReviewTargetBankId("");
  //   onBankCreated(); // Call the original callback after review is complete
  // };

  // const handleReviewModalClose = () => {
  //   setIsReviewModalOpen(false);
  //   setQuestionsForReview([]);
  //   setReviewTargetBankId("");
  //   // If the user closes the modal without completing the review,
  //   // we still consider the bank created but AI questions are just pending.
  //   // The onBankCreated() might have been deferred, so call it now.
  //   onBankCreated();
  // };

  // Effect to load SOPs when sourceType changes to 'sop' or restaurantId is available
  useEffect(() => {
    const loadSops = async () => {
      if (sourceType !== "sop" || !restaurantId) {
        setSopDocuments([]);
        setSelectedSopDocumentId("");
        setSopCategories([]);
        setSelectedSopCategories([]);
        setAreAllSopCategoriesSelected(false);
        return;
      }
      setIsLoadingSops(true);
      setSopsError(null);
      try {
        // Assuming listSopDocumentsFiltered correctly fetches SOPs suitable for bank creation (e.g., processed)
        const fetchedSops = await listSopDocumentsFiltered(restaurantId);
        setSopDocuments(fetchedSops);
      } catch (err: any) {
        console.error("Error fetching SOP documents:", err);
        setSopsError(formatErrorMessage(err));
      }
      setIsLoadingSops(false);
    };

    loadSops();
  }, [sourceType, restaurantId, formatErrorMessage]);

  // Effect to load categories from the selected SOP document
  useEffect(() => {
    const loadSopCategories = async () => {
      if (!selectedSopDocumentId) {
        setSopCategories([]);
        setSelectedSopCategories([]);
        setAreAllSopCategoriesSelected(false);
        return;
      }
      setIsLoadingSopCategories(true);
      setSopCategoriesError(null);
      try {
        const sopDoc = await getSopDocumentDetails(selectedSopDocumentId);
        setSopCategories(sopDoc.categories || []);
        setSelectedSopCategories([]);
        setAreAllSopCategoriesSelected(false);
      } catch (err: any) {
        console.error("Error fetching SOP categories:", err);
        setSopCategoriesError(formatErrorMessage(err));
        setSopCategories([]);
        setSelectedSopCategories([]);
        setAreAllSopCategoriesSelected(false);
      }
      setIsLoadingSopCategories(false);
    };

    if (sourceType === "sop" && selectedSopDocumentId) {
      loadSopCategories();
    }
  }, [selectedSopDocumentId, sourceType, formatErrorMessage]);

  // Effect to sync areAllSopCategoriesSelected with individual SOP category selections
  useEffect(() => {
    if (
      sopCategories.length > 0 && // Check if sopCategories (the source of all names) is populated
      selectedSopCategories.length === getAllCategoryNames(sopCategories).length
    ) {
      setAreAllSopCategoriesSelected(true);
    } else {
      setAreAllSopCategoriesSelected(false);
    }
  }, [selectedSopCategories, sopCategories]);

  const handleCategoryChange = (categoryName: string) => {
    // For menu categories
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Updated to work with category IDs for toggling, but stores names
  const handleSopCategoryToggle = (
    categoryId: string,
    categoryName: string
  ) => {
    setSelectedSopCategories((prevSelectedNames) =>
      prevSelectedNames.includes(categoryName)
        ? prevSelectedNames.filter((name) => name !== categoryName)
        : [...prevSelectedNames, categoryName]
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-gray-700">
        Create New Question Bank
      </h2>

      {/* Source Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Source Type
        </label>
        <div className="flex items-center space-x-4">
          {(
            [
              { label: "Manual Entry", value: "manual" },
              { label: "From Menu", value: "menu" },
              { label: "From SOP Document", value: "sop" },
            ] as const
          ).map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name="sourceType"
                value={option.value}
                checked={sourceType === option.value}
                onChange={(e) => {
                  const newSourceType = e.target.value as
                    | "manual"
                    | "menu"
                    | "sop";
                  setSourceType(newSourceType);
                  // Reset states when source type changes
                  setNewBankName("");
                  setNewBankDescription("");
                  setSelectedMenuId("");
                  setSelectedCategories([]);
                  setAreAllCategoriesSelected(false);
                  setSelectedSopDocumentId("");
                  setSopCategories([]);
                  setSelectedSopCategories([]);
                  setAreAllSopCategoriesSelected(false);
                  setFormError(null);
                  setNameError(null);
                  setMenusError(null);
                  setCategoriesError(null);
                  setSopsError(null);
                  setSopCategoriesError(null);
                }}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={handleCreateBank} className="space-y-6">
        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
            {formError}
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="bankName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="bankName"
            value={newBankName}
            onChange={(e) => {
              setNewBankName(e.target.value);
              if (nameError) setNameError(null);
            }}
            className={`w-full px-3 py-2 border ${
              nameError ? "border-red-500" : "border-gray-300"
            } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            placeholder="e.g., Wine Knowledge Fundamentals, Service Standards Chapter 1"
          />
          {nameError && (
            <p className="mt-1 text-xs text-red-500">{nameError}</p>
          )}
        </div>

        <div className="mb-6">
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
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Briefly describe the purpose or content of this question bank."
          />
        </div>

        {/* Conditional UI for Menu Source Type */}
        {sourceType === "menu" && (
          <>
            {isLoadingMenus && <LoadingSpinner message="Loading menus..." />}
            {menusError && (
              <div className="text-red-500 text-sm">{menusError}</div>
            )}
            {!isLoadingMenus && !menusError && menus.length === 0 && (
              <p className="text-sm text-gray-500">
                No menus available to create a question bank from. Ensure you
                have active menus in your restaurant setup.
              </p>
            )}
            {menus.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="menu-select"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Select Menu
                  </label>
                  <select
                    id="menu-select"
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                    disabled={isLoadingMenus}
                  >
                    <option value="" disabled>
                      {isLoadingMenus
                        ? "Loading menus..."
                        : menus.length > 0
                        ? "-- Select a Menu --"
                        : "No menus available"}
                    </option>
                    {menus.map((menu) => (
                      <option key={menu._id} value={menu._id}>
                        {menu.name}
                      </option>
                    ))}
                  </select>
                  {menusError && (
                    <p className="text-xs text-red-600 mt-1">{menusError}</p>
                  )}
                </div>

                {selectedMenuId && isLoadingCategories && (
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                )}

                {selectedMenuId &&
                  !isLoadingCategories &&
                  !categoriesError &&
                  (nonBeverageItemCategories.length > 0 ||
                    beverageItemCategories.length > 0) && (
                    <>
                      {/* Non-Beverage Categories Selection */}
                      {nonBeverageItemCategories.length > 0 && (
                        <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Main Menu Categories for Bank
                          </label>
                          <label className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              checked={areAllCategoriesSelected}
                              onChange={handleSelectAllCategories} // Handles non-beverage
                              disabled={nonBeverageItemCategories.length === 0}
                            />
                            <span className="ml-2 text-sm text-gray-600">
                              Select All Main Categories
                            </span>
                          </label>
                          <div className="max-h-40 overflow-y-auto space-y-1 pl-2 border-l-2 border-indigo-100">
                            {nonBeverageItemCategories.map((category) => (
                              <label
                                key={category}
                                className="flex items-center"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                  value={category}
                                  checked={selectedCategories.includes(
                                    category
                                  )}
                                  onChange={(e) => {
                                    const cat = e.target.value;
                                    setSelectedCategories((prev) =>
                                      prev.includes(cat)
                                        ? prev.filter((c) => c !== cat)
                                        : [...prev, cat]
                                    );
                                  }}
                                />
                                <span className="ml-2 text-sm text-gray-800">
                                  {category}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Beverage Categories Section - Conditional */}
                      {isBeverageMenu && beverageItemCategories.length > 0 && (
                        <div className="mt-4 p-3 border border-blue-200 rounded-md bg-blue-50">
                          <label className="flex items-center mb-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={includeBeverageCategoriesInBank}
                              onChange={(e) =>
                                setIncludeBeverageCategoriesInBank(
                                  e.target.checked
                                )
                              }
                            />
                            <span className="ml-2 text-sm font-medium text-blue-700">
                              Dedicate section to specific beverage categories?
                            </span>
                          </label>
                          {includeBeverageCategoriesInBank && (
                            <div className="mt-2 pl-2 space-y-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Select Beverage Categories to Include:
                              </label>
                              <label className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  checked={areAllBeverageCategoriesSelected}
                                  onChange={handleSelectAllBeverageCategories}
                                  disabled={beverageItemCategories.length === 0}
                                />
                                <span className="ml-2 text-sm text-gray-600">
                                  Select All Beverage Categories
                                </span>
                              </label>
                              <div className="max-h-32 overflow-y-auto space-y-1 pl-2 border-l-2 border-blue-100">
                                {beverageItemCategories.map((category) => (
                                  <label
                                    key={`bev-${category}`}
                                    className="flex items-center"
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      value={category}
                                      checked={selectedBeverageCategoriesForBank.includes(
                                        category
                                      )}
                                      onChange={(e) => {
                                        const cat = e.target.value;
                                        setSelectedBeverageCategoriesForBank(
                                          (prev) =>
                                            prev.includes(cat)
                                              ? prev.filter((c) => c !== cat)
                                              : [...prev, cat]
                                        );
                                      }}
                                    />
                                    <span className="ml-2 text-sm text-gray-800">
                                      {category}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                {selectedMenuId &&
                  !isLoadingCategories &&
                  menuItems.length === 0 &&
                  !categoriesError && (
                    <p className="text-sm text-gray-500">
                      This menu has no categories or items to select from.
                    </p>
                  )}
              </div>
            )}
          </>
        )}

        {/* Conditional UI for SOP Source Type */}
        {sourceType === "sop" && (
          <>
            <div>
              <label
                htmlFor="sopSelect"
                className="block text-sm font-medium text-gray-700"
              >
                Select SOP Document
              </label>
              <select
                id="sopSelect"
                value={selectedSopDocumentId}
                onChange={(e) => {
                  setSelectedSopDocumentId(e.target.value);
                  setSopCategories([]); // Reset categories when SOP changes
                  setSelectedSopCategories([]);
                  setAreAllSopCategoriesSelected(false);
                  setSopCategoriesError(null);
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                disabled={isLoadingSops || sopDocuments.length === 0}
              >
                <option value="">-- Select an SOP Document --</option>
                {sopDocuments.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.title}
                  </option>
                ))}
              </select>
              {isLoadingSops && <LoadingSpinner message="Loading SOPs..." />}
              {sopsError && (
                <div className="text-red-500 text-sm mt-1">
                  Error loading SOPs: {sopsError}
                </div>
              )}
              {!isLoadingSops &&
                sopDocuments.length === 0 &&
                sourceType === "sop" &&
                !sopsError && (
                  <p className="text-sm text-gray-500 mt-1">
                    No processed SOP documents found for this restaurant.
                  </p>
                )}
            </div>

            {isLoadingSopCategories && (
              <div className="mt-4 text-center">
                <LoadingSpinner />
                <p className="text-sm text-slate-600 mt-2">
                  Loading SOP categories...
                </p>
              </div>
            )}
            {sopCategoriesError && (
              <div className="mt-4 p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
                Error loading SOP categories: {sopCategoriesError}
              </div>
            )}

            {!isLoadingSopCategories &&
              selectedSopDocumentId &&
              !sopCategoriesError && (
                <div className="mt-6">
                  {sopCategories.length > 0 ? (
                    <>
                      <h4 className="text-md font-semibold text-slate-800 mb-3">
                        Select Categories for Question Bank
                      </h4>
                      <div className="mb-3 flex items-center p-2 bg-slate-50 rounded-md border border-slate-200">
                        <input
                          type="checkbox"
                          id="select-all-sop-categories"
                          checked={areAllSopCategoriesSelected}
                          onChange={handleSelectAllSopCategories}
                          className="h-4 w-4 text-indigo-600 border-slate-400 rounded focus:ring-indigo-500 focus:ring-offset-1"
                        />
                        <label
                          htmlFor="select-all-sop-categories"
                          className="ml-3 text-sm font-medium text-slate-700"
                        >
                          Select All Categories
                        </label>
                      </div>
                      <div className="max-h-72 overflow-y-auto border border-slate-300 rounded-lg shadow-sm p-4 bg-white">
                        <SopCategoryRecursiveSelector
                          categories={sopCategories} // Pass full ISopCategory[]
                          selectedCategoryIds={selectedSopCategories} // Pass selected names (will be adapted in selector or here)
                          onCategoryToggle={handleSopCategoryToggle} // Pass the new handler
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500 italic text-center">
                      This SOP document has no categories defined, or categories
                      could not be loaded.
                    </p>
                  )}
                </div>
              )}
          </>
        )}

        <div className="flex justify-end space-x-3 mt-8">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              isLoading ||
              !newBankName.trim() ||
              (sourceType === "menu" && // Corrected condition for menu
                (!selectedMenuId || selectedCategories.length === 0)) ||
              (sourceType === "sop" && // Added condition for SOP
                (!selectedSopDocumentId || selectedSopCategories.length === 0))
            }
            isLoading={isLoading}
            className="px-4 py-2"
          >
            {isLoading ? "Creating..." : "Create Bank"}
          </Button>
        </div>
      </form>

      {/* AI Question Review Modal instantiation removed */}
      {/* {isReviewModalOpen && questionsForReview.length > 0 && reviewTargetBankId && (
        <AiQuestionReviewModal
          generatedQuestions={questionsForReview}
          targetBankId={reviewTargetBankId}
          onClose={handleReviewModalClose}
          onReviewComplete={handleReviewComplete}
        />
      )} */}
    </Card>
  );
};

export default CreateQuestionBankForm;
