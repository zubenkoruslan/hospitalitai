import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useParams, useNavigate } from "react-router-dom";
import StaffDetails from "./StaffDetails";
import { useAuth } from "../context/AuthContext";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { StaffDetailsData } from "../types/staffTypes";
import { formatDate } from "../utils/helpers";
import api from "../services/api";

// --- Mocking Dependencies ---
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
jest.mock("../context/AuthContext");
jest.mock("../hooks/useStaffDetails");
jest.mock("../utils/helpers");
jest.mock("../services/api");

// Mock Child Components
jest.mock("../components/Navbar", () => ({
  default: () => <div data-testid="navbar-mock">Navbar</div>,
}));
jest.mock("../components/common/LoadingSpinner", () => ({
  default: () => <div role="status">Loading...</div>,
}));
jest.mock("../components/common/ErrorMessage", () => ({
  default: ({ message }: { message: string }) => (
    <div role="alert">{message}</div>
  ),
}));
jest.mock("../components/quiz/ViewIncorrectAnswersModal", () => ({
  default: jest.fn(() => (
    <div data-testid="view-answers-modal-mock">View Answers Modal</div>
  )),
}));

// Type assertions & Mock getters
const mockedUseParams = useParams as jest.Mock;
const mockedUseNavigate = useNavigate as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
const mockedUseStaffDetails = useStaffDetails as jest.Mock;
const mockedFormatDate = formatDate as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;
const MockedViewIncorrectAnswersModal = jest.requireMock(
  "../components/quiz/ViewIncorrectAnswersModal"
).default;

// --- Test Suite ---
describe("StaffDetails Page", () => {
  const mockStaffId = "staff123";
  const mockNavigate = jest.fn();
  const mockFetchStaffDetails = jest.fn();
  const mockStaffDetailsData: StaffDetailsData = {
    _id: mockStaffId,
    name: "Jane Doe",
    email: "jane.doe@test.com",
    createdAt: new Date("2023-01-01T12:00:00Z").toISOString(),
    professionalRole: "Bartender",
    aggregatedQuizPerformance: [
      {
        quizId: "q1",
        quizTitle: "Mixology Basics",
        numberOfAttempts: 1,
        averageScorePercent: 90, // (9/10 * 100)
        lastCompletedAt: new Date("2023-02-15T10:00:00Z").toISOString(),
        attempts: [
          {
            _id: "qr1", // Attempt ID
            score: 9,
            totalQuestions: 10,
            attemptDate: new Date("2023-02-15T10:00:00Z").toISOString(),
            hasIncorrectAnswers: true, // Based on incorrectQuestions previously existing
          },
        ],
      },
      {
        quizId: "q2",
        quizTitle: "Wine Knowledge",
        numberOfAttempts: 1, // Assuming retakeCount 1 implies one initial + one retake, but the old structure was unclear. Simulating 1 attempt for now.
        averageScorePercent: 87.5, // (7/8 * 100)
        lastCompletedAt: new Date("2023-03-20T14:30:00Z").toISOString(),
        attempts: [
          {
            _id: "qr2", // Attempt ID
            score: 7,
            totalQuestions: 8,
            attemptDate: new Date("2023-03-20T14:30:00Z").toISOString(),
            hasIncorrectAnswers: true, // Based on incorrectQuestions previously existing
          },
        ],
      },
    ],
    averageScore: 85, // Example average
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseParams.mockReturnValue({ id: mockStaffId });
    mockedUseNavigate.mockReturnValue(mockNavigate);
    mockedUseAuth.mockReturnValue({
      user: { name: "Owner" },
      isLoading: false,
    });
    mockedFormatDate.mockImplementation((dateString) =>
      new Date(dateString).toLocaleDateString()
    );
    // Default: Successful load
    mockedUseStaffDetails.mockReturnValue({
      staffDetails: mockStaffDetailsData,
      loading: false,
      error: null,
      fetchStaffDetails: mockFetchStaffDetails,
    });
    MockedViewIncorrectAnswersModal.mockClear();
    mockedApi.patch.mockResolvedValue({ data: { message: "Success" } }); // Mock patch success
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={[`/staff/${mockStaffId}`]}>
        <StaffDetails />
      </MemoryRouter>
    );

  it("should render loading spinner while fetching data", () => {
    mockedUseStaffDetails.mockReturnValue({
      staffDetails: null,
      loading: true,
      error: null,
      fetchStaffDetails: mockFetchStaffDetails,
    });
    renderComponent();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument();
  });

  it("should render error message if fetching fails", () => {
    const errorMsg = "Failed to load staff details.";
    mockedUseStaffDetails.mockReturnValue({
      staffDetails: null,
      loading: false,
      error: errorMsg,
      fetchStaffDetails: mockFetchStaffDetails,
    });
    renderComponent();
    expect(screen.getByRole("alert")).toHaveTextContent(errorMsg);
    expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument();
  });

  it('should render "not found" message if hook returns null data without error', () => {
    mockedUseStaffDetails.mockReturnValue({
      staffDetails: null,
      loading: false,
      error: null,
      fetchStaffDetails: mockFetchStaffDetails,
    });
    renderComponent();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Staff member not found."
    );
  });

  // Add tests for success state, role editing, modal interactions next
  it("should render staff details correctly on successful load", () => {
    renderComponent();

    // Check header info
    expect(
      screen.getByRole("heading", { name: /Jane Doe/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/jane.doe@test.com/)).toBeInTheDocument();
    expect(mockedFormatDate).toHaveBeenCalledWith(
      mockStaffDetailsData.createdAt
    );
    expect(
      screen.getByText(
        new Date(mockStaffDetailsData.createdAt).toLocaleDateString()
      )
    ).toBeInTheDocument(); // Check formatted date

    // Check role display (non-edit mode initially)
    expect(
      screen.getByText(`Role: ${mockStaffDetailsData.professionalRole}`)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Edit Role/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /Professional Role/i })
    ).not.toBeInTheDocument();

    // Check results table headers
    expect(
      screen.getByRole("columnheader", { name: /Quiz Title/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Score/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Date Completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Retakes/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Actions/i })
    ).toBeInTheDocument();

    // Check data in the first row
    const row1 = screen.getByRole("row", { name: /Mixology Basics/i });
    expect(row1).toBeInTheDocument();
    expect(within(row1).getByText("9 / 10")).toBeInTheDocument(); // Score
    expect(within(row1).getByText("0")).toBeInTheDocument(); // Retakes
    expect(
      within(row1).getByRole("button", { name: /View Details/i })
    ).toBeInTheDocument();
    expect(mockedFormatDate).toHaveBeenCalledWith(
      mockStaffDetailsData.aggregatedQuizPerformance[0].lastCompletedAt
    );

    // Check data in the second row
    const row2 = screen.getByRole("row", { name: /Wine Knowledge/i });
    expect(row2).toBeInTheDocument();
    expect(within(row2).getByText("7 / 8")).toBeInTheDocument(); // Score
    expect(within(row2).getByText("1")).toBeInTheDocument(); // Retakes
    expect(
      within(row2).getByRole("button", { name: /View Details/i })
    ).toBeInTheDocument();
    expect(mockedFormatDate).toHaveBeenCalledWith(
      mockStaffDetailsData.aggregatedQuizPerformance[1].lastCompletedAt
    );

    // Check back button
    expect(
      screen.getByRole("button", { name: /Back to Staff List/i })
    ).toBeInTheDocument();
  });

  it("should handle role editing correctly", async () => {
    renderComponent();

    const editButton = screen.getByRole("button", { name: /Edit Role/i });
    fireEvent.click(editButton);

    // Check edit mode UI
    const roleInput = screen.getByRole("textbox", {
      name: /Professional Role/i,
    });
    expect(roleInput).toBeInTheDocument();
    expect(roleInput).toHaveValue(
      mockStaffDetailsData.professionalRole as string
    );
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Edit Role/i })
    ).not.toBeInTheDocument();

    // Change role
    const newRole = "Head Bartender";
    fireEvent.change(roleInput, { target: { value: newRole } });
    expect(roleInput).toHaveValue(newRole);

    // Click Save
    const saveButton = screen.getByRole("button", { name: /Save/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Check API call
    expect(mockedApi.patch).toHaveBeenCalledTimes(1);
    expect(mockedApi.patch).toHaveBeenCalledWith(`/staff/${mockStaffId}`, {
      professionalRole: newRole,
    });

    // Check fetch details was called to refresh data
    expect(mockFetchStaffDetails).toHaveBeenCalledTimes(1);

    // Check UI reverted to display mode (assuming fetch completes and re-renders)
    // We need to wait for the potential re-render after fetch is called
    await waitFor(() => {
      expect(
        screen.getByText(`Role: ${mockStaffDetailsData.professionalRole}`)
      ).toBeInTheDocument(); // Should still show OLD role until state updates from fetch mock
      // Or, if we want to test the final state assuming fetch works:
      // mockedUseStaffDetails.mockReturnValueOnce({ ...mockedUseStaffDetails(), staffDetails: { ...mockStaffDetailsData, professionalRole: newRole } });
      // Then assert the new role is shown.
      expect(
        screen.getByRole("button", { name: /Edit Role/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: /Professional Role/i })
      ).not.toBeInTheDocument();
    });
  });

  it("should handle cancelling role edit", () => {
    renderComponent();
    const editButton = screen.getByRole("button", { name: /Edit Role/i });
    fireEvent.click(editButton);

    const roleInput = screen.getByRole("textbox", {
      name: /Professional Role/i,
    });
    fireEvent.change(roleInput, { target: { value: "Something Else" } });

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Should revert to display mode with original role
    expect(
      screen.getByText(`Role: ${mockStaffDetailsData.professionalRole}`)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Edit Role/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /Professional Role/i })
    ).not.toBeInTheDocument();
    expect(mockedApi.patch).not.toHaveBeenCalled();
    expect(mockFetchStaffDetails).not.toHaveBeenCalled();
  });

  it("should handle role save error", async () => {
    renderComponent();
    const errorMsg = "Update failed";
    mockedApi.patch.mockRejectedValueOnce({
      response: { data: { message: errorMsg } },
    });

    fireEvent.click(screen.getByRole("button", { name: /Edit Role/i }));
    const roleInput = screen.getByRole("textbox", {
      name: /Professional Role/i,
    });
    fireEvent.change(roleInput, { target: { value: "New Failed Role" } });

    const saveButton = screen.getByRole("button", { name: /Save/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
    expect(mockFetchStaffDetails).not.toHaveBeenCalled(); // Shouldn't refetch on error
    // Should remain in edit mode
    expect(
      screen.getByRole("textbox", { name: /Professional Role/i })
    ).toBeInTheDocument();
  });

  it("should open and close the ViewIncorrectAnswersModal", async () => {
    renderComponent();

    // Find the button in the first results row
    const row1 = screen.getByRole("row", { name: /Mixology Basics/i });
    const viewDetailsButton = within(row1).getByRole("button", {
      name: /View Details/i,
    });

    // Check modal is not initially open
    expect(MockedViewIncorrectAnswersModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false }),
      {}
    );

    // Click the button
    fireEvent.click(viewDetailsButton);

    // Check modal is called with isOpen=true and correct props
    await waitFor(() => {
      expect(MockedViewIncorrectAnswersModal).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
          quizResult: mockStaffDetailsData.aggregatedQuizPerformance[0], // Pass the first result
          onClose: expect.any(Function),
        }),
        {}
      );
    });

    // Simulate closing the modal by calling the onClose prop passed to the mock
    // Find the latest call to the mock and get its props
    const latestCallIndex =
      MockedViewIncorrectAnswersModal.mock.calls.length - 1;
    const modalProps =
      MockedViewIncorrectAnswersModal.mock.calls[latestCallIndex][0];

    act(() => {
      modalProps.onClose();
    });

    // Check modal is called with isOpen=false again
    await waitFor(() => {
      expect(MockedViewIncorrectAnswersModal).toHaveBeenCalledWith(
        expect.objectContaining({ isOpen: false }),
        {}
      );
    });
  });

  it("should navigate back when Back button is clicked", () => {
    renderComponent();
    const backButton = screen.getByRole("button", {
      name: /Back to Staff List/i,
    });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
