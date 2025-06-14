import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import EditQuizModal from "./EditQuizModal";
import * as apiService from "../../services/api";
import { IQuestionBank } from "../../types/questionBankTypes";
import { ClientIQuiz } from "../../types/quizTypes";

// Mock services
jest.mock("../../services/api");
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock common components
const MockModal = ({ isOpen, title, footerContent, children }: any) =>
  isOpen ? (
    <div data-testid="modal">
      <h1>{title}</h1>
      <div data-testid="modal-children">{children}</div>
      <div data-testid="modal-footer">{footerContent}</div>
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
  {
    _id: "qb3",
    name: "Bank 3",
    description: "Desc 3",
    restaurantId: "r1",
    questions: [],
    questionCount: 8,
    categories: ["Other"],
    createdBy: "user-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockInitialQuiz: ClientIQuiz = {
  _id: "quizToEdit123",
  title: "Initial Quiz Title",
  description: "Initial quiz description.",
  restaurantId: "r1",
  sourceQuestionBankIds: ["qb1", "qb2"],
  numberOfQuestionsPerAttempt: 7,
  isAvailable: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockUpdatedQuiz: ClientIQuiz = {
  ...mockInitialQuiz,
  title: "Updated Quiz Title",
  sourceQuestionBankIds: ["qb3"],
  numberOfQuestionsPerAttempt: 10,
};

describe("EditQuizModal", () => {
  let mockOnClose: jest.Mock;
  let mockOnQuizUpdated: jest.Mock;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnQuizUpdated = jest.fn();
    mockedApiService.getQuestionBanks.mockReset();
    mockedApiService.updateQuizDetails.mockReset();
  });

  const renderModal = (
    isOpen: boolean,
    initialData: ClientIQuiz | null = mockInitialQuiz
  ) => {
    return render(
      <EditQuizModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onQuizUpdated={mockOnQuizUpdated}
        initialQuizData={initialData}
      />
    );
  };

  test("renders nothing when isOpen is false", () => {
    renderModal(false);
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  test("renders modal with title and pre-filled form when isOpen is true", async () => {
    mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    renderModal(true);

    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Edit Quiz")).toBeInTheDocument();

    expect(screen.getByLabelText(/Title/)).toHaveValue(mockInitialQuiz.title);
    expect(screen.getByLabelText(/Description/)).toHaveValue(
      mockInitialQuiz.description
    );
    expect(
      screen.getByLabelText(/Number of Questions Per Attempt/)
    ).toHaveValue(mockInitialQuiz.numberOfQuestionsPerAttempt);

    await waitFor(() => {
      expect(screen.getByLabelText("Bank 1 (10 questions)")).toBeChecked();
      expect(screen.getByLabelText("Bank 2 (5 questions)")).toBeChecked();
      expect(screen.getByLabelText("Bank 3 (8 questions)")).not.toBeChecked();
    });
  });

  test("resets form if initialQuizData is null (though primarily for edit)", async () => {
    mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    renderModal(true, null);

    expect(screen.getByLabelText(/Title/)).toHaveValue("");
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(
      screen.getByLabelText(/Number of Questions Per Attempt/)
    ).toHaveValue(10); // Default value
    await waitFor(() => {
      expect(screen.getByLabelText("Bank 1 (10 questions)")).not.toBeChecked();
    });
    // Error message should be displayed if trying to submit with null initialData
    const submitButton = screen.getByTestId("button-primary-submit");
    fireEvent.click(submitButton);
    expect(await screen.findByTestId("error-message")).toHaveTextContent(
      "Cannot update quiz: Quiz ID is missing."
    );
  });

  describe("Fetching Question Banks", () => {
    test("fetches and displays question banks", async () => {
      mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
      renderModal(true);
      expect(mockedApiService.getQuestionBanks).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("loading-spinner")).toHaveTextContent(
        "Loading question banks..."
      );
      await waitFor(() => {
        expect(screen.getByText("Bank 1")).toBeInTheDocument();
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });
    });

    test("shows error if fetching banks fails", async () => {
      mockedApiService.getQuestionBanks.mockRejectedValue(
        new Error("Fetch failed")
      );
      renderModal(true);
      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Failed to load question banks. Please try again later."
        );
      });
    });
  });

  describe("Form Input and Interaction", () => {
    beforeEach(() => {
      mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    });

    test("allows updating form fields", async () => {
      renderModal(true);
      await waitFor(() =>
        expect(screen.getByText("Bank 1")).toBeInTheDocument()
      );

      fireEvent.change(screen.getByLabelText(/Title/), {
        target: { value: "New Title" },
      });
      expect(screen.getByLabelText(/Title/)).toHaveValue("New Title");

      fireEvent.click(screen.getByLabelText("Bank 3 (8 questions)"));
      expect(screen.getByLabelText("Bank 3 (8 questions)")).toBeChecked();
    });

    test("Save Changes button is disabled/enabled based on validation", async () => {
      renderModal(true);
      await waitFor(() =>
        expect(
          screen.getByLabelText("Bank 1 (10 questions)")
        ).toBeInTheDocument()
      );
      const submitButton = screen.getByTestId("button-primary-submit");

      expect(submitButton).not.toBeDisabled(); // Initially enabled with valid pre-filled data

      fireEvent.change(screen.getByLabelText(/Title/), {
        target: { value: " " },
      });
      expect(submitButton).toBeDisabled(); // Title becomes invalid

      fireEvent.change(screen.getByLabelText(/Title/), {
        target: { value: "Valid Again" },
      });
      expect(submitButton).not.toBeDisabled();

      // Deselect all banks
      fireEvent.click(screen.getByLabelText("Bank 1 (10 questions)"));
      fireEvent.click(screen.getByLabelText("Bank 2 (5 questions)"));
      expect(submitButton).toBeDisabled(); // No banks selected
    });
  });

  describe("Form Submission (Update Quiz)", () => {
    beforeEach(async () => {
      mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
      renderModal(true);
      await waitFor(() =>
        expect(screen.getByText("Bank 1")).toBeInTheDocument()
      );
      // Modify some fields for update
      fireEvent.change(screen.getByLabelText(/Title/), {
        target: { value: mockUpdatedQuiz.title },
      });
      fireEvent.change(
        screen.getByLabelText(/Number of Questions Per Attempt/),
        {
          target: {
            value: mockUpdatedQuiz.numberOfQuestionsPerAttempt.toString(),
          },
        }
      );
      // Deselect qb1, qb2 and select qb3
      fireEvent.click(screen.getByLabelText("Bank 1 (10 questions)"));
      fireEvent.click(screen.getByLabelText("Bank 2 (5 questions)"));
      fireEvent.click(screen.getByLabelText("Bank 3 (8 questions)"));
    });

    test("successfully updates quiz and calls callbacks", async () => {
      mockedApiService.updateQuizDetails.mockResolvedValue(mockUpdatedQuiz);
      fireEvent.click(screen.getByTestId("button-primary-submit"));

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

      await waitFor(() =>
        expect(mockedApiService.updateQuizDetails).toHaveBeenCalledTimes(1)
      );
      expect(mockedApiService.updateQuizDetails).toHaveBeenCalledWith(
        mockInitialQuiz._id,
        {
          title: mockUpdatedQuiz.title,
          description: mockInitialQuiz.description, // Unchanged description
          sourceQuestionBankIds: ["qb3"],
          numberOfQuestionsPerAttempt:
            mockUpdatedQuiz.numberOfQuestionsPerAttempt,
        }
      );
      expect(mockOnQuizUpdated).toHaveBeenCalledWith(mockUpdatedQuiz);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("shows validation error if quiz ID is missing (initialData is null)", async () => {
      // This case is tricky to set up perfectly as the form populates from initialData.
      // We already tested that submitting with initialData=null shows the error.
      // Here, we simulate a scenario where initialData somehow becomes null before submit, or ID is null.
      render(
        <EditQuizModal
          isOpen={true}
          onClose={mockOnClose}
          onQuizUpdated={mockOnQuizUpdated}
          initialQuizData={{ ...mockInitialQuiz, _id: null as any }}
        />
      );
      await waitFor(() =>
        expect(screen.getByText("Bank 1")).toBeInTheDocument()
      ); // wait for banks
      fireEvent.click(screen.getByTestId("button-primary-submit"));
      expect(await screen.findByTestId("error-message")).toHaveTextContent(
        "Cannot update quiz: Quiz ID is missing."
      );
    });

    test("displays API error on update failure", async () => {
      const errorMessage = "Update failed on server";
      mockedApiService.updateQuizDetails.mockRejectedValue({
        response: { data: { message: errorMessage } },
      });
      fireEvent.click(screen.getByTestId("button-primary-submit"));

      await waitFor(() =>
        expect(mockedApiService.updateQuizDetails).toHaveBeenCalledTimes(1)
      );
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        errorMessage
      );
      expect(mockOnQuizUpdated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  test("form fields update if initialQuizData prop changes", async () => {
    mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    const { rerender } = renderModal(true, mockInitialQuiz);
    await waitFor(() =>
      expect(screen.getByLabelText("Bank 1 (10 questions)")).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/Title/)).toHaveValue(mockInitialQuiz.title);

    const newInitialData: ClientIQuiz = {
      ...mockInitialQuiz,
      _id: "newQuiz456",
      title: "Newly Loaded Quiz Title",
      sourceQuestionBankIds: ["qb3"],
    };

    act(() => {
      rerender(
        <EditQuizModal
          isOpen={true}
          onClose={mockOnClose}
          onQuizUpdated={mockOnQuizUpdated}
          initialQuizData={newInitialData}
        />
      );
    });

    // Banks might re-fetch or be re-evaluated, wait for a known element from banks list
    await waitFor(() =>
      expect(screen.getByLabelText("Bank 3 (8 questions)")).toBeInTheDocument()
    );

    expect(screen.getByLabelText(/Title/)).toHaveValue(newInitialData.title);
    expect(screen.getByLabelText("Bank 1 (10 questions)")).not.toBeChecked();
    expect(screen.getByLabelText("Bank 3 (8 questions)")).toBeChecked();
  });

  // Test case for initialQuizData change (if modal is persistent and data can change)
  // This is a more advanced scenario, might not be strictly needed if modal always unmounts/remounts
  test("updates form fields if initialQuizData prop changes while modal is open", async () => {
    mockedApiService.getQuestionBanks.mockResolvedValue(mockQuestionBanks);
    render(
      <EditQuizModal
        isOpen={true}
        onClose={mockOnClose}
        onQuizUpdated={mockOnQuizUpdated}
        initialQuizData={mockInitialQuiz}
      />
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Bank 1 (10 questions)")).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/Title/)).toHaveValue(mockInitialQuiz.title);

    const newInitialData: ClientIQuiz = {
      ...mockInitialQuiz,
      _id: "newQuiz456",
      title: "Newly Loaded Quiz Title",
      sourceQuestionBankIds: ["qb3"],
    };

    act(() => {
      render(
        <EditQuizModal
          isOpen={true}
          onClose={mockOnClose}
          onQuizUpdated={mockOnQuizUpdated}
          initialQuizData={newInitialData}
        />
      );
    });

    // Banks might re-fetch or be re-evaluated, wait for a known element from banks list
    await waitFor(() =>
      expect(screen.getByLabelText("Bank 3 (8 questions)")).toBeInTheDocument()
    );

    expect(screen.getByLabelText(/Title/)).toHaveValue(newInitialData.title);
    expect(screen.getByLabelText("Bank 1 (10 questions)")).not.toBeChecked();
    expect(screen.getByLabelText("Bank 3 (8 questions)")).toBeChecked();
  });
});
