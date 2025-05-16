import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddQuestionModal from "./AddQuestionModal";
import { QuizDisplayQuestion } from "../../types/quizTypes";

// Mock Button component
const MockButton = ({ onClick, children, variant, type, disabled }: any) => (
  <button
    data-testid={`button-${variant || "default"}${type ? "-" + type : ""}`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

const defaultInitialMenuItemId = "menuItem123";

describe("AddQuestionModal", () => {
  let mockOnClose: jest.Mock;
  let mockOnSubmit: jest.Mock;

  const initialQuestionState: QuizDisplayQuestion = {
    text: "New Question",
    choices: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correctAnswer: 0,
    menuItemId: defaultInitialMenuItemId,
  };

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
  });

  const renderModal = (
    isOpen: boolean,
    initialMenuItemId: string | undefined = defaultInitialMenuItemId
  ) => {
    render(
      <AddQuestionModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialMenuItemId={initialMenuItemId}
      />
    );
  };

  test("renders nothing when isOpen is false", () => {
    renderModal(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders modal with title and default form values when open", () => {
    renderModal(true);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add New Question")).toBeInTheDocument();

    expect(screen.getByLabelText(/Question Text/)).toHaveValue(
      initialQuestionState.text
    );
    initialQuestionState.choices.forEach((choice, index) => {
      expect(screen.getByPlaceholderText(`Option ${index + 1}`)).toHaveValue(
        choice
      );
    });
    const firstRadio = screen.getAllByRole("radio")[0] as HTMLInputElement;
    expect(firstRadio.checked).toBe(true);
    expect(
      screen.getByText(`(Associated Menu Item ID: ${defaultInitialMenuItemId})`)
    ).toBeInTheDocument();
  });

  test("initializes menuItemId to empty string if initialMenuItemId is undefined", () => {
    renderModal(true, undefined);
    expect(
      screen.getByText("(Associated Menu Item ID: N/A)")
    ).toBeInTheDocument();
  });

  test("updates question text on input", () => {
    renderModal(true);
    const textInput = screen.getByLabelText(/Question Text/);
    fireEvent.change(textInput, { target: { value: "What is your name?" } });
    expect(textInput).toHaveValue("What is your name?");
  });

  test("updates choice text on input", () => {
    renderModal(true);
    const choiceInput = screen.getByPlaceholderText("Option 1");
    fireEvent.change(choiceInput, { target: { value: "Choice A" } });
    expect(choiceInput).toHaveValue("Choice A");
  });

  test("updates correct answer on radio button selection", () => {
    renderModal(true);
    const secondRadio = screen.getAllByRole("radio")[1] as HTMLInputElement;
    fireEvent.click(secondRadio);
    expect(secondRadio.checked).toBe(true);
    const firstRadio = screen.getAllByRole("radio")[0] as HTMLInputElement;
    expect(firstRadio.checked).toBe(false);
  });

  test("calls onClose when overlay is clicked", () => {
    renderModal(true);
    fireEvent.click(screen.getByRole("dialog"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when close button (X) is clicked", () => {
    renderModal(true);
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when Cancel button is clicked", () => {
    renderModal(true);
    fireEvent.click(screen.getByTestId("button-secondary-button"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("Add Question button is initially enabled with default values", () => {
    renderModal(true);
    const addButton = screen.getByTestId("button-primary-button");
    expect(addButton).not.toBeDisabled();
  });

  test("Add Question button is disabled if question text is empty", () => {
    renderModal(true);
    const textInput = screen.getByLabelText(/Question Text/);
    fireEvent.change(textInput, { target: { value: "   " } }); // Empty text
    const addButton = screen.getByTestId("button-primary-button");
    expect(addButton).toBeDisabled();
  });

  test("Add Question button is disabled if any choice text is empty", () => {
    renderModal(true);
    const choiceInput = screen.getByPlaceholderText("Option 1");
    fireEvent.change(choiceInput, { target: { value: " " } }); // Empty choice
    const addButton = screen.getByTestId("button-primary-button");
    expect(addButton).toBeDisabled();
  });

  test("calls onSubmit with current question state and closes modal when Add Question is clicked", () => {
    renderModal(true);
    const newText = "A new question?";
    const newChoice0 = "Yes";

    fireEvent.change(screen.getByLabelText(/Question Text/), {
      target: { value: newText },
    });
    fireEvent.change(screen.getByPlaceholderText("Option 1"), {
      target: { value: newChoice0 },
    });
    fireEvent.click(screen.getAllByRole("radio")[1]); // Select second option as correct

    fireEvent.click(screen.getByTestId("button-primary-button"));

    const expectedChoices = [...initialQuestionState.choices];
    expectedChoices[0] = newChoice0;

    expect(mockOnSubmit).toHaveBeenCalledWith({
      text: newText,
      choices: expectedChoices,
      correctAnswer: 1, // Second option selected
      menuItemId: defaultInitialMenuItemId,
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("resets form to initial state when re-opened", () => {
    const { rerender } = render(
      <AddQuestionModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialMenuItemId={defaultInitialMenuItemId}
      />
    );
    // Change some values
    fireEvent.change(screen.getByLabelText(/Question Text/), {
      target: { value: "Modified Text" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option 1"), {
      target: { value: "Modified Choice" },
    });

    // "Close" the modal
    rerender(
      <AddQuestionModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialMenuItemId={defaultInitialMenuItemId}
      />
    );

    // "Re-open" the modal
    rerender(
      <AddQuestionModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialMenuItemId={defaultInitialMenuItemId}
      />
    );

    expect(screen.getByLabelText(/Question Text/)).toHaveValue(
      initialQuestionState.text
    );
    expect(screen.getByPlaceholderText("Option 1")).toHaveValue(
      initialQuestionState.choices[0]
    );
    const firstRadio = screen.getAllByRole("radio")[0] as HTMLInputElement;
    expect(firstRadio.checked).toBe(true);
  });

  test("resets form if initialMenuItemId changes while open", () => {
    const { rerender } = render(
      <AddQuestionModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialMenuItemId={defaultInitialMenuItemId}
      />
    );
    fireEvent.change(screen.getByLabelText(/Question Text/), {
      target: { value: "Old Text for old ID" },
    });
    expect(
      screen.getByText(`(Associated Menu Item ID: ${defaultInitialMenuItemId})`)
    ).toBeInTheDocument();

    const newMenuItemId = "newItem456";
    rerender(
      <AddQuestionModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialMenuItemId={newMenuItemId}
      />
    );

    expect(screen.getByLabelText(/Question Text/)).toHaveValue(
      initialQuestionState.text
    ); // Resets to default text
    expect(
      screen.getByText(`(Associated Menu Item ID: ${newMenuItemId})`)
    ).toBeInTheDocument();
  });
});
