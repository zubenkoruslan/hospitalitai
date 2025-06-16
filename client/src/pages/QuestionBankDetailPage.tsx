import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import GenerateAiQuestionsForm from "../components/questionBank/GenerateAiQuestionsForm";
import GenerateAiQuestionsFormSop from "../components/questionBank/GenerateAiQuestionsFormSop";
import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm";
import EditQuestionForm from "../components/questionBank/EditQuestionForm";
import AiQuestionsPreview from "../components/questionBank/AiQuestionsPreview";
import Modal from "../components/common/Modal";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronRightIcon,
  TagIcon,
  FolderIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CheckIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Question List Item Component
const QuestionListItem: React.FC<{
  question: IQuestion;
  onRemove: (questionId: string) => void;
  onEdit: (question: IQuestion) => void;
  isSelected: boolean;
  onToggleSelect: (questionId: string) => void;
}> = ({ question, onRemove, onEdit, isSelected, onToggleSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatQuestionType = (type: string) => {
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getQuestionTypeColor = (type: string) => {
    const colors = {
      "multiple-choice": "bg-blue-100 text-blue-800 border-blue-200",
      "true-false": "bg-green-100 text-green-800 border-green-200",
      "short-answer": "bg-purple-100 text-purple-800 border-purple-200",
      "fill-in-blank": "bg-orange-100 text-orange-800 border-orange-200",
    };
    return (
      colors[type as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      {/* Collapsed View */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(question._id)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getQuestionTypeColor(
                    question.questionType
                  )}`}
                >
                  {formatQuestionType(question.questionType)}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {question.knowledgeCategory
                    .replace("-", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                {question.status === "pending_review" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Preview
                  </span>
                )}
              </div>
              <p
                className="text-slate-900 font-medium leading-relaxed cursor-pointer hover:text-slate-700 transition-colors duration-200"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  display: isExpanded ? "block" : "-webkit-box",
                  WebkitLineClamp: isExpanded ? "none" : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {question.questionText}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
            </button>
            <button
              onClick={() => onEdit(question)}
              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onRemove(question._id)}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="space-y-4">
              {/* Answer Options */}
              {question.options && question.options.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Answer Options:
                  </h4>
                  <div className="space-y-2">
                    {question.options.map((option, index) => (
                      <div
                        key={option._id || index}
                        className={`p-3 rounded-lg border ${
                          option.isCorrect
                            ? "bg-green-50 border-green-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-900">{option.text}</span>
                          {option.isCorrect && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckIcon className="h-3 w-3 mr-1" />
                              Correct
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer for non-multiple choice */}
              {(question as any).correctAnswer && !question.options?.length && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Correct Answer:
                  </h4>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-slate-900">
                      {(question as any).correctAnswer}
                    </span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              {question.explanation && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Explanation:
                  </h4>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-slate-900">
                      {question.explanation}
                    </span>
                  </div>
                </div>
              )}

              {/* Menu Category */}
              {(question as any).menuCategory && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Menu Category:
                  </h4>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    {(question as any).menuCategory}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QuestionBankDetailPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const { currentQuestionBank, isLoading, error, fetchQuestionBankById } =
    useQuestionBanks();

  // Navigation state
  const [selectedNavKnowledgeCategory, setSelectedNavKnowledgeCategory] =
    useState<KnowledgeCategory | null>(null);
  const [selectedNavQuestionType, setSelectedNavQuestionType] = useState<
    string | null
  >(null);
  const [selectedNavQuestionId, setSelectedNavQuestionId] = useState<
    string | null
  >(null);
  const [navSearchTerm, setNavSearchTerm] = useState("");
  const [expandedNavCategories, setExpandedNavCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandedNavSubcategories, setExpandedNavSubcategories] = useState<
    Record<string, boolean>
  >({});

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
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionToRemoveId, setQuestionToRemoveId] = useState<string | null>(
    null
  );
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(
    null
  );
  const [previewQuestions, setPreviewQuestions] = useState<IQuestion[]>([]);
  const [isAddingApprovedQuestions, setIsAddingApprovedQuestions] =
    useState(false);

  // Menu selection for AI generation
  const [selectedMenuForAi, setSelectedMenuForAi] = useState<string | null>(
    null
  );
  const [isMenuSelectionModalOpen, setIsMenuSelectionModalOpen] =
    useState(false);
  const [availableMenus, setAvailableMenus] = useState<any[]>([]);
  const [isLoadingMenusForAi, setIsLoadingMenusForAi] = useState(false);

  // Search input ref for maintaining focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tab state for active vs preview questions
  const [activeTab, setActiveTab] = useState<"active" | "preview">("active");

  const pageError =
    !currentQuestionBank && !isLoading ? "Question bank not found" : error;

  useEffect(() => {
    if (bankId && !currentQuestionBank && !isLoading) {
      fetchQuestionBankById(bankId);
    }
  }, [bankId, currentQuestionBank, isLoading, fetchQuestionBankById]);

  // Enhanced UX: Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus search input when "/" is pressed (like GitHub)
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const activeElement = document.activeElement;
        const isInInput =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";

        if (!isInInput) {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
      }

      // Clear search when Escape is pressed and search is focused
      if (
        event.key === "Escape" &&
        searchInputRef.current === document.activeElement
      ) {
        clearNavSearch();
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Helper functions
  const getAllQuestionsAsObjects = (): IQuestion[] => {
    if (!currentQuestionBank?.questions) {
      return [];
    }

    // Get all questions that are objects
    return currentQuestionBank.questions.filter(
      (q) => typeof q === "object"
    ) as IQuestion[];
  };

  const getActiveQuestionsAsObjects = (): IQuestion[] => {
    const allQuestions = getAllQuestionsAsObjects();
    // Active questions are those with status "active" or no status (default to active)
    return allQuestions.filter((q) => !q.status || q.status === "active");
  };

  const getPreviewQuestionsAsObjects = (): IQuestion[] => {
    const allQuestions = getAllQuestionsAsObjects();
    // Preview questions are those with status "pending_review"
    return allQuestions.filter((q) => q.status === "pending_review");
  };

  const getCurrentTabQuestions = (): IQuestion[] => {
    return activeTab === "active"
      ? getActiveQuestionsAsObjects()
      : getPreviewQuestionsAsObjects();
  };

  // Group questions by knowledge category and menu item category
  const groupedQuestionsByKnowledgeCategoryAndMenuCategory = useMemo(() => {
    const questions = getCurrentTabQuestions();
    return questions.reduce((acc, question) => {
      const knowledgeCategory = question.knowledgeCategory;

      // Use the first category from the question's categories array as the menu category
      // If no categories, use "Uncategorized"
      const menuCategory =
        question.categories && question.categories.length > 0
          ? question.categories[0]
          : "Uncategorized";

      if (!acc[knowledgeCategory]) {
        acc[knowledgeCategory] = {};
      }
      if (!acc[knowledgeCategory][menuCategory]) {
        acc[knowledgeCategory][menuCategory] = [];
      }
      acc[knowledgeCategory][menuCategory].push(question);
      return acc;
    }, {} as Record<KnowledgeCategory, Record<string, IQuestion[]>>);
  }, [currentQuestionBank?.questions, activeTab]);

  // Search functionality
  const navSearchResults = useMemo(() => {
    if (!navSearchTerm.trim()) {
      return { questions: [] };
    }

    const searchTerm = navSearchTerm.toLowerCase();
    const questions = getCurrentTabQuestions();

    const matchingQuestions = questions.filter(
      (question) =>
        question.questionText.toLowerCase().includes(searchTerm) ||
        question.knowledgeCategory.toLowerCase().includes(searchTerm) ||
        question.questionType.toLowerCase().includes(searchTerm)
    );

    return { questions: matchingQuestions.map((q) => q._id) };
  }, [navSearchTerm, currentQuestionBank?.questions, activeTab]);

  const isNavSearchMatch = (
    type: "knowledgeCategory" | "questionType" | "question",
    key: string
  ) => {
    if (!navSearchTerm.trim()) return false;
    const searchTerm = navSearchTerm.toLowerCase();

    if (type === "question") {
      return navSearchResults.questions.includes(key);
    } else if (type === "knowledgeCategory") {
      return key.toLowerCase().includes(searchTerm);
    } else if (type === "questionType") {
      return key.toLowerCase().includes(searchTerm);
    }

    return false;
  };

  // Navigation handlers
  const handleNavCategorySelect = (
    knowledgeCategory: KnowledgeCategory,
    questionType?: string,
    questionId?: string
  ) => {
    setSelectedNavKnowledgeCategory(knowledgeCategory);
    setSelectedNavQuestionType(questionType || null);
    setSelectedNavQuestionId(questionId || null);
  };

  const toggleNavCategoryExpansion = (categoryKey: string) => {
    setExpandedNavCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const toggleNavSubcategoryExpansion = (subcategoryKey: string) => {
    setExpandedNavSubcategories((prev) => ({
      ...prev,
      [subcategoryKey]: !prev[subcategoryKey],
    }));
  };

  const handleNavSearchChange = (value: string) => {
    setNavSearchTerm(value);
  };

  const clearNavSearch = () => {
    setNavSearchTerm("");
  };

  // Question management handlers
  const requestRemoveQuestion = (questionId: string) => {
    setQuestionToRemoveId(questionId);
    setIsConfirmRemoveModalOpen(true);
  };

  const handleCancelRemoveQuestion = () => {
    setQuestionToRemoveId(null);
    setIsConfirmRemoveModalOpen(false);
  };

  const executeRemoveQuestion = async () => {
    // Implementation would go here
    setIsConfirmRemoveModalOpen(false);
    setQuestionToRemoveId(null);
  };

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
      // Prepare the update data
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

      // Call the API to update the question
      await updateQuestion(updatedQuestion._id, updateData);

      // Refresh the question bank data to show the updated question
      if (bankId) {
        await fetchQuestionBankById(bankId);
      }

      handleCloseEditQuestionModal();
    } catch (error) {
      console.error("Error updating question:", error);
      alert("Error updating question. Please try again.");
    }
  };

  const handleToggleSelectQuestion = (questionId: string) => {
    setSelectedQuestionIds((prevSelected) =>
      prevSelected.includes(questionId)
        ? prevSelected.filter((id) => id !== questionId)
        : [...prevSelected, questionId]
    );
  };

  const handleManualQuestionSubmit = async (newQuestion: IQuestion) => {
    // Implementation would go here
    setShowAddManualQuestionModal(false);
  };

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

  // Handler to approve selected preview questions
  const handleApprovePreviewQuestions = async () => {
    if (selectedQuestionIds.length === 0) {
      alert("Please select questions to approve.");
      return;
    }

    try {
      setIsAddingApprovedQuestions(true);

      // Get the selected preview questions
      const selectedPreviewQuestions = getPreviewQuestionsAsObjects().filter(
        (q) => selectedQuestionIds.includes(q._id)
      );

      // Call the API to approve the questions (make them active)
      await processReviewedAiQuestions(bankId!, {
        acceptedQuestions: selectedPreviewQuestions,
        updatedQuestions: [],
        deletedQuestionIds: [],
      });

      // Clear selection and refresh data
      setSelectedQuestionIds([]);
      if (bankId) {
        await fetchQuestionBankById(bankId);
      }

      // Switch to active tab to see the newly approved questions
      setActiveTab("active");

      alert(
        `${selectedPreviewQuestions.length} questions approved and moved to active!`
      );
    } catch (error) {
      console.error("Error approving preview questions:", error);
      alert("Error approving questions. Please try again.");
    } finally {
      setIsAddingApprovedQuestions(false);
    }
  };

  // Helper functions for Select All/Deselect All
  const handleSelectAllPreviewQuestions = () => {
    const previewQuestions = getPreviewQuestionsAsObjects();
    const allPreviewQuestionIds = previewQuestions.map((q) => q._id);
    setSelectedQuestionIds(allPreviewQuestionIds);
  };

  const handleDeselectAllPreviewQuestions = () => {
    setSelectedQuestionIds([]);
  };

  const getSelectAllButtonState = () => {
    const previewQuestions = getPreviewQuestionsAsObjects();
    const allPreviewQuestionIds = previewQuestions.map((q) => q._id);
    const selectedPreviewQuestions = selectedQuestionIds.filter((id) =>
      allPreviewQuestionIds.includes(id)
    );

    return {
      totalPreview: previewQuestions.length,
      selectedPreview: selectedPreviewQuestions.length,
      allSelected:
        selectedPreviewQuestions.length === previewQuestions.length &&
        previewQuestions.length > 0,
      someSelected: selectedPreviewQuestions.length > 0,
    };
  };

  if (isLoading && !currentQuestionBank) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <LoadingSpinner message="Loading question bank..." />
          </div>
        </main>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        </main>
      </div>
    );
  }

  if (!currentQuestionBank) {
    return null;
  }

  // Table of Contents Component
  const TableOfContents: React.FC = () => {
    const knowledgeCategories = Object.keys(
      groupedQuestionsByKnowledgeCategoryAndMenuCategory
    ) as KnowledgeCategory[];

    const isSearchActive = navSearchTerm.trim() !== "";

    const shouldShowKnowledgeCategory = (
      knowledgeCategory: KnowledgeCategory
    ) => {
      if (!isSearchActive) return true;
      return (
        isNavSearchMatch("knowledgeCategory", knowledgeCategory) ||
        Object.keys(
          groupedQuestionsByKnowledgeCategoryAndMenuCategory[
            knowledgeCategory
          ] || {}
        ).some((menuCategory) =>
          isNavSearchMatch(
            "questionType",
            `${knowledgeCategory}-${menuCategory}`
          )
        ) ||
        Object.values(
          groupedQuestionsByKnowledgeCategoryAndMenuCategory[
            knowledgeCategory
          ] || {}
        ).some((questions: IQuestion[]) =>
          questions.some((question: IQuestion) =>
            isNavSearchMatch("question", question._id)
          )
        )
      );
    };

    const shouldShowMenuCategory = (
      knowledgeCategory: KnowledgeCategory,
      menuCategory: string
    ) => {
      if (!isSearchActive) return true;
      const categoryKey = `${knowledgeCategory}-${menuCategory}`;
      return (
        isNavSearchMatch("questionType", categoryKey) ||
        groupedQuestionsByKnowledgeCategoryAndMenuCategory[knowledgeCategory][
          menuCategory
        ].some((question: IQuestion) =>
          isNavSearchMatch("question", question._id)
        )
      );
    };

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
        {/* Search Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Questions Navigation
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 min-w-[24px] justify-center">
                {getCurrentTabQuestions().length}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {knowledgeCategories.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
                <BookOpenIcon className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {getCurrentTabQuestions().length === 0
                  ? "No questions yet"
                  : "No categorized questions"}
              </h3>
              <p className="text-slate-500 mb-4">
                {getCurrentTabQuestions().length === 0
                  ? "Add your first question to get started."
                  : `Found ${
                      getCurrentTabQuestions().length
                    } questions but they may not have proper categories.`}
              </p>
              <p className="text-slate-400 text-sm">
                Use the buttons in the header above to add questions.
              </p>
            </div>
          ) : (
            knowledgeCategories.map((knowledgeCategory, index) => {
              if (!shouldShowKnowledgeCategory(knowledgeCategory)) return null;

              const menuCategories = Object.keys(
                groupedQuestionsByKnowledgeCategoryAndMenuCategory[
                  knowledgeCategory
                ]
              );
              const isExpanded = expandedNavCategories[knowledgeCategory];
              const isSelected =
                selectedNavKnowledgeCategory === knowledgeCategory &&
                !selectedNavQuestionType;
              const isSearchHighlighted = isNavSearchMatch(
                "knowledgeCategory",
                knowledgeCategory
              );

              const totalQuestions = Object.values(
                groupedQuestionsByKnowledgeCategoryAndMenuCategory[
                  knowledgeCategory
                ]
              ).reduce(
                (sum: number, questions: IQuestion[]) => sum + questions.length,
                0
              );

              return (
                <div key={knowledgeCategory}>
                  {index > 0 && (
                    <div className="flex items-center my-6">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Knowledge Category Button */}
                    <button
                      onClick={() => {
                        handleNavCategorySelect(knowledgeCategory);
                        toggleNavCategoryExpansion(knowledgeCategory);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group ${
                        isSearchHighlighted
                          ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900"
                          : isSelected
                          ? "bg-blue-50 border-2 border-blue-300 text-blue-800"
                          : "hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected ? "bg-blue-100" : "bg-slate-100"
                          }`}
                        >
                          <TagIcon
                            className={`h-5 w-5 ${
                              isSelected ? "text-blue-600" : "text-slate-600"
                            }`}
                          />
                        </div>
                        <div className="text-left">
                          <span className="font-semibold">
                            {knowledgeCategory
                              .replace("-", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                          <div className="text-sm opacity-75">
                            {menuCategories.length} categories •{" "}
                            {totalQuestions} questions
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isSelected
                              ? "bg-blue-200 text-blue-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {totalQuestions}
                        </span>
                        {menuCategories.length > 0 && (
                          <ChevronRightIcon
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Menu Categories */}
                    {isExpanded && (
                      <div className="ml-6 space-y-2">
                        {menuCategories.map((menuCategory) => {
                          if (
                            !shouldShowMenuCategory(
                              knowledgeCategory,
                              menuCategory
                            )
                          )
                            return null;

                          const categoryQuestions =
                            groupedQuestionsByKnowledgeCategoryAndMenuCategory[
                              knowledgeCategory
                            ][menuCategory];
                          const categoryKey = `${knowledgeCategory}-${menuCategory}`;
                          const isCategorySelected =
                            selectedNavKnowledgeCategory ===
                              knowledgeCategory &&
                            selectedNavQuestionType === menuCategory &&
                            !selectedNavQuestionId;
                          const isCategoryExpanded =
                            expandedNavSubcategories[categoryKey];

                          return (
                            <div key={categoryKey}>
                              <button
                                onClick={() => {
                                  handleNavCategorySelect(
                                    knowledgeCategory,
                                    menuCategory
                                  );
                                  toggleNavSubcategoryExpansion(categoryKey);
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                                  isCategorySelected
                                    ? "bg-blue-50 border border-blue-200 text-blue-800"
                                    : "hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="p-1.5 bg-slate-100 rounded-md">
                                    <FolderIcon className="h-4 w-4 text-slate-600" />
                                  </div>
                                  <span className="font-medium text-sm">
                                    {menuCategory
                                      .split(" ")
                                      .map(
                                        (word: string) =>
                                          word.charAt(0).toUpperCase() +
                                          word.slice(1)
                                      )
                                      .join(" ")}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-medium">
                                    {categoryQuestions.length}
                                  </span>
                                  <ChevronRightIcon
                                    className={`h-3 w-3 transition-transform duration-200 ${
                                      isCategoryExpanded ? "rotate-90" : ""
                                    }`}
                                  />
                                </div>
                              </button>

                              {/* Individual Questions */}
                              {isCategoryExpanded && (
                                <div className="ml-6 mt-2 space-y-1">
                                  {categoryQuestions.map(
                                    (question: IQuestion) => {
                                      const isQuestionSelected =
                                        selectedNavQuestionId === question._id;
                                      const isQuestionHighlighted =
                                        isNavSearchMatch(
                                          "question",
                                          question._id
                                        );

                                      return (
                                        <button
                                          key={question._id}
                                          onClick={() =>
                                            handleNavCategorySelect(
                                              knowledgeCategory,
                                              menuCategory,
                                              question._id
                                            )
                                          }
                                          className={`w-full text-left p-2 rounded-md transition-all duration-200 text-sm ${
                                            isQuestionHighlighted
                                              ? "bg-yellow-100 border border-yellow-300 text-yellow-900"
                                              : isQuestionSelected
                                              ? "bg-blue-50 border border-blue-200 text-blue-800"
                                              : "hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200"
                                          }`}
                                        >
                                          <div className="flex items-center space-x-2">
                                            <DocumentTextIcon className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">
                                              {question.questionText.length > 50
                                                ? `${question.questionText.substring(
                                                    0,
                                                    50
                                                  )}...`
                                                : question.questionText}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Content Display Component
  const ContentDisplay: React.FC = () => {
    if (
      !selectedNavKnowledgeCategory &&
      !selectedNavQuestionType &&
      !selectedNavQuestionId
    ) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col justify-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-6">
            <BookOpenIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900 mb-3">
            {activeTab === "active" ? "Active Questions" : "Preview Questions"}
          </h3>
          <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
            {activeTab === "active"
              ? "Select a knowledge category or question type from the navigation panel to view and manage your active questions, or use the search to find specific questions quickly."
              : "Preview questions are pending approval. Select a category to review questions before they become active."}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              variant="primary"
              onClick={() => setShowAddManualQuestionModal(true)}
              className="flex items-center gap-2 px-6 py-3"
            >
              <PlusIcon className="h-5 w-5" />
              Add New Question
            </Button>
            {currentQuestionBank?.sourceType === "MENU" && (
              <Button
                variant="secondary"
                onClick={() => setShowGenerateAiQuestionsModal(true)}
                className="flex items-center gap-2 px-6 py-3"
              >
                <SparklesIcon className="h-5 w-5" />
                Generate from Menu
              </Button>
            )}
            {currentQuestionBank?.sourceType === "SOP" && (
              <Button
                variant="secondary"
                onClick={() => setShowGenerateSopAiModal(true)}
                className="flex items-center gap-2 px-6 py-3"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Generate from SOP
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Display individual question
    if (selectedNavQuestionId) {
      const selectedQuestion = getCurrentTabQuestions().find(
        (q) => q._id === selectedNavQuestionId
      );
      if (!selectedQuestion) {
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Question not found in {activeTab} questions
            </h3>
            <p className="text-slate-600">
              The selected question could not be found in the {activeTab}{" "}
              questions. It may be in the{" "}
              {activeTab === "active" ? "Preview" : "Active"} tab.
            </p>
          </div>
        );
      }

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b border-blue-200 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    Question Details
                  </h1>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                      {selectedNavKnowledgeCategory!
                        .replace("-", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-600">
                      {selectedNavQuestionType}
                    </span>
                    {selectedQuestion.status === "pending_review" && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          Preview
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEditQuestionModal(selectedQuestion)}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title="Edit Question"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => requestRemoveQuestion(selectedQuestion._id)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Delete Question"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Question Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Question Text */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Question
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-slate-900 leading-relaxed">
                    {selectedQuestion.questionText}
                  </p>
                </div>
              </div>

              {/* Question Type and Categories */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Question Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Question Type
                    </label>
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      {selectedQuestion.questionType
                        .split("-")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Knowledge Category
                    </label>
                    <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedQuestion.knowledgeCategory
                        .replace("-", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Categories */}
              {selectedQuestion.categories &&
                selectedQuestion.categories.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Menu Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedQuestion.categories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Answer Options */}
              {selectedQuestion.options &&
                selectedQuestion.options.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Answer Options
                    </h3>
                    <div className="space-y-3">
                      {selectedQuestion.options.map((option, index) => (
                        <div
                          key={option._id || index}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            option.isCorrect
                              ? "bg-green-50 border-green-300 shadow-sm"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="text-slate-900 font-medium">
                                {option.text}
                              </span>
                            </div>
                            {option.isCorrect && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
                                <CheckIcon className="h-4 w-4 mr-1" />
                                Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Explanation */}
              {selectedQuestion.explanation && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    Explanation
                  </h3>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-900 leading-relaxed">
                        {selectedQuestion.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selection Checkbox */}
              <div className="pt-4 border-t border-slate-200">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(selectedQuestion._id)}
                    onChange={() =>
                      handleToggleSelectQuestion(selectedQuestion._id)
                    }
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Select this question for batch operations
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Display questions by menu category
    if (selectedNavQuestionType) {
      const categoryQuestions =
        groupedQuestionsByKnowledgeCategoryAndMenuCategory[
          selectedNavKnowledgeCategory!
        ]?.[selectedNavQuestionType] || [];

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 border-b border-amber-200 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <FolderIcon className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {selectedNavQuestionType
                      .split(" ")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </h1>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-200 text-amber-800">
                      {selectedNavKnowledgeCategory!
                        .replace("-", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-600">
                      {categoryQuestions.length}{" "}
                      {categoryQuestions.length === 1
                        ? "question"
                        : "questions"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="flex-1 p-6 overflow-y-auto">
            {categoryQuestions.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-6">
                  <FolderIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No {activeTab} questions in this category
                </h3>
                <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                  {activeTab === "active"
                    ? "This menu category has no active questions. Add your first question to get started."
                    : "This menu category has no preview questions. Generate AI questions or check the Active tab for existing questions."}
                </p>
                {activeTab === "active" && (
                  <p className="text-slate-400 text-sm">
                    Use the buttons in the header above to add questions.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {categoryQuestions.map((question) => (
                  <QuestionListItem
                    key={question._id}
                    question={question}
                    onRemove={requestRemoveQuestion}
                    onEdit={handleOpenEditQuestionModal}
                    isSelected={selectedQuestionIds.includes(question._id)}
                    onToggleSelect={handleToggleSelectQuestion}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Display knowledge category overview
    if (selectedNavKnowledgeCategory) {
      const categoryQuestions = Object.values(
        groupedQuestionsByKnowledgeCategoryAndMenuCategory[
          selectedNavKnowledgeCategory
        ] || {}
      ).flat();
      const menuCategories = Object.keys(
        groupedQuestionsByKnowledgeCategoryAndMenuCategory[
          selectedNavKnowledgeCategory
        ] || {}
      );

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TagIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedNavKnowledgeCategory
                      .replace("-", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                    Questions
                  </h2>
                  <p className="text-slate-600">
                    {categoryQuestions.length} total questions •{" "}
                    {menuCategories.length} menu categories
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-4">
              {menuCategories.map((menuCategory) => {
                const categoryQuestions =
                  groupedQuestionsByKnowledgeCategoryAndMenuCategory[
                    selectedNavKnowledgeCategory!
                  ][menuCategory];
                if (categoryQuestions.length === 0) return null;

                return (
                  <div
                    key={menuCategory}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() =>
                      handleNavCategorySelect(
                        selectedNavKnowledgeCategory!,
                        menuCategory
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FolderIcon className="h-5 w-5 text-slate-500" />
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {menuCategory
                              .split(" ")
                              .map(
                                (word: string) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {categoryQuestions.length} question
                            {categoryQuestions.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

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
                    <div className="p-3 bg-emerald-600 rounded-xl shadow-lg">
                      <BookOpenIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <button
                          onClick={() => navigate("/quiz-management")}
                          className="flex items-center text-slate-300 hover:text-white transition-colors duration-200 text-sm font-medium"
                        >
                          <ArrowLeftIcon className="h-4 w-4 mr-2" />
                          Quiz Management
                        </button>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300 text-sm">
                          Question Bank Details
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-white">
                        {currentQuestionBank.name}
                      </h1>
                      {currentQuestionBank.description && (
                        <p className="text-slate-300 mt-2 font-medium">
                          {currentQuestionBank.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="white"
                      onClick={() => setShowAddManualQuestionModal(true)}
                      className="!bg-emerald-700 !hover:bg-emerald-600 !text-white !border-emerald-600 shadow-lg"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Manual Question
                    </Button>
                    <Button
                      variant="white"
                      onClick={() => {
                        if (currentQuestionBank.sourceType === "SOP") {
                          setShowGenerateSopAiModal(true);
                        } else {
                          setShowGenerateAiQuestionsModal(true);
                        }
                      }}
                      className="!bg-purple-700 !hover:bg-purple-600 !text-white !border-purple-600 shadow-lg"
                    >
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Generate AI Questions
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleOpenEditBankModal}
                      className="shadow-lg"
                    >
                      <PencilIcon className="h-5 w-5 mr-2" />
                      Edit Details
                    </Button>
                  </div>
                </div>
              </div>

              {/* Enhanced Global Search Bar */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="max-w-2xl mx-auto">
                  <div className="relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search questions, categories, types... (Press / to focus)"
                      value={navSearchTerm}
                      onChange={(e) => handleNavSearchChange(e.target.value)}
                      className="w-full pl-12 pr-16 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white shadow-inner"
                      aria-label="Search questions, categories, and types"
                      autoComplete="off"
                    />

                    {/* Search shortcut hint */}
                    {!navSearchTerm && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-gray-400">
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-md">
                          /
                        </kbd>
                      </div>
                    )}

                    {/* Clear search button */}
                    {navSearchTerm && (
                      <button
                        onClick={clearNavSearch}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 group"
                        aria-label="Clear search (Esc)"
                        title="Clear search (Esc)"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Enhanced Search Results Summary */}
                  {navSearchTerm.trim() && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <BookOpenIcon className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">
                            {navSearchResults.questions.length} questions
                          </span>
                        </div>
                        <div className="text-blue-600">
                          for "{navSearchTerm}"
                        </div>
                      </div>

                      {/* No results found */}
                      {navSearchResults.questions.length === 0 && (
                        <div className="mt-2 text-center text-blue-700">
                          <div className="flex items-center justify-center space-x-2">
                            <span>No matches found.</span>
                            <button
                              onClick={clearNavSearch}
                              className="text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                              Clear search
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs for Active vs Preview Questions */}
              <div className="mb-6">
                <div className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                      <button
                        onClick={() => setActiveTab("active")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "active"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Active Questions
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getActiveQuestionsAsObjects().length}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab("preview")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "preview"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Preview Questions
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {getPreviewQuestionsAsObjects().length}
                        </span>
                      </button>
                    </nav>

                    {/* Preview Tab Controls */}
                    {activeTab === "preview" && (
                      <div className="flex items-center gap-3">
                        {/* Select All/Deselect All Buttons */}
                        {(() => {
                          const selectState = getSelectAllButtonState();
                          return selectState.totalPreview > 0 ? (
                            <div className="flex items-center gap-2">
                              {!selectState.allSelected ? (
                                <button
                                  onClick={handleSelectAllPreviewQuestions}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                  Select All ({selectState.totalPreview})
                                </button>
                              ) : (
                                <button
                                  onClick={handleDeselectAllPreviewQuestions}
                                  className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                  Deselect All
                                </button>
                              )}
                            </div>
                          ) : null;
                        })()}

                        {/* Approve Selected Questions Button - Only show with selected questions */}
                        {selectedQuestionIds.length > 0 && (
                          <button
                            onClick={handleApprovePreviewQuestions}
                            disabled={isAddingApprovedQuestions}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
                          >
                            <CheckIcon className="h-4 w-4" />
                            {isAddingApprovedQuestions
                              ? "Approving..."
                              : `Approve ${
                                  selectedQuestionIds.length
                                } Question${
                                  selectedQuestionIds.length === 1 ? "" : "s"
                                }`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Two-column layout: Table of Contents and Content Display */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-400px)]">
                {/* Table of Contents - Left Column */}
                <div className="lg:col-span-1">
                  <TableOfContents />
                </div>

                {/* Content Display - Right Column */}
                <div className="lg:col-span-2">
                  <ContentDisplay />
                </div>
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
              // Switch to preview tab to show the new questions
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
            onQuestionsGenerated={(questions: IQuestion[]) => {
              setPreviewQuestions(questions);
              setShowGenerateSopAiModal(false);
              setShowPreviewModal(true);
              // Switch to preview tab to show the new questions
              setActiveTab("preview");
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
                console.log(
                  "Adding questions to preview:",
                  approvedQuestionIds
                );
                console.log(
                  "Preview questions available:",
                  previewQuestions.length
                );

                // Filter the preview questions to get only the approved ones
                const approvedQuestions = previewQuestions.filter((q) =>
                  approvedQuestionIds.includes(q._id)
                );

                console.log(
                  "Filtered approved questions:",
                  approvedQuestions.length
                );

                // Call the new API to add questions with pending_review status
                const result = await addQuestionsAsPendingReview(
                  bankId!,
                  approvedQuestions
                );

                console.log("API result:", result);

                setShowPreviewModal(false);
                setPreviewQuestions([]);
                // Refresh the question bank data to show the new preview questions
                if (bankId) {
                  await fetchQuestionBankById(bankId);
                }
                // Switch to preview tab to see the newly added questions
                setActiveTab("preview");
              } catch (error) {
                console.error("Error adding questions to preview:", error);
                // You might want to show a toast notification here
                alert("Error adding questions to preview. Please try again.");
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
