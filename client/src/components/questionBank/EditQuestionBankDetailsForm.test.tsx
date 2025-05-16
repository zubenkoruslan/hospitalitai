import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EditQuestionBankDetailsForm from "./EditQuestionBankDetailsForm";
import { IQuestionBank } from "../../types/questionBankTypes";
import * as api from "../../services/api";
import { ValidationContext } from "../../context/ValidationContext";

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
  categories: ["tag1"],
};

const mockOnBankUpdated = jest.fn();
const mockOnCancel = jest.fn();
const mockFormatErrorMessage = jest.fn(
  (err) => err?.message || "Failed to update."
);

// Add mocks for other validation functions to satisfy the type
const mockIsValidName = jest.fn().mockReturnValue({ valid: true });
const mockIsValidPrice = jest.fn().mockReturnValue({ valid: true });
const mockIsValidDescription = jest.fn().mockReturnValue({ valid: true });
const mockIsValidIngredient = jest.fn().mockReturnValue({ valid: true });
const mockIsValidEmail = jest.fn().mockReturnValue({ valid: true });

const renderComponent = (bankProps: IQuestionBank = mockBank) => {
  return render(
    <ValidationContext.Provider
      value={{
        formatErrorMessage: mockFormatErrorMessage,
        isValidName: mockIsValidName,
        isValidPrice: mockIsValidPrice,
        isValidDescription: mockIsValidDescription,
        isValidIngredient: mockIsValidIngredient,
        isValidEmail: mockIsValidEmail,
      }}
    >
      <EditQuestionBankDetailsForm
        bank={bankProps}
        onBankUpdated={mockOnBankUpdated}
        onCancel={mockOnCancel}
      />
    </ValidationContext.Provider>
  );
};

describe("EditQuestionBankDetailsForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateQuestionBank.mockResolvedValue({
      ...mockBank,
      name: "Updated Bank Name",
    });
  });

  test("renders with initial bank details", () => {
    renderComponent();
    expect(screen.getByLabelText(/Bank Name/i)).toHaveValue(mockBank.name);
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      mockBank.description
    );
  });

  test("updates input fields on change", () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/Bank Name/i);
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
    const nameInput = screen.getByLabelText(/Bank Name/i);
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
    const nameInput = screen.getByLabelText(/Bank Name/i);
    fireEvent.change(nameInput, { target: { value: "  " } }); // Empty name

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(
      await screen.findByText("Bank name cannot be empty.")
    ).toBeInTheDocument();
    expect(mockUpdateQuestionBank).not.toHaveBeenCalled();
    expect(mockOnBankUpdated).not.toHaveBeenCalled();
  });

  test("shows error if no changes are made", async () => {
    renderComponent();
    // No changes made to the form

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(await screen.findByText("No changes detected.")).toBeInTheDocument();
    expect(mockUpdateQuestionBank).not.toHaveBeenCalled();
    expect(mockOnBankUpdated).not.toHaveBeenCalled();
  });

  test("handles API error on submission", async () => {
    const apiError = new Error("Network Error");
    mockUpdateQuestionBank.mockRejectedValueOnce(apiError);
    mockFormatErrorMessage.mockReturnValueOnce("Formatted Network Error");

    renderComponent();
    const nameInput = screen.getByLabelText(/Bank Name/i);
    fireEvent.change(nameInput, { target: { value: "Another Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateQuestionBank).toHaveBeenCalledWith(mockBank._id, {
        name: "Another Name",
      });
    });
    expect(
      await screen.findByText("Formatted Network Error")
    ).toBeInTheDocument();
    expect(mockOnBankUpdated).not.toHaveBeenCalled();
  });

  test("calls onCancel when cancel button is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test("disables form and shows loading spinner during submission", async () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/Bank Name/i);
    fireEvent.change(nameInput, { target: { value: "Submitting Name" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(
      screen.getByRole("button", { name: /Save Changes/i })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument(); // Assuming LoadingSpinner has role="status"

    await waitFor(() => {
      expect(mockOnBankUpdated).toHaveBeenCalled();
    });

    expect(
      screen.getByRole("button", { name: /Save Changes/i })
    ).not.toBeDisabled();
  });

  test("updates form fields when bank prop changes", () => {
    const { rerender } = renderComponent();
    const updatedBankProp: IQuestionBank = {
      ...mockBank,
      _id: "bank2",
      name: "Updated Prop Name",
      description: "Updated prop description",
      questions: [],
      questionCount: 0,
      restaurantId: "rest1",
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categories: ["newCat"],
    };

    rerender(
      <ValidationContext.Provider
        value={{
          formatErrorMessage: mockFormatErrorMessage,
          isValidName: mockIsValidName,
          isValidPrice: mockIsValidPrice,
          isValidDescription: mockIsValidDescription,
          isValidIngredient: mockIsValidIngredient,
          isValidEmail: mockIsValidEmail,
        }}
      >
        <EditQuestionBankDetailsForm
          bank={updatedBankProp}
          onBankUpdated={mockOnBankUpdated}
          onCancel={mockOnCancel}
        />
      </ValidationContext.Provider>
    );

    expect(screen.getByLabelText(/Bank Name/i)).toHaveValue(
      "Updated Prop Name"
    );
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      "Updated prop description"
    );
  });

  test("dismisses error message", async () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/Bank Name/i), {
      target: { value: "  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    const errorMessage = await screen.findByText("Bank name cannot be empty.");
    expect(errorMessage).toBeInTheDocument();

    // Assuming ErrorMessage component has a dismiss button or functionality
    // If ErrorMessage has a button with text "Dismiss" or similar:
    const dismissButton = screen.getByRole("button", { name: /close/i }); // Adjust if your ErrorMessage has a different dismiss mechanism
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Bank name cannot be empty.")
      ).not.toBeInTheDocument();
    });
  });

  test("handles submission when description is initially empty and then set", async () => {
    const bankWithoutDescription: IQuestionBank = {
      ...mockBank,
      description: undefined,
    };
    renderComponent(bankWithoutDescription);

    expect(screen.getByLabelText(/Description/i)).toHaveValue("");

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, {
      target: { value: "New Description" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateQuestionBank).toHaveBeenCalledWith(mockBank._id, {
        description: "New Description",
      });
    });
    expect(mockOnBankUpdated).toHaveBeenCalled();
  });

  test("handles submission when name is changed and description is cleared", async () => {
    renderComponent(); // Uses mockBank with initial description

    const nameInput = screen.getByLabelText(/Bank Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    fireEvent.change(nameInput, { target: { value: "Only Name Changed" } });
    fireEvent.change(descriptionInput, { target: { value: "" } }); // Clear description

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateQuestionBank).toHaveBeenCalledWith(mockBank._id, {
        name: "Only Name Changed",
        description: "",
      });
    });
    expect(mockOnBankUpdated).toHaveBeenCalled();
  });

  test("handles submission when only description is changed", async () => {
    renderComponent();
    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, {
      target: { value: "Only description changed" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateQuestionBank).toHaveBeenCalledWith(mockBank._id, {
        description: "Only description changed",
      });
    });
    expect(mockOnBankUpdated).toHaveBeenCalled();
  });
});
