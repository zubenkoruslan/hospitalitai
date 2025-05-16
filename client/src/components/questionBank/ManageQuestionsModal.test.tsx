import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManageQuestionsModal from "./ManageQuestionsModal";
import { ValidationContext } from "../../context/ValidationContext";
import * as apiService from "../../services/api";
import { IQuestionBank, IQuestion } from "../../types/questionBankTypes";

// Mock API service functions
jest.mock("../../services/api", () => ({
  // Corrected list of mocked functions based on actual api.ts exports
  // fetchQuestionsForBank: jest.fn(), // Removed, does not exist in api.ts
  addQuestionToBank: jest.fn(),
  removeQuestionFromBank: jest.fn(),
  // deleteQuestionFromBank: jest.fn(), // Removed, does not exist as such; component might intend removeQuestionFromBank or deleteQuestion (if it's for standalone questions)
  updateQuestion: jest.fn(),
  createQuestion: jest.fn(),
  generateAiQuestions: jest.fn(), // Corrected name
  getQuestionBankById: jest.fn(), // Added as it might be used by sub-components or related logic
  getQuestionById: jest.fn(), // ++ Add getQuestionById to the mock
  // Add other genuinely exported and used functions as needed
}));

// Mock Child Forms/Modals and Common Components
jest.mock(
  "./AddManualQuestionForm",
  () => (props: any) =>
    props.isAddManualModalOpen || props.isOpen ? (
      <div data-testid="mock-add-manual-form">
        <h3>Add Manual Question Form</h3>
        <button
          onClick={() =>
            props.onQuestionAdded({
              _id: "newManualQ1",
              questionText: "Manual Q",
              options: [],
              categories: [],
              questionType: "multiple-choice-single",
              restaurantId: "res123", // Added
              createdBy: "manual", // Added
              createdAt: new Date().toISOString(), // Added
              updatedAt: new Date().toISOString(), // Added
            })
          }
        >
          Mock Add
        </button>
        <button onClick={props.onCloseRequest || props.onClose}>
          Close AddManualForm
        </button>
      </div>
    ) : null
);

jest.mock(
  "./GenerateAiQuestionsForm",
  () => (props: any) =>
    props.isGenerateAiModalOpen || props.isOpen ? (
      <div data-testid="mock-generate-ai-form">
        <h3>Generate AI Questions Form</h3>
        <button
          onClick={() =>
            props.onQuestionsGenerated([
              {
                _id: "newAiQ1",
                questionText: "AI Q",
                options: [],
                categories: [],
                questionType: "multiple-choice-single",
              },
            ])
          }
        >
          Mock Generate
        </button>
        <button onClick={props.onClose}>Close GenerateAiForm</button>
      </div>
    ) : null
);

jest.mock(
  "./EditQuestionForm",
  () => (props: any) =>
    props.isOpen && props.questionToEdit ? (
      <div data-testid="mock-edit-question-form">
        <h3>Edit Question Form: {props.questionToEdit.questionText}</h3>
        <button
          onClick={() =>
            props.onQuestionUpdated({
              ...props.questionToEdit,
              questionText: "Updated Q",
            })
          }
        >
          Mock Update
        </button>
        <button onClick={props.onClose}>Close EditForm</button>
      </div>
    ) : null
);

jest.mock(
  "../common/Modal",
  () => (props: any) =>
    props.isOpen ? (
      <div
        data-testid="mock-modal"
        role="dialog"
        aria-labelledby={
          props.title &&
          props.title.replace(/\s+/g, "-").toLowerCase() + "-title"
        }
      >
        {props.title && (
          <h1 id={props.title.replace(/\s+/g, "-").toLowerCase() + "-title"}>
            {props.title}
          </h1>
        )}
        <div>{props.children}</div>
        {props.footerContent && <footer>{props.footerContent}</footer>}
        <button onClick={props.onClose}>MockModalCloseButton</button>
      </div>
    ) : null
);

jest.mock("../common/Button", () => (props: any) => (
  <button {...props} disabled={props.disabled}>
    {props.children}
  </button>
));
jest.mock("../common/LoadingSpinner", () => () => (
  <div data-testid="loading-spinner">Loading...</div>
));
jest.mock(
  "../common/ErrorMessage",
  () =>
    ({ message }: { message: string }) =>
      (
        <div data-testid="error-message" role="alert">
          {message}
        </div>
      )
);
jest.mock("../common/ConfirmationModalContent", () => (props: any) => (
  <div data-testid="mock-confirmation-modal">
    <p>{props.message}</p>
    <button onClick={props.onConfirm}>Confirm</button>
    <button onClick={props.onCancel}>Cancel</button>
  </div>
));
jest.mock("./QuestionListItem", () => (props: any) => (
  <div data-testid={`question-list-item-${props.question._id}`}>
    <p>{props.question.questionText}</p>
    <button onClick={() => props.onEdit(props.question)}>Edit</button>
    <button onClick={() => props.onDelete(props.question)}>Delete</button>{" "}
    {/* Changed from onRemove to onDelete to match a prop in component */}
  </div>
));

const mockOnClose = jest.fn();
const mockOnBankQuestionsUpdated = jest.fn();

const baseMockBank: IQuestionBank = {
  // Renamed to baseMockBank for clarity in tests
  _id: "bank1",
  name: "Test Bank",
  description: "A bank for testing",
  restaurantId: "res123",
  questions: [],
  questionCount: 2, // This might need to be dynamic based on mockQuestions
  categories: ["General", "Specifics"],
  createdBy: "user1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockQuestions: IQuestion[] = [
  {
    _id: "q1",
    questionText: "Question 1?",
    questionType: "multiple-choice-single",
    options: [{ text: "A", isCorrect: true }],
    categories: ["General"],
    difficulty: "easy",
    restaurantId: "res123",
    createdBy: "manual",
    createdAt: new Date().toISOString(), // So we can sort by this
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "q2",
    questionText: "Question 2?",
    questionType: "true-false",
    options: [{ text: "True", isCorrect: true }],
    categories: ["Specifics"],
    difficulty: "medium",
    restaurantId: "res123",
    createdBy: "ai",
    createdAt: new Date(Date.now() - 100000).toISOString(), // Ensure different createdAt for sorting tests
    updatedAt: new Date().toISOString(),
  },
];

const mockValidationContextValue = {
  formatErrorMessage: jest.fn(
    (err) =>
      err?.response?.data?.message ||
      err?.message ||
      "An unexpected error occurred."
  ),
  // Add other validation functions if ManageQuestionsModal starts using them directly
  isValidName: jest.fn(() => ({ valid: true })),
  isValidPrice: jest.fn(() => ({ valid: true })),
  isValidDescription: jest.fn(() => ({ valid: true })),
  isValidIngredient: jest.fn(() => ({ valid: true })),
  isValidEmail: jest.fn(() => ({ valid: true })),
};

const renderManageQuestionsModal = (bankProps?: Partial<IQuestionBank>) => {
  const currentBank = {
    ...baseMockBank,
    ...bankProps,
    questionCount: bankProps?.questions?.length ?? mockQuestions.length,
  };
  return render(
    <ValidationContext.Provider value={mockValidationContextValue as any}>
      <ManageQuestionsModal
        bank={currentBank}
        onClose={mockOnClose}
        onBankQuestionsUpdated={mockOnBankQuestionsUpdated}
      />
    </ValidationContext.Provider>
  );
};

describe("ManageQuestionsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful load: bank returns populated questions
    (apiService.getQuestionBankById as jest.Mock).mockResolvedValue({
      ...baseMockBank,
      questions: mockQuestions,
      questionCount: mockQuestions.length,
    });
    (apiService.getQuestionById as jest.Mock).mockImplementation(
      async (id) => mockQuestions.find((q) => q._id === id) || null
    );
    (apiService.removeQuestionFromBank as jest.Mock).mockImplementation(
      async (bankId, questionId) => {
        // Simulate backend returning the updated bank
        const updatedQuestions = mockQuestions.filter(
          (q) => q._id !== questionId
        );
        return {
          ...baseMockBank,
          _id: bankId,
          questions: updatedQuestions,
          questionCount: updatedQuestions.length,
        };
      }
    );
  });

  describe("Initial Question Loading", () => {
    test("loads and displays questions when bank provides populated question objects", async () => {
      renderManageQuestionsModal();
      expect(apiService.getQuestionBankById).toHaveBeenCalledWith(
        baseMockBank._id
      );
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Check if questions are rendered (using QuestionListItem mock)
      for (const question of mockQuestions) {
        expect(
          await screen.findByTestId(`question-list-item-${question._id}`)
        ).toBeInTheDocument();
        expect(screen.getByText(question.questionText)).toBeInTheDocument(); // From QuestionListItem mock
      }
      expect(apiService.getQuestionById).not.toHaveBeenCalled(); // Should not be called if questions are populated
    });

    test("loads and displays questions when bank provides question IDs", async () => {
      (apiService.getQuestionBankById as jest.Mock).mockResolvedValueOnce({
        ...baseMockBank,
        questions: mockQuestions.map((q) => q._id), // Return only IDs
        questionCount: mockQuestions.length,
      });

      renderManageQuestionsModal();
      expect(apiService.getQuestionBankById).toHaveBeenCalledWith(
        baseMockBank._id
      );
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

      await waitFor(() => {
        expect(apiService.getQuestionById).toHaveBeenCalledTimes(
          mockQuestions.length
        );
        for (const question of mockQuestions) {
          expect(apiService.getQuestionById).toHaveBeenCalledWith(question._id);
          expect(
            screen.getByTestId(`question-list-item-${question._id}`)
          ).toBeInTheDocument();
        }
      });
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    test("displays empty message if no questions are found", async () => {
      (apiService.getQuestionBankById as jest.Mock).mockResolvedValueOnce({
        ...baseMockBank,
        questions: [],
        questionCount: 0,
      });
      renderManageQuestionsModal({ questions: [], questionCount: 0 });

      await waitFor(() => {
        expect(
          screen.getByText("No questions found in this bank.")
        ).toBeInTheDocument();
      });
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    test("handles error during question loading", async () => {
      const errorMessage = "Failed to load questions, network broke";
      (apiService.getQuestionBankById as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );
      mockValidationContextValue.formatErrorMessage.mockReturnValueOnce(
        errorMessage
      );

      renderManageQuestionsModal();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          errorMessage
        );
      });
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(/question-list-item-/)
      ).not.toBeInTheDocument();
    });
  });

  // TODO: Update tests for Add Manual, Generate AI, Edit Question if needed (props, interactions)
  // These might be largely okay as they interact with mocked forms.

  describe("Deleting a Question", () => {
    test("successfully deletes a question after confirmation", async () => {
      renderManageQuestionsModal();
      await waitFor(() => {
        // Wait for questions to load
        expect(
          screen.getByTestId(`question-list-item-${mockQuestions[0]._id}`)
        ).toBeInTheDocument();
      });

      const questionToDelete = mockQuestions[0];
      const deleteButtonInListItem = within(
        screen.getByTestId(`question-list-item-${questionToDelete._id}`)
      ).getByRole("button", { name: /Delete/i });
      fireEvent.click(deleteButtonInListItem);

      // Confirmation modal should appear
      const confirmationModal = await screen.findByTestId(
        "mock-confirmation-modal"
      );
      expect(confirmationModal).toBeInTheDocument();
      expect(confirmationModal).toHaveTextContent(
        `Are you sure you want to remove the question "${questionToDelete.questionText}"`
      );

      const confirmButton = within(confirmationModal).getByRole("button", {
        name: /Confirm/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(apiService.removeQuestionFromBank).toHaveBeenCalledWith(
          baseMockBank._id,
          questionToDelete._id
        );
      });

      // Check onBankQuestionsUpdated was called with the bank returned by the API mock
      const expectedUpdatedBank = {
        ...baseMockBank,
        questions: mockQuestions.filter((q) => q._id !== questionToDelete._id),
        questionCount: mockQuestions.length - 1,
      };
      expect(mockOnBankQuestionsUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: baseMockBank._id,
          questionCount: expectedUpdatedBank.questionCount,
        })
      );

      // Remove the TODO comment as the component bug is fixed.
      // The component now updates its local `questions` state from `updatedBank.questions`.
      // The success message should appear
      expect(
        await screen.findByText(/Question ".*" removed from bank./)
      ).toBeInTheDocument();

      // The local questions list IS NOW updated by the component.
      expect(
        screen.queryByTestId(`question-list-item-${questionToDelete._id}`)
      ).not.toBeInTheDocument();
    });

    test("handles error during question deletion", async () => {
      renderManageQuestionsModal();
      await waitFor(() => {
        expect(
          screen.getByTestId(`question-list-item-${mockQuestions[0]._id}`)
        ).toBeInTheDocument();
      });

      const questionToDelete = mockQuestions[0];
      const errorMessage = "Deletion failed horribly";
      (apiService.removeQuestionFromBank as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );
      mockValidationContextValue.formatErrorMessage.mockReturnValueOnce(
        errorMessage
      );

      const deleteButtonInListItem = within(
        screen.getByTestId(`question-list-item-${questionToDelete._id}`)
      ).getByRole("button", { name: /Delete/i });
      fireEvent.click(deleteButtonInListItem);

      const confirmationModal = await screen.findByTestId(
        "mock-confirmation-modal"
      );
      const confirmButton = within(confirmationModal).getByRole("button", {
        name: /Confirm/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          errorMessage
        );
      });
      expect(mockOnBankQuestionsUpdated).not.toHaveBeenCalled();
      // Question should still be in the list as deletion failed
      expect(
        screen.getByTestId(`question-list-item-${questionToDelete._id}`)
      ).toBeInTheDocument();
    });

    test("cancels deletion from confirmation modal", async () => {
      renderManageQuestionsModal();
      await waitFor(() => {
        expect(
          screen.getByTestId(`question-list-item-${mockQuestions[0]._id}`)
        ).toBeInTheDocument();
      });

      const questionToDelete = mockQuestions[0];
      const deleteButtonInListItem = within(
        screen.getByTestId(`question-list-item-${questionToDelete._id}`)
      ).getByRole("button", { name: /Delete/i });
      fireEvent.click(deleteButtonInListItem);

      const confirmationModal = await screen.findByTestId(
        "mock-confirmation-modal"
      );
      const cancelButton = within(confirmationModal).getByRole("button", {
        name: /Cancel/i,
      });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId("mock-confirmation-modal")
        ).not.toBeInTheDocument();
      });
      expect(apiService.removeQuestionFromBank).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(`question-list-item-${questionToDelete._id}`)
      ).toBeInTheDocument(); // Still there
    });
  });

  // Add tests for AddManualQuestionForm, GenerateAiQuestionsForm, EditQuestionForm interactions
  // Example for AddManualQuestionForm opening:
  test("opens AddManualQuestionForm when 'Add Manual Question' is clicked", async () => {
    renderManageQuestionsModal();
    await waitFor(() =>
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument()
    ); // Ensure loading is done

    const addButton = screen.getByRole("button", {
      name: /Add Manual Question/i,
    });
    fireEvent.click(addButton);

    expect(
      await screen.findByTestId("mock-add-manual-form")
    ).toBeInTheDocument();
  });

  // Test for closing modal
  test("calls onClose when the main modal's close button is clicked", async () => {
    renderManageQuestionsModal();
    await waitFor(() =>
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument()
    );

    // The Modal mock has a button with text "MockModalCloseButton"
    const closeButton = screen.getByRole("button", {
      name: /MockModalCloseButton/i,
    });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

// Helper to use 'within' more easily if needed, though screen queries are often sufficient
import { within } from "@testing-library/react";
