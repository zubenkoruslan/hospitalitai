import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { getMenusByRestaurant as fetchRestaurantMenus } from "../services/api";
import { IMenuClient } from "../types/menuTypes";

// Simple component to display a single question - to be expanded
const QuestionListItem: React.FC<{
  question: IQuestion;
  onRemove: (questionId: string) => void;
  onEdit: (question: IQuestion) => void;
  isSelected: boolean;
  onToggleSelect: (questionId: string) => void;
}> = ({ question, onRemove, onEdit, isSelected, onToggleSelect }) => {
  // Helper function to format question type
  const formatQuestionType = (type: string) => {
    if (!type) return "N/A";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card className="relative bg-gray-50 shadow-lg rounded-xl p-4 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex items-center space-x-3">
      {/* Checkbox on the left */}
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          checked={isSelected}
          onChange={() => onToggleSelect(question._id)}
          aria-label={`Select question: ${question.questionText}`}
        />
      </div>
      {/* Main content area (text only) to the right of checkbox */}
      <div className="flex-grow flex flex-col pb-10">
        {/* Question Text */}
        <p className="text-lg font-semibold text-gray-900 mb-1">
          {question.questionText}
        </p>
        {/* Metadata (Type, Difficulty, Category) */}
        <p className="text-xs text-gray-500 mb-2">
          {`Type: ${formatQuestionType(question.questionType)} | Difficulty: ${
            question.difficulty || "N/A"
          } | Category: ${question.categories?.join(", ") || "N/A"}`}
        </p>
        {/* Explanation */}
        {question.explanation && (
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-800">Explanation:</span>{" "}
            {question.explanation}
          </p>
        )}
      </div>
      {/* Buttons container - absolutely positioned */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
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

  // State for multi-select and bulk actions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isConfirmBulkDeleteModalOpen, setIsConfirmBulkDeleteModalOpen] =
    useState(false);

  // State for menu selection for AI Generation
  const [availableMenus, setAvailableMenus] = useState<IMenuClient[]>([]);
  const [selectedMenuForAi, setSelectedMenuForAi] = useState<string | null>(
    null
  );
  const [isMenuSelectionModalOpen, setIsMenuSelectionModalOpen] =
    useState(false);
  const [isLoadingMenusForAi, setIsLoadingMenusForAi] = useState(false);

  const memoizedFetchQuestionBankById = useCallback(fetchQuestionBankById, [
    fetchQuestionBankById,
  ]);

  useEffect(() => {
    if (bankId) {
      memoizedFetchQuestionBankById(bankId);
    }
    setSelectedQuestionIds([]); // Reset selection when bank changes
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
        if (bankId) fetchQuestionBankById(bankId);
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
    setShowGenerateAiQuestionsModal(false);
    setSelectedMenuForAi(null);
    if (generatedQuestions && generatedQuestions.length > 0) {
      alert(
        `${generatedQuestions.length} AI questions generated and are pending review.`
      );
    } else {
      alert(
        "AI generation process completed, but no new questions were created or some might have failed."
      );
    }
    if (bankId) fetchQuestionBankById(bankId);
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
    if (currentQuestionBank && Array.isArray(currentQuestionBank.questions)) {
      // Optimistic update or re-fetch
    }
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
    handleCloseEditQuestionModal();
  };

  const handleOpenGenerateAiQuestions = async () => {
    if (!currentQuestionBank) {
      setPageError("Restaurant context is missing.");
      return;
    }
    setIsLoadingMenusForAi(true);
    setPageError(null);
    try {
      const menus = await fetchRestaurantMenus(
        currentQuestionBank.restaurantId
      );
      const activeMenus = menus;

      if (activeMenus.length === 0) {
        setPageError(
          "No active menus found for your restaurant. AI Question generation requires an active menu."
        );
        setIsLoadingMenusForAi(false);
        return;
      }

      setAvailableMenus(activeMenus);

      if (activeMenus.length === 1) {
        setSelectedMenuForAi(activeMenus[0]._id);
        setShowGenerateAiQuestionsModal(true);
      } else {
        setIsMenuSelectionModalOpen(true);
      }
    } catch (err) {
      console.error("Error fetching menus for AI generation:", err);
      setPageError(getErrorMessage(err));
    }
    setIsLoadingMenusForAi(false);
  };

  const handleMenuSelectForAi = (menuId: string) => {
    setSelectedMenuForAi(menuId);
    setIsMenuSelectionModalOpen(false);
    setShowGenerateAiQuestionsModal(true);
  };

  // Handlers for multi-select and bulk delete
  const handleToggleSelectQuestion = (questionId: string) => {
    setSelectedQuestionIds((prevSelected) =>
      prevSelected.includes(questionId)
        ? prevSelected.filter((id) => id !== questionId)
        : [...prevSelected, questionId]
    );
  };

  const handleToggleSelectAll = () => {
    if (!currentQuestionBank || !currentQuestionBank.questions) return;
    if (selectedQuestionIds.length === currentQuestionBank.questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(
        (currentQuestionBank.questions as IQuestion[]).map((q) => q._id)
      );
    }
  };

  const handleRequestBulkDelete = () => {
    if (selectedQuestionIds.length > 0) {
      setIsConfirmBulkDeleteModalOpen(true);
    } else {
      alert("No questions selected to delete.");
    }
  };

  const handleCancelBulkDelete = () => {
    setIsConfirmBulkDeleteModalOpen(false);
  };

  const executeBulkDelete = async () => {
    if (!currentQuestionBank || selectedQuestionIds.length === 0) return;

    // For now, deleting one by one. Consider a bulk API endpoint for efficiency.
    try {
      for (const questionId of selectedQuestionIds) {
        await removeQuestionFromCurrentBank(questionId);
      }
      setSelectedQuestionIds([]); // Clear selection
      // Optionally, re-fetch the bank to ensure UI consistency if removeQuestionFromCurrentBank doesn't update the context perfectly
      if (bankId) fetchQuestionBankById(bankId);
    } catch (err) {
      console.error("Error during bulk delete:", err);
      setPageError(
        `Failed to delete some questions: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      // Re-fetch to get the current state after partial failure
      if (bankId) fetchQuestionBankById(bankId);
    } finally {
      setIsConfirmBulkDeleteModalOpen(false);
    }
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
                <p className="mt-2 text-sm text-gray-600 max-w-xl">
                  {currentQuestionBank.description}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={handleOpenEditBankModal}
              className="mt-4 sm:mt-0 flex-shrink-0"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="primary"
              onClick={() => setShowAddManualQuestionModal(true)}
              className="w-full"
            >
              Add Manual Question
            </Button>
            <Button
              variant="secondary"
              onClick={handleOpenGenerateAiQuestions}
              className="w-full"
              disabled={isLoadingMenusForAi}
            >
              {isLoadingMenusForAi ? (
                <LoadingSpinner />
              ) : (
                "Generate AI Questions"
              )}
            </Button>
            {bankId && (
              <Link to={`/question-banks/${bankId}/review-ai-questions`}>
                <Button variant="secondary" className="w-full">
                  Review Pending AI Questions
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Multi-select controls */}
        {currentQuestionBank.questions &&
          (currentQuestionBank.questions as IQuestion[]).length > 0 && (
            <div className="my-4 p-4 bg-gray-50 rounded-lg shadow flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  id="selectAllBankQuestionsCheckbox"
                  type="checkbox"
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  checked={
                    (currentQuestionBank.questions as IQuestion[]).length > 0 &&
                    selectedQuestionIds.length ===
                      (currentQuestionBank.questions as IQuestion[]).length
                  }
                  onChange={handleToggleSelectAll}
                  // Consider disabling if another operation is in progress (e.g., individual delete confirmation)
                />
                <label
                  htmlFor="selectAllBankQuestionsCheckbox"
                  className="text-sm font-medium text-gray-700"
                >
                  Select All ({selectedQuestionIds.length} selected)
                </label>
              </div>
              <Button
                variant="destructive"
                onClick={handleRequestBulkDelete}
                disabled={selectedQuestionIds.length === 0}
              >
                Delete Selected ({selectedQuestionIds.length})
              </Button>
            </div>
          )}

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
          <div className="space-y-4 mt-4">
            {(currentQuestionBank.questions as IQuestion[])?.map((q) => (
              <QuestionListItem
                key={q._id}
                question={q}
                onRemove={() => requestRemoveQuestion(q._id)}
                onEdit={() => handleOpenEditQuestionModal(q)}
                isSelected={selectedQuestionIds.includes(q._id)}
                onToggleSelect={handleToggleSelectQuestion}
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

        {showGenerateAiQuestionsModal && selectedMenuForAi && bankId && (
          <Modal
            isOpen={showGenerateAiQuestionsModal}
            onClose={() => {
              setShowGenerateAiQuestionsModal(false);
              setSelectedMenuForAi(null);
            }}
            title="Generate Questions with AI"
          >
            <GenerateAiQuestionsForm
              bankId={bankId}
              menuId={selectedMenuForAi}
              bankCategories={currentQuestionBank?.categories || []}
              onAiQuestionsGenerated={handleAiQuestionsGenerated}
              onCloseRequest={() => {
                setShowGenerateAiQuestionsModal(false);
                setSelectedMenuForAi(null);
              }}
            />
          </Modal>
        )}

        {isMenuSelectionModalOpen && (
          <Modal
            isOpen={isMenuSelectionModalOpen}
            onClose={() => setIsMenuSelectionModalOpen(false)}
            title="Select Menu for AI Question Generation"
            size="md"
          >
            <div className="p-4">
              <p className="text-sm text-gray-700 mb-4">
                Multiple active menus found. Please select which menu to use as
                context for AI question generation.
              </p>
              {availableMenus.length === 0 && !isLoadingMenusForAi && (
                <p className="text-sm text-gray-500">
                  No active menus available.
                </p>
              )}
              {isLoadingMenusForAi && (
                <LoadingSpinner message="Loading menus..." />
              )}
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {availableMenus.map((menu) => (
                  <li key={menu._id}>
                    <Button
                      variant="secondary"
                      className="w-full text-left justify-start"
                      onClick={() => handleMenuSelectForAi(menu._id)}
                    >
                      {menu.name}
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setIsMenuSelectionModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
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

        {/* Confirmation Modal for Bulk Delete */}
        {isConfirmBulkDeleteModalOpen && (
          <Modal
            isOpen={isConfirmBulkDeleteModalOpen}
            onClose={handleCancelBulkDelete}
            title="Confirm Bulk Delete"
            size="sm"
          >
            <ConfirmationModalContent
              message={`Are you sure you want to delete ${selectedQuestionIds.length} selected question(s) from this bank? This action cannot be undone.`}
              onConfirm={executeBulkDelete}
              onCancel={handleCancelBulkDelete}
              confirmText={`Delete ${selectedQuestionIds.length} Question(s)`}
              confirmButtonVariant="destructive"
            />
          </Modal>
        )}
      </main>
    </div>
  );
};

export default QuestionBankDetailPage;
