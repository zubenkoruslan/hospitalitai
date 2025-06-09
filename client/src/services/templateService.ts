import axios from "axios";

// Import API_BASE_URL from the api service
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export interface TemplateInfo {
  formats: TemplateFormat[];
  fields: {
    required: string[];
    optional: string[];
    dietary: string[];
    wine: string[];
  };
  examples: {
    itemTypes: string[];
    wineStyles: string[];
    categories: string[];
  };
}

export interface TemplateFormat {
  format: string;
  name: string;
  extension: string;
  mimeType: string;
  description: string;
  useCase: string;
  features: string[];
}

/**
 * Frontend Template Service for downloading menu templates
 */
class TemplateService {
  private static readonly BASE_URL = `${API_BASE_URL}/templates`;

  /**
   * Get template information and available formats
   */
  static async getTemplateInfo(): Promise<TemplateInfo> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required to access templates");
      }

      const response = await axios.get(`${this.BASE_URL}/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching template info:", error);
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          "Failed to fetch template information";
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Download Excel template
   */
  static async downloadExcelTemplate(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    await this.downloadTemplate("excel", "Excel Spreadsheet", onProgress);
  }

  /**
   * Download CSV template
   */
  static async downloadCSVTemplate(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    await this.downloadTemplate("csv", "CSV File", onProgress);
  }

  /**
   * Download Word template
   */
  static async downloadWordTemplate(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    await this.downloadTemplate("word", "Word Document", onProgress);
  }

  /**
   * Download JSON template
   */
  static async downloadJSONTemplate(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    await this.downloadTemplate("json", "JSON File", onProgress);
  }

  /**
   * Generic template download method
   */
  private static async downloadTemplate(
    format: string,
    displayName: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required to download templates");
      }

      // Start progress at 0
      onProgress?.(0);

      const response = await axios.get(`${this.BASE_URL}/${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });

      // Complete progress
      onProgress?.(100);

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers["content-disposition"];
      let filename = `QuizCrunch_Menu_Template.${this.getFileExtension(
        format
      )}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.setAttribute("aria-label", `Download ${displayName} template`);

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log(
        `Successfully downloaded ${displayName} template: ${filename}`
      );
    } catch (error) {
      console.error(`Error downloading ${displayName} template:`, error);

      // Reset progress on error
      onProgress?.(0);

      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          `Failed to download ${displayName} template`;
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Get file extension for format
   */
  private static getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      excel: "xlsx",
      csv: "csv",
      word: "docx",
      json: "json",
    };
    return extensions[format] || "txt";
  }

  /**
   * Check if browser supports file downloads
   */
  static supportsDownload(): boolean {
    return !!(window.URL && window.URL.createObjectURL);
  }

  /**
   * Get estimated file sizes (for UI display)
   */
  static getEstimatedFileSizes(): Record<string, string> {
    return {
      excel: "~25 KB",
      csv: "~2 KB",
      word: "~5 KB",
      json: "~3 KB",
    };
  }

  /**
   * Validate that the user can download templates
   */
  static async validateAccess(): Promise<boolean> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return false;
      }

      // Try to fetch template info as a lightweight access check
      await this.getTemplateInfo();
      return true;
    } catch (error) {
      console.error("Template access validation failed:", error);
      return false;
    }
  }
}

export default TemplateService;
