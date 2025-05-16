import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SuccessNotification from "./SuccessNotification";

describe("SuccessNotification Component", () => {
  jest.useFakeTimers(); // Use Jest fake timers

  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
    jest.clearAllTimers(); // Clear any pending timers before each test
  });

  test("renders the success message correctly", () => {
    const successMessageText = "Operation completed successfully!";
    render(
      <SuccessNotification
        message={successMessageText}
        onDismiss={mockOnDismiss}
      />
    );
    expect(screen.getByText(successMessageText)).toBeInTheDocument();
    // Check for ARIA role
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // Check for dismiss button
    expect(
      screen.getByRole("button", { name: /Dismiss notification/i })
    ).toBeInTheDocument();
  });

  test("calls onDismiss when dismiss button is clicked", () => {
    render(
      <SuccessNotification message="Test success" onDismiss={mockOnDismiss} />
    );
    const dismissButton = screen.getByRole("button", {
      name: /Dismiss notification/i,
    });
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test("calls onDismiss automatically after 3 seconds", () => {
    render(
      <SuccessNotification
        message="Auto dismiss test"
        onDismiss={mockOnDismiss}
      />
    );
    expect(mockOnDismiss).not.toHaveBeenCalled(); // Initially not called

    // Fast-forward time by 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test("clears the timer on unmount", () => {
    const { unmount } = render(
      <SuccessNotification message="Unmount test" onDismiss={mockOnDismiss} />
    );
    unmount();

    // Fast-forward time to ensure the timer would have fired if not cleared
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  test("applies correct styling classes", () => {
    render(
      <SuccessNotification message="Styled success" onDismiss={mockOnDismiss} />
    );
    const notificationContainer = screen.getByRole("alert");
    expect(notificationContainer).toHaveClass("bg-green-100");
    expect(notificationContainer).toHaveClass("border-green-400");
    expect(notificationContainer).toHaveClass("text-green-700");
  });

  test("restarts timer if onDismiss prop changes (though unlikely for this component structure)", () => {
    const firstOnDismiss = jest.fn();
    const secondOnDismiss = jest.fn();

    const { rerender } = render(
      <SuccessNotification message="Test" onDismiss={firstOnDismiss} />
    );

    act(() => {
      jest.advanceTimersByTime(1500); // Advance half way
    });
    expect(firstOnDismiss).not.toHaveBeenCalled();

    rerender(
      <SuccessNotification message="Test" onDismiss={secondOnDismiss} />
    );

    act(() => {
      jest.advanceTimersByTime(1500); // Advance another 1.5s
    });
    // The first timer should have been cleared, so firstOnDismiss is not called
    expect(firstOnDismiss).not.toHaveBeenCalled();
    // The second timer hasn't completed its full 3s yet
    expect(secondOnDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1500); // Advance remaining 1.5s for the new timer
    });
    expect(secondOnDismiss).toHaveBeenCalledTimes(1);
  });
});
