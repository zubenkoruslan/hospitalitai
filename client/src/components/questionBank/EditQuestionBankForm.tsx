import React, { useState, useEffect } from "react";
import {
  IQuestionBank,
  UpdateQuestionBankData,
} from "../../types/questionBankTypes";
import { updateQuestionBank } from "../../services/api";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";

interface EditQuestionBankFormProps {
  bankToEdit: IQuestionBank;
  onBankUpdated: (updatedBank: IQuestionBank) => void;
  onCancel: () => void;
}

const EditQuestionBankForm: React.FC<EditQuestionBankFormProps> = ({
  bankToEdit,
  onBankUpdated,
  onCancel,
}) => {
  const [name, setName] = useState(bankToEdit.name);
  const [description, setDescription] = useState(bankToEdit.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to reset form state if bankToEdit changes (e.g., user opens edit for a different bank)
  useEffect(() => {
    setName(bankToEdit.name);
    setDescription(bankToEdit.description || "");
    setError(null); // Clear previous errors
  }, [bankToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bank name cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const updateData: UpdateQuestionBankData = {};
    if (name.trim() !== bankToEdit.name) {
      updateData.name = name.trim();
    }
    if (description.trim() !== (bankToEdit.description || "")) {
      updateData.description = description.trim();
    }

    // Only call API if there are actual changes
    if (Object.keys(updateData).length === 0) {
      setIsLoading(false);
      onCancel(); // Or show a message 'No changes made'
      return;
    }

    try {
      const updatedBank = await updateQuestionBank(bankToEdit._id, updateData);
      if (updatedBank) {
        onBankUpdated(updatedBank);
      } else {
        // This case should ideally be handled by an error from updateQuestionBank if not found
        setError(
          "Failed to update bank. Bank not found or an unexpected error occurred."
        );
      }
    } catch (err: any) {
      console.error("Error updating bank:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to update bank."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // The modal wrapper will be handled by the parent component
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="editBankName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="editBankName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="editBankDescription"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description (Optional)
        </label>
        <textarea
          id="editBankDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <LoadingSpinner /> : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default EditQuestionBankForm;
