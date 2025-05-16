import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import { IQuestion, IQuestionBank } from "../types/questionBankTypes";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import GenerateAiQuestionsForm from "../components/questionBank/GenerateAiQuestionsForm";
import Modal from "../components/common/Modal";
import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";
import Card from "../components/common/Card";
import ErrorMessage from "../components/common/ErrorMessage";

// Simple component to display a single question - to be expanded
const QuestionListItem: React.FC<{
  question: IQuestion;
  onRemove: (questionId: string) => void;
  onEdit: (question: IQuestion) => void;
}> = ({ question, onRemove, onEdit }) => {
  // Helper function to format question type
  const formatQuestionType = (type: string) => {
    if (!type) return "N/A";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card className="bg-white shadow-lg rounded-xl p-4 mb-3 hover:shadow-xl transition-shadow duration-300">
      <p className="font-semibold text-gray-800 mb-2">
        {question.questionText}
      </p>
      <div className="text-xs text-gray-600 space-y-1 mb-3">
        <p>
          Type: {formatQuestionType(question.questionType)}
          {question.difficulty && ` | Difficulty: ${question.difficulty}`}
        </p>
        <p>
          Category:{" "}
          {question.categories && question.categories.length > 0
            ? question.categories.join(", ")
            : "N/A"}
        </p>
      </div>
      <div className="mt-3 flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={() => onEdit(question)}
          className="text-xs px-3 py-1"
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          onClick={() => onRemove(question._id)}
          className="text-xs px-3 py-1"
        >
          Remove
        </Button>
      </div>
    </Card>
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

  const memoizedFetchQuestionBankById = useCallback(fetchQuestionBankById, [
    fetchQuestionBankById,
  ]);

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

  const handleBankDetailsUpdated = (_updatedBank: IQuestionBank) => {
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
    if (currentQuestionBank && Array.isArray(currentQuestionBank.questions)) {
      const _updatedQuestions = (
        currentQuestionBank.questions as IQuestion[]
      ).map((q) => (q._id === updatedQuestion._id ? updatedQuestion : q));
      // This assumes useQuestionBanks hook allows direct update of currentQuestionBank or provides a setter.
      // For now, we will rely on re-fetching the bank for simplicity.
      // setCurrentQuestionBank({ ...currentQuestionBank, questions: _updatedQuestions });
    }

    // Option 2: Re-fetch the entire bank to ensure data consistency
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
    handleCloseEditQuestionModal();
  };

  if (isLoading && !currentQuestionBank) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading question bank details..." />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
          </div>
          <Card className="p-6">
            <ErrorMessage message={getErrorMessage(error)} />
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => navigate("/quiz-management")}
              >
                &larr; Back to Quiz & Bank Management
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (!currentQuestionBank) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-700">Not Found</h1>
          </div>
          <Card className="p-6">
            <ErrorMessage message="Question bank not found." />
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => navigate("/quiz-management")}
              >
                &larr; Back to Quiz & Bank Management
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Main content rendering if bank is loaded
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        {/* Back Link - Placed above title */}
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={() => navigate("/quiz-management")}
            className="text-sm"
          >
            &larr; Back to Quiz & Bank Management
          </Button>
        </div>

        {/* Updated Page Title Header */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {currentQuestionBank.name}
              </h1>
              {currentQuestionBank.description && (
                <p className="mt-2 text-sm text-gray-600">
                  {currentQuestionBank.description}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={handleOpenEditBankModal}
              className="mt-4 sm:mt-0"
            >
              Edit Details
            </Button>
          </div>
        </div>

        {pageError && (
          <div className="mb-4">
            <ErrorMessage
              message={pageError}
              onDismiss={() => setPageError(null)}
            />
          </div>
        )}

        {/* Updated Action Buttons Card for Questions */}
        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Manage Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="primary"
              onClick={() => setShowAddManualQuestionModal(true)}
              className="w-full"
            >
              Add Manual Question
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowGenerateAiQuestionsModal(true)}
              className="w-full"
            >
              Generate AI Questions
            </Button>
          </div>
        </Card>

        {/* Updated Questions List Card */}
        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Questions in this Bank ({currentQuestionBank.questions?.length || 0}
            )
          </h2>
          {isLoading && <LoadingSpinner message="Updating questions..." />}
          {(!currentQuestionBank.questions ||
            currentQuestionBank.questions.length === 0) &&
            !isLoading && (
              <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No questions yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add questions manually or generate them using AI.
                </p>
              </div>
            )}
          <div>
            {(currentQuestionBank.questions as IQuestion[])?.map((q) => (
              <QuestionListItem
                key={q._id}
                question={q}
                onRemove={() => requestRemoveQuestion(q._id)}
                onEdit={() => handleOpenEditQuestionModal(q)}
              />
            ))}
          </div>
        </Card>

        {/* Modals */}
        {showAddManualQuestionModal && (
          <Modal
            isOpen={showAddManualQuestionModal}
            onClose={() => setShowAddManualQuestionModal(false)}
            title="Add New Question Manually"
          >
            <AddManualQuestionForm
              onQuestionAdded={handleManualQuestionSubmit}
              onCloseRequest={() => setShowAddManualQuestionModal(false)}
              initialBankCategories={currentQuestionBank?.categories || []}
            />
          </Modal>
        )}

        {showGenerateAiQuestionsModal && (
          <Modal
            isOpen={showGenerateAiQuestionsModal}
            onClose={() => setShowGenerateAiQuestionsModal(false)}
            title="Generate Questions with AI"
          >
            {bankId && (
              <GenerateAiQuestionsForm
                bankId={bankId}
                bankCategories={currentQuestionBank?.categories || []}
                onAiQuestionsGenerated={handleAiQuestionsGenerated}
                onCloseRequest={() => setShowGenerateAiQuestionsModal(false)}
              />
            )}
          </Modal>
        )}

        {isEditBankModalOpen && currentQuestionBank && (
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

        {isConfirmRemoveModalOpen && questionToRemoveId && (
          <Modal
            isOpen={isConfirmRemoveModalOpen}
            onClose={handleCancelRemoveQuestion}
            title="Confirm Question Removal"
            size="sm"
          >
            <ConfirmationModalContent
              message="Are you sure you want to remove this question from the bank? This action cannot be undone."
              onConfirm={executeRemoveQuestion}
              onCancel={handleCancelRemoveQuestion}
              confirmText="Remove Question"
              confirmButtonVariant="destructive"
            />
          </Modal>
        )}

        {isEditQuestionModalOpen && editingQuestion && (
          <Modal
            isOpen={isEditQuestionModalOpen}
            onClose={handleCloseEditQuestionModal}
            title="Edit Question"
          >
            <EditQuestionForm
              questionToEdit={editingQuestion}
              onQuestionUpdated={handleQuestionUpdatedInModal}
              onClose={handleCloseEditQuestionModal}
            />
          </Modal>
        )}
      </main>
    </div>
  );
};

export default QuestionBankDetailPage;
