import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  getQuestionBanks,
  deleteQuestionBank,
  getQuizzes,
  getRestaurantQuizStaffProgress,
  updateQuizDetails,
  deleteQuiz,
} from "../services/api";

import { ClientIQuiz } from "../types/quizTypes";
import { ClientStaffQuizProgress } from "../types/staffTypes";
import { IQuestionBank } from "../types/questionBankTypes";

import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
import Modal from "../components/common/Modal";
import {
  ChevronRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ListBulletIcon,
  ClockIcon,
  UserGroupIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  SparklesIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  HomeIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

// Question Bank Components
import CreateQuestionBankForm from "../components/questionBank/CreateQuestionBankForm";

// Quiz Components
import GenerateQuizFromBanksModal from "../components/quiz/GenerateQuizFromBanksModal";
import StaffQuizProgressModal from "../components/quiz/StaffQuizProgressModal";
import EditQuizModal from "../components/quiz/EditQuizModal";

// Define SourceType for filter
type QuestionBankSourceFilterType = "ALL" | "SOP" | "MENU" | "MANUAL";

// Define view types for navigation
type ViewType = "overview" | "question-banks" | "quizzes";

// Search results interface
interface SearchResults {
  sections: ViewType[];
  questionBanks: string[];
  quizzes: string[];
}

// Enhanced search interfaces for Phase 3
interface SearchFilters {
  categories: string[];
  sourceTypes: string[];
  statuses: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface SearchSuggestion {
  text: string;
  type: "recent" | "category" | "sourceType" | "status";
  count?: number;
}

const QuizAndBankManagementPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const navigate = useNavigate();

  const [questionBanks, setQuestionBanks] = useState<IQuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<ClientIQuiz[]>([]);

  // === PHASE 1: New Navigation State Variables ===
  const [selectedView, setSelectedView] = useState<ViewType>("overview");
  const [selectedQuestionBankId, setSelectedQuestionBankId] = useState<
    string | null
  >(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Simple search state (matching working pages)
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{
    questionBanks: string[];
    quizzes: string[];
  }>({ questionBanks: [], quizzes: [] });

  // UI state for expandable sections in navigation
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    "question-banks": true,
    quizzes: true,
  });

  // Filter state (still used by new components)
  const [questionBankSourceFilter, setQuestionBankSourceFilter] =
    useState<QuestionBankSourceFilterType>("ALL");

  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal States - Question Banks
  const [isCreateBankModalOpen, setIsCreateBankModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<IQuestionBank | null>(null);

  // Modal States - Quizzes
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<ClientIQuiz | null>(null);

  // Edit Quiz Modal states
  const [isEditQuizModalOpen, setIsEditQuizModalOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<ClientIQuiz | null>(null);

  // Deactivation Confirmation Modal states
  const [isConfirmDeactivateModalOpen, setIsConfirmDeactivateModalOpen] =
    useState(false);
  const [quizToDeactivateTarget, setQuizToDeactivateTarget] =
    useState<ClientIQuiz | null>(null);

  // Staff Quiz Progress Modal states
  const [isStaffProgressModalOpen, setIsStaffProgressModalOpen] =
    useState(false);
  const [selectedQuizForProgress, setSelectedQuizForProgress] =
    useState<ClientIQuiz | null>(null);
  const [staffProgressData, setStaffProgressData] = useState<
    ClientStaffQuizProgress[] | null
  >(null);
  const [isLoadingStaffProgress, setIsLoadingStaffProgress] =
    useState<boolean>(false);
  const [staffProgressError, setStaffProgressError] = useState<string | null>(
    null
  );

  // Search input ref for keyboard shortcuts and UX improvements
  const searchInputRef = useRef<HTMLInputElement>(null);

  // === PHASE 1: Navigation Helper Functions ===
  const handleViewChange = (view: ViewType) => {
    setSelectedView(view);
    // Clear selections when changing main view
    setSelectedQuestionBankId(null);
    setSelectedQuizId(null);
  };

  const handleQuestionBankSelect = (bankId: string) => {
    setSelectedView("question-banks");
    setSelectedQuestionBankId(bankId);
    setSelectedQuizId(null);
  };

  const handleQuizSelect = (quizId: string) => {
    setSelectedView("quizzes");
    setSelectedQuizId(quizId);
    setSelectedQuestionBankId(null);
  };

  const toggleSectionExpansion = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Simple search functionality (matching working pages)
  const performSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults({ questionBanks: [], quizzes: [] });
      return;
    }

    const term = searchTerm.toLowerCase();
    const matchingQuestionBanks: string[] = [];
    const matchingQuizzes: string[] = [];

    // Search in question banks
    questionBanks.forEach((bank) => {
      const matches =
        bank.name.toLowerCase().includes(term) ||
        bank.description?.toLowerCase().includes(term) ||
        bank.sourceSopDocumentTitle?.toLowerCase().includes(term) ||
        bank.sourceMenuName?.toLowerCase().includes(term) ||
        bank.sourceType.toLowerCase().includes(term) ||
        bank.categories?.some((cat) => cat.toLowerCase().includes(term));

      if (matches) {
        matchingQuestionBanks.push(bank._id);
      }
    });

    // Search in quizzes
    quizzes.forEach((quiz) => {
      const matches =
        quiz.title.toLowerCase().includes(term) ||
        quiz.description?.toLowerCase().includes(term) ||
        quiz.targetRoles?.some((role) =>
          (typeof role === "string" ? role : role.name)
            .toLowerCase()
            .includes(term)
        );

      if (matches) {
        matchingQuizzes.push(quiz._id);
      }
    });

    setSearchResults({
      questionBanks: matchingQuestionBanks,
      quizzes: matchingQuizzes,
    });
  };

  // Handle search input changes (matching working pages)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    performSearch(value);
  };

  // Clear search (matching working pages)
  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults({ questionBanks: [], quizzes: [] });
  };

  // Check if item matches search (matching working pages)
  const isSearchMatch = (type: "questionBank" | "quiz", id: string) => {
    if (!searchTerm.trim()) return false;
    return type === "questionBank"
      ? searchResults.questionBanks.includes(id)
      : searchResults.quizzes.includes(id);
  };

  // Existing handlers and logic...
  const fetchBanks = useCallback(async () => {
    setIsLoadingBanks(true);
    setError(null);
    try {
      const banks = await getQuestionBanks();
      setQuestionBanks(banks || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch question banks."
      );
      setQuestionBanks([]);
    } finally {
      setIsLoadingBanks(false);
    }
  }, []);

  // Filtered Question Banks based on search and filter
  // Filtered question banks based on source filter only (search now handled by global search)
  const filteredQuestionBanks = React.useMemo(() => {
    if (questionBankSourceFilter === "ALL") {
      return questionBanks;
    }
    return questionBanks.filter(
      (bank) => bank.sourceType === questionBankSourceFilter
    );
  }, [questionBanks, questionBankSourceFilter]);

  // All quizzes (search now handled by global search)
  const filteredQuizzes = React.useMemo(() => {
    return quizzes;
  }, [quizzes]);

  const fetchQuizzesList = useCallback(async () => {
    setIsLoadingQuizzes(true);
    setError(null);
    try {
      const fetchedQuizzes = await getQuizzes();
      setQuizzes(fetchedQuizzes || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch quizzes.");
      setQuizzes([]);
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
    fetchQuizzesList();
  }, [fetchBanks, fetchQuizzesList]);

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
        clearSearch();
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [clearSearch]);

  // Dismiss success/error messages
  const dismissMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setStaffProgressError(null);
  };

  useEffect(() => {
    if (error || successMessage || staffProgressError) {
      const timer = setTimeout(dismissMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage, staffProgressError]);

  // Question Bank Handlers
  const handleCreateBankSuccess = (details: {
    bankId: string;
    sourceType: string;
    generationMethod?: string;
  }) => {
    setSuccessMessage("Question bank created successfully!");
    setIsCreateBankModalOpen(false);
    fetchBanks();
    if (
      details.sourceType === "sop" &&
      details.generationMethod === "manual" &&
      details.bankId
    ) {
      navigate(`/question-banks/${details.bankId}`);
    }
  };

  const handleDeleteBank = async () => {
    if (!bankToDelete) return;
    setIsLoadingBanks(true);
    try {
      await deleteQuestionBank(bankToDelete._id);
      setQuestionBanks((prev) =>
        prev.filter((b) => b._id !== bankToDelete._id)
      );
      setSuccessMessage(`Question bank "${bankToDelete.name}" deleted.`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to delete question bank."
      );
    } finally {
      setBankToDelete(null);
      setIsLoadingBanks(false);
    }
  };

  // Quiz Handlers
  const handleQuizGenerated = (newQuiz: ClientIQuiz) => {
    setQuizzes((prevQuizzes) => [newQuiz, ...prevQuizzes]);
    setSuccessMessage(`Quiz "${newQuiz.title}" generated successfully!`);
    setIsGenerateQuizModalOpen(false);
  };

  const handleQuizUpdated = (updatedQuiz: ClientIQuiz) => {
    setQuizzes((prevQuizzes) =>
      prevQuizzes.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q))
    );
    setSuccessMessage(`Quiz "${updatedQuiz.title}" updated successfully!`);
    setIsEditQuizModalOpen(false);
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      await deleteQuiz(quizToDelete._id);
      setQuizzes((prev) => prev.filter((q) => q._id !== quizToDelete._id));
      setSuccessMessage(`Quiz "${quizToDelete.title}" deleted.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setQuizToDelete(null);
    }
  };

  const handleViewQuizProgress = async (quizId: string) => {
    const quiz = quizzes.find((q) => q._id === quizId);
    if (!quiz) {
      console.error(`Quiz with id ${quizId} not found for progress view.`);
      return;
    }

    setSelectedQuizForProgress(quiz);
    setIsStaffProgressModalOpen(true);
    setIsLoadingStaffProgress(true);
    setStaffProgressError(null);
    setStaffProgressData(null);

    try {
      const progress = await getRestaurantQuizStaffProgress(quizId);
      setStaffProgressData(progress);
    } catch (err: any) {
      setStaffProgressError(
        err.response?.data?.message || "Failed to load staff progress."
      );
    } finally {
      setIsLoadingStaffProgress(false);
    }
  };

  const handleActivateQuiz = async (quizId: string) => {
    setError(null);
    setSuccessMessage(null);
    const quizToActivate = quizzes.find((q) => q._id === quizId);
    if (!quizToActivate) {
      setError("Quiz not found for activation.");
      return;
    }

    try {
      const updatedQuiz = await updateQuizDetails(quizId, {
        isAvailable: true,
      });
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q))
      );
      setSuccessMessage(`Quiz "${updatedQuiz.title}" activated successfully.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to activate quiz.");
    }
  };

  const handleDeactivateQuiz = (quizId: string) => {
    setError(null);
    setSuccessMessage(null);
    const quiz = quizzes.find((q) => q._id === quizId);
    if (!quiz) {
      setError("Quiz not found for deactivation.");
      return;
    }
    setQuizToDeactivateTarget(quiz);
    setIsConfirmDeactivateModalOpen(true);
  };

  const confirmDeactivateQuiz = async () => {
    if (!quizToDeactivateTarget) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const updatedQuiz = await updateQuizDetails(quizToDeactivateTarget._id, {
        isAvailable: false,
      });
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q))
      );
      setSuccessMessage(
        `Quiz "${updatedQuiz.title}" deactivated successfully.`
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to deactivate quiz.");
    } finally {
      setIsConfirmDeactivateModalOpen(false);
      setQuizToDeactivateTarget(null);
    }
  };

  const handleManageBankQuestions = (bankId: string) => {
    navigate(`/question-banks/${bankId}`);
  };

  const handleOpenEditQuizModal = (quiz: ClientIQuiz) => {
    setQuizToEdit(quiz);
    setIsEditQuizModalOpen(true);
  };

  // Statistics calculations
  const stats = React.useMemo(() => {
    const totalQuestions = questionBanks.reduce(
      (sum, bank) =>
        sum +
        (Array.isArray(bank.questions)
          ? bank.questions.length
          : bank.questionCount || 0),
      0
    );
    const activeQuizzes = quizzes.filter((quiz) => quiz.isAvailable).length;
    const inactiveQuizzes = quizzes.filter((quiz) => !quiz.isAvailable).length;

    return {
      totalBanks: questionBanks.length,
      totalQuestions,
      totalQuizzes: quizzes.length,
      activeQuizzes,
      inactiveQuizzes,
    };
  }, [questionBanks, quizzes]);

  // === PHASE 1: Content Display Component ===
  const ContentDisplay = () => {
    // Enhanced Breadcrumb component for better navigation
    const Breadcrumb = () => {
      const breadcrumbItems = [];

      if (selectedView === "question-banks" && selectedQuestionBankId) {
        const bank = questionBanks.find(
          (b) => b._id === selectedQuestionBankId
        );
        breadcrumbItems.push(
          {
            label: "Question Banks",
            onClick: () => setSelectedQuestionBankId(null),
            icon: BookOpenIcon,
          },
          {
            label: bank?.name || "Unknown",
            onClick: () => {},
            icon: null,
          }
        );
      } else if (selectedView === "quizzes" && selectedQuizId) {
        const quiz = quizzes.find((q) => q._id === selectedQuizId);
        breadcrumbItems.push(
          {
            label: "Quizzes",
            onClick: () => setSelectedQuizId(null),
            icon: AcademicCapIcon,
          },
          {
            label: quiz?.title || "Unknown",
            onClick: () => {},
            icon: null,
          }
        );
      }

      if (breadcrumbItems.length === 0) return null;

      return (
        <nav
          className="flex items-center space-x-1 text-sm"
          aria-label="Breadcrumb"
        >
          <button
            onClick={() => {
              setSelectedView("overview");
              setSelectedQuestionBankId(null);
              setSelectedQuizId(null);
            }}
            className="flex items-center space-x-1 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-all duration-200"
          >
            <HomeIcon className="h-4 w-4" />
            <span>Management Center</span>
          </button>
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-1">
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
              <button
                onClick={item.onClick}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-all duration-200 ${
                  index === breadcrumbItems.length - 1
                    ? "text-slate-900 font-medium bg-white/70"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span className="truncate max-w-[150px]">{item.label}</span>
              </button>
            </div>
          ))}
        </nav>
      );
    };

    // Enhanced loading skeleton component
    const ContentSkeleton = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full p-6">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 bg-slate-200 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-6 bg-slate-200 rounded-lg w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-full"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

    if (isLoadingBanks || isLoadingQuizzes) {
      return <ContentSkeleton />;
    }

    // Question Banks Overview
    const QuestionBanksOverview = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 border-b border-emerald-200 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl shadow-sm">
                <BookOpenIcon className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-emerald-900 mb-2">
                  Question Banks
                </h1>
                <p className="text-emerald-700">
                  {stats.totalBanks} banks • {stats.totalQuestions} questions
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsCreateBankModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              Create Bank
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {filteredQuestionBanks.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 mb-6 shadow-lg">
                <BookOpenIcon className="h-12 w-12 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No question banks yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Question banks are collections of questions that can be used to
                create quizzes. Start by creating your first question bank from
                your SOPs or menus.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={() => setIsCreateBankModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create Question Bank
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open("/help/question-banks", "_blank")}
                  className="flex items-center gap-2 px-6 py-3"
                >
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                  Learn More
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredQuestionBanks.map((bank) => (
                <div
                  key={bank._id}
                  className="bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] group"
                  onClick={() => handleQuestionBankSelect(bank._id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <BookOpenIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {bank.name}
                          </h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {bank.sourceType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
                        {Array.isArray(bank.questions)
                          ? bank.questions.length
                          : bank.questionCount || 0}{" "}
                        questions
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        {bank.createdAt
                          ? new Date(bank.createdAt).toLocaleDateString()
                          : "Unknown date"}
                      </div>
                      {bank.sourceType === "SOP" &&
                        bank.sourceSopDocumentTitle && (
                          <div className="flex items-center text-blue-600">
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            {bank.sourceSopDocumentTitle}
                          </div>
                        )}
                      {bank.sourceType === "MENU" && bank.sourceMenuName && (
                        <div className="flex items-center text-emerald-600">
                          <ListBulletIcon className="h-4 w-4 mr-2" />
                          {bank.sourceMenuName}
                        </div>
                      )}
                    </div>

                    {bank.description && (
                      <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                        {bank.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageBankQuestions(bank._id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Manage
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBankToDelete(bank);
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );

    // Quizzes Overview
    const QuizzesOverview = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 border-b border-indigo-200 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl shadow-sm">
                <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-indigo-900 mb-2">
                  Quizzes
                </h1>
                <p className="text-indigo-700">
                  {stats.totalQuizzes} total • {stats.activeQuizzes} active
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsGenerateQuizModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <SparklesIcon className="h-4 w-4" />
              Generate Quiz
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {filteredQuizzes.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 mb-6 shadow-lg">
                <AcademicCapIcon className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No quizzes yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Quizzes test your staff's knowledge based on your question
                banks. Generate your first quiz to start training your team.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={() => setIsGenerateQuizModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <SparklesIcon className="h-5 w-5" />
                  Generate Quiz
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open("/help/quizzes", "_blank")}
                  className="flex items-center gap-2 px-6 py-3"
                >
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                  Learn More
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz._id}
                  className="bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] group"
                  onClick={() => handleQuizSelect(quiz._id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <AcademicCapIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {quiz.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              quiz.isAvailable
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                            }`}
                          >
                            {quiz.isAvailable ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
                        {quiz.totalUniqueQuestionsInSourceSnapshot || 0}{" "}
                        questions
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        {quiz.createdAt
                          ? new Date(quiz.createdAt).toLocaleDateString()
                          : "Unknown date"}
                      </div>
                      {quiz.targetRoles && quiz.targetRoles.length > 0 && (
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-2" />
                          {quiz.targetRoles
                            .map((role) =>
                              typeof role === "string" ? role : role.name
                            )
                            .join(", ")}
                        </div>
                      )}
                    </div>

                    {quiz.description && (
                      <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditQuizModal(quiz);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewQuizProgress(quiz._id);
                          }}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Progress
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuizToDelete(quiz);
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );

    // Question Bank Detail View
    const QuestionBankDetail = ({ bankId }: { bankId: string }) => {
      const bank = questionBanks.find((b) => b._id === bankId);

      if (!bank) {
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col justify-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-3">
              Question Bank Not Found
            </h3>
            <p className="text-slate-600 mb-8">
              The question bank you're looking for doesn't exist or has been
              deleted.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedQuestionBankId(null);
                setSelectedView("question-banks");
              }}
            >
              Back to Question Banks
            </Button>
          </div>
        );
      }

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
          {/* Enhanced Header with Breadcrumbs and Actions */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200 rounded-t-2xl">
            {/* Breadcrumb Row */}
            <div className="px-6 pt-4 pb-2">
              <Breadcrumb />
            </div>

            {/* Main Header Content */}
            <div className="px-6 pb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl shadow-sm flex-shrink-0">
                    <BookOpenIcon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-emerald-900 mb-2 truncate">
                      {bank.name}
                    </h1>
                    <div className="flex items-center flex-wrap gap-3 text-emerald-700">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {bank.sourceType}
                      </span>
                      <span className="flex items-center text-sm">
                        <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                        {Array.isArray(bank.questions)
                          ? bank.questions.length
                          : bank.questionCount || 0}{" "}
                        questions
                      </span>
                      <span className="flex items-center text-sm">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {bank.createdAt
                          ? new Date(bank.createdAt).toLocaleDateString()
                          : "Unknown date"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Responsive Layout */}
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  <div className="hidden lg:flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleManageBankQuestions(bank._id)}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <CogIcon className="h-4 w-4" />
                      Manage
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setBankToDelete(bank)}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>

                  {/* Mobile Menu Button */}
                  <div className="lg:hidden">
                    <Button
                      variant="secondary"
                      className="p-2"
                      onClick={() => {
                        /* Add mobile menu logic */
                      }}
                    >
                      <CogIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Description */}
            {bank.description && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Description
                </h3>
                <p className="text-slate-700">{bank.description}</p>
              </div>
            )}

            {/* Source Information */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Source Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Source Type
                  </label>
                  <p className="text-slate-900">{bank.sourceType}</p>
                </div>
                {bank.sourceType === "SOP" && bank.sourceSopDocumentTitle && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      SOP Document
                    </label>
                    <p className="text-slate-900">
                      {bank.sourceSopDocumentTitle}
                    </p>
                  </div>
                )}
                {bank.sourceType === "MENU" && bank.sourceMenuName && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Menu
                    </label>
                    <p className="text-slate-900">{bank.sourceMenuName}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Created
                  </label>
                  <p className="text-slate-900">
                    {bank.createdAt
                      ? new Date(bank.createdAt).toLocaleDateString()
                      : "Unknown date"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Last Updated
                  </label>
                  <p className="text-slate-900">
                    {bank.updatedAt
                      ? new Date(bank.updatedAt).toLocaleDateString()
                      : "Unknown date"}
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Quick Actions */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-slate-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleManageBankQuestions(bank._id)}
                  className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CogIcon className="h-4 w-4" />
                  Manage Questions
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsGenerateQuizModalOpen(true)}
                  className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Generate Quiz
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedQuestionBankId(null);
                    setSelectedView("question-banks");
                  }}
                  className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to Banks
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Quiz Detail View
    const QuizDetail = ({ quizId }: { quizId: string }) => {
      const quiz = quizzes.find((q) => q._id === quizId);

      if (!quiz) {
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col justify-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-3">
              Quiz Not Found
            </h3>
            <p className="text-slate-600 mb-8">
              The quiz you're looking for doesn't exist or has been deleted.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedQuizId(null);
                setSelectedView("quizzes");
              }}
            >
              Back to Quizzes
            </Button>
          </div>
        );
      }

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
          {/* Enhanced Header with Breadcrumbs and Actions */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200 rounded-t-2xl">
            {/* Breadcrumb Row */}
            <div className="px-6 pt-4 pb-2">
              <Breadcrumb />
            </div>

            {/* Main Header Content */}
            <div className="px-6 pb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl shadow-sm flex-shrink-0">
                    <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-indigo-900 mb-2 truncate">
                      {quiz.title}
                    </h1>
                    <div className="flex items-center flex-wrap gap-3 text-indigo-700">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          quiz.isAvailable
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {quiz.isAvailable ? "Active" : "Inactive"}
                      </span>
                      <span className="flex items-center text-sm">
                        <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                        {quiz.totalUniqueQuestionsInSourceSnapshot || 0}{" "}
                        questions
                      </span>
                      <span className="flex items-center text-sm">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {quiz.createdAt
                          ? new Date(quiz.createdAt).toLocaleDateString()
                          : "Unknown date"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Responsive Layout */}
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  <div className="hidden lg:flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleOpenEditQuizModal(quiz)}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleViewQuizProgress(quiz._id)}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      Progress
                    </Button>
                    {quiz.isAvailable ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleDeactivateQuiz(quiz._id)}
                        className="flex items-center gap-2 px-4 py-2"
                      >
                        <PauseIcon className="h-4 w-4" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleActivateQuiz(quiz._id)}
                        className="flex items-center gap-2 px-4 py-2"
                      >
                        <PlayIcon className="h-4 w-4" />
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => setQuizToDelete(quiz)}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>

                  {/* Mobile Menu Button */}
                  <div className="lg:hidden">
                    <Button
                      variant="secondary"
                      className="p-2"
                      onClick={() => {
                        /* Add mobile menu logic */
                      }}
                    >
                      <CogIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Description */}
            {quiz.description && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Description
                </h3>
                <p className="text-slate-700">{quiz.description}</p>
              </div>
            )}

            {/* Quiz Information */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Quiz Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Status
                  </label>
                  <p
                    className={`font-medium ${
                      quiz.isAvailable ? "text-green-600" : "text-gray-600"
                    }`}
                  >
                    {quiz.isAvailable ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Questions
                  </label>
                  <p className="text-slate-900">
                    {quiz.totalUniqueQuestionsInSourceSnapshot || 0}
                  </p>
                </div>
                {quiz.targetRoles && quiz.targetRoles.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Target Roles
                    </label>
                    <p className="text-slate-900">
                      {quiz.targetRoles
                        .map((role) =>
                          typeof role === "string" ? role : role.name
                        )
                        .join(", ")}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Created
                  </label>
                  <p className="text-slate-900">
                    {quiz.createdAt
                      ? new Date(quiz.createdAt).toLocaleDateString()
                      : "Unknown date"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Last Updated
                  </label>
                  <p className="text-slate-900">
                    {quiz.updatedAt
                      ? new Date(quiz.updatedAt).toLocaleDateString()
                      : "Unknown date"}
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Quick Actions */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-slate-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleOpenEditQuizModal(quiz)}
                  className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Quiz
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleViewQuizProgress(quiz._id)}
                  className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  View Progress
                </Button>
                {quiz.isAvailable ? (
                  <Button
                    variant="secondary"
                    onClick={() => handleDeactivateQuiz(quiz._id)}
                    className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <PauseIcon className="h-4 w-4" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleActivateQuiz(quiz._id)}
                    className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Activate
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedQuizId(null);
                    setSelectedView("quizzes");
                  }}
                  className="flex items-center gap-2 justify-center py-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to Quizzes
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Overview content
    if (selectedView === "overview") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
          <Breadcrumb />

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200 rounded-t-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl shadow-sm">
                <ChartPieIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Overview Dashboard
                </h1>
                <p className="text-slate-600">
                  Monitor your training materials and quiz performance
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">
                      Question Banks
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats.totalBanks}
                    </p>
                  </div>
                  <BookOpenIcon className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">
                      Total Questions
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.totalQuestions}
                    </p>
                  </div>
                  <ListBulletIcon className="h-8 w-8 text-purple-400" />
                </div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-600 text-sm font-medium">
                      Active Quizzes
                    </p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {stats.activeQuizzes}
                    </p>
                  </div>
                  <PlayIcon className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">
                      Total Quizzes
                    </p>
                    <p className="text-2xl font-bold text-orange-900">
                      {stats.totalQuizzes}
                    </p>
                  </div>
                  <AcademicCapIcon className="h-8 w-8 text-orange-400" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => setIsCreateBankModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <BookOpenIcon className="h-4 w-4" />
                  Create Question Bank
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsGenerateQuizModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Generate Quiz
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleViewChange("question-banks")}
                  className="flex items-center gap-2"
                >
                  <EyeIcon className="h-4 w-4" />
                  View All Banks
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleViewChange("quizzes")}
                  className="flex items-center gap-2"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  View All Quizzes
                </Button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Recent Items
              </h3>
              <div className="space-y-3">
                {[...questionBanks.slice(0, 3), ...quizzes.slice(0, 2)].map(
                  (item) => {
                    const isBank = "sourceType" in item;
                    return (
                      <div
                        key={item._id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            isBank ? "bg-emerald-100" : "bg-indigo-100"
                          }`}
                        >
                          {isBank ? (
                            <BookOpenIcon className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AcademicCapIcon className="h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {isBank
                              ? (item as IQuestionBank).name
                              : (item as ClientIQuiz).title}
                          </p>
                          <p className="text-sm text-slate-500">
                            {isBank ? "Question Bank" : "Quiz"} •{" "}
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString()
                              : "Unknown date"}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (isBank) {
                              handleQuestionBankSelect(item._id);
                            } else {
                              handleQuizSelect(item._id);
                            }
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <ChevronRightIcon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Question Banks view
    if (selectedView === "question-banks") {
      if (selectedQuestionBankId) {
        return <QuestionBankDetail bankId={selectedQuestionBankId} />;
      }
      return <QuestionBanksOverview />;
    }

    // Quizzes view
    if (selectedView === "quizzes") {
      if (selectedQuizId) {
        return <QuizDetail quizId={selectedQuizId} />;
      }
      return <QuizzesOverview />;
    }

    // Default content when nothing is selected
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col justify-center">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-6">
          <AcademicCapIcon className="h-10 w-10 text-blue-600" />
        </div>
        <h3 className="text-2xl font-semibold text-slate-900 mb-3">
          Welcome to Quiz Management
        </h3>
        <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
          Select an item from the navigation panel to view details, or use the
          overview to see your dashboard.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            variant="primary"
            onClick={() => setIsCreateBankModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3"
          >
            <BookOpenIcon className="h-5 w-5" />
            Create Question Bank
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsGenerateQuizModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3"
          >
            <SparklesIcon className="h-5 w-5" />
            Generate Quiz
          </Button>
        </div>
      </div>
    );
  };

  // === PHASE 1: Navigation Panel Component ===
  const NavigationPanel = () => {
    const isSearchActive = searchTerm.trim() !== "";

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col hover:shadow-md transition-shadow duration-300">
        {/* Search Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Management Center
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 min-w-[24px] justify-center">
                {stats.totalBanks + stats.totalQuizzes}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                onClick={() => setIsCreateBankModalOpen(true)}
                className="flex items-center gap-2 text-sm px-3 py-2"
              >
                <BookOpenIcon className="h-4 w-4" />
                <span className="hidden sm:inline">New Bank</span>
              </Button>
            </div>
          </div>

          {/* Search Results Summary */}
          {isSearchActive && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  {searchResults.questionBanks.length +
                    searchResults.quizzes.length}{" "}
                  items found
                </span>
                <span className="text-slate-500">
                  Searching for "{searchTerm}"
                </span>
              </div>

              {/* Search breakdown */}
              {(searchResults.questionBanks.length > 0 ||
                searchResults.quizzes.length > 0) && (
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  {searchResults.questionBanks.length > 0 && (
                    <span className="flex items-center">
                      <BookOpenIcon className="h-3 w-3 mr-1" />
                      {searchResults.questionBanks.length} banks
                    </span>
                  )}
                  {searchResults.quizzes.length > 0 && (
                    <span className="flex items-center">
                      <AcademicCapIcon className="h-3 w-3 mr-1" />
                      {searchResults.quizzes.length} quizzes
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 max-h-full">
          {/* Overview Section */}
          <div>
            <button
              onClick={() => handleViewChange("overview")}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group relative overflow-hidden transform hover:scale-[1.02] ${
                selectedView === "overview"
                  ? "bg-gradient-to-r from-blue-50 via-blue-100 to-indigo-50 border-2 border-blue-300 text-blue-800 shadow-lg ring-1 ring-blue-200"
                  : "hover:bg-gradient-to-r hover:from-slate-50 hover:via-slate-100 hover:to-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg hover:shadow-slate-200/50"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    selectedView === "overview"
                      ? "bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-100 shadow-md"
                      : "bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300 group-hover:shadow-sm"
                  }`}
                >
                  <HomeIcon
                    className={`h-6 w-6 ${
                      selectedView === "overview"
                        ? "text-blue-700"
                        : "text-slate-600 group-hover:text-slate-700"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <span
                    className={`font-bold text-lg ${
                      selectedView === "overview"
                        ? "text-blue-900"
                        : "text-slate-800 group-hover:text-slate-900"
                    }`}
                  >
                    Overview
                  </span>
                  <div
                    className={`text-sm mt-1 font-medium ${
                      selectedView === "overview"
                        ? "text-blue-600"
                        : "text-slate-500 group-hover:text-slate-600"
                    }`}
                  >
                    Dashboard & Analytics
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Question Banks Section */}
          <div>
            <button
              onClick={() => {
                handleViewChange("question-banks");
                toggleSectionExpansion("question-banks");
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group relative overflow-hidden transform hover:scale-[1.02] ${
                searchResults.questionBanks.length > 0
                  ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900 shadow-md ring-1 ring-yellow-200"
                  : selectedView === "question-banks"
                  ? "bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-50 border-2 border-emerald-300 text-emerald-800 shadow-lg ring-1 ring-emerald-200"
                  : "hover:bg-gradient-to-r hover:from-slate-50 hover:via-slate-100 hover:to-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg hover:shadow-slate-200/50"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    selectedView === "question-banks"
                      ? "bg-gradient-to-br from-emerald-100 via-emerald-200 to-emerald-100 shadow-md"
                      : "bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300 group-hover:shadow-sm"
                  }`}
                >
                  <BookOpenIcon
                    className={`h-6 w-6 ${
                      selectedView === "question-banks"
                        ? "text-emerald-700"
                        : "text-slate-600 group-hover:text-slate-700"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <span
                    className={`font-bold text-lg ${
                      searchResults.questionBanks.length > 0
                        ? "text-yellow-900"
                        : selectedView === "question-banks"
                        ? "text-emerald-900"
                        : "text-slate-800 group-hover:text-slate-900"
                    }`}
                  >
                    Question Banks
                  </span>
                  <div
                    className={`text-sm mt-1 font-medium ${
                      searchResults.questionBanks.length > 0
                        ? "text-yellow-700"
                        : selectedView === "question-banks"
                        ? "text-emerald-600"
                        : "text-slate-500 group-hover:text-slate-600"
                    }`}
                  >
                    {stats.totalBanks} banks • {stats.totalQuestions} questions
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm min-w-[24px] text-center ${
                    selectedView === "question-banks"
                      ? "bg-emerald-200 text-emerald-800 border border-emerald-300"
                      : "bg-slate-200 text-slate-700 border border-slate-300 group-hover:bg-slate-300 group-hover:border-slate-400"
                  }`}
                >
                  {stats.totalBanks}
                </span>
                <div
                  className={`p-2 rounded-full transition-all duration-200 ${
                    selectedView === "question-banks"
                      ? "bg-emerald-200"
                      : "bg-slate-200 group-hover:bg-slate-300"
                  }`}
                >
                  <ChevronRightIcon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      expandedSections["question-banks"] ? "rotate-90" : ""
                    } ${
                      selectedView === "question-banks"
                        ? "text-emerald-700"
                        : "text-slate-600 group-hover:text-slate-700"
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Question Banks List */}
            {expandedSections["question-banks"] && (
              <div className="ml-6 mt-3 space-y-2">
                {(isSearchActive
                  ? questionBanks.filter((bank) =>
                      isSearchMatch("questionBank", bank._id)
                    )
                  : questionBanks.slice(0, 5)
                ).map((bank) => (
                  <button
                    key={bank._id}
                    onClick={() => handleQuestionBankSelect(bank._id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                      isSearchMatch("questionBank", bank._id)
                        ? "bg-yellow-100 border border-yellow-300 text-yellow-900 shadow-md"
                        : selectedQuestionBankId === bank._id
                        ? "bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-300 text-emerald-800 shadow-sm"
                        : "hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200 hover:shadow-sm"
                    } text-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            selectedQuestionBankId === bank._id
                              ? "bg-emerald-200"
                              : "bg-slate-100 group-hover:bg-slate-200"
                          }`}
                        >
                          <BookOpenIcon
                            className={`h-4 w-4 ${
                              selectedQuestionBankId === bank._id
                                ? "text-emerald-600"
                                : "text-slate-500 group-hover:text-slate-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium truncate ${
                              isSearchMatch("questionBank", bank._id)
                                ? "text-yellow-900"
                                : selectedQuestionBankId === bank._id
                                ? "text-emerald-900"
                                : "text-slate-800"
                            }`}
                          >
                            {bank.name}
                          </div>
                          <div
                            className={`text-xs mt-0.5 ${
                              isSearchMatch("questionBank", bank._id)
                                ? "text-yellow-700"
                                : selectedQuestionBankId === bank._id
                                ? "text-emerald-600"
                                : "text-slate-500"
                            }`}
                          >
                            {bank.sourceType} •{" "}
                            {Array.isArray(bank.questions)
                              ? bank.questions.length
                              : bank.questionCount || 0}{" "}
                            questions
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {questionBanks.length > 5 && !isSearchActive && (
                  <div className="text-center">
                    <button
                      onClick={() => handleViewChange("question-banks")}
                      className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all duration-200"
                    >
                      View all {questionBanks.length} question banks →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quizzes Section */}
          <div>
            <button
              onClick={() => {
                handleViewChange("quizzes");
                toggleSectionExpansion("quizzes");
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group relative overflow-hidden transform hover:scale-[1.02] ${
                searchResults.quizzes.length > 0
                  ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900 shadow-md ring-1 ring-yellow-200"
                  : selectedView === "quizzes"
                  ? "bg-gradient-to-r from-indigo-50 via-indigo-100 to-indigo-50 border-2 border-indigo-300 text-indigo-800 shadow-lg ring-1 ring-indigo-200"
                  : "hover:bg-gradient-to-r hover:from-slate-50 hover:via-slate-100 hover:to-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg hover:shadow-slate-200/50"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    selectedView === "quizzes"
                      ? "bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-100 shadow-md"
                      : "bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300 group-hover:shadow-sm"
                  }`}
                >
                  <AcademicCapIcon
                    className={`h-6 w-6 ${
                      selectedView === "quizzes"
                        ? "text-indigo-700"
                        : "text-slate-600 group-hover:text-slate-700"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <span
                    className={`font-bold text-lg ${
                      searchResults.quizzes.length > 0
                        ? "text-yellow-900"
                        : selectedView === "quizzes"
                        ? "text-indigo-900"
                        : "text-slate-800 group-hover:text-slate-900"
                    }`}
                  >
                    Quizzes
                  </span>
                  <div
                    className={`text-sm mt-1 font-medium ${
                      searchResults.quizzes.length > 0
                        ? "text-yellow-700"
                        : selectedView === "quizzes"
                        ? "text-indigo-600"
                        : "text-slate-500 group-hover:text-slate-600"
                    }`}
                  >
                    {stats.totalQuizzes} total • {stats.activeQuizzes} active
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm min-w-[24px] text-center ${
                    selectedView === "quizzes"
                      ? "bg-indigo-200 text-indigo-800 border border-indigo-300"
                      : "bg-slate-200 text-slate-700 border border-slate-300 group-hover:bg-slate-300 group-hover:border-slate-400"
                  }`}
                >
                  {stats.totalQuizzes}
                </span>
                <div
                  className={`p-2 rounded-full transition-all duration-200 ${
                    selectedView === "quizzes"
                      ? "bg-indigo-200"
                      : "bg-slate-200 group-hover:bg-slate-300"
                  }`}
                >
                  <ChevronRightIcon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      expandedSections["quizzes"] ? "rotate-90" : ""
                    } ${
                      selectedView === "quizzes"
                        ? "text-indigo-700"
                        : "text-slate-600 group-hover:text-slate-700"
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Quizzes List */}
            {expandedSections["quizzes"] && (
              <div className="ml-6 mt-3 space-y-2">
                {(isSearchActive
                  ? quizzes.filter((quiz) => isSearchMatch("quiz", quiz._id))
                  : quizzes.slice(0, 5)
                ).map((quiz) => (
                  <button
                    key={quiz._id}
                    onClick={() => handleQuizSelect(quiz._id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                      isSearchMatch("quiz", quiz._id)
                        ? "bg-yellow-100 border border-yellow-300 text-yellow-900 shadow-md"
                        : selectedQuizId === quiz._id
                        ? "bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-300 text-indigo-800 shadow-sm"
                        : "hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200 hover:shadow-sm"
                    } text-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            selectedQuizId === quiz._id
                              ? "bg-indigo-200"
                              : "bg-slate-100 group-hover:bg-slate-200"
                          }`}
                        >
                          <AcademicCapIcon
                            className={`h-4 w-4 ${
                              selectedQuizId === quiz._id
                                ? "text-indigo-600"
                                : "text-slate-500 group-hover:text-slate-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium truncate ${
                              isSearchMatch("quiz", quiz._id)
                                ? "text-yellow-900"
                                : selectedQuizId === quiz._id
                                ? "text-indigo-900"
                                : "text-slate-800"
                            }`}
                          >
                            {quiz.title}
                          </div>
                          <div
                            className={`text-xs mt-0.5 flex items-center space-x-2 ${
                              isSearchMatch("quiz", quiz._id)
                                ? "text-yellow-700"
                                : selectedQuizId === quiz._id
                                ? "text-indigo-600"
                                : "text-slate-500"
                            }`}
                          >
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                quiz.isAvailable
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {quiz.isAvailable ? "Active" : "Inactive"}
                            </span>
                            <span>•</span>
                            <span>
                              {quiz.totalUniqueQuestionsInSourceSnapshot || 0}{" "}
                              questions
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {quizzes.length > 5 && !isSearchActive && (
                  <div className="text-center">
                    <button
                      onClick={() => handleViewChange("quizzes")}
                      className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all duration-200"
                    >
                      View all {quizzes.length} quizzes →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Empty Search State */}
          {isSearchActive &&
            searchResults.questionBanks.length === 0 &&
            searchResults.quizzes.length === 0 && (
              <div className="text-center py-12 px-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
                  <MagnifyingGlassIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No results found
                </h3>
                <p className="text-slate-500 mb-4">
                  No items match "{searchTerm}". Try a different search term.
                </p>
                <Button
                  variant="secondary"
                  onClick={clearSearch}
                  className="text-sm"
                >
                  Clear search
                </Button>
              </div>
            )}
        </div>
      </div>
    );
  };

  // Legacy Question Bank List Item Component (for content display)
  const QuestionBankListItem: React.FC<{ bank: IQuestionBank }> = ({
    bank,
  }) => {
    const getSourceIcon = (sourceType: string) => {
      switch (sourceType) {
        case "SOP":
          return <DocumentTextIcon className="h-5 w-5 text-blue-600" />;
        case "MENU":
          return <ListBulletIcon className="h-5 w-5 text-emerald-600" />;
        case "MANUAL":
          return <PencilIcon className="h-5 w-5 text-amber-600" />;
        default:
          return <BookOpenIcon className="h-5 w-5 text-gray-600" />;
      }
    };

    const getSourceColor = (sourceType: string) => {
      switch (sourceType) {
        case "SOP":
          return "bg-blue-50 text-blue-700 border-blue-200";
        case "MENU":
          return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "MANUAL":
          return "bg-amber-50 text-amber-700 border-amber-200";
        default:
          return "bg-gray-50 text-gray-700 border-gray-200";
      }
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Icon, Name, and Details */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-lg border border-gray-200">
                  {getSourceIcon(bank.sourceType)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {bank.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getSourceColor(
                      bank.sourceType
                    )}`}
                  >
                    {bank.sourceType}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {new Date(bank.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                    {Array.isArray(bank.questions)
                      ? bank.questions.length
                      : bank.questionCount || 0}{" "}
                    questions
                  </span>
                </div>
                {bank.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                    {bank.description}
                  </p>
                )}
                {/* Linked content indicators */}
                {bank.sourceType === "SOP" && bank.sourceSopDocumentTitle && (
                  <div className="mt-2 text-xs text-blue-600">
                    📄 Linked to: {bank.sourceSopDocumentTitle}
                  </div>
                )}
                {bank.sourceType === "MENU" && bank.sourceMenuName && (
                  <div className="mt-2 text-xs text-emerald-600">
                    🍽️ Linked to: {bank.sourceMenuName}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => handleManageBankQuestions(bank._id)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 group"
              >
                <CogIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                Manage
              </button>
              <button
                onClick={() => setBankToDelete(bank)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 group"
              >
                <TrashIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Simplified Header Section */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white border border-slate-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                      <AcademicCapIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white">
                        Quiz & Question Bank Management
                      </h1>
                      <p className="text-slate-300 mt-2 font-medium">
                        Create quizzes, manage question banks, and track
                        training materials
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="white"
                      onClick={() => setIsCreateBankModalOpen(true)}
                      className="!bg-slate-700 !hover:bg-slate-600 !text-white !border-slate-600 shadow-lg"
                    >
                      <BookOpenIcon className="h-5 w-5 mr-2" />
                      New Question Bank
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setIsGenerateQuizModalOpen(true)}
                      className="shadow-lg"
                    >
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Generate Quiz
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <ErrorMessage message={error} onDismiss={dismissMessages} />
                </div>
              )}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <SuccessNotification
                    message={successMessage}
                    onDismiss={dismissMessages}
                  />
                </div>
              )}

              {/* === PHASE 1: Two-Column Layout Implementation === */}
              {/* Enhanced Global Search Bar */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="max-w-2xl mx-auto">
                  <div className="relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search question banks, quizzes, content... (Press / to focus)"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-12 pr-16 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white shadow-inner"
                      aria-label="Search quiz and question bank content"
                      autoComplete="off"
                    />

                    {/* Search shortcut hint */}
                    {!searchTerm && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-gray-400">
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-md">
                          /
                        </kbd>
                      </div>
                    )}

                    {/* Clear search button */}
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 group"
                        aria-label="Clear search (Esc)"
                        title="Clear search (Esc)"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Enhanced Search Results Summary */}
                  {searchTerm.trim() && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <BookOpenIcon className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">
                            {searchResults.questionBanks.length} banks
                          </span>
                        </div>
                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                        <div className="flex items-center space-x-1">
                          <AcademicCapIcon className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">
                            {searchResults.quizzes.length} quizzes
                          </span>
                        </div>
                        <div className="text-blue-600">for "{searchTerm}"</div>
                      </div>

                      {/* No results found */}
                      {searchResults.questionBanks.length === 0 &&
                        searchResults.quizzes.length === 0 && (
                          <div className="mt-2 text-center text-blue-700">
                            <div className="flex items-center justify-center space-x-2">
                              <span>No matches found.</span>
                              <button
                                onClick={clearSearch}
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-500px)]">
                {/* Left Navigation Panel */}
                <div className="lg:col-span-1">
                  <NavigationPanel />
                </div>

                {/* Content Display Area */}
                <div className="lg:col-span-2">
                  <ContentDisplay />
                </div>
              </div>
            </div>

            {/* Modals */}
            {isCreateBankModalOpen && restaurantId && (
              <Modal
                isOpen={isCreateBankModalOpen}
                onClose={() => setIsCreateBankModalOpen(false)}
                title="Create New Question Bank"
              >
                <CreateQuestionBankForm
                  onBankCreated={handleCreateBankSuccess}
                  onCancel={() => setIsCreateBankModalOpen(false)}
                />
              </Modal>
            )}

            {bankToDelete && (
              <Modal
                isOpen={!!bankToDelete}
                onClose={() => setBankToDelete(null)}
                title="Delete Question Bank"
              >
                <ConfirmationModalContent
                  message={`Are you sure you want to delete the question bank "${bankToDelete.name}"? This will also remove it from any quizzes it's part of, and delete all questions exclusively belonging to this bank if not used elsewhere.`}
                  onConfirm={handleDeleteBank}
                  onCancel={() => setBankToDelete(null)}
                  confirmText="Delete"
                  confirmButtonVariant="destructive"
                />
              </Modal>
            )}

            {isGenerateQuizModalOpen && (
              <GenerateQuizFromBanksModal
                isOpen={isGenerateQuizModalOpen}
                onClose={() => setIsGenerateQuizModalOpen(false)}
                onQuizGenerated={handleQuizGenerated}
              />
            )}

            {quizToDelete && (
              <Modal
                isOpen={!!quizToDelete}
                onClose={() => setQuizToDelete(null)}
                title="Delete Quiz"
              >
                <ConfirmationModalContent
                  message={`Are you sure you want to delete the quiz "${quizToDelete.title}"? All associated staff results will also be deleted.`}
                  onConfirm={handleDeleteQuiz}
                  onCancel={() => setQuizToDelete(null)}
                  confirmText="Delete"
                  confirmButtonVariant="destructive"
                />
              </Modal>
            )}

            {isStaffProgressModalOpen && selectedQuizForProgress && (
              <StaffQuizProgressModal
                isOpen={isStaffProgressModalOpen}
                onClose={() => {
                  setIsStaffProgressModalOpen(false);
                  setSelectedQuizForProgress(null);
                  setStaffProgressData(null);
                  setStaffProgressError(null);
                }}
                quizTitle={selectedQuizForProgress.title}
                quizTargetRoles={selectedQuizForProgress.targetRoles}
                progressData={staffProgressData}
                isLoading={isLoadingStaffProgress}
                error={staffProgressError}
              />
            )}

            {isEditQuizModalOpen && quizToEdit && (
              <EditQuizModal
                isOpen={isEditQuizModalOpen}
                onClose={() => {
                  setIsEditQuizModalOpen(false);
                  setQuizToEdit(null);
                }}
                initialQuizData={quizToEdit}
                onQuizUpdated={handleQuizUpdated}
              />
            )}

            {isConfirmDeactivateModalOpen && quizToDeactivateTarget && (
              <Modal
                isOpen={isConfirmDeactivateModalOpen}
                onClose={() => {
                  setIsConfirmDeactivateModalOpen(false);
                  setQuizToDeactivateTarget(null);
                }}
                title={`Deactivate Quiz: ${quizToDeactivateTarget.title}`}
              >
                <ConfirmationModalContent
                  message={`Are you sure you want to deactivate the quiz "${quizToDeactivateTarget.title}"? Staff will no longer be able to take new attempts.`}
                  onConfirm={confirmDeactivateQuiz}
                  onCancel={() => {
                    setIsConfirmDeactivateModalOpen(false);
                    setQuizToDeactivateTarget(null);
                  }}
                  confirmText="Deactivate"
                  confirmButtonVariant="destructive"
                />
              </Modal>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizAndBankManagementPage;
