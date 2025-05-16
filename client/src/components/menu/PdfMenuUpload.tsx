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
  restaurantId: string; // Pass the current restaurant's ID as a prop
  onUploadSuccess?: (menuData: any) => void; // Optional callback on successful upload
  onUploadError?: (error: string) => void; // Optional callback on error
}

const PdfMenuUpload: React.FC<PdfMenuUploadProps> = ({
  isOpen,
  onClose,
  restaurantId,
  onUploadSuccess,
  onUploadError,
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError("Please select or drop a PDF file to upload.");
      return;
    }
    if (!token) {
      setError("Authentication error. Please log in again.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage("Preparing upload...");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("menuPdf", selectedFile);

    try {
      setMessage("Uploading menu...");
      const response = await axios.post(
        `/api/menus/upload/pdf/${restaurantId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
              setMessage(`Uploading: ${percentCompleted}%`);
            }
          },
        }
      );

      setIsUploading(false);
      setMessage(response.data.message || "Menu PDF processed successfully!");
      setSelectedFile(null);
      setUploadProgress(100);
      if (onUploadSuccess) {
        onUploadSuccess(response.data.data);
      }
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to upload menu. Please try again.";
      setError(errorMessage);
      setMessage(null);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
      console.error("Upload error:", err);
    }
  };

  const formId = "pdf-upload-form";

  const footerContent = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isUploading}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        disabled={isUploading || !selectedFile}
        className="ml-3"
      >
        {isUploading ? (
          <span className="flex items-center">
            <LoadingSpinner message="" />
            <span className="ml-2">Uploading ({uploadProgress}%)</span>
          </span>
        ) : (
          "Upload Menu"
        )}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload PDF Menu"
      size="lg"
      footerContent={footerContent}
    >
      <form onSubmit={handleSubmit} id={formId} className="space-y-6">
        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect} // Allow click to select file
          className={`p-6 py-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-200 ease-in-out 
            ${
              isDraggingOver
                ? "border-sky-500 bg-sky-50"
                : "border-slate-300 hover:border-slate-400 bg-slate-50"
            }
            ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            id="pdf-upload-input-modal" // ID can remain for label association if any, but mostly for reset
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden" // Hide the default input
          />
          <ArrowUpTrayIcon
            className={`mx-auto h-12 w-12 mb-3 ${
              isDraggingOver ? "text-sky-600" : "text-slate-400"
            }`}
          />
          <p
            className={`text-sm font-medium ${
              isDraggingOver ? "text-sky-700" : "text-slate-700"
            }`}
          >
            {selectedFile
              ? selectedFile.name
              : "Drag & drop your PDF here, or click to select"}
          </p>
          <p
            className={`text-xs mt-1 ${
              isDraggingOver ? "text-sky-600" : "text-slate-500"
            }`}
          >
            PDF only, max 5MB
          </p>
        </div>

        {/* Progress Bar - visibility controlled by isUploading & progress */}
        {isUploading && uploadProgress > 0 && (
          <div>
            {/* Message state already shows percentage, no need for a separate label here */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mt-2">
              <div
                className="bg-sky-500 h-2.5 rounded-full transition-all duration-150 ease-linear"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {message && !error && (
          <div
            className={`p-3 rounded-lg text-sm mt-4 ${
              isUploading
                ? "bg-sky-50 border border-sky-300 text-sky-700"
                : "bg-green-50 border border-green-300 text-green-700"
            }`}
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
