import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import { IQuestion, IQuestionBank } from "../types/questionBankTypes";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import GenerateAiQuestionsForm from "../components/questionBank/GenerateAiQuestionsForm";
import Modal from "../components/common/Modal";
import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";
import GenerateAiQuestionsFormSop from "../components/questionBank/GenerateAiQuestionsFormSop";
import AiQuestionsPreview from "../components/questionBank/AiQuestionsPreview";
import Card from "../components/common/Card";
import ErrorMessage from "../components/common/ErrorMessage";
import {
  getMenusByRestaurant as fetchRestaurantMenus,
  getPendingReviewQuestions,
  processReviewedAiQuestions,
} from "../services/api";
import { IMenuClient } from "../types/menuTypes";
import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  DocumentTextIcon,
  XCircleIcon,
  CheckIcon,
  XMarkIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";

// Enhanced component to display a single question with modern styling
const QuestionListItem: React.FC<{
  question: IQuestion;
  onRemove: (questionId: string) => void;
  onEdit: (question: IQuestion) => void;
  isSelected: boolean;
  onToggleSelect: (questionId: string) => void;
}> = ({ question, onRemove, onEdit, isSelected, onToggleSelect }) => {
  // Helper function to format question type
  const formatQuestionType = (type: string) => {
    if (!type) return "N/A";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get question type color
  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case "multiple-choice":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "true-false":
        return "bg-green-100 text-green-700 border-green-200";
      case "short-answer":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "fill-in-the-blank":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <Card
      variant="default"
      hover={true}
      className={`relative transition-all duration-200 border-l-4 ${
        isSelected
          ? "border-l-sky-500 bg-sky-50/50 ring-2 ring-sky-200"
          : "border-l-slate-200 hover:border-l-sky-300"
      }`}
    >
      <div className="flex items-start space-x-4">
        {/* Enhanced Checkbox */}
        <div className="flex-shrink-0 pt-1">
          <label className="inline-flex items-center cursor-pointer group">
            <input
              type="checkbox"
              className="h-5 w-5 text-sky-600 border-slate-300 rounded-md focus:ring-sky-500 focus:ring-2 transition-colors duration-200"
              checked={isSelected}
              onChange={() => onToggleSelect(question._id)}
              aria-label={`Select question: ${question.questionText}`}
            />
            <span className="sr-only">Select question</span>
          </label>
        </div>

        {/* Main content area */}
        <div className="flex-grow space-y-3 pr-32">
          {/* Question Text with better typography */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 leading-relaxed">
              {question.questionText}
            </h3>
          </div>

          {/* Enhanced Metadata badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getQuestionTypeColor(
                question.questionType
              )}`}
            >
              {formatQuestionType(question.questionType)}
            </span>

            {question.categories && question.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {question.categories.slice(0, 2).map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {category}
                  </span>
                ))}
                {question.categories.length > 2 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200">
                    +{question.categories.length - 2} more
                  </span>
                )}
              </div>
            )}

            {question.knowledgeCategory && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                {question.knowledgeCategory}
              </span>
            )}
          </div>

          {/* Explanation with better styling */}
          {question.explanation && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-800">Explanation:</span>{" "}
                {question.explanation}
              </p>
            </div>
          )}

          {/* Show options for multiple choice questions */}
          {question.options && question.options.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs font-medium text-blue-800 mb-2">Options:</p>
              <div className="space-y-1">
                {question.options.slice(0, 2).map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        option.isCorrect ? "bg-green-500" : "bg-slate-300"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        option.isCorrect
                          ? "text-green-700 font-medium"
                          : "text-slate-600"
                      }`}
                    >
                      {option.text}
                    </span>
                  </div>
                ))}
                {question.options.length > 2 && (
                  <p className="text-xs text-blue-600 font-medium">
                    +{question.options.length - 2} more options
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced action buttons */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => onEdit(question)}
            className="text-sm px-3 py-1.5 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 transition-colors duration-200"
          >
            <PencilIcon className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => onRemove(question._id)}
            className="text-sm px-3 py-1.5"
          >
            <TrashIcon className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    </Card>
  );
};

const QuestionBankDetailPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const {
    currentQuestionBank,
    isLoading,
    error,
    fetchQuestionBankById,
    removeQuestionFromCurrentBank,
    addQuestionToCurrentBank,
  } = useQuestionBanks();

  // Helper function to extract question ID from union type
  const getQuestionId = (question: string | IQuestion): string => {
    return typeof question === "string" ? question : question._id;
  };

  // Helper function to get questions as IQuestion objects (active only)
  const getActiveQuestionsAsObjects = (): IQuestion[] => {
    if (!currentQuestionBank) return [];
    return currentQuestionBank.questions.filter(
      (q): q is IQuestion => typeof q === "object" && q.status === "active"
    );
  };

  // Helper function to get all questions as IQuestion objects (for legacy compatibility)
  const getQuestionsAsObjects = (): IQuestion[] => {
    if (!currentQuestionBank) return [];
    return currentQuestionBank.questions.filter(
      (q): q is IQuestion => typeof q === "object"
    );
  };

  // Local state for managing modals or forms for adding questions
  const [showAddManualQuestionModal, setShowAddManualQuestionModal] =
    useState(false);
  const [showGenerateAiQuestionsModal, setShowGenerateAiQuestionsModal] =
    useState(false);
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isConfirmRemoveModalOpen, setIsConfirmRemoveModalOpen] =
    useState(false);
  const [questionToRemoveId, setQuestionToRemoveId] = useState<string | null>(
    null
  );
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(
    null
  );

  // State for multi-select and bulk actions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isConfirmBulkDeleteModalOpen, setIsConfirmBulkDeleteModalOpen] =
    useState(false);

  // State for menu selection for AI Generation
  const [availableMenus, setAvailableMenus] = useState<IMenuClient[]>([]);
  const [selectedMenuForAi, setSelectedMenuForAi] = useState<string | null>(
    null
  );
  const [isMenuSelectionModalOpen, setIsMenuSelectionModalOpen] =
    useState(false);
  const [isLoadingMenusForAi, setIsLoadingMenusForAi] = useState(false);

  // ADDED: State for SOP AI Generation Modal
  const [showGenerateSopAiModal, setShowGenerateSopAiModal] = useState(false);

  // ADDED: State for categories section expansion
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

  // ADDED: State for AI Questions Preview
  const [previewQuestions, setPreviewQuestions] = useState<IQuestion[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPreviewQuestionIds, setSelectedPreviewQuestionIds] = useState<
    string[]
  >([]);
  const [isAddingApprovedQuestions, setIsAddingApprovedQuestions] =
    useState(false);

  // ADDED: State for Questions tabs (Active vs Pending Review)
  const [activeQuestionsTab, setActiveQuestionsTab] = useState<
    "active" | "pending"
  >("active");

  // ADDED: State for Pending Review Questions
  const [pendingQuestions, setPendingQuestions] = useState<IQuestion[]>([]);
  const [isLoadingPendingQuestions, setIsLoadingPendingQuestions] =
    useState(false);
  const [pendingQuestionsError, setPendingQuestionsError] = useState<
    string | null
  >(null);
  const [selectedPendingQuestionIds, setSelectedPendingQuestionIds] = useState<
    string[]
  >([]);
  const [isProcessingPendingQuestions, setIsProcessingPendingQuestions] =
    useState(false);

  const memoizedFetchQuestionBankById = useCallback(fetchQuestionBankById, [
    fetchQuestionBankById,
  ]);

  useEffect(() => {
    if (bankId) {
      memoizedFetchQuestionBankById(bankId);
    }
    setSelectedQuestionIds([]); // Reset selection when bank changes
  }, [bankId, memoizedFetchQuestionBankById]);

  // ADDED: Function to toggle category expansion
  const toggleCategoriesExpand = () => {
    setIsCategoriesExpanded((prev) => !prev);
  };

  const requestRemoveQuestion = (questionId: string) => {
    if (!bankId || !currentQuestionBank) return;
    setQuestionToRemoveId(questionId);
    setIsConfirmRemoveModalOpen(true);
  };

  const handleCancelRemoveQuestion = () => {
    setIsConfirmRemoveModalOpen(false);
    setQuestionToRemoveId(null);
  };

  const executeRemoveQuestion = async () => {
    if (questionToRemoveId && currentQuestionBank) {
      await removeQuestionFromCurrentBank(questionToRemoveId);
      setIsConfirmRemoveModalOpen(false);
      setQuestionToRemoveId(null);
    }
  };

  const handleManualQuestionSubmit = async (newQuestion: IQuestion) => {
    if (!currentQuestionBank) {
      console.error("No current question bank to add to.");
      return;
    }
    try {
      if (newQuestion && newQuestion._id) {
        await addQuestionToCurrentBank(newQuestion._id);
        setShowAddManualQuestionModal(false);
        if (bankId) fetchQuestionBankById(bankId);
      } else {
        console.error(
          "New question data is invalid or missing ID after creation."
        );
        setPageError(
          "Error: Failed to add the created question to the bank. The question data was invalid after creation."
        );
      }
    } catch (err) {
      console.error("Error adding created question to bank:", err);
      setPageError(
        `Error adding question to bank: ${
          err instanceof Error ? err.message : "An unknown error occurred."
        }`
      );
    }
  };

  const handleAiQuestionsGenerated = async (
    generatedQuestions: IQuestion[]
  ) => {
    setShowGenerateAiQuestionsModal(false);
    setShowGenerateSopAiModal(false);
    setSelectedMenuForAi(null);

    if (generatedQuestions && generatedQuestions.length > 0) {
      // Show preview modal instead of directly adding to bank
      setPreviewQuestions(generatedQuestions);
      setSelectedPreviewQuestionIds(generatedQuestions.map((q) => q._id)); // Pre-select all questions
      setShowPreviewModal(true);
    } else {
      alert("AI generation process completed, but no questions were created.");
    }
  };

  // NEW: Handler for SOP AI Questions Generated
  const handleSopAiQuestionsGenerated = async (
    generatedQuestions: IQuestion[]
  ) => {
    setShowGenerateSopAiModal(false);

    if (generatedQuestions && generatedQuestions.length > 0) {
      // Show preview modal instead of directly adding to bank
      setPreviewQuestions(generatedQuestions);
      setSelectedPreviewQuestionIds(generatedQuestions.map((q) => q._id)); // Pre-select all questions
      setShowPreviewModal(true);
    } else {
      alert("AI generation process completed, but no questions were created.");
    }
  };

  // NEW: Handler for approving and adding selected questions from preview
  const handleApproveSelectedQuestions = async () => {
    if (!currentQuestionBank || selectedPreviewQuestionIds.length === 0) {
      alert("No questions selected to approve.");
      return;
    }

    setIsAddingApprovedQuestions(true);
    try {
      let addedCount = 0;
      const approvedQuestions = previewQuestions.filter((q) =>
        selectedPreviewQuestionIds.includes(q._id)
      );

      for (const question of approvedQuestions) {
        try {
          await addQuestionToCurrentBank(question._id);
          addedCount++;
        } catch (err) {
          console.error(`Failed to add question ${question._id}:`, err);
        }
      }

      // Close preview and refresh bank
      setShowPreviewModal(false);
      setPreviewQuestions([]);
      setSelectedPreviewQuestionIds([]);

      if (bankId) {
        await fetchQuestionBankById(bankId);
      }

      alert(
        `${addedCount} out of ${selectedPreviewQuestionIds.length} questions added to the question bank successfully.`
      );
    } catch (err) {
      console.error("Error adding approved questions:", err);
      setPageError(
        `Error adding questions to bank: ${
          err instanceof Error ? err.message : "An unknown error occurred."
        }`
      );
    } finally {
      setIsAddingApprovedQuestions(false);
    }
  };

  // NEW: Handler for closing preview modal
  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewQuestions([]);
    setSelectedPreviewQuestionIds([]);
  };

  // NEW: Handler for toggling preview question selection
  const handleTogglePreviewQuestion = (questionId: string) => {
    setSelectedPreviewQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  // NEW: Handler for selecting/deselecting all preview questions
  const handleToggleAllPreviewQuestions = () => {
    if (selectedPreviewQuestionIds.length === previewQuestions.length) {
      setSelectedPreviewQuestionIds([]);
    } else {
      setSelectedPreviewQuestionIds(previewQuestions.map((q) => q._id));
    }
  };

  // Helper to get error message
  const getErrorMessage = (errorValue: unknown): string => {
    if (
      errorValue &&
      typeof errorValue === "object" &&
      "message" in errorValue
    ) {
      return String((errorValue as { message: unknown }).message);
    }
    return "An unknown error occurred.";
  };

  const handleOpenEditBankModal = () => {
    if (currentQuestionBank) {
      setIsEditBankModalOpen(true);
    }
  };

  const handleCloseEditBankModal = () => {
    setIsEditBankModalOpen(false);
  };

  const handleBankDetailsUpdated = (_updatedBank: IQuestionBank) => {
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
    handleCloseEditBankModal();
  };

  // Handlers for Edit Question Modal
  const handleOpenEditQuestionModal = (question: IQuestion) => {
    setEditingQuestion(question);
    setIsEditQuestionModalOpen(true);
  };

  const handleCloseEditQuestionModal = () => {
    setIsEditQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const handleQuestionUpdatedInModal = (updatedQuestion: IQuestion) => {
    if (currentQuestionBank && Array.isArray(currentQuestionBank.questions)) {
      // Optimistic update or re-fetch
    }
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
    // If we're on the pending tab and the edited question was a pending question,
    // refresh the pending questions list
    if (activeQuestionsTab === "pending") {
      fetchPendingQuestionsForBank();
    }
    handleCloseEditQuestionModal();
  };

  // MODIFIED: This handler now routes to different modals based on bank source type
  const handleOpenGenerateAiQuestions = async () => {
    if (!currentQuestionBank) {
      setPageError("Question bank details not loaded.");
      return;
    }
    setPageError(null);

    if (currentQuestionBank.sourceType === "MENU") {
      // UPDATED LOGIC: If sourceMenuId exists, use it directly
      if (currentQuestionBank.sourceMenuId) {
        setSelectedMenuForAi(currentQuestionBank.sourceMenuId);
        setShowGenerateAiQuestionsModal(true);
      } else {
        // Existing logic: Fetch menus if no sourceMenuId is linked
        setIsLoadingMenusForAi(true);
        try {
          const menus = await fetchRestaurantMenus(
            currentQuestionBank.restaurantId
          );
          const activeMenus = menus;

          if (activeMenus.length === 0) {
            setPageError(
              "No active menus found for your restaurant. AI Question generation for menu-based banks requires an active menu."
            );
            setIsLoadingMenusForAi(false);
            return;
          }
          setAvailableMenus(activeMenus);
          if (activeMenus.length === 1) {
            setSelectedMenuForAi(activeMenus[0]._id);
            setShowGenerateAiQuestionsModal(true);
          } else {
            setIsMenuSelectionModalOpen(true);
          }
        } catch (err) {
          console.error("Error fetching menus for AI generation:", err);
          setPageError(getErrorMessage(err));
        } finally {
          setIsLoadingMenusForAi(false);
        }
      }
    } else if (currentQuestionBank.sourceType === "SOP") {
      if (!currentQuestionBank.sourceSopDocumentId) {
        setPageError(
          "This SOP-based question bank is not linked to a specific SOP document. Cannot generate AI questions."
        );
        return;
      }
      setShowGenerateSopAiModal(true); // Open the new/dedicated modal for SOPs
    } else {
      setPageError(
        "AI question generation is not supported for this type of question bank."
      );
    }
  };

  const handleMenuSelectForAi = (menuId: string) => {
    setSelectedMenuForAi(menuId);
    setIsMenuSelectionModalOpen(false);
    setShowGenerateAiQuestionsModal(true);
  };

  // Handlers for multi-select and bulk delete
  const handleToggleSelectQuestion = (questionId: string) => {
    setSelectedQuestionIds((prevSelected) =>
      prevSelected.includes(questionId)
        ? prevSelected.filter((id) => id !== questionId)
        : [...prevSelected, questionId]
    );
  };

  const handleToggleSelectAll = () => {
    if (!currentQuestionBank || !currentQuestionBank.questions) return;
    const activeQuestions = getActiveQuestionsAsObjects();
    if (selectedQuestionIds.length === activeQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(activeQuestions.map((q) => q._id));
    }
  };

  const handleRequestBulkDelete = () => {
    if (selectedQuestionIds.length > 0) {
      setIsConfirmBulkDeleteModalOpen(true);
    } else {
      alert("No questions selected to delete.");
    }
  };

  const handleCancelBulkDelete = () => {
    setIsConfirmBulkDeleteModalOpen(false);
  };

  const executeBulkDelete = async () => {
    if (!currentQuestionBank || selectedQuestionIds.length === 0) return;

    // For now, deleting one by one. Consider a bulk API endpoint for efficiency.
    try {
      for (const questionId of selectedQuestionIds) {
        await removeQuestionFromCurrentBank(questionId);
      }
      setSelectedQuestionIds([]); // Clear selection
      // Optionally, re-fetch the bank to ensure UI consistency if removeQuestionFromCurrentBank doesn't update the context perfectly
      if (bankId) fetchQuestionBankById(bankId);
    } catch (err) {
      console.error("Error during bulk delete:", err);
      setPageError(
        `Failed to delete some questions: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      // Re-fetch to get the current state after partial failure
      if (bankId) fetchQuestionBankById(bankId);
    } finally {
      setIsConfirmBulkDeleteModalOpen(false);
    }
  };

  // ADDED: Pending review questions handlers
  const fetchPendingQuestionsForBank = useCallback(async () => {
    if (!bankId) return;

    setIsLoadingPendingQuestions(true);
    setPendingQuestionsError(null);
    try {
      const allPendingQuestions = await getPendingReviewQuestions();
      // Filter pending questions for this specific bank
      const bankPendingQuestions = allPendingQuestions.filter(
        (q) => q.questionBankId === bankId
      );
      setPendingQuestions(bankPendingQuestions || []);
    } catch (err) {
      setPendingQuestionsError(
        err instanceof Error
          ? err.message
          : "Failed to fetch pending questions."
      );
      console.error(err);
    } finally {
      setIsLoadingPendingQuestions(false);
    }
  }, [bankId]);

  const handleTogglePendingQuestion = (questionId: string) => {
    setSelectedPendingQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleToggleAllPendingQuestions = () => {
    if (selectedPendingQuestionIds.length === pendingQuestions.length) {
      setSelectedPendingQuestionIds([]);
    } else {
      setSelectedPendingQuestionIds(pendingQuestions.map((q) => q._id));
    }
  };

  const handleApprovePendingQuestions = async () => {
    if (!bankId || selectedPendingQuestionIds.length === 0) {
      setPageError("Please select at least one question to approve.");
      return;
    }

    setIsProcessingPendingQuestions(true);
    try {
      await processReviewedAiQuestions(bankId, {
        acceptedQuestions: selectedPendingQuestionIds.map((id) => ({
          _id: id,
        })),
        updatedQuestions: [],
        deletedQuestionIds: [],
      });

      setPageError(null);
      setSelectedPendingQuestionIds([]);
      fetchPendingQuestionsForBank(); // Refresh pending questions
      if (bankId) fetchQuestionBankById(bankId); // Refresh bank to update active questions count
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to approve questions."
      );
      console.error("Error approving questions:", err);
    } finally {
      setIsProcessingPendingQuestions(false);
    }
  };

  const handleRejectPendingQuestions = async () => {
    if (!bankId || selectedPendingQuestionIds.length === 0) {
      setPageError("Please select at least one question to reject.");
      return;
    }

    setIsProcessingPendingQuestions(true);
    try {
      await processReviewedAiQuestions(bankId, {
        acceptedQuestions: [],
        updatedQuestions: [],
        deletedQuestionIds: selectedPendingQuestionIds,
      });

      setPageError(null);
      setSelectedPendingQuestionIds([]);
      fetchPendingQuestionsForBank(); // Refresh pending questions
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to reject questions."
      );
      console.error("Error rejecting questions:", err);
    } finally {
      setIsProcessingPendingQuestions(false);
    }
  };

  // Fetch pending questions when switching to pending tab
  useEffect(() => {
    if (activeQuestionsTab === "pending") {
      fetchPendingQuestionsForBank();
    }
  }, [activeQuestionsTab, fetchPendingQuestionsForBank]);

  // ADDED: Render pending review questions
  const renderPendingReviewQuestions = () => {
    if (isLoadingPendingQuestions) {
      return (
        <div className="text-center py-12">
          <LoadingSpinner message="Loading pending questions..." />
        </div>
      );
    }

    if (pendingQuestionsError) {
      return (
        <div className="text-center py-12">
          <ErrorMessage
            message={pendingQuestionsError}
            onDismiss={() => setPendingQuestionsError(null)}
          />
        </div>
      );
    }

    if (pendingQuestions.length === 0) {
      return (
        <div className="text-center py-12">
          <SparklesIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No pending questions
          </h3>
          <p className="text-slate-500">
            All AI-generated questions for this bank have been reviewed and
            processed.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with bulk actions */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={
                selectedPendingQuestionIds.length === pendingQuestions.length
              }
              onChange={handleToggleAllPendingQuestions}
              disabled={isProcessingPendingQuestions}
            />
            <span className="text-sm font-medium text-slate-700">
              {selectedPendingQuestionIds.length} of {pendingQuestions.length}{" "}
              selected
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="primary"
              onClick={handleApprovePendingQuestions}
              disabled={
                selectedPendingQuestionIds.length === 0 ||
                isProcessingPendingQuestions
              }
              className="text-sm"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Approve Selected ({selectedPendingQuestionIds.length})
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPendingQuestions}
              disabled={
                selectedPendingQuestionIds.length === 0 ||
                isProcessingPendingQuestions
              }
              className="text-sm"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Reject Selected ({selectedPendingQuestionIds.length})
            </Button>
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-4">
          {pendingQuestions.map((question) => (
            <div
              key={question._id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={selectedPendingQuestionIds.includes(question._id)}
                  onChange={() => handleTogglePendingQuestion(question._id)}
                  disabled={isProcessingPendingQuestions}
                />
                <div className="flex-grow pr-20">
                  <p className="font-semibold text-gray-800 mb-2">
                    {question.questionText}
                  </p>
                  <div className="text-sm text-gray-600 mb-2 flex flex-wrap gap-4">
                    <span>
                      <strong>Type:</strong>{" "}
                      {question.questionType.replace("-", " ")}
                    </span>
                    <span>
                      <strong>Category:</strong>{" "}
                      {question.categories?.join(", ") || "N/A"}
                    </span>
                    <span>
                      <strong>Knowledge:</strong> {question.knowledgeCategory}
                    </span>
                  </div>
                  {question.options && question.options.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Options:
                      </p>
                      <ul className="list-disc list-inside pl-4 text-sm text-gray-600">
                        {question.options.map((opt, index) => (
                          <li
                            key={index}
                            className={
                              opt.isCorrect
                                ? "font-semibold text-green-600"
                                : ""
                            }
                          >
                            {opt.text} {opt.isCorrect ? "(Correct)" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {question.explanation && (
                    <p className="text-sm text-gray-600 italic">
                      <strong>Explanation:</strong> {question.explanation}
                    </p>
                  )}
                </div>
                {/* Edit button positioned in top-right */}
                <div className="absolute top-4 right-4">
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEditQuestionModal(question)}
                    disabled={isProcessingPendingQuestions}
                    className="text-xs px-3 py-1.5"
                  >
                    <PencilIcon className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading && !currentQuestionBank) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="Loading question bank details..." />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
                  <div className="p-3 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <BookOpenIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Error Loading Question Bank
                  </h1>
                  <ErrorMessage message={getErrorMessage(error)} />
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/quiz-management")}
                    className="mt-6"
                  >
                    ← Back to Quiz Management
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!currentQuestionBank) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                  <div className="p-3 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <BookOpenIcon className="h-8 w-8 text-slate-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-700 mb-4">
                    Question Bank Not Found
                  </h1>
                  <ErrorMessage message="Question bank not found." />
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/quiz-management")}
                    className="mt-6"
                  >
                    ← Back to Quiz Management
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main content rendering if bank is loaded
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Enhanced Header Section */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-slate-200 shadow-sm">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 rounded-full blur-3xl"></div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                        <BookOpenIcon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">
                          {currentQuestionBank.name}
                        </h1>
                        <p className="text-slate-600 text-lg">
                          Manage questions in this question bank
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleOpenEditBankModal}
                      className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-200"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span>Edit Details</span>
                    </Button>
                  </div>

                  {/* Enhanced Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card
                      variant="elevated"
                      className="bg-white/80 backdrop-blur-sm border-0 shadow-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 rounded-xl">
                          <CheckIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-700 mb-1">
                            Active Questions
                          </h3>
                          <p className="text-3xl font-bold text-slate-900">
                            {getActiveQuestionsAsObjects().length}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card
                      variant="elevated"
                      className="bg-white/80 backdrop-blur-sm border-0 shadow-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-sm font-medium text-slate-700 mb-1">
                            Source Type
                          </h3>
                          <div className="flex items-center space-x-2">
                            {currentQuestionBank.sourceType === "MENU" && (
                              <>
                                <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                                  Menu
                                </span>
                                {currentQuestionBank.sourceMenuName && (
                                  <span className="text-sm text-slate-600 truncate">
                                    {currentQuestionBank.sourceMenuName}
                                  </span>
                                )}
                              </>
                            )}
                            {currentQuestionBank.sourceType === "SOP" && (
                              <>
                                <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                                  SOP
                                </span>
                                {currentQuestionBank.sourceSopDocumentTitle && (
                                  <span className="text-sm text-slate-600 truncate">
                                    {currentQuestionBank.sourceSopDocumentTitle}
                                  </span>
                                )}
                              </>
                            )}
                            {currentQuestionBank.sourceType === "MANUAL" && (
                              <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                                Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card
                      variant="elevated"
                      className="bg-white/80 backdrop-blur-sm border-0 shadow-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-100 rounded-xl">
                          <ChartPieIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-700 mb-1">
                            Categories
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {currentQuestionBank.categories &&
                            currentQuestionBank.categories.length > 0 ? (
                              <>
                                {currentQuestionBank.categories
                                  .slice(0, 2)
                                  .map((cat) => (
                                    <span
                                      key={cat}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-sky-100 text-sky-700 rounded-full border border-sky-200"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                {currentQuestionBank.categories.length > 2 && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    +{currentQuestionBank.categories.length - 2}{" "}
                                    more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-slate-500 italic">
                                None
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Enhanced Description */}
                  {currentQuestionBank.description && (
                    <Card
                      variant="outlined"
                      className="bg-white/60 backdrop-blur-sm border-slate-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                          <DocumentTextIcon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800 mb-2">
                            Description
                          </h3>
                          <p className="text-slate-600 leading-relaxed">
                            {currentQuestionBank.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Error Messages */}
              {pageError && (
                <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                      <XCircleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-red-900">
                        Unable to Load Question Bank
                      </h3>
                      <p className="text-red-700 mt-1">{pageError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Manage Questions Section */}
              <Card variant="elevated" size="lg" className="border-0 shadow-lg">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                    <PlusIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Manage Questions
                    </h2>
                    <p className="text-slate-600">
                      Add questions manually or generate with AI
                    </p>
                  </div>
                </div>

                <div
                  className={`grid grid-cols-1 gap-4 ${
                    currentQuestionBank.sourceType === "MANUAL"
                      ? "lg:grid-cols-1"
                      : "lg:grid-cols-2"
                  }`}
                >
                  <Card
                    variant="outlined"
                    clickable={true}
                    onClick={() => setShowAddManualQuestionModal(true)}
                    className="border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-emerald-100 group-hover:bg-emerald-200 rounded-xl transition-colors duration-200">
                        <PlusIcon className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-slate-900 mb-1">
                          Add Manual Question
                        </h3>
                        <p className="text-sm text-slate-600">
                          Create custom questions with full control over content
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Show Generate from Menu button only for MENU source type */}
                  {currentQuestionBank.sourceType === "MENU" && (
                    <Card
                      variant="outlined"
                      clickable={true}
                      onClick={handleOpenGenerateAiQuestions}
                      className="border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-xl transition-colors duration-200">
                          <SparklesIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-semibold text-slate-900 mb-1">
                            Generate from Menu
                          </h3>
                          <p className="text-sm text-slate-600">
                            AI-powered questions based on your menu items
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Show Generate from SOP button only for SOP source type */}
                  {currentQuestionBank.sourceType === "SOP" && (
                    <Card
                      variant="outlined"
                      clickable={true}
                      onClick={() => setShowGenerateSopAiModal(true)}
                      className="border-purple-200 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-100 group-hover:bg-purple-200 rounded-xl transition-colors duration-200">
                          <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-semibold text-slate-900 mb-1">
                            Generate from SOP
                          </h3>
                          <p className="text-sm text-slate-600">
                            AI-powered questions based on your SOP document
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </Card>

              {/* Enhanced Bulk Actions */}
              {selectedQuestionIds.length > 0 && (
                <Card
                  variant="outlined"
                  className="border-red-200 bg-red-50/50 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-red-100 rounded-xl">
                        <TrashIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {selectedQuestionIds.length} question
                          {selectedQuestionIds.length > 1 ? "s" : ""} selected
                        </h3>
                        <p className="text-sm text-slate-600">
                          You can perform bulk actions on selected questions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedQuestionIds([])}
                        className="bg-white hover:bg-slate-50 border-slate-300"
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setIsConfirmBulkDeleteModalOpen(true)}
                        className="shadow-lg"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Questions List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Questions Management
                    </h2>
                    {activeQuestionsTab === "active" &&
                      getActiveQuestionsAsObjects().length > 0 && (
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="secondary"
                            onClick={handleToggleSelectAll}
                            className="text-sm"
                          >
                            {selectedQuestionIds.length ===
                            getActiveQuestionsAsObjects().length
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        </div>
                      )}
                  </div>
                </div>

                <div className="p-6">
                  {/* Tabs */}
                  <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveQuestionsTab("active")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                          activeQuestionsTab === "active"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        Active Questions ({getActiveQuestionsAsObjects().length}
                        )
                      </button>
                      <button
                        onClick={() => setActiveQuestionsTab("pending")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                          activeQuestionsTab === "pending"
                            ? "border-amber-500 text-amber-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        Pending Review
                        {pendingQuestions.length > 0 && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {pendingQuestions.length}
                          </span>
                        )}
                      </button>
                    </nav>
                  </div>

                  {/* Tab Content */}
                  {activeQuestionsTab === "active" && (
                    <>
                      {getActiveQuestionsAsObjects().length === 0 ? (
                        <div className="text-center py-16">
                          <div className="relative">
                            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                              <BookOpenIcon className="h-12 w-12 text-slate-500" />
                            </div>
                            <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg transform translate-x-8 -translate-y-2">
                              <PlusIcon className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-3">
                            No active questions yet
                          </h3>
                          <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                            Get started by adding your first question to this
                            bank. You can create questions manually or generate
                            them with AI.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                              variant="primary"
                              onClick={() =>
                                setShowAddManualQuestionModal(true)
                              }
                              className="flex items-center space-x-2 shadow-lg"
                            >
                              <PlusIcon className="h-4 w-4" />
                              <span>Add First Question</span>
                            </Button>
                            {(currentQuestionBank.sourceType === "MENU" ||
                              currentQuestionBank.sourceType === "SOP") && (
                              <Button
                                variant="secondary"
                                onClick={
                                  currentQuestionBank.sourceType === "MENU"
                                    ? handleOpenGenerateAiQuestions
                                    : () => setShowGenerateSopAiModal(true)
                                }
                                className="flex items-center space-x-2"
                              >
                                <SparklesIcon className="h-4 w-4" />
                                <span>Generate with AI</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {getActiveQuestionsAsObjects().map((question) => (
                            <QuestionListItem
                              key={question._id}
                              question={question}
                              onRemove={requestRemoveQuestion}
                              onEdit={handleOpenEditQuestionModal}
                              isSelected={selectedQuestionIds.includes(
                                question._id
                              )}
                              onToggleSelect={handleToggleSelectQuestion}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {activeQuestionsTab === "pending" &&
                    renderPendingReviewQuestions()}
                </div>
              </div>
            </div>

            {/* Modals */}
            {showAddManualQuestionModal && bankId && (
              <Modal
                isOpen={showAddManualQuestionModal}
                onClose={() => setShowAddManualQuestionModal(false)}
                title="Add New Manual Question"
              >
                <AddManualQuestionForm
                  onQuestionAdded={handleManualQuestionSubmit}
                  onCloseRequest={() => setShowAddManualQuestionModal(false)}
                  initialBankCategories={currentQuestionBank.categories}
                  questionBankId={bankId}
                />
              </Modal>
            )}

            {showGenerateAiQuestionsModal &&
              currentQuestionBank &&
              selectedMenuForAi && (
                <Modal
                  isOpen={showGenerateAiQuestionsModal}
                  onClose={() => {
                    setShowGenerateAiQuestionsModal(false);
                    setSelectedMenuForAi(null);
                  }}
                  title="Generate AI Questions for this Bank"
                >
                  <GenerateAiQuestionsForm
                    bankId={currentQuestionBank._id}
                    menuId={selectedMenuForAi}
                    onAiQuestionsGenerated={handleAiQuestionsGenerated}
                    onCloseRequest={() => {
                      setShowGenerateAiQuestionsModal(false);
                      setSelectedMenuForAi(null);
                    }}
                    initialCategories={
                      currentQuestionBank.sourceType === "MENU"
                        ? currentQuestionBank.categories
                        : undefined
                    }
                  />
                </Modal>
              )}

            {isMenuSelectionModalOpen && (
              <Modal
                isOpen={isMenuSelectionModalOpen}
                onClose={() => setIsMenuSelectionModalOpen(false)}
                title="Select Menu for AI Question Generation"
                size="md"
              >
                <div className="p-4">
                  <p className="text-sm text-gray-700 mb-4">
                    Multiple active menus found. Please select which menu to use
                    as context for AI question generation.
                  </p>
                  {availableMenus.length === 0 && !isLoadingMenusForAi && (
                    <p className="text-sm text-gray-500">
                      No active menus available.
                    </p>
                  )}
                  {isLoadingMenusForAi && (
                    <LoadingSpinner message="Loading menus..." />
                  )}
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {availableMenus.map((menu) => (
                      <li key={menu._id}>
                        <Button
                          variant="secondary"
                          className="w-full text-left justify-start"
                          onClick={() => handleMenuSelectForAi(menu._id)}
                        >
                          {menu.name}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={() => setIsMenuSelectionModalOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Modal>
            )}

            {isEditBankModalOpen && currentQuestionBank && (
              <Modal
                isOpen={isEditBankModalOpen}
                onClose={handleCloseEditBankModal}
                title={`Edit Bank: ${currentQuestionBank.name}`}
              >
                <EditQuestionBankForm
                  bankToEdit={currentQuestionBank}
                  onBankUpdated={handleBankDetailsUpdated}
                  onCancel={handleCloseEditBankModal}
                />
              </Modal>
            )}

            {isConfirmRemoveModalOpen && questionToRemoveId && (
              <Modal
                isOpen={isConfirmRemoveModalOpen}
                onClose={handleCancelRemoveQuestion}
                title="Confirm Question Removal"
                size="sm"
              >
                <ConfirmationModalContent
                  message="Are you sure you want to remove this question from the bank? This action cannot be undone."
                  onConfirm={executeRemoveQuestion}
                  onCancel={handleCancelRemoveQuestion}
                  confirmText="Remove Question"
                  confirmButtonVariant="destructive"
                />
              </Modal>
            )}

            {isEditQuestionModalOpen && editingQuestion && (
              <Modal
                isOpen={isEditQuestionModalOpen}
                onClose={handleCloseEditQuestionModal}
                title="Edit Question"
              >
                <EditQuestionForm
                  questionToEdit={editingQuestion}
                  onQuestionUpdated={handleQuestionUpdatedInModal}
                  onClose={handleCloseEditQuestionModal}
                />
              </Modal>
            )}

            {/* Confirmation Modal for Bulk Delete */}
            {isConfirmBulkDeleteModalOpen && (
              <Modal
                isOpen={isConfirmBulkDeleteModalOpen}
                onClose={handleCancelBulkDelete}
                title="Confirm Bulk Delete"
                size="sm"
              >
                <ConfirmationModalContent
                  message={`Are you sure you want to delete ${selectedQuestionIds.length} selected question(s) from this bank? This action cannot be undone.`}
                  onConfirm={executeBulkDelete}
                  onCancel={handleCancelBulkDelete}
                  confirmText={`Delete ${selectedQuestionIds.length} Question(s)`}
                  confirmButtonVariant="destructive"
                />
              </Modal>
            )}

            {/* ADDED: Modal for SOP AI Question Generation */}
            {showGenerateSopAiModal &&
              currentQuestionBank &&
              currentQuestionBank.sourceType === "SOP" &&
              currentQuestionBank.sourceSopDocumentId && (
                <Modal
                  isOpen={showGenerateSopAiModal}
                  onClose={() => setShowGenerateSopAiModal(false)}
                  title={`Generate AI Questions from SOP: ${
                    currentQuestionBank.sourceSopDocumentTitle || "SOP Document"
                  }`}
                >
                  <GenerateAiQuestionsFormSop
                    bankId={currentQuestionBank._id}
                    bankName={currentQuestionBank.name}
                    sopDocumentId={currentQuestionBank.sourceSopDocumentId}
                    sopDocumentTitle={
                      currentQuestionBank.sourceSopDocumentTitle
                    }
                    existingBankCategories={currentQuestionBank.categories}
                    onQuestionsGenerated={handleSopAiQuestionsGenerated}
                    onCloseRequest={() => setShowGenerateSopAiModal(false)}
                  />
                </Modal>
              )}

            {showPreviewModal && (
              <Modal
                isOpen={showPreviewModal}
                onClose={handleClosePreviewModal}
                title="AI Questions Preview"
                size="xl"
              >
                <AiQuestionsPreview
                  questions={previewQuestions}
                  onApprove={handleApproveSelectedQuestions}
                  onCancel={handleClosePreviewModal}
                  isLoading={isAddingApprovedQuestions}
                />
              </Modal>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuestionBankDetailPage;
