import React, { useState, FormEvent, useEffect } from "react";
import {
  NewQuestionClientData,
  QuestionType,
  IOption,
  IQuestion,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { createQuestion as apiCreateQuestion } from "../../services/api";
import { useValidation } from "../../context/ValidationContext";
import LoadingSpinner from "../common/LoadingSpinner";

interface AddManualQuestionFormProps {
  onQuestionAdded: (newQuestion: IQuestion) => void;
  onCloseRequest: () => void;
  initialBankCategories?: string[];
}

const questionTypes: QuestionType[] = [
  "multiple-choice-single",
  "multiple-choice-multiple",
  "true-false",
];

const difficultyLevels = ["easy", "medium", "hard"];

const AddManualQuestionForm: React.FC<AddManualQuestionFormProps> = ({
  onQuestionAdded,
  onCloseRequest,
  initialBankCategories,
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
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "">(
    ""
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const { formatErrorMessage } = useValidation();

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
  }, [questionType, options]);

  useEffect(() => {
    if (initialBankCategories && initialBankCategories.length > 0) {
      setCategories(initialBankCategories.join(", "));
    }
  }, [initialBankCategories]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalOptions = options.map((opt) => ({
      text: opt.text || "",
      isCorrect: !!opt.isCorrect,
    }));

    if (!questionText.trim()) {
      setFormError("Question text cannot be empty.");
      return;
    }
    if (
      questionType !== "true-false" &&
      finalOptions.some((opt) => !opt.text.trim())
    ) {
      setFormError(
        "All option texts must be filled for multiple choice questions."
      );
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
        return;
      }
    }
    if (questionType === "multiple-choice-multiple") {
      if (correctOptionsCount < 1) {
        setFormError(
          "Multiple-answer questions must have at least one correct option."
        );
        return;
      }
    }
    if (categories.trim() === "") {
      setFormError("Please provide at least one category.");
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
      difficulty: difficulty || undefined,
    };

    setInternalIsLoading(true);
    try {
      const newQuestion = await apiCreateQuestion(data);
      if (newQuestion) {
        onQuestionAdded(newQuestion);
      } else {
        setFormError("Failed to create question. Please try again.");
      }
    } catch (err) {
      console.error("Error creating question:", err);
      setFormError(formatErrorMessage(err));
    } finally {
      setInternalIsLoading(false);
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
          disabled={internalIsLoading}
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
            disabled={internalIsLoading}
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
        <div>
          <label htmlFor="difficulty" className={commonLabelClass}>
            Difficulty (Optional)
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className={commonInputClass}
            disabled={internalIsLoading}
          >
            <option value="">Select Difficulty</option>
            {difficultyLevels.map((level) => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
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
                internalIsLoading ||
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
              disabled={internalIsLoading || questionType === "true-false"}
            />
            {questionType !== "true-false" && options.length > 2 && (
              <Button
                type="button"
                onClick={() => removeOption(index)}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full shrink-0"
                aria-label="Remove option"
                disabled={internalIsLoading}
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
            disabled={internalIsLoading}
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
          disabled={internalIsLoading}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCloseRequest}
          disabled={internalIsLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={internalIsLoading}>
          {internalIsLoading ? <LoadingSpinner /> : "Add Question"}
        </Button>
      </div>
    </form>
  );
};

export default AddManualQuestionForm;
