import React, { useState, useEffect, useCallback } from "react";
import ErrorMessage from "../common/ErrorMessage"; // Assuming needed
import SuccessNotification from "../common/SuccessNotification"; // Assuming needed
import LoadingSpinner from "../common/LoadingSpinner"; // Assuming needed
import Button from "../common/Button"; // Import Button
import Modal from "../common/Modal"; // Import Modal
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Quiz: ${quizData.title}`}
      size="2xl" // Use a large size
      // No footerContent needed, keeping footer inside children
    >
      {/* Modal children now contain title input and scrollable questions */}
      {/* Input for Quiz Title - Remains near top */}
      <div className="mb-4">
        <label
          htmlFor="quizEditTitle"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
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
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
          placeholder="Quiz Title"
        />
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Edit Quiz Questions</h3>
        {/* Adjust max-height for sticky footer */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(80vh - 200px)] pr-2">
          {/* Adjusted max-h estimate */}
          {quizData.questions.map((question, idx) => (
            <QuestionDisplay
              key={question._id || `new-${idx}`}
              question={question}
              index={idx}
              userAnswer={undefined}
              isEditing={true}
              onAnswerSelect={() => {}}
              onQuestionChange={handleQuestionChange}
              onQuestionDelete={handleQuestionDelete}
            />
          ))}
          {quizData.questions.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No questions yet. Add one!
            </p>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Sticky Footer with Buttons */}
      <div className="sticky bottom-0 p-4 z-10 flex justify-end items-center space-x-3">
        {/* Add Question Button - Moved to sticky footer */}
        <Button variant="success" onClick={openAddQuestionModal}>
          Add Question
        </Button>
        {/* Save Button - Moved back to sticky footer */}
        <Button variant="primary" onClick={handleSaveClick} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Quiz Changes"}
        </Button>
      </div>

      {/* Add Question Modal remains nested (outside the main modal flow) */}
      <AddQuestionModal
        isOpen={isAddQuestionModalOpen}
        onClose={() => setIsAddQuestionModalOpen(false)}
        onSubmit={handleAddQuestionSubmit}
        initialMenuItemId={getInitialMenuItemIdForNewQuestion()}
      />
    </Modal>
  );
};

export default QuizEditorModal;
