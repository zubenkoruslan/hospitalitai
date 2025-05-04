import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import RestaurantDashboard from "./RestaurantDashboard";
import { useAuth } from "../context/AuthContext";
import { useStaffSummary } from "../hooks/useStaffSummary";
import { useQuizCount } from "../hooks/useQuizCount";
import { useMenus } from "../hooks/useMenus";

// --- Mocking Child Components and Hooks ---

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // Use jest.requireActual
  useNavigate: jest.fn(), // Use jest.fn()
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock custom hooks
jest.mock("../context/AuthContext");
jest.mock("../hooks/useStaffSummary");
jest.mock("../hooks/useQuizCount");
jest.mock("../hooks/useMenus");

// Mock Navbar component
jest.mock("../components/Navbar", () => ({
  default: () => <div data-testid="navbar-mock">Navbar</div>,
}));

// Type assertions for mocked hooks
const mockedUseAuth = useAuth as jest.Mock;
const mockedUseStaffSummary = useStaffSummary as jest.Mock;
const mockedUseQuizCount = useQuizCount as jest.Mock;
const mockedUseMenus = useMenus as jest.Mock;
const mockedUseNavigate = useNavigate as jest.Mock;

// --- Test Suite ---

describe("RestaurantDashboard Page", () => {
  const mockNavigate = jest.fn(); // Use jest.fn()
  const mockUser = {
    name: "Test Owner",
    restaurantId: "resto123",
    role: "restaurant",
  };
  const mockStaffData = [
    {
      _id: "s1",
      name: "Staff A",
      averageScore: 80,
      resultsSummary: [],
      quizzesTaken: 1,
      email: "a@b.c",
      createdAt: "",
    },
    {
      _id: "s2",
      name: "Staff B",
      averageScore: null,
      resultsSummary: [],
      quizzesTaken: 0,
      email: "d@e.f",
      createdAt: "",
    },
  ];
  const mockQuizCount = 5;
  const mockMenus = [
    { _id: "m1", name: "Menu 1" },
    { _id: "m2", name: "Menu 2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks(); // Use jest.clearAllMocks()
    // Default mocks for successful, non-loading state
    mockedUseAuth.mockReturnValue({ user: mockUser, isLoading: false });
    mockedUseStaffSummary.mockReturnValue({
      staffData: mockStaffData,
      loading: false,
      error: null,
    });
    mockedUseQuizCount.mockReturnValue({
      quizCount: mockQuizCount,
      loading: false,
      error: null,
    });
    mockedUseMenus.mockReturnValue({
      menus: mockMenus,
      loading: false,
      error: null,
    });
    mockedUseNavigate.mockReturnValue(mockNavigate);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <RestaurantDashboard />
      </MemoryRouter>
    );

  it("should render loading spinner if auth is loading", () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: true });
    renderComponent();
    expect(screen.getByRole("status")).toBeInTheDocument(); // Assuming spinner has role="status"
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
  });

  it("should render loading spinner if staff data is loading", () => {
    mockedUseStaffSummary.mockReturnValue({
      staffData: [],
      loading: true,
      error: null,
    });
    renderComponent();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should render loading spinner if quiz count is loading", () => {
    mockedUseQuizCount.mockReturnValue({
      quizCount: 0,
      loading: true,
      error: null,
    });
    renderComponent();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should render loading spinner if menus are loading", () => {
    mockedUseMenus.mockReturnValue({ menus: [], loading: true, error: null });
    renderComponent();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should render dashboard summary correctly on successful data load", () => {
    renderComponent();

    // Check Navbar
    expect(screen.getByTestId("navbar-mock")).toBeInTheDocument();

    // Check Welcome message
    expect(screen.getByText(`Welcome, ${mockUser.name}!`)).toBeInTheDocument();

    // Check summary cards
    expect(screen.getByText("Total Staff")).toBeInTheDocument();
    expect(
      screen.getByText(mockStaffData.length.toString())
    ).toBeInTheDocument();

    expect(screen.getByText("Total Quizzes")).toBeInTheDocument();
    expect(screen.getByText(mockQuizCount.toString())).toBeInTheDocument();

    expect(screen.getByText("Total Menus")).toBeInTheDocument();
    expect(screen.getByText(mockMenus.length.toString())).toBeInTheDocument();

    // Check average score calculation (80 / 1 staff with score)
    expect(screen.getByText(/Overall Average/i)).toBeInTheDocument();
    expect(screen.getByText("80.0")).toBeInTheDocument(); // 80.0 / 1 staff with score

    // Check Restaurant ID section
    expect(screen.getByText(/Your Restaurant ID/i)).toBeInTheDocument();
    expect(screen.getByText(mockUser.restaurantId)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy ID/i })
    ).toBeInTheDocument();

    // Check Search bar
    expect(screen.getByPlaceholderText(/Search staff/i)).toBeInTheDocument();

    // Check no error message is shown
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should display an error message if staff hook fails", () => {
    const errorMsg = "Failed to load staff";
    mockedUseStaffSummary.mockReturnValue({
      staffData: [],
      loading: false,
      error: errorMsg,
    });
    renderComponent();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
    // Check that dashboard content isn't rendered
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
    expect(screen.queryByText("Total Staff")).not.toBeInTheDocument();
  });

  it("should display an error message if quiz count hook fails", () => {
    const errorMsg = "Failed to load quiz count";
    mockedUseQuizCount.mockReturnValue({
      quizCount: 0,
      loading: false,
      error: errorMsg,
    });
    renderComponent();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it("should display an error message if menu hook fails", () => {
    const errorMsg = "Failed to load menus";
    mockedUseMenus.mockReturnValue({
      menus: [],
      loading: false,
      error: errorMsg,
    });
    renderComponent();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it("should display access denied message and redirect button if staff hook denies access", () => {
    const errorMsg =
      "Access denied. Only restaurant owners can view staff data.";
    mockedUseStaffSummary.mockReturnValue({
      staffData: [],
      loading: false,
      error: errorMsg,
    });
    renderComponent();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Go to Login/i })
    ).toBeInTheDocument();

    // Click button and check navigation
    fireEvent.click(screen.getByRole("button", { name: /Go to Login/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
