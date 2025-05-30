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
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors duration-200 ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <input {...getInputProps()} />
            <svg
              className={`mx-auto h-12 w-12 ${
                isDragActive ? "text-blue-600" : "text-slate-400"
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
            <div className="flex text-sm text-slate-600">
              <label
                htmlFor="file-upload"
                className={`relative cursor-pointer rounded-md font-medium ${
                  isDragActive ? "text-blue-700" : "text-slate-700"
                } hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500`}
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                      setLocalError(null);
                    } else {
                      setLocalError(
                        "Invalid file type or too many files selected."
                      );
                    }
                  }}
                  accept=".pdf,.doc,.docx,.txt"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p
              className={`text-xs ${
                isDragActive ? "text-blue-600" : "text-slate-500"
              }`}
            >
              PDF, DOC, DOCX, TXT up to 10MB
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default memo(SopUploadModal);
