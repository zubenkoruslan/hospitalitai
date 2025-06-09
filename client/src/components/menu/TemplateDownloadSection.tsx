import React, { useState } from "react";
import {
  DocumentIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  DocumentTextIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";
import {
  downloadExcelTemplate,
  downloadCSVTemplate,
  downloadWordTemplate,
  downloadJSONTemplate,
} from "../../services/api";
import Spinner from "../common/Spinner";

/**
 * Template format information
 */
interface TemplateFormat {
  key: string;
  displayName: string;
  extension: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  useCase: string;
  features: string[];
}

/**
 * Available template formats
 */
const TEMPLATE_FORMATS: TemplateFormat[] = [
  {
    key: "excel",
    displayName: "Excel Spreadsheet",
    extension: ".xlsx",
    description: "Structured data entry with multiple worksheets",
    icon: TableCellsIcon,
    color: "text-green-600",
    bgColor: "bg-green-100",
    useCase: "Best for: Large menus with complex data",
    features: [
      "Multiple worksheets (Instructions & Menu Items)",
      "Pre-formatted columns with examples",
      "Data validation and dropdown lists",
      "Wine-specific fields (grape varieties, vintage, region)",
      "Supports up to 1000+ menu items",
    ],
  },
  {
    key: "csv",
    displayName: "CSV File",
    extension: ".csv",
    description: "Simple comma-separated values format",
    icon: DocumentIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    useCase: "Best for: Simple data import/export",
    features: [
      "Universal format (opens in Excel, Google Sheets)",
      "UTF-8 encoded for special characters",
      "Example data with proper formatting",
      "Small file size for quick sharing",
      "Easy to edit in any spreadsheet application",
    ],
  },
  {
    key: "word",
    displayName: "Word Document",
    extension: ".docx",
    description: "Formatted document with structured examples",
    icon: DocumentTextIcon,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    useCase: "Best for: Menu planning and documentation",
    features: [
      "Clear formatting and instructions",
      "Structured text format with examples",
      "Easy to read and fill out manually",
      "Professional document appearance",
      "Can be converted to other formats",
    ],
  },
  {
    key: "json",
    displayName: "JSON Data",
    extension: ".json",
    description: "JavaScript Object Notation for developers",
    icon: CodeBracketIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    useCase: "Best for: API integration and developers",
    features: [
      "Complete schema documentation",
      "Nested data structure for complex items",
      "Developer-friendly format",
      "API-ready data structure",
      "Supports advanced wine data modeling",
    ],
  },
];

/**
 * Template Download Section Component
 * Provides downloadable templates for menu data entry
 */
const TemplateDownloadSection: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle template download
   */
  const handleDownload = async (format: TemplateFormat) => {
    try {
      setIsDownloading((prev) => ({ ...prev, [format.key]: true }));
      setError(null);

      // Call the appropriate download method
      switch (format.key) {
        case "excel":
          await downloadExcelTemplate();
          break;
        case "csv":
          await downloadCSVTemplate();
          break;
        case "word":
          await downloadWordTemplate();
          break;
        case "json":
          await downloadJSONTemplate();
          break;
        default:
          throw new Error(`Unsupported template format: ${format.key}`);
      }
    } catch (err) {
      console.error(`Error downloading ${format.displayName} template:`, err);
      setError(
        `Failed to download ${format.displayName} template. ${
          err instanceof Error ? err.message : "Please try again."
        }`
      );
    } finally {
      setIsDownloading((prev) => ({ ...prev, [format.key]: false }));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <DocumentArrowDownIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Download Menu Templates
            </h2>
            <p className="text-slate-600">
              Get started quickly with our pre-formatted templates. Choose the
              format that works best for your workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-1">
                Download Error
              </h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TEMPLATE_FORMATS.map((format) => {
            const IconComponent = format.icon;
            const isDownloadingFormat = isDownloading[format.key];

            return (
              <div
                key={format.key}
                className="border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200"
              >
                {/* Format Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div
                    className={`p-3 ${format.bgColor} rounded-xl flex-shrink-0`}
                  >
                    <IconComponent className={`h-8 w-8 ${format.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {format.displayName}
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">
                      {format.description}
                    </p>
                    <div className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md">
                      <code className="text-xs font-mono text-slate-700">
                        {format.extension}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Use Case */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {format.useCase}
                  </p>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Features:
                  </h4>
                  <ul className="space-y-1">
                    {format.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(format)}
                  disabled={isDownloadingFormat}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 text-white font-medium rounded-xl transition-all duration-200 ${
                    isDownloadingFormat
                      ? "bg-slate-400 cursor-not-allowed"
                      : `${format.bgColor
                          .replace("bg-", "bg-")
                          .replace("-100", "-600")} hover:${format.bgColor
                          .replace("bg-", "bg-")
                          .replace(
                            "-100",
                            "-700"
                          )} focus:ring-2 focus:ring-offset-2 focus:${format.bgColor
                          .replace("bg-", "ring-")
                          .replace("-100", "-500")}`
                  }`}
                >
                  {isDownloadingFormat ? (
                    <>
                      <Spinner size="sm" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="h-5 w-5" />
                      <span>Download {format.displayName}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Information Footer */}
      <div className="bg-blue-50 border-t border-blue-200 px-6 py-4">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Template Usage Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>
                All templates include example menu items with Caesar Salad,
                Grilled Salmon, and Dom Pérignon
              </li>
              <li>
                Templates are pre-configured for enhanced menu parsing with
                ingredient intelligence
              </li>
              <li>
                Wine fields include grape varieties, vintage, and region for
                maximum intelligence extraction
              </li>
              <li>
                After filling out your template, upload it using the "Upload
                Menu" button above
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDownloadSection;
