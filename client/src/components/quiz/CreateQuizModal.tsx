import React, { useState, useEffect } from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import Modal from "../common/Modal";

// --- Interfaces ---
// TODO: Move to a shared types file
interface Menu {
  _id: string;
  name: string;
}

// --- Component Props ---
interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (title: string, menuIds: string[]) => void; // Pass title and menuIds back
  menus: Menu[];
  isLoadingMenus: boolean;
  isGenerating: boolean; // Generation state controlled by parent
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
          <>
            <LoadingSpinner />
            Generating...
          </>
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
      <div className="mb-4">
        <label
          htmlFor="quizTitleModal"
          className="block text-sm font-medium text-gray-700 mb-1"
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
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
          placeholder="E.g., Appetizers Knowledge Check"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Menus to Generate Questions From{" "}
          <span className="text-red-500">*</span>
        </label>
        {isLoadingMenus ? (
          <LoadingSpinner />
        ) : menus.length > 0 ? (
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-2">
            {menus.map((menu) => (
              <div key={menu._id} className="flex items-center">
                <input
                  id={`modal-menu-${menu._id}`}
                  name="modal-menus"
                  type="checkbox"
                  value={menu._id}
                  checked={selectedMenuIds.includes(menu._id)}
                  onChange={() => handleMenuSelection(menu._id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`modal-menu-${menu._id}`}
                  className="ml-3 text-sm text-gray-700"
                >
                  {menu.name}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No menus found. Please create menus first.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default CreateQuizModal;
