import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import QuestionDisplay from "./QuestionDisplay";
import { QuizDisplayQuestion } from "../../types/quizTypes";

// Mock Button component
jest.mock(
  "../common/Button",
  () =>
    ({ onClick, children, variant, "aria-label": ariaLabel }: any) =>
      (
        <button
          data-testid={`button-${variant}`}
          onClick={onClick}
          aria-label={ariaLabel}
        >
          {children}
        </button>
      )
);

const mockQuestion: QuizDisplayQuestion = {
  _id: "q1",
  text: "What is the capital of France?",
  choices: ["Paris", "London", "Berlin", "Madrid"],
  correctAnswer: 0,
  menuItemId: "menu123",
};

describe("QuestionDisplay Component", () => {
  let mockOnAnswerSelect: jest.Mock;
  let mockOnQuestionChange: jest.Mock;
  let mockOnQuestionDelete: jest.Mock;

  beforeEach(() => {
    mockOnAnswerSelect = jest.fn();
    mockOnQuestionChange = jest.fn();
    mockOnQuestionDelete = jest.fn();
  });

  // --- View Mode Tests (isEditing = false) ---
  describe("View Mode (isEditing = false)", () => {
    test("renders question text and choices correctly", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={undefined}
          isEditing={false}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      expect(screen.getByText(`1. ${mockQuestion.text}`)).toBeInTheDocument();
      mockQuestion.choices.forEach((choice) => {
        expect(screen.getByText(choice)).toBeInTheDocument();
      });
      // Radio buttons should be present
      expect(screen.getAllByRole("radio").length).toBe(
        mockQuestion.choices.length
      );
      // Delete button should not be present
      expect(
        screen.queryByTestId("button-destructive")
      ).not.toBeInTheDocument();
    });

    test("highlights selected answer", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={1} // User selected the second choice
          isEditing={false}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      const radioForChoice1 = screen.getAllByRole(
        "radio"
      )[1] as HTMLInputElement;
      expect(radioForChoice1.checked).toBe(true);
      // Check for styling on the label (more complex, might need specific class checks)
      expect(radioForChoice1.closest("label")).toHaveClass("bg-sky-50");
    });

    test("calls onAnswerSelect when a choice is clicked", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={undefined}
          isEditing={false}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      const secondChoiceRadio = screen.getAllByRole("radio")[1];
      fireEvent.click(secondChoiceRadio);
      expect(mockOnAnswerSelect).toHaveBeenCalledWith(0, 1); // index 0, choiceIndex 1
    });
  });

  // --- Edit Mode Tests (isEditing = true) ---
  describe("Edit Mode (isEditing = true)", () => {
    test("renders input for question text and choices", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={undefined}
          isEditing={true}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      // Question text input
      expect(screen.getByLabelText("Question 1 Text")).toHaveValue(
        mockQuestion.text
      );
      // Choice text inputs and their corresponding radio buttons for correct answer
      mockQuestion.choices.forEach((choice, idx) => {
        expect(screen.getByDisplayValue(choice)).toBeInTheDocument();
        const radio = screen.getAllByRole("radio")[idx] as HTMLInputElement;
        expect(radio).toBeInTheDocument();
        if (idx === mockQuestion.correctAnswer) {
          expect(radio.checked).toBe(true);
        } else {
          expect(radio.checked).toBe(false);
        }
      });
      // Delete button should be present
      expect(screen.getByTestId("button-destructive")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    test("calls onQuestionChange when question text is modified", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={undefined}
          isEditing={true}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      const questionTextInput = screen.getByLabelText("Question 1 Text");
      fireEvent.change(questionTextInput, {
        target: { value: "New question text?" },
      });
      expect(mockOnQuestionChange).toHaveBeenCalledWith(0, {
        ...mockQuestion,
        text: "New question text?",
      });
    });

    test("calls onQuestionChange when a choice text is modified", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={undefined}
          isEditing={true}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      const firstChoiceInput = screen.getByDisplayValue(
        mockQuestion.choices[0]
      );
      fireEvent.change(firstChoiceInput, { target: { value: "New Paris" } });
      const expectedChoices = [...mockQuestion.choices];
      expectedChoices[0] = "New Paris";
      expect(mockOnQuestionChange).toHaveBeenCalledWith(0, {
        ...mockQuestion,
        choices: expectedChoices,
      });
    });

    test("calls onQuestionChange when correct answer selection is changed", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={undefined}
          isEditing={true}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      const radioForSecondChoice = screen.getAllByRole("radio")[1];
      fireEvent.click(radioForSecondChoice);
      expect(mockOnQuestionChange).toHaveBeenCalledWith(0, {
        ...mockQuestion,
        correctAnswer: 1, // Index of the second choice
      });
    });

    test("calls onQuestionDelete when delete button is clicked", () => {
      render(
        <QuestionDisplay
          question={mockQuestion}
          index={0}
          userAnswer={undefined}
          isEditing={true}
          onAnswerSelect={mockOnAnswerSelect}
          onQuestionChange={mockOnQuestionChange}
          onQuestionDelete={mockOnQuestionDelete}
        />
      );
      const deleteButton = screen.getByTestId("button-destructive");
      fireEvent.click(deleteButton);
      expect(mockOnQuestionDelete).toHaveBeenCalledWith(0);
    });
  });
});
