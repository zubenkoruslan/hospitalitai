import { render, screen } from "@testing-library/react";
import Card from "./Card";

describe("Card Component", () => {
  test("renders children correctly", () => {
    render(
      <Card>
        <div>Child Content</div>
      </Card>
    );
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  test("renders title when provided", () => {
    const cardTitle = "Test Card Title";
    render(<Card title={cardTitle}>Content</Card>);
    expect(
      screen.getByRole("heading", { name: cardTitle, level: 3 })
    ).toBeInTheDocument();
  });

  test("does not render title when not provided", () => {
    render(<Card>Content</Card>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  test("applies default styles", () => {
    render(<Card data-testid="card-component">Content</Card>);
    const cardElement = screen.getByTestId("card-component");
    expect(cardElement).toHaveClass("bg-white");
    expect(cardElement).toHaveClass("p-4");
    expect(cardElement).toHaveClass("rounded-lg");
    expect(cardElement).toHaveClass("shadow");
    expect(cardElement).toHaveClass("border");
    expect(cardElement).toHaveClass("border-gray-200");
  });

  test("applies additional className when provided", () => {
    const customClass = "my-custom-card-class";
    render(
      <Card className={customClass} data-testid="card-component">
        Content
      </Card>
    );
    expect(screen.getByTestId("card-component")).toHaveClass(customClass);
  });

  test("renders with data-testid attribute", () => {
    const testId = "my-card";
    render(<Card data-testid={testId}>Content</Card>);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});
