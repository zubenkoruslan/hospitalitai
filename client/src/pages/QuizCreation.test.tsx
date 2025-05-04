import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  act,
} from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext"; // Adjust path if needed
import { NotificationProvider } from "../context/NotificationContext"; // Adjust path if needed
import QuizCreation from "./QuizCreation";
import api from "../services/api"; // Adjust path if needed
import { useAuth } from "../context/AuthContext";
import { Menu } from "../types/menuItemTypes"; // Assuming Menu type is here
import "@testing-library/jest-dom";

// Mock the api module
jest.mock("../services/api"); // Keep the original path here for Jest's automocking
const mockedApi = api as jest.Mocked<typeof api>;

// Mock child components that might cause issues if not mocked
jest.mock("../components/Navbar", () => {
  // Simple functional component mock
  const MockNavbar = () => <div data-testid="navbar-mock">Navbar</div>;
  return MockNavbar;
});
jest.mock("../components/QuizAssignment", () => ({
  default: () => <div data-testid="quiz-assignment-mock">Quiz Assignment</div>,
}));

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock Auth Context
jest.mock("../context/AuthContext");

// Mock Child Components
jest.mock("../components/common/LoadingSpinner", () => ({
  default: () => <div role="status">Loading...</div>,
}));
jest.mock("../components/common/ErrorMessage", () => ({
  default: ({ message }: { message: string }) => (
    <div role="alert">{message}</div>
  ),
}));
jest.mock("../components/common/SuccessNotification", () => ({
  default: ({ message }: { message: string }) => (
    <div role="status" aria-live="polite">
      {message}
    </div>
  ),
}));
jest.mock("../components/quiz/QuizList", () => ({
  default: jest.fn(() => <div data-testid="quiz-list-mock">Quiz List</div>),
}));
jest.mock("../components/quiz/CreateQuizModal", () => ({
  default: jest.fn(() => (
    <div data-testid="create-quiz-modal-mock">Create Quiz Modal</div>
  )),
}));
jest.mock("../components/quiz/QuizEditorModal", () => ({
  default: jest.fn(() => (
    <div data-testid="quiz-editor-modal-mock">Quiz Editor Modal</div>
  )),
}));
jest.mock("../components/quiz/QuizResultsModal", () => ({
  default: jest.fn(() => (
    <div data-testid="quiz-results-modal-mock">Quiz Results Modal</div>
  )),
}));

// Type assertions for mocks
const mockedUseAuth = useAuth as jest.Mock;
const MockedQuizList = jest.requireMock("../components/quiz/QuizList").default;
const MockedCreateQuizModal = jest.requireMock(
  "../components/quiz/CreateQuizModal"
).default;
const MockedQuizEditorModal = jest.requireMock(
  "../components/quiz/QuizEditorModal"
).default;
const MockedSuccessNotification = jest.requireMock(
  "../components/common/SuccessNotification"
).default;

describe("QuizCreation Component", () => {
  const mockUser = {
    name: "Test Manager",
    restaurantId: "resto1",
    role: "restaurant",
  };
  const mockMenus: Menu[] = [
    { _id: "m1", name: "Menu One", description: "Desc 1" },
    { _id: "m2", name: "Menu Two", description: "Desc 2" },
  ];
  const mockQuizzes: any[] = [
    {
      _id: "q1",
      title: "Quiz One",
      menuItemIds: ["m1"],
      questions: [
        {
          text: "q1t",
          choices: ["a", "b"],
          correctAnswer: 0,
          menuItemId: "i1",
        },
      ],
      restaurantId: "resto1",
    },
    {
      _id: "q2",
      title: "Quiz Two",
      menuItemIds: ["m2"],
      questions: [
        {
          text: "q2t",
          choices: ["c", "d"],
          correctAnswer: 1,
          menuItemId: "i2",
        },
      ],
      restaurantId: "resto1",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Successful load, authorized user
    mockedUseAuth.mockReturnValue({ user: mockUser, isLoading: false });
    mockedApi.get.mockImplementation(async (url) => {
      if (url === "/quiz") {
        return { data: { quizzes: mockQuizzes } };
      } else if (url === "/menus") {
        return { data: { menus: mockMenus } };
      } else {
        throw new Error(`Unexpected GET request: ${url}`);
      }
    });
    // Reset component mocks
    MockedQuizList.mockClear();
    MockedCreateQuizModal.mockClear();
    MockedQuizEditorModal.mockClear();
    // Mock other methods used (POST, PUT, DELETE) - initially resolve successfully
    mockedApi.post.mockResolvedValue({ data: { message: "Success" } });
    mockedApi.put.mockResolvedValue({ data: { message: "Success" } });
    mockedApi.delete.mockResolvedValue({ data: { message: "Success" } });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        {/* Temporarily remove providers to isolate rendering issues */}
        {/* <AuthProvider>
          <NotificationProvider> */}
        <QuizCreation />
        {/* </NotificationProvider>
        </AuthProvider> */}
      </MemoryRouter>
    );

  it("should show loading state initially for quizzes and menus", () => {
    // Override mock to simulate initial loading
    mockedApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    mockedUseAuth.mockReturnValue({ user: null, isLoading: true }); // Also ensure auth starts loading
    renderComponent();
    // Check for at least one loading spinner
    expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("quiz-list-mock")).not.toBeInTheDocument();
  });

  it("should render quiz list and create button on successful load", async () => {
    // Ensure useAuth provides user immediately for this test
    mockedUseAuth.mockReturnValue({ user: mockUser, isLoading: false });
    renderComponent();
    // Increase timeout for waitFor just in case rendering is slow initially
    await waitFor(
      () => {
        expect(screen.getByTestId("quiz-list-mock")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Check props passed to QuizList
    expect(MockedQuizList).toHaveBeenCalledWith(
      expect.objectContaining({
        quizzes: mockQuizzes,
        onEdit: expect.any(Function),
        onDeleteRequest: expect.any(Function),
        onAssign: expect.any(Function),
      }),
      {}
    );
    expect(
      screen.getByRole("button", { name: /Create New Quiz/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should display error if fetching quizzes fails", async () => {
    const errorMsg = "Failed to fetch quizzes.";
    mockedApi.get.mockImplementation(async (url) => {
      if (url === "/quiz") {
        throw { response: { data: { message: errorMsg } } };
      } else if (url === "/menus") {
        return { data: { menus: mockMenus } };
      }
      throw new Error("Unexpected GET");
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(errorMsg);
    });
    expect(screen.queryByTestId("quiz-list-mock")).not.toBeInTheDocument();
  });

  it("should display error if fetching menus fails", async () => {
    const errorMsg = "Failed to fetch menus.";
    mockedApi.get.mockImplementation(async (url) => {
      if (url === "/quiz") {
        return { data: { quizzes: mockQuizzes } };
      } else if (url === "/menus") {
        throw { response: { data: { message: errorMsg } } };
      }
      throw new Error("Unexpected GET");
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(errorMsg);
    });
    // Quiz list might still render if quizzes loaded okay
    await waitFor(() => {
      expect(screen.getByTestId("quiz-list-mock")).toBeInTheDocument();
    });
  });

  it("should open Create Quiz Modal when create button is clicked", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("quiz-list-mock")).toBeInTheDocument();
    });

    // Check modal is not initially rendered (or is mocked but not visible)
    // We check if the mock was called with isOpen=false initially, assuming it controls rendering
    expect(MockedCreateQuizModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false }),
      {}
    );

    // Click the create button
    fireEvent.click(screen.getByRole("button", { name: /Create New Quiz/i }));

    // Check if the modal mock is now called with isOpen=true and correct props
    await waitFor(() => {
      expect(MockedCreateQuizModal).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
          menus: mockMenus,
          isLoadingMenus: false, // Assuming menus loaded successfully
          isGenerating: false,
          // Check for onClose and onSubmit props
          onClose: expect.any(Function),
          onSubmit: expect.any(Function),
        }),
        {}
      );
    });
  });

  // Add tests for other modal interactions, generation, saving, deletion next

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

  it("should handle quiz generation successfully", async () => {
    renderComponent();
    await waitFor(() => {
      expect(MockedCreateQuizModal).toHaveBeenCalled();
    });

    // Simulate opening the modal (find its props and call onClose/onSubmit)
    const createModalProps = MockedCreateQuizModal.mock.calls[0][0]; // Get props of the first call

    // Simulate submitting the create/generate form from the modal
    const generatedQuiz = {
      _id: "gen1",
      title: "Generated Quiz",
      menuItemIds: ["m1"],
      questions: [
        { text: "g1", choices: ["a", "b"], correctAnswer: 0, menuItemId: "i1" },
      ],
      restaurantId: "resto1",
    };
    mockedApi.post.mockResolvedValueOnce({ data: { quiz: generatedQuiz } });

    // Call the onSubmit passed to the modal
    await act(async () => {
      await createModalProps.onSubmit("Generated Quiz", ["m1"]);
    });

    // Check API call
    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/quiz/auto", {
        title: "Generated Quiz",
        menuIds: ["m1"],
      });
    });

    // Check if editor modal is opened with the new quiz
    expect(MockedQuizEditorModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: true, quizData: generatedQuiz }),
      {}
    );
    // Check if create modal was closed
    expect(MockedCreateQuizModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false }),
      {}
    );
  });

  it("should handle saving edited quiz successfully", async () => {
    renderComponent();
    await waitFor(() => {
      expect(MockedQuizEditorModal).toHaveBeenCalled();
    });

    // Simulate opening the editor modal (e.g., via QuizList interaction - simplified here)
    // Find the props passed to the editor modal mock
    // For simplicity, let's assume it was opened with the first mock quiz
    // Add type definition for the mock call argument
    const editorModalProps = MockedQuizEditorModal.mock.calls.find(
      (call: any[]) => call[0].quizData?._id === "q1"
    )?.[0];

    // If the modal wasn't opened initially (which it shouldn't be), simulate it opening
    // This part might need adjustment based on how editing is triggered (e.g., clicking edit in QuizList)
    // We'll manually trigger the state change for the test as if edit was clicked.
    // In a real test, you might simulate the click in QuizList's mock or the parent.
    act(() => {
      // This simulates the internal setQuizForEditOrPreview(mockQuizzes[0])
      // We re-render or find the props again after the state update
    });
    // For now, let's assume the props are somehow available after an edit action
    // We need a way to get the props AFTER the modal is supposedly opened
    // Let's just mock the call that would happen if it were open:
    // Add type definition for the mock call argument
    const saveHandler = MockedQuizEditorModal.mock.calls.find(
      (call: any[]) => call[0].isOpen
    )?.[0]?.onSave;
    const editedQuizData = { ...mockQuizzes[0], title: "Edited Quiz One" };

    if (saveHandler) {
      // Simulate saving from the editor modal
      mockedApi.put.mockResolvedValueOnce({ data: { quiz: editedQuizData } });

      await act(async () => {
        await saveHandler(editedQuizData);
      });

      // Check API call
      await waitFor(() => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/quiz/${editedQuizData._id}`,
          editedQuizData
        );
      });

      // Check success notification
      await waitFor(() => {
        expect(MockedSuccessNotification).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Quiz saved successfully!" }),
          {}
        );
      });

      // Check if quiz list data was updated (implicitly tested by checking QuizList props if refetch happens)
      // Or check if fetchQuizzes was called again (mock api.get for /quiz again)
      expect(mockedApi.get).toHaveBeenCalledWith("/quiz"); // Check if refetch happened
    } else {
      throw new Error("Could not find onSave handler for QuizEditorModal mock");
    }
  });

  it("should handle deleting a quiz successfully", async () => {
    // Mock window.confirm to return true
    global.confirm = jest.fn(() => true);

    renderComponent();
    await waitFor(() => {
      expect(MockedQuizList).toHaveBeenCalled();
    });

    // Find the props passed to QuizList to get the onDeleteRequest handler
    const quizListProps = MockedQuizList.mock.calls[0][0];
    const quizToDelete = mockQuizzes[0];

    // Simulate calling onDeleteRequest from the QuizList
    await act(async () => {
      await quizListProps.onDeleteRequest(quizToDelete);
    });

    // Check confirm was called
    expect(global.confirm).toHaveBeenCalledWith(
      `Are you sure you want to delete the quiz "${quizToDelete.title}"?`
    );

    // Check API call
    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith(
        `/quiz/${quizToDelete._id}`
      );
    });

    // Check success notification
    await waitFor(() => {
      expect(MockedSuccessNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Quiz deleted successfully!" }),
        {}
      );
    });

    // Check if quiz list was refetched
    expect(mockedApi.get).toHaveBeenCalledWith("/quiz"); // Should be called again after delete
  });
});
