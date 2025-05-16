import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateQuizModal from "./CreateQuizModal";
import { IMenuClient } from "../../types/menuTypes";

// Mock common components
const MockModal = ({ isOpen, onClose, title, footerContent, children }: any) =>
  isOpen ? (
    <div data-testid="modal">
      <h1>{title}</h1>
      <div>{children}</div>
      <footer>{footerContent}</footer>
      <button data-testid="modal-onclose-btn" onClick={onClose}>
        Close Modal
      </button>
    </div>
  ) : null;
MockModal.displayName = "MockModal";
jest.mock("../common/Modal", () => MockModal);

const MockButton = ({ onClick, children, variant, type, disabled }: any) => (
  <button
    data-testid={`button-${variant || "default"}${
      type === "button" ? "-button" : ""
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

const MockLoadingSpinner = ({ message }: { message?: string }) => (
  <div data-testid="loading-spinner">{message || "Loading..."}</div>
);
MockLoadingSpinner.displayName = "MockLoadingSpinner";
jest.mock("../common/LoadingSpinner", () => MockLoadingSpinner);

const MockErrorMessage = ({ message }: { message: string }) => (
  <div data-testid="error-message">{message}</div>
);
MockErrorMessage.displayName = "MockErrorMessage";
jest.mock("../common/ErrorMessage", () => MockErrorMessage);

const mockMenus: IMenuClient[] = [
  {
    _id: "menu1",
    name: "Appetizers",
    restaurantId: "r1",
    description: "Tasty starters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "menu2",
    name: "Main Courses",
    restaurantId: "r1",
    description: "Hearty meals",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "menu3",
    name: "Desserts",
    restaurantId: "r1",
    description: "Sweet treats",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("CreateQuizModal", () => {
  let mockOnClose: jest.Mock;
  let mockOnGenerate: jest.Mock;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnGenerate = jest.fn();
  });

  const renderModal = (
    isOpen: boolean,
    isLoadingMenus = false,
    isGenerating = false,
    menus = mockMenus
  ) => {
    render(
      <CreateQuizModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        menus={menus}
        isLoadingMenus={isLoadingMenus}
        isGenerating={isGenerating}
      />
    );
  };

  test("renders nothing if isOpen is false", () => {
    renderModal(false);
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  test("renders modal with title and form elements when open", () => {
    renderModal(true);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Create New Quiz")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quiz Title/)).toBeInTheDocument();
    expect(
      screen.getByText("Select Menus to Generate Questions From")
    ).toBeInTheDocument();
  });

  test("shows loading spinner for menus if isLoadingMenus is true", () => {
    renderModal(true, true);
    expect(screen.getByTestId("loading-spinner")).toHaveTextContent(
      "Loading menus..."
    );
  });

  test("displays menus correctly when loaded", () => {
    renderModal(true);
    mockMenus.forEach((menu) => {
      expect(screen.getByLabelText(menu.name)).toBeInTheDocument();
    });
  });

  test('shows "no menus found" message if menus array is empty', () => {
    renderModal(true, false, false, []);
    expect(
      screen.getByText("No menus found. Please create menus first.")
    ).toBeInTheDocument();
  });

  test("updates quiz title on input", () => {
    renderModal(true);
    const titleInput = screen.getByLabelText(/Quiz Title/);
    fireEvent.change(titleInput, { target: { value: "My New Quiz" } });
    expect(titleInput).toHaveValue("My New Quiz");
  });

  test("selects and deselects menus", () => {
    renderModal(true);
    const menu1Checkbox = screen.getByLabelText(
      mockMenus[0].name
    ) as HTMLInputElement;
    const menu2Checkbox = screen.getByLabelText(
      mockMenus[1].name
    ) as HTMLInputElement;

    fireEvent.click(menu1Checkbox);
    expect(menu1Checkbox.checked).toBe(true);
    fireEvent.click(menu2Checkbox);
    expect(menu2Checkbox.checked).toBe(true);
    fireEvent.click(menu1Checkbox);
    expect(menu1Checkbox.checked).toBe(false);
  });

  describe("Generate Quiz Button State and Validation", () => {
    test("Generate Quiz button is initially disabled", () => {
      renderModal(true);
      // Primary button is the generate button based on footer structure
      expect(screen.getByTestId("button-primary-button")).toBeDisabled();
    });

    test("Generate Quiz button enabled when title and menu are selected", () => {
      renderModal(true);
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "Test Quiz" },
      });
      fireEvent.click(screen.getByLabelText(mockMenus[0].name));
      expect(screen.getByTestId("button-primary-button")).not.toBeDisabled();
    });

    test("Generate Quiz button disabled if title is empty after selection", () => {
      renderModal(true);
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "Test Quiz" },
      });
      fireEvent.click(screen.getByLabelText(mockMenus[0].name));
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "   " },
      });
      expect(screen.getByTestId("button-primary-button")).toBeDisabled();
    });

    test("Generate Quiz button disabled if no menus selected after providing title", () => {
      renderModal(true);
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "Test Quiz" },
      });
      fireEvent.click(screen.getByLabelText(mockMenus[0].name)); // Select
      fireEvent.click(screen.getByLabelText(mockMenus[0].name)); // Deselect
      expect(screen.getByTestId("button-primary-button")).toBeDisabled();
    });

    test("Generate Quiz button shows loading state when isGenerating is true", () => {
      renderModal(true, false, true);
      // Fill form to enable button if it weren't for isGenerating
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "Test Quiz" },
      });
      fireEvent.click(screen.getByLabelText(mockMenus[0].name));

      expect(screen.getByTestId("button-primary-button")).toBeDisabled();
      expect(screen.getByTestId("button-primary-button")).toHaveTextContent(
        "Generating..."
      );
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Form Submission and Callbacks", () => {
    test("shows error if title is empty on generate click", () => {
      renderModal(true);
      fireEvent.click(screen.getByLabelText(mockMenus[0].name)); // Select a menu
      fireEvent.click(screen.getByTestId("button-primary-button"));
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Please enter a quiz title."
      );
      expect(mockOnGenerate).not.toHaveBeenCalled();
    });

    test("shows error if no menus selected on generate click", () => {
      renderModal(true);
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "Test Quiz" },
      });
      fireEvent.click(screen.getByTestId("button-primary-button"));
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Please select at least one menu."
      );
      expect(mockOnGenerate).not.toHaveBeenCalled();
    });

    test("calls onGenerate with title and selected menuIds on successful click", () => {
      renderModal(true);
      const quizTitle = "My Awesome Quiz";
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: quizTitle },
      });
      fireEvent.click(screen.getByLabelText(mockMenus[0].name));
      fireEvent.click(screen.getByLabelText(mockMenus[2].name));

      fireEvent.click(screen.getByTestId("button-primary-button"));

      expect(mockOnGenerate).toHaveBeenCalledWith(quizTitle, [
        mockMenus[0]._id,
        mockMenus[2]._id,
      ]);
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    });

    test("clears errors on valid input after an error was shown", () => {
      renderModal(true);
      // Trigger title error
      fireEvent.click(screen.getByLabelText(mockMenus[0].name));
      fireEvent.click(screen.getByTestId("button-primary-button"));
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Please enter a quiz title."
      );

      // Fix title error
      fireEvent.change(screen.getByLabelText(/Quiz Title/), {
        target: { value: "Valid Title" },
      });
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();

      // Trigger menu selection error
      fireEvent.click(screen.getByLabelText(mockMenus[0].name)); // Deselect menu
      fireEvent.click(screen.getByTestId("button-primary-button"));
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Please select at least one menu."
      );

      // Fix menu selection error
      fireEvent.click(screen.getByLabelText(mockMenus[1].name));
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    });
  });

  test("calls onClose when Cancel button is clicked", () => {
    renderModal(true);
    fireEvent.click(screen.getByTestId("button-secondary-button"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("form resets when modal is reopened", () => {
    const { rerender } = render(
      <CreateQuizModal
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        menus={mockMenus}
        isLoadingMenus={false}
        isGenerating={false}
      />
    );
    fireEvent.change(screen.getByLabelText(/Quiz Title/), {
      target: { value: "Old Title" },
    });
    fireEvent.click(screen.getByLabelText(mockMenus[0].name));

    rerender(
      <CreateQuizModal
        isOpen={false}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        menus={mockMenus}
        isLoadingMenus={false}
        isGenerating={false}
      />
    );
    rerender(
      <CreateQuizModal
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        menus={mockMenus}
        isLoadingMenus={false}
        isGenerating={false}
      />
    );

    expect(screen.getByLabelText(/Quiz Title/)).toHaveValue("");
    expect(
      (screen.getByLabelText(mockMenus[0].name) as HTMLInputElement).checked
    ).toBe(false);
    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
  });
});
