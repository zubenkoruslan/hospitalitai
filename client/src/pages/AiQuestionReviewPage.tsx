import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { IQuestion } from "../types/questionBankTypes";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import Card from "../components/common/Card";
import {
  getPendingReviewQuestions,
  processReviewedAiQuestions,
} from "../services/api";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";
import Modal from "../components/common/Modal";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";

// Simple component to display a single question - can be expanded
const ReviewQuestionItem: React.FC<{
  question: IQuestion;
  onEdit: (question: IQuestion) => void;
  onApprove: (questionId: string) => void;
  onDelete: (questionId: string) => void;
  isSelected: boolean;
  onToggleSelect: (questionId: string) => void;
  isProcessing: boolean;
}> = ({
  question,
  onEdit,
  onApprove,
  onDelete,
  isSelected,
  onToggleSelect,
  isProcessing,
}) => {
  const formatQuestionType = (type: string) => {
    if (!type) return "N/A";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card className="bg-white shadow-lg rounded-xl p-4 mb-4 hover:shadow-xl transition-shadow duration-300 flex items-start space-x-3">
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
        checked={isSelected}
        onChange={() => onToggleSelect(question._id)}
        disabled={isProcessing}
        aria-label={`Select question: ${question.questionText}`}
      />
      <div className="flex-grow">
        <p className="font-semibold text-gray-800 mb-2">
          {question.questionText}
        </p>
        <div className="text-sm text-gray-700 mb-2">
          <strong>Type:</strong> {formatQuestionType(question.questionType)} |{" "}
          <strong>Category:</strong> {question.categories?.join(", ") || "N/A"}
        </div>
        {question.options && question.options.length > 0 && (
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-700">Options:</p>
            <ul className="list-disc list-inside pl-4 text-sm text-gray-600">
              {question.options.map((opt, index) => (
                <li
                  key={index}
                  className={
                    opt.isCorrect ? "font-semibold text-green-600" : ""
                  }
                >
                  {opt.text} {opt.isCorrect ? "(Correct)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {question.explanation && (
          <p className="text-sm text-gray-600 italic mb-3">
            <strong>Explanation:</strong> {question.explanation}
          </p>
        )}
      </div>
      <div className="mt-3 flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={() => onEdit(question)}
          disabled={isProcessing}
          className="text-xs px-3 py-1"
        >
          Edit
        </Button>
        <Button
          variant="primary"
          onClick={() => onApprove(question._id)}
          disabled={isProcessing}
          className="text-xs px-3 py-1"
        >
          Approve
        </Button>
        <Button
          variant="secondary"
          onClick={() => onDelete(question._id)}
          disabled={isProcessing}
          className="text-xs px-3 py-1 text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-500"
        >
          Delete
        </Button>
      </div>
    </Card>
  );
};

const AiQuestionReviewPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();

  const [pendingQuestions, setPendingQuestions] = useState<IQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStates, setProcessingStates] = useState<
    Record<string, boolean>
  >({}); // For individual question processing
  const [isBulkProcessing, setIsBulkProcessing] = useState(false); // For bulk actions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<IQuestion | null>(null);

  const [isConfirmDeleteOneModalOpen, setIsConfirmDeleteOneModalOpen] =
    useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<IQuestion | null>(
    null
  );
  const [
    isConfirmDeleteSelectedModalOpen,
    setIsConfirmDeleteSelectedModalOpen,
  ] = useState(false);

  const fetchPending = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const questions = await getPendingReviewQuestions();
      setPendingQuestions(questions || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch pending questions."
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleEditQuestion = (question: IQuestion) => {
    setQuestionToEdit(question);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setQuestionToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleQuestionUpdated = async (updatedQuestion: IQuestion) => {
    // API call to update the question will be PUT /api/questions/:id
    // For now, just refresh the list of pending questions
    // This ensures the edit is reflected if the user doesn't approve immediately.
    // The question status remains 'pending_review'.
    // In a real scenario, you'd call an update service here.
    // For example: await updateQuestionService(updatedQuestion._id, updatedQuestion);
    setPendingQuestions((prev) =>
      prev.map((q) => (q._id === updatedQuestion._id ? updatedQuestion : q))
    );
    handleCloseEditModal();
    // Optionally, you could call fetchPending() again if the update is critical to re-fetch.
  };

  const handleToggleSelectQuestion = (questionId: string) => {
    setSelectedQuestionIds((prevSelected) =>
      prevSelected.includes(questionId)
        ? prevSelected.filter((id) => id !== questionId)
        : [...prevSelected, questionId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedQuestionIds.length === pendingQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(pendingQuestions.map((q) => q._id));
    }
  };

  const handleApproveQuestion = async (questionId: string) => {
    if (!bankId) {
      setError("Target bank ID is missing.");
      return;
    }
    setProcessingStates((prev) => ({ ...prev, [questionId]: true }));
    try {
      await processReviewedAiQuestions(bankId, {
        acceptedQuestions: [{ _id: questionId }],
        updatedQuestions: [],
        deletedQuestionIds: [],
      });
      setPendingQuestions((prev) => prev.filter((q) => q._id !== questionId));
      // Optionally, show a success message
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve question."
      );
      console.error("Error approving question:", err);
    } finally {
      setProcessingStates((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleApproveSelected = async () => {
    if (!bankId) {
      setError("Target bank ID is missing.");
      return;
    }
    if (selectedQuestionIds.length === 0) {
      alert("No questions selected to approve.");
      return;
    }

    setIsBulkProcessing(true);
    try {
      await processReviewedAiQuestions(bankId, {
        acceptedQuestions: selectedQuestionIds.map((id) => ({ _id: id })),
        updatedQuestions: [],
        deletedQuestionIds: [],
      });
      setPendingQuestions((prev) =>
        prev.filter((q) => !selectedQuestionIds.includes(q._id))
      );
      setSelectedQuestionIds([]);
      // Optionally, show a success message
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve selected questions."
      );
      console.error("Error approving selected questions:", err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    const question = pendingQuestions.find((q) => q._id === questionId);
    if (question) {
      setQuestionToDelete(question);
      setIsConfirmDeleteOneModalOpen(true);
    }
  };

  const confirmDeleteOneQuestion = async () => {
    if (!questionToDelete || !bankId) {
      setError("Question or Bank ID is missing for deletion.");
      setIsConfirmDeleteOneModalOpen(false);
      return;
    }

    setProcessingStates((prev) => ({
      ...prev,
      [questionToDelete._id]: true,
    }));
    setIsConfirmDeleteOneModalOpen(false);

    try {
      await processReviewedAiQuestions(bankId, {
        acceptedQuestions: [],
        updatedQuestions: [],
        deletedQuestionIds: [questionToDelete._id],
      });
      setPendingQuestions((prev) =>
        prev.filter((q) => q._id !== questionToDelete._id)
      );
      setSelectedQuestionIds((prev) =>
        prev.filter((id) => id !== questionToDelete._id)
      );
      // Optionally, show a success message
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete question."
      );
      console.error("Error deleting question:", err);
    } finally {
      setProcessingStates((prev) => ({
        ...prev,
        [questionToDelete._id]: false,
      }));
      setQuestionToDelete(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedQuestionIds.length === 0) {
      alert("No questions selected to delete.");
      return;
    }
    setIsConfirmDeleteSelectedModalOpen(true);
  };

  const confirmDeleteSelectedQuestions = async () => {
    if (!bankId) {
      setError("Target bank ID is missing.");
      return;
    }
    if (selectedQuestionIds.length === 0) {
      // Should not happen if button is properly disabled, but good practice
      setIsConfirmDeleteSelectedModalOpen(false);
      return;
    }

    setIsBulkProcessing(true);
    setIsConfirmDeleteSelectedModalOpen(false);

    try {
      await processReviewedAiQuestions(bankId, {
        acceptedQuestions: [],
        updatedQuestions: [],
        deletedQuestionIds: selectedQuestionIds,
      });
      setPendingQuestions((prev) =>
        prev.filter((q) => !selectedQuestionIds.includes(q._id))
      );
      setSelectedQuestionIds([]);
      // Optionally, show a success message
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete selected questions."
      );
      console.error("Error deleting selected questions:", err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading AI questions for review..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="secondary"
            onClick={() => navigate(`/question-banks/${bankId}`)}
          >
            &larr; Back to Question Bank
          </Button>
          <h1 className="text-3xl font-bold text-gray-800 text-center flex-grow">
            Review Pending AI Questions
          </h1>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {pendingQuestions.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  id="selectAllCheckbox"
                  type="checkbox"
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  checked={
                    pendingQuestions.length > 0 &&
                    selectedQuestionIds.length === pendingQuestions.length
                  }
                  onChange={handleToggleSelectAll}
                  disabled={
                    isBulkProcessing ||
                    Object.values(processingStates).some((p) => p)
                  }
                />
                <label
                  htmlFor="selectAllCheckbox"
                  className="text-sm font-medium text-gray-700"
                >
                  Select All ({selectedQuestionIds.length} selected)
                </label>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  onClick={handleApproveSelected}
                  disabled={
                    selectedQuestionIds.length === 0 ||
                    isBulkProcessing ||
                    Object.values(processingStates).some((p) => p)
                  }
                >
                  Approve Selected
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={
                    selectedQuestionIds.length === 0 ||
                    isBulkProcessing ||
                    Object.values(processingStates).some((p) => p)
                  }
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {pendingQuestions.length === 0 && !isLoading && (
          <Card className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              All Clear!
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no AI-generated questions currently pending review.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {pendingQuestions.map((q) => (
            <ReviewQuestionItem
              key={q._id}
              question={q}
              onEdit={handleEditQuestion}
              onApprove={handleApproveQuestion}
              onDelete={handleDeleteQuestion}
              isSelected={selectedQuestionIds.includes(q._id)}
              onToggleSelect={handleToggleSelectQuestion}
              isProcessing={processingStates[q._id] || false}
            />
          ))}
        </div>

        {isEditModalOpen && questionToEdit && (
          <Modal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            title="Edit AI Question"
          >
            <EditQuestionForm
              questionToEdit={questionToEdit}
              onQuestionUpdated={handleQuestionUpdated}
              onClose={handleCloseEditModal}
            />
          </Modal>
        )}

        {isConfirmDeleteOneModalOpen && questionToDelete && (
          <Modal
            isOpen={isConfirmDeleteOneModalOpen}
            onClose={() => {
              setIsConfirmDeleteOneModalOpen(false);
              setQuestionToDelete(null);
            }}
            title="Confirm Delete Question"
            size="sm"
          >
            <ConfirmationModalContent
              message={`Are you sure you want to delete this question: "${questionToDelete.questionText}"? This action cannot be undone.`}
              onConfirm={confirmDeleteOneQuestion}
              onCancel={() => {
                setIsConfirmDeleteOneModalOpen(false);
                setQuestionToDelete(null);
              }}
              confirmText="Delete"
              confirmButtonVariant="destructive"
            />
          </Modal>
        )}

        {isConfirmDeleteSelectedModalOpen && (
          <Modal
            isOpen={isConfirmDeleteSelectedModalOpen}
            onClose={() => setIsConfirmDeleteSelectedModalOpen(false)}
            title="Confirm Delete Selected Questions"
            size="sm"
          >
            <ConfirmationModalContent
              message={`Are you sure you want to delete ${selectedQuestionIds.length} selected question(s)? This action cannot be undone.`}
              onConfirm={confirmDeleteSelectedQuestions}
              onCancel={() => setIsConfirmDeleteSelectedModalOpen(false)}
              confirmText={`Delete ${selectedQuestionIds.length} Question(s)`}
              confirmButtonVariant="destructive"
            />
          </Modal>
        )}
      </main>
    </div>
  );
};

export default AiQuestionReviewPage;
