import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import {
  IQuestion,
  IQuestionBank,
  NewQuestionClientData,
  AiGenerationClientParams,
} from "../types/questionBankTypes";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import GenerateAiQuestionsForm from "../components/questionBank/GenerateAiQuestionsForm";
import Modal from "../components/common/Modal";
import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm";
import {
  createQuestion as apiCreateQuestion,
  generateAiQuestions as apiGenerateAiQuestions,
} from "../services/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";

// Simple component to display a single question - to be expanded
const QuestionListItem: React.FC<{
  question: IQuestion;
  onRemove: (questionId: string) => void;
  onEdit: (question: IQuestion) => void;
}> = ({ question, onRemove, onEdit }) => {
  return (
    <div className="p-3 border rounded-md mb-3 bg-white shadow-sm">
      <p className="font-medium text-gray-800">{question.questionText}</p>
      <p className="text-xs text-gray-500">
        Type: {question.questionType} | Difficulty:{" "}
        {question.difficulty || "N/A"}
      </p>
      <p className="text-xs text-gray-500">
        Categories: {question.categories.join(", ")}
      </p>
      <div className="mt-2 flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={() => onEdit(question)}
          className="text-xs px-2 py-1"
        >
          Edit Question
        </Button>
        <Button
          variant="destructive"
          onClick={() => onRemove(question._id)}
          className="text-xs px-2 py-1"
        >
          Remove from Bank
        </Button>
      </div>
    </div>
  );
};

const QuestionBankDetailPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const {
    currentQuestionBank,
    isLoading,
    error,
    fetchQuestionBankById,
    removeQuestionFromCurrentBank,
    addQuestionToCurrentBank,
  } = useQuestionBanks();

  // Local state for managing modals or forms for adding questions
  const [showAddManualQuestionModal, setShowAddManualQuestionModal] =
    useState(false);
  const [showGenerateAiQuestionsModal, setShowGenerateAiQuestionsModal] =
    useState(false);
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isConfirmRemoveModalOpen, setIsConfirmRemoveModalOpen] =
    useState(false);
  const [questionToRemoveId, setQuestionToRemoveId] = useState<string | null>(
    null
  );
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(
    null
  );

  const memoizedFetchQuestionBankById = useCallback(fetchQuestionBankById, []);

  useEffect(() => {
    if (bankId) {
      memoizedFetchQuestionBankById(bankId);
    }
  }, [bankId, memoizedFetchQuestionBankById]);

  const requestRemoveQuestion = (questionId: string) => {
    if (!bankId || !currentQuestionBank) return;
    setQuestionToRemoveId(questionId);
    setIsConfirmRemoveModalOpen(true);
  };

  const handleCancelRemoveQuestion = () => {
    setIsConfirmRemoveModalOpen(false);
    setQuestionToRemoveId(null);
  };

  const executeRemoveQuestion = async () => {
    if (questionToRemoveId && currentQuestionBank) {
      await removeQuestionFromCurrentBank(questionToRemoveId);
      setIsConfirmRemoveModalOpen(false);
      setQuestionToRemoveId(null);
    }
  };

  const handleManualQuestionSubmit = async (newQuestion: IQuestion) => {
    if (!currentQuestionBank) {
      console.error("No current question bank to add to.");
      return;
    }
    try {
      if (newQuestion && newQuestion._id) {
        await addQuestionToCurrentBank(newQuestion._id);
        setShowAddManualQuestionModal(false);
      } else {
        console.error(
          "New question data is invalid or missing ID after creation."
        );
        setPageError(
          "Error: Failed to add the created question to the bank. The question data was invalid after creation."
        );
      }
    } catch (err) {
      console.error("Error adding created question to bank:", err);
      setPageError(
        `Error adding question to bank: ${
          err instanceof Error ? err.message : "An unknown error occurred."
        }`
      );
    }
  };

  const handleAiQuestionsGenerated = async (
    generatedQuestions: IQuestion[]
  ) => {
    if (!currentQuestionBank) {
      console.error("No current question bank to add generated questions to.");
      setPageError("Error: No active question bank to add questions to.");
      return;
    }
    setPageError(null);
    try {
      if (generatedQuestions && generatedQuestions.length > 0) {
        for (const q of generatedQuestions) {
          if (q && q._id) {
            await addQuestionToCurrentBank(q._id);
          }
        }
        setShowGenerateAiQuestionsModal(false);
        console.log(
          `${generatedQuestions.length} questions generated and added to the bank.`
        );
      } else {
        console.log("No new AI questions were provided to add to the bank.");
      }
    } catch (err) {
      console.error("Error adding AI generated questions to bank:", err);
      setPageError(
        `Error adding AI-generated questions to bank: ${
          err instanceof Error ? err.message : "An unknown error occurred."
        }`
      );
    }
  };

  // Helper to get error message
  const getErrorMessage = (errorValue: unknown): string => {
    if (
      errorValue &&
      typeof errorValue === "object" &&
      "message" in errorValue
    ) {
      return String((errorValue as { message: unknown }).message);
    }
    return "An unknown error occurred.";
  };

  const handleOpenEditBankModal = () => {
    if (currentQuestionBank) {
      setIsEditBankModalOpen(true);
    }
  };

  const handleCloseEditBankModal = () => {
    setIsEditBankModalOpen(false);
  };

  const handleBankDetailsUpdated = (updatedBank: IQuestionBank) => {
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
    handleCloseEditBankModal();
  };

  // Handlers for Edit Question Modal
  const handleOpenEditQuestionModal = (question: IQuestion) => {
    setEditingQuestion(question);
    setIsEditQuestionModalOpen(true);
  };

  const handleCloseEditQuestionModal = () => {
    setIsEditQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const handleQuestionUpdatedInModal = (updatedQuestion: IQuestion) => {
    // Option 1: Optimistically update in local state (if currentQuestionBank.questions is array of IQuestion)
    // This avoids a full re-fetch of the bank if only one question changed.
    if (currentQuestionBank && Array.isArray(currentQuestionBank.questions)) {
      const updatedQuestions = (
        currentQuestionBank.questions as IQuestion[]
      ).map((q) => (q._id === updatedQuestion._id ? updatedQuestion : q));
      // This assumes useQuestionBanks hook allows direct update of currentQuestionBank or provides a setter.
      // For now, we will rely on re-fetching the bank for simplicity.
      // setCurrentQuestionBank({ ...currentQuestionBank, questions: updatedQuestions });
    }

    // Option 2: Re-fetch the entire bank to ensure data consistency
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
    handleCloseEditQuestionModal();
  };

  if (isLoading && !currentQuestionBank) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        <p>Error loading question bank: {getErrorMessage(error)}</p>
        <Link to="/question-banks">
          <Button variant="secondary" className="mt-2">
            Back to List
          </Button>
        </Link>
      </div>
    );
  }

  if (!currentQuestionBank) {
    return (
      <div className="text-center p-10">
        <p className="text-xl text-gray-600">Question bank not found.</p>
        <Link to="/question-banks">
          <Button variant="primary" className="mt-4">
            Back to Question Banks
          </Button>
        </Link>
      </div>
    );
  }

  // Ensure questions are IQuestion objects
  const questions = (currentQuestionBank.questions as IQuestion[]).filter(
    (q) => typeof q === "object" && q._id
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="py-8">
        {/* Content when bank is loaded */}
        {!isLoading && !error && currentQuestionBank && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {pageError && (
              <div
                className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md relative"
                role="alert"
              >
                {pageError}
                <button
                  onClick={() => setPageError(null)}
                  className="absolute top-0 bottom-0 right-0 px-3 py-2 text-red-500 hover:text-red-700"
                  aria-label="Dismiss error"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div>
                <Button
                  onClick={() => navigate("/question-banks")}
                  variant="secondary"
                  className="mb-2 text-sm"
                >
                  &larr; Back to Question Banks List
                </Button>
                <header className="mb-4">
                  <h1 className="text-3xl font-bold leading-tight text-gray-900">
                    {currentQuestionBank.name}
                  </h1>
                  {currentQuestionBank.description && (
                    <p className="mt-1 text-sm text-gray-500">
                      {currentQuestionBank.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Bank ID: {currentQuestionBank._id}
                  </p>
                </header>
              </div>
              <Button
                variant="primary"
                onClick={handleOpenEditBankModal}
                className="text-sm whitespace-nowrap"
              >
                Edit Details
              </Button>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <p className="text-sm text-gray-600">
                Total Questions: {questions.length}
              </p>
              {currentQuestionBank.categories &&
                currentQuestionBank.categories.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Bank Categories: {currentQuestionBank.categories.join(", ")}
                  </p>
                )}
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Questions in this Bank
              </h2>
              <div className="flex space-x-2 mb-4">
                <Button
                  variant="primary"
                  onClick={() => setShowAddManualQuestionModal(true)}
                >
                  Add Question Manually
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowGenerateAiQuestionsModal(true)}
                >
                  Generate Questions (AI)
                </Button>
              </div>

              {questions.length === 0 ? (
                <p className="text-gray-600">
                  No questions have been added to this bank yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {questions.map((question) => (
                    <QuestionListItem
                      key={question._id}
                      question={question}
                      onRemove={requestRemoveQuestion}
                      onEdit={handleOpenEditQuestionModal}
                    />
                  ))}
                </div>
              )}
            </div>

            {showAddManualQuestionModal && (
              <AddManualQuestionForm
                onQuestionAdded={handleManualQuestionSubmit}
                onClose={() => setShowAddManualQuestionModal(false)}
                initialBankCategories={currentQuestionBank?.categories || []}
              />
            )}
            {showGenerateAiQuestionsModal && (
              <GenerateAiQuestionsForm
                bankCategories={currentQuestionBank.categories || []}
                bankId={currentQuestionBank._id}
                onAiQuestionsGenerated={handleAiQuestionsGenerated}
                onClose={() => setShowGenerateAiQuestionsModal(false)}
              />
            )}
          </div>
        )}
      </main>
      {currentQuestionBank && (
        <Modal
          isOpen={isEditBankModalOpen}
          onClose={handleCloseEditBankModal}
          title={`Edit Bank: ${currentQuestionBank.name}`}
        >
          <EditQuestionBankForm
            bankToEdit={currentQuestionBank}
            onBankUpdated={handleBankDetailsUpdated}
            onCancel={handleCloseEditBankModal}
          />
        </Modal>
      )}
      {isConfirmRemoveModalOpen &&
        questionToRemoveId &&
        currentQuestionBank && (
          <Modal
            isOpen={isConfirmRemoveModalOpen}
            onClose={handleCancelRemoveQuestion}
            title="Confirm Remove Question"
          >
            <ConfirmationModalContent
              message={`Are you sure you want to remove this question from the bank? Question: "${
                questions.find((q) => q._id === questionToRemoveId)
                  ?.questionText || "this question"
              }"`}
              onConfirm={executeRemoveQuestion}
              onCancel={handleCancelRemoveQuestion}
              confirmText="Remove"
              confirmButtonVariant="destructive"
            />
          </Modal>
        )}
      {editingQuestion && (
        <Modal
          isOpen={isEditQuestionModalOpen}
          onClose={handleCloseEditQuestionModal}
          title={`Edit Question: ${editingQuestion.questionText.substring(
            0,
            30
          )}...`}
          size="xl"
        >
          <EditQuestionForm
            questionToEdit={editingQuestion}
            onQuestionUpdated={handleQuestionUpdatedInModal}
            onClose={handleCloseEditQuestionModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default QuestionBankDetailPage;
