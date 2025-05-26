import React, { useState, useCallback, FormEvent, memo } from "react";
import Modal from "../common/Modal";
import { useDropzone } from "react-dropzone";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface SopUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (title: string, description: string, file: File) => Promise<void>;
  isUploading: boolean;
  uploadError: string | null;
}

const SopUploadModal: React.FC<SopUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isUploading,
  uploadError,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setLocalError(null);
    } else {
      setLocalError("Invalid file type or too many files selected.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setLocalError("Document title is required.");
      return;
    }
    if (!file) {
      setLocalError("A file is required for upload.");
      return;
    }
    setLocalError(null);
    await onUpload(title, description, file);
    // Do not close modal or reset fields here, parent (SopManagementPage) will handle it on successful upload
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setFile(null);
    setLocalError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload New SOP Document"
      size="xl"
      footerContent={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition ease-in-out duration-150 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="sop-upload-form"
            disabled={isUploading || !file || !title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition ease-in-out duration-150 disabled:opacity-50 disabled:bg-indigo-400"
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </>
      }
    >
      <form id="sop-upload-form" onSubmit={handleSubmit} className="space-y-6">
        {(localError || uploadError) && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
            <p>{localError || uploadError}</p>
          </div>
        )}
        <div>
          <label
            htmlFor="sop-title"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Document Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="sop-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Kitchen Opening Checklist"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
            disabled={isUploading}
          />
        </div>
        <div>
          <label
            htmlFor="sop-description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description (Optional)
          </label>
          <textarea
            id="sop-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Briefly describe the SOP document..."
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
            disabled={isUploading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            SOP File <span className="text-red-500">*</span> (PDF, DOCX, TXT,
            MD)
          </label>
          <div
            {...getRootProps()}
            tabIndex={0}
            className={`p-6 py-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-200 ease-in-out
              ${
                isDragActive
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50"
              }
              ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            <ArrowUpTrayIcon
              className={`mx-auto h-12 w-12 mb-3 ${
                isDragActive ? "text-sky-600" : "text-slate-400"
              }`}
            />
            <p
              className={`text-sm font-medium ${
                isDragActive ? "text-sky-700" : "text-slate-700"
              }`}
            >
              {file
                ? file.name
                : isDragActive
                ? "Drop the file here..."
                : "Drag & drop your SOP file here, or click to select"}
            </p>
            {file && (
              <div className="mt-1 text-xs text-slate-500">
                <span>({(file.size / 1024).toFixed(2)} KB) </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700 font-medium items-center inline-flex"
                  aria-label="Remove selected file"
                >
                  <XMarkIcon className="h-3 w-3 mr-0.5" /> Remove
                </button>
              </div>
            )}
            <p
              className={`text-xs mt-1 ${
                isDragActive ? "text-sky-600" : "text-slate-500"
              }`}
            >
              PDF, DOCX, TXT, MD up to 10MB
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default memo(SopUploadModal);
