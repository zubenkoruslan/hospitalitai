import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HomePage from "./HomePage";

// Mock the Button component to avoid testing its implementation
const MockButton = ({
  children,
  variant,
  className,
  ...props
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
  [key: string]: unknown;
}) => {
  return (
    <button data-testid={`button-${variant}`} className={className} {...props}>
      {children}
    </button>
  );
};
MockButton.displayName = "MockButton";
jest.mock("../components/common/Button", () => MockButton);

describe("HomePage", () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
  });

  test("renders the welcome heading", () => {
    const welcomeElement = screen.getByText(/Welcome to/i);
    const QuizCrunchElement = screen.getByText(/QuizCrunch/i);
    expect(welcomeElement).toBeInTheDocument();
    expect(QuizCrunchElement).toBeInTheDocument();
  });

  test("renders the sign in and create account buttons", () => {
    const signInButton = screen.getByTestId("button-primary");
    const createAccountButton = screen.getByTestId("button-secondary");

    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveTextContent("Sign In");

    expect(createAccountButton).toBeInTheDocument();
    expect(createAccountButton).toHaveTextContent("Create Account");
  });

  test("renders the three feature sections", () => {
    const menuManagement = screen.getByText(/Menu Management/i);
    const staffTraining = screen.getByText(/Staff Training/i);
    const analytics = screen.getByText(/Analytics/i);

    expect(menuManagement).toBeInTheDocument();
    expect(staffTraining).toBeInTheDocument();
    expect(analytics).toBeInTheDocument();
  });

  test("renders the CTA section", () => {
    const ctaHeading = screen.getByText(/Ready to get started\?/i);
    const ctaButton = screen.getByTestId("button-white");

    expect(ctaHeading).toBeInTheDocument();
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveTextContent("Create Your Account");
  });

  test("renders the footer", () => {
    const currentYear = new Date().getFullYear();
    const footerElement = screen.getByText(
      new RegExp(`Copyright © ${currentYear} QuizCrunch`, "i")
    );

    expect(footerElement).toBeInTheDocument();
  });
});
