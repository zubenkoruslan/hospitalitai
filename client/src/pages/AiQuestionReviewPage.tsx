import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
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
import {
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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
      <DashboardLayout
        title="Loading Questions"
        breadcrumb={[
          { name: "Quiz Management", href: "/quiz-management" },
          { name: "Question Banks", href: `/question-banks/${bankId}` },
          { name: "AI Review" },
        ]}
      >
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner message="Loading AI questions..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Review AI Questions"
      breadcrumb={[
        { name: "Quiz Management", href: "/quiz-management" },
        { name: "Question Banks", href: `/question-banks/${bankId}` },
        { name: "AI Review" },
      ]}
    >
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Review AI Generated Questions
              </h1>
              <p className="text-slate-600 mt-2">
                Review and approve questions generated by AI for your question
                bank
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* Questions List */}
        {pendingQuestions.length > 0 && (
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              {pendingQuestions.length} Pending Question
              {pendingQuestions.length > 1 ? "s" : ""}
            </h2>
            <div className="space-y-6">
              {pendingQuestions.map((question, index) => (
                <div
                  key={question._id}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                      Question {index + 1}
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="success"
                        onClick={() => handleApproveQuestion(question._id)}
                        className="flex items-center space-x-2"
                      >
                        <CheckIcon className="h-4 w-4" />
                        <span>Approve</span>
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteQuestion(question._id)}
                        className="flex items-center space-x-2"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        <span>Reject</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">
                        Question:
                      </h3>
                      <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">
                        {question.questionText}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium text-slate-900 mb-2">Type:</h3>
                      <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {question.questionType}
                      </span>
                    </div>

                    {question.options && question.options.length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-900 mb-2">
                          Options:
                        </h3>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg border ${
                                option.isCorrect
                                  ? "bg-green-50 border-green-200"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <span className="font-medium text-slate-600">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>{" "}
                              {option.text}
                              {option.isCorrect && (
                                <span className="ml-2 text-green-600 font-medium">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {question.categories && question.categories.length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-900 mb-2">
                          Categories:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {question.categories.map(
                            (category, categoryIndex) => (
                              <span
                                key={categoryIndex}
                                className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                              >
                                {category}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bulk Actions */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button
                  variant="success"
                  onClick={handleApproveSelected}
                  disabled={isBulkProcessing}
                  className="flex-1 sm:flex-none"
                >
                  {isBulkProcessing ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner />
                      <span>Approving...</span>
                    </div>
                  ) : (
                    "Approve Selected"
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/question-banks/${bankId}`)}
                  className="flex-1 sm:flex-none"
                >
                  Back to Question Bank
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {pendingQuestions.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <SparklesIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No pending questions to review
            </h3>
            <p className="text-slate-500 mb-6">
              All AI-generated questions have been reviewed.
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate(`/question-banks/${bankId}`)}
            >
              Back to Question Bank
            </Button>
          </div>
        )}
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
    </DashboardLayout>
  );
};

export default AiQuestionReviewPage;
