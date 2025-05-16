import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorMessage from "./ErrorMessage";

describe("ErrorMessage Component", () => {
  test("renders the error message correctly", () => {
    const errorMessageText = "This is a test error.";
    render(<ErrorMessage message={errorMessageText} />);
    expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessageText)).toBeInTheDocument();
    // Check for ARIA role
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  test("does not render dismiss button when onDismiss is not provided", () => {
    render(<ErrorMessage message="Test error without dismiss" />);
    expect(
      screen.queryByRole("button", { name: /Dismiss error/i })
    ).not.toBeInTheDocument();
  });

  test("renders dismiss button when onDismiss is provided", () => {
    const mockOnDismiss = jest.fn();
    render(
      <ErrorMessage
        message="Test error with dismiss"
        onDismiss={mockOnDismiss}
      />
    );
    expect(
      screen.getByRole("button", { name: /Dismiss error/i })
    ).toBeInTheDocument();
  });

  test("calls onDismiss when dismiss button is clicked", () => {
    const mockOnDismiss = jest.fn();
    render(
      <ErrorMessage
        message="Test error with dismiss"
        onDismiss={mockOnDismiss}
      />
    );
    const dismissButton = screen.getByRole("button", {
      name: /Dismiss error/i,
    });
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test("applies correct styling classes", () => {
    render(<ErrorMessage message="Styled error" data-testid="error-message" />); // Assuming ErrorMessage accepts data-testid or we wrap it for test id
    // To test styling, we'd ideally get the root element of ErrorMessage.
    // If ErrorMessage renders a single root div, we can target it.
    // For this example, we'll assume the role='alert' div is the main container.
    const errorContainer = screen.getByRole("alert");
    expect(errorContainer).toHaveClass("bg-red-100");
    expect(errorContainer).toHaveClass("border-red-400");
    expect(errorContainer).toHaveClass("text-red-700");
  });
});
