import React, { useEffect, useState } from "react";
import {
  CreateQuestionBankData,
  CreateQuestionBankFromMenuClientData,
  // MenuAiGenerationClientParams, // No longer needed
  // NewAiQuestionGenerationParams, // No longer needed
  // IQuestion, // No longer needed for review modal here
} from "../../types/questionBankTypes";
import { IMenuClient } from "../../types/menuTypes";
import {
  getMenusByRestaurant,
  getMenuWithItems,
  createQuestionBankFromMenu,
  createQuestionBank as apiCreateQuestionBank,
  // triggerAiQuestionGenerationProcess, // No longer needed
} from "../../services/api";
import Button from "../common/Button";
import Card from "../common/Card";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import { useValidation } from "../../context/ValidationContext";
// import AiQuestionReviewModal from "./AiQuestionReviewModal"; // No longer needed here

// const QUESTION_FOCUS_AREAS = [ // No longer needed here
//   { id: "Name", label: "Item Name" },
//   { id: "Ingredients", label: "Ingredients" },
//   { id: "Dietary", label: "Dietary Information" },
//   { id: "Description", label: "Description Details" },
// ];

interface CreateQuestionBankFormProps {
  onBankCreated: () => void;
  onCancel: () => void;
}

const CreateQuestionBankForm: React.FC<CreateQuestionBankFormProps> = ({
  onBankCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const { formatErrorMessage } = useValidation();
  const restaurantId = user?.restaurantId;

  const [newBankName, setNewBankName] = useState("");
  const [newBankDescription, setNewBankDescription] = useState("");

  const [menus, setMenus] = useState<IMenuClient[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // const [isAiGenerationEnabled, setIsAiGenerationEnabled] = useState(false); // Removed
  // const [aiTargetQuestionCount, setAiTargetQuestionCount] = // Removed
  //   useState<number>(10);
  const [areAllCategoriesSelected, setAreAllCategoriesSelected] =
    useState(false);

  // Removed AI generation parameter states
  // const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  // const [aiQuestionDifficulty, setAiQuestionDifficulty] =
  //   useState<string>("medium");
  // const [aiQuestionTypes, setAiQuestionTypes] = useState<string[]>([
  //   "multiple-choice-single",
  //   "true-false",
  // ]);

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
      setAreAllCategoriesSelected(false); // Reset when menu changes
    }
  }, [selectedMenuId, formatErrorMessage]);

  // Effect to sync areAllCategoriesSelected with individual selections
  useEffect(() => {
    if (
      menuCategories.length > 0 &&
      selectedCategories.length === menuCategories.length
    ) {
      setAreAllCategoriesSelected(true);
    } else {
      setAreAllCategoriesSelected(false);
    }
    // Reset focus areas if selected categories change significantly (e.g., cleared)
    // if (selectedCategories.length === 0) { // Removed, selectedFocusAreas no longer exists
    //   setSelectedFocusAreas([]);
    // }
  }, [selectedCategories, menuCategories]);

  const handleSelectAllCategories = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = e.target.checked;
    setAreAllCategoriesSelected(isChecked);
    if (isChecked) {
      setSelectedCategories([...menuCategories]);
    } else {
      setSelectedCategories([]);
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
    // Removed AI specific validation for selectedFocusAreas
    // if (
    //   isAiGenerationEnabled &&
    //   selectedFocusAreas.length === 0 &&
    //   selectedMenuId &&
    //   selectedCategories.length > 0
    // ) {
    //   setFormError(
    //     "Please select at least one Question Focus Area for AI generation."
    //   );
    //   return;
    // }

    setIsLoading(true);
    // let createdBankId: string | null = null; // No longer needed to store for AI step

    try {
      if (selectedMenuId && selectedCategories.length > 0 && restaurantId) {
        const menuData: CreateQuestionBankFromMenuClientData = {
          name: newBankName.trim(),
          description: newBankDescription.trim() || undefined,
          menuId: selectedMenuId,
          selectedCategoryNames: selectedCategories,
          generateAiQuestions: false,
        };
        await createQuestionBankFromMenu(menuData);
      } else {
        const data: CreateQuestionBankData = {
          name: newBankName.trim(),
          description: newBankDescription.trim() || undefined,
        };
        await apiCreateQuestionBank(data);
      }

      // AI generation logic removed
      // if (
      //   createdBankId &&
      //   isAiGenerationEnabled &&
      //   selectedMenuId &&
      //   selectedCategories.length > 0 &&
      //   restaurantId &&
      //   selectedFocusAreas.length > 0
      // ) {
      //   // ... AI payload and triggerAiQuestionGenerationProcess call ...
      //   // ... logic to open AiQuestionReviewModal ...
      // } else {
      //    onBankCreated(); // Call onBankCreated directly
      // }
      onBankCreated(); // Call onBankCreated directly after successful bank creation
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-gray-700">
        Create New Question Bank
      </h2>
      <form onSubmit={handleCreateBank}>
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
              if (nameError) setNameError(null); // Clear error on change
            }}
            className={`w-full px-3 py-2 border ${
              nameError ? "border-red-500" : "border-gray-300"
            } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            placeholder="E.g., 'Wine Knowledge - Level 1'"
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
            placeholder="E.g., 'Covers basic wine types, regions, and service standards.'"
          />
        </div>

        {user?.role === "restaurant" && (
          <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              Seed Bank from Menu (Optional)
            </h3>
            {isLoadingMenus && <LoadingSpinner />}
            {menusError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                Error loading menus: {menusError}
              </p>
            )}
            {!isLoadingMenus && !menusError && menus.length === 0 && (
              <p className="text-sm text-gray-500">
                No active menus found for your restaurant. You can upload menus
                in the 'Menus' section.
              </p>
            )}
            {!isLoadingMenus && !menusError && menus.length > 0 && (
              <>
                <div className="mb-3">
                  <label
                    htmlFor="menuSelect"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Select Menu
                  </label>
                  <select
                    id="menuSelect"
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">-- Select a Menu --</option>
                    {menus.map((menu) => (
                      <option key={menu._id} value={menu._id}>
                        {menu.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMenuId && (
                  <>
                    {isLoadingCategories && <LoadingSpinner />}
                    {categoriesError && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                        Error loading categories: {categoriesError}
                      </p>
                    )}
                    {!isLoadingCategories &&
                      !categoriesError &&
                      menuCategories.length > 0 && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Categories from Menu
                          </label>
                          <div className="mb-2">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded border-gray-300"
                                checked={areAllCategoriesSelected}
                                onChange={handleSelectAllCategories}
                                disabled={menuCategories.length === 0}
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                Select All / Deselect All
                              </span>
                            </label>
                          </div>
                          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {menuCategories.map((category) => (
                              <label
                                key={category}
                                className="inline-flex items-center text-sm text-gray-600 hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded border-gray-300"
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
                                <span className="ml-2">{category}</span>
                              </label>
                            ))}
                          </div>
                          {selectedCategories.length === 0 && (
                            <p className="mt-1 text-xs text-gray-500">
                              At least one category must be selected to seed the
                              bank from this menu.
                            </p>
                          )}
                        </div>
                      )}
                    {!isLoadingCategories &&
                      !categoriesError &&
                      menuCategories.length === 0 &&
                      selectedMenuId && (
                        <p className="text-sm text-gray-500">
                          No categories found in the selected menu, or menu has
                          no items.
                        </p>
                      )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* AI Generation Section Removed */}
        {/* <div className="mb-6 p-4 border border-dashed border-indigo-300 rounded-md bg-indigo-50"> ... </div> */}

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
              (selectedMenuId !== "" && selectedCategories.length === 0)
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
