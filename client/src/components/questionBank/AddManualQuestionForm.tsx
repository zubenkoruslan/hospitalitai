import React, { useState, FormEvent, useEffect } from "react";
import {
  NewQuestionClientData,
  QuestionType,
  IOption,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import Card from "../common/Card";
import { XMarkIcon } from "@heroicons/react/24/outline"; // Corrected v2 import

interface AddManualQuestionFormProps {
  onSubmit: (data: NewQuestionClientData) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

const questionTypes: QuestionType[] = [
  "multiple-choice-single",
  "multiple-choice-multiple",
  "true-false",
];

const difficultyLevels = ["easy", "medium", "hard"];

const AddManualQuestionForm: React.FC<AddManualQuestionFormProps> = ({
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>(
    "multiple-choice-single"
  );
  const [options, setOptions] = useState<Array<Partial<IOption>>>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [categories, setCategories] = useState(""); // Comma-separated string
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "">(
    ""
  );
  const [formError, setFormError] = useState<string | null>(null);

  const handleOptionChange = (
    index: number,
    field: keyof IOption,
    value: string | boolean
  ) => {
    const newOptions = [...options];
    // Type assertion needed as field could be '_id' which we don't use here for value assignment of boolean
    (newOptions[index] as any)[field] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      // Max 6 options for multiple choice
      setOptions([...options, { text: "", isCorrect: false }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      // Min 2 options
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  // Adjust options when question type changes
  useEffect(() => {
    if (questionType === "true-false") {
      setOptions([
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: false },
      ]);
    } else {
      // Reset to default 2 empty options if not true-false and options were for true-false
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalOptions = options.map((opt) => ({
      text: opt.text || "",
      isCorrect: !!opt.isCorrect,
    }));

    // Validation
    if (!questionText.trim()) {
      setFormError("Question text cannot be empty.");
      return;
    }
    if (finalOptions.some((opt) => !opt.text.trim())) {
      setFormError("All option texts must be filled.");
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
      questionText,
      questionType,
      options: finalOptions,
      categories: categories
        .split(",")
        .map((cat) => cat.trim())
        .filter((cat) => cat),
      difficulty: difficulty || undefined,
    };
    await onSubmit(data);
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-auto">
      <Card
        title="Add New Question Manually"
        className="w-full max-w-2xl bg-white relative max-h-[90vh] flex flex-col"
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
                onChange={(e) =>
                  setQuestionType(e.target.value as QuestionType)
                }
                className={commonInputClass}
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

          <div>
            <label className={commonLabelClass}>Options</label>
            {options.map((opt, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 mb-2 p-2 border rounded-md"
              >
                <input
                  type="checkbox"
                  checked={!!opt.isCorrect}
                  onChange={(e) =>
                    handleOptionChange(index, "isCorrect", e.target.checked)
                  }
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={
                    questionType === "multiple-choice-single" &&
                    options.filter((o) => o.isCorrect).length >= 1 &&
                    !opt.isCorrect
                  }
                />
                <input
                  type="text"
                  value={opt.text || ""}
                  onChange={(e) =>
                    handleOptionChange(index, "text", e.target.value)
                  }
                  placeholder={`Option ${index + 1}`}
                  required
                  className={`${commonInputClass} flex-grow`}
                  disabled={questionType === "true-false"}
                />
                {options.length > 2 && questionType !== "true-false" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeOption(index)}
                    className="text-xs px-2 py-1"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {questionType !== "true-false" && options.length < 6 && (
              <Button
                type="button"
                variant="secondary"
                onClick={addOption}
                className="text-sm mt-1"
              >
                Add Option
              </Button>
            )}
          </div>

          <div>
            <label htmlFor="categories" className={commonLabelClass}>
              Categories (comma-separated)
            </label>
            <input
              id="categories"
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="e.g., Red Wine, Appetizers, Safety Procedures"
              required
              className={commonInputClass}
            />
          </div>

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
              {isLoading ? "Saving..." : "Save Question"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddManualQuestionForm;
