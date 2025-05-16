import React from "react";
import Button from "../common/Button"; // Import our styled Button
import { ClientQuizResultForDisplay } from "../../types/quizTypes"; // IMPORTED
// QuizDisplayQuestion and ClientQuizDataForDisplay are used by ClientQuizResultForDisplay

// --- Interfaces ---
// REMOVED local Question, QuizData, and QuizResultDisplay interface definitions

// --- Component Props ---
interface QuizResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ClientQuizResultForDisplay | null; // UPDATED type
}

// --- Component ---
const QuizResultsModal: React.FC<QuizResultsModalProps> = ({
  isOpen,
  onClose,
  results,
}) => {
  if (!isOpen || !results) {
    return null;
  }

  const rawPercentage =
    results.totalQuestions > 0
      ? (results.score / results.totalQuestions) * 100
      : 0;
  const displayPercentage = rawPercentage.toFixed(0);

  // Stop propagation prevents closing modal when clicking inside the modal content
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
    }
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out animate-fade-in-short"
      onClick={onClose} // Close on overlay click
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl mx-auto my-8 max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out animate-slide-up-fast"
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-results-modal-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
          <h2
            id="quiz-results-modal-title"
            className="text-xl font-semibold text-slate-700"
          >
            Quiz Results: {results.quizData.title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 rounded-full p-1.5 transition-colors duration-150 ease-in-out"
            aria-label="Close modal"
          >
            {/* SVG Close Icon */}
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="overflow-y-auto flex-1 pr-2">
          <p
            className={`text-2xl font-semibold mb-1 text-center ${
              rawPercentage >= 70 ? "text-green-600" : "text-red-600" // Softer green/red for score
            }`}
          >
            Score: {results.score} / {results.totalQuestions}
          </p>
          <p
            className={`text-lg font-medium mb-6 text-center ${
              rawPercentage >= 70 ? "text-green-500" : "text-red-500" // Softer green/red for percentage
            }`}
          >
            ({displayPercentage}%)
          </p>

          <div className="space-y-4">
            {results.quizData.questions.map((q, index) => {
              const userAnswerIndex = results.userAnswers[index];
              const correctAnswerIndex = q.correctAnswer; // Use q.correctAnswer directly from QuizDisplayQuestion
              const isCorrect = userAnswerIndex === correctAnswerIndex;

              return (
                <div
                  key={`result-${index}`}
                  className={`p-4 border rounded-lg shadow-sm ${
                    isCorrect
                      ? "bg-green-50 border-green-300"
                      : "bg-red-50 border-red-300"
                  }`}
                >
                  <p className="font-semibold text-slate-800 mb-2">
                    {index + 1}. {q.text}
                  </p>
                  <ul className="space-y-1 list-none pl-1">
                    {q.choices.map((choice, choiceIndex) => {
                      const isChoiceCorrect =
                        choiceIndex === correctAnswerIndex;
                      const isChoiceSelected = choiceIndex === userAnswerIndex;

                      let choiceStyle = "text-slate-700";
                      let indicator = "";
                      let indicatorStyle = "text-xs ml-2";

                      if (isChoiceCorrect) {
                        choiceStyle = "font-semibold text-green-700";
                        indicator = "(Correct Answer)";
                        indicatorStyle += " text-green-600";
                      }
                      if (isChoiceSelected && !isChoiceCorrect) {
                        choiceStyle = "font-semibold text-red-700";
                        indicator = "(Your Answer)";
                        indicatorStyle += " text-red-600";
                      }
                      if (isChoiceSelected && isChoiceCorrect) {
                        // Override indicator for selected correct answer
                        indicator = "(Your Answer - Correct)";
                        indicatorStyle += " text-green-600";
                      }

                      return (
                        <li
                          key={choiceIndex}
                          className={`flex items-center py-1 ${choiceStyle}`}
                        >
                          <span
                            className={`mr-2 ${
                              isChoiceSelected ? "font-bold" : "text-slate-500" // Subtle dash for non-selected
                            }`}
                          >
                            {isChoiceSelected ? "●" : "○"}{" "}
                            {/* Better indicators */}
                          </span>
                          <span>{choice}</span>
                          {indicator && (
                            <span className={indicatorStyle}>{indicator}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-5 mt-5 border-t border-slate-200 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close Results
          </Button>
        </div>
      </div>
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */}
    </div>
  );
};

export default QuizResultsModal;
