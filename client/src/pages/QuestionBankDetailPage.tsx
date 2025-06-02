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
} from "@heroicons/react/24/outline";

// Simple component to display a single question - to be expanded
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

  return (
    <Card className="relative bg-gray-50 shadow-lg rounded-xl p-4 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex items-center space-x-3">
      {/* Checkbox on the left */}
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          checked={isSelected}
          onChange={() => onToggleSelect(question._id)}
          aria-label={`Select question: ${question.questionText}`}
        />
      </div>
      {/* Main content area (text only) to the right of checkbox */}
      <div className="flex-grow flex flex-col pb-10">
        {/* Question Text */}
        <p className="text-lg font-semibold text-gray-900 mb-1">
          {question.questionText}
        </p>
        {/* Metadata (Type, Difficulty, Category) */}
        <div className="text-xs text-gray-500">
          {`Type: ${formatQuestionType(question.questionType)} | `}
          {/* `Difficulty: ${question.difficulty || "N/A"} | ` REMOVED */}
          {`Category: ${question.categories.join(", ")}`}
        </div>
        {/* Explanation */}
        {question.explanation && (
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-800">Explanation:</span>{" "}
            {question.explanation}
          </p>
        )}
      </div>
      {/* Buttons container - absolutely positioned */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <Button
          variant="secondary"
          onClick={() => onEdit(question)}
          className="text-xs px-3 py-1"
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          onClick={() => onRemove(question._id)}
          className="text-xs px-3 py-1"
        >
          Remove
        </Button>
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
              {/* Header Section */}
              <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                      <BookOpenIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">
                        {currentQuestionBank.name}
                      </h1>
                      <p className="text-slate-600 mt-2">
                        Manage questions in this question bank
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleOpenEditBankModal}
                    className="flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit Details</span>
                  </Button>
                </div>

                {/* Bank Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-1">
                      Active Questions
                    </h3>
                    <p className="text-2xl font-bold text-slate-900">
                      {getActiveQuestionsAsObjects().length}
                    </p>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-1">
                      Source Type
                    </h3>
                    <div className="flex items-center space-x-2">
                      {currentQuestionBank.sourceType === "MENU" && (
                        <>
                          <span className="inline-flex px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                            Menu
                          </span>
                          {currentQuestionBank.sourceMenuName && (
                            <span className="text-sm text-slate-600">
                              {currentQuestionBank.sourceMenuName}
                            </span>
                          )}
                        </>
                      )}
                      {currentQuestionBank.sourceType === "SOP" && (
                        <>
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            SOP
                          </span>
                          {currentQuestionBank.sourceSopDocumentTitle && (
                            <span className="text-sm text-slate-600">
                              {currentQuestionBank.sourceSopDocumentTitle}
                            </span>
                          )}
                        </>
                      )}
                      {currentQuestionBank.sourceType === "MANUAL" && (
                        <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                          Manual
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-1">
                      Categories
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {currentQuestionBank.categories &&
                      currentQuestionBank.categories.length > 0 ? (
                        currentQuestionBank.categories
                          .slice(0, 2)
                          .map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex px-2 py-1 text-xs bg-sky-100 text-sky-700 rounded-full"
                            >
                              {cat}
                            </span>
                          ))
                      ) : (
                        <span className="text-sm text-slate-500 italic">
                          None
                        </span>
                      )}
                      {currentQuestionBank.categories &&
                        currentQuestionBank.categories.length > 2 && (
                          <span className="text-xs text-slate-500">
                            +{currentQuestionBank.categories.length - 2} more
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {currentQuestionBank.description && (
                  <div className="mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-xl">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">
                      Description
                    </h3>
                    <p className="text-slate-600">
                      {currentQuestionBank.description}
                    </p>
                  </div>
                )}
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

              {/* Manage Questions Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">
                  Manage Questions
                </h2>
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    currentQuestionBank.sourceType === "MANUAL"
                      ? "md:grid-cols-1"
                      : "md:grid-cols-2"
                  }`}
                >
                  <Button
                    variant="primary"
                    onClick={() => setShowAddManualQuestionModal(true)}
                    className="flex items-center justify-center space-x-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Add Manual Question</span>
                  </Button>

                  {/* Show Generate from Menu button only for MENU source type */}
                  {currentQuestionBank.sourceType === "MENU" && (
                    <Button
                      variant="secondary"
                      onClick={handleOpenGenerateAiQuestions}
                      className="flex items-center justify-center space-x-2"
                    >
                      <SparklesIcon className="h-5 w-5" />
                      <span>Generate from Menu</span>
                    </Button>
                  )}

                  {/* Show Generate from SOP button only for SOP source type */}
                  {currentQuestionBank.sourceType === "SOP" && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowGenerateSopAiModal(true)}
                      className="flex items-center justify-center space-x-2"
                    >
                      <DocumentTextIcon className="h-5 w-5" />
                      <span>Generate from SOP</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedQuestionIds.length > 0 && (
                <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <TrashIcon className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
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
                        className="text-sm"
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setIsConfirmBulkDeleteModalOpen(true)}
                        className="text-sm"
                      >
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                </div>
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
                        <div className="text-center py-12">
                          <BookOpenIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">
                            No active questions yet
                          </h3>
                          <p className="text-slate-500 mb-6">
                            Add questions to this bank to get started with quiz
                            creation.
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => setShowAddManualQuestionModal(true)}
                            className="flex items-center space-x-2 mx-auto"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Add First Question</span>
                          </Button>
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
