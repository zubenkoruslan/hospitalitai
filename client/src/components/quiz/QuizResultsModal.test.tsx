import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import QuizResultsModal from "./QuizResultsModal";
import {
  ClientQuizResultForDisplay,
  QuizDisplayQuestion,
  ClientQuizDataForDisplay,
} from "../../types/quizTypes";

// Mock Button component
jest.mock(
  "../common/Button",
  () =>
    ({ onClick, children, variant, type }: any) =>
      (
        <button
          data-testid={`button-${variant || "default"}${
            type ? "-" + type : ""
          }`}
          onClick={onClick}
        >
          {children}
        </button>
      )
);

const mockQuestion1: QuizDisplayQuestion = {
  _id: "q1",
  text: "What is 2+2?",
  choices: ["3", "4", "5"],
  correctAnswer: 1, // '4'
};

const mockQuestion2: QuizDisplayQuestion = {
  _id: "q2",
  text: "Capital of France?",
  choices: ["Berlin", "Madrid", "Paris"],
  correctAnswer: 2, // 'Paris'
};

const mockQuizData: ClientQuizDataForDisplay = {
  _id: "quiz1",
  title: "Math & Geography Basics",
  questions: [mockQuestion1, mockQuestion2],
};

const mockResultsPerfect: ClientQuizResultForDisplay = {
  score: 2,
  totalQuestions: 2,
  userAnswers: [1, 2], // Correct answers for both
  quizData: mockQuizData,
};

const mockResultsImperfect: ClientQuizResultForDisplay = {
  score: 1,
  totalQuestions: 2,
  userAnswers: [0, 2], // Q1 wrong, Q2 correct
  quizData: mockQuizData,
};

const mockResultsAllWrong: ClientQuizResultForDisplay = {
  score: 0,
  totalQuestions: 2,
  userAnswers: [0, 0], // All wrong
  quizData: mockQuizData,
};

const mockResultsUnanswered: ClientQuizResultForDisplay = {
  score: 0,
  totalQuestions: 2,
  userAnswers: [undefined, 1], // Q1 unanswered, Q2 wrong
  quizData: mockQuizData,
};

describe("QuizResultsModal", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test("renders nothing when isOpen is false", () => {
    render(
      <QuizResultsModal
        isOpen={false}
        onClose={mockOnClose}
        results={mockResultsPerfect}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders nothing when results are null", () => {
    render(
      <QuizResultsModal isOpen={true} onClose={mockOnClose} results={null} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders modal with title and score when open with results", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsPerfect}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(`Quiz Results: ${mockQuizData.title}`)
    ).toBeInTheDocument();
    expect(screen.getByText("Score: 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("(100%)")).toBeInTheDocument();
  });

  test("displays questions with correct styling for perfect score", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsPerfect}
      />
    );

    // Question 1
    expect(screen.getByText(`1. ${mockQuestion1.text}`)).toBeInTheDocument();
    const q1Choice2 = screen.getByText(mockQuestion1.choices[1]); // '4'
    expect(q1Choice2).toBeInTheDocument();
    expect(q1Choice2.closest("li")).toHaveClass("text-green-700");
    expect(screen.getByText("(Your Answer - Correct)")).toBeInTheDocument();
    expect(q1Choice2.parentElement?.querySelector("span")).toHaveTextContent(
      "●"
    );

    // Question 2
    expect(screen.getByText(`2. ${mockQuestion2.text}`)).toBeInTheDocument();
    const q2Choice3 = screen.getByText(mockQuestion2.choices[2]); // 'Paris'
    expect(q2Choice3).toBeInTheDocument();
    // Multiple instances of this text can exist, so check within the specific question context
    const q2Indicators = screen.getAllByText("(Your Answer - Correct)");
    expect(q2Indicators.length).toBe(2); // one for each correct answer
    expect(q2Choice3.closest("li")).toHaveClass("text-green-700");
  });

  test("displays questions with correct styling for imperfect score", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsImperfect}
      />
    );
    expect(screen.getByText("Score: 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("(50%)")).toBeInTheDocument();

    // Question 1 (answered incorrectly)
    expect(screen.getByText(`1. ${mockQuestion1.text}`)).toBeInTheDocument();
    const q1UserChoice = screen.getByText(mockQuestion1.choices[0]); // User answered '3'
    expect(q1UserChoice.closest("li")).toHaveClass("text-red-700");
    expect(q1UserChoice.parentElement?.querySelector("span")).toHaveTextContent(
      "●"
    );
    const q1CorrectChoice = screen.getByText(mockQuestion1.choices[1]); // Correct is '4'
    expect(q1CorrectChoice.closest("li")).toHaveClass("text-green-700");
    expect(
      q1CorrectChoice.parentElement?.querySelector("span")
    ).toHaveTextContent("○");

    // Check for indicators
    const q1UserIndicator = q1UserChoice
      .closest("li")
      ?.querySelector("span:last-child");
    expect(q1UserIndicator).toHaveTextContent("(Your Answer)");
    const q1CorrectIndicator = q1CorrectChoice
      .closest("li")
      ?.querySelector("span:last-child");
    expect(q1CorrectIndicator).toHaveTextContent("(Correct Answer)");

    // Question 2 (answered correctly)
    expect(screen.getByText(`2. ${mockQuestion2.text}`)).toBeInTheDocument();
    const q2UserChoice = screen.getByText(mockQuestion2.choices[2]); // User answered 'Paris'
    expect(q2UserChoice.closest("li")).toHaveClass("text-green-700");
    const q2UserIndicator = q2UserChoice
      .closest("li")
      ?.querySelector("span:last-child");
    expect(q2UserIndicator).toHaveTextContent("(Your Answer - Correct)");
  });

  test("displays questions with correct styling for all wrong answers", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsAllWrong}
      />
    );
    expect(screen.getByText("Score: 0 / 2")).toBeInTheDocument();
    expect(screen.getByText("(0%)")).toBeInTheDocument();

    // Question 1 (answered incorrectly)
    const q1UserChoice_allwrong = screen.getByText(mockQuestion1.choices[0]); // User answered '3'
    expect(q1UserChoice_allwrong.closest("li")).toHaveClass("text-red-700");
    const q1CorrectChoice_allwrong = screen.getByText(mockQuestion1.choices[1]); // Correct is '4'
    expect(q1CorrectChoice_allwrong.closest("li")).toHaveClass(
      "text-green-700"
    );
  });

  test("handles unanswered questions correctly", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsUnanswered}
      />
    );
    // Question 1 (unanswered)
    expect(screen.getByText(`1. ${mockQuestion1.text}`)).toBeInTheDocument();
    const q1Choice1 = screen.getByText(mockQuestion1.choices[0]);
    expect(q1Choice1.closest("li")).toHaveClass("text-slate-700"); // Default style
    expect(q1Choice1.parentElement?.querySelector("span")).toHaveTextContent(
      "○"
    );
    const q1CorrectChoice = screen.getByText(mockQuestion1.choices[1]);
    expect(q1CorrectChoice.closest("li")).toHaveClass("text-green-700");
    expect(
      q1CorrectChoice.parentElement?.querySelector("span:last-child")
    ).toHaveTextContent("(Correct Answer)");
  });

  test("calls onClose when overlay is clicked", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsPerfect}
      />
    );
    fireEvent.click(screen.getByRole("dialog")); // Click on the overlay div
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when close button (X) is clicked", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsPerfect}
      />
    );
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when "Close Results" button in footer is clicked', () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsPerfect}
      />
    );
    fireEvent.click(screen.getByTestId("button-secondary-button")); // Mocked Button creates this testId
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("content click does not propagate to close modal", () => {
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={mockResultsPerfect}
      />
    );
    // Find an element within the modal content, e.g., the title
    const modalContentTitle = screen.getByText(
      `Quiz Results: ${mockQuizData.title}`
    );
    fireEvent.click(modalContentTitle);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test("displays 0% score if totalQuestions is 0", () => {
    const zeroQuestionsResult: ClientQuizResultForDisplay = {
      ...mockResultsPerfect,
      totalQuestions: 0,
      score: 0,
      quizData: { ...mockQuizData, questions: [] },
    };
    render(
      <QuizResultsModal
        isOpen={true}
        onClose={mockOnClose}
        results={zeroQuestionsResult}
      />
    );
    expect(screen.getByText("Score: 0 / 0")).toBeInTheDocument();
    expect(screen.getByText("(0%)")).toBeInTheDocument();
  });
});
