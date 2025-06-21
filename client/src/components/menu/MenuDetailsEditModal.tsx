import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage"; // Assuming ErrorMessage for consistent error display

interface MenuDetailsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
  initialName: string;
  initialDescription: string;
  isSaving: boolean;
  error?: string | null;
}

const MenuDetailsEditModal: React.FC<MenuDetailsEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialName,
  initialDescription,
  isSaving,
  error,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }, [isOpen, initialName, initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name, description);
    // onClose will be called by the parent component on successful submission or if an error occurs that should close the modal
  };

  // Stop propagation prevents closing modal when clicking inside the modal content
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
    }
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out animate-fade-in-short"
      onClick={onClose} // Close on overlay click
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto my-8 max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out animate-slide-up-fast"
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-details-edit-modal-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          <h2
            id="menu-details-edit-modal-title"
            className="text-xl font-semibold text-slate-700"
          >
            Edit Menu Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 rounded-full p-1.5 transition-colors duration-150 ease-in-out"
            aria-label="Close modal"
          >
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body (Scrollable if content overflows) */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            <div>
              <label
                htmlFor="menuNameEditModal"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Menu Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="menuNameEditModal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500"
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <label
                htmlFor="menuDescriptionEditModal"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="menuDescriptionEditModal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500"
                disabled={isSaving}
              />
            </div>
            {error && <ErrorMessage message={error} />}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuDetailsEditModal;
