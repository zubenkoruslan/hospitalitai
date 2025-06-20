import React, { useState, useEffect, FormEvent } from "react";
import Modal from "../common/Modal"; // Assuming Modal is in common
import { ISopCategory } from "../../types/sopTypes";

export interface CategoryFormData {
  name: string;
  content: string;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  initialData?: ISopCategory | null; // For pre-filling form in edit mode
  mode: "add" | "edit" | "addSub"; // To determine modal title and behavior
  parentCategoryName?: string; // For "Add Subcategory to [X]" title
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
  parentCategoryName,
}) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null); // Reset error when modal opens
      if ((mode === "edit" || mode === "addSub") && initialData) {
        if (mode === "edit") {
          setName(initialData.name);
          setContent(initialData.content || "");
        } else {
          // 'addSub' - parent's data is initialData, new subcategory is blank
          setName("");
          setContent("");
        }
      } else if (mode === "add") {
        // Fresh add
        setName("");
        setContent("");
      }
    }
  }, [isOpen, mode, initialData]);

  // Helper function to clean up content by removing excessive duplication
  const cleanContent = (content: string): string => {
    if (!content || content.trim().length === 0) return content;

    // Split by periods and remove consecutive duplicates
    const sentences = content.split(".");
    const cleanedSentences: string[] = [];

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (
        trimmedSentence &&
        trimmedSentence !== cleanedSentences[cleanedSentences.length - 1]
      ) {
        cleanedSentences.push(trimmedSentence);
      }
    }

    return cleanedSentences.join(". ").trim();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const cleanedContent = cleanContent(content.trim());
      await onSubmit({ name: name.trim(), content: cleanedContent });
      // onClose(); // Caller should handle closing on successful submission
    } catch (submissionError: any) {
      console.error("Error submitting category form:", submissionError);
      setError(
        submissionError.message || "Failed to save category. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalTitle = () => {
    if (mode === "edit") {
      return `Edit Category: ${initialData?.name || ""}`;
    }
    if (mode === "addSub" && parentCategoryName) {
      return `Add Subcategory to "${parentCategoryName}"`;
    }
    return "Add New Category"; // Default for 'add' mode
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="lg">
      <form id="category-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
            <p>{error}</p>
          </div>
        )}
        <div>
          <label
            htmlFor="category-name"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label
            htmlFor="category-content"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Content / Description
          </label>
          <textarea
            id="category-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Enter content or description for this category (optional)"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-slate-500">
            This content will be displayed under the category. You can use line
            breaks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-blue-400"
          >
            {isSubmitting
              ? "Saving..."
              : mode === "edit"
              ? "Save Changes"
              : "Add Category"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormModal;
