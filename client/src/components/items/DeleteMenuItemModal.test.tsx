import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom"; // Import jest-dom matchers
// import { describe, it, expect, vi } from "vitest"; // Remove Vitest imports
import DeleteMenuItemModal from "./DeleteMenuItemModal";

describe("DeleteMenuItemModal", () => {
  const mockOnClose = jest.fn(); // Use jest.fn()
  const mockOnConfirm = jest.fn(); // Use jest.fn()
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    itemName: "Test Item Burger",
    isSubmitting: false,
  };

  beforeEach(() => {
    // Reset mocks before each test
    // vi.clearAllMocks(); // Remove Vitest specific mock clearing
    mockOnClose.mockClear(); // Clear Jest mocks individually
    mockOnConfirm.mockClear();
  });

  it("renders correctly when open", () => {
    render(<DeleteMenuItemModal {...defaultProps} />);

    // Check for key elements
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm Deletion")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete the item/)
    ).toBeInTheDocument();
    expect(screen.getByText(defaultProps.itemName)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Item" })
    ).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<DeleteMenuItemModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when Cancel button is clicked", () => {
    render(<DeleteMenuItemModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when Delete Item button is clicked", () => {
    render(<DeleteMenuItemModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Item" }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("disables buttons and shows submitting text when isSubmitting is true", () => {
    render(<DeleteMenuItemModal {...defaultProps} isSubmitting={true} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const deleteButton = screen.getByRole("button", { name: /Deleting.../i }); // Match submitting text

    expect(cancelButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveTextContent("Deleting...");

    // Ensure original button text isn't present
    expect(
      screen.queryByRole("button", { name: "Delete Item" })
    ).not.toBeInTheDocument();
  });

  // Add more tests here...
});
