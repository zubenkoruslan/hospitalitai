import React, { useState } from "react";
import { IQuestion } from "../../types/questionBankTypes";
import Button from "../common/Button";
import Card from "../common/Card";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface AiQuestionsPreviewProps {
  questions: IQuestion[];
  onApprove: (selectedQuestionIds: string[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AiQuestionsPreview: React.FC<AiQuestionsPreviewProps> = ({
  questions,
  onApprove,
  onCancel,
  isLoading = false,
}) => {
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    questions.map((q) => q._id) // Pre-select all questions
  );
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );

  // Helper function to format question type
  const formatQuestionType = (type: string) => {
    if (!type) return "N/A";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Toggle question selection
  const handleToggleSelection = (questionId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Select/Deselect all questions
  const handleToggleAll = () => {
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map((q) => q._id));
    }
  };

  // Toggle question details view
  const handleToggleExpanded = (questionId: string) => {
    setExpandedQuestionId((prev) => (prev === questionId ? null : questionId));
  };

  // Handle approve button click
  const handleApprove = async () => {
    if (selectedQuestionIds.length === 0) {
      alert("Please select at least one question to approve.");
      return;
    }
    await onApprove(selectedQuestionIds);
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Questions Generated
        </h3>
        <p className="text-gray-500 mb-6">
          The AI was unable to generate any questions from the selected source.
        </p>
        <Button variant="secondary" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <SparklesIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Review AI Generated Questions
            </h2>
            <p className="text-sm text-gray-600">
              {questions.length} questions generated • Select which ones to add
              to your question bank
            </p>
          </div>
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              onClick={handleToggleAll}
              className="text-sm"
            >
              {selectedQuestionIds.length === questions.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            <span className="text-sm text-gray-600">
              {selectedQuestionIds.length} of {questions.length} selected
            </span>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {questions.map((question) => {
          const isSelected = selectedQuestionIds.includes(question._id);
          const isExpanded = expandedQuestionId === question._id;

          return (
            <Card
              key={question._id}
              className={`relative transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "hover:shadow-md"
              }`}
            >
              <div className="p-4">
                {/* Question header with checkbox */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      checked={isSelected}
                      onChange={() => handleToggleSelection(question._id)}
                      aria-label={`Select question: ${question.questionText}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Question text */}
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {question.questionText}
                    </h3>

                    {/* Question metadata */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>
                        Type: {formatQuestionType(question.questionType)}
                      </span>
                      <span>•</span>
                      <span>Categories: {question.categories.join(", ")}</span>
                      {question.explanation && (
                        <>
                          <span>•</span>
                          <span>Has explanation</span>
                        </>
                      )}
                    </div>

                    {/* Expand/Collapse button */}
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleExpanded(question._id)}
                      className="text-xs px-3 py-1"
                    >
                      <EyeIcon className="h-3 w-3 mr-1" />
                      {isExpanded ? "Hide Details" : "View Details"}
                    </Button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Answer Options:
                        </h4>
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <div
                              key={index}
                              className={`p-2 rounded border ${
                                option.isCorrect
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                {option.isCorrect && (
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                )}
                                <span className="text-sm">{option.text}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {question.explanation && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">
                              Explanation:
                            </h4>
                            <p className="text-sm text-gray-700 p-3 bg-blue-50 rounded border border-blue-200">
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedQuestionIds.length > 0
              ? `${selectedQuestionIds.length} question${
                  selectedQuestionIds.length > 1 ? "s" : ""
                } will be added to your question bank`
              : "No questions selected"}
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={isLoading || selectedQuestionIds.length === 0}
              className="flex items-center space-x-2"
            >
              {isLoading && <LoadingSpinner />}
              <span>
                Add {selectedQuestionIds.length} Question
                {selectedQuestionIds.length > 1 ? "s" : ""} to Bank
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiQuestionsPreview;
