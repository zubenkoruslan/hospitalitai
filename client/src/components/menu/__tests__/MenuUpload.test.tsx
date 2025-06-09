import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MenuUpload from "../MenuUpload";

// Mock the API service
jest.mock("../../../services/api", () => ({
  uploadMenu: jest.fn(),
}));

// Mock file reading
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: "data:application/pdf;base64,mock-file-content",
  onload: null as any,
  onerror: null as any,
};

Object.defineProperty(window, "FileReader", {
  writable: true,
  value: jest.fn(() => mockFileReader),
});

const api = require("../../../services/api");

describe("MenuUpload Component", () => {
  const mockOnUploadSuccess = jest.fn();
  const mockOnUploadError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileReader.readAsDataURL.mockClear();
  });

  const renderMenuUpload = (props = {}) => {
    return render(
      <MenuUpload
        restaurantId="test-restaurant-123"
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
        {...props}
      />
    );
  };

  describe("Component Rendering", () => {
    it("should render upload zone with proper instructions", () => {
      renderMenuUpload();

      expect(
        screen.getByText(/Click to upload or drag and drop/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Supports 5 formats/i)).toBeInTheDocument();
      expect(
        screen.getByText(/PDF, Excel, CSV, JSON, Word/i)
      ).toBeInTheDocument();
    });

    it("should display format icons and descriptions", () => {
      renderMenuUpload();

      // Check for format indicators
      expect(screen.getByText("PDF")).toBeInTheDocument();
      expect(screen.getByText("Excel")).toBeInTheDocument();
      expect(screen.getByText("CSV")).toBeInTheDocument();
      expect(screen.getByText("JSON")).toBeInTheDocument();
      expect(screen.getByText("Word")).toBeInTheDocument();
    });

    it("should show file size limit information", () => {
      renderMenuUpload();

      expect(screen.getByText(/Maximum file size: 10MB/i)).toBeInTheDocument();
    });

    it("should display upload button initially disabled", () => {
      renderMenuUpload();

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });
      expect(uploadButton).toBeDisabled();
    });
  });

  describe("File Selection and Validation", () => {
    it("should accept valid PDF files", async () => {
      renderMenuUpload();

      const file = new File(["mock pdf content"], "menu.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");

      await userEvent.upload(input, file);

      expect(screen.getByText("menu.pdf")).toBeInTheDocument();
      expect(screen.getByText("PDF")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /upload menu/i })
      ).not.toBeDisabled();
    });

    it("should accept valid Excel files", async () => {
      renderMenuUpload();

      const file = new File(["mock excel content"], "menu.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const input = screen.getByTestId("file-input");

      await userEvent.upload(input, file);

      expect(screen.getByText("menu.xlsx")).toBeInTheDocument();
      expect(screen.getByText("Excel")).toBeInTheDocument();
    });

    it("should accept valid CSV files", async () => {
      renderMenuUpload();

      const file = new File(["name,price\nItem,10.99"], "menu.csv", {
        type: "text/csv",
      });
      const input = screen.getByTestId("file-input");

      await userEvent.upload(input, file);

      expect(screen.getByText("menu.csv")).toBeInTheDocument();
      expect(screen.getByText("CSV")).toBeInTheDocument();
    });

    it("should accept valid JSON files", async () => {
      renderMenuUpload();

      const jsonContent = JSON.stringify({ menu: { items: [] } });
      const file = new File([jsonContent], "menu.json", {
        type: "application/json",
      });
      const input = screen.getByTestId("file-input");

      await userEvent.upload(input, file);

      expect(screen.getByText("menu.json")).toBeInTheDocument();
      expect(screen.getByText("JSON")).toBeInTheDocument();
    });

    it("should accept valid Word files", async () => {
      renderMenuUpload();

      const file = new File(["mock docx content"], "menu.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const input = screen.getByTestId("file-input");

      await userEvent.upload(input, file);

      expect(screen.getByText("menu.docx")).toBeInTheDocument();
      expect(screen.getByText("Word")).toBeInTheDocument();
    });

    it("should reject unsupported file formats", async () => {
      renderMenuUpload();

      const file = new File(["mock content"], "menu.txt", {
        type: "text/plain",
      });
      const input = screen.getByTestId("file-input");

      await userEvent.upload(input, file);

      expect(screen.getByText(/Unsupported file format/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /upload menu/i })
      ).toBeDisabled();
    });

    it("should reject files that are too large", async () => {
      renderMenuUpload();

      // Create a file larger than 10MB
      const largeContent = "x".repeat(11 * 1024 * 1024);
      const file = new File([largeContent], "large-menu.pdf", {
        type: "application/pdf",
      });

      Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      expect(
        screen.getByText(/File size exceeds 10MB limit/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /upload menu/i })
      ).toBeDisabled();
    });

    it("should auto-detect file format from extension when MIME type is generic", async () => {
      renderMenuUpload();

      // File with generic MIME type but xlsx extension
      const file = new File(["mock content"], "menu.xlsx", {
        type: "application/octet-stream",
      });
      const input = screen.getByTestId("file-input");

      await userEvent.upload(input, file);

      expect(screen.getByText("Excel")).toBeInTheDocument();
    });
  });

  describe("Drag and Drop Functionality", () => {
    it("should handle drag enter and leave events", async () => {
      renderMenuUpload();

      const dropZone = screen.getByTestId("drop-zone");

      // Simulate drag enter
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { files: [] },
      });

      expect(dropZone).toHaveClass("border-blue-400");

      // Simulate drag leave
      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass("border-blue-400");
    });

    it("should handle file drop", async () => {
      renderMenuUpload();

      const file = new File(["mock content"], "menu.pdf", {
        type: "application/pdf",
      });
      const dropZone = screen.getByTestId("drop-zone");

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText("menu.pdf")).toBeInTheDocument();
      });
    });

    it("should prevent default drag behaviors", () => {
      renderMenuUpload();

      const dropZone = screen.getByTestId("drop-zone");
      const dragOverEvent = new Event("dragover");
      const preventDefaultSpy = jest.spyOn(dragOverEvent, "preventDefault");

      fireEvent.dragOver(dropZone, dragOverEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("File Upload Process", () => {
    it("should upload file successfully", async () => {
      const mockResponse = {
        success: true,
        menuId: "menu-123",
        preview: {
          itemCount: 10,
          categories: ["Appetizers", "Main Courses"],
          priceRange: { min: 8.99, max: 24.99 },
        },
      };

      api.uploadMenu.mockResolvedValue(mockResponse);

      renderMenuUpload();

      const file = new File(["mock content"], "menu.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(api.uploadMenu).toHaveBeenCalledWith(
          expect.any(FormData),
          "test-restaurant-123"
        );
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(mockResponse);
      });
    });

    it("should show upload progress during upload", async () => {
      // Mock a delayed upload
      api.uploadMenu.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100)
          )
      );

      renderMenuUpload();

      const file = new File(["mock content"], "menu.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });
      fireEvent.click(uploadButton);

      // Should show uploading state
      expect(screen.getByText(/Uploading/i)).toBeInTheDocument();
      expect(uploadButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/Uploading/i)).not.toBeInTheDocument();
      });
    });

    it("should handle upload errors", async () => {
      const mockError = new Error("Upload failed");
      api.uploadMenu.mockRejectedValue(mockError);

      renderMenuUpload();

      const file = new File(["mock content"], "menu.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockOnUploadError).toHaveBeenCalledWith(mockError);
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });
    });

    it("should handle network errors gracefully", async () => {
      api.uploadMenu.mockRejectedValue(new Error("Network error"));

      renderMenuUpload();

      const file = new File(["mock content"], "menu.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("File Preview and Information", () => {
    it("should display file information after selection", async () => {
      renderMenuUpload();

      const file = new File(["mock content"], "restaurant-menu.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      Object.defineProperty(file, "size", { value: 2048 });

      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      expect(screen.getByText("restaurant-menu.xlsx")).toBeInTheDocument();
      expect(screen.getByText("Excel")).toBeInTheDocument();
      expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    });

    it("should show format-specific icons with correct colors", async () => {
      renderMenuUpload();

      const file = new File(["{}"], "menu.json", { type: "application/json" });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const formatBadge = screen.getByText("JSON").closest("span");
      expect(formatBadge).toHaveClass("bg-purple-100", "text-purple-800");
    });

    it("should allow file replacement", async () => {
      renderMenuUpload();

      // Upload first file
      const file1 = new File(["content1"], "menu1.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file1);

      expect(screen.getByText("menu1.pdf")).toBeInTheDocument();

      // Upload second file
      const file2 = new File(["content2"], "menu2.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      await userEvent.upload(input, file2);

      expect(screen.queryByText("menu1.pdf")).not.toBeInTheDocument();
      expect(screen.getByText("menu2.xlsx")).toBeInTheDocument();
    });

    it("should show clear file option when file is selected", async () => {
      renderMenuUpload();

      const file = new File(["mock content"], "menu.csv", { type: "text/csv" });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const clearButton = screen.getByRole("button", { name: /clear/i });
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);

      expect(screen.queryByText("menu.csv")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /upload menu/i })
      ).toBeDisabled();
    });
  });

  describe("Format-Specific Validation", () => {
    it("should validate Excel file structure", async () => {
      renderMenuUpload();

      const file = new File(["invalid excel"], "menu.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      mockFileReader.result =
        "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,invalid";
      mockFileReader.onload = jest.fn();

      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      // Trigger file reader callback
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any);
      }

      await waitFor(() => {
        expect(screen.getByText("Excel")).toBeInTheDocument();
      });
    });

    it("should validate JSON structure", async () => {
      renderMenuUpload();

      const validJSON = JSON.stringify({
        menu: {
          name: "Test Menu",
          items: [{ name: "Test Item", price: 12.99 }],
        },
      });

      const file = new File([validJSON], "menu.json", {
        type: "application/json",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      expect(screen.getByText("JSON")).toBeInTheDocument();
    });

    it("should handle invalid JSON gracefully", async () => {
      renderMenuUpload();

      const invalidJSON = "{ invalid json structure";
      const file = new File([invalidJSON], "menu.json", {
        type: "application/json",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      // Should still accept the file but may show warning
      expect(screen.getByText("JSON")).toBeInTheDocument();
    });
  });

  describe("User Experience Features", () => {
    it("should show helpful tooltips for format information", async () => {
      renderMenuUpload();

      const pdfTooltip = screen.getByTestId("format-tooltip-pdf");
      fireEvent.mouseOver(pdfTooltip);

      await waitFor(() => {
        expect(
          screen.getByText(/Traditional menu documents/i)
        ).toBeInTheDocument();
      });
    });

    it("should display format recommendations", () => {
      renderMenuUpload();

      expect(
        screen.getByText(/Excel & CSV: Best for structured data/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/JSON: Perfect for advanced integrations/i)
      ).toBeInTheDocument();
    });

    it("should show upload tips", () => {
      renderMenuUpload();

      expect(screen.getByText(/For best results/i)).toBeInTheDocument();
      expect(
        screen.getByText(/include item names and prices/i)
      ).toBeInTheDocument();
    });

    it("should handle keyboard navigation", async () => {
      renderMenuUpload();

      const input = screen.getByTestId("file-input");

      // Focus the input
      input.focus();
      expect(input).toHaveFocus();

      // Tab to upload button (should be disabled initially)
      fireEvent.keyDown(input, { key: "Tab" });

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });
      expect(uploadButton).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      renderMenuUpload();

      const input = screen.getByTestId("file-input");
      expect(input).toHaveAttribute(
        "aria-label",
        expect.stringContaining("upload")
      );

      const dropZone = screen.getByTestId("drop-zone");
      expect(dropZone).toHaveAttribute("role", "button");
      expect(dropZone).toHaveAttribute("tabIndex", "0");
    });

    it("should announce file selection to screen readers", async () => {
      renderMenuUpload();

      const file = new File(["mock content"], "menu.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const announcement = screen.getByLabelText(/selected file/i);
      expect(announcement).toBeInTheDocument();
    });

    it("should support keyboard interaction with drop zone", async () => {
      renderMenuUpload();

      const dropZone = screen.getByTestId("drop-zone");

      // Should be focusable
      dropZone.focus();
      expect(dropZone).toHaveFocus();

      // Should respond to Enter key
      fireEvent.keyDown(dropZone, { key: "Enter" });

      // Should trigger file input click
      const input = screen.getByTestId("file-input");
      expect(input).toHaveFocus();
    });
  });

  describe("Error Recovery", () => {
    it("should allow retry after upload failure", async () => {
      api.uploadMenu
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce({ success: true });

      renderMenuUpload();

      const file = new File(["mock content"], "menu.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });

      // First attempt fails
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });

      // Retry button should be available
      const retryButton = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });

    it("should clear error messages when new file is selected", async () => {
      api.uploadMenu.mockRejectedValue(new Error("Upload failed"));

      renderMenuUpload();

      const file1 = new File(["content1"], "menu1.pdf", {
        type: "application/pdf",
      });
      const input = screen.getByTestId("file-input");
      await userEvent.upload(input, file1);

      const uploadButton = screen.getByRole("button", { name: /upload menu/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });

      // Select new file
      const file2 = new File(["content2"], "menu2.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      await userEvent.upload(input, file2);

      // Error message should be cleared
      expect(screen.queryByText(/Upload failed/i)).not.toBeInTheDocument();
    });
  });
});
