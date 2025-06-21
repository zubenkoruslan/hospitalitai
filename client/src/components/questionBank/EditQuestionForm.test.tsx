import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EditQuestionForm from "./EditQuestionForm";
import { IQuestion } from "../../types/questionBankTypes";
import * as api from "../../services/api";
import {
  ValidationContext,
  ValidationFunctions,
} from "../../context/ValidationContext";

// Mock the API service
jest.mock("../../services/api");
const mockApiUpdateQuestion = api.updateQuestion as jest.Mock;

const mockQuestionMultipleChoice: IQuestion = {
  _id: "q1-mc",
  questionText: "What is 2+2?",
  questionType: "multiple-choice-single",
  options: [
    { _id: "opt1", text: "3", isCorrect: false },
    { _id: "opt2", text: "4", isCorrect: true },
    { _id: "opt3", text: "5", isCorrect: false },
  ],
  categories: ["Math", "Arithmetic"],
  restaurantId: "rest1",
  createdBy: "manual",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockQuestionTrueFalse: IQuestion = {
  _id: "q2-tf",
  questionText: "Is the sky blue?",
  questionType: "true-false",
  options: [
    { _id: "optT", text: "True", isCorrect: true },
    { _id: "optF", text: "False", isCorrect: false },
  ],
  categories: ["General", "Nature"],
  restaurantId: "rest1",
  createdBy: "manual",
  status: "pending_review",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockOnQuestionUpdated = jest.fn();
const mockOnClose = jest.fn();

const mockFormatErrorMessage = jest.fn((err) => err?.message || "API Error");
const mockValidationFunctions: ValidationFunctions = {
  isValidName: jest.fn(() => ({ valid: true })),
  isValidPrice: jest.fn(() => ({ valid: true })),
  isValidDescription: jest.fn(() => ({ valid: true })),
  isValidIngredient: jest.fn(() => ({ valid: true })),
  isValidEmail: jest.fn(() => ({ valid: true })),
  formatErrorMessage: mockFormatErrorMessage,
};

const renderComponent = (question: IQuestion = mockQuestionMultipleChoice) => {
  return render(
    <ValidationContext.Provider value={mockValidationFunctions}>
      <EditQuestionForm
        questionToEdit={question}
        onQuestionUpdated={mockOnQuestionUpdated}
        onClose={mockOnClose}
      />
    </ValidationContext.Provider>
  );
};

describe("EditQuestionForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiUpdateQuestion.mockResolvedValue({
      ...mockQuestionMultipleChoice,
      questionText: "Updated Question Text",
    });
  });

  test("renders with initial question details (multiple-choice)", () => {
    renderComponent(mockQuestionMultipleChoice);
    expect(screen.getByLabelText(/Question Text/i)).toHaveValue(
      mockQuestionMultipleChoice.questionText
    );
    expect(screen.getByLabelText(/Question Type/i)).toHaveValue(
      mockQuestionMultipleChoice.questionType
    );
    expect(screen.getByLabelText(/Categories/i)).toHaveValue(
      mockQuestionMultipleChoice.categories.join(", ")
    );

    mockQuestionMultipleChoice.options.forEach((opt) => {
      expect(screen.getByDisplayValue(opt.text)).toBeInTheDocument();
    });
  });

  test("renders with initial question details (true-false)", () => {
    renderComponent(mockQuestionTrueFalse);
    expect(screen.getByLabelText(/Question Text/i)).toHaveValue(
      mockQuestionTrueFalse.questionText
    );
    expect(screen.getByLabelText(/Question Type/i)).toHaveValue(
      mockQuestionTrueFalse.questionType
    );

    // For true-false, options are fixed, check their presence and values
    expect(screen.getByLabelText("True")).toBeInTheDocument();
    expect(screen.getByLabelText("False")).toBeInTheDocument();
    const trueRadio = screen.getByLabelText("True") as HTMLInputElement;
    expect(trueRadio.checked).toBe(
      mockQuestionTrueFalse.options.find((o) => o.text === "True")?.isCorrect
    );
  });

  test("allows changing question text", async () => {
    renderComponent();
    const textInput = screen.getByLabelText(/Question Text/i);
    fireEvent.change(textInput, { target: { value: "New question text" } });
    expect(textInput).toHaveValue("New question text");

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => {
      expect(mockApiUpdateQuestion).toHaveBeenCalledWith(
        mockQuestionMultipleChoice._id,
        expect.objectContaining({
          questionText: "New question text",
        })
      );
    });
    expect(mockOnQuestionUpdated).toHaveBeenCalled();
  });

  test("allows changing categories", async () => {
    renderComponent();
    const categoriesInput = screen.getByLabelText(/Categories/i);
    fireEvent.change(categoriesInput, {
      target: { value: "NewCat1, NewCat2" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => {
      expect(mockApiUpdateQuestion).toHaveBeenCalledWith(
        mockQuestionMultipleChoice._id,
        expect.objectContaining({
          categories: ["NewCat1", "NewCat2"],
        })
      );
    });
  });

  describe("Option Management", () => {
    test("allows changing option text for multiple-choice", async () => {
      renderComponent(mockQuestionMultipleChoice);
      const firstOptionInput = screen.getByDisplayValue(
        mockQuestionMultipleChoice.options[0].text
      );
      fireEvent.change(firstOptionInput, {
        target: { value: "Updated Option 1 Text" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() => {
        expect(mockApiUpdateQuestion).toHaveBeenCalledWith(
          mockQuestionMultipleChoice._id,
          expect.objectContaining({
            options: expect.arrayContaining([
              expect.objectContaining({
                text: "Updated Option 1 Text",
                isCorrect: false,
              }),
            ]),
          })
        );
      });
    });

    test("allows changing correct option for multiple-choice-single", async () => {
      renderComponent(mockQuestionMultipleChoice); // opt2 is initially correct
      // Find the radio button for the first option (index 0)
      // The options are rendered with an input for text and a checkbox/radio for isCorrect
      // Let's assume checkboxes are used for 'isCorrect' and have accessible names or roles
      // Option inputs query removed as it's unused in current test implementation
      const firstOptionCorrectCheckbox = screen.getAllByRole("checkbox")[0]; // Assuming order matches options

      fireEvent.click(firstOptionCorrectCheckbox); // Click to make first option correct

      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() => {
        expect(mockApiUpdateQuestion).toHaveBeenCalledWith(
          mockQuestionMultipleChoice._id,
          expect.objectContaining({
            options: expect.arrayContaining([
              expect.objectContaining({
                text: mockQuestionMultipleChoice.options[0].text,
                isCorrect: true,
              }),
              expect.objectContaining({
                text: mockQuestionMultipleChoice.options[1].text,
                isCorrect: false,
              }), // Previously correct
            ]),
          })
        );
      });
    });

    test("allows adding an option for multiple-choice (if less than 6)", async () => {
      renderComponent(mockQuestionMultipleChoice); // Has 3 options
      const addOptionButton = screen.getByRole("button", {
        name: /Add Option/i,
      });
      fireEvent.click(addOptionButton);

      // Now there should be 4 option text inputs
      const optionTextInputs = screen.getAllByRole("textbox", {
        name: /Option \d text/i,
      });
      expect(optionTextInputs).toHaveLength(4);
      // Fill the new option to make it valid for submission
      fireEvent.change(optionTextInputs[3], {
        target: { value: "New Option 4" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() => {
        expect(mockApiUpdateQuestion).toHaveBeenCalledWith(
          mockQuestionMultipleChoice._id,
          expect.objectContaining({
            options: expect.arrayContaining([
              expect.objectContaining({
                text: "New Option 4",
                isCorrect: false,
              }),
            ]),
          })
        );
      });
    });

    test("allows removing an option for multiple-choice (if more than 2)", async () => {
      renderComponent(mockQuestionMultipleChoice); // Has 3 options
      // Get all remove buttons (XMarkIcon)
      const removeOptionButtons = screen.getAllByRole("button", {
        name: /Remove option/i,
      });
      fireEvent.click(removeOptionButtons[0]); // Remove the first option

      // Now there should be 2 option text inputs
      const optionTextInputs = screen.getAllByRole("textbox", {
        name: /Option \d text/i,
      });
      expect(optionTextInputs).toHaveLength(2);
      // Ensure the removed option is not part of the submission
      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() => {
        expect(mockApiUpdateQuestion).toHaveBeenCalledWith(
          mockQuestionMultipleChoice._id,
          expect.objectContaining({
            options: expect.not.arrayContaining([
              expect.objectContaining({
                text: mockQuestionMultipleChoice.options[0].text,
              }),
            ]),
          })
        );
      });
    });
  });

  describe("Question Type Change", () => {
    test("resets options when changing type to true-false", () => {
      renderComponent(mockQuestionMultipleChoice);
      const typeSelect = screen.getByLabelText(/Question Type/i);
      fireEvent.change(typeSelect, { target: { value: "true-false" } });

      expect(screen.getByLabelText("True")).toBeInTheDocument();
      expect(screen.getByLabelText("False")).toBeInTheDocument();
      // Check default for True/False
      const trueRadio = screen.getByLabelText("True") as HTMLInputElement;
      expect(trueRadio.checked).toBe(true); // Component defaults 'True' to correct
    });

    test("submits with new options when type changes to true-false", async () => {
      renderComponent(mockQuestionMultipleChoice);
      const typeSelect = screen.getByLabelText(/Question Type/i);
      fireEvent.change(typeSelect, { target: { value: "true-false" } });

      // User might change which is correct, e.g. make False correct
      const falseRadio = screen.getByLabelText("False") as HTMLInputElement;
      fireEvent.click(falseRadio); // Make False correct

      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() => {
        expect(mockApiUpdateQuestion).toHaveBeenCalledWith(
          mockQuestionMultipleChoice._id,
          expect.objectContaining({
            questionType: "true-false",
            options: [
              { text: "True", isCorrect: false },
              { text: "False", isCorrect: true },
            ],
          })
        );
      });
    });

    test("resets options when changing type to multiple-choice-single", () => {
      renderComponent(mockQuestionTrueFalse); // Start with True/False
      const typeSelect = screen.getByLabelText(/Question Type/i);
      fireEvent.change(typeSelect, {
        target: { value: "multiple-choice-single" },
      });

      // Should default to 2 blank options
      const optionTextInputs = screen.getAllByRole("textbox", {
        name: /Option \d text/i,
      });
      expect(optionTextInputs).toHaveLength(2);
      expect(optionTextInputs[0]).toHaveValue("");
      expect(optionTextInputs[1]).toHaveValue("");
    });
  });

  describe("Validation", () => {
    test("shows error if question text is empty", async () => {
      renderComponent();
      fireEvent.change(screen.getByLabelText(/Question Text/i), {
        target: { value: "  " },
      });
      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      expect(
        await screen.findByText("Question text cannot be empty.")
      ).toBeInTheDocument();
      expect(mockApiUpdateQuestion).not.toHaveBeenCalled();
    });

    test("shows error if option text is empty for multiple-choice", async () => {
      renderComponent(mockQuestionMultipleChoice);
      const firstOptionInput = screen.getAllByRole("textbox", {
        name: /Option \d text/i,
      })[0];
      fireEvent.change(firstOptionInput, { target: { value: "  " } });
      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      expect(
        await screen.findByText(
          "All option texts must be filled for multiple choice questions."
        )
      ).toBeInTheDocument();
    });

    test("shows error if no correct option for multiple-choice-single", async () => {
      renderComponent(mockQuestionMultipleChoice);
      // Make all options incorrect - uncheck the currently correct one
      const correctOptionCheckbox = screen.getAllByRole("checkbox")[1]; // opt2 is initially correct
      fireEvent.click(correctOptionCheckbox); // Uncheck it

      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      expect(
        await screen.findByText(
          "Single-answer and True/False questions must have exactly one correct option."
        )
      ).toBeInTheDocument();
    });

    test("shows error if categories are empty", async () => {
      renderComponent();
      fireEvent.change(screen.getByLabelText(/Categories/i), {
        target: { value: "  " },
      });
      fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
      expect(
        await screen.findByText("Please provide at least one category.")
      ).toBeInTheDocument();
    });
  });

  test('shows "No changes detected" if submitted without changes', async () => {
    renderComponent(mockQuestionMultipleChoice);
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    expect(
      await screen.findByText("No changes detected to save.")
    ).toBeInTheDocument();
    expect(mockApiUpdateQuestion).not.toHaveBeenCalled();
  });

  test("handles API error on submission", async () => {
    mockApiUpdateQuestion.mockRejectedValueOnce(new Error("Failed to update"));
    mockFormatErrorMessage.mockReturnValueOnce("Formatted API Error");
    renderComponent();
    // Make a valid change
    fireEvent.change(screen.getByLabelText(/Question Text/i), {
      target: { value: "Trigger API Call" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(await screen.findByText("Formatted API Error")).toBeInTheDocument();
    expect(mockOnQuestionUpdated).not.toHaveBeenCalled();
  });

  test("calls onClose when close button is clicked", () => {
    renderComponent();
    // Assuming there's a general close button for the form/modal, not just option removal
    // The component props has onClose, typically triggered by a parent modal
    // If EditQuestionForm itself has a close button, test it. Otherwise, this tests if the prop is callable.
    // For this test, let's assume the form does not have its own visible "Close" button,
    // but `onClose` might be called programmatically or by a parent.
    // We can test if `onClose` is called on successful submission or by a cancel button.
    // The component has "Cancel" button logic which should call onClose.
    const cancelButton = screen.getByRole("button", { name: /Cancel/i }); // Or 'Close' if that's the text
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("updates form when questionToEdit prop changes", () => {
    const { rerender } = renderComponent(mockQuestionMultipleChoice);

    const newQuestionData: IQuestion = {
      ...mockQuestionTrueFalse, // Use a different question type
      _id: "q-new",
      questionText: "Is Pluto a planet?",
      categories: ["Space"],
    };

    rerender(
      <ValidationContext.Provider value={mockValidationFunctions}>
        <EditQuestionForm
          questionToEdit={newQuestionData}
          onQuestionUpdated={mockOnQuestionUpdated}
          onClose={mockOnClose}
        />
      </ValidationContext.Provider>
    );

    expect(screen.getByLabelText(/Question Text/i)).toHaveValue(
      newQuestionData.questionText
    );
    expect(screen.getByLabelText(/Question Type/i)).toHaveValue(
      newQuestionData.questionType
    );
    expect(screen.getByLabelText(/Categories/i)).toHaveValue(
      newQuestionData.categories.join(", ")
    );
    expect(screen.getByLabelText("True")).toBeInTheDocument(); // From true-false type
  });
});
