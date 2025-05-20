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
  isProcessing: boolean;
}> = ({ question, onEdit, onApprove, isProcessing }) => {
  const formatQuestionType = (type: string) => {
    if (!type) return "N/A";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card className="bg-white shadow-lg rounded-xl p-4 mb-4 hover:shadow-xl transition-shadow duration-300">
      <p className="font-semibold text-gray-800 mb-2">
        {question.questionText}
      </p>
      <div className="text-sm text-gray-700 mb-2">
        <strong>Type:</strong> {formatQuestionType(question.questionType)} |{" "}
        <strong>Difficulty:</strong> {question.difficulty || "N/A"} |{" "}
        <strong>Category:</strong> {question.categories?.join(", ") || "N/A"}
      </div>
      {question.options && question.options.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-700">Options:</p>
          <ul className="list-disc list-inside pl-4 text-sm text-gray-600">
            {question.options.map((opt, index) => (
              <li
                key={index}
                className={opt.isCorrect ? "font-semibold text-green-600" : ""}
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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<IQuestion | null>(null);

  const [isConfirmApproveAllModalOpen, setIsConfirmApproveAllModalOpen] =
    useState(false);

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

  const handleApproveAllVisible = async () => {
    if (!bankId) {
      setError("Target bank ID is missing.");
      return;
    }
    if (pendingQuestions.length === 0) {
      alert("No questions to approve.");
      return;
    }

    setIsConfirmApproveAllModalOpen(false); // Close confirmation modal first

    const questionIdsToApprove = pendingQuestions.map((q) => q._id);
    // Set all to processing
    const newProcessingStates: Record<string, boolean> = {};
    questionIdsToApprove.forEach((id) => (newProcessingStates[id] = true));
    setProcessingStates(newProcessingStates);

    try {
      await processReviewedAiQuestions(bankId, {
        acceptedQuestions: questionIdsToApprove.map((id) => ({ _id: id })),
        updatedQuestions: [],
        deletedQuestionIds: [],
      });
      setPendingQuestions([]); // Clear list as all are approved
      // Optionally, show a success message
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve all questions."
      );
      console.error("Error approving all questions:", err);
      // Reset processing states on error
      const resetProcessingStates: Record<string, boolean> = {};
      questionIdsToApprove.forEach((id) => (resetProcessingStates[id] = false));
      setProcessingStates(resetProcessingStates);
    }
    // No finally needed here for processing states if list is cleared on success
  };

  const openApproveAllConfirmation = () => {
    if (pendingQuestions.length > 0) {
      setIsConfirmApproveAllModalOpen(true);
    } else {
      alert("No questions to approve.");
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
          <div className="mb-6 flex justify-end">
            <Button
              variant="primary"
              onClick={openApproveAllConfirmation}
              disabled={Object.values(processingStates).some((p) => p)} // Disable if any question is processing
            >
              Approve All Visible ({pendingQuestions.length})
            </Button>
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

        {isConfirmApproveAllModalOpen && (
          <Modal
            isOpen={isConfirmApproveAllModalOpen}
            onClose={() => setIsConfirmApproveAllModalOpen(false)}
            title="Confirm Approve All"
            size="sm"
          >
            <ConfirmationModalContent
              message={`Are you sure you want to approve all ${pendingQuestions.length} visible questions and add them to the bank?`}
              onConfirm={handleApproveAllVisible}
              onCancel={() => setIsConfirmApproveAllModalOpen(false)}
              confirmText="Approve All"
            />
          </Modal>
        )}
      </main>
    </div>
  );
};

export default AiQuestionReviewPage;
