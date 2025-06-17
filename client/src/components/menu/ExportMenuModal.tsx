import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon,
  CodeBracketIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { exportMenu } from "../../services/api";

interface ExportMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: string;
  menuName: string;
}

export type ExportFormat = "csv" | "excel" | "json" | "word";

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fileExtension: string;
  color: string;
  features: string[];
}

const ExportMenuModal: React.FC<ExportMenuModalProps> = ({
  isOpen,
  onClose,
  menuId,
  menuName,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includePricing, setIncludePricing] = useState(true);
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [includeFoodItems, setIncludeFoodItems] = useState(true);
  const [includeBeverageItems, setIncludeBeverageItems] = useState(true);
  const [includeWineItems, setIncludeWineItems] = useState(true);

  const formatOptions: FormatOption[] = [
    {
      id: "csv",
      name: "CSV",
      description: "Comma-separated values for spreadsheet applications",
      icon: TableCellsIcon,
      fileExtension: ".csv",
      color: "green",
      features: ["Basic data", "Spreadsheet compatible", "Lightweight"],
    },
    {
      id: "excel",
      name: "Excel",
      description: "Microsoft Excel workbook with formatted sheets",
      icon: DocumentIcon,
      fileExtension: ".xlsx",
      color: "blue",
      features: ["Rich formatting", "Multiple sheets", "Charts & graphs"],
    },
    {
      id: "json",
      name: "JSON",
      description: "Structured data format for development and backup",
      icon: CodeBracketIcon,
      fileExtension: ".json",
      color: "purple",
      features: ["Complete data", "Developer friendly", "System backup"],
    },
    {
      id: "word",
      name: "Word Document",
      description: "Formatted document ready for printing",
      icon: DocumentTextIcon,
      fileExtension: ".docx",
      color: "amber",
      features: ["Print ready", "Professional layout", "Custom branding"],
    },
  ];

  const handleExport = async () => {
    // Validate that at least one category is selected
    if (!includeFoodItems && !includeBeverageItems && !includeWineItems) {
      alert("Please select at least one item category to export.");
      return;
    }

    setIsExporting(true);
    try {
      // Use the proper API service with correct authentication
      const blob = await exportMenu(menuId, {
        format: selectedFormat,
        includeImages,
        includeMetadata,
        includePricing,
        includeDescriptions,
        includeFoodItems,
        includeBeverageItems,
        includeWineItems,
      });

      const selectedOption = formatOptions.find(
        (opt) => opt.id === selectedFormat
      );
      const filename = `${menuName.replace(/[^a-z0-9]/gi, "_")}_export${
        selectedOption?.fileExtension
      }`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error("Export error:", error);
      alert(
        `Export failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap: Record<string, string> = {
      green: isSelected
        ? "border-green-500 bg-green-50 text-green-900 shadow-md"
        : "border-slate-200 hover:border-green-300 hover:bg-green-50",
      blue: isSelected
        ? "border-blue-500 bg-blue-50 text-blue-900 shadow-md"
        : "border-slate-200 hover:border-blue-300 hover:bg-blue-50",
      purple: isSelected
        ? "border-purple-500 bg-purple-50 text-purple-900 shadow-md"
        : "border-slate-200 hover:border-purple-300 hover:bg-purple-50",
      amber: isSelected
        ? "border-amber-500 bg-amber-50 text-amber-900 shadow-md"
        : "border-slate-200 hover:border-amber-300 hover:bg-amber-50",
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIconColor = (color: string, isSelected: boolean) => {
    const colorMap: Record<string, string> = {
      green: isSelected ? "text-green-600" : "text-slate-500",
      blue: isSelected ? "text-blue-600" : "text-slate-500",
      purple: isSelected ? "text-purple-600" : "text-slate-500",
      amber: isSelected ? "text-amber-600" : "text-slate-500",
    };
    return colorMap[color] || colorMap.blue;
  };

  const selectedOption = formatOptions.find((opt) => opt.id === selectedFormat);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <DocumentArrowDownIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Export Menu
            </h2>
            <p className="text-sm text-slate-600">
              Export "{menuName}" in your preferred format
            </p>
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Select Export Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formatOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedFormat === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedFormat(option.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${getColorClasses(
                    option.color,
                    isSelected
                  )}`}
                >
                  <div className="flex items-start space-x-3">
                    <Icon
                      className={`h-6 w-6 mt-1 ${getIconColor(
                        option.color,
                        isSelected
                      )}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {option.name}
                        {isSelected && (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-sm mt-1 opacity-75">
                        {option.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {option.features.map((feature, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-0.5 bg-white bg-opacity-60 rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Options */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Export Options
          </h3>
          <div className="space-y-3 bg-slate-50 rounded-lg p-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeDescriptions}
                onChange={(e) => setIncludeDescriptions(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">
                Include item descriptions
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includePricing}
                onChange={(e) => setIncludePricing(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">
                Include pricing information
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">
                Include metadata (creation date, categories, etc.)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                disabled={selectedFormat === "csv" || selectedFormat === "json"}
              />
              <span className="ml-2 text-sm text-slate-700">
                Include item images
                {(selectedFormat === "csv" || selectedFormat === "json") && (
                  <span className="text-slate-500"> (Word and Excel only)</span>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Item Categories to Export
          </h3>
          <div className="space-y-3 bg-slate-50 rounded-lg p-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeFoodItems}
                onChange={(e) => setIncludeFoodItems(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">
                Food Items
                <span className="text-slate-500 ml-1">
                  (ingredients, cooking methods, allergens)
                </span>
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeBeverageItems}
                onChange={(e) => setIncludeBeverageItems(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">
                Beverage Items
                <span className="text-slate-500 ml-1">
                  (spirit type, serving style, cocktail ingredients)
                </span>
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeWineItems}
                onChange={(e) => setIncludeWineItems(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">
                Wine Items
                <span className="text-slate-500 ml-1">
                  (grape variety, vintage, producer, serving options)
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Preview Information */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
            <DocumentIcon className="h-4 w-4" />
            Export Preview
          </h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>
              • Format: <strong>{selectedOption?.name}</strong>
            </p>
            <p>
              • File name:{" "}
              <strong>
                {menuName.replace(/[^a-z0-9]/gi, "_")}_export
                {selectedOption?.fileExtension}
              </strong>
            </p>
            <p>
              • Categories:{" "}
              <strong>
                {[
                  includeFoodItems && "Food",
                  includeBeverageItems && "Beverages",
                  includeWineItems && "Wine",
                ]
                  .filter(Boolean)
                  .join(", ") || "None selected"}
              </strong>
            </p>
            <p>
              • Includes:{" "}
              <strong>
                {[
                  includeDescriptions && "Descriptions",
                  includePricing && "Pricing",
                  includeMetadata && "Metadata",
                  includeImages && "Images",
                ]
                  .filter(Boolean)
                  .join(", ") || "Basic export"}
              </strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={
              isExporting ||
              (!includeFoodItems && !includeBeverageItems && !includeWineItems)
            }
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
                Exporting...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export {selectedOption?.name}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportMenuModal;
