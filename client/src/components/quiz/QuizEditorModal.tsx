import React, { useState, useEffect, useCallback } from "react";
import ErrorMessage from "../common/ErrorMessage";
import LoadingSpinner from "../common/LoadingSpinner";
import Button from "../common/Button";
import Modal from "../common/Modal";
import QuestionDisplay from "./QuestionDisplay";
import AddQuestionModal from "./AddQuestionModal";
import { ClientQuizEditable, QuizDisplayQuestion } from "../../types/quizTypes"; // IMPORTED

// --- Interfaces ---
// REMOVED local Question and QuizData interface definitions

// --- Component Props ---
interface QuizEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuizData: ClientQuizEditable | null; // UPDATED type
  onSave: (quizData: ClientQuizEditable) => void; // UPDATED type
  isSaving: boolean;
}

// --- Component ---
const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  isOpen,
  onClose,
  initialQuizData,
  onSave,
  isSaving,
}) => {
  const [quizData, setQuizData] = useState<ClientQuizEditable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] =
    useState<boolean>(false);

  useEffect(() => {
    if (isOpen && initialQuizData) {
      setQuizData({ ...initialQuizData });
      setError(null);
      setIsAddQuestionModalOpen(false);
    } else if (!isOpen) {
      setQuizData(null);
      setError(null);
      setIsAddQuestionModalOpen(false);
    }
  }, [isOpen, initialQuizData]);

  const handleSaveClick = () => {
    if (!quizData) return;
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

  const handleQuestionChange = useCallback(
    (index: number, updatedQuestion: QuizDisplayQuestion) => {
      // UPDATED type
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

  const openAddQuestionModal = () => {
    setIsAddQuestionModalOpen(true);
  };

  const handleAddQuestionSubmit = (newQuestion: QuizDisplayQuestion) => {
    // UPDATED type
    setQuizData((prevData) => {
      if (!prevData) return null;
      return { ...prevData, questions: [...prevData.questions, newQuestion] };
    });
    setIsAddQuestionModalOpen(false);
  };

  const getInitialMenuItemIdForNewQuestion = (): string => {
    if (!quizData || !quizData.menuItemIds) return ""; // Added check for menuItemIds
    if (quizData.questions.length > 0 && quizData.questions[0].menuItemId) {
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

  // const isAssigned = quizData.isAssigned ?? false; // This was not used, can remove if not needed for logic

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Quiz: ${quizData.title}`}
      size="2xl"
    >
      <div className="mb-6">
        <label
          htmlFor="quizEditTitle"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Quiz Title <span className="text-red-500">*</span>
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
          className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          placeholder="Enter Quiz Title"
          required
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">
          Quiz Questions
        </h3>
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh - 300px)] pr-2 rounded-lg border border-slate-200 p-4 bg-slate-50">
          {quizData.questions.map((question, idx) => (
            <QuestionDisplay
              key={question._id || `new-${idx}`}
              question={question}
              index={idx}
              userAnswer={undefined} // Not applicable in editor view
              isEditing={true} // Always in edit mode inside editor
              onAnswerSelect={() => {}} // Not applicable
              onQuestionChange={handleQuestionChange}
              onQuestionDelete={handleQuestionDelete}
            />
          ))}
          {quizData.questions.length === 0 && (
            <p className="text-center text-slate-500 py-6">
              No questions yet. Click &quot;Add Question&quot; to begin.
            </p>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}
      {/* SuccessNotification removed as onSave handles redirection/global state change */}

      <div className="sticky bottom-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center space-x-3 z-10">
        <Button
          variant="success"
          onClick={openAddQuestionModal}
          disabled={isSaving}
        >
          Add Question
        </Button>
        <Button
          variant="primary"
          onClick={handleSaveClick}
          disabled={
            isSaving ||
            !quizData.title.trim() ||
            quizData.questions.length === 0
          }
        >
          {isSaving ? <LoadingSpinner message="" /> : "Save Quiz Changes"}
        </Button>
      </div>

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
