import React, { useState, useEffect } from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { IMenuClient } from "../../types/menuTypes";

// --- Interfaces ---
// REMOVED local Menu interface

// --- Component Props ---
interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (title: string, menuIds: string[]) => void;
  menus: IMenuClient[];
  isLoadingMenus: boolean;
  isGenerating: boolean;
}

// --- Component ---
const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  menus,
  isLoadingMenus,
  isGenerating,
}) => {
  const [quizTitle, setQuizTitle] = useState<string>("");
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes or menus change
  useEffect(() => {
    if (isOpen) {
      setQuizTitle("");
      setSelectedMenuIds([]);
      setError(null);
    }
  }, [isOpen]);

  const handleMenuSelection = (menuId: string) => {
    setSelectedMenuIds((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
    if (error && selectedMenuIds.length >= 0) {
      // Check >= 0 to clear error once a menu is selected
      setError(null);
    }
  };

  const handleGenerateClick = () => {
    if (!quizTitle.trim()) {
      setError("Please enter a quiz title.");
      return;
    }
    if (selectedMenuIds.length === 0) {
      setError("Please select at least one menu.");
      return;
    }
    setError(null); // Clear previous errors
    onGenerate(quizTitle.trim(), selectedMenuIds);
  };

  // Define footer content
  const footer = (
    <>
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleGenerateClick}
        disabled={
          isGenerating || // Prop from parent
          selectedMenuIds.length === 0 ||
          !quizTitle.trim()
        }
        variant="primary"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center">
            <LoadingSpinner message="" />
            <span className="ml-2">Generating...</span>
          </span>
        ) : (
          "Generate Quiz"
        )}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Quiz"
      size="lg" // Explicitly set size, default is md (max-w-lg)
      footerContent={footer}
    >
      {error && <ErrorMessage message={error} />}
      <div className="mb-6">
        <label
          htmlFor="quizTitleModal"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Quiz Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="quizTitleModal"
          value={quizTitle}
          onChange={(e) => {
            setQuizTitle(e.target.value);
            if (error && e.target.value.trim()) {
              setError(null);
            }
          }}
          className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          placeholder="E.g., Appetizers Knowledge Check"
          required
          disabled={isGenerating}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Menus to Generate Questions From{" "}
          <span className="text-red-500">*</span>
        </label>
        {isLoadingMenus ? (
          <div className="py-4">
            <LoadingSpinner message="Loading menus..." />
          </div>
        ) : menus.length > 0 ? (
          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
            {menus.map((menu) => (
              <div
                key={menu._id}
                className="flex items-center p-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                <input
                  id={`modal-menu-${menu._id}`}
                  name="modal-menus"
                  type="checkbox"
                  value={menu._id}
                  checked={selectedMenuIds.includes(menu._id)}
                  onChange={() => handleMenuSelection(menu._id)}
                  className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-50"
                  disabled={isGenerating}
                />
                <label
                  htmlFor={`modal-menu-${menu._id}`}
                  className={`ml-3 text-sm ${
                    isGenerating ? "text-slate-400" : "text-slate-700"
                  } cursor-pointer`}
                >
                  {menu.name}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-4">
            No menus found. Please create menus first.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default CreateQuizModal;
