import React, { useState, FormEvent, useEffect } from "react";
import {
  IQuestion,
  NewAiQuestionGenerationParams,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import { triggerAiQuestionGenerationProcess as apiTriggerAiGeneration } from "../../services/api";
import { useValidation } from "../../context/ValidationContext";
import LoadingSpinner from "../common/LoadingSpinner";

const QUESTION_FOCUS_AREAS = [
  { id: "Name", label: "Item Name" },
  { id: "Ingredients", label: "Ingredients" },
  { id: "Dietary", label: "Dietary Information" },
  { id: "Description", label: "Description Details" },
];

interface GenerateAiQuestionsFormProps {
  bankId: string;
  menuId?: string;
  bankCategories: string[];
  onAiQuestionsGenerated: (questions: IQuestion[]) => void;
  onCloseRequest: () => void;
}

const GenerateAiQuestionsForm: React.FC<GenerateAiQuestionsFormProps> = ({
  bankId,
  menuId,
  bankCategories,
  onAiQuestionsGenerated,
  onCloseRequest,
}) => {
  const { formatErrorMessage } = useValidation();
  const [categoriesInput, setCategoriesInput] = useState("");
  const [targetQuestionCountPerItemFocus, setTargetQuestionCountPerItemFocus] =
    useState<number>(3);

  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [aiQuestionDifficulty, setAiQuestionDifficulty] =
    useState<string>("medium");
  const [aiQuestionTypes] = useState<string[]>([
    "multiple-choice-single",
    "true-false",
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(false);

  useEffect(() => {
    if (bankCategories && bankCategories.length > 0) {
      setCategoriesInput(bankCategories.join(", "));
    }
  }, [bankCategories]);

  const handleFocusAreaChange = (focusAreaId: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(focusAreaId)
        ? prev.filter((id) => id !== focusAreaId)
        : [...prev, focusAreaId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInternalIsLoading(true);

    const parsedCategories = categoriesInput
      .split(",")
      .map((cat) => cat.trim())
      .filter((cat) => cat);

    if (!menuId) {
      setFormError(
        "A Menu context is required for AI generation. Please select a menu."
      );
      setInternalIsLoading(false);
      return;
    }
    if (parsedCategories.length === 0) {
      setFormError("Please provide at least one category for AI generation.");
      setInternalIsLoading(false);
      return;
    }
    if (selectedFocusAreas.length === 0) {
      setFormError("Please select at least one Question Focus Area.");
      setInternalIsLoading(false);
      return;
    }
    if (targetQuestionCountPerItemFocus <= 0) {
      setFormError(
        "Target question count per item/focus must be a positive number."
      );
      setInternalIsLoading(false);
      return;
    }
    if (targetQuestionCountPerItemFocus > 10) {
      setFormError(
        "Target question count per item/focus should not exceed 10."
      );
      setInternalIsLoading(false);
      return;
    }

    const payload: NewAiQuestionGenerationParams = {
      menuId: menuId,
      categoriesToFocus: parsedCategories,
      questionFocusAreas: selectedFocusAreas,
      targetQuestionCountPerItemFocus,
      questionTypes: aiQuestionTypes,
      difficulty: aiQuestionDifficulty,
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

      <div>
        <label htmlFor="aiCategories" className={commonLabelClass}>
          Categories for AI Generation (comma-separated)
        </label>
        <input
          id="aiCategories"
          type="text"
          value={categoriesInput}
          onChange={(e) => setCategoriesInput(e.target.value)}
          placeholder="e.g., Red Wine, Italian Cuisine, Allergens"
          required
          className={commonInputClass}
          disabled={internalIsLoading}
        />
        {bankCategories && bankCategories.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Current bank categories (for reference): {bankCategories.join(", ")}
          </p>
        )}
      </div>

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
        </label>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-2 p-2 border rounded-md bg-gray-50">
          {QUESTION_FOCUS_AREAS.map((area) => (
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
      </div>

      <div className="pt-2">
        <label htmlFor={`aiDifficulty-${bankId}`} className={commonLabelClass}>
          Question Difficulty
        </label>
        <select
          id={`aiDifficulty-${bankId}`}
          value={aiQuestionDifficulty}
          onChange={(e) => setAiQuestionDifficulty(e.target.value)}
          className={`${commonInputClass} max-w-xs`}
          disabled={internalIsLoading}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div className="flex justify-end space-x-2 pt-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCloseRequest}
          disabled={internalIsLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={internalIsLoading}>
          {internalIsLoading ? <LoadingSpinner /> : "Generate Questions"}
        </Button>
      </div>
    </form>
  );
};

export default GenerateAiQuestionsForm;
