import React, { useState, FormEvent, useEffect } from "react";
import {
  IQuestion,
  IOption,
  QuestionType,
  UpdateQuestionClientData,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import Card from "../common/Card"; // Assuming it might be wrapped in a Card if used outside a modal
import { XMarkIcon } from "@heroicons/react/24/outline";
import { updateQuestion as apiUpdateQuestion } from "../../services/api";
import { useValidation } from "../../context/ValidationContext";
import LoadingSpinner from "../common/LoadingSpinner";

// ADDED: Define available question types for the dropdown
const availableQuestionTypes: QuestionType[] = [
  "multiple-choice-single",
  "multiple-choice-multiple",
  "true-false",
];

interface EditQuestionFormProps {
  questionToEdit: IQuestion;
  onQuestionUpdated: (updatedQuestion: IQuestion) => void;
  onClose: () => void;
}

const EditQuestionForm: React.FC<EditQuestionFormProps> = ({
  questionToEdit,
  onQuestionUpdated,
  onClose,
}) => {
  const { formatErrorMessage } = useValidation();

  const [questionText, setQuestionText] = useState(questionToEdit.questionText);
  // MODIFIED: questionType is now editable state
  const [questionType, setQuestionType] = useState<QuestionType>(
    questionToEdit.questionType
  );
  const [options, setOptions] = useState<Array<Partial<IOption>>>(
    // Deep copy options to avoid mutating prop
    JSON.parse(JSON.stringify(questionToEdit.options || []))
  );
  const [categories, setCategories] = useState(
    (questionToEdit.categories || []).join(", ")
  );
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "">(
    questionToEdit.difficulty || ""
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(false);

  // Effect to reset form if questionToEdit changes (e.g. modal is reused for different questions)
  useEffect(() => {
    setQuestionText(questionToEdit.questionText);
    setQuestionType(questionToEdit.questionType);
    setOptions(JSON.parse(JSON.stringify(questionToEdit.options || [])));
    setCategories((questionToEdit.categories || []).join(", "));
    setDifficulty(questionToEdit.difficulty || "");
    setFormError(null); // Clear previous errors
    setInternalIsLoading(false); // Reset loading state
  }, [questionToEdit]);

  // ADDED: Effect to reset options when questionType (form state) changes from its original prop value
  useEffect(() => {
    // Only reset options if the type has actually been changed by the user from the original
    // And not during the initial population of the form from questionToEdit
    if (questionType !== questionToEdit.questionType) {
      if (questionType === "true-false") {
        setOptions([
          { text: "True", isCorrect: true }, // Default True to be correct
          { text: "False", isCorrect: false },
        ]);
      } else if (
        questionType === "multiple-choice-single" ||
        questionType === "multiple-choice-multiple"
      ) {
        // Default to 2 blank options for multiple choice types
        setOptions([
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ]);
      }
      setFormError(null); // Clear any validation errors related to old options
    }
    // If the user reverts the type back to the original type from questionToEdit,
    // restore the original options for that type.
    else if (
      questionType === questionToEdit.questionType &&
      options !== questionToEdit.options
    ) {
      setOptions(JSON.parse(JSON.stringify(questionToEdit.options || [])));
    }
  }, [questionType, questionToEdit]); // Listen to changes in form's questionType and the original question

  const handleOptionChange = (
    index: number,
    field: keyof Omit<IOption, "_id">, // Allow changing text & isCorrect
    value: string | boolean
  ) => {
    const newOptions = JSON.parse(JSON.stringify(options)); // Deep copy
    (newOptions[index] as any)[field] = value;

    // If single choice (radio button behavior), uncheck other options
    if (
      (questionType === "multiple-choice-single" ||
        questionType === "true-false") && // MODIFIED: Included 'true-false'
      field === "isCorrect" &&
      value === true
    ) {
      newOptions.forEach((opt: Partial<IOption>, i: number) => {
        if (i !== index) {
          opt.isCorrect = false;
        }
      });
    }
    setOptions(newOptions);
  };

  const addOption = () => {
    if (questionType !== "true-false" && options.length < 6) {
      setOptions([...options, { text: "", isCorrect: false }]);
    }
  };

  const removeOption = (index: number) => {
    if (questionType !== "true-false" && options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side validation (similar to AddManualQuestionForm)
    console.log(
      "Options state in handleSubmit:",
      JSON.parse(JSON.stringify(options))
    ); // DEBUGGING LINE

    const finalOptions = options.map((opt) => ({
      text: opt.text || "",
      isCorrect: !!opt.isCorrect,
      _id: opt._id || undefined, // Preserve _id for existing options if backend handles merging
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

    const updateData: UpdateQuestionClientData = {};
    const parsedCategories = categories
      .split(",")
      .map((cat) => cat.trim())
      .filter((cat) => cat);

    // Check if questionType has changed
    if (questionType !== questionToEdit.questionType) {
      updateData.questionType = questionType;
      // As per backend logic, if type changes, options must be sent.
      // The options state would have been reset by the useEffect hook,
      // so finalOptions will reflect the new structure.
      // We must ensure updateData.options gets populated.
      updateData.options = finalOptions.map(({ _id, ...rest }) => ({
        text: rest.text || "",
        isCorrect: !!rest.isCorrect,
      }));
    } else {
      // If type has not changed, only include options if they actually changed.
      const originalOptionsComparable = questionToEdit.options.map((o) => ({
        text: o.text,
        isCorrect: o.isCorrect,
      }));
      const newOptionsComparable = finalOptions.map((o) => ({
        text: o.text,
        isCorrect: o.isCorrect,
      }));
      if (
        JSON.stringify(newOptionsComparable) !==
        JSON.stringify(originalOptionsComparable)
      ) {
        updateData.options = finalOptions.map(({ _id, ...rest }) => ({
          text: rest.text || "",
          isCorrect: !!rest.isCorrect,
        }));
      }
    }

    if (questionText.trim() !== questionToEdit.questionText) {
      updateData.questionText = questionText.trim();
    }
    if (
      JSON.stringify(parsedCategories.sort()) !==
      JSON.stringify(questionToEdit.categories.sort())
    ) {
      updateData.categories = parsedCategories;
    }
    if ((difficulty || null) !== (questionToEdit.difficulty || null)) {
      updateData.difficulty = difficulty || undefined;
    }

    if (Object.keys(updateData).length === 0) {
      setFormError("No changes detected to save.");
      // onClose(); // Or just show message
      return;
    }

    setInternalIsLoading(true);
    try {
      const updatedQuestion = await apiUpdateQuestion(
        questionToEdit._id,
        updateData
      );
      onQuestionUpdated(updatedQuestion);
      // onClose(); // Parent component will likely call onClose
    } catch (err) {
      console.error("Error updating question:", err);
      setFormError(formatErrorMessage(err));
    } finally {
      setInternalIsLoading(false);
    }
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200 disabled:text-gray-700";
  const commonLabelClass = "block text-sm font-medium text-gray-700";
  const difficultyLevels = ["easy", "medium", "hard"];

  return (
    // This form will typically be rendered inside a Modal component.
    // The Modal will provide its own overall title and close button.
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {formError && (
        <div
          className="p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-md"
          role="alert"
        >
          {formError}
        </div>
      )}

      <div>
        <label
          htmlFor={`editQuestionType-${questionToEdit._id}`}
          className={commonLabelClass}
        >
          Question Type
        </label>
        <select
          id={`editQuestionType-${questionToEdit._id}`}
          value={questionType}
          onChange={(e) => {
            const newType = e.target.value as QuestionType;
            setQuestionType(newType);
            // TODO: Add logic here to reset/adapt options based on newType
          }}
          className={commonInputClass}
          disabled={internalIsLoading}
        >
          {availableQuestionTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`editQuestionText-${questionToEdit._id}`}
          className={commonLabelClass}
        >
          Question Text
        </label>
        <textarea
          id={`editQuestionText-${questionToEdit._id}`}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          required
          rows={3}
          className={commonInputClass}
          disabled={internalIsLoading}
        />
      </div>

      <div>
        <label className={commonLabelClass}>Options</label>
        {options.map((opt, index) => (
          <div
            key={opt._id || `new-opt-${index}`}
            className="flex items-center space-x-2 mb-2 p-2 border rounded-md"
          >
            <input
              type={
                questionType === "multiple-choice-multiple"
                  ? "checkbox"
                  : "radio"
              }
              name={`editOptionCorrect-${questionToEdit._id}`}
              checked={!!opt.isCorrect}
              onChange={(e) =>
                handleOptionChange(index, "isCorrect", e.target.checked)
              }
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={internalIsLoading}
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
            {questionType !== "true-false" && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                aria-label="Remove option"
                disabled={internalIsLoading || options.length <= 2}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {questionType !== "true-false" && (
          <Button
            type="button"
            onClick={addOption}
            variant="secondary"
            className="mt-2"
            disabled={internalIsLoading || options.length >= 6}
          >
            Add Option
          </Button>
        )}
      </div>

      <div>
        <label
          htmlFor={`editCategories-${questionToEdit._id}`}
          className={commonLabelClass}
        >
          Categories (comma-separated)
        </label>
        <input
          id={`editCategories-${questionToEdit._id}`}
          type="text"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="e.g., Appetizers, Wines, Safety Procedures"
          required
          className={commonInputClass}
          disabled={internalIsLoading}
        />
      </div>

      <div>
        <label
          htmlFor={`editDifficulty-${questionToEdit._id}`}
          className={commonLabelClass}
        >
          Difficulty (Optional)
        </label>
        <select
          id={`editDifficulty-${questionToEdit._id}`}
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

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={internalIsLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={internalIsLoading}>
          {internalIsLoading ? <LoadingSpinner /> : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default EditQuestionForm;
