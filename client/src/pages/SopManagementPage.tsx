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
import { Link } from "react-router-dom"; // For linking to detail pages later
import Navbar from "../components/Navbar"; // Added Navbar import

const SopManagementPage: React.FC = () => {
  const [sopDocuments, setSopDocuments] = useState<ISopDocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for uploading
  const [title, setTitle] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSop = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      setUploadError("Please provide both a title and a file.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const uploadData: SopDocumentUploadData = { title, sopDocument: file };

    try {
      const response = await uploadSopDocument(uploadData);
      setUploadSuccess(
        `Document "${response.title}" uploaded successfully (ID: ${response.documentId}). Status: ${response.status}. It will be processed shortly.`
      );
      setTitle("");
      setFile(null);
      // Reset file input visually (though this is tricky to do directly with controlled file inputs)
      const fileInput = document.getElementById(
        "sop-file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      fetchDocuments(); // Refresh the list
    } catch (err: any) {
      console.error("Failed to upload SOP document:", err);
      setUploadError(
        err.response?.data?.message ||
          err.message ||
          "Failed to upload document."
      );
    }
    setUploading(false);
  };

  const handleDeleteSopDocument = async (
    documentId: string,
    documentTitle: string
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the SOP document "${documentTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(documentId);
    setDeleteError(null);
    setDeleteSuccess(null);
    try {
      await deleteSopDocument(documentId);
      setDeleteSuccess(`Document "${documentTitle}" deleted successfully.`);
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
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          SOP & Policy Management
        </h1>

        {/* Upload Form Section */}
        <div className="mb-8 p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Upload New SOP Document
          </h2>
          <form onSubmit={handleUploadSop} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Document Title:
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="sop-file-input"
                className="block text-sm font-medium text-gray-700"
              >
                SOP File (PDF, DOCX, TXT, MD):
              </label>
              <input
                type="file"
                id="sop-file-input"
                onChange={handleFileChange}
                required
                accept=".pdf,.docx,.txt,.md"
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
            {uploadError && (
              <p className="text-sm text-red-600 mt-2">Error: {uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="text-sm text-green-600 mt-2">{uploadSuccess}</p>
            )}
          </form>
        </div>

        {/* SOP Documents List Section */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Uploaded SOP Documents
          </h2>
          {deleteError && (
            <p className="text-sm text-red-600 my-2">Error: {deleteError}</p>
          )}
          {deleteSuccess && (
            <p className="text-sm text-green-600 my-2">{deleteSuccess}</p>
          )}
          {isLoading && <p className="text-gray-600">Loading documents...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {!isLoading && !error && sopDocuments.length === 0 && (
            <p className="text-gray-600">No SOP documents found.</p>
          )}
          {!isLoading && !error && sopDocuments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Original File
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Uploaded At
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sopDocuments.map((doc) => (
                    <tr key={doc._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.originalFileName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.fileType.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${
                            doc.status === "processed"
                              ? "bg-green-100 text-green-800"
                              : doc.status === "error"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        `}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/sop-management/${doc._id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          View
                        </Link>
                        <button
                          onClick={() =>
                            handleDeleteSopDocument(doc._id, doc.title)
                          }
                          disabled={deletingId === doc._id}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {deletingId === doc._id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SopManagementPage;
