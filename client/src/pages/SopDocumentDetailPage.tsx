import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ISopDocument, ISopCategory } from "../types/sopTypes"; // Changed path
import {
  getSopDocumentDetails,
  updateSopDocumentTitle,
  updateSopDocumentDescription,
  addSopCategory,
  updateSopCategory,
  deleteSopCategory,
} from "../services/api"; // Adjusted path and added updateSopDocumentTitle
import Navbar from "../components/Navbar"; // Added Navbar import
import RecursiveCategoryList, {
  CategoryModalTriggers,
} from "../components/sop/RecursiveCategoryList"; // Updated import
import CategoryFormModal, {
  CategoryFormData,
} from "../components/sop/CategoryFormModal"; // Added
import { format } from "date-fns"; // Import date-fns
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
  InformationCircleIcon,
  EyeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline"; // Example icons for future edit/delete functionality

const SopDocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<ISopDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for inline title editing (example)
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // State for description editing
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  // State for category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<
    "add" | "edit" | "addSub"
  >("add");
  const [currentCategoryForModal, setCurrentCategoryForModal] =
    useState<ISopCategory | null>(null); // For 'edit' or as parent for 'addSub'
  const [parentCategoryIdForModal, setParentCategoryIdForModal] = useState<
    string | null
  >(null); // Explicit parent ID for 'addSub'

  useEffect(() => {
    if (documentId) {
      const fetchDocumentDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const responseDoc = await getSopDocumentDetails(documentId);
          setDocument(responseDoc);
          if (responseDoc) {
            setNewTitle(responseDoc.title);
            setNewDescription(responseDoc.description || "");
          }
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTitle(e.target.value);
  };

  const handleSaveTitle = async () => {
    if (
      !document ||
      newTitle.trim() === "" ||
      newTitle.trim() === document.title
    ) {
      setIsEditingTitle(false);
      if (document && newTitle.trim() === "") setNewTitle(document.title); // Reset if cleared
      return;
    }

    const originalTitle = document.title;
    // Optimistically update UI
    setDocument((prevDoc) =>
      prevDoc ? { ...prevDoc, title: newTitle.trim() } : null
    );
    setIsEditingTitle(false);

    try {
      // API call to update the title
      const updatedDoc = await updateSopDocumentTitle(
        document._id,
        newTitle.trim()
      );
      // Optionally, update local state with the full response if it contains more (e.g., updatedAt)
      setDocument(updatedDoc);
    } catch (apiError: any) {
      console.error("Failed to update title:", apiError);
      // Revert optimistic update on error
      setDocument((prevDoc) =>
        prevDoc ? { ...prevDoc, title: originalTitle } : null
      );
      setNewTitle(originalTitle); // Also reset the input field buffer
      // TODO: Show user-friendly error message (e.g., using a toast notification)
      alert(`Error updating title: ${apiError.message || "Please try again."}`);
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setNewDescription(e.target.value);
  };

  const handleSaveDescription = async () => {
    if (!document) {
      setIsEditingDescription(false);
      return;
    }
    // Allow empty description, so no check for newDescription.trim() === ""
    if (newDescription.trim() === (document.description || "").trim()) {
      setIsEditingDescription(false);
      return;
    }

    const originalDescription = document.description || "";
    setDocument((prevDoc) =>
      prevDoc ? { ...prevDoc, description: newDescription.trim() } : null
    );
    setIsEditingDescription(false);

    try {
      // Ensure you have updateSopDocumentDescription in your API service
      const updatedDoc = await updateSopDocumentDescription(
        document._id,
        newDescription.trim()
      );
      setDocument(updatedDoc);
    } catch (apiError: any) {
      console.error("Failed to update description:", apiError);
      setDocument((prevDoc) =>
        prevDoc ? { ...prevDoc, description: originalDescription } : null
      );
      setNewDescription(originalDescription);
      alert(
        `Error updating description: ${apiError.message || "Please try again."}`
      );
    }
  };

  // --- Modal Management Functions ---
  const openCategoryModal = (
    mode: "add" | "edit" | "addSub",
    category?: ISopCategory | null, // Current category for 'edit', parent for 'addSub'
    parentId?: string | null // Explicit parent ID for 'addSub' or top-level 'add'
  ) => {
    setCategoryModalMode(mode);
    setCurrentCategoryForModal(category || null);
    // Ensure parentId is explicitly null if undefined, for setParentCategoryIdForModal
    setParentCategoryIdForModal(
      mode === "addSub"
        ? parentId || null
        : mode === "add"
        ? parentId || null
        : null
    );
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCurrentCategoryForModal(null);
    setParentCategoryIdForModal(null);
    // Consider resetting form fields if CategoryFormModal doesn't do it internally on close/reopen
  };

  // --- Category Action Handlers ---
  const handleCategoryFormSubmit = async (formData: CategoryFormData) => {
    if (!document) return;

    try {
      let updatedDoc;
      if (categoryModalMode === "edit" && currentCategoryForModal?._id) {
        console.log(
          "Submitting edit for category:",
          currentCategoryForModal._id,
          formData
        );
        updatedDoc = await updateSopCategory(
          document._id,
          currentCategoryForModal._id,
          formData
        );
      } else if (
        categoryModalMode === "add" ||
        categoryModalMode === "addSub"
      ) {
        const parentIdToUse =
          categoryModalMode === "addSub"
            ? currentCategoryForModal?._id
            : parentCategoryIdForModal;
        console.log(
          "Submitting add/addSub category: ",
          formData,
          "to parent:",
          parentIdToUse
        );
        updatedDoc = await addSopCategory(document._id, {
          ...formData,
          parentCategoryId: parentIdToUse,
        });
      } else {
        throw new Error("Invalid modal mode");
      }
      setDocument(updatedDoc);
      closeCategoryModal();
      // TODO: Show success notification
    } catch (apiError: any) {
      console.error(`Failed to ${categoryModalMode} category:`, apiError);
      // Error will be displayed within the modal by CategoryFormModal
      // but re-throw if you want to handle it here as well (e.g., for global notifications)
      throw apiError; // Re-throw to let CategoryFormModal handle its own error display
    }
  };

  // Old handlers now trigger the modal
  const handleAddTopLevelCategory = () => {
    openCategoryModal("add", null, null); // null parentId for top-level
  };

  // These will be passed to RecursiveCategoryList
  const handleTriggerAddSubCategory = (parentCategory: ISopCategory) => {
    if (!parentCategory._id) {
      console.error("Parent category has no ID, cannot add subcategory");
      alert("Error: Cannot add subcategory to an unsaved parent.");
      return;
    }
    openCategoryModal("addSub", parentCategory, parentCategory._id);
  };

  const handleTriggerEditCategory = (categoryToEdit: ISopCategory) => {
    openCategoryModal("edit", categoryToEdit);
  };

  const handleDeleteCategory = async (categoryToDelete: ISopCategory) => {
    if (!document || !categoryToDelete._id) return;
    const categoryId = categoryToDelete._id;

    if (
      window.confirm(
        `Are you sure you want to delete category "${categoryToDelete.name}" and all its subcategories?`
      )
    ) {
      if (isCategoryModalOpen && currentCategoryForModal?._id === categoryId) {
        closeCategoryModal();
      }
      console.log("Attempting to delete category:", categoryId);
      try {
        const updatedDoc = await deleteSopCategory(document._id, categoryId);
        setDocument(updatedDoc);
      } catch (apiError: any) {
        console.error("Failed to delete category:", apiError);
        alert(
          `Error deleting category: ${apiError.message || "Please try again."}`
        );
      }
    }
  };

  const categoryModalTriggers: CategoryModalTriggers = {
    onTriggerAddSubCategory: handleTriggerAddSubCategory,
    onTriggerEditCategory: handleTriggerEditCategory,
    onTriggerDeleteCategory: handleDeleteCategory,
  };

  if (!documentId) {
    // Should ideally be caught by router, but good to have
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-slate-700 mb-6">Document ID is missing.</p>
          <Link
            to="/sop-management"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to SOP Management
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        {/* Replace with a proper loading spinner component if available */}
        <p className="text-slate-700 text-lg">Loading document details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            Error Loading Document
          </h2>
          <p className="text-slate-700 mb-6">{error}</p>
          <Link
            to="/sop-management"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to SOP Management
          </Link>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">
            Document Not Found
          </h2>
          <p className="text-slate-600 mb-6">
            The requested document could not be found.
          </p>
          <Link
            to="/sop-management"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to SOP Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-5 flex items-center justify-between">
            <Link
              to="/sop-management"
              className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-150 ease-in-out group"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2 text-indigo-500 group-hover:text-indigo-700" />
              Back to SOP Management
            </Link>
            {/* Placeholder for future actions like a global edit/delete button for the doc */}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Document Header Section */}
          <div className="p-6 md:p-8 border-b border-slate-200">
            <div className="flex items-start justify-between mb-3">
              {isEditingTitle ? (
                <div className="flex-grow mr-4">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={handleTitleChange}
                    onBlur={handleSaveTitle} // Save on blur
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()} // Save on Enter
                    autoFocus
                    className="text-3xl font-bold text-slate-800 w-full border-b-2 border-indigo-500 focus:outline-none py-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Press Enter to save or click away.
                  </p>
                </div>
              ) : (
                <h1 className="text-3xl font-bold text-slate-800 flex-grow break-words mr-2">
                  {document.title}
                </h1>
              )}
              <button
                onClick={() => {
                  if (isEditingTitle) {
                    handleSaveTitle();
                  } else {
                    setNewTitle(document.title);
                    setIsEditingTitle(true);
                  }
                }}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors duration-150 ease-in-out ml-2 flex-shrink-0"
                title={isEditingTitle ? "Save Title" : "Edit Title"}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Display Description */}
            <div className="mb-4">
              {isEditingDescription ? (
                <div className="mt-2">
                  <textarea
                    value={newDescription}
                    onChange={handleDescriptionChange}
                    onBlur={handleSaveDescription}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      handleSaveDescription()
                    } // Save on Enter (not Shift+Enter)
                    autoFocus
                    rows={4}
                    className="text-md text-slate-700 w-full border-2 border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm p-2 resize-y"
                    placeholder="Enter document description..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Press Enter (without Shift) to save or click away.
                  </p>
                </div>
              ) : (
                <div className="flex items-start justify-between group">
                  <p className="text-md text-slate-600 whitespace-pre-wrap flex-grow">
                    {document.description || (
                      <span className="italic text-slate-400">
                        No description provided. Click the pencil to add one.
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      setNewDescription(document.description || "");
                      setIsEditingDescription(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors duration-150 ease-in-out ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                    title="Edit Description"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Document Details Grid */}
          <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 border-b border-slate-200">
            {[
              {
                label: "Status",
                value:
                  document.status.charAt(0).toUpperCase() +
                  document.status.slice(1),
                colorClass:
                  document.status === "processed"
                    ? "text-green-600"
                    : document.status === "processing_error"
                    ? "text-red-600"
                    : "text-yellow-600",
              },
              {
                label: "File Type",
                value: (document.fileType || "N/A").toUpperCase(),
              },
              {
                label: "Uploaded At",
                value: document.uploadedAt
                  ? format(new Date(document.uploadedAt), "MMM yyyy")
                  : "N/A",
              },
              {
                label: "Last Updated",
                value: document.updatedAt
                  ? format(new Date(document.updatedAt), "dd MMM yyyy, p")
                  : "N/A",
              },
            ].map((detail) => (
              <div
                key={detail.label}
                className="bg-slate-50 p-4 rounded-lg shadow-sm border border-slate-200"
              >
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {detail.label}
                </h3>
                <p
                  className={`text-md font-medium ${
                    detail.colorClass || "text-slate-800"
                  }`}
                >
                  {detail.value}
                </p>
              </div>
            ))}
          </div>

          {document.errorMessage && document.status === "processing_error" && (
            <div className="m-6 md:m-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-1">Processing Error:</h3>
              <p className="text-sm">{document.errorMessage}</p>
            </div>
          )}

          {/* Categories Section */}
          <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-slate-700">
                Document Content & Categories
              </h2>
              <div className="flex items-center space-x-3">
                {" "}
                {/* Container for buttons */}
                <button
                  onClick={handleAddTopLevelCategory}
                  className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-1.5" />
                  Add Category
                </button>
              </div>
            </div>

            {document.categories && document.categories.length > 0 ? (
              <RecursiveCategoryList
                categories={document.categories}
                {...categoryModalTriggers}
              />
            ) : (
              <div className="text-center py-10 px-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">
                  No categories found.
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  This document may not have been processed yet, or it has no
                  structured content.
                </p>
                {(document.status === "pending_upload" ||
                  document.status === "pending_processing" ||
                  document.status === "processing") && (
                  <p className="mt-2 text-sm text-blue-600">
                    Processing is currently in progress.
                  </p>
                )}
              </div>
            )}
          </div>

          {(document.status === "pending_upload" ||
            document.status === "pending_processing" ||
            document.status === "processing") &&
            document.categories.length === 0 && (
              <div className="p-6 md:p-8 mt-0 border-t border-slate-200">
                <div className="p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-3 text-blue-500"
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
                  <span>
                    This document is currently being processed. Categories will
                    appear once complete.
                  </span>
                </div>
              </div>
            )}
        </div>
      </main>
      {/* Modal Render */}
      {isCategoryModalOpen && (
        <CategoryFormModal
          isOpen={isCategoryModalOpen}
          onClose={closeCategoryModal}
          onSubmit={handleCategoryFormSubmit}
          initialData={currentCategoryForModal}
          mode={categoryModalMode}
          parentCategoryName={
            categoryModalMode === "addSub"
              ? currentCategoryForModal?.name
              : undefined
          }
        />
      )}
    </div>
  );
};

export default SopDocumentDetailPage;
