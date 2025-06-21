import React, { useEffect } from "react";
import {
  IncorrectQuestionDetail,
  ClientQuizAttemptDetails,
} from "../../types/quizTypes";
import Modal from "../common/Modal";
import Button from "../common/Button";

interface ViewIncorrectAnswersModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptDetails: ClientQuizAttemptDetails | null;
  // Add isLoading and error props if the modal should display these states directly
  // isLoading?: boolean;
  // error?: string | null;
}

const ViewIncorrectAnswersModal: React.FC<ViewIncorrectAnswersModalProps> = ({
  isOpen,
  onClose,
  attemptDetails,
  // isLoading, // Optional: if modal shows its own spinner based on StaffDashboard's _modalLoading
  // error,    // Optional: if modal shows its own error message based on StaffDashboard's _modalError
}) => {
  console.log(
    "[ViewIncorrectAnswersModal] Received attemptDetails:",
    JSON.stringify(attemptDetails, null, 2)
  );

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

  const incorrectQuestions: IncorrectQuestionDetail[] =
    attemptDetails?.incorrectQuestions || [];
  const quizTitle = attemptDetails?.quizTitle || "Quiz Attempt";

  console.log(
    "[ViewIncorrectAnswersModal] Derived incorrectQuestions:",
    JSON.stringify(incorrectQuestions, null, 2)
  );

  const footer = (
    <Button
      variant="primary"
      onClick={onClose}
      className="bg-sky-600 hover:bg-sky-700"
    >
      Close
    </Button>
  );

  // Optional: Handle loading and error states passed from parent if desired
  // if (isLoading) {
  //   return (
  //     <Modal isOpen={isOpen} onClose={onClose} title="Loading Details..." size="lg" footerContent={footer}>
  //       <div className="text-center p-8"><LoadingSpinner message="Fetching attempt details..." /></div>
  //     </Modal>
  //   );
  // }

  // if (error) {
  //   return (
  //     <Modal isOpen={isOpen} onClose={onClose} title="Error" size="lg" footerContent={footer}>
  //       <div className="p-4"><ErrorMessage message={error} /></div>
  //     </Modal>
  //   );
  // }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review: ${quizTitle}`}
      size="lg"
      footerContent={footer}
    >
      <div>
        {incorrectQuestions.length > 0 ? (
          <div className="space-y-4 text-sm">
            {incorrectQuestions.map(
              (q: IncorrectQuestionDetail, index: number) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                >
                  <p className="font-semibold text-slate-800 mb-2">
                    {index + 1}. {q.questionText}
                  </p>
                  <p className="text-red-500">
                    <span className="font-semibold">Your Answer:</span>{" "}
                    {Array.isArray(q.userAnswer)
                      ? q.userAnswer.join(", ")
                      : q.userAnswer || (
                          <span className="italic text-slate-400">
                            Not answered
                          </span>
                        )}
                  </p>
                  <p className="text-emerald-600 mt-1">
                    <span className="font-semibold">Correct Answer:</span>{" "}
                    {Array.isArray(q.correctAnswer)
                      ? q.correctAnswer.join(", ")
                      : q.correctAnswer}
                  </p>
                  {q.explanation && (
                    <div className="mt-2 pt-2 border-t border-slate-300">
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Explanation:</span>{" "}
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-center text-slate-500 italic py-6">
            No incorrect answers to display for this attempt, or all answers
            were correct!
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ViewIncorrectAnswersModal;
