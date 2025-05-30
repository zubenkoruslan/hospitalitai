import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useCallback,
} from "react";
import { ISopDocument, SopDocumentUploadData } from "../types/sopTypes"; // Use ISopDocument from sopTypes
import {
  listRestaurantSopDocuments, // Changed from listSopDocuments
  uploadSopDocument,
  deleteSopDocument, // Added deleteSopDocument
  // getSopDocumentStatus // Might need this later for status polling
} from "../services/api"; // Corrected path
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import DashboardLayout from "../components/layout/DashboardLayout"; // Updated import
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
  DocumentTextIcon,
} from "@heroicons/react/24/outline"; // Example icons
import { useAuth } from "../context/AuthContext"; // Added for restaurantId

const SopManagementPage: React.FC = () => {
  const [sopDocuments, setSopDocuments] = useState<ISopDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // Initialize useNavigate
  const { user } = useAuth(); // Get user from AuthContext
  const restaurantId = user?.restaurantId; // Get restaurantId

  // Modal and Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null); // Error specific to upload op
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // State for delete operation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!restaurantId) {
      setError("Restaurant information not available. Cannot load SOPs.");
      setSopDocuments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // listRestaurantSopDocuments in api.ts should return Promise<ISopDocument[]>
      const responseData = await listRestaurantSopDocuments();
      setSopDocuments(responseData || []);
    } catch (err: any) {
      console.error("Failed to fetch SOP documents:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load SOP documents."
      );
      setSopDocuments([]); // Clear documents on error
    }
    setIsLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadSop = useCallback(
    async (title: string, description: string, file: File) => {
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
          `Document "${response.document.title}" uploaded successfully. It will be processed shortly.`
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
    },
    [fetchDocuments]
  );

  const handleDeleteSopDocument = useCallback(
    async (documentId: string, documentTitle: string) => {
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
    },
    []
  );

  // Memoized onClose handler for the modal
  const handleModalClose = useCallback(() => {
    setIsUploadModalOpen(false);
    setUploadError(null); // Clear upload error when modal is manually closed
  }, []);

  return (
    <DashboardLayout title="SOP & Policy Management">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <DocumentTextIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  SOP & Policy Management
                </h1>
                <p className="text-slate-600 mt-2">
                  Upload and manage your standard operating procedures
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {deleteSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <SuccessNotification
              message={deleteSuccess}
              onDismiss={() => setDeleteSuccess(null)}
            />
          </div>
        )}
        {deleteError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <ErrorMessage
              message={deleteError}
              onDismiss={() => setDeleteError(null)}
            />
          </div>
        )}
        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <SuccessNotification
              message={uploadSuccess}
              onDismiss={() => setUploadSuccess(null)}
            />
          </div>
        )}

        {/* SOP Documents List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Uploaded SOP Documents
            </h2>
          </div>

          <div className="p-6">
            {isLoading && (
              <div className="text-center py-12">
                <LoadingSpinner message="Loading documents..." />
              </div>
            )}

            {!isLoading && !error && sopDocuments.length === 0 && (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No SOP documents yet
                </h3>
                <p className="text-slate-500 mb-6">
                  Upload your first SOP document to get started with staff
                  training.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center space-x-2 mx-auto"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  <span>Upload Document</span>
                </Button>
              </div>
            )}

            {!isLoading && !error && sopDocuments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Title",
                        "Description",
                        "Status",
                        "Uploaded At",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className={`px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${
                            header === "Actions" ? "text-right" : "text-left"
                          }`}
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
                        className="hover:bg-slate-50 cursor-pointer transition-colors duration-150 group"
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              doc.status === "processed"
                                ? "bg-green-100 text-green-800"
                                : doc.status === "processing" ||
                                  doc.status === "pending_processing" ||
                                  doc.status === "pending_upload"
                                ? "bg-yellow-100 text-yellow-800"
                                : doc.status === "processing_error"
                                ? "bg-red-100 text-red-800"
                                : doc.status === "archived"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {doc.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {doc.uploadedAt
                            ? format(new Date(doc.uploadedAt), "MMM d, yyyy")
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSopDocument(doc._id, doc.title);
                            }}
                            disabled={deletingId === doc._id}
                            className="text-red-600 hover:text-red-900 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-150 p-2 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Delete Document"
                          >
                            {deletingId === doc._id ? (
                              <div className="animate-spin h-5 w-5">
                                <LoadingSpinner />
                              </div>
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
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <SopUploadModal
          isOpen={isUploadModalOpen}
          onClose={handleModalClose}
          onUpload={handleUploadSop}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      )}
    </DashboardLayout>
  );
};

export default SopManagementPage;
