import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmationModalContent from "./ConfirmationModalContent";

describe("ConfirmationModalContent Component", () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  test("renders message and default button texts", () => {
    const message = "Are you sure you want to proceed?";
    render(
      <ConfirmationModalContent
        message={message}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Confirm/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  test("renders custom button texts", () => {
    render(
      <ConfirmationModalContent
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirmText="Yes, Proceed"
        cancelText="No, Go Back"
      />
    );
    expect(
      screen.getByRole("button", { name: /Yes, Proceed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /No, Go Back/i })
    ).toBeInTheDocument();
  });

  test("calls onConfirm when confirm button is clicked", () => {
    render(
      <ConfirmationModalContent
        message="Confirm action"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  test("calls onCancel when cancel button is clicked", () => {
    render(
      <ConfirmationModalContent
        message="Confirm action"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  test("applies confirmButtonVariant to confirm button", () => {
    render(
      <ConfirmationModalContent
        message="Confirm destructive action"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirmButtonVariant="destructive"
      />
    );
    const confirmButton = screen.getByRole("button", { name: /Confirm/i });
    // We check for a class associated with the destructive variant from Button.tsx
    expect(confirmButton).toHaveClass("bg-red-600");
  });

  test("disables buttons and shows loading on confirm button when isLoadingConfirm is true", () => {
    render(
      <ConfirmationModalContent
        message="Processing action"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoadingConfirm={true}
      />
    );
    const confirmButton = screen.getByRole("button", { name: /Confirm/i });
    const cancelButton = screen.getByRole("button", { name: /Cancel/i });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    // Check for "Processing..." text or part of SVG within the confirm button
    expect(confirmButton.textContent).toMatch(/Processing.../i);
    expect(confirmButton.querySelector("svg")).toBeInTheDocument();
  });

  test("does not call onConfirm or onCancel when buttons are clicked if isLoadingConfirm is true", () => {
    render(
      <ConfirmationModalContent
        message="Processing action"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoadingConfirm={true}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnConfirm).not.toHaveBeenCalled();
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  // The title prop is commented out in the component, so this test might be optional
  // or verify that no such title appears by default in this content section.
  test("does not render its own title by default (expects parent Modal to handle main title)", () => {
    render(
      <ConfirmationModalContent
        message="A message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    // Query for h3 or similar that might be used for the title within this component
    const contentTitle = screen.queryByRole("heading", {
      level: 3,
      name: /Confirm Action/i,
    });
    expect(contentTitle).not.toBeInTheDocument();
  });
});
