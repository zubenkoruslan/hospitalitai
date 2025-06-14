import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import QuizList from "./QuizList";
import { ClientIQuiz } from "../../types/quizTypes";

const MockLoadingSpinner = ({ message }: { message?: string }) => (
  <div data-testid="loading-spinner">{message || "Loading..."}</div>
);
MockLoadingSpinner.displayName = "MockLoadingSpinner";
jest.mock("../common/LoadingSpinner", () => MockLoadingSpinner);

const mockQuizzes: ClientIQuiz[] = [
  {
    _id: "quiz1",
    title: "Appetizer Quiz",
    description: "Test your appetizer knowledge",
    restaurantId: "resto1",
    sourceQuestionBankIds: ["qb1"],
    numberOfQuestionsPerAttempt: 5,
    totalUniqueQuestionsInSourceSnapshot: 10,
    isAvailable: true,
    createdAt: new Date("2023-01-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2023-01-02T10:00:00Z").toISOString(),
  },
  {
    _id: "quiz2",
    title: "Main Course Master",
    description: "For the main course experts",
    restaurantId: "resto1",
    sourceQuestionBankIds: ["qb2"],
    numberOfQuestionsPerAttempt: 10,
    totalUniqueQuestionsInSourceSnapshot: 20,
    isAvailable: false,
    createdAt: new Date("2023-02-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2023-02-02T10:00:00Z").toISOString(),
  },
  {
    _id: "quiz3",
    title: "Dessert Challenge",
    description: undefined, // Test undefined description
    restaurantId: "resto1",
    sourceQuestionBankIds: ["qb3"],
    numberOfQuestionsPerAttempt: 3,
    totalUniqueQuestionsInSourceSnapshot: undefined, // Test undefined snapshot
    isAvailable: true,
    createdAt: new Date("2023-03-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2023-03-02T10:00:00Z").toISOString(),
  },
];

describe("QuizList Component", () => {
  let mockOnPreview: jest.Mock;
  let mockOnActivate: jest.Mock;
  let mockOnDeactivate: jest.Mock;
  let mockOnDelete: jest.Mock;
  let mockOnViewProgress: jest.Mock;
  let mockGetMenuItemNames: jest.Mock;

  beforeEach(() => {
    mockOnPreview = jest.fn();
    mockOnActivate = jest.fn();
    mockOnDeactivate = jest.fn();
    mockOnDelete = jest.fn();
    mockOnViewProgress = jest.fn();
    mockGetMenuItemNames = jest.fn((quiz) => `Menus for ${quiz.title}`); // Simplified mock
  });

  const renderQuizList = (
    quizzes: ClientIQuiz[] = mockQuizzes,
    isLoading = false,
    isDeletingQuizId: string | null = null
  ) => {
    render(
      <QuizList
        quizzes={quizzes}
        isLoading={isLoading}
        onPreview={mockOnPreview}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
        onViewProgress={mockOnViewProgress}
        isDeletingQuizId={isDeletingQuizId}
        getMenuItemNames={mockGetMenuItemNames}
      />
    );
  };

  test("shows loading spinner when isLoading is true", () => {
    renderQuizList([], true);
    expect(screen.getByTestId("loading-spinner")).toHaveTextContent(
      "Loading quizzes..."
    );
  });

  test('shows "no quizzes found" message when quizzes array is empty and not loading', () => {
    renderQuizList([], false);
    expect(
      screen.getByText("No quizzes found. Create one to get started!")
    ).toBeInTheDocument();
  });

  test("renders a list of quizzes with correct details", () => {
    renderQuizList();
    expect(screen.getAllByRole("listitem").length).toBe(mockQuizzes.length);

    // Check details for the first quiz
    const quiz1 = mockQuizzes[0];
    expect(screen.getByText(quiz1.title)).toBeInTheDocument();
    expect(
      screen.getByText(`Description: ${quiz1.description}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Questions Per Attempt: ${quiz1.numberOfQuestionsPerAttempt}`
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Total Unique Questions in Source: ${quiz1.totalUniqueQuestionsInSourceSnapshot}`
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Created: ${new Date(quiz1.createdAt!).toLocaleDateString()}`
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument(); // Based on isAvailable = true

    // Check details for the second quiz (isAvailable = false)
    const quiz2 = mockQuizzes[1];
    expect(screen.getByText(quiz2.title)).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument(); // Based on isAvailable = false

    // Check details for third quiz (undefined description and snapshot)
    const quiz3 = mockQuizzes[2];
    expect(screen.getByText(quiz3.title)).toBeInTheDocument();
    expect(screen.getByText("Description: N/A")).toBeInTheDocument();
    expect(
      screen.getByText("Total Unique Questions in Source: N/A")
    ).toBeInTheDocument();
  });

  describe("Button Interactions and Callbacks", () => {
    test('calls onPreview when "Edit / Preview" button is clicked', () => {
      renderQuizList();
      const previewButtons = screen.getAllByRole("button", {
        name: /Edit \/ Preview/i,
      });
      fireEvent.click(previewButtons[0]);
      expect(mockOnPreview).toHaveBeenCalledWith(mockQuizzes[0]);
    });

    test("calls onDeactivate for an active quiz", () => {
      renderQuizList();
      const deactivateButton = screen.getByRole("button", {
        name: `Deactivate quiz ${mockQuizzes[0].title}`,
      });
      fireEvent.click(deactivateButton);
      expect(mockOnDeactivate).toHaveBeenCalledWith(mockQuizzes[0]._id);
    });

    test("calls onActivate for a draft quiz", () => {
      renderQuizList();
      const activateButton = screen.getByRole("button", {
        name: `Activate quiz ${mockQuizzes[1].title}`,
      });
      fireEvent.click(activateButton);
      expect(mockOnActivate).toHaveBeenCalledWith(mockQuizzes[1]._id);
    });

    test('calls onViewProgress when "View Progress" button is clicked', () => {
      renderQuizList();
      const progressButtons = screen.getAllByRole("button", {
        name: /View Progress/i,
      });
      fireEvent.click(progressButtons[0]);
      expect(mockOnViewProgress).toHaveBeenCalledWith(mockQuizzes[0]._id);
    });

    test('calls onDelete when "Delete" button is clicked', () => {
      renderQuizList();
      const deleteButtons = screen.getAllByRole("button", {
        name: /Delete quiz/i,
      });
      fireEvent.click(deleteButtons[0]);
      expect(mockOnDelete).toHaveBeenCalledWith(mockQuizzes[0]);
    });

    test('buttons are disabled and Delete shows "Deleting..." when isDeletingQuizId matches', () => {
      renderQuizList(mockQuizzes, false, mockQuizzes[0]._id);

      const quiz1ListItem = screen
        .getByText(mockQuizzes[0].title)
        .closest("li");
      expect(quiz1ListItem).not.toBeNull();

      const quiz1Controls = within(quiz1ListItem!);

      const previewButton = quiz1Controls.getByRole("button", {
        name: /Edit \/ Preview/i,
      });
      expect(previewButton).toBeDisabled();

      const deactivateButton = quiz1Controls.getByRole("button", {
        name: /Deactivate quiz/i,
      });
      expect(deactivateButton).toBeDisabled();

      const progressButton = quiz1Controls.getByRole("button", {
        name: /View Progress/i,
      });
      expect(progressButton).toBeDisabled();

      const deleteButton = quiz1Controls.getByRole("button", {
        name: /Deleting.../i,
      });
      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveTextContent("Deleting...");
    });

    test("other quiz buttons remain enabled when one quiz is being deleted", () => {
      renderQuizList(mockQuizzes, false, mockQuizzes[0]._id); // Deleting quiz1

      // Buttons for quiz2 should be enabled
      const quiz2ListItem = screen
        .getByText(mockQuizzes[1].title)
        .closest("li");
      expect(quiz2ListItem).not.toBeNull();

      const quiz2Controls = within(quiz2ListItem!);

      const previewButtonQuiz2 = quiz2Controls.getByRole("button", {
        name: /Edit \/ Preview/i,
      });
      expect(previewButtonQuiz2).not.toBeDisabled();

      const activateButtonQuiz2 = quiz2Controls.getByRole("button", {
        name: /Activate quiz/i,
      });
      expect(activateButtonQuiz2).not.toBeDisabled();

      const deleteButtonQuiz2 = quiz2Controls.getByRole("button", {
        name: `Delete quiz ${mockQuizzes[1].title}`,
      });
      expect(deleteButtonQuiz2).not.toBeDisabled();
      expect(deleteButtonQuiz2).toHaveTextContent("Delete");
    });
  });
});
