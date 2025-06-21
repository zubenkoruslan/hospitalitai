import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import StaffResultsFilter from "./StaffResultsFilter";
import { Filters, StaffMemberWithData } from "../../types/staffTypes";

// Mock Button component
const MockButton = ({
  onClick,
  children,
  variant,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: string;
}) => (
  <button data-testid={`button-${variant}`} onClick={onClick}>
    {children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

const mockStaffData: StaffMemberWithData[] = [
  {
    _id: "s1",
    name: "Alice",
    email: "alice@test.com",
    professionalRole: "Chef",
    createdAt: new Date().toISOString(),
    quizzesTaken: 1,
    averageScore: 90,
    quizProgressSummaries: [],
  },
  {
    _id: "s2",
    name: "Bob",
    email: "bob@test.com",
    professionalRole: "Waiter",
    createdAt: new Date().toISOString(),
    quizzesTaken: 1,
    averageScore: 70,
    quizProgressSummaries: [],
  },
  {
    _id: "s3",
    name: "Carol",
    email: "carol@test.com",
    professionalRole: "Chef",
    createdAt: new Date().toISOString(),
    quizzesTaken: 1,
    averageScore: 50,
    quizProgressSummaries: [],
  },
  {
    _id: "s4",
    name: "David",
    email: "david@test.com",
    professionalRole: undefined, // No role
    createdAt: new Date().toISOString(),
    quizzesTaken: 1,
    averageScore: null,
    quizProgressSummaries: [],
  },
];

const PERFORMANCE_CATEGORIES = {
  excellent: { label: "Excellent (90%+)", min: 90, max: 100 },
  good: { label: "Good (75-89%)", min: 75, max: 89.99 },
  average: { label: "Average (60-74%)", min: 60, max: 74.99 },
  needsWork: { label: "Needs Work (<60%)", min: 0, max: 59.99 },
  noResults: { label: "No Results Yet" },
};

describe("StaffResultsFilter Component", () => {
  let mockOnFilterChange: jest.Mock;
  let mockOnCategoryChange: jest.Mock;
  let mockOnResetFilters: jest.Mock;
  let initialFilters: Filters;

  beforeEach(() => {
    mockOnFilterChange = jest.fn();
    mockOnCategoryChange = jest.fn();
    mockOnResetFilters = jest.fn();
    initialFilters = { name: "", role: "" };
  });

  const renderFilter = (
    filters = initialFilters,
    selectedCategory: string | null = null,
    staffData = mockStaffData
  ) => {
    render(
      <StaffResultsFilter
        filters={filters}
        staffData={staffData}
        selectedCategory={selectedCategory}
        onFilterChange={mockOnFilterChange}
        onCategoryChange={mockOnCategoryChange}
        onResetFilters={mockOnResetFilters}
      />
    );
  };

  test("renders input fields and select dropdowns", () => {
    renderFilter();
    expect(
      screen.getByPlaceholderText("Filter by name...")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Filter by role" })
    ).toBeInTheDocument(); // sr-only label
    expect(
      screen.getByRole("combobox", { name: "Filter by performance" })
    ).toBeInTheDocument(); // sr-only label
    expect(screen.getByTestId("button-secondary")).toHaveTextContent(
      "Reset Filters"
    );
  });

  test("name filter input reflects prop value and calls onFilterChange", () => {
    const testFilters = { name: "Alice", role: "" };
    renderFilter(testFilters);
    const nameInput = screen.getByPlaceholderText("Filter by name...");
    expect(nameInput).toHaveValue("Alice");
    fireEvent.change(nameInput, { target: { value: "Bob" } });
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test("role filter select reflects prop value and calls onFilterChange", () => {
    const testFilters = { name: "", role: "Chef" };
    renderFilter(testFilters);
    const roleSelect = screen.getByRole("combobox", { name: "Filter by role" });
    expect(roleSelect).toHaveValue("Chef");
    fireEvent.change(roleSelect, { target: { value: "Waiter" } });
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test("populates role filter with unique roles from staffData", () => {
    renderFilter();
    const roleSelect = screen.getByRole("combobox", { name: "Filter by role" });
    expect(within(roleSelect).getByText("All Roles")).toBeInTheDocument();
    expect(within(roleSelect).getByText("Chef")).toBeInTheDocument();
    expect(within(roleSelect).getByText("Waiter")).toBeInTheDocument();
    // Check that only unique roles are present (Chef appears twice in mock data)
    const options = within(roleSelect).getAllByRole("option");
    const chefOptions = options.filter((opt) => opt.textContent === "Chef");
    expect(chefOptions.length).toBe(1);
  });

  test("performance category filter reflects prop value and calls onCategoryChange", () => {
    renderFilter(initialFilters, "excellent");
    const categorySelect = screen.getByRole("combobox", {
      name: "Filter by performance",
    });
    expect(categorySelect).toHaveValue("excellent");
    fireEvent.change(categorySelect, { target: { value: "good" } });
    expect(mockOnCategoryChange).toHaveBeenCalledWith("good");
  });

  test('performance category filter calls onCategoryChange with null when "All Performance" is selected', () => {
    renderFilter(initialFilters, "excellent");
    const categorySelect = screen.getByRole("combobox", {
      name: "Filter by performance",
    });
    fireEvent.change(categorySelect, { target: { value: "" } }); // Empty value for "All Performance"
    expect(mockOnCategoryChange).toHaveBeenCalledWith(null);
  });

  test("populates performance category filter with correct labels", () => {
    renderFilter();
    const categorySelect = screen.getByRole("combobox", {
      name: "Filter by performance",
    });
    expect(
      within(categorySelect).getByText("All Performance")
    ).toBeInTheDocument();
    Object.values(PERFORMANCE_CATEGORIES).forEach((category) => {
      expect(
        within(categorySelect).getByText(category.label)
      ).toBeInTheDocument();
    });
  });

  test("Reset Filters button calls onResetFilters", () => {
    renderFilter();
    fireEvent.click(screen.getByTestId("button-secondary"));
    expect(mockOnResetFilters).toHaveBeenCalledTimes(1);
  });
});
