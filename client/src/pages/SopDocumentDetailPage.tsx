import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ISopDocument } from "../types/sopManagement"; // Adjusted path
import { getSopDocumentDetails } from "../services/api"; // Adjusted path
import Navbar from "../components/Navbar"; // Added Navbar import

const SopDocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [document, setDocument] = useState<ISopDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentId) {
      const fetchDocumentDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await getSopDocumentDetails(documentId);
          // Assuming backend returns { data: ISopDocument } consistent with SopDocumentDetailResponse
          setDocument(response.data);
        } catch (err: any) {
          console.error(`Failed to fetch SOP document ${documentId}:`, err);
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load document details."
          );
        }
        setIsLoading(false);
      };
      fetchDocumentDetails();
    }
  }, [documentId]);

  if (!documentId) {
    // Should ideally be caught by router, but good to have
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">Error: Document ID is missing.</p>
        <Link
          to="/sop-management"
          className="text-indigo-600 hover:text-indigo-800"
        >
          Back to SOP Management
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Loading document details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">Error: {error}</p>
        <Link
          to="/sop-management"
          className="text-indigo-600 hover:text-indigo-800"
        >
          Back to SOP Management
        </Link>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Document not found.</p>
        <Link
          to="/sop-management"
          className="text-indigo-600 hover:text-indigo-800"
        >
          Back to SOP Management
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <Link
            to="/sop-management"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Back to SOP Management
          </Link>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            {document.title}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Original File: {document.originalFileName}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold text-gray-700 mb-1">
                Status
              </h3>
              <p
                className={`text-md font-medium 
                ${
                  document.status === "processed"
                    ? "text-green-600"
                    : document.status === "error"
                    ? "text-red-600"
                    : "text-yellow-600"
                }
              `}
              >
                {document.status.charAt(0).toUpperCase() +
                  document.status.slice(1)}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold text-gray-700 mb-1">
                File Type
              </h3>
              <p className="text-md text-gray-800">
                {document.fileType.toUpperCase()}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold text-gray-700 mb-1">
                Uploaded At
              </h3>
              <p className="text-md text-gray-800">
                {new Date(document.uploadedAt).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold text-gray-700 mb-1">
                Last Updated
              </h3>
              <p className="text-md text-gray-800">
                {new Date(document.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {document.errorMessage && document.status === "error" && (
            <div className="my-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
              <h3 className="text-lg font-semibold">Processing Error:</h3>
              <p>{document.errorMessage}</p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">
              Categories
            </h2>
            {document.categories && document.categories.length > 0 ? (
              <ul className="space-y-2">
                {document.categories.map((cat) => (
                  <li
                    key={cat._id || cat.name}
                    className="p-3 bg-indigo-50 rounded-md shadow-sm"
                  >
                    <span className="font-medium text-indigo-700">
                      {cat.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">
                No categories found for this document, or it hasn't been
                processed yet.
              </p>
            )}
          </div>

          {document.extractedText && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-3">
                Extracted Text
              </h2>
              <div className="bg-gray-100 p-4 rounded-lg shadow-sm max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {document.extractedText}
                </pre>
              </div>
            </div>
          )}

          {!document.extractedText && document.status === "processed" && (
            <p className="text-gray-600">
              No text was extracted from this document.
            </p>
          )}

          {(document.status === "uploaded" ||
            document.status === "parsing" ||
            document.status === "categorizing") && (
            <div className="mt-6 p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              <p>
                This document is currently being processed. Extracted text and
                detailed categories will appear once processing is complete.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SopDocumentDetailPage;
