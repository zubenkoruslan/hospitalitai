import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MenuDetailsEditModal from "./MenuDetailsEditModal";

// Mock common components that are direct children or rely on context if necessary
// Button and ErrorMessage are used, so we'll mock them.

jest.mock(
  "../common/Button",
  () =>
    (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: any
    ) =>
      (
        <button
          onClick={props.onClick}
          type={props.type || "button"} // Ensure type is set for form submission testing
          disabled={props.disabled}
          data-variant={props.variant}
          // form={props.form} // Not used by MenuDetailsEditModal's own buttons
        >
          {props.children}
        </button>
      )
);

jest.mock(
  "../common/ErrorMessage",
  () =>
    ({ message }: { message: string }) =>
      <div data-testid="error-message">{message}</div>
);

const mockOnClose = jest.fn();
const mockOnSubmit = jest.fn().mockResolvedValue(undefined); // Default to resolve

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onSubmit: mockOnSubmit,
  initialName: "Original Menu Name",
  initialDescription: "Original menu description.",
  isSaving: false,
  error: null,
};

describe("MenuDetailsEditModal Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset onSubmit to a simple resolved promise for each test if needed
    mockOnSubmit.mockResolvedValue(undefined);
  });

  test("renders correctly when open with initial values", () => {
    render(<MenuDetailsEditModal {...defaultProps} />);
    expect(
      screen.getByRole("dialog", { name: "Edit Menu Details" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Menu Name/i)).toHaveValue(
      defaultProps.initialName
    );
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      defaultProps.initialDescription
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Close modal")).toBeInTheDocument(); // Explicit close button
  });

  test("does not render when isOpen is false", () => {
    render(<MenuDetailsEditModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("updates input fields as user types", async () => {
    render(<MenuDetailsEditModal {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "New Menu Name");
    expect(nameInput).toHaveValue("New Menu Name");

    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, "New description.");
    expect(descriptionInput).toHaveValue("New description.");
  });

  test('calls onClose when "Cancel" button is clicked', () => {
    render(<MenuDetailsEditModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when the explicit "X" close button is clicked', () => {
    render(<MenuDetailsEditModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when overlay is clicked", () => {
    render(<MenuDetailsEditModal {...defaultProps} />);
    // The overlay is the div with role="dialog"
    fireEvent.click(screen.getByRole("dialog"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("does not call onClose when clicking inside modal content area", () => {
    render(<MenuDetailsEditModal {...defaultProps} />);
    // Click on an element presumed to be inside the content, like the name input's label
    fireEvent.click(screen.getByText("Menu Name").closest("div.bg-white")!); // Click the content card
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('calls onSubmit with form values when "Save Changes" is clicked', async () => {
    render(<MenuDetailsEditModal {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    const newName = "Updated Name";
    const newDescription = "Updated Description";

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, newName);
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, newDescription);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(newName, newDescription);
    });
    // Modal should not close itself based on component logic
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test("disables form and shows saving text when isSaving is true", () => {
    render(<MenuDetailsEditModal {...defaultProps} isSaving={true} />);
    expect(screen.getByLabelText(/Menu Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    // The save button's text changes to "Saving..." and it's also disabled
    const saveButton = screen.getByRole("button", { name: "Saving..." });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  test("disables save button if menu name is empty or whitespace", async () => {
    render(<MenuDetailsEditModal {...defaultProps} initialName="" />); // Start with empty name
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const saveButton = screen.getByRole("button", { name: "Save Changes" });

    expect(saveButton).toBeDisabled(); // Should be disabled initially due to empty name

    await userEvent.clear(nameInput); // ensure it's empty
    await userEvent.type(nameInput, "   "); // Type whitespace
    expect(saveButton).toBeDisabled();

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Valid Name"); // Type valid name
    expect(saveButton).toBeEnabled();

    await userEvent.clear(nameInput); // Clear again
    expect(saveButton).toBeDisabled();
  });

  test("enables save button if menu name is not empty", async () => {
    render(<MenuDetailsEditModal {...defaultProps} initialName="Test" />); // Start with a valid name
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    expect(saveButton).toBeEnabled();

    await userEvent.clear(nameInput);
    expect(saveButton).toBeDisabled();
  });

  test("displays error message when error prop is provided", () => {
    const errorMessage = "Failed to save menu details.";
    render(<MenuDetailsEditModal {...defaultProps} error={errorMessage} />);
    expect(screen.getByTestId("error-message")).toHaveTextContent(errorMessage);
  });

  test("form fields reset to initial values when modal is re-rendered with new initial props", () => {
    const { rerender } = render(<MenuDetailsEditModal {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    userEvent.clear(nameInput);
    userEvent.type(nameInput, "Temporary Name");
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, "Temporary Description");

    // Rerender with different initial props
    const newInitialProps = {
      ...defaultProps,
      initialName: "Another Original Name",
      initialDescription: "Another original description.",
    };
    rerender(<MenuDetailsEditModal {...newInitialProps} />);

    expect(nameInput).toHaveValue(newInitialProps.initialName);
    expect(descriptionInput).toHaveValue(newInitialProps.initialDescription);
  });

  test("form fields reset to initial values when modal is closed (isOpen=false) and reopened (isOpen=true)", async () => {
    const { rerender } = render(
      <MenuDetailsEditModal {...defaultProps} isOpen={true} />
    );
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Changed Name Value");
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, "Changed Description Value");

    expect(nameInput).toHaveValue("Changed Name Value");
    expect(descriptionInput).toHaveValue("Changed Description Value");

    // Simulate closing the modal
    rerender(<MenuDetailsEditModal {...defaultProps} isOpen={false} />);

    // Simulate reopening the modal (initialName and initialDescription from defaultProps should be used)
    rerender(<MenuDetailsEditModal {...defaultProps} isOpen={true} />); // nameInput and descriptionInput refs are still valid

    expect(nameInput).toHaveValue(defaultProps.initialName);
    expect(descriptionInput).toHaveValue(defaultProps.initialDescription);
  });
});
