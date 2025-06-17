import React, { useState, FormEvent, useEffect } from "react";
import { IQuestion, QuestionType } from "../../types/questionBankTypes"; // CORRECTED PATH
import Button from "../common/Button"; // CORRECTED PATH
import LoadingSpinner from "../common/LoadingSpinner"; // CORRECTED PATH
import { generateMoreAiQuestionsForSopBank } from "../../services/api"; // UNCOMMENTED and path corrected

interface GenerateAiQuestionsFormSopProps {
  bankId: string;
  bankName?: string; // ADDED: For displaying bank name
  sopDocumentId: string;
  sopDocumentTitle?: string; // For display
  existingBankCategories?: string[]; // Could be used to suggest default categories for new questions
  onQuestionsGenerated: (newQuestions: IQuestion[]) => void; // Callback after questions are generated and added
  onCloseRequest: () => void;
}

// ADDED: Available question types for selection
const availableSopQuestionTypes: { id: QuestionType; label: string }[] = [
  { id: "true-false", label: "True/False" },
  { id: "multiple-choice-single", label: "Multiple Choice (Single Answer)" },
];

const GenerateAiQuestionsFormSop: React.FC<GenerateAiQuestionsFormSopProps> = ({
  bankId,
  bankName, // ADDED
  sopDocumentId,
  sopDocumentTitle,
  // existingBankCategories, // Uncomment if used
  onQuestionsGenerated,
  onCloseRequest,
}) => {
  const [targetQuestionCount, setTargetQuestionCount] = useState(5);
  // ADDED: State for selected question types
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<
    QuestionType[]
  >(["true-false", "multiple-choice-single"]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ADDED: Handler for question type checkbox change
  const handleQuestionTypeChange = (type: QuestionType) => {
    setSelectedQuestionTypes((prevTypes) =>
      prevTypes.includes(type)
        ? prevTypes.filter((t) => t !== type)
        : [...prevTypes, type]
    );
  };

  useEffect(() => {
    // Pre-select all types by default
    setSelectedQuestionTypes(availableSopQuestionTypes.map((qt) => qt.id));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    if (targetQuestionCount <= 0) {
      setFormError("Number of questions must be greater than zero.");
      setIsLoading(false);
      return;
    }

    // ADDED: Validation for at least one question type selected
    if (selectedQuestionTypes.length === 0) {
      setFormError("Please select at least one question type to generate.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Submitting SOP AI Question Generation:", {
        bankId,
        targetQuestionCount,
        questionTypes: selectedQuestionTypes, // MODIFIED: Use selected types
      });

      const result = await generateMoreAiQuestionsForSopBank(bankId, {
        targetQuestionCount: targetQuestionCount,
        questionTypes: selectedQuestionTypes, // MODIFIED: Use selected types
      });

      alert(
        result.message ||
          `${targetQuestionCount} questions (types: ${selectedQuestionTypes.join(
            ", "
          )}) sent for AI generation and will be available for review.`
      );

      // Signal successful generation with empty array since questions are saved directly
      onQuestionsGenerated([]);
    } catch (err: any) {
      console.error("Error generating AI questions for SOP bank:", err);
      setFormError(
        err.response?.data?.message ||
          err.message ||
          "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const commonLabelClass = "block text-sm font-medium text-gray-700";
  const checkboxLabelClass = "ml-2 text-sm text-gray-700";
  const checkboxInputClass =
    "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="p-1 space-y-6">
      {formError && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          <p className="text-sm">{formError}</p>
        </div>
      )}

      <div>
        <p className="text-sm text-gray-600 mb-1">
          Generating questions for Question Bank:{" "}
          {/* MODIFIED: Display bankName if available, otherwise bankId */}
          <span className="font-semibold">{bankName || bankId}</span>
        </p>
        <p className="text-sm text-gray-600">
          From SOP Document:{" "}
          <span className="font-semibold">
            {sopDocumentTitle || sopDocumentId}
          </span>
        </p>
      </div>

      <div>
        <label htmlFor="targetQuestionCount" className={commonLabelClass}>
          Number of Questions to Generate
        </label>
        <input
          id="targetQuestionCount"
          type="number"
          min="1"
          max="20"
          value={targetQuestionCount}
          onChange={(e) => {
            const value = e.target.value;
            const parsedValue = parseInt(value, 10);
            setTargetQuestionCount(isNaN(parsedValue) ? 1 : parsedValue);
          }}
          className={commonInputClass}
          disabled={isLoading}
        />
      </div>

      <div>
        <h4 className={commonLabelClass}>Question Types to Generate:</h4>
        {/* MODIFIED: Checkbox selection for question types */}
        <div className="mt-2 space-y-2">
          {availableSopQuestionTypes.map((typeOpt) => (
            <div key={typeOpt.id} className="flex items-center">
              <input
                id={`sop-q-type-${typeOpt.id}`}
                name="sopQuestionType"
                type="checkbox"
                value={typeOpt.id}
                checked={selectedQuestionTypes.includes(typeOpt.id)}
                onChange={() => handleQuestionTypeChange(typeOpt.id)}
                className={checkboxInputClass}
                disabled={isLoading}
              />
              <label
                htmlFor={`sop-q-type-${typeOpt.id}`}
                className={checkboxLabelClass}
              >
                {typeOpt.label}
              </label>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          If multiple types are selected, the AI will attempt to alternate or
          balance them.
        </p>
      </div>

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
          {isLoading ? <LoadingSpinner /> : "Generate Questions"}
        </Button>
      </div>
    </form>
  );
};

export default GenerateAiQuestionsFormSop;
