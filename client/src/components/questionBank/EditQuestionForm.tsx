import React, { useState, FormEvent, useEffect } from "react";
import {
  IQuestion,
  IOption,
  QuestionType,
  UpdateQuestionClientData,
  KnowledgeCategory,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { updateQuestion } from "../../services/api";
import { useValidation } from "../../context/ValidationContext";
import LoadingSpinner from "../common/LoadingSpinner";
import KnowledgeCategorySelector from "../common/KnowledgeCategorySelector";

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
  // Use IOption[] for state to preserve _id for existing options
  const [options, setOptions] = useState<IOption[]>(
    JSON.parse(JSON.stringify(questionToEdit.options || [])) // Keep full IOption objects
  );
  const [categories, setCategories] = useState<string[]>([
    ...questionToEdit.categories,
  ]);
  const [categoryInput, setCategoryInput] = useState("");
  const [explanation, setExplanation] = useState(
    questionToEdit.explanation || ""
  );
  const [knowledgeCategory, setKnowledgeCategory] = useState<KnowledgeCategory>(
    questionToEdit.knowledgeCategory
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(false);

  // Effect to reset form if questionToEdit changes (e.g. modal is reused for different questions)
  useEffect(() => {
    setQuestionText(questionToEdit.questionText);
    setQuestionType(questionToEdit.questionType);
    setOptions(JSON.parse(JSON.stringify(questionToEdit.options || []))); // Keep full IOption
    setCategories([...questionToEdit.categories]);
    setExplanation(questionToEdit.explanation || "");
    setKnowledgeCategory(questionToEdit.knowledgeCategory);
    setFormError(null); // Clear previous errors
    setInternalIsLoading(false); // Reset loading state
  }, [questionToEdit]);

  // ADDED: Effect to reset options when questionType (form state) changes from its original prop value
  // Effect to handle option initialization/reset when questionType (form state) or questionToEdit (prop) changes.
  useEffect(() => {
    if (questionToEdit.questionType === questionType) {
      // If type hasn't changed, keep existing options initially
      setOptions(JSON.parse(JSON.stringify(questionToEdit.options || [])));
    } else {
      // If type has changed, reset options appropriately
      if (questionType === "true-false") {
        setOptions([
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ]);
      } else {
        setOptions([
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
        ]);
      }
    }
    // Only run when questionType changes, or when the initial questionToEdit.questionType influences reset
  }, [questionType, questionToEdit.questionType]); // questionToEdit.options removed from deps

  const handleOptionChange = (
    index: number,
    field: keyof IOption,
    value: string | boolean
  ) => {
    const newOptions = options.map((option, i) => {
      if (i === index) {
        // For new options, _id might be undefined. For existing, it's preserved.
        return { ...option, [field]: value } as IOption;
      }
      return option;
    });
    if (
      questionType === "multiple-choice-single" &&
      field === "isCorrect" &&
      value === true
    ) {
      newOptions.forEach((option, i) => {
        if (i !== index) {
          option.isCorrect = false;
        }
      });
    }
    setOptions(newOptions);
  };

  const addOption = () => {
    if (questionType !== "true-false" && options.length < 6) {
      setOptions([...options, { text: "", isCorrect: false } as IOption]);
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
    if (categories.length === 0) {
      setFormError("Please provide at least one category.");
      return;
    }

    const updateData: UpdateQuestionClientData = {};

    // Track if knowledge category is being updated
    let isKnowledgeCategoryUpdated = false;

    if (questionText.trim() !== questionToEdit.questionText) {
      updateData.questionText = questionText.trim();
    }
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

    if (
      JSON.stringify(categories.sort()) !==
      JSON.stringify([...questionToEdit.categories].sort())
    ) {
      updateData.categories = categories;
    }
    if ((explanation || null) !== (questionToEdit.explanation || null)) {
      updateData.explanation = explanation || undefined;
    }
    if (knowledgeCategory !== questionToEdit.knowledgeCategory) {
      updateData.knowledgeCategory = knowledgeCategory;
      isKnowledgeCategoryUpdated = true;
      console.log(
        "[Edit Question] Knowledge category updated, will refresh analytics after save"
      );
    }

    if (Object.keys(updateData).length === 0) {
      setFormError("No changes detected to save.");
      // onClose(); // Or just show message
      return;
    }

    setInternalIsLoading(true);

    try {
      const updatedQuestion = await updateQuestion(
        questionToEdit._id,
        updateData
      );

      console.log("[Edit Question] Question updated successfully");

      // Refresh analytics if knowledge category was updated
      if (isKnowledgeCategoryUpdated) {
        console.log("[Edit Question] Triggering analytics refresh...");
        // Trigger analytics refresh event
        window.dispatchEvent(new CustomEvent("analytics-refresh"));

        // Small delay to ensure backend cache has been invalidated
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("analytics-refresh"));
        }, 500);
      }

      onQuestionUpdated(updatedQuestion);
      // The parent component (modal) will handle closing the modal
    } catch (error: any) {
      const message = formatErrorMessage(error);
      setFormError(message);
      console.error("Error updating question:", error);
    } finally {
      setInternalIsLoading(false);
    }
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200 disabled:text-gray-700";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

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

      <fieldset>
        <legend className={commonLabelClass}>Options</legend>
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
              value={opt.text || ""}
              onChange={(e) =>
                handleOptionChange(index, "text", e.target.value)
              }
              className={`${commonInputClass} flex-grow`}
              disabled={internalIsLoading}
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
      </fieldset>

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
          value={categories.join(", ")}
          onChange={(e) =>
            setCategories(e.target.value.split(", ").map((c) => c.trim()))
          }
          placeholder="e.g., Appetizers, Wines, Safety Procedures"
          required
          className={commonInputClass}
          disabled={internalIsLoading}
        />
      </div>

      <div>
        <KnowledgeCategorySelector
          selectedCategory={knowledgeCategory}
          onCategoryChange={setKnowledgeCategory}
          required={true}
          disabled={internalIsLoading}
          showTooltips={true}
        />
      </div>

      <div>
        <label
          htmlFor={`editExplanation-${questionToEdit._id}`}
          className={commonLabelClass}
        >
          Explanation (Optional, supports Markdown for lists/formatting)
        </label>
        <textarea
          id={`editExplanation-${questionToEdit._id}`}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className={commonInputClass}
          disabled={internalIsLoading}
          placeholder="Provide a brief explanation for the correct answer(s)."
        />
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
