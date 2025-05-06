import React, { useEffect, useRef } from "react";
// Import the type for the quiz result details
// TODO: Move QuizResultDetails to a shared types file (e.g., types/quizTypes.ts)
import {
  QuizResultDetails,
  IncorrectQuestionDetail,
} from "../../types/staffTypes";
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

  const incorrectQuestions = quizResult?.incorrectQuestions || [];

  const footer = (
    <Button variant="primary" onClick={onClose}>
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
      {incorrectQuestions.length > 0 ? (
        <ul className="list-disc pl-5 space-y-4 text-sm">
          {incorrectQuestions.map(
            (q: IncorrectQuestionDetail, index: number) => (
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
            )
          )}
        </ul>
      ) : (
        <p className="text-center text-gray-500 italic py-4">
          All answers were correct for this quiz attempt.
        </p>
      )}
    </Modal>
  );
};

export default ViewIncorrectAnswersModal;
