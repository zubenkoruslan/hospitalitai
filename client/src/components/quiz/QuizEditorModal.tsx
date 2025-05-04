import React, { useState, useEffect, useCallback } from "react";
import ErrorMessage from "../common/ErrorMessage"; // Assuming needed
import SuccessNotification from "../common/SuccessNotification"; // Assuming needed
import LoadingSpinner from "../common/LoadingSpinner"; // Assuming needed
import QuestionDisplay from "./QuestionDisplay"; // Import QuestionDisplay
import AddQuestionModal from "./AddQuestionModal"; // Import AddQuestionModal

// --- Interfaces ---
// TODO: Move to shared types file
interface Question {
  _id?: string;
  text: string;
  choices: string[];
  correctAnswer: number;
  menuItemId: string;
}

interface QuizData {
  _id?: string;
  title: string;
  menuItemIds: string[] | { _id: string; name: string }[];
  questions: Question[];
  restaurantId: string;
  isAssigned?: boolean;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Remove QuizResultDisplay as preview is removed
// interface QuizResultDisplay { ... }

// --- Component Props ---
interface QuizEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuizData: QuizData | null;
  onSave: (quizData: QuizData) => void;
  isSaving: boolean;
  // Remove startInEditMode and onShowResults
}

// --- Component ---
const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  isOpen,
  onClose,
  initialQuizData,
  onSave,
  isSaving,
}) => {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  // Remove isEditMode state
  const [error, setError] = useState<string | null>(null);

  // Remove preview state (userAnswers, currentQuestionIndex)

  // State for Add Question Modal
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] =
    useState<boolean>(false);

  // Initialize state when the modal opens or initial data changes
  useEffect(() => {
    if (isOpen && initialQuizData) {
      setQuizData({ ...initialQuizData }); // Create a local copy to edit
      // Remove userAnswers initialization
      // Remove currentQuestionIndex initialization
      setError(null);
      setIsAddQuestionModalOpen(false);
    } else if (!isOpen) {
      // Reset when closed
      setQuizData(null);
      // Remove userAnswers reset
      // Remove currentQuestionIndex reset
      setError(null);
      setIsAddQuestionModalOpen(false);
    }
    // Remove startInEditMode from dependencies
  }, [isOpen, initialQuizData]);

  const handleSaveClick = () => {
    if (!quizData) return;

    // Basic validation (can be expanded)
    if (!quizData.title.trim()) {
      setError("Quiz title cannot be empty");
      return;
    }
    if (quizData.questions.length === 0) {
      setError("Quiz must have at least one question");
      return;
    }

    setError(null);
    onSave(quizData);
  };

  // Remove handleAnswerSelect handler

  const handleQuestionChange = useCallback(
    (index: number, updatedQuestion: Question) => {
      setQuizData((prevData) => {
        if (!prevData) return null;
        const updatedQuestions = [...prevData.questions];
        updatedQuestions[index] = updatedQuestion;
        return { ...prevData, questions: updatedQuestions };
      });
    },
    []
  );

  const handleQuestionDelete = useCallback((index: number) => {
    setQuizData((prevData) => {
      if (!prevData) return null;
      const updatedQuestions = prevData.questions.filter((_, i) => i !== index);
      return { ...prevData, questions: updatedQuestions };
    });
  }, []);

  // Remove handlePreviewSubmit handler

  // --- Add Question Logic ---
  const openAddQuestionModal = () => {
    setIsAddQuestionModalOpen(true);
  };

  const handleAddQuestionSubmit = (newQuestion: Question) => {
    setQuizData((prevData) => {
      if (!prevData) return null;
      return { ...prevData, questions: [...prevData.questions, newQuestion] };
    });
    setIsAddQuestionModalOpen(false);
  };

  // Determine initial menu item ID for new questions
  const getInitialMenuItemIdForNewQuestion = (): string => {
    if (!quizData) return "";
    if (quizData.questions.length > 0) {
      return quizData.questions[0].menuItemId;
    }
    if (quizData.menuItemIds.length > 0) {
      const firstItem = quizData.menuItemIds[0];
      return typeof firstItem === "string" ? firstItem : firstItem._id;
    }
    return "";
  };

  if (!isOpen || !quizData) {
    return null;
  }

  const isAssigned = quizData.isAssigned ?? false;
  // Remove the canEdit derivation, editing is always allowed for the owner
  // const canEdit = !isAssigned;

  return (
    // Use a full-screen modal style or adjust as needed
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header: Title and Buttons */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Edit Quiz: {quizData.title} {/* Always Edit Title */}
          </h2>
          <div className="flex space-x-3">
            {/* Show 'Add Question' button always (owner is editing) */}
            <button
              onClick={openAddQuestionModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium"
            >
              Add Question
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {/* Editing View Content - Rendered Unconditionally */}
        <div className="mb-6">
          {/* Removed outer conditional rendering based on isEditMode */}
          <h3 className="text-lg font-medium mb-4">Edit Quiz Questions</h3>
          <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {quizData.questions.map((question, idx) => (
              <QuestionDisplay
                key={question._id || `new-${idx}`}
                question={question}
                index={idx}
                userAnswer={undefined} // Not applicable
                isEditing={true} // Always true for editing fields
                onAnswerSelect={() => {}} // Not applicable
                onQuestionChange={handleQuestionChange} // Always allow change
                onQuestionDelete={handleQuestionDelete} // Always allow delete
              />
            ))}
            {quizData.questions.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No questions yet. Add one!
              </p>
            )}
          </div>

          {error && <ErrorMessage message={error} />}

          {/* Edit Footer (Title edit + Save) - Always show */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <div>
              <label htmlFor="quizEditTitle" className="sr-only">
                Quiz Title
              </label>
              <input
                id="quizEditTitle"
                type="text"
                value={quizData.title}
                onChange={(e) =>
                  setQuizData((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                className="px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Quiz Title"
              />
            </div>
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Quiz Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Add Question Modal (Rendered within Editor Modal) */}
      {/* Always render Add Question Modal */}
      <AddQuestionModal
        isOpen={isAddQuestionModalOpen}
        onClose={() => setIsAddQuestionModalOpen(false)}
        onSubmit={handleAddQuestionSubmit}
        initialMenuItemId={getInitialMenuItemIdForNewQuestion()}
      />
    </div>
  );
};

export default QuizEditorModal;
