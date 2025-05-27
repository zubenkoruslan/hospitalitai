import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/solid";

interface EditBankCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCategories: string[];
  onSave: (newCategories: string[]) => void;
  bankName: string;
}

const EditBankCategoriesModal: React.FC<EditBankCategoriesModalProps> = ({
  isOpen,
  onClose,
  currentCategories,
  onSave,
  bankName,
}) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategories([...currentCategories]); // Initialize with a copy
      setNewCategoryInput("");
      setError(null);
    }
  }, [isOpen, currentCategories]);

  const handleAddCategory = () => {
    const trimmedCategory = newCategoryInput.trim();
    if (trimmedCategory === "") {
      setError("Category name cannot be empty.");
      return;
    }
    if (categories.includes(trimmedCategory)) {
      setError("This category already exists.");
      setNewCategoryInput(""); // Clear input even if duplicate
      return;
    }
    if (categories.length >= 20) {
      // Example limit
      setError("Maximum of 20 categories allowed.");
      return;
    }
    setCategories([...categories, trimmedCategory]);
    setNewCategoryInput("");
    setError(null);
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(categories.filter((cat) => cat !== categoryToRemove));
  };

  const handleSaveChanges = () => {
    // Basic validation, e.g., disallow empty categories list if that's a rule
    // For now, we allow an empty list to be saved.
    onSave(categories);
    onClose(); // Close after saving
  };

  const formId = "edit-bank-categories-form"; // For associating button with form

  const footerContent = (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" form={formId} variant="primary">
        Save Categories
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Categories for "${bankName}"`}
      size="lg"
      footerContent={footerContent}
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveChanges();
        }}
        className="space-y-6"
      >
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="newCategoryInput"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Add New Category
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="newCategoryInput"
              value={newCategoryInput}
              onChange={(e) => {
                setNewCategoryInput(e.target.value);
                if (error) setError(null); // Clear error on input change
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // Prevent form submission
                  handleAddCategory();
                }
              }}
              placeholder="Type category name and press Enter or Add"
              className="flex-grow appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleAddCategory}
              className="flex-shrink-0 px-3 py-2 text-sm"
              disabled={newCategoryInput.trim() === ""}
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>
        </div>

        {categories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">
              Current Categories:
            </h4>
            <div className="max-h-60 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-2 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-100"
                >
                  <span className="text-sm text-slate-800">{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    title={`Remove category: ${cat}`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {categories.length === 0 && (
          <p className="text-sm text-slate-500 italic text-center py-4">
            No categories currently assigned. Add some above.
          </p>
        )}
      </form>
    </Modal>
  );
};

export default EditBankCategoriesModal;
