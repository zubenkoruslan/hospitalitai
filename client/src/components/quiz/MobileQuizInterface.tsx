import React from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";
import Card from "../common/Card";
import { ClientQuestionForAttempt } from "../../types/questionTypes";

interface MobileQuizInterfaceProps {
  question: ClientQuestionForAttempt;
  questionIndex: number;
  totalQuestions: number;
  userAnswer: string | string[] | undefined;
  onAnswerSelect: (
    questionId: string,
    selectedValue: string,
    questionType: string
  ) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLastQuestion: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isSubmitting: boolean;
}

const MobileQuizInterface: React.FC<MobileQuizInterfaceProps> = ({
  question,
  questionIndex,
  totalQuestions,
  userAnswer,
  onAnswerSelect,
  onNext,
  onPrevious,
  onSubmit,
  onCancel,
  isLastQuestion,
  canGoNext,
  canGoPrevious,
  isSubmitting,
}) => {
  const isSelected = (optionId: string): boolean => {
    if (!userAnswer) return false;

    if (Array.isArray(userAnswer)) {
      return userAnswer.includes(optionId);
    }
    return userAnswer === optionId;
  };

  const renderQuestionOptions = () => {
    switch (question.questionType) {
      case "true-false":
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option._id}
                onClick={() =>
                  onAnswerSelect(
                    question._id,
                    option._id,
                    question.questionType
                  )
                }
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all duration-200 touch-target
                  ${
                    isSelected(option._id)
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{option.text}</span>
                  <div
                    className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      isSelected(option._id)
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300"
                    }
                  `}
                  >
                    {isSelected(option._id) && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        );

      case "multiple-choice-single":
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option._id}
                onClick={() =>
                  onAnswerSelect(
                    question._id,
                    option._id,
                    question.questionType
                  )
                }
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all duration-200 touch-target
                  ${
                    isSelected(option._id)
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{option.text}</span>
                  <div
                    className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      isSelected(option._id)
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300"
                    }
                  `}
                  >
                    {isSelected(option._id) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        );

      case "multiple-choice-multiple":
        return (
          <div className="space-y-3">
            <div className="text-sm text-slate-600 mb-3 px-1">
              💡 Select all that apply
            </div>
            {question.options.map((option) => (
              <button
                key={option._id}
                onClick={() =>
                  onAnswerSelect(
                    question._id,
                    option._id,
                    question.questionType
                  )
                }
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all duration-200 touch-target
                  ${
                    isSelected(option._id)
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{option.text}</span>
                  <div
                    className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center
                    ${
                      isSelected(option._id)
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300"
                    }
                  `}
                  >
                    {isSelected(option._id) && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors duration-200"
            disabled={isSubmitting}
          >
            <XMarkIcon className="w-6 h-6 text-slate-600" />
          </button>
          <div className="text-center">
            <div className="text-sm font-medium text-slate-600">
              Question {questionIndex + 1} of {totalQuestions}
            </div>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-6 border-0 shadow-lg">
            <div className="p-6 lg:p-8">
              <h2 className="text-xl lg:text-2xl font-semibold text-slate-800 mb-6 leading-relaxed">
                {question.questionText}
              </h2>

              {renderQuestionOptions()}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-slate-200 p-4 lg:p-6 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between space-x-4">
            {/* Previous Button */}
            <Button
              onClick={onPrevious}
              disabled={!canGoPrevious || isSubmitting}
              variant="ghost"
              className="flex-1 max-w-32 h-12 text-slate-600"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Previous
            </Button>

            {/* Next/Submit Button */}
            {isLastQuestion ? (
              <Button
                onClick={onSubmit}
                disabled={!userAnswer || isSubmitting}
                className="flex-1 max-w-40 h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                isLoading={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button
                onClick={onNext}
                disabled={!canGoNext || !userAnswer || isSubmitting}
                className="flex-1 max-w-32 h-12"
              >
                Next
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>

          {/* Answer hint */}
          {!userAnswer && (
            <div className="text-center mt-3">
              <p className="text-sm text-slate-500">
                Please select an answer to continue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileQuizInterface;
