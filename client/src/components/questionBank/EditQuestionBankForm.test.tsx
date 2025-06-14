import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import EditQuestionBankForm from "./EditQuestionBankForm";
import { IQuestionBank } from "../../types/questionBankTypes";
import * as api from "../../services/api";

// Mock the API service
jest.mock("../../services/api");
const mockUpdateQuestionBank = api.updateQuestionBank as jest.Mock;

const mockBank: IQuestionBank = {
  _id: "bank1",
  name: "Initial Bank Name",
  description: "Initial bank description",
  questions: [],
  questionCount: 0,
  restaurantId: "rest1",
  createdBy: "user1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  categories: ["cat1"],
};

const mockOnBankUpdated = jest.fn();
const mockOnCancel = jest.fn();

const renderComponent = (bankProps: IQuestionBank = mockBank) => {
  return render(
    <EditQuestionBankForm
      bankToEdit={bankProps}
      onBankUpdated={mockOnBankUpdated}
      onCancel={mockOnCancel}
    />
  );
};

describe("EditQuestionBankForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateQuestionBank.mockResolvedValue({
      ...mockBank,
      name: "Updated Bank Name",
    });
  });

  test("renders with initial bank details", () => {
    renderComponent();
    expect(screen.getByLabelText(/Name/i)).toHaveValue(mockBank.name);
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      mockBank.description
    );
  });

  test("updates input fields on change", () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    fireEvent.change(nameInput, { target: { value: "New Bank Name" } });
    fireEvent.change(descriptionInput, {
      target: { value: "New bank description" },
    });

    expect(nameInput).toHaveValue("New Bank Name");
    expect(descriptionInput).toHaveValue("New bank description");
  });

  test("calls onBankUpdated with updated data on successful submission", async () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Updated Bank Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateQuestionBank).toHaveBeenCalledWith(mockBank._id, {
        name: "Updated Bank Name",
      });
    });
    expect(mockOnBankUpdated).toHaveBeenCalledWith({
      ...mockBank,
      name: "Updated Bank Name",
    });
  });

  test("shows validation error if name is empty", async () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "  " } }); // Empty name

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(
      await screen.findByText("Bank name cannot be empty.")
    ).toBeInTheDocument();
    expect(mockUpdateQuestionBank).not.toHaveBeenCalled();
    expect(mockOnBankUpdated).not.toHaveBeenCalled();
  });

  test("calls onCancel if no changes are made and submitted", async () => {
    renderComponent();
    // No changes made to the form

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    // Wait for any potential async state updates, though direct call is expected
    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateQuestionBank).not.toHaveBeenCalled();
    expect(mockOnBankUpdated).not.toHaveBeenCalled();
  });

  test("handles API error on submission and displays raw error message", async () => {
    const apiError = {
      response: { data: { message: "Backend Error Occurred" } },
    };
    mockUpdateQuestionBank.mockRejectedValueOnce(apiError);

    renderComponent();
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Another Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateQuestionBank).toHaveBeenCalledWith(mockBank._id, {
        name: "Another Name",
      });
    });
    expect(
      await screen.findByText("Backend Error Occurred")
    ).toBeInTheDocument();
    expect(mockOnBankUpdated).not.toHaveBeenCalled();
  });

  test("handles API error with generic message if specific one is not available", async () => {
    const apiError = new Error("Network Failure"); // Generic error
    mockUpdateQuestionBank.mockRejectedValueOnce(apiError);

    renderComponent();
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Yet Another Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateQuestionBank).toHaveBeenCalledWith(mockBank._id, {
        name: "Yet Another Name",
      });
    });
    // The component falls back to err.message or "Failed to update bank."
    expect(await screen.findByText(apiError.message)).toBeInTheDocument();
    expect(mockOnBankUpdated).not.toHaveBeenCalled();
  });

  test("calls onCancel when cancel button is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test("disables form and shows loading spinner in button during submission", async () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Submitting Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    // Check for spinner (role status is conventional for LoadingSpinner)
    expect(within(saveButton).getByRole("status")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
    // Inputs are not explicitly disabled in this component, but buttons are.

    await waitFor(() => {
      expect(mockOnBankUpdated).toHaveBeenCalled();
    });

    // Spinner should be gone, button re-enabled
    expect(within(saveButton).queryByRole("status")).not.toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
  });

  test("updates form fields when bankToEdit prop changes", () => {
    const { rerender } = renderComponent();
    const updatedBankProp: IQuestionBank = {
      ...mockBank,
      _id: "bank2",
      name: "Updated Prop Name",
      description: "Updated prop description",
      // Ensure all required fields of IQuestionBank for the new prop
      questions: [],
      questionCount: 0,
      restaurantId: "rest1",
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categories: ["newCat"],
    };

    rerender(
      <EditQuestionBankForm
        bankToEdit={updatedBankProp}
        onBankUpdated={mockOnBankUpdated}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue("Updated Prop Name");
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      "Updated prop description"
    );
  });
});
