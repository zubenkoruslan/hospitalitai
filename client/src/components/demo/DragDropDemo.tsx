import React, { useState } from "react";

interface DragDropDemoProps {
  onFileSelect?: (file: File) => void;
}

const DragDropDemo: React.FC<DragDropDemoProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const supportedFormats = [
    { ext: "PDF", color: "bg-red-500", desc: "Portable Document Format" },
    { ext: "CSV", color: "bg-green-500", desc: "Comma Separated Values" },
    { ext: "XLSX", color: "bg-blue-500", desc: "Excel Spreadsheet" },
    { ext: "DOCX", color: "bg-indigo-500", desc: "Word Document" },
    { ext: "JSON", color: "bg-yellow-500", desc: "JavaScript Object Notation" },
    { ext: "TXT", color: "bg-gray-500", desc: "Plain Text File" },
  ];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format = supportedFormats.find((f) => f.ext.toLowerCase() === ext);
    return (
      format || { ext: "FILE", color: "bg-slate-500", desc: "Unknown format" }
    );
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🚀 Multi-Format Drag & Drop Demo
      </h3>

      {/* Supported formats */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">
          Supported Formats:
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {supportedFormats.map((format) => (
            <div key={format.ext} className="flex items-center gap-1 text-xs">
              <div className={`w-3 h-3 ${format.color} rounded`}></div>
              <span>{format.ext}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? "border-blue-400 bg-blue-50 scale-105"
            : "border-gray-300 bg-gray-50 hover:border-blue-300"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isDragOver ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <svg
              className={`w-6 h-6 ${
                isDragOver ? "text-white" : "text-gray-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <p
            className={`font-medium mb-1 ${
              isDragOver ? "text-blue-700" : "text-gray-700"
            }`}
          >
            {isDragOver ? "Drop your file here!" : "Drag & drop menu file"}
          </p>

          <p className="text-sm text-gray-500">
            PDF, CSV, Excel, Word, JSON, or TXT
          </p>
        </div>
      </div>

      {/* Selected file display */}
      {selectedFile && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 ${
                getFileIcon(selectedFile).color
              } rounded flex items-center justify-center`}
            >
              <span className="text-white text-xs font-bold">
                {getFileIcon(selectedFile).ext}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800 text-sm">
                {selectedFile.name}
              </p>
              <p className="text-xs text-green-600">
                {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                {getFileIcon(selectedFile).desc}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropDemo;
