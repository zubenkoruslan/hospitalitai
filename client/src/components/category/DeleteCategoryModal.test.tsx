import { render, screen, fireEvent } from "@testing-library/react";
import DeleteCategoryModal from "./DeleteCategoryModal";

// Mock the Modal and Button components as they are tested separately
// and we want to focus on DeleteCategoryModal's logic.
const MockModal = (props: any) => (
  <div data-testid="mock-modal" data-isopen={props.isOpen.toString()}>
    {props.title && <h1>{props.title}</h1>}
    <div>{props.children}</div>
    {props.footerContent && <footer>{props.footerContent}</footer>}
    <button onClick={props.onClose}>Close Modal</button>{" "}
    {/* For testing onClose from Modal interaction if needed */}
  </div>
);
MockModal.displayName = "MockModal";
jest.mock("../common/Modal", () => MockModal);

const MockButton = (props: any) => (
  <button
    onClick={props.onClick}
    disabled={props.disabled}
    data-variant={props.variant}
    className={props.className}
  >
    {props.children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

describe("DeleteCategoryModal Component", () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();
  const categoryName = "Appetizers";

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  test("does not render if isOpen is false", () => {
    render(
      <DeleteCategoryModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={categoryName}
        isDeleting={false}
      />
    );
    expect(screen.queryByTestId("mock-modal")).toHaveAttribute(
      "data-isopen",
      "false"
    );
    // Or check if specific content is not present
    expect(
      screen.queryByText(`Delete Category: ${categoryName}?`)
    ).not.toBeInTheDocument();
  });

  test("does not render if categoryName is null", () => {
    render(
      <DeleteCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={null}
        isDeleting={false}
      />
    );
    // The component returns null, so queryByTestId won't find the mock modal container either
    expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument();
  });

  test("renders correctly when isOpen is true and categoryName is provided", () => {
    render(
      <DeleteCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={categoryName}
        isDeleting={false}
      />
    );
    expect(screen.getByTestId("mock-modal")).toHaveAttribute(
      "data-isopen",
      "true"
    );
    expect(
      screen.getByRole("heading", { name: `Delete Category: ${categoryName}?` })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete the category/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(categoryName, { exact: false })
    ).toBeInTheDocument(); // part of the message
    expect(
      screen.getByText(
        /All items currently in this category will be reassigned/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Non Assigned/)).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone./)
    ).toBeInTheDocument();

    // Check for buttons via their text (since we mocked Button)
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm Delete" })
    ).toBeInTheDocument();
  });

  test("calls onClose when cancel button is clicked", () => {
    render(
      <DeleteCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={categoryName}
        isDeleting={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onConfirm when confirm delete button is clicked", () => {
    render(
      <DeleteCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={categoryName}
        isDeleting={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  test('buttons are disabled and confirm button shows "Deleting..." when isDeleting is true', () => {
    render(
      <DeleteCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={categoryName}
        isDeleting={true}
      />
    );
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const deleteButton = screen.getByRole("button", { name: "Deleting..." }); // Text changes

    expect(cancelButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toBeInTheDocument(); // Verify it's found with the new text
  });

  test("confirm button has destructive variant", () => {
    render(
      <DeleteCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={categoryName}
        isDeleting={false}
      />
    );
    const deleteButton = screen.getByRole("button", { name: "Confirm Delete" });
    expect(deleteButton).toHaveAttribute("data-variant", "destructive");
  });

  test("cancel button has secondary variant", () => {
    render(
      <DeleteCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        categoryName={categoryName}
        isDeleting={false}
      />
    );
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toHaveAttribute("data-variant", "secondary");
  });
});
