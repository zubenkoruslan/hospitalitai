import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import {
  IQuestion,
  IQuestionBank,
  KnowledgeCategory,
  UpdateQuestionClientData,
} from "../types/questionBankTypes";
import {
  processReviewedAiQuestions,
  addQuestionsAsPendingReview,
  updateQuestion,
} from "../services/api";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import Modal from "../components/common/Modal";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";

// New components
import QuestionStatsCards from "../components/questionBank/QuestionStatsCards";
import QuestionFilters from "../components/questionBank/QuestionFilters";
import BulkActionsBar from "../components/questionBank/BulkActionsBar";
import QuestionTable from "../components/questionBank/QuestionTable";

// Existing modal components
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import GenerateAiQuestionsForm from "../components/questionBank/GenerateAiQuestionsForm";
import GenerateAiQuestionsFormSop from "../components/questionBank/GenerateAiQuestionsFormSop";
import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";
import AiQuestionsPreview from "../components/questionBank/AiQuestionsPreview";

import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const QuestionBankDetailPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const {
    currentQuestionBank,
    isLoading,
    error,
    fetchQuestionBankById,
    removeQuestionFromCurrentBank,
  } = useQuestionBanks();

  // Tab state
  const [activeTab, setActiveTab] = useState<"active" | "preview">("active");

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<KnowledgeCategory | null>(null);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<
    string | null
  >(null);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<string>("questionText");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Modal states
  const [showAddManualQuestionModal, setShowAddManualQuestionModal] =
    useState(false);
  const [showGenerateAiQuestionsModal, setShowGenerateAiQuestionsModal] =
    useState(false);
  const [showGenerateSopAiModal, setShowGenerateSopAiModal] = useState(false);
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [isConfirmRemoveModalOpen, setIsConfirmRemoveModalOpen] =
    useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Question management states
  const [questionToRemoveId, setQuestionToRemoveId] = useState<string | null>(
    null
  );
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(
    null
  );
  const [previewQuestions, setPreviewQuestions] = useState<IQuestion[]>([]);
  const [isAddingApprovedQuestions, setIsAddingApprovedQuestions] =
    useState(false);

  // Loading states
  const [message, setMessage] = useState<string | null>(null);

  const pageError =
    !currentQuestionBank && !isLoading ? "Question bank not found" : error;

  useEffect(() => {
    if (bankId && !currentQuestionBank && !isLoading) {
      fetchQuestionBankById(bankId);
    }
  }, [bankId, currentQuestionBank, isLoading, fetchQuestionBankById]);

  // Helper functions to get questions
  const getAllQuestionsAsObjects = (): IQuestion[] => {
    if (!currentQuestionBank?.questions) {
      return [];
    }
    return currentQuestionBank.questions.filter(
      (q) => typeof q === "object"
    ) as IQuestion[];
  };

  const getActiveQuestionsAsObjects = (): IQuestion[] => {
    const allQuestions = getAllQuestionsAsObjects();
    return allQuestions.filter((q) => !q.status || q.status === "active");
  };

  const getPreviewQuestionsAsObjects = (): IQuestion[] => {
    const allQuestions = getAllQuestionsAsObjects();
    return allQuestions.filter((q) => q.status === "pending_review");
  };

  const getCurrentTabQuestions = (): IQuestion[] => {
    return activeTab === "active"
      ? getActiveQuestionsAsObjects()
      : getPreviewQuestionsAsObjects();
  };

  // Memoized filtered and sorted questions
  const filteredAndSortedQuestions = useMemo(() => {
    let questions = getCurrentTabQuestions();

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      questions = questions.filter(
        (question) =>
          question.questionText.toLowerCase().includes(searchLower) ||
          question.knowledgeCategory.toLowerCase().includes(searchLower) ||
          (question.categories &&
            question.categories.some((cat) =>
              cat.toLowerCase().includes(searchLower)
            ))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      questions = questions.filter(
        (question) => question.knowledgeCategory === selectedCategory
      );
    }

    // Apply menu category filter
    if (selectedMenuCategory) {
      questions = questions.filter(
        (question) =>
          question.categories &&
          question.categories.includes(selectedMenuCategory)
      );
    }

    // Apply sorting
    questions.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case "questionText":
          valA = a.questionText.toLowerCase();
          valB = b.questionText.toLowerCase();
          break;
        case "knowledgeCategory":
          valA = a.knowledgeCategory.toLowerCase();
          valB = b.knowledgeCategory.toLowerCase();
          break;
        case "createdAt":
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return questions;
  }, [
    getCurrentTabQuestions(),
    searchTerm,
    selectedCategory,
    selectedMenuCategory,
    sortField,
    sortDirection,
  ]);

  // Calculate stats for filters
  const questionStats = useMemo(() => {
    const currentQuestions = getCurrentTabQuestions();

    const categoryCounts: Record<KnowledgeCategory, number> = {
      "food-knowledge": 0,
      "beverage-knowledge": 0,
      "wine-knowledge": 0,
      "procedures-knowledge": 0,
    };

    const menuCategoryCounts: Record<string, number> = {};
    const availableMenuCategories: string[] = [];

    currentQuestions.forEach((question) => {
      // Count by category
      if (question.knowledgeCategory) {
        categoryCounts[question.knowledgeCategory] =
          (categoryCounts[question.knowledgeCategory] || 0) + 1;
      }

      // Count by menu categories
      if (question.categories && question.categories.length > 0) {
        question.categories.forEach((category) => {
          menuCategoryCounts[category] =
            (menuCategoryCounts[category] || 0) + 1;
          if (!availableMenuCategories.includes(category)) {
            availableMenuCategories.push(category);
          }
        });
      }
    });

    return {
      categoryCounts,
      menuCategoryCounts,
      availableMenuCategories: availableMenuCategories.sort(),
    };
  }, [getCurrentTabQuestions()]);

  // Event handlers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleToggleSelectQuestion = (questionId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleSelectAllQuestions = () => {
    const currentQuestionIds = filteredAndSortedQuestions.map((q) => q._id);
    setSelectedQuestionIds(currentQuestionIds);
  };

  const handleDeselectAllQuestions = () => {
    setSelectedQuestionIds([]);
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedMenuCategory(null);
    setSearchTerm("");
  };

  // Question CRUD handlers
  const handleOpenEditQuestionModal = (question: IQuestion) => {
    setEditingQuestion(question);
    setIsEditQuestionModalOpen(true);
  };

  const handleCloseEditQuestionModal = () => {
    setEditingQuestion(null);
    setIsEditQuestionModalOpen(false);
  };

  const handleQuestionUpdatedInModal = async (updatedQuestion: IQuestion) => {
    try {
      const updateData: UpdateQuestionClientData = {
        questionText: updatedQuestion.questionText,
        questionType: updatedQuestion.questionType,
        options: updatedQuestion.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        categories: updatedQuestion.categories,
        explanation: updatedQuestion.explanation,
        knowledgeCategory: updatedQuestion.knowledgeCategory,
      };

      await updateQuestion(updatedQuestion._id, updateData);

      if (bankId) {
        await fetchQuestionBankById(bankId);
      }

      handleCloseEditQuestionModal();
      setMessage("Question updated successfully.");
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error updating question:", error);
      setMessage("Error updating question. Please try again.");
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const requestRemoveQuestion = (questionId: string) => {
    setQuestionToRemoveId(questionId);
    setIsConfirmRemoveModalOpen(true);
  };

  const handleCancelRemoveQuestion = () => {
    setQuestionToRemoveId(null);
    setIsConfirmRemoveModalOpen(false);
  };

  const executeRemoveQuestion = async () => {
    if (!questionToRemoveId) return;

    try {
      await removeQuestionFromCurrentBank(questionToRemoveId);

      setMessage("Question removed successfully from the bank.");
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error removing question from bank:", error);
      setMessage("Error removing question. Please try again.");
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsConfirmRemoveModalOpen(false);
      setQuestionToRemoveId(null);
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedQuestionIds.length === 0) return;

    const confirmMessage = `Are you sure you want to remove ${
      selectedQuestionIds.length
    } question${
      selectedQuestionIds.length === 1 ? "" : "s"
    } from this bank? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        // Remove questions one by one using the hook method
        for (const questionId of selectedQuestionIds) {
          await removeQuestionFromCurrentBank(questionId);
        }

        setSelectedQuestionIds([]);
        setMessage(
          `${selectedQuestionIds.length} question${
            selectedQuestionIds.length === 1 ? "" : "s"
          } removed successfully from the bank.`
        );
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error("Error removing questions from bank:", error);
        setMessage("Error removing questions. Please try again.");
        setTimeout(() => setMessage(null), 5000);
      }
    }
  };

  const handleBulkApprove = async () => {
    if (selectedQuestionIds.length === 0) return;

    try {
      setIsAddingApprovedQuestions(true);

      const selectedPreviewQuestions = getPreviewQuestionsAsObjects().filter(
        (q) => selectedQuestionIds.includes(q._id)
      );

      await processReviewedAiQuestions(bankId!, {
        acceptedQuestions: selectedPreviewQuestions,
        updatedQuestions: [],
        deletedQuestionIds: [],
      });

      setSelectedQuestionIds([]);
      if (bankId) {
        await fetchQuestionBankById(bankId);
      }

      setActiveTab("active");
      setMessage(
        `${selectedPreviewQuestions.length} questions approved and moved to active!`
      );
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Error approving preview questions:", error);
      setMessage("Error approving questions. Please try again.");
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsAddingApprovedQuestions(false);
    }
  };

  // Bank management handlers
  const handleOpenEditBankModal = () => {
    setIsEditBankModalOpen(true);
  };

  const handleCloseEditBankModal = () => {
    setIsEditBankModalOpen(false);
  };

  const handleBankDetailsUpdated = (_updatedBank: IQuestionBank) => {
    handleCloseEditBankModal();
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
  };

  const handleManualQuestionSubmit = async (newQuestion: IQuestion) => {
    setShowAddManualQuestionModal(false);
    if (bankId) {
      await fetchQuestionBankById(bankId);
    }
    setMessage("Question added successfully.");
    setTimeout(() => setMessage(null), 3000);
  };

  // Tab configuration
  const tabs = [
    {
      id: "active",
      name: "Active Questions",
      count: getActiveQuestionsAsObjects().length,
    },
    {
      id: "preview",
      name: "Preview Questions",
      count: getPreviewQuestionsAsObjects().length,
    },
  ] as const;

  if (isLoading && !currentQuestionBank) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner message="Loading question bank..." />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-red-900">
                      Unable to Load Question Bank
                    </h3>
                    <p className="text-red-700 mt-1">{String(pageError)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!currentQuestionBank) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <button
                      onClick={() => navigate("/quiz-management")}
                      className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 text-sm font-medium"
                    >
                      <ArrowLeftIcon className="h-4 w-4 mr-2" />
                      Quiz Management
                    </button>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-sm">
                      Question Bank Details
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <BookOpenIcon className="h-8 w-8 text-emerald-600" />
                    {currentQuestionBank.name}
                  </h1>
                  {currentQuestionBank.description && (
                    <p className="text-gray-600 mt-1">
                      {currentQuestionBank.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddManualQuestionModal(true)}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Manual Question
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (currentQuestionBank.sourceType === "SOP") {
                        setShowGenerateSopAiModal(true);
                      } else {
                        setShowGenerateAiQuestionsModal(true);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Generate AI Questions
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleOpenEditBankModal}
                    className="flex items-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit Details
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6">
                <QuestionStatsCards questions={getCurrentTabQuestions()} />
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">{message}</span>
                </div>
                <button
                  type="button"
                  className="text-green-500 hover:text-green-700 transition-colors"
                  onClick={() => setMessage(null)}
                  aria-label="Dismiss"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <ErrorMessage
                  message={String(error)}
                  onDismiss={() => setMessage(null)}
                />
              </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      } flex items-center gap-2 whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg`}
                    >
                      {tab.name}
                      {tab.count > 0 && (
                        <span
                          className={`${
                            activeTab === tab.id
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          } inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium min-w-[20px] h-5`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 space-y-6">
                {/* Search and Filters */}
                <QuestionFilters
                  searchTerm={searchTerm}
                  selectedCategory={selectedCategory}
                  selectedMenuCategory={selectedMenuCategory}
                  showFilters={showFilters}
                  onSearchChange={setSearchTerm}
                  onCategoryChange={setSelectedCategory}
                  onMenuCategoryChange={setSelectedMenuCategory}
                  onToggleFilters={() => setShowFilters(!showFilters)}
                  onClearFilters={handleClearFilters}
                  availableMenuCategories={
                    questionStats.availableMenuCategories
                  }
                  categoryCounts={questionStats.categoryCounts}
                  menuCategoryCounts={questionStats.menuCategoryCounts}
                  totalQuestions={getCurrentTabQuestions().length}
                />

                {/* Bulk Actions */}
                <BulkActionsBar
                  selectedIds={selectedQuestionIds}
                  totalItems={filteredAndSortedQuestions.length}
                  activeTab={activeTab}
                  onSelectAll={handleSelectAllQuestions}
                  onDeselectAll={handleDeselectAllQuestions}
                  onBulkDelete={handleBulkDelete}
                  onBulkApprove={
                    activeTab === "preview" ? handleBulkApprove : undefined
                  }
                  isLoading={isAddingApprovedQuestions}
                />

                {/* Questions Table */}
                <QuestionTable
                  questions={filteredAndSortedQuestions}
                  selectedIds={selectedQuestionIds}
                  onToggleSelect={handleToggleSelectQuestion}
                  onSort={handleSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onEdit={handleOpenEditQuestionModal}
                  onDelete={requestRemoveQuestion}
                  activeTab={activeTab}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddManualQuestionModal && currentQuestionBank && (
        <Modal
          isOpen={showAddManualQuestionModal}
          onClose={() => setShowAddManualQuestionModal(false)}
          title="Add New Manual Question"
        >
          <AddManualQuestionForm
            onQuestionAdded={handleManualQuestionSubmit}
            onCloseRequest={() => setShowAddManualQuestionModal(false)}
            initialBankCategories={currentQuestionBank.categories}
            questionBankId={bankId!}
          />
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

      {showGenerateAiQuestionsModal && currentQuestionBank && (
        <Modal
          isOpen={showGenerateAiQuestionsModal}
          onClose={() => setShowGenerateAiQuestionsModal(false)}
          title="Generate AI Questions"
        >
          <GenerateAiQuestionsForm
            bankId={bankId!}
            menuId={currentQuestionBank.sourceMenuId || ""}
            onAiQuestionsGenerated={(questions: IQuestion[]) => {
              setPreviewQuestions(questions);
              setShowGenerateAiQuestionsModal(false);
              setShowPreviewModal(true);
              setActiveTab("preview");
            }}
            onCloseRequest={() => setShowGenerateAiQuestionsModal(false)}
            initialCategories={currentQuestionBank.categories}
          />
        </Modal>
      )}

      {showGenerateSopAiModal && currentQuestionBank && (
        <Modal
          isOpen={showGenerateSopAiModal}
          onClose={() => setShowGenerateSopAiModal(false)}
          title="Generate SOP AI Questions"
        >
          <GenerateAiQuestionsFormSop
            bankId={bankId!}
            bankName={currentQuestionBank.name}
            sopDocumentId={currentQuestionBank.sourceSopDocumentId || ""}
            sopDocumentTitle={currentQuestionBank.sourceSopDocumentTitle}
            existingBankCategories={currentQuestionBank.categories}
            onQuestionsGenerated={async () => {
              // SOP questions are saved directly to pending review, so refresh the data
              setShowGenerateSopAiModal(false);
              if (bankId) {
                await fetchQuestionBankById(bankId);
              }
              setActiveTab("preview"); // Switch to preview tab to see the pending questions
            }}
            onCloseRequest={() => setShowGenerateSopAiModal(false)}
          />
        </Modal>
      )}

      {showPreviewModal && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Preview Generated Questions"
          size="lg"
        >
          <AiQuestionsPreview
            questions={previewQuestions}
            onApprove={async (approvedQuestionIds) => {
              setIsAddingApprovedQuestions(true);
              try {
                const approvedQuestions = previewQuestions.filter((q) =>
                  approvedQuestionIds.includes(q._id)
                );

                await addQuestionsAsPendingReview(bankId!, approvedQuestions);

                setShowPreviewModal(false);
                setPreviewQuestions([]);
                if (bankId) {
                  await fetchQuestionBankById(bankId);
                }
                setActiveTab("preview");
              } catch (error) {
                console.error("Error adding questions to preview:", error);
                setMessage(
                  "Error adding questions to preview. Please try again."
                );
                setTimeout(() => setMessage(null), 5000);
              } finally {
                setIsAddingApprovedQuestions(false);
              }
            }}
            onCancel={() => {
              setShowPreviewModal(false);
              setPreviewQuestions([]);
            }}
            isLoading={isAddingApprovedQuestions}
          />
        </Modal>
      )}
    </div>
  );
};

export default QuestionBankDetailPage;
