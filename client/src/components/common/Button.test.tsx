import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./Button";

describe("Button Component", () => {
  test("renders button with children", () => {
    render(<Button>Click Me</Button>);
    expect(
      screen.getByRole("button", { name: /Click Me/i })
    ).toBeInTheDocument();
  });

  test("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole("button", { name: /Click Me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("applies primary variant styles by default", () => {
    render(<Button>Primary Button</Button>);
    const button = screen.getByRole("button", { name: /Primary Button/i });
    expect(button).toHaveClass("bg-blue-600"); // Primary variant class
  });

  test("applies secondary variant styles", () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole("button", { name: /Secondary Button/i });
    expect(button).toHaveClass("bg-white"); // Secondary variant class
    expect(button).toHaveClass("text-gray-700");
  });

  test("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(
      screen.getByRole("button", { name: /Disabled Button/i })
    ).toBeDisabled();
  });

  test("is disabled and shows loading spinner when isLoading prop is true", () => {
    render(<Button isLoading>Loading Button</Button>);
    const button = screen.getByRole("button", { name: /Loading Button/i });
    expect(button).toBeDisabled();
    // Check for "Processing..." text or part of SVG
    expect(screen.getByText(/Processing.../i)).toBeInTheDocument();
    // Check for SVG element (more robust to check for its presence)
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  test("does not call onClick when disabled", () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled Click
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: /Disabled Click/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test("applies custom className", () => {
    render(<Button className="custom-class">Custom Class Button</Button>);
    expect(
      screen.getByRole("button", { name: /Custom Class Button/i })
    ).toHaveClass("custom-class");
  });

  test('renders as type="submit" when specified', () => {
    render(<Button type="submit">Submit Button</Button>);
    expect(
      screen.getByRole("button", { name: /Submit Button/i })
    ).toHaveAttribute("type", "submit");
  });

  test('renders as type="button" by default', () => {
    render(<Button>Default Type Button</Button>);
    expect(
      screen.getByRole("button", { name: /Default Type Button/i })
    ).toHaveAttribute("type", "button");
  });

  // Test for spinner color in primary (default) variant
  test("shows white spinner for primary variant when isLoading", () => {
    render(<Button isLoading>Loading</Button>);
    const svg = screen
      .getByRole("button", { name: /Loading/i })
      .querySelector("svg");
    expect(svg).toHaveClass("text-white");
  });

  // Test for spinner color in secondary variant
  test("shows gray spinner for secondary variant when isLoading", () => {
    render(
      <Button variant="secondary" isLoading>
        Loading
      </Button>
    );
    const svg = screen
      .getByRole("button", { name: /Loading/i })
      .querySelector("svg");
    expect(svg).toHaveClass("text-gray-700");
  });

  // Test for spinner color in white variant
  test("shows blue spinner for white variant when isLoading", () => {
    render(
      <Button variant="white" isLoading>
        Loading
      </Button>
    );
    const svg = screen
      .getByRole("button", { name: /Loading/i })
      .querySelector("svg");
    expect(svg).toHaveClass("text-blue-600");
  });
});
