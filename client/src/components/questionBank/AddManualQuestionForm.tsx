import React, { useState, FormEvent, useEffect } from "react";
import {
  NewQuestionClientData,
  QuestionType,
  IOption,
  IQuestion,
  KnowledgeCategory,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { createQuestion } from "../../services/api";

import LoadingSpinner from "../common/LoadingSpinner";
import KnowledgeCategorySelector from "../common/KnowledgeCategorySelector";

interface AddManualQuestionFormProps {
  onQuestionAdded: (newQuestion: IQuestion) => void;
  onCloseRequest: () => void;
  initialBankCategories?: string[];
  questionBankId: string;
}

const questionTypes: QuestionType[] = [
  "multiple-choice-single",
  "multiple-choice-multiple",
  "true-false",
];

const AddManualQuestionForm: React.FC<AddManualQuestionFormProps> = ({
  onQuestionAdded,
  onCloseRequest,
  initialBankCategories,
  questionBankId,
}) => {
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>(
    "multiple-choice-single"
  );
  const [options, setOptions] = useState<Array<Partial<IOption>>>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [categories, setCategories] = useState(
    initialBankCategories && initialBankCategories.length > 0
      ? initialBankCategories.join(", ")
      : ""
  );
  const [explanation, setExplanation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Knowledge Category State
  const [selectedKnowledgeCategory, setSelectedKnowledgeCategory] =
    useState<KnowledgeCategory>(KnowledgeCategory.FOOD_KNOWLEDGE);

  const handleOptionChange = (
    index: number,
    field: keyof IOption,
    value: string | boolean
  ) => {
    const newOptions = [...options];
    (newOptions[index] as any)[field] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { text: "", isCorrect: false }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  useEffect(() => {
    if (questionType === "true-false") {
      setOptions([
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]);
    } else {
      if (
        options.length === 2 &&
        (options[0].text === "True" || options[1].text === "True")
      ) {
        setOptions([
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ]);
      }
    }
  }, [questionType]);

  useEffect(() => {
    if (initialBankCategories && initialBankCategories.length > 0) {
      setCategories(initialBankCategories.join(", "));
    }
  }, [initialBankCategories]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    const finalOptions = options.map((opt) => ({
      text: opt.text || "",
      isCorrect: !!opt.isCorrect,
    }));

    if (!questionText.trim()) {
      setFormError("Question text cannot be empty.");
      setIsLoading(false);
      return;
    }
    if (
      questionType !== "true-false" &&
      finalOptions.some((opt) => !opt.text.trim())
    ) {
      setFormError(
        "All option texts must be filled for multiple choice questions."
      );
      setIsLoading(false);
      return;
    }
    const correctOptionsCount = finalOptions.filter(
      (opt) => opt.isCorrect
    ).length;
    if (
      questionType === "multiple-choice-single" ||
      questionType === "true-false"
    ) {
      if (correctOptionsCount !== 1) {
        setFormError(
          "Single-answer and True/False questions must have exactly one correct option."
        );
        setIsLoading(false);
        return;
      }
    }
    if (questionType === "multiple-choice-multiple") {
      if (correctOptionsCount < 1) {
        setFormError(
          "Multiple-answer questions must have at least one correct option."
        );
        setIsLoading(false);
        return;
      }
    }
    if (categories.trim() === "") {
      setFormError("Please provide at least one category.");
      setIsLoading(false);
      return;
    }

    const data: NewQuestionClientData = {
      questionText: questionText.trim(),
      questionType,
      options: finalOptions,
      categories: categories
        .split(",")
        .map((cat) => cat.trim())
        .filter((cat) => cat),
      questionBankId: questionBankId,

      // Knowledge Analytics fields
      knowledgeCategory: selectedKnowledgeCategory,
    };

    try {
      const newQuestion = await createQuestion(data);
      if (newQuestion) {
        console.log(
          "[Add Manual Question] Question created successfully, triggering analytics refresh..."
        );

        // Trigger analytics refresh since a new question affects question distribution
        window.dispatchEvent(new CustomEvent("analytics-refresh"));

        // Small delay to ensure backend cache has been invalidated
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("analytics-refresh"));
        }, 500);

        onQuestionAdded(newQuestion);
      } else {
        setFormError("Failed to create question. Please try again.");
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setFormError(err.response.data.message);
      } else if (
        err.response &&
        err.response.data &&
        err.response.data.errors
      ) {
        const messages = err.response.data.errors
          .map((e: any) => e.msg)
          .join(", ");
        setFormError(messages);
      } else {
        setFormError("An unexpected error occurred while adding the question.");
      }
      console.error("Error adding question:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="p-1 space-y-4">
      {formError && (
        <p className="text-red-500 text-sm bg-red-100 p-2 rounded-md">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="questionText" className={commonLabelClass}>
          Question Text
        </label>
        <textarea
          id="questionText"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          required
          rows={3}
          className={commonInputClass}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="questionType" className={commonLabelClass}>
            Question Type
          </label>
          <select
            id="questionType"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            className={commonInputClass}
            disabled={isLoading}
          >
            {questionTypes.map((type) => (
              <option key={type} value={type}>
                {type
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={commonLabelClass}>Options</legend>
        {options.map((opt, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 mb-2 p-2 border rounded-md bg-slate-50"
          >
            <input
              type="checkbox"
              checked={!!opt.isCorrect}
              onChange={(e) =>
                handleOptionChange(index, "isCorrect", e.target.checked)
              }
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0"
              disabled={
                isLoading ||
                (questionType === "multiple-choice-single" &&
                  options.filter((o) => o.isCorrect).length >= 1 &&
                  !opt.isCorrect)
              }
            />
            <input
              type="text"
              placeholder={`Option ${index + 1}`}
              value={
                opt.text ||
                (questionType === "true-false"
                  ? index === 0
                    ? "True"
                    : "False"
                  : "")
              }
              onChange={(e) =>
                handleOptionChange(index, "text", e.target.value)
              }
              className={`${commonInputClass} flex-grow`}
              disabled={isLoading || questionType === "true-false"}
            />
            {questionType !== "true-false" && options.length > 2 && (
              <Button
                type="button"
                onClick={() => removeOption(index)}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full shrink-0"
                aria-label="Remove option"
                disabled={isLoading}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {questionType !== "true-false" && options.length < 6 && (
          <Button
            type="button"
            onClick={addOption}
            variant="secondary"
            className="mt-2"
            disabled={isLoading}
          >
            Add Option
          </Button>
        )}
      </fieldset>

      <div>
        <label htmlFor="categories" className={commonLabelClass}>
          Categories (comma-separated)
        </label>
        <input
          id="categories"
          type="text"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="e.g., Appetizers, Wines, Safety Procedures"
          required
          className={commonInputClass}
          disabled={isLoading}
        />
      </div>

      {/* Knowledge Category Selection */}
      <KnowledgeCategorySelector
        selectedCategory={selectedKnowledgeCategory}
        onCategoryChange={setSelectedKnowledgeCategory}
        required={true}
        disabled={isLoading}
        showTooltips={true}
        className="border-t pt-4"
      />

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCloseRequest}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <LoadingSpinner /> : "Add Question"}
        </Button>
      </div>
    </form>
  );
};

export default AddManualQuestionForm;
