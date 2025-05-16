import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditMenuModal from "./EditMenuModal";

// Mock common components
jest.mock(
  "../common/Modal",
  () =>
    ({
      isOpen,
      onClose,
      title,
      children,
      footerContent,
    }: {
      isOpen: boolean;
      onClose: () => void;
      title: string;
      children: React.ReactNode;
      footerContent: React.ReactNode;
    }) =>
      isOpen ? (
        <div data-testid="mock-modal" role="dialog" aria-label={title}>
          <h1>{title}</h1>
          <div>{children}</div>
          <footer>{footerContent}</footer>
          <button onClick={onClose}>MockCloseModal</button>{" "}
          {/* For testing modal close directly if needed */}
        </div>
      ) : null
);

jest.mock(
  "../common/Button",
  () =>
    (
      props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: string;
        form?: string;
      }
    ) =>
      (
        <button
          // eslint-disable-next-line react/prop-types
          onClick={props.onClick}
          // eslint-disable-next-line react/prop-types
          type={props.type}
          // eslint-disable-next-line react/prop-types
          disabled={props.disabled}
          // eslint-disable-next-line react/prop-types
          form={props.form}
          // eslint-disable-next-line react/prop-types
          data-variant={props.variant}
        >
          {/* eslint-disable-next-line react/prop-types */}
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
const mockOnSubmit = jest.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onSubmit: mockOnSubmit,
  initialName: "Original Menu Name",
  initialDescription: "Original menu description.",
  isSaving: false,
  error: null,
};

describe("EditMenuModal Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders correctly when open with initial values", () => {
    render(<EditMenuModal {...defaultProps} />);
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
      screen.getByRole("button", { name: "Save Menu Changes" })
    ).toBeInTheDocument();
  });

  test("does not render when isOpen is false", () => {
    render(<EditMenuModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("updates input fields as user types", async () => {
    render(<EditMenuModal {...defaultProps} />);
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
    render(<EditMenuModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onSubmit with form values when "Save Menu Changes" is clicked', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined); // Mock onSubmit to resolve
    render(<EditMenuModal {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    const newName = "Updated Name";
    const newDescription = "Updated Description";

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, newName);
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, newDescription);

    fireEvent.click(screen.getByRole("button", { name: "Save Menu Changes" }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(newName, newDescription);
    });
    // Modal should not close itself based on component logic: "Do not close on submit from here"
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test("disables form and shows saving text when isSaving is true", () => {
    render(<EditMenuModal {...defaultProps} isSaving={true} />);
    expect(screen.getByLabelText(/Menu Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Saving Menu..." })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Saving Menu..." })
    ).toBeInTheDocument();
  });

  test("disables save button if menu name is empty or whitespace", async () => {
    render(<EditMenuModal {...defaultProps} initialName="" />);
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const saveButton = screen.getByRole("button", {
      name: "Save Menu Changes",
    });

    // Initially empty
    expect(saveButton).toBeDisabled();

    // Type whitespace
    await userEvent.type(nameInput, "   ");
    expect(saveButton).toBeDisabled();

    // Type valid name
    await userEvent.type(nameInput, "Valid Name");
    expect(saveButton).toBeEnabled();

    // Clear again
    await userEvent.clear(nameInput);
    expect(saveButton).toBeDisabled();
  });

  test("enables save button if menu name is not empty", async () => {
    render(<EditMenuModal {...defaultProps} initialName="Test" />); // Start with a valid name
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const saveButton = screen.getByRole("button", {
      name: "Save Menu Changes",
    });
    expect(saveButton).toBeEnabled();

    await userEvent.clear(nameInput);
    expect(saveButton).toBeDisabled();
  });

  test("displays error message when error prop is provided", () => {
    const errorMessage = "Failed to save menu.";
    render(<EditMenuModal {...defaultProps} error={errorMessage} />);
    expect(screen.getByTestId("error-message")).toHaveTextContent(errorMessage);
  });

  test("form fields reset to initial values when modal is re-rendered with new initial props", () => {
    const { rerender } = render(<EditMenuModal {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    // Change values
    userEvent.clear(nameInput);
    userEvent.type(nameInput, "Temporary Name");
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, "Temporary Description");

    expect(nameInput).toHaveValue("Temporary Name");
    expect(descriptionInput).toHaveValue("Temporary Description");

    // Rerender with different initial props (simulating modal close and reopen with new data or prop update)
    const newInitialProps = {
      ...defaultProps,
      initialName: "Another Original Name",
      initialDescription: "Another original description.",
    };
    rerender(<EditMenuModal {...newInitialProps} />);

    expect(nameInput).toHaveValue(newInitialProps.initialName);
    expect(descriptionInput).toHaveValue(newInitialProps.initialDescription);
  });

  test("form fields reset to initial values when modal is closed and reopened (via isOpen prop)", () => {
    const { rerender } = render(
      <EditMenuModal {...defaultProps} isOpen={true} />
    );
    const nameInput = screen.getByLabelText(/Menu Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    // Change values
    userEvent.clear(nameInput);
    userEvent.type(nameInput, "Changed Name");
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, "Changed Description");

    expect(nameInput).toHaveValue("Changed Name");
    expect(descriptionInput).toHaveValue("Changed Description");

    // Simulate closing the modal
    rerender(<EditMenuModal {...defaultProps} isOpen={false} />);

    // Simulate reopening the modal (initialName and initialDescription from defaultProps should be used)
    rerender(<EditMenuModal {...defaultProps} isOpen={true} />);

    expect(nameInput).toHaveValue(defaultProps.initialName);
    expect(descriptionInput).toHaveValue(defaultProps.initialDescription);
  });
});
