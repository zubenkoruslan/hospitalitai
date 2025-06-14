import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateDownloadSection } from "../TemplateDownloadSection";

// Mock the API service
jest.mock("../../../services/api", () => ({
  downloadExcelTemplate: jest.fn(),
  downloadCSVTemplate: jest.fn(),
  downloadJSONTemplate: jest.fn(),
  downloadWordTemplate: jest.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => "mocked-blob-url");
global.URL.revokeObjectURL = jest.fn();

// Mock link click for download testing
const mockLink = {
  click: jest.fn(),
  href: "",
  download: "",
  style: { display: "none" },
};

jest.spyOn(document, "createElement").mockImplementation((tagName) => {
  if (tagName === "a") {
    return mockLink as any;
  }
  return document.createElement(tagName);
});

jest.spyOn(document.body, "appendChild").mockImplementation(() => null as any);
jest.spyOn(document.body, "removeChild").mockImplementation(() => null as any);

const api = require("../../../services/api");

describe("TemplateDownloadSection Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLink.click.mockClear();
  });

  const renderTemplateDownloadSection = (props = {}) => {
    return render(
      <TemplateDownloadSection restaurantId="test-restaurant-123" {...props} />
    );
  };

  describe("Component Rendering", () => {
    it("should render section title and description", () => {
      renderTemplateDownloadSection();

      expect(screen.getByText("Download Templates")).toBeInTheDocument();
      expect(
        screen.getByText(/Choose your preferred format/i)
      ).toBeInTheDocument();
    });

    it("should render all template format cards", () => {
      renderTemplateDownloadSection();

      expect(screen.getByText("Excel Template")).toBeInTheDocument();
      expect(screen.getByText("CSV Template")).toBeInTheDocument();
      expect(screen.getByText("JSON Template")).toBeInTheDocument();
      expect(screen.getByText("Word Template")).toBeInTheDocument();
    });

    it("should display format descriptions", () => {
      renderTemplateDownloadSection();

      expect(
        screen.getByText(/Structured spreadsheet with advanced features/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Simple comma-separated format/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Machine-readable structured data/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Document format with table structure/i)
      ).toBeInTheDocument();
    });

    it("should show format icons", () => {
      renderTemplateDownloadSection();

      // Check for format-specific styling and icons
      expect(screen.getByTestId("excel-template-card")).toBeInTheDocument();
      expect(screen.getByTestId("csv-template-card")).toBeInTheDocument();
      expect(screen.getByTestId("json-template-card")).toBeInTheDocument();
      expect(screen.getByTestId("word-template-card")).toBeInTheDocument();
    });

    it("should display download buttons for each format", () => {
      renderTemplateDownloadSection();

      expect(
        screen.getByRole("button", { name: /download excel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /download csv/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /download json/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /download word/i })
      ).toBeInTheDocument();
    });
  });

  describe("Excel Template Download", () => {
    it("should download Excel template successfully", async () => {
      const mockBlob = new Blob(["mock excel content"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      api.downloadExcelTemplate.mockResolvedValue(mockBlob);

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download excel/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(api.downloadExcelTemplate).toHaveBeenCalledWith(
          "test-restaurant-123"
        );
        expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockLink.href).toBe("mocked-blob-url");
        expect(mockLink.download).toBe("menu-template.xlsx");
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it("should show loading state during Excel download", async () => {
      api.downloadExcelTemplate.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(new Blob()), 100))
      );

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download excel/i,
      });
      fireEvent.click(downloadButton);

      expect(screen.getByText(/downloading/i)).toBeInTheDocument();
      expect(downloadButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/downloading/i)).not.toBeInTheDocument();
        expect(downloadButton).not.toBeDisabled();
      });
    });

    it("should handle Excel download errors", async () => {
      api.downloadExcelTemplate.mockRejectedValue(new Error("Download failed"));

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download excel/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/download failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("CSV Template Download", () => {
    it("should download CSV template successfully", async () => {
      const mockBlob = new Blob(["name,price,category"], { type: "text/csv" });
      api.downloadCSVTemplate.mockResolvedValue(mockBlob);

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download csv/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(api.downloadCSVTemplate).toHaveBeenCalledWith(
          "test-restaurant-123"
        );
        expect(mockLink.download).toBe("menu-template.csv");
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it("should show loading state during CSV download", async () => {
      api.downloadCSVTemplate.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(new Blob()), 50))
      );

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download csv/i,
      });
      fireEvent.click(downloadButton);

      expect(downloadButton).toBeDisabled();
      expect(screen.getByText(/downloading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(downloadButton).not.toBeDisabled();
      });
    });
  });

  describe("JSON Template Download", () => {
    it("should download JSON template successfully", async () => {
      const jsonContent = JSON.stringify({ menu: { items: [] } });
      const mockBlob = new Blob([jsonContent], { type: "application/json" });
      api.downloadJSONTemplate.mockResolvedValue(mockBlob);

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download json/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(api.downloadJSONTemplate).toHaveBeenCalledWith(
          "test-restaurant-123"
        );
        expect(mockLink.download).toBe("menu-template.json");
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it("should handle JSON download errors gracefully", async () => {
      api.downloadJSONTemplate.mockRejectedValue(new Error("Server error"));

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download json/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/download failed/i)).toBeInTheDocument();
        expect(downloadButton).not.toBeDisabled();
      });
    });
  });

  describe("Word Template Download", () => {
    it("should download Word template successfully", async () => {
      const mockBlob = new Blob(["mock word content"], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      api.downloadWordTemplate.mockResolvedValue(mockBlob);

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download word/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(api.downloadWordTemplate).toHaveBeenCalledWith(
          "test-restaurant-123"
        );
        expect(mockLink.download).toBe("menu-template.docx");
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it("should clean up blob URL after Word download", async () => {
      const mockBlob = new Blob(["mock word content"]);
      api.downloadWordTemplate.mockResolvedValue(mockBlob);

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download word/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("mocked-blob-url");
      });
    });
  });

  describe("User Interface Interactions", () => {
    it("should highlight template card on hover", async () => {
      renderTemplateDownloadSection();

      const excelCard = screen.getByTestId("excel-template-card");

      fireEvent.mouseEnter(excelCard);
      expect(excelCard).toHaveClass("hover:shadow-lg");

      fireEvent.mouseLeave(excelCard);
    });

    it("should show format-specific color coding", () => {
      renderTemplateDownloadSection();

      const excelCard = screen.getByTestId("excel-template-card");
      const csvCard = screen.getByTestId("csv-template-card");
      const jsonCard = screen.getByTestId("json-template-card");
      const wordCard = screen.getByTestId("word-template-card");

      expect(excelCard).toHaveClass("border-green-200");
      expect(csvCard).toHaveClass("border-blue-200");
      expect(jsonCard).toHaveClass("border-purple-200");
      expect(wordCard).toHaveClass("border-indigo-200");
    });

    it("should display file size information", () => {
      renderTemplateDownloadSection();

      expect(screen.getByText(/~15-20 KB/i)).toBeInTheDocument(); // Excel
      expect(screen.getByText(/~2-5 KB/i)).toBeInTheDocument(); // CSV
      expect(screen.getByText(/~3-8 KB/i)).toBeInTheDocument(); // JSON
      expect(screen.getByText(/~25-30 KB/i)).toBeInTheDocument(); // Word
    });

    it("should show format recommendations", () => {
      renderTemplateDownloadSection();

      expect(
        screen.getByText(/Recommended for restaurants with complex menus/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Best for simple menu structures/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ideal for developers and integrations/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Perfect for formatted menu documents/i)
      ).toBeInTheDocument();
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should show error message and allow retry", async () => {
      api.downloadExcelTemplate
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(new Blob(["success"]));

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download excel/i,
      });

      // First attempt fails
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/download failed/i)).toBeInTheDocument();
      });

      // Retry should work
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
        expect(screen.queryByText(/download failed/i)).not.toBeInTheDocument();
      });
    });

    it("should handle network connectivity issues", async () => {
      api.downloadCSVTemplate.mockRejectedValue(
        new Error("Network unavailable")
      );

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download csv/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/Network unavailable/i)).toBeInTheDocument();
      });
    });

    it("should clear error messages when attempting new download", async () => {
      api.downloadJSONTemplate.mockRejectedValue(new Error("First error"));

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download json/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/download failed/i)).toBeInTheDocument();
      });

      // Start new download
      api.downloadJSONTemplate.mockResolvedValue(new Blob(["success"]));
      fireEvent.click(downloadButton);

      // Error should be cleared immediately when new download starts
      expect(screen.queryByText(/download failed/i)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels for download buttons", () => {
      renderTemplateDownloadSection();

      expect(
        screen.getByRole("button", { name: /download excel/i })
      ).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Excel template")
      );
      expect(
        screen.getByRole("button", { name: /download csv/i })
      ).toHaveAttribute("aria-label", expect.stringContaining("CSV template"));
      expect(
        screen.getByRole("button", { name: /download json/i })
      ).toHaveAttribute("aria-label", expect.stringContaining("JSON template"));
      expect(
        screen.getByRole("button", { name: /download word/i })
      ).toHaveAttribute("aria-label", expect.stringContaining("Word template"));
    });

    it("should support keyboard navigation", async () => {
      renderTemplateDownloadSection();

      const excelButton = screen.getByRole("button", {
        name: /download excel/i,
      });
      const csvButton = screen.getByRole("button", { name: /download csv/i });

      // Tab navigation
      excelButton.focus();
      expect(excelButton).toHaveFocus();

      fireEvent.keyDown(excelButton, { key: "Tab" });
      csvButton.focus();
      expect(csvButton).toHaveFocus();
    });

    it("should announce download status to screen readers", async () => {
      api.downloadExcelTemplate.mockResolvedValue(new Blob(["test"]));

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download excel/i,
      });
      fireEvent.click(downloadButton);

      expect(screen.getByText(/downloading/i)).toHaveAttribute(
        "aria-live",
        "polite"
      );

      await waitFor(() => {
        expect(screen.getByText(/download complete/i)).toBeInTheDocument();
      });
    });

    it("should have proper heading structure", () => {
      renderTemplateDownloadSection();

      const heading = screen.getByRole("heading", {
        name: /download templates/i,
      });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H3");
    });
  });

  describe("Performance and Resource Management", () => {
    it("should handle concurrent downloads", async () => {
      const excelBlob = new Blob(["excel"]);
      const csvBlob = new Blob(["csv"]);

      api.downloadExcelTemplate.mockResolvedValue(excelBlob);
      api.downloadCSVTemplate.mockResolvedValue(csvBlob);

      renderTemplateDownloadSection();

      const excelButton = screen.getByRole("button", {
        name: /download excel/i,
      });
      const csvButton = screen.getByRole("button", { name: /download csv/i });

      // Start both downloads
      fireEvent.click(excelButton);
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(api.downloadExcelTemplate).toHaveBeenCalled();
        expect(api.downloadCSVTemplate).toHaveBeenCalled();
        expect(mockLink.click).toHaveBeenCalledTimes(2);
      });
    });

    it("should clean up resources after download", async () => {
      api.downloadJSONTemplate.mockResolvedValue(new Blob(["json"]));

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download json/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("mocked-blob-url");
        expect(document.body.removeChild).toHaveBeenCalled();
      });
    });

    it("should handle memory efficiently for large templates", async () => {
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const largeBlob = new Blob([largeContent]);
      api.downloadWordTemplate.mockResolvedValue(largeBlob);

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download word/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe("User Experience Features", () => {
    it("should show download progress feedback", async () => {
      api.downloadExcelTemplate.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(new Blob(["excel"])), 200);
          })
      );

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download excel/i,
      });
      fireEvent.click(downloadButton);

      // Should show immediate feedback
      expect(screen.getByText(/downloading/i)).toBeInTheDocument();
      expect(downloadButton).toHaveAttribute("disabled");

      await waitFor(
        () => {
          expect(screen.getByText(/download complete/i)).toBeInTheDocument();
        },
        { timeout: 300 }
      );
    });

    it("should provide format selection guidance", () => {
      renderTemplateDownloadSection();

      expect(
        screen.getByText(/Choose the format that best fits your workflow/i)
      ).toBeInTheDocument();
    });

    it("should show success messages after downloads", async () => {
      api.downloadCSVTemplate.mockResolvedValue(new Blob(["csv"]));

      renderTemplateDownloadSection();

      const downloadButton = screen.getByRole("button", {
        name: /download csv/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(
          screen.getByText(/CSV template downloaded successfully/i)
        ).toBeInTheDocument();
      });

      // Success message should auto-hide after timeout
      await waitFor(
        () => {
          expect(
            screen.queryByText(/CSV template downloaded successfully/i)
          ).not.toBeInTheDocument();
        },
        { timeout: 4000 }
      );
    });
  });
});
