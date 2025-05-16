import React, { useState, FormEvent, useEffect } from "react";
import {
  AiGenerationClientParams,
  IQuestion,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import { generateAiQuestions as apiGenerateAiQuestions } from "../../services/api";
import { useValidation } from "../../context/ValidationContext";
import LoadingSpinner from "../common/LoadingSpinner";

interface GenerateAiQuestionsFormProps {
  bankId: string;
  bankCategories: string[];
  onAiQuestionsGenerated: (questions: IQuestion[]) => void;
  onCloseRequest: () => void;
}

const GenerateAiQuestionsForm: React.FC<GenerateAiQuestionsFormProps> = ({
  bankId,
  bankCategories,
  onAiQuestionsGenerated,
  onCloseRequest,
}) => {
  const { formatErrorMessage } = useValidation();
  const [categories, setCategories] = useState("");
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(5);
  const [menuContext, setMenuContext] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(false);

  useEffect(() => {
    if (bankCategories && bankCategories.length > 0) {
      setCategories(bankCategories.join(", "));
    }
  }, [bankCategories]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInternalIsLoading(true);

    const parsedCategories = categories
      .split(",")
      .map((cat) => cat.trim())
      .filter((cat) => cat);

    if (parsedCategories.length === 0) {
      setFormError("Please provide at least one category for AI generation.");
      setInternalIsLoading(false);
      return;
    }
    if (targetQuestionCount <= 0) {
      setFormError("Target question count must be a positive number.");
      setInternalIsLoading(false);
      return;
    }

    const data: AiGenerationClientParams = {
      categories: parsedCategories,
      targetQuestionCount,
      menuContext: menuContext.trim() || undefined,
      bankId: bankId,
    };

    try {
      const generatedQuestions = await apiGenerateAiQuestions(data);
      if (generatedQuestions && generatedQuestions.length > 0) {
        onAiQuestionsGenerated(generatedQuestions);
      } else {
        setFormError(
          "The AI did not generate any questions for the given criteria. Try adjusting the categories or context."
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
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="e.g., Red Wine, Italian Cuisine, Allergens"
          required
          className={commonInputClass}
          disabled={internalIsLoading}
        />
        {bankCategories && bankCategories.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Suggested from bank: {bankCategories.join(", ")}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="targetQuestionCount" className={commonLabelClass}>
          Number of Questions to Generate
        </label>
        <input
          id="targetQuestionCount"
          type="number"
          value={targetQuestionCount}
          onChange={(e) =>
            setTargetQuestionCount(parseInt(e.target.value, 10) || 1)
          }
          min="1"
          max="20"
          required
          className={commonInputClass}
          disabled={internalIsLoading}
        />
      </div>

      <div>
        <label htmlFor="menuContext" className={commonLabelClass}>
          Additional Context / Instructions (Optional)
        </label>
        <textarea
          id="menuContext"
          value={menuContext}
          onChange={(e) => setMenuContext(e.target.value)}
          rows={4}
          placeholder="Provide context from your menu or specific topics... E.g., 'Focus on vegan items.'"
          className={commonInputClass}
          disabled={internalIsLoading}
        />
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
