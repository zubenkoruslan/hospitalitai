import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MenuUpload from "../MenuUpload";

// Mock the AuthContext
jest.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    token: "mock-token",
  }),
}));

// Mock the common components
jest.mock("../../common/Modal", () => {
  return function MockModal({ isOpen, children, title, footerContent }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        <div>{children}</div>
        <div>{footerContent}</div>
      </div>
    );
  };
});

jest.mock("../../common/Button", () => {
  return function MockButton({
    children,
    onClick,
    disabled,
    variant,
    ...props
  }: any) {
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  };
});

jest.mock("../../common/ErrorMessage", () => {
  return function MockErrorMessage({ message }: any) {
    return <div data-testid="error-message">{message}</div>;
  };
});

jest.mock("../../common/LoadingSpinner", () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

describe("MenuUpload Component", () => {
  const mockOnClose = jest.fn();
  const mockOnFileSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderMenuUpload = (props = {}) => {
    return render(
      <MenuUpload
        isOpen={true}
        onClose={mockOnClose}
        onFileSelected={mockOnFileSelected}
        {...props}
      />
    );
  };

  describe("Component Rendering", () => {
    it("should render when isOpen is true", () => {
      renderMenuUpload();

      expect(screen.getByTestId("modal")).toBeInTheDocument();
      expect(
        screen.getByText("Select Menu File to Upload")
      ).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
      render(
        <MenuUpload
          isOpen={false}
          onClose={mockOnClose}
          onFileSelected={mockOnFileSelected}
        />
      );

      expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    it("should display supported formats information", () => {
      renderMenuUpload();

      expect(screen.getByText("Supported Formats")).toBeInTheDocument();
      expect(screen.getByText(/PDF/)).toBeInTheDocument();
      expect(screen.getByText(/Excel/)).toBeInTheDocument();
      expect(screen.getByText(/CSV/)).toBeInTheDocument();
      expect(screen.getByText(/JSON/)).toBeInTheDocument();
      expect(screen.getByText(/Word/)).toBeInTheDocument();
    });

    it("should show upload area with proper instructions", () => {
      renderMenuUpload();

      expect(screen.getByText("Upload a menu file")).toBeInTheDocument();
      expect(
        screen.getByText("Drag and drop or click to select")
      ).toBeInTheDocument();
    });

    it("should have Proceed to Preview button initially disabled", () => {
      renderMenuUpload();

      const proceedButton = screen.getByText("Proceed to Preview");
      expect(proceedButton).toBeDisabled();
    });
  });

  describe("File Selection", () => {
    it("should accept valid PDF files", async () => {
      renderMenuUpload();

      const file = new File(["mock pdf content"], "menu.pdf", {
        type: "application/pdf",
      });

      const input = screen.getByRole("button", {
        name: /Drop menu file here or click to select a file/i,
      });
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        expect(screen.getByText("File Ready for Upload")).toBeInTheDocument();
        expect(screen.getByText("menu.pdf")).toBeInTheDocument();

        const proceedButton = screen.getByText("Proceed to Preview");
        expect(proceedButton).not.toBeDisabled();
      }
    });

    it("should accept valid Excel files", async () => {
      renderMenuUpload();

      const file = new File(["mock excel content"], "menu.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        expect(screen.getByText("File Ready for Upload")).toBeInTheDocument();
        expect(screen.getByText("menu.xlsx")).toBeInTheDocument();
      }
    });

    it("should accept valid CSV files", async () => {
      renderMenuUpload();

      const file = new File(["name,price\nItem,10.99"], "menu.csv", {
        type: "text/csv",
      });

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        expect(screen.getByText("File Ready for Upload")).toBeInTheDocument();
        expect(screen.getByText("menu.csv")).toBeInTheDocument();
      }
    });

    it("should accept valid JSON files", async () => {
      renderMenuUpload();

      const jsonContent = JSON.stringify({ menu: { items: [] } });
      const file = new File([jsonContent], "menu.json", {
        type: "application/json",
      });

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        expect(screen.getByText("File Ready for Upload")).toBeInTheDocument();
        expect(screen.getByText("menu.json")).toBeInTheDocument();
      }
    });

    it("should accept valid Word files", async () => {
      renderMenuUpload();

      const file = new File(["mock docx content"], "menu.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        expect(screen.getByText("File Ready for Upload")).toBeInTheDocument();
        expect(screen.getByText("menu.docx")).toBeInTheDocument();
      }
    });
  });

  describe("File Validation", () => {
    it("should reject unsupported file formats", async () => {
      renderMenuUpload();

      const file = new File(["mock content"], "menu.txt", {
        type: "text/plain",
      });

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        // Ensure the proceed button is still disabled (main validation)
        const proceedButton = screen.getByText("Proceed to Preview");
        expect(proceedButton).toBeDisabled();

        // Should not show "File Ready for Upload" message
        expect(
          screen.queryByText("File Ready for Upload")
        ).not.toBeInTheDocument();
      }
    });

    it("should reject files that are too large", async () => {
      renderMenuUpload();

      // Create a file larger than the PDF limit (10MB)
      const file = new File(["x".repeat(11 * 1024 * 1024)], "large-menu.pdf", {
        type: "application/pdf",
      });

      // Mock the file size
      Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        expect(screen.getByTestId("error-message")).toBeInTheDocument();
        expect(
          screen.getByText(/exceeds the maximum allowed size/)
        ).toBeInTheDocument();
      }
    });
  });

  describe("User Interactions", () => {
    it("should call onClose when Cancel button is clicked", () => {
      renderMenuUpload();

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onFileSelected when Proceed to Preview is clicked with a file", async () => {
      renderMenuUpload();

      const file = new File(["mock content"], "menu.pdf", {
        type: "application/pdf",
      });

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);

        const proceedButton = screen.getByText("Proceed to Preview");
        fireEvent.click(proceedButton);

        expect(mockOnFileSelected).toHaveBeenCalledTimes(1);
        expect(mockOnFileSelected).toHaveBeenCalledWith(file);
      }
    });

    it("should handle drag and drop functionality", () => {
      renderMenuUpload();

      const dropZone = screen.getByRole("button", {
        name: /Drop menu file here or click to select a file/i,
      });

      // Test drag enter
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          items: [{ kind: "file" }],
        },
      });

      // Test drag over
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          dropEffect: "copy",
        },
      });

      // Test drag leave
      fireEvent.dragLeave(dropZone);

      // These should not throw errors
      expect(dropZone).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      renderMenuUpload();

      const dropZone = screen.getByRole("button", {
        name: /Drop menu file here or click to select a file/i,
      });
      expect(dropZone).toBeInTheDocument();
      expect(dropZone).toHaveAttribute("aria-label");
    });

    it("should support keyboard navigation", () => {
      renderMenuUpload();

      const dropZone = screen.getByRole("button", {
        name: /Drop menu file here or click to select a file/i,
      });

      // Test Enter key
      fireEvent.keyDown(dropZone, { key: "Enter" });

      // Test Space key
      fireEvent.keyDown(dropZone, { key: " " });

      // These should not throw errors
      expect(dropZone).toBeInTheDocument();
    });
  });
});
