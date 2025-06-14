import { render, screen, fireEvent } from "@testing-library/react";
import ScoreDistributionChart from "./ScoreDistributionChart";
import {
  StaffMemberWithData,
  ClientQuizProgressSummary,
} from "../../types/staffTypes"; // Ensure this path is correct

// Sample data for testing
const mockStaffData: StaffMemberWithData[] = [
  {
    _id: "staff1",
    name: "Alice",
    email: "a@a.com",
    createdAt: "2023-01-01",
    averageScore: 95,
    quizzesTaken: 1,
    quizProgressSummaries: [] as ClientQuizProgressSummary[],
  }, // Excellent
  {
    _id: "staff2",
    name: "Bob",
    email: "b@b.com",
    createdAt: "2023-01-01",
    averageScore: 85,
    quizzesTaken: 1,
    quizProgressSummaries: [],
  }, // Good
  {
    _id: "staff3",
    name: "Charlie",
    email: "c@c.com",
    createdAt: "2023-01-01",
    averageScore: 70,
    quizzesTaken: 1,
    quizProgressSummaries: [],
  }, // Average
  {
    _id: "staff4",
    name: "David",
    email: "d@d.com",
    createdAt: "2023-01-01",
    averageScore: 50,
    quizzesTaken: 1,
    quizProgressSummaries: [],
  }, // Needs Work
  {
    _id: "staff5",
    name: "Eve",
    email: "e@e.com",
    createdAt: "2023-01-01",
    averageScore: null,
    quizzesTaken: 0,
    quizProgressSummaries: [],
  }, // No Results
  {
    _id: "staff6",
    name: "Fred",
    email: "f@f.com",
    createdAt: "2023-01-01",
    averageScore: 92,
    quizzesTaken: 1,
    quizProgressSummaries: [],
  }, // Excellent
];

const emptyStaffData: StaffMemberWithData[] = [];

describe("ScoreDistributionChart Component", () => {
  const mockOnSelectCategory = jest.fn();

  beforeEach(() => {
    mockOnSelectCategory.mockClear();
  });

  test("renders title and total staff count", () => {
    render(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );
    expect(screen.getByText("Staff Performance Overview")).toBeInTheDocument();
    expect(screen.getByText(/Total Staff:/)).toBeInTheDocument();
    expect(
      screen.getByText(mockStaffData.length.toString())
    ).toBeInTheDocument();
  });

  test("renders all category cards with correct initial data", () => {
    render(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );

    // Expected counts: Excellent: 2, Good: 1, Average: 1, Needs Work: 1, No Results: 1
    // Total: 6
    // Percentages: Exc: 33%, Good: 17%, Avg: 17%, Needs: 17%, NoRes: 17% (approx due to rounding in component)

    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.getByText("90+")).toBeInTheDocument();
    expect(
      screen.getByText(
        (content, element) =>
          element?.textContent === "2" && element.classList.contains("text-3xl")
      )
    ).toBeInTheDocument(); // Count for Excellent
    expect(screen.getByText(/33% of staff/)).toBeInTheDocument(); // Percentage for Excellent

    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("75-89")).toBeInTheDocument();
    expect(
      screen.getByText(
        (content, element) =>
          element?.textContent === "1" && element.classList.contains("text-3xl")
      )
    ).toBeInTheDocument(); // Count for Good
    expect(screen.getByText(/17% of staff/)).toBeInTheDocument(); // Percentage for Good (1/6 approx 17%)

    // ... Add similar checks for Average, Needs Work, No Results ...
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("60-74")).toBeInTheDocument();

    expect(screen.getByText("Needs Work")).toBeInTheDocument();
    expect(screen.getByText("<60")).toBeInTheDocument();

    expect(screen.getByText("No Results")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();

    // Check for a progress bar (example for Excellent)
    const excellentCard = screen
      .getByText("Excellent")
      .closest('div[role="button"]');
    const progressBar = excellentCard?.querySelector(".bg-green-500"); // Color of excellent bar
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle("width: 33%");
  });

  test("handles click on a category card to select it", () => {
    render(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );
    const excellentCard = screen
      .getByText("Excellent")
      .closest('div[role="button"]');
    if (excellentCard) fireEvent.click(excellentCard);
    expect(mockOnSelectCategory).toHaveBeenCalledWith("excellent");
  });

  test("handles click on a selected category card to deselect it", () => {
    render(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory="excellent" // Start with 'excellent' selected
        onSelectCategory={mockOnSelectCategory}
      />
    );
    const excellentCard = screen
      .getByText("Excellent")
      .closest('div[role="button"]');
    expect(excellentCard).toHaveAttribute("aria-pressed", "true");
    if (excellentCard) fireEvent.click(excellentCard);
    expect(mockOnSelectCategory).toHaveBeenCalledWith(null);
  });

  test("handles keyboard interaction (Enter key) to select a category", () => {
    render(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );
    const goodCard = screen.getByText("Good").closest('div[role="button"]');
    if (goodCard) fireEvent.keyDown(goodCard, { key: "Enter", code: "Enter" });
    expect(mockOnSelectCategory).toHaveBeenCalledWith("good");
  });

  test("handles keyboard interaction (Space key) to select a category", () => {
    render(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );
    const averageCard = screen
      .getByText("Average")
      .closest('div[role="button"]');
    if (averageCard)
      fireEvent.keyDown(averageCard, { key: " ", code: "Space" });
    expect(mockOnSelectCategory).toHaveBeenCalledWith("average");
  });

  test("updates aria-pressed attribute when selectedCategory prop changes", () => {
    const { rerender } = render(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );
    const needsWorkCard = screen
      .getByText("Needs Work")
      .closest('div[role="button"]');
    expect(needsWorkCard).toHaveAttribute("aria-pressed", "false");

    rerender(
      <ScoreDistributionChart
        staffData={mockStaffData}
        selectedCategory="needsWork"
        onSelectCategory={mockOnSelectCategory}
      />
    );
    expect(needsWorkCard).toHaveAttribute("aria-pressed", "true");
  });

  test("renders correctly with empty staff data", () => {
    render(
      <ScoreDistributionChart
        staffData={emptyStaffData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );
    expect(screen.getByText("Total Staff:")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument(); // Total staff count is 0

    // Counts for all categories should be 0, percentages 0%
    const excellentCard = screen
      .getByText("Excellent")
      .closest('div[role="button"]');
    expect(excellentCard).toHaveTextContent("0"); // Count
    expect(excellentCard).toHaveTextContent("0% of staff"); // Percentage
    const progressBar = excellentCard?.querySelector(".bg-green-500");
    expect(progressBar).toHaveStyle("width: 0%");

    // ... Can add similar checks for other categories ...
  });

  test("renders correctly when all staff have no results", () => {
    const noResultsData: StaffMemberWithData[] = [
      {
        _id: "staff7",
        name: "Test",
        email: "t@t.com",
        createdAt: "2023-01-01",
        averageScore: null,
        quizzesTaken: 0,
        quizProgressSummaries: [] as ClientQuizProgressSummary[],
      },
      {
        _id: "staff8",
        name: "Test2",
        email: "t2@t.com",
        createdAt: "2023-01-01",
        averageScore: null,
        quizzesTaken: 0,
        quizProgressSummaries: [],
      },
    ];
    render(
      <ScoreDistributionChart
        staffData={noResultsData}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    );
    expect(screen.getByText("Total Staff:")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const noResultsCard = screen
      .getByText("No Results")
      .closest('div[role="button"]');
    expect(noResultsCard).toHaveTextContent("2"); // Count
    expect(noResultsCard).toHaveTextContent("100% of staff"); // Percentage
    const progressBar = noResultsCard?.querySelector(".bg-gray-300"); // Color for No Results
    expect(progressBar).toHaveStyle("width: 100%");

    // Other categories should be 0
    const excellentCard = screen
      .getByText("Excellent")
      .closest('div[role="button"]');
    expect(excellentCard).toHaveTextContent("0");
    expect(excellentCard).toHaveTextContent("0% of staff");
  });
});
