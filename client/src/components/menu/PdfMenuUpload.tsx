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
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline"; // For dropzone icon

interface PdfMenuUploadProps {
  isOpen: boolean; // To control modal visibility
  onClose: () => void; // To close the modal
  onFileSelected: (file: File) => void; // New prop to pass the selected file up
}

const PdfMenuUpload: React.FC<PdfMenuUploadProps> = ({
  isOpen,
  onClose,
  onFileSelected, // Destructure new prop
}) => {
  const { token } = useAuth(); // Get token from AuthContext
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const processFile = (file: File | null) => {
    setMessage(null);
    setError(null);
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setMessage(
          `Selected: ${file.name.substring(0, 50)}${
            file.name.length > 50 ? "..." : ""
          }`
        );
      } else {
        setSelectedFile(null);
        setError("Invalid file type. Please select or drop a PDF (.pdf) file.");
      }
    } else {
      setSelectedFile(null);
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

  const formId = "pdf-select-form"; // Changed ID, it's not really a submit form anymore

  const footerContent = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="button" // Changed from submit
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
      title="Select PDF Menu to Upload" // Updated title
      size="lg"
      footerContent={footerContent}
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        id={formId}
        className="space-y-6"
      >
        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect} // Allow click to select file
          tabIndex={0} // Make it focusable
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault(); // Prevent default spacebar scroll or enter submit
              triggerFileSelect();
            }
          }}
          role="button" // Indicate it's an interactive element
          aria-label="Drop PDF file here or click to select a file"
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all duration-200 ${
            isDraggingOver
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <input
            ref={fileInputRef}
            id="pdf-upload-input-modal"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg
            className={`mx-auto h-12 w-12 ${
              isDraggingOver ? "text-blue-600" : "text-slate-400"
            }`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex text-sm text-gray-600">
            <p
              className={`pl-1 font-medium ${
                isDraggingOver ? "text-blue-700" : "text-slate-700"
              }`}
            >
              {isDraggingOver ? "Drop your PDF here" : "Upload a PDF menu file"}
            </p>
          </div>
          <p
            className={`text-xs ${
              isDraggingOver ? "text-blue-600" : "text-slate-500"
            }`}
          >
            PDF up to 10MB
          </p>
        </div>

        {/* Status Messages */}
        {message && !error && (
          <div
            className={`p-3 rounded-lg text-sm mt-4 bg-green-50 border border-green-300 text-green-700`}
          >
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4">
            {" "}
            {/* Wrapper div for margin */}
            <ErrorMessage message={error} />
          </div>
        )}
      </form>
    </Modal>
  );
};

export default PdfMenuUpload;
