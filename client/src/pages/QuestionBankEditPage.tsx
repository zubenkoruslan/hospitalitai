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
import {
  getQuestionBankById,
  updateQuestionBank,
  addQuestionToBank,
  removeQuestionFromBank,
} from "../services/api";
import EditQuestionBankDetailsForm from "../components/questionBank/EditQuestionBankDetailsForm";
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
// import EditQuestionBankInlineForm from '../components/questionBank/EditQuestionBankInlineForm'; // Future component for editing name/desc
// import QuestionListManager from '../components/questionBank/QuestionListManager'; // Future component for managing questions

const QuestionBankEditPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const [bank, setBank] = useState<IQuestionBank | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchBankDetails = useCallback(async () => {
    if (!bankId) {
      setError("No bank ID provided.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getQuestionBankById(bankId);
      setBank(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch question bank details."
      );
      setBank(null);
    } finally {
      setIsLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    fetchBankDetails();
  }, [fetchBankDetails]);

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

  const handleBankDetailsUpdated = (updatedBank: IQuestionBank) => {
    setBank(updatedBank);
    setIsEditingDetails(false);
    setSuccessMessage("Bank details updated successfully!");
  };

  const handleQuestionsUpdated = () => {
    fetchBankDetails();
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
    if (!bank) {
      setQuestionManagementError("Bank not loaded. Cannot add question.");
      return;
    }
    setIsProcessingAddQuestion(true);
    setQuestionManagementError(null);
    try {
      const updatedBank = await addQuestionToBank(
        bank._id,
        newlyCreatedQuestion._id
      );
      setBank(updatedBank);
      setSuccessMessage(
        `Question "${newlyCreatedQuestion.questionText.substring(
          0,
          30
        )}..." added to bank.`
      );
      closeAddManualQuestionModal();
    } catch (err: any) {
      setQuestionManagementError(
        err.response?.data?.message || "Failed to add created question to bank."
      );
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
    if (bank) {
      const updatedQuestions = (bank.questions as IQuestion[]).map((q) =>
        q._id === updatedQuestion._id ? updatedQuestion : q
      );
      setBank({ ...bank, questions: updatedQuestions });
      setSuccessMessage(
        `Question "${updatedQuestion.questionText.substring(
          0,
          30
        )}..." updated.`
      );
    }
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
    if (!bank || !questionToRemove) return;

    setIsProcessingRemove(true);
    setQuestionManagementError(null);
    try {
      const updatedBank = await removeQuestionFromBank(
        bank._id,
        questionToRemove._id
      );
      setBank(updatedBank); // Update local bank state with the bank returned from API
      setSuccessMessage(
        `Question "${questionToRemove.questionText.substring(
          0,
          30
        )}..." removed from bank.`
      );
    } catch (err: any) {
      setQuestionManagementError(
        err.response?.data?.message || "Failed to remove question."
      );
    } finally {
      setIsProcessingRemove(false);
      closeRemoveConfirmModal();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading question bank..." />
        </main>
      </div>
    );
  }

  if (error && !bank) {
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
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
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

  if (!bank) {
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
            Edit Question Bank: {bank.name}
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
        {error && !questionManagementError && (
          <div className="mb-4">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6 mb-8">
          <EditQuestionBankDetailsForm
            bank={bank}
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

          {bank.questions && bank.questions.length > 0 ? (
            <ul className="space-y-3">
              {(bank.questions as IQuestion[]).map((q) => (
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

        {isAddManualModalOpen && (
          <Modal
            isOpen={isAddManualModalOpen}
            onClose={closeAddManualQuestionModal}
            title="Add New Question to Bank"
          >
            <AddManualQuestionForm
              onQuestionAdded={handleManualQuestionCreatedAndAddToBank}
              onClose={closeAddManualQuestionModal}
              initialBankCategories={bank.categories}
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
