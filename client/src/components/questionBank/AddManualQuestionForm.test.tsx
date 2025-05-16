import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddManualQuestionForm from "./AddManualQuestionForm";
import { ValidationContext } from "../../context/ValidationContext";
import * as apiService from "../../services/api";
import { QuestionType, IQuestion } from "../../types/questionBankTypes";

// Mock API service
jest.mock("../../services/api", () => ({
  createQuestion: jest.fn(),
}));

// Mock common components
const MockButton = (props: any) => (
  <button
    {...props}
    data-testid={
      props.children === "Add Option"
        ? "add-option-button"
        : props.children === "Add Question"
        ? "add-question-button"
        : "cancel-button"
    }
  >
    {props.children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

// Mock child components
const MockErrorMessage = ({ message }: { message: string }) => (
  <div data-testid="error-message">{message}</div>
);
MockErrorMessage.displayName = "MockErrorMessage";
jest.mock("../../common/ErrorMessage", () => MockErrorMessage);

const MockLoadingSpinner = () => (
  <div data-testid="loading-spinner">Loading...</div>
);
MockLoadingSpinner.displayName = "MockLoadingSpinner";
jest.mock("../../common/LoadingSpinner", () => MockLoadingSpinner);

const mockOnQuestionAdded = jest.fn();
const mockOnCloseRequest = jest.fn();

const mockValidationContextValue = {
  formatErrorMessage: jest.fn((err) => {
    if (err.response?.data?.message) return err.response.data.message;
    if (err.message) return err.message;
    return "An unexpected error occurred.";
  }),
};

const defaultProps = {
  onQuestionAdded: mockOnQuestionAdded,
  onCloseRequest: mockOnCloseRequest,
  initialBankCategories: [],
};

const renderComponent = (props = {}) => {
  return render(
    <ValidationContext.Provider value={mockValidationContextValue as any}>
      <AddManualQuestionForm {...defaultProps} {...props} />
    </ValidationContext.Provider>
  );
};

describe("AddManualQuestionForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.createQuestion as jest.Mock).mockResolvedValue({
      _id: "q123",
      questionText: "Test Question",
      questionType: "multiple-choice-single",
      options: [
        { text: "Opt1", isCorrect: true },
        { text: "Opt2", isCorrect: false },
      ],
      categories: ["General"],
      difficulty: "easy",
    } as IQuestion);
  });

  test("renders initial form elements correctly", () => {
    renderComponent();
    expect(screen.getByLabelText(/Question Text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Question Type/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Difficulty \(Optional\)/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Categories/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Option Text/i).length).toBe(2); // Default 2 options
    expect(screen.getAllByLabelText(/Correct\?/i).length).toBe(2);
    expect(screen.getByTestId("add-option-button")).toBeInTheDocument();
    expect(screen.getByTestId("add-question-button")).toBeInTheDocument();
    // The cancel button is just an XMarkIcon, let's find it by its action via parent
    expect(
      screen.getByRole("button", { name: /close form/i })
    ).toBeInTheDocument();
  });

  test("pre-fills categories if initialBankCategories are provided", () => {
    const initialCategories = ["Tech", "Science"];
    renderComponent({ initialBankCategories: initialCategories });
    expect(screen.getByLabelText(/Categories/i)).toHaveValue("Tech, Science");
  });

  test("allows input for all fields", async () => {
    renderComponent();
    await userEvent.type(
      screen.getByLabelText(/Question Text/i),
      "What is React?"
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/Question Type/i),
      "multiple-choice-single"
    );
    await userEvent.type(
      screen.getByLabelText(/Categories/i),
      "Programming, Frontend"
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/Difficulty \(Optional\)/i),
      "medium"
    );

    const optionTexts = screen.getAllByLabelText(/Option Text/i);
    await userEvent.type(optionTexts[0], "A JS Library");
    await userEvent.type(optionTexts[1], "A JS Framework");
    const correctCheckboxes = screen.getAllByLabelText(/Correct\?/i);
    await userEvent.click(correctCheckboxes[0]);

    expect(screen.getByLabelText(/Question Text/i)).toHaveValue(
      "What is React?"
    );
    expect(screen.getByLabelText(/Question Type/i)).toHaveValue(
      "multiple-choice-single"
    );
    expect(screen.getByLabelText(/Categories/i)).toHaveValue(
      "Programming, Frontend"
    );
    expect(screen.getByLabelText(/Difficulty \(Optional\)/i)).toHaveValue(
      "medium"
    );
    expect(optionTexts[0]).toHaveValue("A JS Library");
    expect(optionTexts[1]).toHaveValue("A JS Framework");
    expect(correctCheckboxes[0]).toBeChecked();
  });

  describe("Option Management", () => {
    test('adds an option field when "Add Option" is clicked, up to 6', async () => {
      renderComponent();
      const addOptionButton = screen.getByTestId("add-option-button");
      expect(screen.getAllByLabelText(/Option Text/i).length).toBe(2);
      await userEvent.click(addOptionButton); // 3 options
      expect(screen.getAllByLabelText(/Option Text/i).length).toBe(3);
      await userEvent.click(addOptionButton); // 4 options
      await userEvent.click(addOptionButton); // 5 options
      await userEvent.click(addOptionButton); // 6 options
      expect(screen.getAllByLabelText(/Option Text/i).length).toBe(6);
      await userEvent.click(addOptionButton); // Try to add 7th
      expect(screen.getAllByLabelText(/Option Text/i).length).toBe(6); // Still 6
    });

    test("removes an option field, down to 2", async () => {
      renderComponent();
      await userEvent.click(screen.getByTestId("add-option-button")); // 3 options
      expect(screen.getAllByLabelText(/Option Text/i).length).toBe(3);
      const removeButtons = screen.getAllByRole("button", {
        name: /Remove option/i,
      });
      await userEvent.click(removeButtons[2]); // Remove the 3rd option
      expect(screen.getAllByLabelText(/Option Text/i).length).toBe(2);
      await userEvent.click(removeButtons[1]); // Try to remove, should not go below 2
      expect(screen.getAllByLabelText(/Option Text/i).length).toBe(2);
    });

    test('sets options to True/False when type is "true-false"', async () => {
      renderComponent();
      await userEvent.selectOptions(
        screen.getByLabelText(/Question Type/i),
        "true-false"
      );
      const optionTexts = screen.getAllByLabelText(/Option Text/i);
      expect(optionTexts[0]).toHaveValue("True");
      expect(optionTexts[1]).toHaveValue("False");
      expect(screen.getAllByLabelText(/Correct\?/i)[0]).toBeChecked();
      expect(screen.getAllByLabelText(/Correct\?/i)[1]).not.toBeChecked();
      // Options should be disabled for true-false
      expect(optionTexts[0]).toBeDisabled();
      expect(screen.getByTestId("add-option-button")).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: /Remove option/i })
      ).not.toBeInTheDocument();
    });

    test('resets options if type changes from "true-false"', async () => {
      renderComponent();
      await userEvent.selectOptions(
        screen.getByLabelText(/Question Type/i),
        "true-false"
      );
      // Change back to multiple-choice
      await userEvent.selectOptions(
        screen.getByLabelText(/Question Type/i),
        "multiple-choice-single"
      );
      const optionTexts = screen.getAllByLabelText(/Option Text/i);
      expect(optionTexts[0]).toHaveValue("");
      expect(optionTexts[1]).toHaveValue("");
      expect(screen.getAllByLabelText(/Correct\?/i)[0]).not.toBeChecked();
    });
  });

  describe("Validation", () => {
    test("shows error if question text is empty", async () => {
      renderComponent();
      await userEvent.click(screen.getByTestId("add-question-button"));
      expect(
        await screen.findByText("Question text cannot be empty.")
      ).toBeInTheDocument();
    });

    test("shows error if option text is empty for multiple choice", async () => {
      renderComponent();
      await userEvent.type(
        screen.getByLabelText(/Question Text/i),
        "Sample Question?"
      );
      // Leave option text empty
      await userEvent.click(screen.getByTestId("add-question-button"));
      expect(
        await screen.findByText(
          "All option texts must be filled for multiple choice questions."
        )
      ).toBeInTheDocument();
    });

    test("shows error if no correct option for single-choice", async () => {
      renderComponent();
      await userEvent.type(
        screen.getByLabelText(/Question Text/i),
        "Sample Question?"
      );
      await userEvent.type(
        screen.getAllByLabelText(/Option Text/i)[0],
        "Opt A"
      );
      await userEvent.type(
        screen.getAllByLabelText(/Option Text/i)[1],
        "Opt B"
      );
      // No correct option selected
      await userEvent.click(screen.getByTestId("add-question-button"));
      expect(
        await screen.findByText(
          "Single-answer and True/False questions must have exactly one correct option."
        )
      ).toBeInTheDocument();
    });

    test("shows error if multiple correct options for single-choice", async () => {
      renderComponent();
      await userEvent.type(
        screen.getByLabelText(/Question Text/i),
        "Sample Question?"
      );
      await userEvent.type(
        screen.getAllByLabelText(/Option Text/i)[0],
        "Opt A"
      );
      await userEvent.type(
        screen.getAllByLabelText(/Option Text/i)[1],
        "Opt B"
      );
      await userEvent.click(screen.getAllByLabelText(/Correct\?/i)[0]);
      await userEvent.click(screen.getAllByLabelText(/Correct\?/i)[1]); // Select two correct
      await userEvent.click(screen.getByTestId("add-question-button"));
      expect(
        await screen.findByText(
          "Single-answer and True/False questions must have exactly one correct option."
        )
      ).toBeInTheDocument();
    });

    test("shows error if no correct option for multiple-choice-multiple", async () => {
      renderComponent();
      await userEvent.selectOptions(
        screen.getByLabelText(/Question Type/i),
        "multiple-choice-multiple"
      );
      await userEvent.type(
        screen.getByLabelText(/Question Text/i),
        "Sample Question?"
      );
      await userEvent.type(
        screen.getAllByLabelText(/Option Text/i)[0],
        "Opt A"
      );
      await userEvent.type(
        screen.getAllByLabelText(/Option Text/i)[1],
        "Opt B"
      );
      // No correct option selected
      await userEvent.click(screen.getByTestId("add-question-button"));
      expect(
        await screen.findByText(
          "Multiple-answer questions must have at least one correct option."
        )
      ).toBeInTheDocument();
    });

    test("shows error if categories are empty", async () => {
      renderComponent();
      await userEvent.type(
        screen.getByLabelText(/Question Text/i),
        "Sample Question?"
      );
      await userEvent.type(
        screen.getAllByLabelText(/Option Text/i)[0],
        "Opt A"
      );
      await userEvent.click(screen.getAllByLabelText(/Correct\?/i)[0]);
      // Categories left empty
      await userEvent.click(screen.getByTestId("add-question-button"));
      expect(
        await screen.findByText("Please provide at least one category.")
      ).toBeInTheDocument();
    });
  });

  test("submits form successfully with valid data", async () => {
    renderComponent();
    const questionData = {
      questionText: "What is the capital of France?",
      questionType: "multiple-choice-single" as QuestionType,
      options: [
        { text: "Paris", isCorrect: true },
        { text: "London", isCorrect: false },
      ],
      categories: ["Geography", "Europe"],
      difficulty: "easy" as const,
    };

    await userEvent.type(
      screen.getByLabelText(/Question Text/i),
      questionData.questionText
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/Question Type/i),
      questionData.questionType
    );
    await userEvent.type(
      screen.getByLabelText(/Categories/i),
      questionData.categories.join(", ")
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/Difficulty \(Optional\)/i),
      questionData.difficulty
    );

    const optionTextInputs = screen.getAllByLabelText(/Option Text/i);
    const correctCheckboxes = screen.getAllByLabelText(/Correct\?/i);
    await userEvent.type(optionTextInputs[0], questionData.options[0].text);
    if (questionData.options[0].isCorrect)
      await userEvent.click(correctCheckboxes[0]);
    await userEvent.type(optionTextInputs[1], questionData.options[1].text);
    if (questionData.options[1].isCorrect)
      await userEvent.click(correctCheckboxes[1]);

    await userEvent.click(screen.getByTestId("add-question-button"));

    await waitFor(() => {
      expect(apiService.createQuestion).toHaveBeenCalledWith({
        questionText: questionData.questionText,
        questionType: questionData.questionType,
        options: questionData.options,
        categories: questionData.categories,
        difficulty: questionData.difficulty,
      });
    });
    expect(mockOnQuestionAdded).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "q123" })
    );
  });

  test("handles API error on submission", async () => {
    const errorMessage = "Failed to create question via API.";
    (apiService.createQuestion as jest.Mock).mockRejectedValueOnce({
      response: { data: { message: errorMessage } },
    });
    renderComponent();
    // Fill with minimal valid data
    await userEvent.type(
      screen.getByLabelText(/Question Text/i),
      "Error Question"
    );
    await userEvent.type(screen.getAllByLabelText(/Option Text/i)[0], "OptA");
    await userEvent.click(screen.getAllByLabelText(/Correct\?/i)[0]);
    await userEvent.type(screen.getByLabelText(/Categories/i), "Errors");

    await userEvent.click(screen.getByTestId("add-question-button"));
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(mockOnQuestionAdded).not.toHaveBeenCalled();
  });

  test("calls onCloseRequest when close button is clicked", async () => {
    renderComponent();
    await userEvent.click(screen.getByRole("button", { name: /close form/i }));
    expect(mockOnCloseRequest).toHaveBeenCalledTimes(1);
  });
});
