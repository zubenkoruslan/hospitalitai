import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateQuestionBankForm from "./CreateQuestionBankForm";
import { AuthContext } from "../../context/AuthContext";
import { ValidationContext } from "../../context/ValidationContext";
import * as apiService from "../../services/api";

// Mock API service functions
jest.mock("../../services/api", () => ({
  getMenusByRestaurant: jest.fn(),
  getMenuWithItems: jest.fn(),
  createQuestionBankFromMenu: jest.fn(),
  createQuestionBank: jest.fn(), // This is the one aliased as apiCreateQuestionBank
}));

// Mock common components
jest.mock("../common/Button", () => (props: any) => <button {...props} />);
jest.mock("../common/Card", () => ({ title, children, className }: any) => (
  <div data-testid="mock-card" className={className}>
    <h2>{title}</h2>
    {children}
  </div>
));
jest.mock("../common/LoadingSpinner", () => () => (
  <div data-testid="loading-spinner">Loading...</div>
));

const mockOnBankCreated = jest.fn();
const mockOnCancel = jest.fn();

const mockRestaurantUser = {
  _id: "user123",
  name: "Test User",
  email: "test@example.com",
  role: "restaurant",
  restaurantId: "res123",
  professionalRole: "Manager",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAdminUser = {
  ...mockRestaurantUser,
  role: "admin",
  restaurantId: undefined, // Admin might not have a specific restaurantId in this context
};

const mockAuthContextValue = (user: any) => ({
  user,
  token: "test-token",
  // Add other fields from AuthContextType if CreateQuestionBankForm uses them
  // For now, assuming only 'user' is directly accessed.
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  error: null,
});

const mockValidationContextValue = {
  formatErrorMessage: jest.fn((err) => {
    if (err.response?.data?.message) return err.response.data.message;
    if (err.message) return err.message;
    return "An unexpected error occurred.";
  }),
  // Add other fields from ValidationContextType if used
};

const renderComponent = (
  authValue = mockAuthContextValue(mockRestaurantUser)
) => {
  return render(
    <AuthContext.Provider value={authValue as any}>
      <ValidationContext.Provider value={mockValidationContextValue as any}>
        <CreateQuestionBankForm
          onBankCreated={mockOnBankCreated}
          onCancel={mockOnCancel}
        />
      </ValidationContext.Provider>
    </AuthContext.Provider>
  );
};

describe("CreateQuestionBankForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset API mocks to default implementations for each test
    (apiService.getMenusByRestaurant as jest.Mock).mockResolvedValue([]);
    (apiService.getMenuWithItems as jest.Mock).mockResolvedValue({ items: [] });
    (apiService.createQuestionBankFromMenu as jest.Mock).mockResolvedValue({
      _id: "bankFromMenu123",
    });
    (apiService.createQuestionBank as jest.Mock).mockResolvedValue({
      _id: "manualBank123",
    });
  });

  test("renders basic form elements", () => {
    renderComponent();
    expect(screen.getByText("Create New Question Bank")).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Description \(Optional\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Create from Menu (Optional)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Bank" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  test("calls onCancel when cancel button is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test("shows name validation error if name is empty on submit", async () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Create Bank" }));
    expect(
      await screen.findByText("Question bank name cannot be empty.")
    ).toBeInTheDocument();
    expect(apiService.createQuestionBank).not.toHaveBeenCalled();
  });

  test("successfully creates a bank manually (without menu selection)", async () => {
    renderComponent();
    const bankName = "My Manual Bank";
    const bankDescription = "A description for manual bank.";

    await userEvent.type(screen.getByLabelText(/Name/i), bankName);
    await userEvent.type(
      screen.getByLabelText(/Description \(Optional\)/i),
      bankDescription
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Bank" }));

    await waitFor(() => {
      expect(apiService.createQuestionBank).toHaveBeenCalledWith({
        name: bankName,
        description: bankDescription,
      });
    });
    expect(mockOnBankCreated).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Question bank name cannot be empty.")
    ).not.toBeInTheDocument();
  });

  test("handles API error during manual bank creation", async () => {
    const errorMessage = "Failed to create bank (manual)";
    (apiService.createQuestionBank as jest.Mock).mockRejectedValueOnce({
      response: { data: { message: errorMessage } },
    });
    renderComponent();

    await userEvent.type(screen.getByLabelText(/Name/i), "Error Bank");
    fireEvent.click(screen.getByRole("button", { name: "Create Bank" }));

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(mockOnBankCreated).not.toHaveBeenCalled();
  });

  // --- Tests for "Create from Menu" functionality ---

  describe("Create from Menu Functionality", () => {
    const mockMenus = [
      { _id: "menu1", name: "Lunch Menu" },
      { _id: "menu2", name: "Dinner Menu" },
    ];
    const mockCategories = ["Appetizers", "Main Course", "Desserts"];

    beforeEach(() => {
      (apiService.getMenusByRestaurant as jest.Mock).mockResolvedValue(
        mockMenus
      );
      (apiService.getMenuWithItems as jest.Mock).mockResolvedValue({
        _id: "menu1",
        name: "Lunch Menu",
        items: mockCategories.map((cat) => ({
          category: cat,
          name: "Item",
          price: 10,
        })),
      });
    });

    test("loads and displays menus for restaurant user", async () => {
      renderComponent(); // Defaults to restaurant user
      await waitFor(() =>
        expect(apiService.getMenusByRestaurant).toHaveBeenCalledWith(
          mockRestaurantUser.restaurantId
        )
      );
      expect(await screen.findByText("Lunch Menu")).toBeInTheDocument();
      expect(screen.getByText("Dinner Menu")).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "-- Select a Menu --" })
      ).toBeInTheDocument();
    });

    test("menu selection is disabled and shows message if not restaurant user", async () => {
      renderComponent(mockAuthContextValue(mockAdminUser)); // Render with admin user
      await waitFor(() =>
        expect(apiService.getMenusByRestaurant).not.toHaveBeenCalled()
      );
      const menuSelect = screen.getByLabelText("Select a Menu");
      expect(menuSelect).toBeDisabled();
      expect(
        await screen.findByText(
          "Only restaurant accounts can create banks from menus."
        )
      ).toBeInTheDocument();
    });

    test("loads and displays categories when a menu is selected", async () => {
      renderComponent();
      await screen.findByText("Lunch Menu"); // Ensure menus are loaded

      const menuSelect = screen.getByLabelText("Select a Menu");
      await userEvent.selectOptions(menuSelect, "menu1");

      await waitFor(() =>
        expect(apiService.getMenuWithItems).toHaveBeenCalledWith("menu1")
      );
      for (const category of mockCategories) {
        expect(await screen.findByLabelText(category)).toBeInTheDocument(); // Checkboxes are labeled by category name
      }
    });

    test("allows selection of categories", async () => {
      renderComponent();
      await screen.findByText("Lunch Menu");
      await userEvent.selectOptions(
        screen.getByLabelText("Select a Menu"),
        "menu1"
      );
      await screen.findByLabelText(mockCategories[0]); // Wait for categories

      const categoryCheckbox = screen.getByLabelText(mockCategories[0]);
      await userEvent.click(categoryCheckbox);
      expect(categoryCheckbox).toBeChecked();

      const categoryCheckbox2 = screen.getByLabelText(mockCategories[1]);
      await userEvent.click(categoryCheckbox2);
      expect(categoryCheckbox2).toBeChecked();
      expect(categoryCheckbox).toBeChecked(); // First one should still be checked
    });

    test("successfully creates a bank from menu (no AI)", async () => {
      renderComponent();
      const bankName = "Bank From Lunch Menu";
      await userEvent.type(screen.getByLabelText(/Name/i), bankName);
      await userEvent.selectOptions(
        screen.getByLabelText("Select a Menu"),
        "menu1"
      );
      await screen.findByLabelText(mockCategories[0]); // wait for categories

      await userEvent.click(screen.getByLabelText(mockCategories[0]));
      await userEvent.click(screen.getByLabelText(mockCategories[1]));

      fireEvent.click(screen.getByRole("button", { name: "Create Bank" }));

      await waitFor(() => {
        expect(apiService.createQuestionBankFromMenu).toHaveBeenCalledWith({
          name: bankName,
          description: undefined, // No description entered
          menuId: "menu1",
          selectedCategoryNames: [mockCategories[0], mockCategories[1]],
          generateAiQuestions: false,
          aiParams: undefined,
        });
      });
      expect(mockOnBankCreated).toHaveBeenCalledTimes(1);
    });

    test("enables AI generation options and creates bank with AI params", async () => {
      renderComponent();
      const bankName = "AI Bank From Lunch Menu";
      const questionCount = 15;

      await userEvent.type(screen.getByLabelText(/Name/i), bankName);
      await userEvent.selectOptions(
        screen.getByLabelText("Select a Menu"),
        "menu1"
      );
      await screen.findByLabelText(mockCategories[0]);
      await userEvent.click(screen.getByLabelText(mockCategories[0]));

      // Enable AI generation
      await userEvent.click(
        screen.getByLabelText(/Automatically generate AI questions/i)
      );

      const countInput = screen.getByLabelText(/Target number of questions/i);
      await userEvent.clear(countInput);
      await userEvent.type(countInput, questionCount.toString());

      fireEvent.click(screen.getByRole("button", { name: "Create Bank" }));

      await waitFor(() => {
        expect(apiService.createQuestionBankFromMenu).toHaveBeenCalledWith({
          name: bankName,
          description: undefined,
          menuId: "menu1",
          selectedCategoryNames: [mockCategories[0]],
          generateAiQuestions: true,
          aiParams: { targetQuestionCount: questionCount },
        });
      });
      expect(mockOnBankCreated).toHaveBeenCalledTimes(1);
    });

    test("handles API error during bank creation from menu", async () => {
      const errorMessage = "Failed to create bank from menu";
      (
        apiService.createQuestionBankFromMenu as jest.Mock
      ).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });
      renderComponent();

      await userEvent.type(
        screen.getByLabelText(/Name/i),
        "Error Bank From Menu"
      );
      await userEvent.selectOptions(
        screen.getByLabelText("Select a Menu"),
        "menu1"
      );
      await screen.findByLabelText(mockCategories[0]);
      await userEvent.click(screen.getByLabelText(mockCategories[0]));

      fireEvent.click(screen.getByRole("button", { name: "Create Bank" }));

      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
      expect(mockOnBankCreated).not.toHaveBeenCalled();
    });

    // TODO: Test loading states for menus and categories
    // TODO: Test error states for menus and categories loading failures
  });
});
