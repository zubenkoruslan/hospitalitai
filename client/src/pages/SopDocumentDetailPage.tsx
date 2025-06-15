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
  XMarkIcon,
  FolderIcon,
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
  const [searchResults, setSearchResults] = useState<{
    categories: string[];
    subcategories: string[];
  }>({ categories: [], subcategories: [] });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Navigation state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<
    string | null
  >(null);

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

  // Navigation helper functions
  const handleCategorySelect = (categoryId: string, subCategoryId?: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubCategoryId(subCategoryId || null);
  };

  const toggleCategoryExpansion = (categoryKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  // Enhanced search functionality
  const performSearch = (searchTerm: string) => {
    if (!document?.categories || !searchTerm.trim()) {
      setSearchResults({ categories: [], subcategories: [] });
      return;
    }

    const term = searchTerm.toLowerCase();
    const matchingCategories: string[] = [];
    const matchingSubcategories: string[] = [];

    document.categories.forEach((category, index) => {
      const categoryKey = category._id || `category-${index}`;

      // Check category name and content
      const categoryMatches =
        category.name.toLowerCase().includes(term) ||
        (category.content && category.content.toLowerCase().includes(term));

      if (categoryMatches) {
        matchingCategories.push(categoryKey);
      }

      // Check subcategories
      category.subCategories?.forEach((subcat, subIndex) => {
        const subcatKey = subcat._id || `subcat-${category._id}-${subIndex}`;
        const subcatMatches =
          subcat.name.toLowerCase().includes(term) ||
          (subcat.content && subcat.content.toLowerCase().includes(term));

        if (subcatMatches) {
          matchingSubcategories.push(subcatKey);
          // Also expand parent category if subcategory matches
          if (!matchingCategories.includes(categoryKey)) {
            setExpandedCategories((prev) => ({ ...prev, [categoryKey]: true }));
          }
        }
      });
    });

    setSearchResults({
      categories: matchingCategories,
      subcategories: matchingSubcategories,
    });
  };

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setContentSearchTerm(value);
    performSearch(value);
  };

  // Clear search
  const clearSearch = () => {
    setContentSearchTerm("");
    setSearchResults({ categories: [], subcategories: [] });
  };

  // Check if item matches search
  const isSearchMatch = (type: "category" | "subcategory", key: string) => {
    if (!contentSearchTerm.trim()) return false;
    return type === "category"
      ? searchResults.categories.includes(key)
      : searchResults.subcategories.includes(key);
  };

  // Get selected category and subcategory data
  const getSelectedContent = () => {
    if (!document?.categories || !selectedCategoryId) return null;

    const category = document.categories.find(
      (cat, index) => (cat._id || `category-${index}`) === selectedCategoryId
    );

    if (!category) return null;

    if (selectedSubCategoryId) {
      const subCategory = category.subCategories?.find(
        (subcat, subIndex) =>
          (subcat._id || `subcat-${category._id}-${subIndex}`) ===
          selectedSubCategoryId
      );
      return { type: "subcategory", category, subCategory };
    }

    return { type: "category", category };
  };

  // Content Display Component
  const ContentDisplay = ({
    content,
    searchTerm,
    onEdit,
    onDelete,
    onAddSubCategory,
  }: {
    content: {
      type: "category" | "subcategory";
      category: any;
      subCategory?: any;
    };
    searchTerm: string;
    onEdit: (category: any, subCategory?: any) => void;
    onDelete: (category: any, subCategory?: any) => void;
    onAddSubCategory: (category: any) => void;
  }) => {
    const { type, category, subCategory } = content;
    const isSubCategory = type === "subcategory" && subCategory;
    const displayItem = isSubCategory ? subCategory : category;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div
                  className={`p-2 rounded-xl shadow-md ${
                    isSubCategory
                      ? "bg-gradient-to-br from-accent to-accent-600"
                      : "bg-gradient-to-br from-primary to-primary-600"
                  }`}
                >
                  {isSubCategory ? (
                    <DocumentTextIcon className="h-5 w-5 text-white" />
                  ) : (
                    <FolderIcon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-medium text-dark-slate">
                    {displayItem.name}
                  </h2>
                  {isSubCategory && (
                    <p className="text-sm text-muted-gray">
                      in {category.name}
                    </p>
                  )}
                </div>
              </div>
              {displayItem.description && (
                <p className="text-muted-gray font-light leading-relaxed">
                  {displayItem.description}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() =>
                  onEdit(category, isSubCategory ? subCategory : undefined)
                }
                className="flex items-center text-sm font-medium text-secondary hover:text-secondary-700 bg-secondary-50 hover:bg-secondary-100 px-3 py-2 rounded-2xl transition-all duration-200 border border-secondary-200 shadow-sm hover:shadow-md"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>

              {!isSubCategory && (
                <button
                  onClick={() => onAddSubCategory(category)}
                  className="flex items-center text-sm font-medium text-accent hover:text-accent-700 bg-accent-50 hover:bg-accent-100 px-3 py-2 rounded-2xl transition-all duration-200 border border-accent-200 shadow-sm hover:shadow-md"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Subcategory
                </button>
              )}

              <button
                onClick={() =>
                  onDelete(category, isSubCategory ? subCategory : undefined)
                }
                className="flex items-center text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-2xl transition-all duration-200 border border-red-200 shadow-sm hover:shadow-md"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {displayItem.content ? (
            <div className="prose prose-slate max-w-none">
              <div
                className="text-dark-slate leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: searchTerm
                    ? displayItem.content.replace(
                        new RegExp(`(${searchTerm})`, "gi"),
                        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                      )
                    : displayItem.content,
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-4">
                <DocumentTextIcon className="h-6 w-6 text-muted-gray" />
              </div>
              <h3 className="text-lg font-medium text-dark-slate mb-2">
                No content yet
              </h3>
              <p className="text-muted-gray mb-4">
                This {isSubCategory ? "subcategory" : "category"} doesn't have
                any content yet.
              </p>
              <button
                onClick={() =>
                  onEdit(category, isSubCategory ? subCategory : undefined)
                }
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary to-primary-600 text-white text-sm font-medium rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Add Content
              </button>
            </div>
          )}
        </div>

        {/* Subcategories for category view */}
        {!isSubCategory &&
          category.subCategories &&
          category.subCategories.length > 0 && (
            <div className="border-t border-slate-200 p-6">
              <h3 className="text-lg font-medium text-dark-slate mb-4">
                Subcategories
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {category.subCategories.map((subcat: any, subIndex: number) => {
                  const subcatKey =
                    subcat._id || `subcat-${category._id}-${subIndex}`;
                  return (
                    <button
                      key={subcatKey}
                      onClick={() =>
                        handleCategorySelect(selectedCategoryId!, subcatKey)
                      }
                      className="text-left p-4 rounded-xl border border-slate-200 hover:border-accent-200 hover:bg-accent-50 transition-all duration-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-accent-100 rounded-lg">
                          <DocumentTextIcon className="h-4 w-4 text-accent-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-dark-slate text-sm">
                            {subcat.name}
                          </h4>
                          {subcat.description && (
                            <p className="text-xs text-muted-gray mt-1 line-clamp-2">
                              {subcat.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    );
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Header Section - Matching HomePage style */}
              <div className="relative overflow-hidden bg-gradient-to-br from-white via-primary-50 to-accent-50 rounded-3xl p-8 sm:p-12 border border-primary/20 shadow-xl backdrop-blur-sm">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl"></div>

                <div className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                    <div className="flex-1">
                      {/* Breadcrumb */}
                      <div className="flex items-center space-x-3 mb-6">
                        <button
                          onClick={() => navigate("/sop-management")}
                          className="flex items-center text-muted-gray hover:text-dark-slate transition-colors duration-200 text-sm font-medium"
                        >
                          <ArrowLeftIcon className="h-4 w-4 mr-2" />
                          SOP Management
                        </button>
                        <span className="text-slate-400">•</span>
                        <span className="text-muted-gray text-sm">
                          Document Details
                        </span>
                      </div>

                      {/* Title and Description */}
                      <div className="mb-8">
                        <h1 className="text-4xl sm:text-5xl font-light text-dark-slate mb-4 tracking-tight leading-tight">
                          {document.title}
                        </h1>
                        {document.description && (
                          <p className="text-xl text-muted-gray font-light leading-relaxed max-w-3xl">
                            {document.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => {
                          if (isEditingTitle || isEditingDescription) {
                            handleSaveTitle();
                            handleSaveDescription();
                          } else {
                            setNewTitle(document.title);
                            setNewDescription(document.description || "");
                            setIsEditingTitle(true);
                          }
                        }}
                        className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center gap-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status and Statistics Cards - Matching HomePage style */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-gray text-sm font-medium">
                          Status
                        </p>
                        <p className="text-lg font-bold text-dark-slate capitalize">
                          {document.status.replace("_", " ")}
                        </p>
                      </div>
                      {document.status === "processed" ? (
                        <CheckCircleIcon className="h-8 w-8 text-primary" />
                      ) : document.status === "processing_error" ? (
                        <ExclamationTriangleIcon className="h-8 w-8 text-secondary" />
                      ) : document.status === "archived" ? (
                        <ArchiveBoxIcon className="h-8 w-8 text-muted-gray" />
                      ) : (
                        <ClockIcon className="h-8 w-8 text-accent" />
                      )}
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-gray text-sm font-medium">
                          Categories
                        </p>
                        <p className="text-lg font-bold text-dark-slate">
                          {document.categories?.length || 0}
                        </p>
                      </div>
                      <ListBulletIcon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-gray text-sm font-medium">
                          File Type
                        </p>
                        <p className="text-lg font-bold text-dark-slate">
                          {(document.fileType || "PDF").toUpperCase()}
                        </p>
                      </div>
                      <DocumentTextIcon className="h-8 w-8 text-accent" />
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-gray text-sm font-medium">
                          Uploaded
                        </p>
                        <p className="text-lg font-bold text-dark-slate">
                          {document.uploadedAt
                            ? format(new Date(document.uploadedAt), "MMM yyyy")
                            : "N/A"}
                        </p>
                      </div>
                      <ClockIcon className="h-8 w-8 text-secondary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content - Matching HomePage style */}
              <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-slate-200">
                {/* Edit Forms Section */}
                {(isEditingTitle || isEditingDescription) && (
                  <div className="p-6 md:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    {isEditingTitle && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-dark-slate mb-3">
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
                          className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary text-lg font-medium transition-all duration-200"
                          placeholder="Enter document title..."
                        />
                        <p className="text-xs text-muted-gray mt-2">
                          Press Enter to save or click away
                        </p>
                      </div>
                    )}

                    {isEditingDescription && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-dark-slate mb-3">
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
                          className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all duration-200"
                          placeholder="Enter document description..."
                        />
                        <p className="text-xs text-muted-gray mt-2">
                          Press Enter (without Shift) to save or click away
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {document.errorMessage &&
                  document.status === "processing_error" && (
                    <div className="m-6 md:m-8 p-6 bg-gradient-to-r from-secondary-50 to-secondary-100 border border-secondary-200 rounded-2xl">
                      <div className="flex items-start space-x-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-secondary flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-lg font-semibold text-secondary mb-2">
                            Processing Error
                          </h3>
                          <p className="text-secondary-700">
                            {document.errorMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Enhanced Content Display Section - Matching HomePage style */}
                <div className="p-6 md:p-8">
                  {/* Header with Search and Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-primary to-primary-600 rounded-2xl shadow-lg">
                        <BookOpenIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-light text-dark-slate tracking-tight">
                          Document Content
                        </h2>
                        <p className="text-muted-gray mt-1 font-light">
                          {document.categories?.length || 0} categories found •
                          AI-extracted and organized content
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {document.categories &&
                        document.categories.length > 0 && (
                          <>
                            {/* Enhanced Search */}
                            <div className="relative">
                              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-gray" />
                              <input
                                type="text"
                                placeholder="Search categories and content..."
                                value={contentSearchTerm}
                                onChange={(e) =>
                                  handleSearchChange(e.target.value)
                                }
                                className="pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary w-80 transition-all duration-200"
                              />
                              {contentSearchTerm && (
                                <button
                                  onClick={clearSearch}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-gray hover:text-dark-slate transition-colors"
                                  title="Clear search"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            {contentSearchTerm && (
                              <div className="text-xs text-muted-gray bg-slate-50 px-3 py-1 rounded-lg border">
                                {searchResults.categories.length +
                                  searchResults.subcategories.length}{" "}
                                matches found
                              </div>
                            )}
                          </>
                        )}

                      <button
                        onClick={handleAddTopLevelCategory}
                        className="flex items-center text-sm font-medium text-primary hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-2xl transition-all duration-200 border border-primary-200 shadow-sm hover:shadow-md"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Category
                      </button>
                    </div>
                  </div>

                  {document.categories && document.categories.length > 0 ? (
                    <div className="grid lg:grid-cols-3 gap-8">
                      {/* Table of Contents - Always Visible */}
                      <div className="lg:col-span-1">
                        <div className="bg-gradient-to-r from-slate-50 to-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-8">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-gradient-to-br from-accent to-accent-600 rounded-xl shadow-md">
                              <ListBulletIcon className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-medium text-dark-slate">
                              Table of Contents
                            </h3>
                          </div>

                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {document.categories.map((category, index) => {
                              const categoryKey =
                                category._id || `category-${index}`;
                              const isSelected =
                                selectedCategoryId === categoryKey &&
                                !selectedSubCategoryId;
                              const isExpanded =
                                expandedCategories[categoryKey];
                              const hasSubcategories =
                                category.subCategories &&
                                category.subCategories.length > 0;
                              const isSearchHighlighted = isSearchMatch(
                                "category",
                                categoryKey
                              );

                              // Filter subcategories based on search if there's a search term
                              const visibleSubcategories =
                                contentSearchTerm.trim()
                                  ? category.subCategories?.filter(
                                      (subcat, subIndex) => {
                                        const subcatKey =
                                          subcat._id ||
                                          `subcat-${category._id}-${subIndex}`;
                                        return isSearchMatch(
                                          "subcategory",
                                          subcatKey
                                        );
                                      }
                                    )
                                  : category.subCategories;

                              // Show category if it matches search or has matching subcategories
                              const shouldShowCategory =
                                !contentSearchTerm.trim() ||
                                isSearchHighlighted ||
                                (visibleSubcategories &&
                                  visibleSubcategories.length > 0);

                              if (!shouldShowCategory) return null;

                              return (
                                <div key={categoryKey} className="space-y-1">
                                  <div
                                    className={`rounded-xl border transition-all duration-200 ${
                                      isSearchHighlighted
                                        ? "bg-yellow-50 border-yellow-200 shadow-sm"
                                        : isSelected
                                        ? "bg-primary-50 border-primary-200"
                                        : "bg-white border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      {/* Expand/Collapse Button */}
                                      {hasSubcategories && (
                                        <button
                                          onClick={() =>
                                            toggleCategoryExpansion(categoryKey)
                                          }
                                          className="p-2 text-muted-gray hover:text-dark-slate transition-colors"
                                          title={
                                            isExpanded ? "Collapse" : "Expand"
                                          }
                                        >
                                          {isExpanded ? (
                                            <ChevronDownIcon className="h-4 w-4" />
                                          ) : (
                                            <ChevronRightIcon className="h-4 w-4" />
                                          )}
                                        </button>
                                      )}

                                      {/* Category Button */}
                                      <button
                                        onClick={() =>
                                          handleCategorySelect(categoryKey)
                                        }
                                        className={`flex-1 text-left p-3 ${
                                          !hasSubcategories ? "pl-3" : "pl-1"
                                        } transition-all duration-200 ${
                                          isSelected
                                            ? "text-primary-700 font-medium"
                                            : "text-dark-slate hover:text-primary"
                                        }`}
                                      >
                                        <div className="font-medium text-sm">
                                          {category.name}
                                        </div>
                                        {hasSubcategories && (
                                          <div className="text-xs text-muted-gray mt-1">
                                            {category.subCategories?.length}{" "}
                                            subcategories
                                          </div>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Subcategories */}
                                  {hasSubcategories &&
                                    (isExpanded ||
                                      contentSearchTerm.trim()) && (
                                      <div className="ml-6 space-y-1">
                                        {(contentSearchTerm.trim()
                                          ? visibleSubcategories
                                          : category.subCategories
                                        )?.map((subcat, subIndex) => {
                                          const subcatKey =
                                            subcat._id ||
                                            `subcat-${category._id}-${subIndex}`;
                                          const isSubSelected =
                                            selectedCategoryId ===
                                              categoryKey &&
                                            selectedSubCategoryId === subcatKey;
                                          const isSubSearchHighlighted =
                                            isSearchMatch(
                                              "subcategory",
                                              subcatKey
                                            );

                                          return (
                                            <button
                                              key={subcatKey}
                                              onClick={() =>
                                                handleCategorySelect(
                                                  categoryKey,
                                                  subcatKey
                                                )
                                              }
                                              className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
                                                isSubSearchHighlighted
                                                  ? "bg-yellow-50 border-yellow-200 text-yellow-800 font-medium"
                                                  : isSubSelected
                                                  ? "bg-accent-50 border-accent-200 text-accent-700 font-medium"
                                                  : "border-transparent text-muted-gray hover:text-dark-slate hover:bg-slate-50"
                                              }`}
                                            >
                                              • {subcat.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Content Display Area */}
                      <div className="lg:col-span-2">
                        {getSelectedContent() ? (
                          <ContentDisplay
                            content={
                              getSelectedContent()! as {
                                type: "category" | "subcategory";
                                category: ISopCategory;
                                subCategory?: ISopCategory;
                              }
                            }
                            searchTerm={contentSearchTerm}
                            onEdit={handleTriggerEditCategory}
                            onDelete={handleDeleteCategory}
                            onAddSubCategory={handleTriggerAddSubCategory}
                          />
                        ) : (
                          <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary-50 to-accent-50 mb-6 border border-primary-200">
                              <BookOpenIcon className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-light text-dark-slate mb-3 tracking-tight">
                              Select a category to view content
                            </h3>
                            <p className="text-muted-gray font-light leading-relaxed">
                              Choose a category or subcategory from the table of
                              contents to display its content here.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 px-8">
                      <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-primary-50 to-accent-50 mb-8 border border-primary-200">
                        <BookOpenIcon className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-2xl font-light text-dark-slate mb-4 tracking-tight">
                        No content extracted yet
                      </h3>
                      <p className="text-muted-gray mb-8 max-w-md mx-auto font-light leading-relaxed">
                        {document.status === "processed"
                          ? "This document has been processed but no structured content was found. You can manually add categories to organize the content."
                          : "This document is being processed. Once complete, the extracted content and categories will appear here."}
                      </p>
                      {(document.status === "pending_upload" ||
                        document.status === "pending_processing" ||
                        document.status === "processing") && (
                        <div className="flex items-center justify-center space-x-3 text-primary mb-8">
                          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                          <span className="text-sm font-medium">
                            Processing in progress...
                          </span>
                        </div>
                      )}
                      <button
                        onClick={handleAddTopLevelCategory}
                        className="inline-flex items-center bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
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
                      <div className="p-6 bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-2xl flex items-center shadow-sm">
                        <div className="animate-spin h-5 w-5 mr-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        <span className="text-primary-700 font-medium">
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
