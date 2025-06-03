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
import Navbar from "../components/Navbar";
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
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline"; // Example icons for future edit/delete functionality
import ErrorMessage from "../components/common/ErrorMessage";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SuccessNotification from "../components/common/SuccessNotification";
import AiQuestionReviewModal from "../components/questionBank/AiQuestionReviewModal";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

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

  // State for content search and display
  const [contentSearchTerm, setContentSearchTerm] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandedSubCategories, setExpandedSubCategories] = useState<
    Record<string, boolean>
  >({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
                      <div className="flex items-center space-x-3 mb-2">
                        <button
                          onClick={() => navigate("/sop-management")}
                          className="flex items-center text-slate-300 hover:text-white transition-colors duration-200 text-sm"
                        >
                          <ArrowLeftIcon className="h-4 w-4 mr-1" />
                          Back to SOP Management
                        </button>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 text-sm">
                          Document Details
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-white">
                        {document.title}
                      </h1>
                      {document.description && (
                        <p className="text-slate-300 mt-2 font-medium">
                          {document.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        if (isEditingTitle) {
                          handleSaveTitle();
                        } else {
                          setNewTitle(document.title);
                          setIsEditingTitle(true);
                        }
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 shadow-lg px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                      title={isEditingTitle ? "Save Title" : "Edit Title"}
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit Details
                    </button>
                  </div>
                </div>

                {/* Status and Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Status
                        </p>
                        <p className="text-lg font-bold text-white capitalize">
                          {document.status.replace("_", " ")}
                        </p>
                      </div>
                      {document.status === "processed" ? (
                        <CheckCircleIcon className="h-8 w-8 text-green-400" />
                      ) : document.status === "processing_error" ? (
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                      ) : document.status === "archived" ? (
                        <ArchiveBoxIcon className="h-8 w-8 text-gray-400" />
                      ) : (
                        <ClockIcon className="h-8 w-8 text-amber-400" />
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Categories
                        </p>
                        <p className="text-lg font-bold text-white">
                          {document.categories?.length || 0}
                        </p>
                      </div>
                      <ListBulletIcon className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          File Type
                        </p>
                        <p className="text-lg font-bold text-white">
                          {(document.fileType || "PDF").toUpperCase()}
                        </p>
                      </div>
                      <DocumentTextIcon className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Uploaded
                        </p>
                        <p className="text-lg font-bold text-white">
                          {document.uploadedAt
                            ? format(new Date(document.uploadedAt), "MMM yyyy")
                            : "N/A"}
                        </p>
                      </div>
                      <ClockIcon className="h-8 w-8 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
                {/* Edit Forms Section */}
                <div className="p-6 md:p-8 border-b border-slate-200">
                  {isEditingTitle && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Document Title
                      </label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={handleTitleChange}
                        onBlur={handleSaveTitle}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveTitle()
                        }
                        autoFocus
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                        placeholder="Enter document title..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Press Enter to save or click away
                      </p>
                    </div>
                  )}

                  {isEditingDescription && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Document Description
                      </label>
                      <textarea
                        value={newDescription}
                        onChange={handleDescriptionChange}
                        onBlur={handleSaveDescription}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          handleSaveDescription()
                        }
                        autoFocus
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Enter document description..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Press Enter (without Shift) to save or click away
                      </p>
                    </div>
                  )}

                  {!isEditingTitle && !isEditingDescription && (
                    <div className="text-center py-4">
                      <p className="text-slate-600 mb-4">
                        Use the "Edit Details" button in the header to modify
                        the document title and description.
                      </p>
                    </div>
                  )}
                </div>

                {document.errorMessage &&
                  document.status === "processing_error" && (
                    <div className="m-6 md:m-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1">
                        Processing Error:
                      </h3>
                      <p className="text-sm">{document.errorMessage}</p>
                    </div>
                  )}

                {/* Enhanced Content Display Section */}
                <div className="p-6 md:p-8">
                  {/* Header with Search and Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BookOpenIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          Document Content
                        </h2>
                        <p className="text-slate-600 mt-1">
                          {document.categories?.length || 0} categories found •
                          Extracted and organized content
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {document.categories &&
                        document.categories.length > 0 && (
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search content..."
                              value={contentSearchTerm}
                              onChange={(e) =>
                                setContentSearchTerm(e.target.value)
                              }
                              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                            />
                          </div>
                        )}
                      <button
                        onClick={handleAddTopLevelCategory}
                        className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Category
                      </button>
                    </div>
                  </div>

                  {document.categories && document.categories.length > 0 ? (
                    <div className="space-y-6">
                      {/* Content Overview */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <DocumentMagnifyingGlassIcon className="h-8 w-8 text-blue-600" />
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">
                                Content Structure
                              </h3>
                              <p className="text-slate-600">
                                AI-extracted and categorized content from your
                                document
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-2xl font-bold text-blue-600">
                                {document.categories.length}
                              </div>
                              <div className="text-xs text-slate-600">
                                Categories
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-2xl font-bold text-green-600">
                                {document.categories.reduce((total, cat) => {
                                  const countSubcategories = (
                                    category: any
                                  ): number => {
                                    return (
                                      1 +
                                      (category.subcategories || []).reduce(
                                        (sum: number, sub: any) =>
                                          sum + countSubcategories(sub),
                                        0
                                      )
                                    );
                                  };
                                  return total + countSubcategories(cat);
                                }, 0)}
                              </div>
                              <div className="text-xs text-slate-600">
                                Total Items
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Category Display */}
                      <div className="space-y-4">
                        {document.categories.map((category, index) => (
                          <div
                            key={category._id || index}
                            className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
                          >
                            {/* Category Header */}
                            <div
                              className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 cursor-pointer hover:from-slate-100 hover:to-slate-200 transition-all duration-200"
                              onClick={() => {
                                const categoryKey =
                                  category._id || `category-${index}`;
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [categoryKey]: !prev[categoryKey],
                                }));
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    {expandedCategories[
                                      category._id || `category-${index}`
                                    ] ? (
                                      <ChevronDownIcon className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <ChevronRightIcon className="h-5 w-5 text-blue-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-slate-900">
                                      {category.name}
                                    </h3>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                                    {(category.subCategories || []).length + 1}{" "}
                                    items
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerEditCategory(category);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCategory(category);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Category Content */}
                            {expandedCategories[
                              category._id || `category-${index}`
                            ] && (
                              <div className="p-6 bg-white">
                                {/* Main Content */}
                                {category.content && (
                                  <div className="mb-6">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <DocumentTextIcon className="h-5 w-5 text-slate-500" />
                                      <h4 className="font-medium text-slate-900">
                                        Content
                                      </h4>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                      <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                                        {category.content.split("\n").map(
                                          (paragraph: string, pIndex: number) =>
                                            paragraph.trim() && (
                                              <p
                                                key={pIndex}
                                                className="mb-3 last:mb-0"
                                              >
                                                {contentSearchTerm &&
                                                paragraph
                                                  .toLowerCase()
                                                  .includes(
                                                    contentSearchTerm.toLowerCase()
                                                  ) ? (
                                                  <span
                                                    dangerouslySetInnerHTML={{
                                                      __html: paragraph.replace(
                                                        new RegExp(
                                                          `(${contentSearchTerm})`,
                                                          "gi"
                                                        ),
                                                        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                                      ),
                                                    }}
                                                  />
                                                ) : (
                                                  paragraph
                                                )}
                                              </p>
                                            )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Subcategories */}
                                {category.subCategories &&
                                  category.subCategories.length > 0 && (
                                    <div>
                                      <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                          <ListBulletIcon className="h-5 w-5 text-slate-500" />
                                          <h4 className="font-medium text-slate-900">
                                            Subcategories (
                                            {category.subCategories?.length ||
                                              0}
                                            )
                                          </h4>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <button
                                            onClick={() => {
                                              const allSubcatKeys =
                                                category.subCategories?.map(
                                                  (subcat, subIndex) =>
                                                    subcat._id ||
                                                    `subcat-${category._id}-${subIndex}`
                                                ) || [];
                                              const allExpanded =
                                                allSubcatKeys.every(
                                                  (key) =>
                                                    expandedSubCategories[key]
                                                );
                                              const newState: Record<
                                                string,
                                                boolean
                                              > = {};
                                              allSubcatKeys.forEach((key) => {
                                                newState[key] = !allExpanded;
                                              });
                                              setExpandedSubCategories(
                                                (prev) => ({
                                                  ...prev,
                                                  ...newState,
                                                })
                                              );
                                            }}
                                            className="text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                          >
                                            {category.subCategories?.every(
                                              (subcat, subIndex) =>
                                                expandedSubCategories[
                                                  subcat._id ||
                                                    `subcat-${category._id}-${subIndex}`
                                                ]
                                            )
                                              ? "Collapse All"
                                              : "Expand All"}
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleTriggerAddSubCategory(
                                                category
                                              )
                                            }
                                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                          >
                                            <PlusIcon className="h-4 w-4" />
                                            <span>Add Subcategory</span>
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        {category.subCategories.map(
                                          (
                                            subcat: ISopCategory,
                                            subIndex: number
                                          ) => {
                                            const subcatKey =
                                              subcat._id ||
                                              `subcat-${category._id}-${subIndex}`;
                                            const isSubcatExpanded =
                                              expandedSubCategories[subcatKey];

                                            return (
                                              <div
                                                key={subcat._id || subIndex}
                                                className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm"
                                              >
                                                {/* Subcategory Header */}
                                                <div
                                                  className="p-3 bg-gradient-to-r from-slate-25 to-slate-50 border-b border-slate-150 cursor-pointer hover:from-slate-50 hover:to-slate-100 transition-all duration-200"
                                                  onClick={() => {
                                                    setExpandedSubCategories(
                                                      (prev) => ({
                                                        ...prev,
                                                        [subcatKey]:
                                                          !prev[subcatKey],
                                                      })
                                                    );
                                                  }}
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                      <div className="p-1 bg-slate-200 rounded">
                                                        {isSubcatExpanded ? (
                                                          <ChevronDownIcon className="h-3 w-3 text-slate-600" />
                                                        ) : (
                                                          <ChevronRightIcon className="h-3 w-3 text-slate-600" />
                                                        )}
                                                      </div>
                                                      <h5 className="font-medium text-slate-800 text-sm">
                                                        {subcat.name}
                                                      </h5>
                                                      {subcat.content && (
                                                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                                          {
                                                            subcat.content
                                                              .split("\n")
                                                              .filter((p) =>
                                                                p.trim()
                                                              ).length
                                                          }{" "}
                                                          paragraphs
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleTriggerEditCategory(
                                                            subcat
                                                          );
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Edit subcategory"
                                                      >
                                                        <PencilIcon className="h-3 w-3" />
                                                      </button>
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleDeleteCategory(
                                                            subcat
                                                          );
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete subcategory"
                                                      >
                                                        <TrashIcon className="h-3 w-3" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Subcategory Content */}
                                                {isSubcatExpanded &&
                                                  subcat.content && (
                                                    <div className="p-4 bg-white">
                                                      <div className="text-sm text-slate-700 leading-relaxed">
                                                        {subcat.content
                                                          .split("\n")
                                                          .map(
                                                            (
                                                              paragraph: string,
                                                              pIndex: number
                                                            ) =>
                                                              paragraph.trim() && (
                                                                <p
                                                                  key={pIndex}
                                                                  className="mb-3 last:mb-0"
                                                                >
                                                                  {contentSearchTerm &&
                                                                  paragraph
                                                                    .toLowerCase()
                                                                    .includes(
                                                                      contentSearchTerm.toLowerCase()
                                                                    ) ? (
                                                                    <span
                                                                      dangerouslySetInnerHTML={{
                                                                        __html:
                                                                          paragraph.replace(
                                                                            new RegExp(
                                                                              `(${contentSearchTerm})`,
                                                                              "gi"
                                                                            ),
                                                                            '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                                                          ),
                                                                      }}
                                                                    />
                                                                  ) : (
                                                                    paragraph
                                                                  )}
                                                                </p>
                                                              )
                                                          )}
                                                      </div>
                                                    </div>
                                                  )}

                                                {/* Empty content state */}
                                                {isSubcatExpanded &&
                                                  !subcat.content && (
                                                    <div className="p-4 bg-slate-25 text-center">
                                                      <p className="text-sm text-slate-500 italic">
                                                        No content available for
                                                        this subcategory
                                                      </p>
                                                    </div>
                                                  )}
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Action Buttons */}
                                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center space-x-3">
                                  <button
                                    onClick={() =>
                                      handleTriggerAddSubCategory(category)
                                    }
                                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md transition-colors"
                                  >
                                    <PlusIcon className="h-4 w-4 mr-1" />
                                    Add Subcategory
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleTriggerEditCategory(category)
                                    }
                                    className="flex items-center text-sm text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-md transition-colors"
                                  >
                                    <PencilIcon className="h-4 w-4 mr-1" />
                                    Edit Category
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 px-8">
                      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-slate-100 mb-6">
                        <BookOpenIcon className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        No content extracted yet
                      </h3>
                      <p className="text-slate-600 mb-8 max-w-md mx-auto">
                        {document.status === "processed"
                          ? "This document has been processed but no structured content was found. You can manually add categories to organize the content."
                          : "This document is being processed. Once complete, the extracted content and categories will appear here."}
                      </p>
                      {(document.status === "pending_upload" ||
                        document.status === "pending_processing" ||
                        document.status === "processing") && (
                        <div className="flex items-center justify-center space-x-2 text-blue-600 mb-6">
                          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <span className="text-sm font-medium">
                            Processing in progress...
                          </span>
                        </div>
                      )}
                      <button
                        onClick={handleAddTopLevelCategory}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add First Category
                      </button>
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
                          This document is currently being processed. Categories
                          will appear once complete.
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
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
