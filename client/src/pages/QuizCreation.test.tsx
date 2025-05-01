import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext"; // Adjust path if needed
import { NotificationProvider } from "../context/NotificationContext"; // Adjust path if needed
import QuizCreation from "./QuizCreation";
import api from "../services/api"; // Adjust path if needed

// Mock the api module
jest.mock("../services/api"); // Keep the original path here for Jest's automocking
const mockedApi = api as jest.Mocked<typeof api>;

// Mock child components that might cause issues if not mocked
jest.mock("../components/Navbar", () => {
  // Simple functional component mock
  const MockNavbar = () => <div data-testid="navbar-mock">Navbar</div>;
  return MockNavbar;
});
jest.mock("../components/QuizAssignment", () => () => (
  <div data-testid="quiz-assignment-mock">Quiz Assignment</div>
));

// Mock window.confirm
global.confirm = jest.fn(() => true);

describe("QuizCreation Component", () => {
  // Helper function to render the component within providers
  const renderComponent = () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <QuizCreation />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockedApi.get.mockClear();
    mockedApi.post.mockClear();
    mockedApi.put.mockClear();
    mockedApi.delete.mockClear();
    (global.confirm as jest.Mock).mockClear();

    // Default mock implementations
    mockedApi.get.mockImplementation((url) => {
      if (url === "/quiz") {
        return Promise.resolve({ data: { quizzes: [] } }); // Default to no quizzes
      }
      if (url === "/menus") {
        return Promise.resolve({ data: { menus: [] } }); // Default to no menus
      }
      return Promise.reject(new Error(`Unhandled GET request: ${url}`));
    });
  });

  test("renders loading state initially", () => {
    renderComponent();
    // Check for loading spinner using data-testid
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  test("renders empty state when no quizzes are fetched", async () => {
    // Override default mock for this test
    mockedApi.get
      .mockResolvedValueOnce({ data: { quizzes: [] } })
      .mockResolvedValueOnce({ data: { menus: [] } });
    renderComponent();

    // Wait for the loading spinner to disappear
    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    // Now assert that the empty state is shown
    expect(screen.getByText(/No quizzes found/i)).toBeInTheDocument();
  });

  test("displays a list of quizzes when fetched", async () => {
    const mockQuizzes = [
      {
        _id: "quiz1",
        title: "Quiz One",
        menuItemIds: [{ _id: "menu1", name: "Menu A" }],
        questions: [
          {
            text: "Q1",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 0,
            menuItemId: "item1",
          },
        ],
        restaurantId: "res1",
        isAssigned: false,
        createdAt: new Date().toISOString(),
      },
      {
        _id: "quiz2",
        title: "Quiz Two",
        menuItemIds: [{ _id: "menu2", name: "Menu B" }],
        questions: [
          {
            text: "Q2",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 1,
            menuItemId: "item2",
          },
        ],
        restaurantId: "res1",
        isAssigned: true,
        createdAt: new Date().toISOString(),
      },
    ];
    mockedApi.get
      .mockResolvedValueOnce({ data: { quizzes: mockQuizzes } })
      .mockResolvedValueOnce({ data: { menus: [] } }); // Mock menus fetch too

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Quiz One")).toBeInTheDocument();
    expect(screen.getByText("Quiz Two")).toBeInTheDocument();
    // Check for assigned label on Quiz Two
    expect(screen.getByText("Quiz Two").closest("li")).toHaveTextContent(
      "Assigned"
    );
    // Check buttons for unassigned quiz
    const quizOneItem = screen.getByText("Quiz One").closest("li");
    expect(within(quizOneItem!).getByText("Preview")).toBeInTheDocument();
    expect(within(quizOneItem!).getByText("Edit")).toBeInTheDocument();
    expect(within(quizOneItem!).getByText("Assign")).toBeInTheDocument();
    expect(within(quizOneItem!).getByText("Delete")).toBeInTheDocument();

    // Check buttons for assigned quiz
    const quizTwoItem = screen.getByText("Quiz Two").closest("li");
    expect(within(quizTwoItem!).getByText("Preview")).toBeInTheDocument();
    expect(within(quizTwoItem!).queryByText("Edit")).not.toBeInTheDocument();
    expect(within(quizTwoItem!).queryByText("Assign")).not.toBeInTheDocument();
    expect(within(quizTwoItem!).getByText("Delete")).toBeInTheDocument();
  });

  test("opens and closes the Create New Quiz modal", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    // Modal should not be visible initially
    expect(
      screen.queryByRole("heading", { name: /Create New Quiz/i })
    ).not.toBeInTheDocument();

    // Click the create button
    fireEvent.click(screen.getByRole("button", { name: /Create New Quiz/i }));

    // Modal should be visible
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Create New Quiz/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Quiz Title/i)).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    // Modal should close
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /Create New Quiz/i })
      ).not.toBeInTheDocument();
    });
  });

  test("opens Preview modal in view mode and toggles edit mode for unassigned quiz", async () => {
    const mockQuizzes = [
      {
        _id: "quiz1",
        title: "Preview Quiz Title",
        menuItemIds: [{ _id: "menu1", name: "Menu A" }],
        questions: [
          {
            text: "Q1 text",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 0,
            menuItemId: "item1",
          },
        ],
        restaurantId: "res1",
        isAssigned: false,
        createdAt: new Date().toISOString(),
      },
    ];
    mockedApi.get
      .mockResolvedValueOnce({ data: { quizzes: mockQuizzes } })
      .mockResolvedValueOnce({ data: { menus: [] } });

    renderComponent();

    const quizItem = await screen.findByText("Preview Quiz Title");
    const listItem = quizItem.closest("li");
    expect(listItem).toBeInTheDocument();

    // Click preview button within the list item
    const previewButton = within(listItem!).getByRole("button", {
      name: /Preview/i,
    });
    fireEvent.click(previewButton);

    // Modal should open in preview mode
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /Preview Quiz: Preview Quiz Title/i,
        })
      ).toBeInTheDocument();
    });
    // Use regex to find the question text, ignoring the number prefix
    expect(screen.getByText(/Q1 text/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Edit Questions/i })
    ).toBeInTheDocument(); // Should see Edit button
    expect(
      screen.queryByRole("button", { name: /Add Question/i })
    ).not.toBeInTheDocument(); // Add question button hidden
    expect(
      screen.queryByRole("button", { name: /Save Quiz/i })
    ).not.toBeInTheDocument(); // Save button hidden

    // Click Edit Questions button
    fireEvent.click(screen.getByRole("button", { name: /Edit Questions/i }));

    // Should switch to Edit mode
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Edit Quiz: Preview Quiz Title/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Exit Edit Mode/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Question/i })
    ).toBeInTheDocument(); // Add question button visible
    expect(
      screen.getByRole("button", { name: /Save Quiz/i })
    ).toBeInTheDocument(); // Save button visible
    expect(screen.getByDisplayValue("Q1 text")).toBeInTheDocument(); // Input field with question text

    // Click Close
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: /Edit Quiz: Preview Quiz Title/i,
        })
      ).not.toBeInTheDocument();
    });
  });

  test("opens Preview modal and disables editing for assigned quiz", async () => {
    const mockQuizzes = [
      {
        _id: "quizAssigned",
        title: "Assigned Quiz",
        menuItemIds: [{ _id: "menu1", name: "Menu A" }],
        questions: [
          {
            text: "Assigned Q1",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 0,
            menuItemId: "item1",
          },
        ],
        restaurantId: "res1",
        isAssigned: true,
        createdAt: new Date().toISOString(),
      },
    ];
    mockedApi.get
      .mockResolvedValueOnce({ data: { quizzes: mockQuizzes } })
      .mockResolvedValueOnce({ data: { menus: [] } });

    renderComponent();

    const quizItem = await screen.findByText("Assigned Quiz");
    const listItem = quizItem.closest("li");
    expect(listItem).toBeInTheDocument();

    // Click preview button within the list item
    const previewButton = within(listItem!).getByRole("button", {
      name: /Preview/i,
    });
    fireEvent.click(previewButton);

    // Modal should open in preview mode, editing disabled
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Preview Quiz: Assigned Quiz/i })
      ).toBeInTheDocument();
    });
    // Use regex to find the question text
    expect(screen.getByText(/Assigned Q1/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Quiz has been assigned. Editing disabled./i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Edit Questions/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add Question/i })
    ).not.toBeInTheDocument();
  });

  test("opens Add Question modal when in edit mode", async () => {
    const mockQuizzes = [
      {
        _id: "quiz1",
        title: "Quiz For Adding Questions",
        menuItemIds: [{ _id: "menu1", name: "Menu A" }],
        questions: [
          {
            text: "Initial Q",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 0,
            menuItemId: "item1",
          },
        ],
        restaurantId: "res1",
        isAssigned: false,
        createdAt: new Date().toISOString(),
      },
    ];
    mockedApi.get
      .mockResolvedValueOnce({ data: { quizzes: mockQuizzes } })
      .mockResolvedValueOnce({ data: { menus: [] } });

    renderComponent();

    const quizItem = await screen.findByText("Quiz For Adding Questions");
    const listItem = quizItem.closest("li");
    expect(listItem).toBeInTheDocument();

    // Click Edit button on the quiz list item
    const editButton = within(listItem!).getByRole("button", { name: /Edit/i });
    fireEvent.click(editButton);

    // Wait for preview modal to open in edit mode
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /Edit Quiz: Quiz For Adding Questions/i,
        })
      ).toBeInTheDocument();
    });

    // Click Add Question button (inside the modal header)
    fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));

    // Find the modal by its heading
    const addQuestionModal = await screen.findByRole("heading", {
      name: /Add New Question/i,
    });
    const modalContainer = addQuestionModal.closest(
      'div[role="dialog"], div.fixed'
    ) as HTMLElement | null; // Adjust selector and assert type
    expect(modalContainer).toBeInTheDocument();

    // Ensure modalContainer is not null before using within
    if (!modalContainer)
      throw new Error("Add Question modal container not found");

    expect(
      within(modalContainer).getByPlaceholderText(/Enter question text/i)
    ).toBeInTheDocument();
    // Find the modal's Add Question button within the modal container
    const addQuestionSubmitButton = within(modalContainer).getByRole("button", {
      name: /Add Question/i,
    });
    expect(addQuestionSubmitButton).toBeInTheDocument();

    // Close the Add Question modal (e.g., by clicking Cancel within the modal)
    const cancelButton = within(modalContainer).getByRole("button", {
      name: /Cancel/i,
    });
    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: /Add New Question/i,
        })
      ).not.toBeInTheDocument();
    });

    // Close the Preview/Edit modal
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: /Edit Quiz: Quiz For Adding Questions/i,
        })
      ).not.toBeInTheDocument();
    });
  });

  test("handles quiz deletion confirmation", async () => {
    const mockQuizzes = [
      {
        _id: "quizToDelete",
        title: "Quiz To Delete",
        menuItemIds: [{ _id: "menu1", name: "Menu A" }],
        questions: [
          {
            text: "Q Del",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 0,
            menuItemId: "item1",
          },
        ],
        restaurantId: "res1",
        isAssigned: false,
        createdAt: new Date().toISOString(),
      },
    ];
    mockedApi.get
      .mockResolvedValueOnce({ data: { quizzes: mockQuizzes } })
      .mockResolvedValueOnce({ data: { menus: [] } });
    mockedApi.delete.mockResolvedValue({}); // Mock successful delete

    renderComponent();

    const quizItem = await screen.findByText("Quiz To Delete");
    const listItem = quizItem.closest("li");
    expect(listItem).toBeInTheDocument();

    // Click delete button within the list item
    const deleteButton = within(listItem!).getByRole("button", {
      name: /Delete/i,
    });
    fireEvent.click(deleteButton);

    // window.confirm mock should have been called
    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining(
        'Are you sure you want to delete the quiz "Quiz To Delete"?'
      )
    );

    // API delete should have been called
    expect(mockedApi.delete).toHaveBeenCalledWith("/quiz/quizToDelete");

    // Wait for potential UI updates (e.g., success message or item removal)
    // Depending on implementation, you might wait for the item to disappear
    await waitFor(() => {
      expect(screen.queryByText("Quiz To Delete")).not.toBeInTheDocument();
    });
  });

  test("opens Assignment modal for unassigned quiz", async () => {
    const mockQuizzes = [
      {
        _id: "quizToAssign",
        title: "Quiz To Assign",
        menuItemIds: [{ _id: "menu1", name: "Menu A" }],
        questions: [
          {
            text: "Q Assign",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 0,
            menuItemId: "item1",
          },
        ],
        restaurantId: "res1",
        isAssigned: false,
        createdAt: new Date().toISOString(),
      },
    ];
    mockedApi.get
      .mockResolvedValueOnce({ data: { quizzes: mockQuizzes } })
      .mockResolvedValueOnce({ data: { menus: [] } });

    renderComponent();

    const quizItem = await screen.findByText("Quiz To Assign");
    const listItem = quizItem.closest("li");
    expect(listItem).toBeInTheDocument();

    // Click Assign button within the list item
    const assignButton = within(listItem!).getByRole("button", {
      name: /Assign/i,
    });
    fireEvent.click(assignButton);

    // Expect the mock QuizAssignment component to be rendered
    await waitFor(() => {
      expect(screen.getByTestId("quiz-assignment-mock")).toBeInTheDocument();
    });

    // TODO: Could add interaction to close the mock modal if needed, depends on QuizAssignment mock/props
  });

  // TODO: Add tests for generating quiz from menus
  // TODO: Add tests for saving edits in preview/edit modal
  // TODO: Add tests for submitting answers in preview modal
});
