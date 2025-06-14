import { render, screen } from "@testing-library/react";
import LoadingSpinner from "./LoadingSpinner";

describe("LoadingSpinner Component", () => {
  test("renders spinner SVG", () => {
    render(<LoadingSpinner />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner-container")).toHaveAttribute(
      "role",
      "status"
    );
  });

  test("does not render message when not provided", () => {
    render(<LoadingSpinner />);
    expect(screen.queryByTestId("loading-message")).not.toBeInTheDocument();
  });

  test("renders message when provided", () => {
    const testMessage = "Loading data, please wait...";
    render(<LoadingSpinner message={testMessage} />);
    const messageElement = screen.getByTestId("loading-message");
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveTextContent(testMessage);
  });

  test("spinner SVG has correct animation class and color class", () => {
    render(<LoadingSpinner />);
    const spinnerSvg = screen.getByTestId("loading-spinner");
    expect(spinnerSvg).toHaveClass("animate-spin");
    expect(spinnerSvg).toHaveClass("h-8");
    expect(spinnerSvg).toHaveClass("w-8");
    expect(spinnerSvg).toHaveClass("text-blue-600"); // Default color
  });
});
