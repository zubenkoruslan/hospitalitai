import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import GenerateQuizFromBanksModal from "./GenerateQuizFromBanksModal";
import * as apiService from "../../services/api";
import { IQuestionBank } from "../../types/questionBankTypes";
import { ClientIQuiz } from "../../types/quizTypes";

// Mock services
jest.mock("../../services/api");
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock common components
const MockModal = ({ isOpen, onClose, title, footerContent, children }: any) =>
  isOpen ? (
    <div data-testid="modal">
      <h1>{title}</h1>
      <div data-testid="modal-children">{children}</div>
      <div data-testid="modal-footer">{footerContent}</div>
      <button onClick={onClose}>Close Modal</button>{" "}
      {/* For testing onClose via Modal interaction if needed */}
    </div>
  ) : null;
MockModal.displayName = "MockModal";
jest.mock("../common/Modal", () => MockModal);

const MockButton = ({
  onClick,
  children,
  variant,
  type,
  form,
  disabled,
  className,
}: any) => (
  <button
    data-testid={`button-${variant}${type === "submit" ? "-submit" : ""}`}
    onClick={onClick}
    type={type}
    form={form}
    disabled={disabled}
    className={className}
  >
    {children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

const MockLoadingSpinner = ({ message }: { message?: string }) => (
  <div data-testid="loading-spinner">{message || "Loading..."}</div>
);
MockLoadingSpinner.displayName = "MockLoadingSpinner";
jest.mock("../common/LoadingSpinner", () => MockLoadingSpinner);

const MockErrorMessage = ({ message }: { message: string }) => (
  <div data-testid="error-message">{message}</div>
);
MockErrorMessage.displayName = "MockErrorMessage";
jest.mock("../common/ErrorMessage", () => MockErrorMessage);

const mockQuestionBanks: IQuestionBank[] = [
  {
    _id: "qb1",
    name: "Bank 1",
    description: "Desc 1",
    restaurantId: "r1",
    questions: [],
    questionCount: 10,
    categories: ["General"],
    createdBy: "user-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "qb2",
    name: "Bank 2",
    description: "Desc 2",
    restaurantId: "r1",
    questions: [],
    questionCount: 5,
    categories: ["Specifics"],
    createdBy: "user-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockGeneratedQuiz: ClientIQuiz = {
  _id: "quiz123",
  title: "Generated Quiz",
  restaurantId: "r1",
  sourceQuestionBankIds: ["qb1"],
  numberOfQuestionsPerAttempt: 5,
  isAvailable: true,
};

describe("GenerateQuizFromBanksModal", () => {
  let mockOnClose: jest.Mock;
  let mockOnQuizGenerated: jest.Mock;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnQuizGenerated = jest.fn();
    mockedApiService.getQuestionBanks.mockReset();
    mockedApiService.generateQuizFromQuestionBanks.mockReset();
  });

  const renderModal = (isOpen: boolean) => {
    return render(
      <GenerateQuizFromBanksModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onQuizGenerated={mockOnQuizGenerated}
      />
    );
  };

  test("renders nothing when isOpen is false", () => {
    renderModal(false);
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  test("renders modal with title and initial elements when isOpen is true", async () => {
    mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    renderModal(true);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(
      screen.getByText("Generate Quiz from Question Banks")
    ).toBeInTheDocument();
    // Check for form elements (some might appear after banks load)
    expect(screen.getByLabelText(/Quiz Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Number of Questions Per Attempt/)
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Bank 1")).toBeInTheDocument());
  });

  describe("Fetching Question Banks", () => {
    test("fetches and displays question banks successfully", async () => {
      mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
      renderModal(true);
      expect(mockedApiService.getQuestionBanks).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("loading-spinner")).toHaveTextContent(
        "Loading question banks..."
      );
      await waitFor(() => {
        expect(screen.getByText("Bank 1")).toBeInTheDocument();
        expect(screen.getByText("Bank 2")).toBeInTheDocument();
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });
    });

    test("displays error message if fetching banks fails", async () => {
      mockedApiService.getQuestionBanks.mockRejectedValue(
        new Error("Fetch failed")
      );
      renderModal(true);
      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Failed to load question banks. Please try again later."
        );
        expect(screen.queryByText("Bank 1")).not.toBeInTheDocument();
      });
    });

    test('displays "no banks available" message if API returns empty array', async () => {
      mockedApiService.getQuestionBanks.mockResolvedValue([]);
      renderModal(true);
      await waitFor(() => {
        expect(
          screen.getByText(
            "No question banks available. You can create them in the 'Question Banks' section."
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Input and State", () => {
    beforeEach(() => {
      mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    });

    test("updates title state on input", async () => {
      renderModal(true);
      await waitFor(() =>
        expect(screen.getByLabelText(/Quiz Title/)).toBeInTheDocument()
      );
      const titleInput = screen.getByLabelText(
        /Quiz Title/
      ) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: "My New Quiz" } });
      expect(titleInput.value).toBe("My New Quiz");
    });

    test("updates description state on input", async () => {
      renderModal(true);
      await waitFor(() =>
        expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
      );
      const descInput = screen.getByLabelText(
        /Description/
      ) as HTMLTextAreaElement;
      fireEvent.change(descInput, { target: { value: "Quiz Description" } });
      expect(descInput.value).toBe("Quiz Description");
    });

    test("updates number of questions state on input", async () => {
      renderModal(true);
      await waitFor(() =>
        expect(
          screen.getByLabelText(/Number of Questions Per Attempt/)
        ).toBeInTheDocument()
      );
      const numInput = screen.getByLabelText(
        /Number of Questions Per Attempt/
      ) as HTMLInputElement;
      fireEvent.change(numInput, { target: { value: "15" } });
      expect(numInput.value).toBe("15");
    });

    test("selects and deselects question banks", async () => {
      renderModal(true);
      await waitFor(() =>
        expect(screen.getByText("Bank 1")).toBeInTheDocument()
      );
      const bank1Checkbox = screen.getByLabelText(
        "Bank 1 (10 questions)"
      ) as HTMLInputElement;
      const bank2Checkbox = screen.getByLabelText(
        "Bank 2 (5 questions)"
      ) as HTMLInputElement;

      fireEvent.click(bank1Checkbox);
      expect(bank1Checkbox.checked).toBe(true);
      fireEvent.click(bank2Checkbox);
      expect(bank2Checkbox.checked).toBe(true);
      fireEvent.click(bank1Checkbox);
      expect(bank1Checkbox.checked).toBe(false);
    });
  });

  describe("Form Validation and Submission Button State", () => {
    beforeEach(() => {
      mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    });

    test("Generate Quiz button is initially disabled or becomes disabled based on inputs", async () => {
      renderModal(true);
      await waitFor(() =>
        expect(
          screen.getByLabelText("Bank 1 (10 questions)")
        ).toBeInTheDocument()
      );

      const submitButton = screen.getByTestId("button-primary-submit");
      expect(submitButton).toBeDisabled(); // Initially disabled (no title)

      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "Test" },
      });
      expect(submitButton).toBeDisabled(); // Still disabled (no banks selected)

      fireEvent.click(screen.getByLabelText("Bank 1 (10 questions)"));
      expect(submitButton).not.toBeDisabled(); // Should be enabled now

      fireEvent.change(
        screen.getByLabelText(/Number of Questions Per Attempt/),
        { target: { value: "0" } }
      );
      expect(submitButton).toBeDisabled(); // Disabled if questions <= 0

      fireEvent.change(
        screen.getByLabelText(/Number of Questions Per Attempt/),
        { target: { value: "10" } }
      );
      expect(submitButton).not.toBeDisabled(); // Re-enabled

      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: " " },
      }); // Title with only space
      expect(submitButton).toBeDisabled(); // Disabled if title is whitespace
    });

    test("Cancel button calls onClose and is disabled during loading", async () => {
      mockedApiService.getQuestionBanks.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockQuestionBanks), 100)
          )
      );
      renderModal(true);
      const cancelButton = screen.getByTestId("button-secondary");

      expect(cancelButton).toBeDisabled(); // Disabled while banks are loading
      await waitFor(() => expect(cancelButton).not.toBeDisabled());

      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Form Submission", () => {
    beforeEach(async () => {
      mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
      renderModal(true);
      // Wait for banks to load and fill the form for submission tests
      await waitFor(() =>
        expect(
          screen.getByLabelText("Bank 1 (10 questions)")
        ).toBeInTheDocument()
      );
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "My Awesome Quiz" },
      });
      fireEvent.click(screen.getByLabelText("Bank 1 (10 questions)"));
      fireEvent.change(
        screen.getByLabelText(/Number of Questions Per Attempt/),
        { target: { value: "5" } }
      );
    });

    test("shows validation error if title is empty", async () => {
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByTestId("button-primary-submit"));
      expect(await screen.findByTestId("error-message")).toHaveTextContent(
        "Quiz title is required."
      );
      expect(
        mockedApiService.generateQuizFromQuestionBanks
      ).not.toHaveBeenCalled();
    });

    test("shows validation error if no banks selected", async () => {
      fireEvent.click(screen.getByLabelText("Bank 1 (10 questions)")); // Deselect
      fireEvent.click(screen.getByTestId("button-primary-submit"));
      expect(await screen.findByTestId("error-message")).toHaveTextContent(
        "Please select at least one question bank."
      );
      expect(
        mockedApiService.generateQuizFromQuestionBanks
      ).not.toHaveBeenCalled();
    });

    test("shows validation error if number of questions is zero", async () => {
      fireEvent.change(
        screen.getByLabelText(/Number of Questions Per Attempt/),
        { target: { value: "0" } }
      );
      fireEvent.click(screen.getByTestId("button-primary-submit"));
      expect(await screen.findByTestId("error-message")).toHaveTextContent(
        "Number of questions per attempt must be greater than zero."
      );
      expect(
        mockedApiService.generateQuizFromQuestionBanks
      ).not.toHaveBeenCalled();
    });

    test("successfully generates quiz and calls callbacks", async () => {
      mockedApiService.generateQuizFromQuestionBanks.mockResolvedValue(
        mockGeneratedQuiz
      );
      fireEvent.click(screen.getByTestId("button-primary-submit"));

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument(); // Check for loading state on submit button

      await waitFor(() =>
        expect(
          mockedApiService.generateQuizFromQuestionBanks
        ).toHaveBeenCalledTimes(1)
      );
      expect(
        mockedApiService.generateQuizFromQuestionBanks
      ).toHaveBeenCalledWith({
        title: "My Awesome Quiz",
        description: "", // Default description
        questionBankIds: ["qb1"],
        numberOfQuestionsPerAttempt: 5,
      });
      expect(mockOnQuizGenerated).toHaveBeenCalledWith(mockGeneratedQuiz);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("displays API error on submission failure", async () => {
      const errorMessage = "Network Error";
      mockedApiService.generateQuizFromQuestionBanks.mockRejectedValue({
        response: { data: { message: errorMessage } },
      });
      fireEvent.click(screen.getByTestId("button-primary-submit"));

      await waitFor(() =>
        expect(
          mockedApiService.generateQuizFromQuestionBanks
        ).toHaveBeenCalledTimes(1)
      );
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        errorMessage
      );
      expect(mockOnQuizGenerated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled(); // Modal stays open
    });

    test("displays default error on submission failure if no specific message", async () => {
      mockedApiService.generateQuizFromQuestionBanks.mockRejectedValue(
        new Error("Generic Error")
      );
      fireEvent.click(screen.getByTestId("button-primary-submit"));

      await waitFor(() =>
        expect(
          mockedApiService.generateQuizFromQuestionBanks
        ).toHaveBeenCalledTimes(1)
      );
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Failed to generate quiz. Please try again."
      );
    });
  });

  test("form fields are reset when modal is closed and reopened", async () => {
    // Initial open and populate
    mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    const { rerender } = renderModal(true);
    await waitFor(() =>
      expect(screen.getByLabelText("Bank 1 (10 questions)")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/Quiz Title/), {
      target: { value: "Old Title" },
    });
    fireEvent.click(screen.getByLabelText("Bank 1 (10 questions)"));
    fireEvent.change(screen.getByLabelText(/Number of Questions Per Attempt/), {
      target: { value: "3" },
    });

    // Close modal
    act(() => {
      // Simulate closing by re-rendering with isOpen: false, which triggers the cleanup effect
      rerender(
        <GenerateQuizFromBanksModal
          isOpen={false}
          onClose={mockOnClose}
          onQuizGenerated={mockOnQuizGenerated}
        />
      );
    });

    // Reopen modal
    mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks); // Ensure API is ready for next fetch
    act(() => {
      rerender(
        <GenerateQuizFromBanksModal
          isOpen={true}
          onClose={mockOnClose}
          onQuizGenerated={mockOnQuizGenerated}
        />
      );
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Bank 1 (10 questions)")).toBeInTheDocument()
    );

    expect(
      (screen.getByLabelText(/Quiz Title/) as HTMLInputElement).value
    ).toBe("");
    expect(
      (screen.getByLabelText(/Description/) as HTMLTextAreaElement).value
    ).toBe("");
    expect(
      (
        screen.getByLabelText(
          /Number of Questions Per Attempt/
        ) as HTMLInputElement
      ).value
    ).toBe("10");
    expect(
      (screen.getByLabelText("Bank 1 (10 questions)") as HTMLInputElement)
        .checked
    ).toBe(false);
    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
  });
});
