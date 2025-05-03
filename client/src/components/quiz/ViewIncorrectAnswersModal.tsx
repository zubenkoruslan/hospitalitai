import React, { useEffect, useRef } from "react";
// Import the type for the quiz result details
// TODO: Move QuizResultDetails to a shared types file (e.g., types/quizTypes.ts)
import { QuizResultDetails } from "../../hooks/useStaffDetails";

interface ViewIncorrectAnswersModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizResult: QuizResultDetails | null;
}

const ViewIncorrectAnswersModal: React.FC<ViewIncorrectAnswersModalProps> = ({
  isOpen,
  onClose,
  quizResult,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Effect for closing modal on Escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Effect for closing modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !quizResult) return null;

  const incorrectQuestions = quizResult.incorrectQuestions || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-75 transition-opacity duration-300 ease-in-out p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale"
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
            Incorrect Answers: {quizResult.quizTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {incorrectQuestions.length > 0 ? (
          <ul className="list-disc pl-5 space-y-4 text-sm">
            {incorrectQuestions.map((q, index) => (
              <li key={index} className="text-gray-700">
                <p className="font-medium text-gray-800 mb-1">
                  {q.questionText}
                </p>
                <p className="text-red-600">
                  <span className="font-semibold">Your Answer:</span>{" "}
                  {q.userAnswer}
                </p>
                <p className="text-green-600">
                  <span className="font-semibold">Correct Answer:</span>{" "}
                  {q.correctAnswer}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500 italic py-4">
            All answers were correct for this quiz attempt.
          </p>
        )}

        <div className="mt-6 text-right border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
      {/* Basic animation style */}
      <style>{`
        @keyframes fadeInScale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ViewIncorrectAnswersModal;
