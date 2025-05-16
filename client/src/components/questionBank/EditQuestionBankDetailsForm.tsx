import React, { useState, FormEvent, useEffect } from "react";
import {
  IQuestionBank,
  UpdateQuestionBankData,
} from "../../types/questionBankTypes";
import { updateQuestionBank } from "../../services/api";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";
import { useValidation } from "../../context/ValidationContext"; // If you have specific validation messages

interface EditQuestionBankDetailsFormProps {
  bank: IQuestionBank;
  onBankUpdated: (updatedBank: IQuestionBank) => void;
  onCancel: () => void;
}

const EditQuestionBankDetailsForm: React.FC<
  EditQuestionBankDetailsFormProps
> = ({ bank, onBankUpdated, onCancel }) => {
  const { formatErrorMessage } = useValidation(); // Or handle errors directly
  const [name, setName] = useState(bank.name);
  const [description, setDescription] = useState(bank.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(bank.name);
    setDescription(bank.description || "");
    setError(null);
  }, [bank]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Bank name cannot be empty.");
      return;
    }

    const updateData: UpdateQuestionBankData = {};
    if (name.trim() !== bank.name) {
      updateData.name = name.trim();
    }
    if (description.trim() !== (bank.description || "")) {
      updateData.description = description.trim();
    }

    if (Object.keys(updateData).length === 0) {
      setError("No changes detected.");
      // onCancel(); // Optionally close form if no changes
      return;
    }

    setIsLoading(true);
    try {
      const updatedBank = await updateQuestionBank(bank._id, updateData);
      onBankUpdated(updatedBank);
      // Success message can be handled by the parent page
    } catch (err: any) {
      setError(
        formatErrorMessage(err) || "Failed to update question bank details."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const commonInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const commonLabelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      <div>
        <label htmlFor="bankName" className={commonLabelClass}>
          Bank Name
        </label>
        <input
          id="bankName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={commonInputClass}
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="bankDescription" className={commonLabelClass}>
          Description (Optional)
        </label>
        <textarea
          id="bankDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={commonInputClass}
          disabled={isLoading}
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default EditQuestionBankDetailsForm;
