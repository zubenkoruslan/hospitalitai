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
      // Pass modalRef to generic modal if it supports it, or handle here
      // For now, this modal handles its own click outside via its own content ref
      // This will not work as expected if modalRef is not on the modal panel itself.
      // The generic Modal already handles overlay click to close.
      // This specific logic might be redundant or could conflict if not careful.
      // Assuming it targets the content *inside* the generic modal panel:
      const genericModalPanel = document.querySelector('[role="dialog"] > div'); // A bit fragile selector
      if (
        genericModalPanel &&
        !genericModalPanel.contains(event.target as Node)
      ) {
        // Click was outside the main panel provided by generic Modal, let generic Modal handle it.
      } else if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        // Click was inside generic modal panel but outside specific content of this modal (if modalRef wraps it)
        // This is likely not the intended use if generic Modal handles its own panel.
        // For simplicity, let generic Modal.tsx handle click outside. This hook can be removed if Modal.tsx covers it.
      }
    };
    // Let's simplify: generic Modal.tsx handles overlay click. We don't need this extra one if Modal.tsx is robust.
    // Keeping it for now as it was in original code, but it might be best to remove.
    // To make it work with the current generic Modal, modalRef would need to be on a wrapper *inside* Modal's children.
    // However, the current structure doesn't use modalRef on a specific element inside the Modal's children.
    // Let's remove this custom click outside handler as generic Modal handles it.
  }, [isOpen, onClose, modalRef]); // modalRef added to deps, but hook will be removed.

  // Get incorrectQuestions from the API or calculate from questions
  let incorrectQuestions: IncorrectQuestionDetail[] = [];

  if (
    quizResult?.incorrectQuestions &&
    quizResult.incorrectQuestions.length > 0
  ) {
    // Case 1: Using incorrectQuestions directly from the API (StaffDetails view)
    incorrectQuestions = quizResult.incorrectQuestions;
  } else if (quizResult?.questions) {
    // Case 2: Calculate from questions array (QuizResultDetailModal view)
    incorrectQuestions = quizResult.questions
      .filter((q) => q.userAnswerIndex !== q.correctAnswerIndex)
      .map((q) => ({
        questionText: q.text,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
      }));
  }

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
      // Pass modalRef to Modal if it ever supports a contentRef for advanced scenarios
      // contentRef={modalRef} // Example, if Modal supported it
    >
      {/* Assign ref here if this content needs specific outside click handling not covered by Modal overlay click */}
      <div ref={modalRef}>
        {incorrectQuestions.length > 0 ? (
          <div className="space-y-4 text-sm">
            {" "}
            {/* Changed ul to div, removed list-disc pl-5 */}
            {incorrectQuestions.map(
              (q: IncorrectQuestionDetail, index: number) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                >
                  {" "}
                  {/* Changed li to div, added styling */}
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
