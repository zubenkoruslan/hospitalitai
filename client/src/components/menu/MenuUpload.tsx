import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
} from "react";
import axios from "axios"; // Or your preferred HTTP client
import { useAuth } from "../../context/AuthContext"; // Adjust path if AuthContext is elsewhere
import Modal from "../common/Modal"; // Import generic Modal
import Button from "../common/Button"; // Import common Button
import ErrorMessage from "../common/ErrorMessage"; // Import ErrorMessage
import LoadingSpinner from "../common/LoadingSpinner"; // For uploader text
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline"; // For icons

// Define supported file formats
export interface SupportedFormat {
  extension: string;
  mimeTypes: string[];
  displayName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  maxSize: number; // in MB
}

export const SUPPORTED_FORMATS: Record<string, SupportedFormat> = {
  pdf: {
    extension: "pdf",
    mimeTypes: ["application/pdf"],
    displayName: "PDF",
    description: "Portable Document Format - AI will extract menu items",
    icon: DocumentTextIcon,
    color: "text-red-600",
    maxSize: 10,
  },
  excel: {
    extension: "xlsx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    displayName: "Excel",
    description: "Excel spreadsheet with structured menu data",
    icon: TableCellsIcon,
    color: "text-green-600",
    maxSize: 5,
  },
  csv: {
    extension: "csv",
    mimeTypes: ["text/csv", "application/csv"],
    displayName: "CSV",
    description: "Comma-separated values with menu data",
    icon: DocumentIcon,
    color: "text-blue-600",
    maxSize: 2,
  },
  json: {
    extension: "json",
    mimeTypes: ["application/json", "text/json"],
    displayName: "JSON",
    description: "JavaScript Object Notation with structured menu data",
    icon: CodeBracketIcon,
    color: "text-purple-600",
    maxSize: 2,
  },
  word: {
    extension: "docx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    displayName: "Word",
    description: "Microsoft Word document with formatted menu",
    icon: DocumentIcon,
    color: "text-indigo-600",
    maxSize: 5,
  },
};

interface MenuUploadProps {
  isOpen: boolean; // To control modal visibility
  onClose: () => void; // To close the modal
  onFileSelected: (file: File) => void; // New prop to pass the selected file up
}

const MenuUpload: React.FC<MenuUploadProps> = ({
  isOpen,
  onClose,
  onFileSelected,
}) => {
  const { token } = useAuth(); // Get token from AuthContext
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<SupportedFormat | null>(
    null
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // For upload progress
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false); // Drag state
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setDetectedFormat(null);
      setIsUploading(false);
      setUploadProgress(0);
      setMessage(null);
      setError(null);
      setIsDraggingOver(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  /**
   * Detect file format based on file extension and MIME type
   */
  const detectFileFormat = (file: File): SupportedFormat | null => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    // First try to match by file extension
    for (const format of Object.values(SUPPORTED_FORMATS)) {
      if (format.extension === fileExtension) {
        return format;
      }
    }

    // Then try to match by MIME type
    for (const format of Object.values(SUPPORTED_FORMATS)) {
      if (format.mimeTypes.includes(file.type)) {
        return format;
      }
    }

    return null;
  };

  /**
   * Validate file format and size
   */
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const format = detectFileFormat(file);

    if (!format) {
      return {
        isValid: false,
        error: `Unsupported file format. Supported formats: ${Object.values(
          SUPPORTED_FORMATS
        )
          .map((f) => f.displayName)
          .join(", ")}`,
      };
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > format.maxSize) {
      return {
        isValid: false,
        error: `File size (${fileSizeMB.toFixed(
          1
        )}MB) exceeds the maximum allowed size for ${
          format.displayName
        } files (${format.maxSize}MB)`,
      };
    }

    // Additional format-specific validations
    if (format.extension === "excel" && !file.name.match(/\.(xlsx|xls)$/i)) {
      return {
        isValid: false,
        error: "Excel files must have .xlsx or .xls extension",
      };
    }

    if (format.extension === "csv" && !file.name.match(/\.csv$/i)) {
      return {
        isValid: false,
        error: "CSV files must have .csv extension",
      };
    }

    if (format.extension === "json" && !file.name.match(/\.json$/i)) {
      return {
        isValid: false,
        error: "JSON files must have .json extension",
      };
    }

    if (format.extension === "word" && !file.name.match(/\.docx$/i)) {
      return {
        isValid: false,
        error: "Word files must have .docx extension",
      };
    }

    return { isValid: true };
  };

  const processFile = (file: File | null) => {
    setMessage(null);
    setError(null);
    setDetectedFormat(null);

    if (file) {
      const validation = validateFile(file);

      if (validation.isValid) {
        const format = detectFileFormat(file);
        setSelectedFile(file);
        setDetectedFormat(format);
        setMessage(
          `Selected: ${file.name.substring(0, 50)}${
            file.name.length > 50 ? "..." : ""
          } (${format?.displayName} format)`
        );
      } else {
        setSelectedFile(null);
        setDetectedFormat(null);
        setError(validation.error || "Invalid file");
      }
    } else {
      setSelectedFile(null);
      setDetectedFormat(null);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    processFile(
      event.target.files && event.target.files[0] ? event.target.files[0] : null
    );
  };

  // --- Drag and Drop Handlers ---
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy"; // Show copy cursor
    if (!isDraggingOver) setIsDraggingOver(true); // Ensure it's set if somehow missed by enter
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFile(event.dataTransfer.files[0]);
      event.dataTransfer.clearData(); // Important for some browsers
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const formId = "menu-upload-form";

  // Generate accept attribute for file input
  const acceptedTypes = Object.values(SUPPORTED_FORMATS)
    .map((format) => [`.${format.extension}`, ...format.mimeTypes])
    .flat()
    .join(",");

  const footerContent = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        disabled={!selectedFile}
        onClick={() => {
          if (selectedFile) {
            onFileSelected(selectedFile);
          }
        }}
        className="ml-3"
      >
        Proceed to Preview
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Menu File to Upload"
      size="lg"
      footerContent={footerContent}
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        id={formId}
        className="space-y-6"
      >
        {/* Supported Formats Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Supported Formats
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(SUPPORTED_FORMATS).map((format) => {
                  const IconComponent = format.icon;
                  return (
                    <div
                      key={format.extension}
                      className="flex items-center space-x-2"
                    >
                      <IconComponent className={`h-4 w-4 ${format.color}`} />
                      <span className="text-sm text-blue-800">
                        <span className="font-medium">.{format.extension}</span>{" "}
                        - {format.displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileSelect();
            }
          }}
          role="button"
          aria-label="Drop menu file here or click to select a file"
          className={`mt-1 flex flex-col justify-center items-center px-6 pt-8 pb-8 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
            isDraggingOver
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            id="menu-upload-input-modal"
            type="file"
            accept={acceptedTypes}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Icon */}
          <ArrowUpTrayIcon
            className={`mx-auto h-12 w-12 mb-4 ${
              isDraggingOver ? "text-blue-600" : "text-slate-400"
            }`}
          />

          {/* Main Text */}
          <div className="text-center">
            <p
              className={`text-lg font-medium mb-2 ${
                isDraggingOver ? "text-blue-700" : "text-slate-700"
              }`}
            >
              {isDraggingOver
                ? "Drop your menu file here"
                : "Upload a menu file"}
            </p>
            <p
              className={`text-sm mb-4 ${
                isDraggingOver ? "text-blue-600" : "text-slate-500"
              }`}
            >
              Drag and drop or click to select
            </p>
          </div>

          {/* Format Icons Row */}
          <div className="flex items-center space-x-4 opacity-60">
            {Object.values(SUPPORTED_FORMATS).map((format) => {
              const IconComponent = format.icon;
              return (
                <div
                  key={format.extension}
                  className="flex flex-col items-center"
                >
                  <IconComponent className={`h-6 w-6 ${format.color} mb-1`} />
                  <span className="text-xs text-slate-500 uppercase font-medium">
                    {format.extension}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* File Details (when file is selected) */}
        {selectedFile && detectedFormat && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              {React.createElement(detectedFormat.icon, {
                className: `h-6 w-6 ${detectedFormat.color} flex-shrink-0 mt-0.5`,
              })}
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-900 mb-1">
                  File Ready for Upload
                </h4>
                <p className="text-sm text-green-800 mb-2">
                  <span className="font-medium">{selectedFile.name}</span>
                </p>
                <div className="text-xs text-green-700 space-y-1">
                  <p>
                    Format: {detectedFormat.displayName} (.
                    {detectedFormat.extension})
                  </p>
                  <p>
                    Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="italic">{detectedFormat.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {message && !error && !selectedFile && (
          <div className="p-3 rounded-lg text-sm mt-4 bg-green-50 border border-green-300 text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4">
            <ErrorMessage message={error} />
          </div>
        )}
      </form>
    </Modal>
  );
};

export default MenuUpload;
