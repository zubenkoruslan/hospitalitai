import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import { IQuestionBank, IQuestion } from "../types/questionBankTypes";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import EditQuestionBankDetailsForm from "../components/questionBank/EditQuestionBankDetailsForm";
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
// import EditQuestionBankInlineForm from '../components/questionBank/EditQuestionBankInlineForm'; // Future component for editing name/desc
// import QuestionListManager from '../components/questionBank/QuestionListManager'; // Future component for managing questions

const QuestionBankEditPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();

  // Use the hook for bank data and operations
  const {
    currentQuestionBank,
    isLoading,
    error,
    fetchQuestionBankById,
    editQuestionBank,
    addQuestionToCurrentBank,
    removeQuestionFromCurrentBank,
    clearError,
  } = useQuestionBanks();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // States for editing bank details
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);

  // States for Question Management
  const [isAddManualModalOpen, setIsAddManualModalOpen] = useState(false);
  const [isProcessingAddQuestion, setIsProcessingAddQuestion] = useState(false);
  const [questionManagementError, setQuestionManagementError] = useState<
    string | null
  >(null);
  // States for Edit Question Modal
  const [questionToEdit, setQuestionToEdit] = useState<IQuestion | null>(null);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  // States for Remove Question Confirmation
  const [questionToRemove, setQuestionToRemove] = useState<IQuestion | null>(
    null
  );
  const [isRemoveConfirmModalOpen, setIsRemoveConfirmModalOpen] =
    useState(false);
  const [isProcessingRemove, setIsProcessingRemove] = useState(false);

  useEffect(() => {
    if (bankId) {
      fetchQuestionBankById(bankId);
    } else {
      // setError("No bank ID provided."); // Hook might handle this or set error
      // If hook doesn't set error for missing bankId before fetch, page should.
    }
  }, [bankId, fetchQuestionBankById]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (questionManagementError) {
      const timer = setTimeout(() => setQuestionManagementError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [questionManagementError]);

  const handleBankDetailsUpdated =
    (/* updatedBankFromForm: IQuestionBank */) => {
      // If EditQuestionBankDetailsForm uses the hook's editQuestionBank, this callback might just close a modal.
      // For now, assume the hook has updated currentQuestionBank.
      // setBank(updatedBank); // No longer setting local bank
      // setIsEditingDetails(false); // This local state might be for a modal trigger
      setSuccessMessage("Bank details updated successfully!");
      // Potentially, if a modal was open for EditQuestionBankDetailsForm, close it here.
    };

  const openAddManualQuestionModal = () => {
    setQuestionManagementError(null);
    setIsAddManualModalOpen(true);
  };

  const closeAddManualQuestionModal = () => {
    setIsAddManualModalOpen(false);
  };

  const handleManualQuestionCreatedAndAddToBank = async (
    newlyCreatedQuestion: IQuestion
  ) => {
    if (!currentQuestionBank) {
      setQuestionManagementError("Bank not loaded. Cannot add question.");
      return;
    }
    setIsProcessingAddQuestion(true);
    setQuestionManagementError(null);
    try {
      await addQuestionToCurrentBank(newlyCreatedQuestion._id);
      setSuccessMessage(
        `Question "${newlyCreatedQuestion.questionText.substring(
          0,
          30
        )}..." added to bank.`
      );
      closeAddManualQuestionModal();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to add created question to bank.";
      setQuestionManagementError(message);
    } finally {
      setIsProcessingAddQuestion(false);
    }
  };

  // --- Edit Question Handlers ---
  const openEditQuestionModal = (question: IQuestion) => {
    setQuestionManagementError(null); // Clear previous QM errors
    setQuestionToEdit(question);
    setIsEditQuestionModalOpen(true);
  };

  const closeEditQuestionModal = () => {
    setIsEditQuestionModalOpen(false);
    setQuestionToEdit(null);
  };

  const handleQuestionUpdatedByForm = (updatedQuestion: IQuestion) => {
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
    setSuccessMessage(
      `Question "${updatedQuestion.questionText.substring(0, 30)}..." updated.`
    );
    closeEditQuestionModal();
  };

  // --- Remove Question Handlers ---
  const openRemoveConfirmModal = (question: IQuestion) => {
    setQuestionManagementError(null);
    setQuestionToRemove(question);
    setIsRemoveConfirmModalOpen(true);
  };

  const closeRemoveConfirmModal = () => {
    setIsRemoveConfirmModalOpen(false);
    setQuestionToRemove(null);
  };

  const confirmRemoveQuestionFromBank = async () => {
    if (!currentQuestionBank || !questionToRemove) return;

    setIsProcessingRemove(true);
    setQuestionManagementError(null);
    try {
      await removeQuestionFromCurrentBank(questionToRemove._id);
      setSuccessMessage(
        `Question "${questionToRemove.questionText.substring(
          0,
          30
        )}..." removed from bank.`
      );
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to remove question.";
      setQuestionManagementError(message);
    } finally {
      setIsProcessingRemove(false);
      closeRemoveConfirmModal();
    }
  };

  if (isLoading && !currentQuestionBank) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading question bank..." />
        </main>
      </div>
    );
  }

  const displayError = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  if (displayError && !currentQuestionBank) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-red-600">
              Error Loading Bank
            </h1>
          </div>
          <Card className="p-6">
            <ErrorMessage
              message={displayError}
              onDismiss={() => clearError()}
            />
            <div className="mt-6">
              <Button
                onClick={() => navigate("/quiz-management")}
                variant="secondary"
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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-700">
              Question Bank Not Found
            </h1>
          </div>
          <Card className="p-6">
            <p>The requested question bank could not be found.</p>
            <div className="mt-6">
              <Button
                onClick={() => navigate("/quiz-management")}
                variant="secondary"
              >
                &larr; Back to Quiz & Bank Management
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={() => navigate(`/question-banks/${bankId}`)}
            className="text-sm"
          >
            &larr; Back to Bank Details
          </Button>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Edit Question Bank: {currentQuestionBank.name}
          </h1>
        </div>

        {successMessage && (
          <div className="mb-4">
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </div>
        )}
        {displayError && (
          <div className="mb-4">
            <ErrorMessage
              message={displayError}
              onDismiss={() => clearError()}
            />
          </div>
        )}

        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6 mb-8">
          <EditQuestionBankDetailsForm
            bank={currentQuestionBank}
            onBankUpdated={handleBankDetailsUpdated}
            onCancel={() => setIsEditingDetails(false)}
          />
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Manage Questions
            </h2>
            <Button variant="primary" onClick={openAddManualQuestionModal}>
              Add New Question to Bank
            </Button>
          </div>

          {questionManagementError && (
            <div className="mb-4">
              <ErrorMessage
                message={questionManagementError}
                onDismiss={() => setQuestionManagementError(null)}
              />
            </div>
          )}

          {currentQuestionBank.questions &&
          currentQuestionBank.questions.length > 0 ? (
            <ul className="space-y-3">
              {(currentQuestionBank.questions as IQuestion[]).map((q) => (
                <li
                  key={q._id}
                  className="bg-white shadow-md rounded-lg p-3 flex justify-between items-center hover:shadow-lg transition-shadow duration-200"
                >
                  <span className="text-gray-700 flex-grow mr-4 truncate">
                    {q.questionText}
                  </span>
                  <div className="flex space-x-2 flex-shrink-0">
                    <Button
                      variant="secondary"
                      onClick={() => openEditQuestionModal(q)}
                      className="text-xs px-2 py-1"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openRemoveConfirmModal(q)}
                      className="text-xs px-2 py-1"
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-200 rounded-lg">
              No questions in this bank yet. Add some!
            </p>
          )}
        </Card>

        {isAddManualModalOpen && currentQuestionBank && (
          <Modal
            isOpen={isAddManualModalOpen}
            onClose={closeAddManualQuestionModal}
            title="Add New Question"
          >
            <AddManualQuestionForm
              onQuestionAdded={handleManualQuestionCreatedAndAddToBank}
              onCloseRequest={closeAddManualQuestionModal}
              initialBankCategories={currentQuestionBank.categories}
            />
          </Modal>
        )}

        {isEditQuestionModalOpen && questionToEdit && (
          <Modal
            isOpen={isEditQuestionModalOpen}
            onClose={closeEditQuestionModal}
            title="Edit Question"
          >
            <EditQuestionForm
              questionToEdit={questionToEdit}
              onQuestionUpdated={handleQuestionUpdatedByForm}
              onClose={closeEditQuestionModal}
            />
          </Modal>
        )}

        {isRemoveConfirmModalOpen && questionToRemove && (
          <Modal
            isOpen={isRemoveConfirmModalOpen}
            onClose={closeRemoveConfirmModal}
            title="Confirm Remove Question"
          >
            <ConfirmationModalContent
              title="Confirm Remove Question"
              message={`Are you sure you want to remove the question: "${questionToRemove.questionText}"? This action cannot be undone.`}
              onConfirm={confirmRemoveQuestionFromBank}
              onCancel={closeRemoveConfirmModal}
              confirmText="Remove"
              cancelText="Cancel"
              isLoadingConfirm={isProcessingRemove}
              confirmButtonVariant="destructive"
            />
          </Modal>
        )}
      </main>
    </div>
  );
};

export default QuestionBankEditPage;
