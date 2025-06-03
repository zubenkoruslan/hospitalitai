import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
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
  ChevronDownIcon,
  ChevronUpIcon,
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
} from "@heroicons/react/24/outline";

// Question Bank Components
import CreateQuestionBankForm from "../components/questionBank/CreateQuestionBankForm";

// Quiz Components
import GenerateQuizFromBanksModal from "../components/quiz/GenerateQuizFromBanksModal";
import QuizList from "../components/quiz/QuizList";
import StaffQuizProgressModal from "../components/quiz/StaffQuizProgressModal";
import EditQuizModal from "../components/quiz/EditQuizModal";

// Define SourceType for filter
type QuestionBankSourceFilterType = "ALL" | "SOP" | "MENU" | "MANUAL";

const QuizAndBankManagementPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const navigate = useNavigate();

  const [questionBanks, setQuestionBanks] = useState<IQuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<ClientIQuiz[]>([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [questionBankSourceFilter, setQuestionBankSourceFilter] =
    useState<QuestionBankSourceFilterType>("ALL");
  const [isQuestionBankListVisible, setIsQuestionBankListVisible] =
    useState<boolean>(true);
  const [quizSearchTerm, setQuizSearchTerm] = useState<string>("");

  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expansion states
  const [isQuestionBanksExpanded, setIsQuestionBanksExpanded] =
    useState<boolean>(true);
  const [isQuizManagementExpanded, setIsQuizManagementExpanded] =
    useState<boolean>(true);

  // Modal States - Question Banks
  const [isCreateBankModalOpen, setIsCreateBankModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<IQuestionBank | null>(null);

  // Modal States - Quizzes
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<ClientIQuiz | null>(null);
  const [isDeletingQuizId, setIsDeletingQuizId] = useState<string | null>(null);

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
  const filteredQuestionBanks = React.useMemo(() => {
    let filtered = questionBanks;

    // Apply source filter
    if (questionBankSourceFilter !== "ALL") {
      filtered = filtered.filter(
        (bank) => bank.sourceType === questionBankSourceFilter
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (bank) =>
          bank.name.toLowerCase().includes(search) ||
          bank.description?.toLowerCase().includes(search) ||
          bank.sourceSopDocumentTitle?.toLowerCase().includes(search) ||
          bank.sourceMenuName?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [questionBanks, questionBankSourceFilter, searchTerm]);

  // Filtered Quizzes based on search
  const filteredQuizzes = React.useMemo(() => {
    if (!quizSearchTerm.trim()) return quizzes;

    const search = quizSearchTerm.toLowerCase();
    return quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(search) ||
        quiz.description?.toLowerCase().includes(search) ||
        quiz.targetRoles?.some((role) =>
          (typeof role === "string" ? role : role.name)
            .toLowerCase()
            .includes(search)
        )
    );
  }, [quizzes, quizSearchTerm]);

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
    setIsDeletingQuizId(quizToDelete._id);
    try {
      await deleteQuiz(quizToDelete._id);
      setQuizzes((prev) => prev.filter((q) => q._id !== quizToDelete._id));
      setSuccessMessage(`Quiz "${quizToDelete.title}" deleted.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setQuizToDelete(null);
      setIsDeletingQuizId(null);
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

  const handleQuestionBankFilterChange = (
    type: QuestionBankSourceFilterType
  ) => {
    setIsQuestionBankListVisible(false);
    setTimeout(() => {
      setQuestionBankSourceFilter(type);
      setIsQuestionBankListVisible(true);
    }, 300);
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

  // Question Bank List Item Component
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

  // Render Question Bank List
  const renderQuestionBankList = () => {
    if (isLoadingBanks) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner message="Loading question banks..." />
        </div>
      );
    }

    if (filteredQuestionBanks.length === 0) {
      const hasSearchOrFilter =
        searchTerm.trim() || questionBankSourceFilter !== "ALL";

      return (
        <div className="text-center py-12">
          <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasSearchOrFilter
              ? "No question banks found"
              : "No question banks yet"}
          </h3>
          <p className="text-gray-500 mb-6">
            {hasSearchOrFilter
              ? "Try adjusting your search or filter criteria"
              : "Create your first question bank to get started with quizzes"}
          </p>
          {!hasSearchOrFilter && (
            <Button
              variant="primary"
              onClick={() => setIsCreateBankModalOpen(true)}
              disabled={!restaurantId}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Question Bank
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredQuestionBanks.map((bank) => (
          <QuestionBankListItem key={bank._id} bank={bank} />
        ))}
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
                      variant="secondary"
                      onClick={() => setIsCreateBankModalOpen(true)}
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-lg"
                    >
                      <BookOpenIcon className="h-5 w-5 mr-2" />
                      New Question Bank
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setIsGenerateQuizModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
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

              {/* Question Banks Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 border-b border-emerald-200">
                  <div className="flex justify-between items-center">
                    <div
                      className="flex items-center cursor-pointer hover:bg-white/50 p-2 rounded-lg transition-colors duration-150 ease-in-out"
                      onClick={() =>
                        setIsQuestionBanksExpanded(!isQuestionBanksExpanded)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setIsQuestionBanksExpanded(!isQuestionBanksExpanded);
                        }
                      }}
                      aria-expanded={isQuestionBanksExpanded}
                      aria-controls="question-banks-content"
                    >
                      <BookOpenIcon className="h-6 w-6 text-emerald-700 mr-3" />
                      <h2 className="text-xl font-semibold text-emerald-900 mr-3">
                        Question Banks
                      </h2>
                      <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full border border-emerald-200">
                        {stats.totalBanks}
                      </span>
                      {isQuestionBanksExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-emerald-600 ml-2" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-emerald-600 ml-2" />
                      )}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => setIsCreateBankModalOpen(true)}
                      disabled={!restaurantId}
                      className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Create Question Bank</span>
                    </Button>
                  </div>
                </div>

                {isQuestionBanksExpanded && (
                  <div id="question-banks-content" className="p-6">
                    {/* Search and Filter Controls */}
                    <div className="mb-6 space-y-4">
                      {/* Search Bar */}
                      <div className="relative max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search question banks..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Filter Buttons */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <FunnelIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Filter by source:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              "ALL",
                              "SOP",
                              "MENU",
                              "MANUAL",
                            ] as QuestionBankSourceFilterType[]
                          ).map((type) => (
                            <Button
                              key={type}
                              variant={
                                questionBankSourceFilter === type
                                  ? "primary"
                                  : "secondary"
                              }
                              onClick={() =>
                                handleQuestionBankFilterChange(type)
                              }
                              className="px-3 py-1.5 text-sm"
                            >
                              {type.charAt(0).toUpperCase() +
                                type.slice(1).toLowerCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`transition-opacity duration-300 ease-in-out ${
                        isQuestionBankListVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {renderQuestionBankList()}
                    </div>
                  </div>
                )}
              </div>

              {/* Quizzes Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200">
                  <div className="flex justify-between items-center">
                    <div
                      className="flex items-center cursor-pointer hover:bg-white/50 p-2 rounded-lg transition-colors duration-150 ease-in-out"
                      onClick={() =>
                        setIsQuizManagementExpanded(!isQuizManagementExpanded)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setIsQuizManagementExpanded(
                            !isQuizManagementExpanded
                          );
                        }
                      }}
                      aria-expanded={isQuizManagementExpanded}
                      aria-controls="quiz-management-content"
                    >
                      <AcademicCapIcon className="h-6 w-6 text-indigo-700 mr-3" />
                      <h2 className="text-xl font-semibold text-indigo-900 mr-3">
                        Quiz Management
                      </h2>
                      <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full border border-indigo-200">
                        {stats.totalQuizzes}
                      </span>
                      {isQuizManagementExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-indigo-600 ml-2" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-indigo-600 ml-2" />
                      )}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => setIsGenerateQuizModalOpen(true)}
                      className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      <span>Generate Quiz</span>
                    </Button>
                  </div>
                </div>

                {isQuizManagementExpanded && (
                  <div id="quiz-management-content" className="p-6">
                    {/* Search and Filter Controls */}
                    <div className="mb-6 space-y-4">
                      {/* Search Bar */}
                      <div className="relative max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search quizzes..."
                          value={quizSearchTerm}
                          onChange={(e) => setQuizSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="transition-opacity duration-300 ease-in-out opacity-100">
                      {isLoadingQuizzes && quizzes.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                          <LoadingSpinner message="Loading quizzes..." />
                        </div>
                      )}
                      {!isLoadingQuizzes &&
                        filteredQuizzes.length === 0 &&
                        !error && (
                          <div className="text-center py-12">
                            <AcademicCapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {quizSearchTerm.trim()
                                ? "No quizzes found"
                                : "No quizzes yet"}
                            </h3>
                            <p className="text-gray-500 mb-6">
                              {quizSearchTerm.trim()
                                ? "Try adjusting your search criteria"
                                : "Generate your first quiz from question banks"}
                            </p>
                            {!quizSearchTerm.trim() && (
                              <Button
                                variant="primary"
                                onClick={() => setIsGenerateQuizModalOpen(true)}
                                disabled={!restaurantId}
                              >
                                <SparklesIcon className="h-4 w-4 mr-2" />
                                Generate Quiz
                              </Button>
                            )}
                          </div>
                        )}
                      {!isLoadingQuizzes && filteredQuizzes.length > 0 && (
                        <div className="space-y-3">
                          <QuizList
                            quizzes={filteredQuizzes}
                            isLoading={false}
                            onPreview={handleOpenEditQuizModal}
                            onActivate={handleActivateQuiz}
                            onDeactivate={handleDeactivateQuiz}
                            onDelete={(quiz) => setQuizToDelete(quiz)}
                            onViewProgress={handleViewQuizProgress}
                            isDeletingQuizId={isDeletingQuizId}
                          />
                        </div>
                      )}
                      {isLoadingQuizzes && quizzes.length > 0 && (
                        <div className="flex justify-center py-4">
                          <LoadingSpinner />
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
