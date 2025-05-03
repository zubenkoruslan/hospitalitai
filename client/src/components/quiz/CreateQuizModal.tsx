import React, { useState, useEffect } from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 my-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Create New Quiz
        </h2>
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
            id="quizTitleModal" // Use unique ID for modal input
            value={quizTitle}
            onChange={(e) => {
              setQuizTitle(e.target.value);
              if (error && e.target.value.trim()) {
                setError(null);
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                    id={`modal-menu-${menu._id}`} // Unique ID
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

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose} // Use onClose prop
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={
              isGenerating || // Prop from parent
              selectedMenuIds.length === 0 ||
              !quizTitle.trim()
            }
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuizModal;
