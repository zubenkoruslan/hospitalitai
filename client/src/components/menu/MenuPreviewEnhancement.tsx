import React from "react";
import {
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Types for enhanced preview metadata
interface EnhancementMetadata {
  confidence: {
    overall: number;
    ingredients: number;
    allergens: number;
    dietary: number;
    wine: number;
  };
  allergens: Array<{
    allergen: string;
    confidence: "definite" | "likely" | "possible";
    reason: string;
  }>;
  enhancedIngredients: Array<{
    name: string;
    category: string;
    isCore: boolean;
    allergenRisk: string[];
  }>;
  wineIntelligence?: {
    grapeVarieties: Array<{
      name: string;
      confidence: "confirmed" | "inferred";
    }>;
  };
  originalData: any;
}

interface PreviewEnhancementProps {
  sourceFormat: "pdf" | "excel" | "csv" | "json" | "word";
  totalItems: number;
  metadata?: {
    processingTime?: number;
    warnings?: string[];
    schemaValid?: boolean;
    documentStructure?: {
      categories: string[];
      hasTableStructure: boolean;
      hasFormattedSections: boolean;
    };
  };
  enhancementSummary?: {
    itemsEnhanced: number;
    averageConfidence: number;
    allergensDetected: number;
    wineIntelligenceApplied: number;
  };
}

const MenuPreviewEnhancement: React.FC<PreviewEnhancementProps> = ({
  sourceFormat,
  totalItems,
  metadata,
  enhancementSummary,
}) => {
  const getFormatIcon = () => {
    switch (sourceFormat) {
      case "excel":
        return <TableCellsIcon className="h-5 w-5 text-green-600" />;
      case "csv":
        return <DocumentTextIcon className="h-5 w-5 text-blue-600" />;
      case "json":
        return <CodeBracketIcon className="h-5 w-5 text-purple-600" />;
      case "word":
        return <DocumentIcon className="h-5 w-5 text-blue-700" />;
      case "pdf":
        return <DocumentTextIcon className="h-5 w-5 text-red-600" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFormatDisplayName = () => {
    switch (sourceFormat) {
      case "excel":
        return "Excel Spreadsheet";
      case "csv":
        return "CSV File";
      case "json":
        return "JSON Data";
      case "word":
        return "Word Document";
      case "pdf":
        return "PDF Document";
      default:
        return "Unknown Format";
    }
  };

  const getFormatColor = () => {
    switch (sourceFormat) {
      case "excel":
        return "bg-green-50 border-green-200 text-green-800";
      case "csv":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "json":
        return "bg-purple-50 border-purple-200 text-purple-800";
      case "word":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "pdf":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600";
    if (confidence >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800";
    if (confidence >= 75) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-4">
      {/* Source Format Indicator */}
      <div className={`p-4 rounded-lg border ${getFormatColor()}`}>
        <div className="flex items-center space-x-3">
          {getFormatIcon()}
          <div className="flex-1">
            <h3 className="font-semibold">Source: {getFormatDisplayName()}</h3>
            <p className="text-sm opacity-80">
              {totalItems} menu items processed
              {metadata?.processingTime && (
                <span> in {(metadata.processingTime / 1000).toFixed(2)}s</span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {sourceFormat !== "pdf" && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                <SparklesIcon className="h-3 w-3 mr-1" />
                Enhanced Intelligence
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Enhancement Summary */}
      {enhancementSummary && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <SparklesIcon className="h-4 w-4 mr-2 text-blue-500" />
            AI Enhancement Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {enhancementSummary.itemsEnhanced}
              </div>
              <div className="text-sm text-gray-600">Items Enhanced</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${getConfidenceColor(
                  enhancementSummary.averageConfidence
                )}`}
              >
                {enhancementSummary.averageConfidence}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {enhancementSummary.allergensDetected}
              </div>
              <div className="text-sm text-gray-600">Allergens Detected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {enhancementSummary.wineIntelligenceApplied}
              </div>
              <div className="text-sm text-gray-600">Wine Intelligence</div>
            </div>
          </div>
        </div>
      )}

      {/* Format-Specific Metadata */}
      {metadata && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Format Insights</h4>
          <div className="space-y-2">
            {/* Schema Validation (JSON) */}
            {metadata.schemaValid !== undefined && (
              <div className="flex items-center space-x-2">
                {metadata.schemaValid ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  Schema validation:{" "}
                  {metadata.schemaValid ? "Valid" : "Issues found"}
                </span>
              </div>
            )}

            {/* Document Structure (Word) */}
            {metadata.documentStructure && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    Document Structure:
                  </span>
                </div>
                <div className="ml-6 text-sm text-gray-600 space-y-1">
                  <div>
                    Categories:{" "}
                    {metadata.documentStructure.categories.join(", ")}
                  </div>
                  <div>
                    Structure:{" "}
                    {metadata.documentStructure.hasTableStructure
                      ? "Table-based"
                      : "Text-based"}
                  </div>
                  <div>
                    Sections:{" "}
                    {metadata.documentStructure.hasFormattedSections
                      ? "Well-formatted"
                      : "Simple"}
                  </div>
                </div>
              </div>
            )}

            {/* Processing Warnings */}
            {metadata.warnings && metadata.warnings.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">
                    Processing Warnings:
                  </span>
                </div>
                <div className="ml-6 space-y-1">
                  {metadata.warnings.slice(0, 3).map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-700">
                      • {warning}
                    </div>
                  ))}
                  {metadata.warnings.length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{metadata.warnings.length - 3} more warnings...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced vs Original Data Toggle (placeholder for future enhancement) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              AI-Enhanced Data Preview
            </span>
          </div>
          <span className="text-xs text-blue-600">
            Enhanced with ingredient intelligence & allergen detection
          </span>
        </div>
      </div>
    </div>
  );
};

export default MenuPreviewEnhancement;
