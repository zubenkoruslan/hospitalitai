import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  ISopDocumentListItem, // Using the slimmer list item type
  SopDocumentUploadData,
} from "../types/sopManagement"; // Corrected path
import {
  listSopDocuments,
  uploadSopDocument,
  deleteSopDocument, // Added deleteSopDocument
  // getSopDocumentStatus // Might need this later for status polling
} from "../services/api"; // Corrected path
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import Navbar from "../components/Navbar"; // Added Navbar import
import SopUploadModal from "../components/sop/SopUploadModal"; // Added
import Button from "../components/common/Button"; // For consistent button styling
import Card from "../components/common/Card"; // For layout consistency
import LoadingSpinner from "../components/common/LoadingSpinner"; // For loading states
import ErrorMessage from "../components/common/ErrorMessage"; // For error display
import SuccessNotification from "../components/common/SuccessNotification"; // For success messages
import { format } from "date-fns"; // Import date-fns for formatting
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline"; // Example icons

const SopManagementPage: React.FC = () => {
  const [sopDocuments, setSopDocuments] = useState<ISopDocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // Initialize useNavigate

  // Modal and Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null); // Error specific to upload op
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // State for delete operation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listSopDocuments();
      // Assuming backend returns { data: ISopDocumentListItem[] } consistent with SopDocumentListResponse
      setSopDocuments(response.data);
    } catch (err: any) {
      console.error("Failed to fetch SOP documents:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load SOP documents."
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSop = async (
    title: string,
    description: string,
    file: File
  ) => {
    if (!title.trim() || !file) {
      setUploadError("Please provide both a title and a file."); // Should be caught by modal, but good backup
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    // SopDocumentUploadData now includes description
    const uploadData: SopDocumentUploadData = {
      title: title.trim(),
      description: description.trim(),
      sopDocument: file,
    };

    try {
      const response = await uploadSopDocument(uploadData);
      setUploadSuccess(
        `Document "${response.title}" uploaded successfully. It will be processed shortly.`
      );
      fetchDocuments(); // Refresh the list
      setIsUploadModalOpen(false); // Close modal on success
    } catch (err: any) {
      console.error("Failed to upload SOP document:", err);
      setUploadError(
        err.response?.data?.message ||
          err.message ||
          "Failed to upload document."
      );
      // Do not close modal on error, let user see the error in modal
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSopDocument = async (
    documentId: string,
    documentTitle: string
  ) => {
    if (
      !window.confirm(`Are you sure you want to delete "${documentTitle}"?`)
    ) {
      return;
    }
    setDeletingId(documentId);
    setDeleteError(null);
    setDeleteSuccess(null);
    try {
      await deleteSopDocument(documentId);
      setDeleteSuccess(`Document "${documentTitle}" deleted.`);
      // Refresh the list by filtering out the deleted document
      setSopDocuments((prevDocs) =>
        prevDocs.filter((doc) => doc._id !== documentId)
      );
    } catch (err: any) {
      console.error(`Failed to delete SOP document ${documentId}:`, err);
      setDeleteError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete document."
      );
    }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="bg-white shadow-lg rounded-xl p-6 mb-8 mx-auto max-w-7xl mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            SOP & Policy Management
          </h1>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button
              variant="primary"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={isUploading} // Disable if an upload is already in progress via modal
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-6 pt-0">
        {/* Notifications: Page-level fetch error, delete success/error */}
        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {deleteSuccess && (
          <div className="mb-4">
            <SuccessNotification
              message={deleteSuccess}
              onDismiss={() => setDeleteSuccess(null)}
            />
          </div>
        )}
        {deleteError && (
          <div className="mb-4">
            <ErrorMessage
              message={deleteError}
              onDismiss={() => setDeleteError(null)}
            />
          </div>
        )}
        {/* Upload success message will appear here too if needed, or just rely on modal closure */}
        {uploadSuccess && (
          <div className="mb-4">
            <SuccessNotification
              message={uploadSuccess}
              onDismiss={() => setUploadSuccess(null)}
            />
          </div>
        )}

        {/* SOP Documents List Section - Card Style */}
        <Card className="bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800">
              Uploaded SOP Documents
            </h2>
          </div>

          {isLoading && (
            <p className="p-6 text-slate-600">Loading documents...</p>
          )}
          {!isLoading && !error && sopDocuments.length === 0 && (
            <p className="p-6 text-slate-600">
              No SOP documents found. Upload one to get started!
            </p>
          )}

          {!isLoading && !error && sopDocuments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Title",
                      "Description",
                      "Type",
                      "Status",
                      "Uploaded At",
                      "Actions",
                    ].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {sopDocuments.map((doc) => (
                    <tr
                      key={doc._id}
                      onClick={() => navigate(`/sop-management/${doc._id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors duration-150 ease-in-out"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {doc.title}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate"
                        title={doc.description}
                      >
                        {doc.description || (
                          <span className="italic text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {doc.fileType ? doc.fileType.toUpperCase() : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span
                          className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            doc.status === "processed"
                              ? "bg-green-100 text-green-800"
                              : doc.status === "error"
                              ? "bg-red-100 text-red-800"
                              : doc.status === "uploaded" ||
                                doc.status === "parsing" ||
                                doc.status === "categorizing"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {doc.uploadedAt
                          ? format(
                              new Date(doc.uploadedAt),
                              "dd MMM yyyy, hh:mm a"
                            )
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sop-management/${doc._id}`);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-150 ease-in-out p-1 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          title="View Document"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSopDocument(doc._id, doc.title);
                          }}
                          disabled={deletingId === doc._id}
                          className="text-red-600 hover:text-red-900 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out p-1 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Delete Document"
                        >
                          {deletingId === doc._id ? (
                            <svg
                              className="animate-spin h-5 w-5 text-red-600"
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
                          ) : (
                            <TrashIcon className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {isUploadModalOpen && (
        <SopUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadError(null); // Clear upload error when modal is manually closed
          }}
          onUpload={handleUploadSop}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      )}
    </div>
  );
};

export default SopManagementPage;
