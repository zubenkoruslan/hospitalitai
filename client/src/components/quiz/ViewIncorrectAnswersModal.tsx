import React, { useEffect } from "react";
// Import the type for the quiz result details
// TODO: Move QuizResultDetails to a shared types file (e.g., types/quizTypes.ts)
import { QuizResultDetails } from "../../types/staffTypes";
import { IncorrectQuestionDetail } from "../../types/quizTypes";
import Modal from "../common/Modal";
import Button from "../common/Button";

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
  console.log(
    "[ViewIncorrectAnswersModal] Received props.results:",
    JSON.stringify(quizResult, null, 2)
  ); // Log incoming prop

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

  // Get incorrectQuestions from the API or calculate from questions
  let incorrectQuestions: IncorrectQuestionDetail[] = [];

  if (
    quizResult?.incorrectQuestions &&
    quizResult.incorrectQuestions.length > 0
  ) {
    // Case 1: Using incorrectQuestions directly from the API (StaffDetails view)
    incorrectQuestions = quizResult.incorrectQuestions;
  }

  console.log(
    "[ViewIncorrectAnswersModal] Derived incorrectQuestions:",
    JSON.stringify(incorrectQuestions, null, 2)
  ); // Log calculated/derived incorrect questions

  const footer = (
    <Button
      variant="primary"
      onClick={onClose}
      className="bg-sky-600 hover:bg-sky-700"
    >
      Close
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Incorrect Answers: ${quizResult?.quizTitle || "Quiz"}`}
      size="lg"
      footerContent={footer}
    >
      <div>
        {incorrectQuestions.length > 0 ? (
          <div className="space-y-4 text-sm">
            {" "}
            {incorrectQuestions.map(
              (q: IncorrectQuestionDetail, index: number) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                >
                  {" "}
                  <p className="font-semibold text-slate-800 mb-2">
                    {index + 1}. {q.questionText}
                  </p>
                  <p className="text-red-500">
                    <span className="font-semibold">Your Answer:</span>{" "}
                    {q.userAnswer || (
                      <span className="italic text-slate-400">
                        Not answered
                      </span>
                    )}
                  </p>
                  <p className="text-emerald-600 mt-1">
                    <span className="font-semibold">Correct Answer:</span>{" "}
                    {q.correctAnswer}
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-center text-slate-500 italic py-6">
            No incorrect answers to display, or all answers were correct!
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ViewIncorrectAnswersModal;
