import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom"; // For Link component
import StaffResultsTable from "./StaffResultsTable";
import {
  StaffMemberWithData,
  ClientQuizProgressSummary,
} from "../../types/staffTypes";
import { formatDate } from "../../utils/helpers";

// Mock Button component
jest.mock(
  "../common/Button",
  () =>
    ({
      onClick,
      children,
      variant,
      className,
      "aria-expanded": ariaExpanded,
      "aria-controls": ariaControls,
      "aria-label": ariaLabel,
    }: any) =>
      (
        <button
          data-testid={`button-${variant}`}
          onClick={onClick}
          className={className}
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          aria-label={ariaLabel}
        >
          {children}
        </button>
      )
);

// Mock formatDate if its specific output format is crucial and complex
// For now, assume it works as expected or use the real one if simple enough
// jest.mock('../../utils/helpers', () => ({
//   ...jest.requireActual('../../utils/helpers'), // Keep other helpers if any
//   formatDate: jest.fn((dateString) => new Date(dateString).toLocaleDateString('en-US')),
// }));

const mockQuizProgress1: ClientQuizProgressSummary = {
  quizId: "q1",
  quizTitle: "Appetizer Knowledge",
  overallProgressPercentage: 80,
  averageScoreForQuiz: 85.5,
  isCompletedOverall: true,
  lastAttemptTimestamp: new Date("2023-03-15T10:00:00Z").toISOString(),
};

const mockQuizProgress2: ClientQuizProgressSummary = {
  quizId: "q2",
  quizTitle: "Main Course Expertise",
  overallProgressPercentage: 60,
  averageScoreForQuiz: 65.0,
  isCompletedOverall: false,
  lastAttemptTimestamp: new Date("2023-03-16T14:30:00Z").toISOString(),
};

const mockStaffData: StaffMemberWithData[] = [
  {
    _id: "staff1",
    name: "Alice Wonderland",
    email: "alice@example.com",
    professionalRole: "Chef de Partie",
    createdAt: new Date("2023-01-10T00:00:00Z").toISOString(),
    quizzesTaken: 5,
    averageScore: 75.5,
    quizProgressSummaries: [mockQuizProgress1, mockQuizProgress2],
  },
  {
    _id: "staff2",
    name: "Bob The Builder",
    email: "bob@example.com",
    professionalRole: "Sous Chef",
    createdAt: new Date("2023-02-15T00:00:00Z").toISOString(),
    quizzesTaken: 2,
    averageScore: 88.0,
    quizProgressSummaries: [mockQuizProgress2],
  },
  {
    _id: "staff3",
    name: "Charlie Brown",
    email: "charlie@example.com",
    professionalRole: "Commis Chef",
    createdAt: new Date("2023-03-20T00:00:00Z").toISOString(),
    quizzesTaken: 0,
    averageScore: null, // Test null average score
    quizProgressSummaries: [], // Test empty progress
  },
];

describe("StaffResultsTable", () => {
  let mockOnToggleExpand: jest.Mock;

  beforeEach(() => {
    mockOnToggleExpand = jest.fn();
  });

  const renderTable = (
    expandedStaffId: string | null = null,
    staff = mockStaffData
  ) => {
    return render(
      <BrowserRouter>
        {" "}
        {/* Required for Link component */}
        <StaffResultsTable
          staff={staff}
          expandedStaffId={expandedStaffId}
          onToggleExpand={mockOnToggleExpand}
        />
      </BrowserRouter>
    );
  };

  test("renders table headers correctly", () => {
    renderTable();
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Role" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Quizzes Taken" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Avg. Score" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Joined" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Details" })
    ).toBeInTheDocument(); // sr-only text
  });

  test("renders correct number of staff rows", () => {
    renderTable();
    // Each staff member has one main row. Expanded rows are separate.
    const rows = screen.getAllByRole("row");
    // Number of staff + 1 for the header row
    expect(rows.length).toBe(mockStaffData.length + 1);
  });

  test("displays staff member data correctly", () => {
    renderTable();
    const staff1 = mockStaffData[0];
    expect(screen.getByText(staff1.name).closest("a")).toHaveAttribute(
      "href",
      `/staff/${staff1._id}`
    );
    expect(screen.getByText(staff1.professionalRole!)).toBeInTheDocument();
    expect(
      screen.getByText(staff1.quizzesTaken.toString())
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${staff1.averageScore!.toFixed(1)}%`)
    ).toBeInTheDocument();
    expect(screen.getByText(formatDate(staff1.createdAt))).toBeInTheDocument();
  });

  test("displays N/A for null average score", () => {
    renderTable();
    const staff3Row = screen.getByText(mockStaffData[2].name).closest("tr");
    expect(staff3Row).not.toBeNull();
    expect(within(staff3Row!).getByText("N/A")).toBeInTheDocument();
  });

  test("Details button calls onToggleExpand with staff ID", () => {
    renderTable();
    const detailsButtons = screen.getAllByRole("button", {
      name: /Show quiz details/i,
    });
    fireEvent.click(detailsButtons[0]);
    expect(mockOnToggleExpand).toHaveBeenCalledWith(mockStaffData[0]._id);
  });

  test('Details button shows "Hide" and has correct aria-expanded when expanded', () => {
    renderTable(mockStaffData[0]._id); // Staff1 is expanded
    const hideButton = screen.getByRole("button", {
      name: `Hide quiz details for ${mockStaffData[0].name}`,
    });
    expect(hideButton).toHaveTextContent("Hide");
    expect(hideButton).toHaveAttribute("aria-expanded", "true");
  });

  test("renders expanded quiz details when staff member is expanded", () => {
    renderTable(mockStaffData[0]._id); // Expand Alice
    expect(screen.getByText("Quiz Details:")).toBeInTheDocument();

    const staff1Progress = mockStaffData[0].quizProgressSummaries!;
    staff1Progress.forEach((summary) => {
      expect(screen.getByText(summary.quizTitle)).toBeInTheDocument();
      if (
        summary.averageScoreForQuiz !== null &&
        summary.averageScoreForQuiz !== undefined
      ) {
        expect(
          screen.getByText(
            `Avg Score: ${summary.averageScoreForQuiz.toFixed(1)}%`
          )
        ).toBeInTheDocument();
      }
      expect(
        screen.getByText(
          `(Overall Progress: ${summary.overallProgressPercentage}%)`
        )
      ).toBeInTheDocument();
      if (summary.isCompletedOverall && summary.lastAttemptTimestamp) {
        expect(
          screen.getByText(
            new RegExp(
              new Date(summary.lastAttemptTimestamp).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "short", year: "numeric" }
              )
            )
          )
        ).toBeInTheDocument();
      }
    });
  });

  test('shows "No quiz progress available" if expanded staff has no quiz progress', () => {
    renderTable(mockStaffData[2]._id); // Expand Charlie, who has no quiz progress
    expect(screen.getByText("Quiz Details:")).toBeInTheDocument();
    expect(
      screen.getByText("No quiz progress available for this staff member.")
    ).toBeInTheDocument();
  });

  test("applies correct styling for expanded row and button", () => {
    const { container } = renderTable(mockStaffData[0]._id);
    const staff1Row = screen.getByText(mockStaffData[0].name).closest("tr");
    expect(staff1Row).toHaveClass("bg-blue-50");

    const hideButton = screen.getByRole("button", {
      name: /Hide quiz details/i,
    });
    // Check for specific classes indicative of expanded state styling
    expect(hideButton).toHaveClass("!bg-blue-200");
  });
});
