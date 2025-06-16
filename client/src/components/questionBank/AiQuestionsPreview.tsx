import React, { useState } from "react";
import { IQuestion } from "../../types/questionBankTypes";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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

  // Get question type color scheme
  const getQuestionTypeColor = (type: string) => {
    const colors = {
      "multiple-choice-single":
        "from-blue-50 to-blue-100 border-blue-200 text-blue-800",
      "multiple-choice-multiple":
        "from-purple-50 to-purple-100 border-purple-200 text-purple-800",
      "true-false":
        "from-green-50 to-green-100 border-green-200 text-green-800",
    };
    return (
      colors[type as keyof typeof colors] ||
      "from-slate-50 to-slate-100 border-slate-200 text-slate-800"
    );
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
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
          <XCircleIcon className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-light text-slate-900 mb-2 tracking-tight">
          No Questions Generated
        </h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto font-light leading-relaxed text-sm">
          The AI was unable to generate any questions from the selected source.
          Try adjusting your parameters or source content.
        </p>
        <Button
          variant="secondary"
          onClick={onCancel}
          className="px-6 py-2 rounded-full font-medium text-sm"
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="max-h-[85vh] flex flex-col bg-gradient-to-br from-slate-50 to-white">
      {/* Header - Apple Style */}
      <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 p-6 rounded-t-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-slate-900 mb-1 tracking-tight">
              Review AI Generated Questions
            </h2>
            <p className="text-slate-600 font-light text-sm">
              {questions.length} questions generated • Select which ones to add
              to your question bank
            </p>
          </div>
        </div>

        {/* Selection controls - Modern Design */}
        <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleToggleAll}
              className="px-4 py-1.5 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {selectedQuestionIds.length === questions.length
                ? "Deselect All"
                : "Select All"}
            </button>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 min-w-[40px] justify-center">
                {selectedQuestionIds.length}
              </span>
              <span className="text-slate-600 font-light text-sm">
                of {questions.length} selected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions List - Enhanced Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {questions.map((question, index) => {
          const isSelected = selectedQuestionIds.includes(question._id);
          const isExpanded = expandedQuestionId === question._id;
          const questionTypeColor = getQuestionTypeColor(question.questionType);

          return (
            <div
              key={question._id}
              className={`relative transition-all duration-300 ease-out transform ${
                isSelected
                  ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg scale-[1.01]"
                  : "bg-white hover:shadow-lg hover:scale-[1.005] shadow-sm"
              } rounded-xl border border-slate-200 overflow-hidden`}
            >
              {/* Question Card */}
              <div className="p-4">
                {/* Question header with enhanced checkbox */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-blue-600 border-2 border-slate-300 rounded-md focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all duration-200"
                        checked={isSelected}
                        onChange={() => handleToggleSelection(question._id)}
                        aria-label={`Select question: ${question.questionText}`}
                      />
                      {isSelected && (
                        <CheckCircleIcon className="absolute -top-0.5 -right-0.5 h-3 w-3 text-blue-600 bg-white rounded-full" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Question number and type badge */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        Q{index + 1}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${questionTypeColor} border`}
                      >
                        {formatQuestionType(question.questionType)}
                      </span>
                      {question.explanation && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 text-amber-800">
                          Has explanation
                        </span>
                      )}
                    </div>

                    {/* Question text - Enhanced typography */}
                    <h3 className="text-lg font-medium text-slate-900 mb-3 leading-relaxed">
                      {question.questionText}
                    </h3>

                    {/* Categories display */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-xs text-slate-500 font-medium">
                        Categories:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {question.categories.map((category, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Expand/Collapse button - Apple style */}
                    <button
                      onClick={() => handleToggleExpanded(question._id)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-full text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <EyeIcon className="h-3 w-3" />
                      <span>
                        {isExpanded ? "Hide Details" : "View Details"}
                      </span>
                      {isExpanded ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </button>

                    {/* Expanded details - Enhanced design */}
                    {isExpanded && (
                      <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-medium text-slate-900 mb-3">
                          Answer Options
                        </h4>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg border transition-all duration-200 ${
                                option.isCorrect
                                  ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-sm"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                  {String.fromCharCode(65 + optionIndex)}
                                </span>
                                <span
                                  className={`text-sm font-medium ${
                                    option.isCorrect
                                      ? "text-green-800"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {option.text}
                                </span>
                                {option.isCorrect && (
                                  <div className="ml-auto">
                                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {question.explanation && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-slate-900 mb-2">
                              Explanation
                            </h4>
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-800 leading-relaxed font-medium">
                                {question.explanation}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions - Apple Style */}
      <div className="bg-gradient-to-r from-white to-slate-50 border-t border-slate-200 p-4 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div className="text-slate-600 font-light text-sm">
            {selectedQuestionIds.length > 0 ? (
              <span className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedQuestionIds.length}
                </span>
                <span>
                  question{selectedQuestionIds.length > 1 ? "s" : ""} will be
                  added to your question bank
                </span>
              </span>
            ) : (
              "No questions selected"
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 rounded-full font-medium text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={isLoading || selectedQuestionIds.length === 0}
              className="px-6 py-2 rounded-full font-medium text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center space-x-2"
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
