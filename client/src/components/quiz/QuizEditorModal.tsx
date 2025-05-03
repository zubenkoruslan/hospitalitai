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
  createdAt?: string;
  updatedAt?: string;
}

interface QuizResultDisplay {
  score: number;
  totalQuestions: number;
  correctAnswers: (number | undefined)[];
  userAnswers: (number | undefined)[];
  quizData: QuizData;
}

// --- Component Props ---
interface QuizEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuizData: QuizData | null;
  onSave: (quizData: QuizData) => void;
  isSaving: boolean;
  onShowResults?: (results: QuizResultDisplay) => void; // Optional: To show results after preview
}

// --- Component ---
const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  isOpen,
  onClose,
  initialQuizData,
  onSave,
  isSaving,
  onShowResults, // Added prop
}) => {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // Local error for validation

  // State for previewing/answering
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(number | undefined)[]>([]);

  // State for Add Question Modal
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] =
    useState<boolean>(false);

  // Initialize state when the modal opens or initial data changes
  useEffect(() => {
    if (isOpen && initialQuizData) {
      setQuizData({ ...initialQuizData }); // Create a local copy to edit
      setUserAnswers(
        new Array(initialQuizData.questions.length).fill(undefined)
      );
      setCurrentQuestionIndex(0);
      setIsEditMode(false); // Default to preview mode
      setError(null);
      setIsAddQuestionModalOpen(false); // Ensure add question modal is closed initially

      // Prevent editing if already assigned
      if (initialQuizData.isAssigned) {
        setIsEditMode(false);
        // Maybe show a notification here?
      }
    } else if (!isOpen) {
      // Reset when closed
      setQuizData(null);
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setIsEditMode(false);
      setError(null);
      setIsAddQuestionModalOpen(false);
    }
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
    // Add more validation as needed...

    setError(null);
    onSave(quizData);
  };

  const handleAnswerSelect = useCallback(
    (questionIndex: number, choiceIndex: number) => {
      setUserAnswers((prev) => {
        const newAnswers = [...prev];
        newAnswers[questionIndex] = choiceIndex;
        return newAnswers;
      });
    },
    []
  );

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

  // Submit Preview Answers (Local Calculation)
  const handlePreviewSubmit = () => {
    if (!quizData) return;

    const results: QuizResultDisplay = {
      score: 0,
      totalQuestions: quizData.questions.length,
      correctAnswers: [],
      userAnswers: userAnswers,
      quizData: quizData, // Pass the current state of quizData
    };

    quizData.questions.forEach((q, index) => {
      results.correctAnswers.push(q.correctAnswer);
      if (userAnswers[index] === q.correctAnswer) {
        results.score++;
      }
    });

    // Instead of opening a results modal here, call the callback
    if (onShowResults) {
      onShowResults(results);
    }
    onClose(); // Close the editor modal
  };

  // --- Add Question Logic ---
  const openAddQuestionModal = () => {
    setIsAddQuestionModalOpen(true);
  };

  const handleAddQuestionSubmit = (newQuestion: Question) => {
    setQuizData((prevData) => {
      if (!prevData) return null;
      return { ...prevData, questions: [...prevData.questions, newQuestion] };
    });
    setIsAddQuestionModalOpen(false); // Close modal handled by AddQuestionModal itself via onClose
  };

  // Determine initial menu item ID for new questions
  const getInitialMenuItemIdForNewQuestion = (): string => {
    if (!quizData) return "";
    // Try to get from first question
    if (quizData.questions.length > 0) {
      return quizData.questions[0].menuItemId;
    }
    // Try to get from menuItemIds array
    if (quizData.menuItemIds.length > 0) {
      const firstItem = quizData.menuItemIds[0];
      return typeof firstItem === "string" ? firstItem : firstItem._id;
    }
    return ""; // Fallback
  };

  if (!isOpen || !quizData) {
    return null;
  }

  const isAssigned = quizData.isAssigned ?? false;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            {isEditMode ? "Edit Quiz: " : "Preview Quiz: "} {quizData.title}
          </h2>
          <div className="flex space-x-3">
            {!isAssigned ? (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isEditMode
                    ? "bg-blue-100 text-blue-600"
                    : "bg-blue-600 text-white"
                }`}
              >
                {isEditMode ? "Exit Edit Mode" : "Edit Questions"}
              </button>
            ) : (
              <div className="text-yellow-700 text-sm bg-yellow-50 px-3 py-2 rounded-md">
                Quiz has been assigned. Editing disabled.
              </div>
            )}
            {isEditMode && (
              <button
                onClick={openAddQuestionModal} // Use handler
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium"
              >
                Add Question
              </button>
            )}
            <button
              onClick={onClose} // Use onClose prop
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {/* TODO: Implement Content Area (Preview/Edit) */}
        {isEditMode ? (
          // Editing view
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Edit Quiz Questions</h3>
            <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {quizData.questions.map((question, idx) => (
                <QuestionDisplay
                  key={question._id || `new-${idx}`} // Handle potential new questions without _id yet
                  question={question}
                  index={idx}
                  userAnswer={undefined} // Not used in edit mode
                  isEditing={true}
                  onAnswerSelect={() => {}} // Not used in edit mode
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

            {error && <ErrorMessage message={error} />}

            {/* Edit Footer (Title edit + Save) */}
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
        ) : (
          // Preview view
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Preview Questions</h3>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {quizData.questions.map((question, idx) => (
                <QuestionDisplay
                  key={question._id || `preview-${idx}`}
                  question={question}
                  index={idx}
                  userAnswer={userAnswers[idx]}
                  isEditing={false}
                  onAnswerSelect={handleAnswerSelect}
                  onQuestionChange={() => {}} // Not used in preview
                  onQuestionDelete={() => {}} // Not used in preview
                />
              ))}
              {quizData.questions.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  This quiz has no questions.
                </p>
              )}
            </div>

            {/* Preview Footer (Finish Button) */}
            {quizData.questions.length > 0 && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handlePreviewSubmit}
                  disabled={userAnswers.some((a) => a === undefined)}
                  className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  Finish & View Results
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Question Modal (Rendered within Editor Modal) */}
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
