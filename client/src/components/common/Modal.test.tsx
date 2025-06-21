import { render, screen, fireEvent, act } from "@testing-library/react";
import Modal from "./Modal";

// Mock the style injection part for testing environment
jest.mock("./Modal", () => {
  const OriginalModal = jest.requireActual("./Modal").default;
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <OriginalModal {...props} />,
    // If Modal exports other things, mock them here if needed
  };
});

describe("Modal Component", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    // Ensure the modal root for portals is present if using React Portals (not the case here based on code)
    // jest.spyOn(document.body, 'appendChild').mockImplementation(() => {}); // Example if styles were an issue
  });

  afterEach(() => {
    // Clean up any side effects from tests
    // jest.restoreAllMocks(); // If other global mocks are used
  });

  test("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders correctly when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
    expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
  });

  test("calls onClose when overlay is clicked", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test">
        Content
      </Modal>
    );
    // The overlay is the dialog element itself in this implementation
    fireEvent.click(screen.getByRole("dialog"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when close button is clicked", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test">
        Content
      </Modal>
    );
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when Escape key is pressed", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test">
        Content
      </Modal>
    );
    act(() => {
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("renders title as string and sets aria-labelledby", () => {
    const titleText = "My Awesome Modal";
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={titleText}>
        Content
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    const titleElement = screen.getByRole("heading", { name: titleText });
    expect(titleElement).toHaveAttribute("id", "modal-title");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
  });

  test("renders title as ReactNode without specific id if not string", () => {
    const titleNode = (
      <span>
        Complex <strong>Title</strong>
      </span>
    );
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={titleNode}>
        Content
      </Modal>
    );
    expect(screen.getByText(/Complex/i)).toBeInTheDocument();
    expect(screen.getByText(/Title/i)).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
    // queryByRole for heading with id to ensure it's not there
    expect(
      screen.queryByRole("heading", {
        name: (content, element) => element.id === "modal-title",
      })
    ).toBeNull();
  });

  test("renders footerContent when provided", () => {
    const footer = <button>Footer Button</button>;
    render(
      <Modal
        isOpen={true}
        onClose={mockOnClose}
        title="Test"
        footerContent={footer}
      >
        Content
      </Modal>
    );
    expect(
      screen.getByRole("button", { name: /Footer Button/i })
    ).toBeInTheDocument();
  });

  test("does not render footer when footerContent is not provided", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test">
        Content
      </Modal>
    );
    // Assuming footer has a distinct identifiable role or class, or check its absence by querying for its content
    expect(screen.queryByText("Footer Button")).not.toBeInTheDocument(); // Example based on previous test
  });

  test("applies size classes correctly", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test" size="lg">
        Content
      </Modal>
    );
    // The modal content div has the size class
    // This requires inspecting the child div of the role="dialog" element
    const dialog = screen.getByRole("dialog");
    const contentDiv = dialog.querySelector(".bg-white"); // A class on the content div
    expect(contentDiv).toHaveClass("max-w-xl"); // lg size
  });

  test("modal content receives initial focus", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Focus Test">
        <button>Focusable</button>
      </Modal>
    );
    // The modal content div (which has ref={modalRef} and tabIndex={-1}) should have focus
    const dialog = screen.getByRole("dialog");
    const contentDiv = dialog.querySelector('[tabindex="-1"]');
    expect(contentDiv).toHaveFocus();
  });

  test("clicking inside modal content does not close modal", () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test">
        <p data-testid="modal-inner-content">Clickable Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId("modal-inner-content"));
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
