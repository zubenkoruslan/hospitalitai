import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { AuthContext, AuthContextType } from "../../context/AuthContext"; // Adjust path as needed
import PdfMenuUpload from "./PdfMenuUpload";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock common components if they interfere or for simplicity
const MockModal = (props: any) =>
  props.isOpen ? (
    <div data-testid="mock-modal" role="dialog">
      <h1>{props.title}</h1>
      <div>{props.children}</div>
      <footer>{props.footerContent}</footer>
    </div>
  ) : null;
MockModal.displayName = "MockModal";
jest.mock("../common/Modal", () => MockModal);

const MockButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant: string;
    form?: string;
  }
) => (
  <button {...props} data-variant={props.variant} form={props.form}>
    {props.children}
  </button>
);
MockButton.displayName = "MockButton";
jest.mock("../common/Button", () => MockButton);

const MockErrorMessage = ({ message }: { message: string }) => (
  <div data-testid="error-message">{message}</div>
);
MockErrorMessage.displayName = "MockErrorMessage";
jest.mock("../common/ErrorMessage", () => MockErrorMessage);

const MockLoadingSpinner = ({ message }: { message?: string }) => (
  <div data-testid="loading-spinner">{message || "Loading..."}</div>
);
MockLoadingSpinner.displayName = "MockLoadingSpinner";
jest.mock("../common/LoadingSpinner", () => MockLoadingSpinner);

const mockAuthContextValue: AuthContextType = {
  token: "test-token",
  user: null,
  isLoading: false,
  error: null,
  login: jest.fn(),
  logout: jest.fn(),
};

const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContextValue}>
      {ui}
    </AuthContext.Provider>
  );
};

describe("PdfMenuUpload Component", () => {
  const mockOnClose = jest.fn();
  const mockOnUploadSuccess = jest.fn();
  const mockOnUploadError = jest.fn();
  const restaurantId = "res123";

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    restaurantId: restaurantId,
    onUploadSuccess: mockOnUploadSuccess,
    onUploadError: mockOnUploadError,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset axios mock implementations before each test
    mockedAxios.post.mockReset();
  });

  test("renders correctly when open", () => {
    renderWithAuth(<PdfMenuUpload {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Upload PDF Menu")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Drop PDF file here or click to select a file",
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload Menu" })).toBeDisabled(); // Disabled initially
  });

  test("does not render when isOpen is false", () => {
    renderWithAuth(<PdfMenuUpload {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("allows file selection via click on dropzone and validates PDF type", async () => {
    renderWithAuth(<PdfMenuUpload {...defaultProps} />);
    const fileInput = screen.getByLabelText(
      "Drop PDF file here or click to select a file"
    ).previousSibling as HTMLInputElement;

    const pdfFile = new File(["dummy pdf content"], "menu.pdf", {
      type: "application/pdf",
    });
    const txtFile = new File(["text content"], "notes.txt", {
      type: "text/plain",
    });

    // Valid PDF
    await userEvent.upload(fileInput, pdfFile);
    expect(screen.getByText(/menu.pdf/i)).toBeInTheDocument();
    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload Menu" })).toBeEnabled();

    // Invalid TXT file
    await userEvent.upload(fileInput, txtFile);
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      /Invalid file type/i
    );
    expect(screen.queryByText(/menu.pdf/i)).not.toBeInTheDocument(); // Old file name gone
    expect(screen.queryByText(/notes.txt/i)).not.toBeInTheDocument(); // Invalid file name not shown as selected
    expect(screen.getByRole("button", { name: "Upload Menu" })).toBeDisabled();
  });

  test("allows file selection via keyboard (Enter key) on dropzone", async () => {
    renderWithAuth(<PdfMenuUpload {...defaultProps} />);
    const dropzone = screen.getByRole("button", {
      name: "Drop PDF file here or click to select a file",
    });
    const fileInput = dropzone.previousSibling as HTMLInputElement;
    const pdfFile = new File(["menu content"], "keyboard_menu.pdf", {
      type: "application/pdf",
    });

    // Mock the upload to simulate file selection since direct fireEvent.keyDown doesn't trigger system dialog
    const originalUpload = userEvent.upload;
    (userEvent as any).upload = jest.fn(async (inputEl, file) => {
      // Simulate the file being selected in the input
      Object.defineProperty(inputEl, "files", {
        value: [file],
        writable: true,
      });
      fireEvent.change(inputEl);
    });

    dropzone.focus();
    fireEvent.keyDown(dropzone, { key: "Enter", code: "Enter" });
    // Call the mocked upload to simulate file selection
    await (userEvent as any).upload(fileInput, pdfFile);

    expect(screen.getByText(/keyboard_menu.pdf/i)).toBeInTheDocument();
    (userEvent as any).upload = originalUpload; // Restore original
  });

  // Drag and Drop tests are more complex and might require specific setup or libraries, focusing on core logic for now.

  test("handles successful upload", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { message: "Upload successful!", data: { menuId: "newMenu123" } },
    });

    renderWithAuth(<PdfMenuUpload {...defaultProps} />);
    const fileInput = screen.getByLabelText(
      "Drop PDF file here or click to select a file"
    ).previousSibling as HTMLInputElement;
    const pdfFile = new File(["content"], "success.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(fileInput, pdfFile);

    const uploadButton = screen.getByRole("button", { name: "Upload Menu" });
    fireEvent.click(uploadButton);

    expect(
      screen.getByRole("button", { name: /Uploading/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Uploading/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `/api/menus/upload/pdf/${restaurantId}`,
      expect.any(FormData), // Check that FormData is sent
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockAuthContextValue.token}`,
        }),
      })
    );

    await waitFor(() =>
      expect(screen.getByText("Upload successful!")).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(mockOnUploadSuccess).toHaveBeenCalledWith({ menuId: "newMenu123" })
    );
    expect(screen.queryByText(/success.pdf/)).not.toBeInTheDocument(); // File selection should reset
  });

  test("handles upload progress", async () => {
    let onUploadProgressCallback: (event: any) => void = () => {};
    mockedAxios.post.mockImplementationOnce((url, data, config) => {
      if (config && config.onUploadProgress) {
        onUploadProgressCallback = config.onUploadProgress;
      }
      return new Promise((_resolve, _reject) => {
        // Don't resolve immediately to keep loading state
      });
    });

    renderWithAuth(<PdfMenuUpload {...defaultProps} />);
    const fileInput = screen.getByLabelText(
      "Drop PDF file here or click to select a file"
    ).previousSibling as HTMLInputElement;
    const pdfFile = new File(["content"], "progress.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(fileInput, pdfFile);
    fireEvent.click(screen.getByRole("button", { name: "Upload Menu" }));

    act(() => {
      onUploadProgressCallback({ loaded: 50, total: 100 });
    });
    await waitFor(() =>
      expect(screen.getByText(/Uploading \(50%\)/i)).toBeInTheDocument()
    );

    act(() => {
      onUploadProgressCallback({ loaded: 100, total: 100 });
    });
    await waitFor(() =>
      expect(screen.getByText(/Uploading \(100%\)/i)).toBeInTheDocument()
    );
  });

  test("handles upload failure", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: "Server error occurred" } },
    });

    renderWithAuth(<PdfMenuUpload {...defaultProps} />);
    const fileInput = screen.getByLabelText(
      "Drop PDF file here or click to select a file"
    ).previousSibling as HTMLInputElement;
    const pdfFile = new File(["content"], "fail.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(fileInput, pdfFile);
    fireEvent.click(screen.getByRole("button", { name: "Upload Menu" }));

    await waitFor(() =>
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Server error occurred"
      )
    );
    expect(mockOnUploadError).toHaveBeenCalledWith("Server error occurred");
    expect(screen.getByRole("button", { name: "Upload Menu" })).toBeEnabled(); // Re-enabled after error
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  test("shows error if no file is selected on submit", () => {
    renderWithAuth(<PdfMenuUpload {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload Menu" }));
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      /Please select or drop a PDF file/i
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test("resets state when modal is closed and reopened", async () => {
    const { rerender } = renderWithAuth(
      <PdfMenuUpload {...defaultProps} isOpen={true} />
    );
    const fileInput = screen.getByLabelText(
      "Drop PDF file here or click to select a file"
    ).previousSibling as HTMLInputElement;
    const pdfFile = new File(["content"], "reset.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(fileInput, pdfFile);
    expect(screen.getByText(/reset.pdf/i)).toBeInTheDocument();

    // Close the modal
    rerender(<PdfMenuUpload {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Reopen the modal
    rerender(<PdfMenuUpload {...defaultProps} isOpen={true} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(/reset.pdf/i)).not.toBeInTheDocument(); // File should be cleared
    expect(screen.getByRole("button", { name: "Upload Menu" })).toBeDisabled(); // Upload button disabled
  });
});
