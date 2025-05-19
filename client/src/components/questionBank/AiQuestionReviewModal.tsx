import React, { useState, useEffect } from "react";
import {
  IQuestion,
  IOption,
  IQuestionBank,
} from "../../types/questionBankTypes";
import Button from "../common/Button";
import Modal from "../common/Modal"; // Assuming a generic Modal component exists
import LoadingSpinner from "../common/LoadingSpinner"; // Added import for LoadingSpinner
// import { updateQuestion, deleteQuestion } from "../../services/api"; // For individual question edits/deletes - not used in batch processing
import { processReviewedAiQuestions } from "../../services/api"; // Import the new service function
// Placeholder for the service that calls POST /api/question-banks/:bankId/process-reviewed-questions
// import { processReviewedQuestions } from '../../services/api';

interface AiQuestionReviewModalProps {
  isOpen: boolean;
  generatedQuestions: IQuestion[]; // These should have status: 'pending_review'
  targetBankId: string;
  onClose: () => void;
  onReviewComplete: (bankId: string) => void; // Callback after successful processing
}

const AiQuestionReviewModal: React.FC<AiQuestionReviewModalProps> = ({
  isOpen,
  generatedQuestions,
  targetBankId,
  onClose,
  onReviewComplete,
}) => {
  const [editableQuestions, setEditableQuestions] = useState<IQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Deep copy questions to make them editable without affecting original prop
    setEditableQuestions(JSON.parse(JSON.stringify(generatedQuestions)));
  }, [generatedQuestions, isOpen]); // Reset when questions change or modal reopens

  if (!isOpen) return null;

  const handleQuestionChange = (
    index: number,
    field: keyof IQuestion,
    value: any
  ) => {
    setEditableQuestions((prev) => {
      const updated = [...prev];
      // @ts-ignore TODO: type this better if possible for field access
      updated[index][field] = value;
      return updated;
    });
  };

  const handleOptionChange = (
    qIndex: number,
    oIndex: number,
    field: keyof IOption,
    value: any
  ) => {
    setEditableQuestions((prev) => {
      const updated = [...prev];
      // @ts-ignore TODO: type this better
      updated[qIndex].options[oIndex][field] = value;
      // If changing 'isCorrect' for single-choice, ensure only one is correct
      if (
        field === "isCorrect" &&
        value === true &&
        updated[qIndex].questionType === "multiple-choice-single"
      ) {
        updated[qIndex].options.forEach((opt, i) => {
          if (i !== oIndex) opt.isCorrect = false;
        });
      }
      return updated;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setEditableQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessBatch = async () => {
    setIsLoading(true);
    setError(null);

    // Construct the payload for the API
    const acceptedAndUpdatedQuestions = editableQuestions.map((q) => ({
      ...q,
      status: "active", // Explicitly set status to active for all questions being kept
    }));

    const originalIds = new Set(generatedQuestions.map((q) => q._id));
    const editableIds = new Set(editableQuestions.map((q) => q._id));
    const deletedQuestionIds = [...originalIds].filter(
      (id) => !editableIds.has(id)
    );

    try {
      console.log("Processing reviewed questions with payload:", {
        acceptedQuestions: acceptedAndUpdatedQuestions,
        updatedQuestions: [], // Keeping this empty as acceptedQuestions handles updates to pending ones
        deletedQuestionIds: deletedQuestionIds,
      });

      await processReviewedAiQuestions(targetBankId, {
        acceptedQuestions: acceptedAndUpdatedQuestions,
        updatedQuestions: [], // Backend logic for acceptedQuestions can handle updates from pending state
        deletedQuestionIds: deletedQuestionIds,
      });

      // alert("Questions processed successfully!"); // Replace with a more robust notification system if available
      onReviewComplete(targetBankId);
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error("Error processing reviewed questions:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to process questions."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review AI-Generated Questions"
    >
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <p className="text-red-500 bg-red-100 p-2 rounded mb-3">
            Error: {error}
          </p>
        )}
        {editableQuestions.length === 0 && <p>No questions to review.</p>}
        {editableQuestions.map((q, qIndex) => (
          <div
            key={q._id || `new-${qIndex}`}
            className="mb-6 p-4 border rounded-lg shadow-sm bg-white"
          >
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Question Text:
              </label>
              <textarea
                value={q.questionText}
                onChange={(e) =>
                  handleQuestionChange(qIndex, "questionText", e.target.value)
                }
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Type: {q.questionType}
              </label>
              {/* TODO: Add selector to change type if needed, and adjust options validation */}
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options:
              </label>
              {q.options.map((opt, oIndex) => (
                <div
                  key={opt._id || `opt-${qIndex}-${oIndex}`}
                  className="flex items-center mb-2 pl-2"
                >
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={(e) =>
                      handleOptionChange(
                        qIndex,
                        oIndex,
                        "isCorrect",
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) =>
                      handleOptionChange(qIndex, oIndex, "text", e.target.value)
                    }
                    className="flex-grow px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Difficulty:
              </label>
              <select
                value={q.difficulty || "medium"}
                onChange={(e) =>
                  handleQuestionChange(qIndex, "difficulty", e.target.value)
                }
                className="mt-1 block w-full max-w-xs pl-2 pr-8 py-1.5 text-xs border-gray-300 rounded-md"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="text-right">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDeleteQuestion(qIndex)}
              >
                Delete Question
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t flex justify-end space-x-2">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel / Save for Later
        </Button>
        <Button
          variant="primary"
          onClick={handleProcessBatch}
          disabled={isLoading || editableQuestions.length === 0}
        >
          {isLoading ? <LoadingSpinner /> : "Accept & Add to Bank"}
        </Button>
      </div>
    </Modal>
  );
};

export default AiQuestionReviewModal;
