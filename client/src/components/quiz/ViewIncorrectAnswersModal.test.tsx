import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ViewIncorrectAnswersModal from "./ViewIncorrectAnswersModal";
import { QuizResultDetails } from "../../types/staffTypes";
import { IncorrectQuestionDetail } from "../../types/quizTypes";

// Mock the child components
const MockModal = ({ isOpen, onClose, title, footerContent, children }: any) =>
  isOpen ? (
    <div data-testid="modal">
      <h1>{title}</h1>
      <div>{children}</div>
      <footer>{footerContent}</footer>
      <button data-testid="modal-close-button" onClick={onClose}>
        Internal Close
      </button>
    </div>
  ) : null;
MockModal.displayName = "MockModal";
jest.mock("../common/Modal", () => MockModal);

const MockButton = ({ onClick, children, variant, className }: any) => (
  <button
    data-testid={`button-${variant}`}
    onClick={onClick}
    className={className}
  >
    {children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

const mockQuizResultBase: QuizResultDetails = {
  _id: "result1",
  quizId: "quiz1",
  quizTitle: "Sample Quiz",
  userId: "user1",
  score: 50,
  totalQuestions: 10,
  completedAt: new Date().toISOString(),
  incorrectQuestions: [],
};

describe("ViewIncorrectAnswersModal", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test("renders nothing when isOpen is false", () => {
    render(
      <ViewIncorrectAnswersModal
        isOpen={false}
        onClose={mockOnClose}
        quizResult={mockQuizResultBase}
      />
    );
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  test("renders the modal with title when isOpen is true", () => {
    render(
      <ViewIncorrectAnswersModal
        isOpen={true}
        onClose={mockOnClose}
        quizResult={mockQuizResultBase}
      />
    );
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(
      screen.getByText("Incorrect Answers: Sample Quiz")
    ).toBeInTheDocument();
  });

  test('uses default "Quiz" in title if quizTitle is missing', () => {
    render(
      <ViewIncorrectAnswersModal
        isOpen={true}
        onClose={mockOnClose}
        quizResult={{ ...mockQuizResultBase, quizTitle: undefined as any }}
      />
    );
    expect(screen.getByText("Incorrect Answers: Quiz")).toBeInTheDocument();
  });

  test('displays "no incorrect answers" message when incorrectQuestions is empty', () => {
    render(
      <ViewIncorrectAnswersModal
        isOpen={true}
        onClose={mockOnClose}
        quizResult={{ ...mockQuizResultBase, incorrectQuestions: [] }}
      />
    );
    expect(
      screen.getByText(
        "No incorrect answers to display, or all answers were correct!"
      )
    ).toBeInTheDocument();
  });

  test('displays "no incorrect answers" message when quizResult is null', () => {
    render(
      <ViewIncorrectAnswersModal
        isOpen={true}
        onClose={mockOnClose}
        quizResult={null}
      />
    );
    expect(
      screen.getByText(
        "No incorrect answers to display, or all answers were correct!"
      )
    ).toBeInTheDocument();
  });

  test('displays "no incorrect answers" message when incorrectQuestions is undefined', () => {
    const quizResultWithoutIncorrect: Omit<
      QuizResultDetails,
      "incorrectQuestions"
    > & { incorrectQuestions?: IncorrectQuestionDetail[] } = {
      ...mockQuizResultBase,
    };
    delete quizResultWithoutIncorrect.incorrectQuestions;

    render(
      <ViewIncorrectAnswersModal
        isOpen={true}
        onClose={mockOnClose}
        quizResult={quizResultWithoutIncorrect}
      />
    );
    expect(
      screen.getByText(
        "No incorrect answers to display, or all answers were correct!"
      )
    ).toBeInTheDocument();
  });

  describe("when there are incorrect answers", () => {
    const incorrectQuestions: IncorrectQuestionDetail[] = [
      {
        questionText: "What is 2+2?",
        userAnswer: "5",
        correctAnswer: "4",
      },
      {
        questionText: "Capital of France?",
        userAnswer: "", // Not answered
        correctAnswer: "Paris",
      },
    ];
    const quizResultWithIncorrect: QuizResultDetails = {
      ...mockQuizResultBase,
      incorrectQuestions,
    };

    test("displays each incorrect question, user answer, and correct answer", () => {
      render(
        <ViewIncorrectAnswersModal
          isOpen={true}
          onClose={mockOnClose}
          quizResult={quizResultWithIncorrect}
        />
      );

      expect(screen.getByText("1. What is 2+2?")).toBeInTheDocument();
      expect(screen.getByText("Your Answer:")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Correct Answer:")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();

      expect(screen.getByText("2. Capital of France?")).toBeInTheDocument();
      // For the unanswered question
      expect(screen.getByText("Not answered")).toBeInTheDocument();
      expect(screen.getByText("Paris")).toBeInTheDocument();
    });

    test('calls onClose when the "Close" button is clicked', () => {
      render(
        <ViewIncorrectAnswersModal
          isOpen={true}
          onClose={mockOnClose}
          quizResult={quizResultWithIncorrect}
        />
      );
      // The Button mock creates a button with testid "button-primary"
      fireEvent.click(screen.getByTestId("button-primary"));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("calls onClose when Escape key is pressed", () => {
      render(
        <ViewIncorrectAnswersModal
          isOpen={true}
          onClose={mockOnClose}
          quizResult={quizResultWithIncorrect}
        />
      );
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("does not call onClose when other key is pressed", () => {
      render(
        <ViewIncorrectAnswersModal
          isOpen={true}
          onClose={mockOnClose}
          quizResult={quizResultWithIncorrect}
        />
      );
      fireEvent.keyDown(document, { key: "Enter", code: "Enter" });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
