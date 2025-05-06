import React, { useState, useEffect } from "react";

// --- Interfaces ---
// TODO: Move to shared types file
interface Question {
  _id?: string;
  text: string;
  choices: string[];
  correctAnswer: number;
  menuItemId: string;
}

// --- Component Props ---
interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newQuestion: Question) => void;
  initialMenuItemId: string; // Used to initialize the question
}

// --- Component ---
const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialMenuItemId,
}) => {
  const [newQuestion, setNewQuestion] = useState<Question>({
    text: "New Question",
    choices: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correctAnswer: 0,
    menuItemId: initialMenuItemId || "", // Initialize with passed ID
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewQuestion({
        text: "New Question",
        choices: ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswer: 0,
        menuItemId: initialMenuItemId || "",
      });
    }
  }, [isOpen, initialMenuItemId]);

  const handleSubmit = () => {
    // Basic validation could be added here
    onSubmit(newQuestion);
    onClose(); // Close modal after submit
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
      {/* Increased z-index to appear above editor modal */}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 my-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Add New Question
        </h2>

        <div className="mb-4">
          <label
            htmlFor="newQuestionText"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Question Text
          </label>
          <input
            type="text"
            id="newQuestionText"
            value={newQuestion.text}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, text: e.target.value })
            }
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
            placeholder="Enter question text"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Answer Choices
          </label>
          {newQuestion.choices.map((choice, index) => (
            <div key={index} className="flex items-center mb-2">
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
                className="h-4 w-4 text-blue-600 border-gray-300 mr-2 focus:ring-blue-500"
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
                placeholder={`Option ${index + 1}`}
              />
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-1">
            Select the radio button next to the correct answer.
          </p>
          {/* TODO: Add MenuItem selection dropdown if multiple menus were involved */}
          <p className="text-xs text-gray-500 mt-1">
            (Associated Menu Item ID: {newQuestion.menuItemId || "N/A"} -
            Improve UI later)
          </p>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Question to Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionModal;
