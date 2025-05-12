import React, { useState, FormEvent } from "react";
import { AiGenerationClientParams } from "../../types/questionBankTypes";
import Button from "../common/Button";
import Card from "../common/Card";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface GenerateAiQuestionsFormProps {
  onSubmit: (data: AiGenerationClientParams) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

const GenerateAiQuestionsForm: React.FC<GenerateAiQuestionsFormProps> = ({
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [categories, setCategories] = useState(""); // Comma-separated string
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(5);
  const [menuContext, setMenuContext] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // Optional: Add geminiModelName if you want to allow users to select it
  // const [geminiModelName, setGeminiModelName] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedCategories = categories
      .split(",")
      .map((cat) => cat.trim())
      .filter((cat) => cat);
    if (parsedCategories.length === 0) {
      setFormError("Please provide at least one category.");
      return;
    }
    if (targetQuestionCount <= 0) {
      setFormError("Target question count must be a positive number.");
      return;
    }

    const data: AiGenerationClientParams = {
      categories: parsedCategories,
      targetQuestionCount,
      menuContext: menuContext.trim() || undefined,
      // geminiModelName: geminiModelName || undefined, // Add if implementing model selection
    };
    await onSubmit(data);
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-auto">
      <Card
        title="Generate Questions with AI"
        className="w-full max-w-lg bg-white relative max-h-[90vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close form"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-grow"
        >
          {formError && (
            <p className="text-red-500 text-sm bg-red-100 p-2 rounded-md">
              {formError}
            </p>
          )}

          <div>
            <label htmlFor="aiCategories" className={commonLabelClass}>
              Categories (comma-separated)
            </label>
            <input
              id="aiCategories"
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="e.g., Red Wine, Italian Cuisine, Allergens"
              required
              className={commonInputClass}
            />
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
              max="20" // Sensible max for a single request
              required
              className={commonInputClass}
            />
          </div>

          <div>
            <label htmlFor="menuContext" className={commonLabelClass}>
              Menu Context / Additional Instructions (Optional)
            </label>
            <textarea
              id="menuContext"
              value={menuContext}
              onChange={(e) => setMenuContext(e.target.value)}
              rows={4}
              placeholder="Provide context from your menu or specific topics you want the AI to focus on. E.g., 'Focus on our new vegan menu items.' or 'Generate questions about wine pairings with our steak dishes.'"
              className={commonInputClass}
            />
          </div>

          {/* Optional: Gemini Model Name input if needed */}
          {/* <div>
            <label htmlFor="geminiModelName" className={commonLabelClass}>Gemini Model (Optional)</label>
            <input
              id="geminiModelName"
              type="text"
              value={geminiModelName}
              onChange={(e) => setGeminiModelName(e.target.value)}
              placeholder="e.g., gemini-pro"
              className={commonInputClass}
            />
          </div> */}

          <div className="flex justify-end space-x-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Questions"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default GenerateAiQuestionsForm;
