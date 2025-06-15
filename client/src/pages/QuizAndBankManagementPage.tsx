import React, { useState, useEffect, useCallback } from "react";
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

interface HighlightedText {
  text: string;
  isHighlighted: boolean;
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

  // Enhanced search state
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResults>({
    sections: [],
    questionBanks: [],
    quizzes: [],
  });

  // === PHASE 3: Enhanced Search State ===
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    categories: [],
    sourceTypes: [],
    statuses: [],
    dateRange: { start: null, end: null },
  });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<
    SearchSuggestion[]
  >([]);
  const [showSearchFilters, setShowSearchFilters] = useState<boolean>(false);
  const [showSearchSuggestions, setShowSearchSuggestions] =
    useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] =
    useState<number>(-1);
  const [isAdvancedSearchMode, setIsAdvancedSearchMode] =
    useState<boolean>(false);

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

  // === PHASE 3: Enhanced Search Utility Functions ===
  const highlightText = useCallback(
    (text: string, searchTerm: string): HighlightedText[] => {
      if (!searchTerm.trim()) {
        return [{ text, isHighlighted: false }];
      }

      const regex = new RegExp(
        `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );
      const parts = text.split(regex);

      return parts.map((part, index) => ({
        text: part,
        isHighlighted:
          regex.test(part) && part.toLowerCase() === searchTerm.toLowerCase(),
      }));
    },
    []
  );

  const generateSearchSuggestions = useCallback(() => {
    const suggestions: SearchSuggestion[] = [];

    // Add recent searches
    searchHistory.slice(0, 3).forEach((term) => {
      suggestions.push({ text: term, type: "recent" });
    });

    // Add category suggestions
    const categories = Array.from(
      new Set([
        ...questionBanks.flatMap((bank) => bank.categories || []),
        ...quizzes.flatMap(
          (quiz) =>
            quiz.targetRoles?.map((role) =>
              typeof role === "string" ? role : role.name
            ) || []
        ),
      ])
    );

    categories.slice(0, 5).forEach((category) => {
      if (category && !suggestions.some((s) => s.text === category)) {
        const count =
          questionBanks.filter((bank) => bank.categories?.includes(category))
            .length +
          quizzes.filter((quiz) =>
            quiz.targetRoles?.some(
              (role) =>
                (typeof role === "string" ? role : role.name) === category
            )
          ).length;
        suggestions.push({ text: category, type: "category", count });
      }
    });

    // Add source type suggestions
    const sourceTypes = Array.from(
      new Set(questionBanks.map((bank) => bank.sourceType))
    );
    sourceTypes.forEach((sourceType) => {
      if (!suggestions.some((s) => s.text === sourceType)) {
        const count = questionBanks.filter(
          (bank) => bank.sourceType === sourceType
        ).length;
        suggestions.push({ text: sourceType, type: "sourceType", count });
      }
    });

    setSearchSuggestions(suggestions);
  }, [questionBanks, quizzes, searchHistory]);

  const addToSearchHistory = useCallback((term: string) => {
    if (!term.trim()) return;

    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== term);
      return [term, ...filtered].slice(0, 10); // Keep last 10 searches
    });
  }, []);

  const applyAdvancedFilters = useCallback(
    (
      items: (IQuestionBank | ClientIQuiz)[],
      type: "questionBanks" | "quizzes"
    ) => {
      return items.filter((item) => {
        // Category filter
        if (searchFilters.categories.length > 0) {
          if (type === "questionBanks") {
            const bank = item as IQuestionBank;
            if (
              !bank.categories?.some((cat) =>
                searchFilters.categories.includes(cat)
              )
            ) {
              return false;
            }
          } else {
            const quiz = item as ClientIQuiz;
            if (
              !quiz.targetRoles?.some((role) =>
                searchFilters.categories.includes(
                  typeof role === "string" ? role : role.name
                )
              )
            ) {
              return false;
            }
          }
        }

        // Source type filter (only for question banks)
        if (type === "questionBanks" && searchFilters.sourceTypes.length > 0) {
          const bank = item as IQuestionBank;
          if (!searchFilters.sourceTypes.includes(bank.sourceType)) {
            return false;
          }
        }

        // Status filter (only for quizzes)
        if (type === "quizzes" && searchFilters.statuses.length > 0) {
          const quiz = item as ClientIQuiz;
          const status = quiz.isAvailable ? "active" : "inactive";
          if (!searchFilters.statuses.includes(status)) {
            return false;
          }
        }

        // Date range filter
        if (searchFilters.dateRange.start || searchFilters.dateRange.end) {
          const itemDate = new Date(item.createdAt || "");
          if (
            searchFilters.dateRange.start &&
            itemDate < searchFilters.dateRange.start
          ) {
            return false;
          }
          if (
            searchFilters.dateRange.end &&
            itemDate > searchFilters.dateRange.end
          ) {
            return false;
          }
        }

        return true;
      });
    },
    [searchFilters]
  );

  // === PHASE 1 & 3: Enhanced Search Implementation ===
  const performGlobalSearch = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setSearchResults({ sections: [], questionBanks: [], quizzes: [] });
        return;
      }

      const term = searchTerm.toLowerCase();
      const matchingSections: ViewType[] = [];
      let matchingQuestionBanks: string[] = [];
      let matchingQuizzes: string[] = [];

      // Search in sections
      if ("overview".includes(term) || "dashboard".includes(term)) {
        matchingSections.push("overview");
      }
      if ("question".includes(term) || "bank".includes(term)) {
        matchingSections.push("question-banks");
      }
      if ("quiz".includes(term) || "test".includes(term)) {
        matchingSections.push("quizzes");
      }

      // Enhanced search in question banks
      let filteredBanks = questionBanks.filter((bank) => {
        const matches =
          bank.name.toLowerCase().includes(term) ||
          bank.description?.toLowerCase().includes(term) ||
          bank.sourceSopDocumentTitle?.toLowerCase().includes(term) ||
          bank.sourceMenuName?.toLowerCase().includes(term) ||
          bank.sourceType.toLowerCase().includes(term) ||
          bank.categories?.some((cat) => cat.toLowerCase().includes(term));

        return matches;
      });

      // Apply advanced filters if in advanced mode
      if (isAdvancedSearchMode) {
        filteredBanks = applyAdvancedFilters(
          filteredBanks,
          "questionBanks"
        ) as IQuestionBank[];
      }

      matchingQuestionBanks = filteredBanks.map((bank) => bank._id);

      // Enhanced search in quizzes
      let filteredQuizzes = quizzes.filter((quiz) => {
        const matches =
          quiz.title.toLowerCase().includes(term) ||
          quiz.description?.toLowerCase().includes(term) ||
          quiz.targetRoles?.some((role) =>
            (typeof role === "string" ? role : role.name)
              .toLowerCase()
              .includes(term)
          );

        return matches;
      });

      // Apply advanced filters if in advanced mode
      if (isAdvancedSearchMode) {
        filteredQuizzes = applyAdvancedFilters(
          filteredQuizzes,
          "quizzes"
        ) as ClientIQuiz[];
      }

      matchingQuizzes = filteredQuizzes.map((quiz) => quiz._id);

      setSearchResults({
        sections: matchingSections,
        questionBanks: matchingQuestionBanks,
        quizzes: matchingQuizzes,
      });

      // Auto-expand sections with matches
      if (matchingQuestionBanks.length > 0) {
        setExpandedSections((prev) => ({ ...prev, "question-banks": true }));
      }
      if (matchingQuizzes.length > 0) {
        setExpandedSections((prev) => ({ ...prev, quizzes: true }));
      }
    },
    [questionBanks, quizzes, isAdvancedSearchMode, applyAdvancedFilters]
  );

  // === PHASE 3: Enhanced Search Handlers ===
  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearchTerm(value);
    performGlobalSearch(value);

    // Show suggestions when typing
    if (value.trim()) {
      setShowSearchSuggestions(true);
      generateSearchSuggestions();
    } else {
      setShowSearchSuggestions(false);
    }

    setSelectedSuggestionIndex(-1);
  };

  const handleSearchSubmit = () => {
    if (globalSearchTerm.trim()) {
      addToSearchHistory(globalSearchTerm);
      setShowSearchSuggestions(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (showSearchSuggestions && searchSuggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < searchSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : searchSuggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            const suggestion = searchSuggestions[selectedSuggestionIndex];
            setGlobalSearchTerm(suggestion.text);
            performGlobalSearch(suggestion.text);
            addToSearchHistory(suggestion.text);
          } else {
            handleSearchSubmit();
          }
          setShowSearchSuggestions(false);
          break;
        case "Escape":
          setShowSearchSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    } else if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setGlobalSearchTerm(suggestion.text);
    performGlobalSearch(suggestion.text);
    addToSearchHistory(suggestion.text);
    setShowSearchSuggestions(false);
  };

  const clearGlobalSearch = () => {
    setGlobalSearchTerm("");
    setSearchResults({ sections: [], questionBanks: [], quizzes: [] });
    setShowSearchSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const toggleAdvancedSearch = () => {
    setIsAdvancedSearchMode(!isAdvancedSearchMode);
    setShowSearchFilters(!showSearchFilters);
    if (globalSearchTerm.trim()) {
      performGlobalSearch(globalSearchTerm);
    }
  };

  const updateSearchFilter = (filterType: keyof SearchFilters, value: any) => {
    setSearchFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));

    // Re-run search with new filters
    if (globalSearchTerm.trim()) {
      performGlobalSearch(globalSearchTerm);
    }
  };

  const clearAllFilters = () => {
    setSearchFilters({
      categories: [],
      sourceTypes: [],
      statuses: [],
      dateRange: { start: null, end: null },
    });

    if (globalSearchTerm.trim()) {
      performGlobalSearch(globalSearchTerm);
    }
  };

  const isSearchMatch = (
    type: "section" | "questionBank" | "quiz",
    id: string
  ) => {
    if (!globalSearchTerm.trim()) return false;

    switch (type) {
      case "section":
        return searchResults.sections.includes(id as ViewType);
      case "questionBank":
        return searchResults.questionBanks.includes(id);
      case "quiz":
        return searchResults.quizzes.includes(id);
      default:
        return false;
    }
  };

  // === PHASE 3: Highlighted Text Component ===
  const HighlightedText: React.FC<{
    text: string;
    searchTerm: string;
    className?: string;
  }> = ({ text, searchTerm, className = "" }) => {
    const highlightedParts = highlightText(text, searchTerm);

    return (
      <span className={className}>
        {highlightedParts.map((part, index) => (
          <span
            key={index}
            className={
              part.isHighlighted
                ? "bg-yellow-200 text-yellow-900 font-semibold px-1 rounded"
                : ""
            }
          >
            {part.text}
          </span>
        ))}
      </span>
    );
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

  // Update global search when data changes
  useEffect(() => {
    if (globalSearchTerm.trim()) {
      performGlobalSearch(globalSearchTerm);
    }
  }, [questionBanks, quizzes, globalSearchTerm, performGlobalSearch]);

  // Initialize search suggestions when data loads
  useEffect(() => {
    if (questionBanks.length > 0 || quizzes.length > 0) {
      generateSearchSuggestions();
    }
  }, [questionBanks, quizzes, generateSearchSuggestions]);

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("quiz-management-search-history");
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setSearchHistory(history);
      } catch (error) {
        console.warn("Failed to load search history:", error);
      }
    }
  }, []);

  // Save search history to localStorage when it changes
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem(
        "quiz-management-search-history",
        JSON.stringify(searchHistory)
      );
    }
  }, [searchHistory]);

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
    // Breadcrumb component for better navigation
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
          },
          { label: bank?.name || "Unknown", onClick: () => {} }
        );
      } else if (selectedView === "quizzes" && selectedQuizId) {
        const quiz = quizzes.find((q) => q._id === selectedQuizId);
        breadcrumbItems.push(
          { label: "Quizzes", onClick: () => setSelectedQuizId(null) },
          { label: quiz?.title || "Unknown", onClick: () => {} }
        );
      }

      if (breadcrumbItems.length === 0) return null;

      return (
        <nav
          className="flex items-center space-x-2 text-sm text-slate-600 mb-4"
          aria-label="Breadcrumb"
        >
          <button
            onClick={() => {
              setSelectedView("overview");
              setSelectedQuestionBankId(null);
              setSelectedQuizId(null);
            }}
            className="hover:text-slate-900 transition-colors duration-200"
          >
            Management Center
          </button>
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
              <button
                onClick={item.onClick}
                className={`hover:text-slate-900 transition-colors duration-200 ${
                  index === breadcrumbItems.length - 1
                    ? "text-slate-900 font-medium"
                    : ""
                }`}
              >
                {item.label}
              </button>
            </div>
          ))}
        </nav>
      );
    };

    // Loading skeleton component
    const ContentSkeleton = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
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
            <div className="text-center py-12">
              <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No question banks found
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first question bank to get started
              </p>
              <Button
                variant="primary"
                onClick={() => setIsCreateBankModalOpen(true)}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Create Question Bank
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredQuestionBanks.map((bank) => (
                <div
                  key={bank._id}
                  className="bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer"
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
            <div className="text-center py-12">
              <AcademicCapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No quizzes found
              </h3>
              <p className="text-gray-500 mb-6">
                Generate your first quiz from question banks
              </p>
              <Button
                variant="primary"
                onClick={() => setIsGenerateQuizModalOpen(true)}
                className="flex items-center gap-2"
              >
                <SparklesIcon className="h-4 w-4" />
                Generate Quiz
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz._id}
                  className="bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer"
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
                            <HighlightedText
                              text={quiz.title}
                              searchTerm={globalSearchTerm}
                            />
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
                        <HighlightedText
                          text={quiz.description}
                          searchTerm={globalSearchTerm}
                        />
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
          <Breadcrumb />

          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 border-b border-emerald-200 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl shadow-sm">
                  <BookOpenIcon className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-emerald-900 mb-2">
                    {bank.name}
                  </h1>
                  <div className="flex items-center space-x-4 text-emerald-700">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {bank.sourceType}
                    </span>
                    <span>
                      {Array.isArray(bank.questions)
                        ? bank.questions.length
                        : bank.questionCount || 0}{" "}
                      questions
                    </span>
                    <span>•</span>
                    <span>
                      {bank.createdAt
                        ? new Date(bank.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => handleManageBankQuestions(bank._id)}
                  className="flex items-center gap-2"
                >
                  <CogIcon className="h-4 w-4" />
                  Manage Questions
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setBankToDelete(bank)}
                  className="flex items-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </Button>
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

            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleManageBankQuestions(bank._id)}
                  className="flex items-center gap-2"
                >
                  <CogIcon className="h-4 w-4" />
                  Manage Questions
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
                  onClick={() => {
                    setSelectedQuestionBankId(null);
                    setSelectedView("question-banks");
                  }}
                  className="flex items-center gap-2"
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
          <Breadcrumb />

          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 border-b border-indigo-200 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl shadow-sm">
                  <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-indigo-900 mb-2">
                    {quiz.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-indigo-700">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${
                        quiz.isAvailable
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-gray-100 text-gray-800 border border-gray-200"
                      }`}
                    >
                      {quiz.isAvailable ? "Active" : "Inactive"}
                    </span>
                    <span>
                      {quiz.totalUniqueQuestionsInSourceSnapshot || 0} questions
                    </span>
                    <span>•</span>
                    <span>
                      {quiz.createdAt
                        ? new Date(quiz.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => handleOpenEditQuizModal(quiz)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Quiz
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleViewQuizProgress(quiz._id)}
                  className="flex items-center gap-2"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  View Progress
                </Button>
                {quiz.isAvailable ? (
                  <Button
                    variant="secondary"
                    onClick={() => handleDeactivateQuiz(quiz._id)}
                    className="flex items-center gap-2"
                  >
                    <PauseIcon className="h-4 w-4" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleActivateQuiz(quiz._id)}
                    className="flex items-center gap-2"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Activate
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setQuizToDelete(quiz)}
                  className="flex items-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </Button>
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

            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleOpenEditQuizModal(quiz)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Quiz
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleViewQuizProgress(quiz._id)}
                  className="flex items-center gap-2"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  View Progress
                </Button>
                {quiz.isAvailable ? (
                  <Button
                    variant="secondary"
                    onClick={() => handleDeactivateQuiz(quiz._id)}
                    className="flex items-center gap-2"
                  >
                    <PauseIcon className="h-4 w-4" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleActivateQuiz(quiz._id)}
                    className="flex items-center gap-2"
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
                  className="flex items-center gap-2"
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
    const isSearchActive = globalSearchTerm.trim() !== "";

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
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

          {/* Enhanced Global Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search banks, quizzes, content..."
              value={globalSearchTerm}
              onChange={(e) => handleGlobalSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (globalSearchTerm.trim()) {
                  setShowSearchSuggestions(true);
                  generateSearchSuggestions();
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowSearchSuggestions(false), 150);
              }}
              className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 bg-white/80 backdrop-blur-sm"
              aria-label="Global search"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <button
                onClick={toggleAdvancedSearch}
                className={`p-1 rounded-full transition-colors duration-200 ${
                  isAdvancedSearchMode
                    ? "text-blue-600 bg-blue-100 hover:bg-blue-200"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Advanced search filters"
                title="Advanced search"
              >
                <FunnelIcon className="h-4 w-4" />
              </button>
              {globalSearchTerm && (
                <button
                  onClick={clearGlobalSearch}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.text}`}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors duration-150 ${
                      index === selectedSuggestionIndex
                        ? "bg-blue-50 border-l-2 border-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          suggestion.type === "recent"
                            ? "bg-gray-400"
                            : suggestion.type === "category"
                            ? "bg-green-400"
                            : suggestion.type === "sourceType"
                            ? "bg-blue-400"
                            : "bg-purple-400"
                        }`}
                      />
                      <span className="text-sm text-gray-900">
                        {suggestion.text}
                      </span>
                    </div>
                    {suggestion.count && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {suggestion.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Search Filters */}
          {showSearchFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Advanced Filters
                </h4>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {/* Categories Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(
                      new Set([
                        ...questionBanks.flatMap(
                          (bank) => bank.categories || []
                        ),
                        ...quizzes.flatMap(
                          (quiz) =>
                            quiz.targetRoles?.map((role) =>
                              typeof role === "string" ? role : role.name
                            ) || []
                        ),
                      ])
                    )
                      .slice(0, 6)
                      .map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            const newCategories =
                              searchFilters.categories.includes(category)
                                ? searchFilters.categories.filter(
                                    (c) => c !== category
                                  )
                                : [...searchFilters.categories, category];
                            updateSearchFilter("categories", newCategories);
                          }}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            searchFilters.categories.includes(category)
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Source Types Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Source Types
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["SOP", "MENU", "MANUAL"].map((sourceType) => (
                      <button
                        key={sourceType}
                        onClick={() => {
                          const newSourceTypes =
                            searchFilters.sourceTypes.includes(sourceType)
                              ? searchFilters.sourceTypes.filter(
                                  (s) => s !== sourceType
                                )
                              : [...searchFilters.sourceTypes, sourceType];
                          updateSearchFilter("sourceTypes", newSourceTypes);
                        }}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          searchFilters.sourceTypes.includes(sourceType)
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {sourceType}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Quiz Status
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["active", "inactive"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          const newStatuses = searchFilters.statuses.includes(
                            status
                          )
                            ? searchFilters.statuses.filter((s) => s !== status)
                            : [...searchFilters.statuses, status];
                          updateSearchFilter("statuses", newStatuses);
                        }}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          searchFilters.statuses.includes(status)
                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Summary */}
          {isSearchActive && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  {searchResults.questionBanks.length +
                    searchResults.quizzes.length}{" "}
                  items found
                  {isAdvancedSearchMode && (
                    <span className="ml-1 text-blue-600 font-medium">
                      (filtered)
                    </span>
                  )}
                </span>
                <span className="text-slate-500">
                  Searching for "{globalSearchTerm}"
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

              {/* Keyboard shortcuts hint */}
              {showSearchSuggestions && (
                <div className="text-xs text-slate-400 flex items-center space-x-2">
                  <span>↑↓ navigate</span>
                  <span>•</span>
                  <span>↵ select</span>
                  <span>•</span>
                  <span>esc close</span>
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
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                isSearchMatch("section", "overview")
                  ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900 shadow-md"
                  : selectedView === "overview"
                  ? "bg-gradient-to-r from-blue-50 via-blue-100 to-indigo-50 border-2 border-blue-300 text-blue-800 shadow-lg"
                  : "hover:bg-gradient-to-r hover:from-slate-50 hover:via-slate-100 hover:to-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:shadow-md"
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
                      isSearchMatch("section", "overview")
                        ? "text-yellow-900"
                        : selectedView === "overview"
                        ? "text-blue-900"
                        : "text-slate-800 group-hover:text-slate-900"
                    }`}
                  >
                    Overview
                  </span>
                  <div
                    className={`text-sm mt-1 font-medium ${
                      isSearchMatch("section", "overview")
                        ? "text-yellow-700"
                        : selectedView === "overview"
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
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                isSearchMatch("section", "question-banks") ||
                searchResults.questionBanks.length > 0
                  ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900 shadow-md"
                  : selectedView === "question-banks"
                  ? "bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-50 border-2 border-emerald-300 text-emerald-800 shadow-lg"
                  : "hover:bg-gradient-to-r hover:from-slate-50 hover:via-slate-100 hover:to-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:shadow-md"
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
                      isSearchMatch("section", "question-banks") ||
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
                      isSearchMatch("section", "question-banks") ||
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
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                isSearchMatch("section", "quizzes") ||
                searchResults.quizzes.length > 0
                  ? "bg-yellow-100 border-2 border-yellow-300 text-yellow-900 shadow-md"
                  : selectedView === "quizzes"
                  ? "bg-gradient-to-r from-indigo-50 via-indigo-100 to-indigo-50 border-2 border-indigo-300 text-indigo-800 shadow-lg"
                  : "hover:bg-gradient-to-r hover:from-slate-50 hover:via-slate-100 hover:to-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:shadow-md"
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
                      isSearchMatch("section", "quizzes") ||
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
                      isSearchMatch("section", "quizzes") ||
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
                  No items match "{globalSearchTerm}". Try a different search
                  term.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setGlobalSearchTerm("")}
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
                    <HighlightedText
                      text={bank.name}
                      searchTerm={globalSearchTerm}
                    />
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getSourceColor(
                      bank.sourceType
                    )}`}
                  >
                    <HighlightedText
                      text={bank.sourceType}
                      searchTerm={globalSearchTerm}
                    />
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
                    <HighlightedText
                      text={bank.description}
                      searchTerm={globalSearchTerm}
                    />
                  </p>
                )}
                {/* Linked content indicators */}
                {bank.sourceType === "SOP" && bank.sourceSopDocumentTitle && (
                  <div className="mt-2 text-xs text-blue-600">
                    📄 Linked to:{" "}
                    <HighlightedText
                      text={bank.sourceSopDocumentTitle}
                      searchTerm={globalSearchTerm}
                    />
                  </div>
                )}
                {bank.sourceType === "MENU" && bank.sourceMenuName && (
                  <div className="mt-2 text-xs text-emerald-600">
                    🍽️ Linked to:{" "}
                    <HighlightedText
                      text={bank.sourceMenuName}
                      searchTerm={globalSearchTerm}
                    />
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
              {/* Header Section */}
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

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Question Banks
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.totalBanks}
                        </p>
                      </div>
                      <BookOpenIcon className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Total Questions
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.totalQuestions}
                        </p>
                      </div>
                      <ListBulletIcon className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Total Quizzes
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.totalQuizzes}
                        </p>
                      </div>
                      <AcademicCapIcon className="h-8 w-8 text-indigo-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Active Quizzes
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.activeQuizzes}
                        </p>
                      </div>
                      <PlayIcon className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-slate-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">
                          Inactive
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stats.inactiveQuizzes}
                        </p>
                      </div>
                      <PauseIcon className="h-8 w-8 text-orange-400" />
                    </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-400px)]">
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
