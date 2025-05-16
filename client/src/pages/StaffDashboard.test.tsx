import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import StaffDashboard from "./StaffDashboard";
import { useAuth, AuthContextType } from "../context/AuthContext";
import * as apiServices from "../services/api"; // Import all as apiServices to avoid conflict with default api export if any

// Import types directly from their source files
import { ClientUserMinimal, UserRole } from "../types/user";
import { ClientIQuiz, ClientQuizAttemptDetails } from "../types/quizTypes";
import { ClientStaffQuizProgressWithAttempts } from "../types/staffTypes";

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock AuthContext
jest.mock("../context/AuthContext");
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock api services
// We need to mock both the default export (axios instance) and named exports
jest.mock("../services/api", () => ({
  __esModule: true, // This is important for modules with default exports
  default: {
    get: jest.fn(), // Mocking the 'get' method of the default axios instance
    // Add other methods like post, patch if StaffDashboard uses them directly via api.post e.g.
  },
  // Mock named exports
  getAvailableQuizzesForStaff: jest.fn(),
  getMyQuizProgress: jest.fn(),
  getQuizAttemptDetails: jest.fn(),
  // Add any other named exports from api.ts that StaffDashboard uses
}));

// Cast the mocked service to its expected type for easier use in tests
const mockedApi = apiServices as jest.Mocked<typeof apiServices>;
const mockedAxiosInstance = apiServices.default as jest.Mocked<
  typeof apiServices.default
>; // For default export (api.get)

// Mock child components that are not the focus of these tests
const MockNavbar = () => <div data-testid="navbar-mock">Navbar</div>;
MockNavbar.displayName = "MockNavbar";
jest.mock("../components/Navbar", () => MockNavbar);

const MockViewIncorrectAnswersModal = ({ isOpen, onClose, quizResult }: any) =>
  isOpen ? (
    <div data-testid="view-incorrect-answers-modal-mock">
      <button onClick={onClose}>Close Modal</button>
      {quizResult && (
        <div data-testid="modal-quiz-title">{quizResult.quizTitle}</div>
      )}
    </div>
  ) : null;
MockViewIncorrectAnswersModal.displayName = "MockViewIncorrectAnswersModal";
jest.mock(
  "../components/quiz/ViewIncorrectAnswersModal",
  () => MockViewIncorrectAnswersModal
);

// Helper to wrap component with BrowserRouter for Link/Navigate
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

// REMOVE MockAuthContextType - no longer needed
// type MockAuthContextType = Omit<
//   AuthContextType,
//   "login" | "logout" | "updateUser"
// > & {
//   login: jest.Mock;
//   logout: jest.Mock;
//   updateUser?: jest.Mock;
// };

describe("StaffDashboard", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockNavigate.mockClear();
    mockedUseAuth.mockClear();
    // Reset all specific API mocks
    mockedApi.getAvailableQuizzesForStaff.mockClear();
    mockedApi.getMyQuizProgress.mockClear();
    mockedApi.getQuizAttemptDetails.mockClear();
    // Reset default export (axios instance) mocks
    if (mockedAxiosInstance && mockedAxiosInstance.get) {
      mockedAxiosInstance.get.mockReset();
    }
  });

  // staffUser and nonStaffUser are of type ClientUserMinimal
  const staffUser: ClientUserMinimal & { iat?: number; exp?: number } = {
    // Add iat/exp if specifically needed for token logic tests, otherwise ClientUserMinimal is enough
    _id: "staff123", // Was userId
    name: "Misha Staff",
    role: UserRole.Staff, // Use Enum
    restaurantId: "rest123",
    professionalRole: "Server",
    email: "misha@example.com", // Added email as it's in ClientUserMinimal
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600,
  };

  const nonStaffUser: ClientUserMinimal & {
    restaurantName?: string;
    iat?: number;
    exp?: number;
  } = {
    _id: "manager123", // Was userId
    name: "Manager Mike",
    role: UserRole.RestaurantOwner, // Use Enum
    restaurantId: "rest123",
    restaurantName: "The Grand Hotel", // Keep if used, though not in ClientUserMinimal strictly
    email: "manager@example.com", // Added email
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600,
  };

  // createAuthMock returns the full AuthContextType
  const createAuthMock = (
    user: ClientUserMinimal | null, // user is ClientUserMinimal | null
    isLoading: boolean,
    error: string | null = null,
    token: string | null // token is a direct parameter
  ): AuthContextType => ({
    user, // This should now align
    isLoading,
    error,
    token,
    login: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn(),
  });

  // Define tokens separately
  const staffAuthToken = "fake-staff-token";
  const managerAuthToken = "fake-manager-token";

  const availableQuizzesData: ClientIQuiz[] = [
    {
      _id: "quiz1",
      title: "Safety Procedures",
      description: "Basic safety training",
      numberOfQuestionsPerAttempt: 10,
      restaurantId: "rest123",
      sourceQuestionBankIds: ["qb1"],
    },
    {
      _id: "quiz2",
      title: "Menu Knowledge",
      description: "Details about our menu items",
      numberOfQuestionsPerAttempt: 15,
      restaurantId: "rest123",
      sourceQuestionBankIds: ["qb2"],
    },
  ];

  const quiz1ProgressData: ClientStaffQuizProgressWithAttempts = {
    _id: "progress1",
    staffUserId: { _id: "staff123", name: "Misha Staff" },
    quizId: { ...availableQuizzesData[0], _id: "quiz1" }, // Populate with quiz data
    restaurantId: "rest123",
    seenQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    totalUniqueQuestionsInSource: 10,
    isCompletedOverall: false,
    averageScore: 85.0,
    attempts: [
      {
        _id: "attempt1q1",
        score: 8,
        totalQuestions: 10,
        attemptDate: new Date().toISOString(),
        hasIncorrectAnswers: true,
      },
      {
        _id: "attempt2q1",
        score: 9,
        totalQuestions: 10,
        attemptDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        hasIncorrectAnswers: false,
      },
    ],
  };

  const quiz2ProgressDataCompleted: ClientStaffQuizProgressWithAttempts = {
    _id: "progress2",
    staffUserId: { _id: "staff123", name: "Misha Staff" },
    quizId: { ...availableQuizzesData[1], _id: "quiz2" },
    restaurantId: "rest123",
    seenQuestionIds: Array.from({ length: 15 }, (_, i) => `q${i + 1}`),
    totalUniqueQuestionsInSource: 15,
    isCompletedOverall: true,
    averageScore: 92.5,
    attempts: [
      {
        _id: "attempt1q2",
        score: 13,
        totalQuestions: 15,
        attemptDate: new Date().toISOString(),
        hasIncorrectAnswers: true,
      },
    ],
  };

  const rankingData = {
    myAverageScore: 88.7,
    myRank: 3,
    totalRankedStaff: 10,
  };

  const attemptDetailsData: ClientQuizAttemptDetails = {
    _id: "attempt1q1",
    quizId: "quiz1",
    quizTitle: "Safety Procedures",
    userId: "staff123",
    score: 8,
    totalQuestions: 10,
    attemptDate: new Date().toISOString(),
    incorrectQuestions: [
      { questionText: "Q1", userAnswer: "A", correctAnswer: "B" },
      { questionText: "Q2", userAnswer: "C", correctAnswer: "D" },
    ],
  };

  test("renders loading state when auth is loading", () => {
    mockedUseAuth.mockReturnValue(createAuthMock(null, true, null, null));
    renderWithRouter(<StaffDashboard />);
    expect(screen.getByText(/Authenticating.../i)).toBeInTheDocument();
  });

  test("shows access denied for non-staff user", () => {
    mockedUseAuth.mockReturnValue(
      createAuthMock(nonStaffUser, false, null, managerAuthToken)
    );
    renderWithRouter(<StaffDashboard />);
    expect(
      screen.getByText(/Access Denied. Please log in as Staff./i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Go to Login/i })
    ).toBeInTheDocument();
  });

  test("navigates to login when Go to Login button is clicked for non-staff", () => {
    mockedUseAuth.mockReturnValue(
      createAuthMock(nonStaffUser, false, null, managerAuthToken)
    );
    renderWithRouter(<StaffDashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Go to Login/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  describe("Authenticated Staff User Scenarios", () => {
    beforeEach(() => {
      mockedUseAuth.mockReturnValue(
        createAuthMock(staffUser, false, null, staffAuthToken)
      );
      mockedApi.getAvailableQuizzesForStaff.mockResolvedValue(
        availableQuizzesData
      );

      mockedApi.getMyQuizProgress.mockImplementation(async (quizId: string) => {
        if (quizId === "quiz1") {
          return quiz1ProgressData;
        }
        if (quizId === "quiz2") {
          return quiz2ProgressDataCompleted;
        }
        console.warn(
          `getMyQuizProgress called with unexpected quizId: ${quizId}`
        );
        return null;
      });

      if (mockedAxiosInstance && mockedAxiosInstance.get) {
        mockedAxiosInstance.get.mockReset(); // Reset from any previous test
        mockedAxiosInstance.get.mockImplementation(async (url: string) => {
          if (url === "/quiz-results/staff-ranking") {
            return { data: rankingData };
          }
          // Fail loudly for any other unmocked GET requests via the default instance
          throw new Error(
            `Unhandled default api.get request to ${url} in Authenticated Staff User Scenarios beforeEach`
          );
        });
      }

      mockedApi.getQuizAttemptDetails.mockResolvedValue(attemptDetailsData);
    });

    test("renders dashboard with welcome message, performance, and quizzes", async () => {
      renderWithRouter(<StaffDashboard />);
      expect(screen.getByText(/Welcome, Misha Staff!/i)).toBeInTheDocument();

      const performanceCard = await screen.findByTestId(
        "performance-summary-card"
      );
      expect(
        within(performanceCard).getByText(/Your Performance Summary/i)
      ).toBeInTheDocument();
      // Wait for the score related text to ensure rankingData has been processed
      await within(performanceCard).findByText(/Your Average Score:/i);
      expect(within(performanceCard).getByText(/88.7%/i)).toBeInTheDocument();

      await screen.findByText(/Safety Procedures/i);
      await screen.findByText(/Menu Knowledge/i);

      // Check for pending and completed sections headings
      expect(screen.getByText(/Pending Quizzes \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed Quizzes \(1\)/i)).toBeInTheDocument();
    });

    test("displays correct progress and average score for a pending quiz", async () => {
      renderWithRouter(<StaffDashboard />);
      const quiz1Card = await screen.findByTestId("quiz-item-quiz1");
      expect(quiz1Card).toBeInTheDocument();

      expect(
        within(quiz1Card).getByText(/Overall Progress/i)
      ).toBeInTheDocument();
      expect(within(quiz1Card).getByText(/50%/i)).toBeInTheDocument();

      // Check for average score text and value separately
      expect(
        within(quiz1Card).getByText(/Your Average Score:/i)
      ).toBeInTheDocument();
      expect(within(quiz1Card).getByText(/85.0%/i)).toBeInTheDocument();

      expect(
        within(quiz1Card).getByRole("button", {
          name: /Take Quiz/i,
        })
      ).toBeInTheDocument();
    });

    test("displays attempts for a quiz and view incorrect button", async () => {
      renderWithRouter(<StaffDashboard />);
      const quiz1Card = await screen.findByTestId("quiz-item-quiz1");
      expect(quiz1Card).toBeInTheDocument();

      expect(within(quiz1Card).getByText(/Attempt 2/i)).toBeInTheDocument(); // This is the latest attempt based on mock data ordering
      expect(
        within(quiz1Card).getByText(/8\/10 pts/i) // Corrected regex for score of first attempt
      ).toBeInTheDocument();
      // Ensure there's at least one "View Incorrect" button for an attempt
      // The mock quiz1ProgressData has attempt1q1 with hasIncorrectAnswers: true
      expect(
        within(quiz1Card).getAllByRole("button", { name: /View Incorrect/i })[0]
      ).toBeInTheDocument();
    });

    test("Take Quiz button navigates correctly", async () => {
      renderWithRouter(<StaffDashboard />);
      const quiz1Card = await screen.findByTestId("quiz-item-quiz1");
      expect(quiz1Card).toBeInTheDocument();

      const takeQuizButton = within(quiz1Card).getByRole("button", {
        name: /Take Quiz/i,
      });
      fireEvent.click(takeQuizButton);
      expect(mockNavigate).toHaveBeenCalledWith("/staff/quiz/quiz1/take");
    });

    test("View Incorrect button fetches details and opens modal", async () => {
      renderWithRouter(<StaffDashboard />);
      const quiz1Card = await screen.findByTestId("quiz-item-quiz1");
      expect(quiz1Card).toBeInTheDocument();

      // Find the "View Incorrect" button associated with attempt1q1 which has hasIncorrectAnswers: true
      // In quiz1ProgressData, attempt1q1 is the first in the array, but displayed as "Attempt 2" because of reverse order display.
      // The button itself will be present. Let's get all and click the first one found (more robust to DOM changes).
      const viewIncorrectButtons = within(quiz1Card).getAllByRole("button", {
        name: /View Incorrect/i,
      });
      expect(viewIncorrectButtons.length).toBeGreaterThanOrEqual(1);

      // Click the first "View Incorrect" button, which corresponds to attempt1q1 in our mock data.
      await userEvent.click(viewIncorrectButtons[0]);

      expect(mockedApi.getQuizAttemptDetails).toHaveBeenCalledWith(
        "attempt1q1" // This is the _id of the attempt in quiz1ProgressData with hasIncorrectAnswers: true
      );
      await waitFor(() => {
        expect(
          screen.getByTestId("view-incorrect-answers-modal-mock")
        ).toBeInTheDocument();
        expect(screen.getByTestId("modal-quiz-title")).toHaveTextContent(
          "Safety Procedures" // Title from attemptDetailsData
        );
      });

      // Test closing modal
      fireEvent.click(screen.getByRole("button", { name: /Close Modal/i }));
      await waitFor(() => {
        expect(
          screen.queryByTestId("view-incorrect-answers-modal-mock")
        ).not.toBeInTheDocument();
      });
    });

    test("displays message for completed quiz", async () => {
      renderWithRouter(<StaffDashboard />);
      const quiz2Card = await screen.findByTestId("quiz-item-quiz2");
      expect(quiz2Card).toBeInTheDocument();

      expect(
        within(quiz2Card).getByText(/Overall Progress/i)
      ).toBeInTheDocument();
      expect(within(quiz2Card).getByText(/100%/i)).toBeInTheDocument();

      // Check for average score text and value separately
      expect(
        within(quiz2Card).getByText(/Your Average Score:/i)
      ).toBeInTheDocument();
      expect(within(quiz2Card).getByText(/92.5%/i)).toBeInTheDocument();

      expect(
        within(quiz2Card).getByText(/You have completed this quiz./i)
      ).toBeInTheDocument();
    });

    test("handles error when fetching quizzes", async () => {
      mockedApi.getAvailableQuizzesForStaff.mockRejectedValueOnce(
        new Error("Arbitrary error for fetching quizzes")
      );
      if (mockedAxiosInstance && mockedAxiosInstance.get) {
        mockedAxiosInstance.get.mockResolvedValue({ data: rankingData });
      }
      renderWithRouter(<StaffDashboard />);
      await waitFor(() => {
        expect(
          screen.getByText(
            /An unexpected error occurred while fetching quizzes and progress. Please try again./i
          )
        ).toBeInTheDocument();
      });
    });

    test("handles error when fetching ranking", async () => {
      // Ensure other data fetching is successful to isolate ranking error
      mockedApi.getAvailableQuizzesForStaff.mockResolvedValue(
        availableQuizzesData
      );
      mockedApi.getMyQuizProgress.mockImplementation(async (quizId) => {
        if (quizId === "quiz1") return quiz1ProgressData;
        if (quizId === "quiz2") return quiz2ProgressDataCompleted;
        return null;
      });

      if (mockedAxiosInstance && mockedAxiosInstance.get) {
        mockedAxiosInstance.get.mockImplementation(async (url: string) => {
          if (url === "/quiz-results/staff-ranking") {
            throw new Error("Arbitrary error for fetching ranking");
          }
          // This part is important: if other api.get calls are made, they should not fail unexpectedly.
          // For this test, we only care about the ranking call.
          // If StaffDashboard makes other api.get calls, they might need specific mocks.
          // For now, let's assume only /quiz-results/staff-ranking is called via api.get directly for ranking.
          console.warn(`Unhandled GET request to ${url} in ranking error test`);
          throw new Error(`Unhandled GET request to ${url}`);
        });
      }
      renderWithRouter(<StaffDashboard />);
      await waitFor(() => {
        const errorMessages = screen.getAllByText(
          /An unexpected error occurred while fetching ranking data. Please try again./i
        );
        expect(errorMessages.length).toBeGreaterThanOrEqual(1);

        // Check within the performance summary card using data-testid
        const performanceSummaryCard = screen.getByTestId(
          "performance-summary-card"
        );
        expect(performanceSummaryCard).toBeInTheDocument();
        expect(
          within(performanceSummaryCard).getByText(
            /An unexpected error occurred while fetching ranking data. Please try again./i
          )
        ).toBeInTheDocument();
      });
    });

    test("displays no quizzes available message", async () => {
      mockedApi.getAvailableQuizzesForStaff.mockResolvedValue([]);
      renderWithRouter(<StaffDashboard />);
      await waitFor(() => {
        expect(
          screen.getByText(/No quizzes are currently assigned to you/i)
        ).toBeInTheDocument();
      });
    });
  });
});
