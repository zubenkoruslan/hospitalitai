import React, { useState, useEffect, useCallback } from "react";
import Button from "../common/Button"; // Import our styled Button
import { QuizDisplayQuestion } from "../../types/quizTypes"; // IMPORTED

// --- Interfaces ---
// REMOVED local Question interface definition

// --- Component Props ---
interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newQuestion: QuizDisplayQuestion) => void; // UPDATED type
  initialMenuItemId?: string; // Keep optional, as it's handled if undefined
}

// --- Component ---
const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialMenuItemId,
}) => {
  const getInitialQuestionState = useCallback(
    (): QuizDisplayQuestion => ({
      text: "New Question",
      choices: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correctAnswer: 0,
      menuItemId: initialMenuItemId || "", // Ensure menuItemId is always a string
    }),
    [initialMenuItemId]
  );

  const [newQuestion, setNewQuestion] = useState<QuizDisplayQuestion>(
    getInitialQuestionState()
  );

  // Reset state when modal opens or initialMenuItemId changes
  useEffect(() => {
    if (isOpen) {
      setNewQuestion(getInitialQuestionState());
    }
  }, [isOpen, getInitialQuestionState]);

  const handleSubmit = () => {
    // Basic validation could be added here
    onSubmit(newQuestion);
    onClose(); // Close modal after submit
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
      className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out animate-fade-in-short"
      onClick={onClose} // Close on overlay click
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-auto my-8 max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out animate-slide-up-fast"
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-question-modal-title"
      >
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
          <h2
            id="add-question-modal-title"
            className="text-xl font-semibold text-slate-700"
          >
            Add New Question
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

        <div className="overflow-y-auto flex-1 pr-2 space-y-6">
          {" "}
          {/* Added space-y and pr for scrollbar */}
          <div>
            <label
              htmlFor="newQuestionText"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Question Text <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="newQuestionText"
              value={newQuestion.text}
              onChange={(e) =>
                setNewQuestion({ ...newQuestion, text: e.target.value })
              }
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out"
              placeholder="Enter question text"
              required
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-slate-700 mb-2">
              Answer Choices <span className="text-red-500">*</span>
            </legend>
            {newQuestion.choices.map((choice, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200"
              >
                <input
                  type="radio"
                  id={`new-correct-${index}`}
                  name="newCorrectAnswer"
                  checked={newQuestion.correctAnswer === index}
                  onChange={() =>
                    setNewQuestion({
                      ...newQuestion,
                      correctAnswer: index,
                    })
                  }
                  className="h-5 w-5 text-sky-600 border-slate-300 focus:ring-sky-500 focus:ring-offset-1 transition-colors"
                />
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => {
                    const newChoices = [...newQuestion.choices];
                    newChoices[index] = e.target.value;
                    setNewQuestion({
                      ...newQuestion,
                      choices: newChoices,
                    });
                  }}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder={`Option ${index + 1}`}
                  required
                />
              </div>
            ))}
            <p className="text-xs text-slate-500 mt-2">
              Select the radio button next to the correct answer.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              (Associated Menu Item ID: {newQuestion.menuItemId || "N/A"})
            </p>
          </fieldset>
        </div>

        <div className="pt-5 mt-5 border-t border-slate-200 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={
              !newQuestion.text.trim() ||
              newQuestion.choices.some((c) => !c.trim())
            } // Basic validation
          >
            Add Question
          </Button>
        </div>
      </div>
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */}
    </div>
  );
};

export default AddQuestionModal;
