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
import Navbar from "../components/Navbar";
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
  MagnifyingGlassIcon,
  ListBulletIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
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

  // Search functionality
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filtered documents based on search
  const filteredDocuments = React.useMemo(() => {
    if (!searchTerm.trim()) return sopDocuments;

    const search = searchTerm.toLowerCase();
    return sopDocuments.filter(
      (doc) =>
        doc.title.toLowerCase().includes(search) ||
        doc.description?.toLowerCase().includes(search) ||
        doc.status.toLowerCase().includes(search)
    );
  }, [sopDocuments, searchTerm]);

  // Statistics
  const stats = React.useMemo(() => {
    const totalDocs = sopDocuments.length;
    const processedDocs = sopDocuments.filter(
      (doc) => doc.status === "processed"
    ).length;
    const processingDocs = sopDocuments.filter(
      (doc) =>
        doc.status === "processing" ||
        doc.status === "pending_processing" ||
        doc.status === "pending_upload"
    ).length;
    const errorDocs = sopDocuments.filter(
      (doc) => doc.status === "processing_error"
    ).length;

    return {
      totalDocuments: totalDocs,
      processedDocuments: processedDocs,
      processingDocuments: processingDocs,
      errorDocuments: errorDocs,
      filteredCount: filteredDocuments.length,
      hasSearchResults: searchTerm.trim() !== "",
    };
  }, [sopDocuments, filteredDocuments, searchTerm]);

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white border border-slate-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                      <DocumentTextIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white">
                        SOP & Policy Management
                      </h1>
                      <p className="text-slate-300 mt-2 font-medium">
                        Upload and manage your standard operating procedures
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="primary"
                      onClick={() => setIsUploadModalOpen(true)}
                      disabled={isUploading}
                      className="shadow-lg"
                    >
                      <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Total Documents
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.totalDocuments}
                        </p>
                      </div>
                      <ListBulletIcon className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Processed
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.processedDocuments}
                        </p>
                      </div>
                      <CheckCircleIcon className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Processing
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.processingDocuments}
                        </p>
                      </div>
                      <ClockIcon className="h-8 w-8 text-amber-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Errors
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.errorDocuments}
                        </p>
                      </div>
                      <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <ErrorMessage
                    message={error}
                    onDismiss={() => setError(null)}
                  />
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
                {/* Header with Search */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-xl font-semibold text-slate-900">
                        SOP Documents
                      </h2>
                      <span className="text-sm text-slate-600">
                        {stats.hasSearchResults
                          ? `${stats.filteredCount} found`
                          : `${stats.totalDocuments} total`}
                      </span>
                    </div>
                    {sopDocuments.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="relative max-w-md flex-1">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => setIsUploadModalOpen(true)}
                          disabled={isUploading}
                          className="flex items-center gap-2"
                        >
                          <ArrowUpTrayIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Upload</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {isLoading && (
                    <div className="text-center py-12">
                      <LoadingSpinner message="Loading documents..." />
                    </div>
                  )}

                  {!isLoading && !error && sopDocuments.length === 0 && (
                    <div className="text-center py-20 px-8">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-6">
                        <DocumentTextIcon className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        No SOP documents yet
                      </h3>
                      <p className="text-slate-600 mb-8 max-w-md mx-auto">
                        Upload your first SOP document to get started with staff
                        training and automated question generation.
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        Upload First Document
                      </Button>
                    </div>
                  )}

                  {!isLoading &&
                    !error &&
                    sopDocuments.length > 0 &&
                    filteredDocuments.length === 0 &&
                    searchTerm.trim() && (
                      <div className="text-center py-16 px-8">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-6">
                          <MagnifyingGlassIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                          No documents found
                        </h3>
                        <p className="text-slate-600 mb-8">
                          Try adjusting your search criteria or upload a new
                          document
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                          <Button
                            variant="secondary"
                            onClick={() => setSearchTerm("")}
                          >
                            Clear Search
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex items-center gap-2"
                          >
                            <ArrowUpTrayIcon className="h-4 w-4" />
                            Upload Document
                          </Button>
                        </div>
                      </div>
                    )}

                  {!isLoading && !error && filteredDocuments.length > 0 && (
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
                                className={`px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-wider ${
                                  header === "Actions"
                                    ? "text-right"
                                    : "text-left"
                                }`}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {filteredDocuments.map((doc) => (
                            <tr
                              key={doc._id}
                              onClick={() =>
                                navigate(`/sop-management/${doc._id}`)
                              }
                              className="hover:bg-slate-50 cursor-pointer transition-all duration-200 group border-b border-slate-100"
                            >
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                      <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                      {doc.title}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 max-w-xs">
                                <div
                                  className="text-sm text-slate-600 truncate"
                                  title={doc.description}
                                >
                                  {doc.description || (
                                    <span className="italic text-slate-400">
                                      No description
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                    doc.status === "processed"
                                      ? "bg-green-100 text-green-800"
                                      : doc.status === "processing" ||
                                        doc.status === "pending_processing" ||
                                        doc.status === "pending_upload"
                                      ? "bg-amber-100 text-amber-800"
                                      : doc.status === "processing_error"
                                      ? "bg-red-100 text-red-800"
                                      : doc.status === "archived"
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-slate-100 text-slate-800"
                                  }`}
                                >
                                  {doc.status === "processed" && (
                                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                                  )}
                                  {(doc.status === "processing" ||
                                    doc.status === "pending_processing" ||
                                    doc.status === "pending_upload") && (
                                    <ClockIcon className="h-3 w-3 mr-1" />
                                  )}
                                  {doc.status === "processing_error" && (
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                  )}
                                  {doc.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                                <div className="flex items-center">
                                  <ClockIcon className="h-4 w-4 mr-2 text-slate-400" />
                                  {doc.uploadedAt
                                    ? format(
                                        new Date(doc.uploadedAt),
                                        "MMM d, yyyy"
                                      )
                                    : "N/A"}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/sop-management/${doc._id}`);
                                    }}
                                    className="text-blue-600 hover:text-blue-900 transition-colors duration-150 p-2 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="View Document"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSopDocument(
                                        doc._id,
                                        doc.title
                                      );
                                    }}
                                    disabled={deletingId === doc._id}
                                    className="text-red-600 hover:text-red-900 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-150 p-2 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    title="Delete Document"
                                  >
                                    {deletingId === doc._id ? (
                                      <div className="animate-spin h-4 w-4">
                                        <LoadingSpinner />
                                      </div>
                                    ) : (
                                      <TrashIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default SopManagementPage;
