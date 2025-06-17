import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  WrenchScrewdriverIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
  UserGroupIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  ArrowRightIcon,
  HomeIcon,
  TrophyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import {
  getQuizzes,
  deleteQuestionBank,
  deleteQuiz,
  updateQuizDetails,
  updateQuizSnapshots,
} from "../services/api";
import { ClientIQuiz, UpdateQuizClientData } from "../types/quizTypes";
import { IQuestionBank } from "../types/questionBankTypes";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Modal from "../components/common/Modal";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
import EditQuizModal from "../components/quiz/EditQuizModal";
import GenerateQuizFromBanksModal from "../components/quiz/GenerateQuizFromBanksModal";
import CreateQuestionBankForm from "../components/questionBank/CreateQuestionBankForm";
import { getQuizAnalytics } from "../services/api";

// QuizProgressModalContent component
interface QuizProgressModalContentProps {
  quiz: ClientIQuiz | null;
  onClose: () => void;
}

interface QuizAnalyticsData {
  quizTitle: string;
  totalAttempts: number;
  uniqueParticipants: number;
  totalStaff: number;
  completionRate: number;
  averageScore: number;
  averageCompletionTime: number;
  topPerformers: Array<{
    name: string;
    score: number;
    completedAt: Date;
  }>;
  recentActivity: Array<{
    staffName: string;
    score: number;
    completedAt: Date;
    totalQuestions: number;
  }>;
}

const QuizProgressModalContent: React.FC<QuizProgressModalContentProps> = ({
  quiz,
  onClose,
}) => {
  const [analytics, setAnalytics] = useState<QuizAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    if (quiz?._id) {
      const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        try {
          const response = await getQuizAnalytics(quiz._id);
          if (response.success) {
            setAnalytics(response.data);
          } else {
            setAnalyticsError("Failed to load analytics");
          }
        } catch (error) {
          console.error("Error fetching quiz analytics:", error);
          setAnalyticsError(
            error instanceof Error ? error.message : "Failed to load analytics"
          );
        } finally {
          setAnalyticsLoading(false);
        }
      };

      fetchAnalytics();
    }
  }, [quiz?._id]);

  if (!quiz) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No quiz data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className="text-gray-600 mb-4">{quiz.description}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {quiz.totalUniqueQuestionsInSourceSnapshot || 0}
                </div>
                <div className="text-sm text-gray-500">Questions</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    quiz.isAvailable ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {quiz.isAvailable ? "Active" : "Inactive"}
                </div>
                <div className="text-sm text-gray-500">Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {quiz.targetRoles?.length || 0}
                </div>
                <div className="text-sm text-gray-500">Target Roles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {quiz.sourceQuestionBankIds?.length || 0}
                </div>
                <div className="text-sm text-gray-500">Question Banks</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Analytics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Staff Progress & Analytics
        </h4>

        {analyticsLoading && (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        )}

        {analyticsError && (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Unable to Load Analytics
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {analyticsError}
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Average Score
                </span>
                <span className="text-sm text-gray-500">No data</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Completion Rate
                </span>
                <span className="text-sm text-gray-500">No data</span>
              </div>
            </div>
          </div>
        )}

        {!analyticsLoading && !analyticsError && analytics && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <AcademicCapIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Average Score
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {analytics.averageScore.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      Completion Rate
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {analytics.completionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">
                      Participants
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {analytics.uniqueParticipants} / {analytics.totalStaff}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            {analytics.topPerformers.length > 0 && (
              <div>
                <h5 className="text-md font-semibold text-gray-800 mb-3">
                  Top Performers
                </h5>
                <div className="space-y-2">
                  {analytics.topPerformers
                    .slice(0, 3)
                    .map((performer, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-yellow-500 text-white"
                                : index === 1
                                ? "bg-gray-400 text-white"
                                : "bg-orange-600 text-white"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-900">
                            {performer.name}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-800">
                          {performer.score.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {analytics.recentActivity.length > 0 && (
              <div>
                <h5 className="text-md font-semibold text-gray-800 mb-3">
                  Recent Activity
                </h5>
                <div className="space-y-2">
                  {analytics.recentActivity
                    .slice(0, 3)
                    .map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {activity.staffName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(
                              activity.completedAt
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(activity.completedAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {activity.score.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-500">
                            {activity.totalQuestions} questions
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!analyticsLoading && !analyticsError && !analytics && (
          <div className="text-center py-12">
            <TrophyIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Quiz Data Yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Analytics will appear here once staff members begin taking this
              quiz.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Average Score
                </span>
                <span className="text-sm text-gray-500">No attempts yet</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Completion Rate
                </span>
                <span className="text-sm text-gray-500">No attempts yet</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={() =>
            window.open(`/staff-results?quizId=${quiz._id}`, "_blank")
          }
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          <ChartBarIcon className="h-4 w-4 mr-2" />
          View Full Analytics
        </button>
        <button
          onClick={onClose}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};

type MainView = "dashboard" | "question-banks" | "quizzes";

interface QuizManagementState {
  currentView: MainView;
  searchTerm: string;
  loading: boolean;
  error: string | null;
  mobileAnalyticsExpanded?: boolean;
  expandedCards?: Set<string>; // Track which cards are expanded on mobile
}

const QuizAndBankManagementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<QuizManagementState>({
    currentView: "dashboard",
    searchTerm: "",
    loading: false,
    error: null,
    mobileAnalyticsExpanded: false,
    expandedCards: new Set<string>(),
  });

  // Modal states
  const [editQuizModal, setEditQuizModal] = useState<{
    isOpen: boolean;
    quiz: ClientIQuiz | null;
  }>({ isOpen: false, quiz: null });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: IQuestionBank | ClientIQuiz | null;
    type: "question-bank" | "quiz" | null;
  }>({ isOpen: false, item: null, type: null });

  const [createQuestionBankModal, setCreateQuestionBankModal] = useState(false);
  const [generateQuizModal, setGenerateQuizModal] = useState(false);

  const [quizProgressModal, setQuizProgressModal] = useState<{
    isOpen: boolean;
    quiz: ClientIQuiz | null;
  }>({ isOpen: false, quiz: null });

  const [actionLoading, setActionLoading] = useState<{
    delete: boolean;
    toggle: boolean;
    refresh: boolean;
  }>({ delete: false, toggle: false, refresh: false });

  // Fetch data using existing hooks and manual quiz fetching
  const {
    questionBanks,
    isLoading: banksLoading,
    error: banksError,
    fetchQuestionBanks: refetchBanks,
  } = useQuestionBanks();

  // Manual quiz state management
  const [quizzes, setQuizzes] = useState<ClientIQuiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);

  // Fetch quizzes function
  const fetchQuizzes = useCallback(async () => {
    setQuizzesLoading(true);
    setQuizzesError(null);
    try {
      const data = await getQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
      setQuizzesError(
        err instanceof Error ? err.message : "Failed to fetch quizzes"
      );
    } finally {
      setQuizzesLoading(false);
    }
  }, []);

  const refetchQuizzes = fetchQuizzes;

  // Function to update quiz snapshots
  const handleUpdateQuizSnapshots = useCallback(async () => {
    setActionLoading((prev) => ({ ...prev, refresh: true }));
    try {
      console.log("Updating quiz snapshots...");
      const result = await updateQuizSnapshots();
      console.log("Quiz snapshots updated:", result);
      // Refresh quiz data to show updated counts
      await refetchQuizzes();
      // Show success feedback
      setState((prev) => ({ ...prev, error: null }));
    } catch (error) {
      console.error("Failed to update quiz snapshots:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update quiz counts",
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, refresh: false }));
    }
  }, [refetchQuizzes]);

  // Update state based on loading status
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      loading: banksLoading || quizzesLoading,
      error: banksError ? banksError.message : quizzesError,
    }));
  }, [banksLoading, quizzesLoading, banksError, quizzesError]);

  // Fetch initial data
  useEffect(() => {
    fetchQuizzes();
    refetchBanks();
    // Update quiz snapshots on page load to ensure question counts are current
    const updateSnapshots = async () => {
      await handleUpdateQuizSnapshots();
    };
    updateSnapshots();
  }, [fetchQuizzes, refetchBanks]);

  // Update snapshots when switching to quizzes view
  useEffect(() => {
    if (state.currentView === "quizzes") {
      handleUpdateQuizSnapshots();
    }
  }, [state.currentView, handleUpdateQuizSnapshots]);

  // Add visibility change listener to refresh data when returning from question bank management
  useEffect(() => {
    let throttleTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page is now visible - refresh quiz data with throttling
        console.log("Page visible - refreshing quiz and bank data...");

        // Clear any existing timeout
        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
        }

        // Throttle to prevent excessive calls
        throttleTimeout = setTimeout(() => {
          refetchBanks();
          refetchQuizzes();
          if (state.currentView === "quizzes") {
            // Add delay to ensure backend has processed any async updates
            setTimeout(() => {
              handleUpdateQuizSnapshots();
            }, 1000);
          }
        }, 500);
      }
    };

    const handleWindowFocus = () => {
      // Only refresh if we haven't refreshed recently
      if (!throttleTimeout) {
        console.log("Window focused - refreshing quiz and bank data...");

        // Light refresh without quiz snapshots to avoid overloading
        refetchBanks();
        refetchQuizzes();

        // Set throttle to prevent immediate subsequent calls
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 2000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [
    refetchQuizzes,
    refetchBanks,
    handleUpdateQuizSnapshots,
    state.currentView,
  ]);

  // Add navigation listener to refresh data when returning from question bank detail pages
  useEffect(() => {
    const handlePopstate = () => {
      // User navigated back (e.g., from question bank detail page)
      console.log(
        "Navigation detected - refreshing data for potential question bank changes..."
      );

      // Only refresh question banks since that's what might have changed
      refetchBanks();

      // Only update quiz snapshots if we're on the quiz view
      if (state.currentView === "quizzes") {
        // Add delay to allow any backend processing to complete
        setTimeout(() => {
          handleUpdateQuizSnapshots();
        }, 800);
      }
    };

    window.addEventListener("popstate", handlePopstate);

    return () => {
      window.removeEventListener("popstate", handlePopstate);
    };
  }, [refetchBanks, handleUpdateQuizSnapshots, state.currentView]); // Removed refetchQuizzes to reduce calls

  // Check if user exists and has restaurant access
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <h1 className="text-2xl font-bold text-slate-900 mb-4">
                  Access Denied
                </h1>
                <p className="text-slate-600">
                  You need to be logged in to access this page.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Helper functions
  const getQuestionBankNames = useCallback(
    (bankIds: string[]): string[] => {
      return bankIds
        .map((id) => {
          const bank = questionBanks?.find((bank) => bank._id === id);
          return bank?.name || `Unknown Bank (${id.slice(-6)})`;
        })
        .filter(Boolean);
    },
    [questionBanks]
  );

  // Handle view changes
  const handleViewChange = useCallback((view: MainView) => {
    setState((prev) => ({
      ...prev,
      currentView: view,
    }));
  }, []);

  // Handle search
  const handleSearchChange = useCallback((searchTerm: string) => {
    setState((prev) => ({
      ...prev,
      searchTerm,
    }));
  }, []);

  // Question Bank handlers
  const handleQuestionBankDetail = useCallback(
    (bankId: string) => {
      navigate(`/question-banks/${bankId}`);
    },
    [navigate]
  );

  const handleEditQuestionBank = useCallback(
    (bank: IQuestionBank) => {
      navigate(`/question-banks/${bank._id}`);
    },
    [navigate]
  );

  const handleDeleteQuestionBank = useCallback((bank: IQuestionBank) => {
    setDeleteModal({
      isOpen: true,
      item: bank,
      type: "question-bank",
    });
  }, []);

  // Quiz handlers
  const handleQuizDetail = useCallback((quizId: string) => {
    console.log("Navigate to quiz detail:", quizId);
  }, []);

  const handleEditQuiz = useCallback(async (quiz: ClientIQuiz) => {
    console.log("🔄 EditQuiz: Starting...");

    try {
      // Update quiz snapshots to ensure quiz data is current
      console.log("🔄 EditQuiz: Updating quiz snapshots...");
      await updateQuizSnapshots();

      console.log(
        "🔄 EditQuiz: Opening modal (modal will fetch fresh question bank data)..."
      );
      setEditQuizModal({
        isOpen: true,
        quiz: quiz,
      });
    } catch (error) {
      console.error("❌ EditQuiz: Error during snapshot update:", error);
      // Still open modal even if snapshot update fails
      setEditQuizModal({
        isOpen: true,
        quiz: quiz,
      });
    }
  }, []);

  const handleDeleteQuiz = useCallback((quiz: ClientIQuiz) => {
    setDeleteModal({
      isOpen: true,
      item: quiz,
      type: "quiz",
    });
  }, []);

  const handleToggleQuizStatus = useCallback(
    async (quiz: ClientIQuiz) => {
      setActionLoading((prev) => ({ ...prev, toggle: true }));
      try {
        const updateData: UpdateQuizClientData = {
          isAvailable: !quiz.isAvailable,
        };
        await updateQuizDetails(quiz._id, updateData);
        await refetchQuizzes();
      } catch (error) {
        console.error("Failed to toggle quiz status:", error);
      } finally {
        setActionLoading((prev) => ({ ...prev, toggle: false }));
      }
    },
    [refetchQuizzes]
  );

  const handleViewQuizProgress = useCallback((quiz: ClientIQuiz) => {
    setQuizProgressModal({
      isOpen: true,
      quiz: quiz,
    });
  }, []);

  // Modal handlers
  const handleCloseEditQuizModal = useCallback(() => {
    setEditQuizModal({ isOpen: false, quiz: null });
  }, []);

  const handleQuizUpdated = useCallback(
    async (updatedQuiz: ClientIQuiz) => {
      await refetchQuizzes();
      handleCloseEditQuizModal();
    },
    [refetchQuizzes, handleCloseEditQuizModal]
  );

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModal({ isOpen: false, item: null, type: null });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteModal.item || !deleteModal.type) return;

    setActionLoading((prev) => ({ ...prev, delete: true }));
    try {
      if (deleteModal.type === "question-bank") {
        await deleteQuestionBank(deleteModal.item._id);
        await refetchBanks();
      } else {
        await deleteQuiz(deleteModal.item._id);
        await refetchQuizzes();
      }
      handleCloseDeleteModal();
    } catch (error) {
      console.error("Failed to delete item:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, delete: false }));
    }
  }, [deleteModal, refetchBanks, refetchQuizzes, handleCloseDeleteModal]);

  const handleOpenCreateQuestionBankModal = useCallback(() => {
    setCreateQuestionBankModal(true);
  }, []);

  const handleCloseCreateQuestionBankModal = useCallback(() => {
    setCreateQuestionBankModal(false);
  }, []);

  const handleQuestionBankCreated = useCallback(
    async (details: {
      bankId: string;
      sourceType: "manual" | "menu" | "sop";
    }) => {
      await refetchBanks();
      handleCloseCreateQuestionBankModal();
    },
    [refetchBanks, handleCloseCreateQuestionBankModal]
  );

  const handleOpenGenerateQuizModal = useCallback(() => {
    // Force refresh question banks before opening modal to ensure current counts
    refetchBanks();
    setGenerateQuizModal(true);
  }, [refetchBanks]);

  const handleCloseGenerateQuizModal = useCallback(() => {
    setGenerateQuizModal(false);
  }, []);

  const handleQuizGenerated = useCallback(
    async (newQuiz: ClientIQuiz) => {
      await refetchQuizzes();
      handleCloseGenerateQuizModal();
    },
    [refetchQuizzes, handleCloseGenerateQuizModal]
  );

  const handleCloseQuizProgressModal = useCallback(() => {
    setQuizProgressModal({ isOpen: false, quiz: null });
  }, []);

  // Calculate stats for dashboard
  const getStats = useCallback(() => {
    const totalQuestions =
      questionBanks?.reduce(
        (total, bank) => total + (bank.questions?.length || 0),
        0
      ) || 0;

    const activeQuizzes =
      quizzes?.filter((quiz) => quiz.isAvailable)?.length || 0;

    return {
      totalBanks: questionBanks?.length || 0,
      totalQuestions,
      totalQuizzes: quizzes?.length || 0,
      activeQuizzes,
    };
  }, [questionBanks, quizzes]);

  // Filter data based on search term
  const getFilteredData = useCallback(() => {
    if (!state.searchTerm) {
      return { questionBanks: questionBanks || [], quizzes: quizzes || [] };
    }

    const searchLower = state.searchTerm.toLowerCase();

    const filteredBanks = (questionBanks || []).filter(
      (bank) =>
        bank.name.toLowerCase().includes(searchLower) ||
        bank.description?.toLowerCase().includes(searchLower)
    );

    const filteredQuizzes = quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(searchLower) ||
        quiz.description?.toLowerCase().includes(searchLower)
    );

    return { questionBanks: filteredBanks, quizzes: filteredQuizzes };
  }, [questionBanks, quizzes, state.searchTerm]);

  // Get recent items for dashboard with action types
  const getRecentItems = useCallback(() => {
    const allItems = [
      ...(questionBanks || []).map((bank) => ({
        id: bank._id,
        title: bank.name,
        type: "question-bank" as const,
        action: "Created" as const,
        createdAt: bank.createdAt || new Date().toISOString(),
        updatedAt: bank.updatedAt || bank.createdAt || new Date().toISOString(),
      })),
      ...(quizzes || []).map((quiz) => ({
        id: quiz._id,
        title: quiz.title,
        type: "quiz" as const,
        action: "Created" as const,
        createdAt: quiz.createdAt || new Date().toISOString(),
        updatedAt: quiz.updatedAt || quiz.createdAt || new Date().toISOString(),
      })),
    ];

    // Determine action based on created vs updated dates
    const itemsWithActions = allItems.map((item) => {
      const created = new Date(item.createdAt).getTime();
      const updated = new Date(item.updatedAt).getTime();
      const timeDiff = updated - created;

      // If updated is significantly later than created (more than 1 minute), it was edited
      const action = timeDiff > 60000 ? "Edited" : "Created";

      return {
        ...item,
        action,
        // Use the most recent timestamp for sorting
        lastActivity: Math.max(created, updated),
        displayDate: new Date(Math.max(created, updated)).toISOString(),
      };
    });

    return itemsWithActions
      .filter((item) => item.createdAt)
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 5);
  }, [questionBanks, quizzes]);

  const stats = getStats();
  const filteredData = getFilteredData();
  const recentItems = getRecentItems();

  // Handle recent activity item clicks
  const handleRecentItemClick = useCallback(
    (item: any) => {
      if (item.type === "question-bank") {
        handleViewChange("question-banks");
        // Optional: You could also navigate directly to the specific question bank
        // navigate(`/question-banks/${item.id}`);
      } else if (item.type === "quiz") {
        handleViewChange("quizzes");
        // Optional: You could also navigate directly to the specific quiz
        // handleQuizDetail(item.id);
      }
    },
    [handleViewChange]
  );

  // Handle card expand/collapse on mobile
  const toggleCardExpansion = useCallback((cardId: string) => {
    setState((prev) => {
      const newExpandedCards = new Set(prev.expandedCards);
      if (newExpandedCards.has(cardId)) {
        newExpandedCards.delete(cardId);
      } else {
        newExpandedCards.add(cardId);
      }
      return { ...prev, expandedCards: newExpandedCards };
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header with gradient background - Fixed z-index for mobile */}
            <div className="sticky top-0 z-50 bg-gradient-to-br from-background via-slate-50 to-slate-100 pb-6">
              {/* Page Header */}
              <div className="mb-6 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-2xl p-4 lg:p-6 border border-primary/10 shadow-md backdrop-blur-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-gradient-to-r from-primary to-accent rounded-lg shadow-md">
                        <AcademicCapIcon className="h-5 w-5 text-white" />
                      </div>
                      <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Quiz & Knowledge Management
                      </h1>
                    </div>
                    <p className="text-muted-gray text-sm mb-3">
                      Create, organize, and manage question banks and quizzes
                      for staff training and assessment.
                    </p>
                  </div>

                  {/* Search - Full width on mobile */}
                  <div className="relative mb-4 lg:mb-0">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={state.searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-56 text-sm"
                    />
                  </div>

                  {/* Action Buttons - Stack on mobile */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleOpenCreateQuestionBankModal}
                      className="group inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                    >
                      <PlusIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">
                        New Question Bank
                      </span>
                      <span className="sm:hidden">New Bank</span>
                    </button>
                    <button
                      onClick={handleOpenGenerateQuizModal}
                      className="group inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-lg hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                    >
                      <WrenchScrewdriverIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">Generate Quiz</span>
                      <span className="sm:hidden">Quiz</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Navigation Tabs - Mobile responsive */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <nav
                  className="flex space-x-2 lg:space-x-8 px-3 lg:px-6 overflow-x-auto"
                  aria-label="Tabs"
                >
                  {[
                    {
                      key: "dashboard",
                      label: "Dashboard",
                      shortLabel: "Home",
                      icon: ChartBarIcon,
                    },
                    {
                      key: "question-banks",
                      label: "Question Banks",
                      shortLabel: "Banks",
                      icon: BookOpenIcon,
                      count: questionBanks?.length || 0,
                    },
                    {
                      key: "quizzes",
                      label: "Quizzes",
                      shortLabel: "Quizzes",
                      icon: AcademicCapIcon,
                      count: quizzes?.length || 0,
                    },
                  ].map((tab) => {
                    const isActive = state.currentView === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => handleViewChange(tab.key as MainView)}
                        className={`${
                          isActive
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        } whitespace-nowrap py-4 px-1 lg:px-2 border-b-2 font-medium text-sm flex items-center space-x-1 lg:space-x-2 flex-shrink-0`}
                      >
                        <tab.icon className="h-4 w-4" />
                        <span className="hidden lg:inline">{tab.label}</span>
                        <span className="lg:hidden">{tab.shortLabel}</span>
                        {tab.count !== undefined && (
                          <span
                            className={`${
                              isActive
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                            } py-0.5 px-1 lg:px-2 rounded-full text-xs font-medium`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="mt-6">
              {state.loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner message="Loading quiz data..." />
                </div>
              ) : state.error ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Something went wrong
                  </h3>
                  <p className="text-gray-500 mb-4">{state.error}</p>
                  <button
                    onClick={() => {
                      refetchBanks();
                      refetchQuizzes();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {/* Dashboard View */}
                  {state.currentView === "dashboard" && (
                    <div className="space-y-6">
                      {/* Mobile Analytics Toggle */}
                      <div className="lg:hidden">
                        <button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              mobileAnalyticsExpanded:
                                !prev.mobileAnalyticsExpanded,
                            }))
                          }
                          className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <ChartBarIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-900">
                                Analytics Overview
                              </h3>
                              <p className="text-sm text-gray-500">
                                Tap to view stats
                              </p>
                            </div>
                          </div>
                          <div
                            className={`transform transition-transform duration-200 ${
                              state.mobileAnalyticsExpanded ? "rotate-180" : ""
                            }`}
                          >
                            <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        </button>
                      </div>

                      {/* Enhanced Stats Cards with animations */}
                      <div
                        className={`grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 ${
                          !state.mobileAnalyticsExpanded ? "hidden lg:grid" : ""
                        }`}
                      >
                        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                          {/* Gradient overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                          <div className="relative z-10">
                            <div className="flex items-center space-x-2 lg:space-x-3">
                              <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                <BookOpenIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                                  Question Banks
                                </p>
                                <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                                  {stats.totalBanks}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                          <div className="relative z-10">
                            <div className="flex items-center space-x-2 lg:space-x-4">
                              <div className="p-2 lg:p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                <QuestionMarkCircleIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                                  Total Questions
                                </p>
                                <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                                  {stats.totalQuestions}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                          <div className="relative z-10">
                            <div className="flex items-center space-x-2 lg:space-x-4">
                              <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                <AcademicCapIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                                  Total Quizzes
                                </p>
                                <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                                  {stats.totalQuizzes}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                          <div className="relative z-10">
                            <div className="flex items-center space-x-2 lg:space-x-4">
                              <div className="p-2 lg:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                <PlayIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                                  Active Quizzes
                                </p>
                                <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                                  {stats.activeQuizzes}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Recent Activity */}
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                              <ClockIcon className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">
                              Recent Activity
                            </h3>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            Latest updates and changes
                          </p>
                        </div>
                        <div className="p-6">
                          {recentItems.length > 0 ? (
                            <div className="space-y-3">
                              {recentItems.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => handleRecentItemClick(item)}
                                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200 group"
                                >
                                  <div className="flex-shrink-0">
                                    {item.type === "question-bank" ? (
                                      <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors duration-200">
                                        <BookOpenIcon className="h-4 w-4 text-blue-600" />
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors duration-200">
                                        <AcademicCapIcon className="h-4 w-4 text-purple-600" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                                        {item.title}
                                      </p>
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                          item.action === "Created"
                                            ? "bg-green-100 text-green-700"
                                            : item.action === "Edited"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {item.action}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500 capitalize">
                                      {item.type.replace("-", " ")}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <div className="text-sm text-gray-500">
                                      {new Date(
                                        item.displayDate
                                      ).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {new Date(
                                        item.displayDate
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">
                              No recent activity
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Question Banks View */}
                  {state.currentView === "question-banks" && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Question Banks
                          {state.searchTerm && (
                            <span className="text-gray-500 font-normal">
                              {" "}
                              - {filteredData.questionBanks.length} result
                              {filteredData.questionBanks.length !== 1
                                ? "s"
                                : ""}{" "}
                              for "{state.searchTerm}"
                            </span>
                          )}
                        </h2>
                        {!state.searchTerm && (
                          <p className="text-gray-600 mt-1">
                            Organize questions into banks for efficient quiz
                            generation and management.
                          </p>
                        )}
                      </div>

                      {filteredData.questionBanks.length === 0 &&
                      !state.searchTerm ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Question Banks Yet
                          </h3>
                          <p className="text-gray-500 mb-6">
                            Create your first question bank to start building
                            assessments for your restaurant staff.
                          </p>
                          <button
                            onClick={handleOpenCreateQuestionBankModal}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create Question Bank
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                          {filteredData.questionBanks.map((bank) => {
                            const isExpanded =
                              state.expandedCards?.has(bank._id) || false;

                            return (
                              <div
                                key={bank._id}
                                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 group cursor-pointer"
                              >
                                {/* Mobile Header (collapsed by default) */}
                                <div
                                  className="lg:hidden"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCardExpansion(bank._id);
                                  }}
                                >
                                  <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      <div className="flex-shrink-0 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                        <BookOpenIcon className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-gray-900 truncate">
                                          {bank.name}
                                        </h3>
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                                            bank.sourceType === "SOP"
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : bank.sourceType === "MENU"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {bank.sourceType === "SOP"
                                            ? "SOP Based"
                                            : bank.sourceType === "MENU"
                                            ? "Menu Based"
                                            : "Manual Entry"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-600">
                                        {bank.questions?.length ||
                                          bank.questionCount ||
                                          0}
                                      </span>
                                      <div className="transform transition-transform duration-200">
                                        {isExpanded ? (
                                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                        ) : (
                                          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile Expanded Content */}
                                {isExpanded && (
                                  <div className="lg:hidden border-t border-gray-100">
                                    <div className="p-4 space-y-4">
                                      {/* Description */}
                                      {bank.description && (
                                        <p className="text-sm text-gray-600 line-clamp-3">
                                          {bank.description}
                                        </p>
                                      )}

                                      {/* Stats */}
                                      <div className="space-y-2">
                                        <div className="flex items-center text-sm text-gray-500">
                                          <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
                                          {bank.questions?.length ||
                                            bank.questionCount ||
                                            0}{" "}
                                          questions
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500">
                                          <ClockIcon className="h-4 w-4 mr-2" />
                                          {bank.createdAt
                                            ? new Date(
                                                bank.createdAt
                                              ).toLocaleDateString()
                                            : "Unknown date"}
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuestionBankDetail(bank._id);
                                          }}
                                          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                                        >
                                          View Details
                                        </button>
                                        <div className="flex space-x-3">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditQuestionBank(bank);
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 p-1"
                                          >
                                            <PencilIcon className="h-3 w-3 inline mr-1" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteQuestionBank(bank);
                                            }}
                                            className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors duration-200 p-1"
                                          >
                                            <TrashIcon className="h-3 w-3 inline mr-1" />
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Desktop Full Content (always visible) */}
                                <div
                                  className="hidden lg:block p-6"
                                  onClick={() =>
                                    handleQuestionBankDetail(bank._id)
                                  }
                                >
                                  {/* Header */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-gray-100 transition-colors duration-200">
                                        <BookOpenIcon className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                                          {bank.name}
                                        </h3>
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                                            bank.sourceType === "SOP"
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : bank.sourceType === "MENU"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {bank.sourceType === "SOP"
                                            ? "SOP Based"
                                            : bank.sourceType === "MENU"
                                            ? "Menu Based"
                                            : "Manual Entry"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  {bank.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                      {bank.description}
                                    </p>
                                  )}

                                  {/* Stats */}
                                  <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
                                      {bank.questions?.length ||
                                        bank.questionCount ||
                                        0}{" "}
                                      questions
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500">
                                      <ClockIcon className="h-4 w-4 mr-2" />
                                      {bank.createdAt
                                        ? new Date(
                                            bank.createdAt
                                          ).toLocaleDateString()
                                        : "Unknown date"}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditQuestionBank(bank);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 p-1"
                                      >
                                        <PencilIcon className="h-3 w-3 inline mr-1" />
                                        Manage
                                      </button>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteQuestionBank(bank);
                                      }}
                                      className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors duration-200 p-1"
                                    >
                                      <TrashIcon className="h-3 w-3 inline mr-1" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Empty state for search */}
                      {filteredData.questionBanks.length === 0 &&
                        state.searchTerm && (
                          <div className="text-center py-12">
                            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No question banks found
                            </h3>
                            <p className="text-gray-500">
                              No question banks match your search for "
                              {state.searchTerm}". Try a different search term.
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Quizzes View */}
                  {state.currentView === "quizzes" && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Quizzes
                          {state.searchTerm && (
                            <span className="text-gray-500 font-normal">
                              {" "}
                              - {filteredData.quizzes.length} result
                              {filteredData.quizzes.length !== 1 ? "s" : ""} for
                              "{state.searchTerm}"
                            </span>
                          )}
                        </h2>
                        {!state.searchTerm && (
                          <p className="text-gray-600 mt-1">
                            Manage your quizzes and track staff assessment
                            progress.
                          </p>
                        )}
                      </div>

                      {filteredData.quizzes.length === 0 &&
                      !state.searchTerm ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Quizzes Yet
                          </h3>
                          <p className="text-gray-500 mb-6">
                            Generate your first quiz from existing question
                            banks to assess your staff's knowledge.
                          </p>
                          <button
                            onClick={handleOpenGenerateQuizModal}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                          >
                            <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                            Generate Quiz
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                          {filteredData.quizzes.map((quiz) => {
                            const isExpanded =
                              state.expandedCards?.has(quiz._id) || false;

                            return (
                              <div
                                key={quiz._id}
                                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 group cursor-pointer"
                              >
                                {/* Mobile Header (collapsed by default) */}
                                <div
                                  className="lg:hidden"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCardExpansion(quiz._id);
                                  }}
                                >
                                  <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      <div className="flex-shrink-0 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                        <AcademicCapIcon className="h-4 w-4 text-indigo-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-gray-900 truncate">
                                          {quiz.title}
                                        </h3>
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                                            quiz.isAvailable
                                              ? "bg-green-50 text-green-700 border-green-200"
                                              : "bg-gray-50 text-gray-700 border-gray-200"
                                          }`}
                                        >
                                          {quiz.isAvailable ? (
                                            <>
                                              <PlayIcon className="h-3 w-3 mr-1" />
                                              Active
                                            </>
                                          ) : (
                                            <>
                                              <PauseIcon className="h-3 w-3 mr-1" />
                                              Inactive
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-600">
                                        {quiz.totalUniqueQuestionsInSourceSnapshot ||
                                          0}
                                      </span>
                                      <div className="transform transition-transform duration-200">
                                        {isExpanded ? (
                                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                        ) : (
                                          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile Expanded Content */}
                                {isExpanded && (
                                  <div className="lg:hidden border-t border-gray-100">
                                    <div className="p-4 space-y-4">
                                      {/* Description */}
                                      {quiz.description && (
                                        <p className="text-sm text-gray-600 line-clamp-3">
                                          {quiz.description}
                                        </p>
                                      )}

                                      {/* Quick Stats */}
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                          <div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {quiz.totalUniqueQuestionsInSourceSnapshot ||
                                                0}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Questions
                                            </div>
                                          </div>
                                          <div>
                                            <div
                                              className={`text-lg font-bold ${
                                                quiz.isAvailable
                                                  ? "text-green-600"
                                                  : "text-gray-400"
                                              }`}
                                            >
                                              {quiz.isAvailable
                                                ? "LIVE"
                                                : "OFF"}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Status
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-lg font-bold text-purple-600">
                                              {quiz.targetRoles?.length || 0}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Roles
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Meta Info */}
                                      <div className="space-y-2">
                                        <div className="flex items-center text-sm text-gray-500">
                                          <ClockIcon className="h-4 w-4 mr-2" />
                                          Created{" "}
                                          {quiz.createdAt
                                            ? new Date(
                                                quiz.createdAt
                                              ).toLocaleDateString()
                                            : "Unknown date"}
                                        </div>
                                        {quiz.targetRoles &&
                                          quiz.targetRoles.length > 0 && (
                                            <div className="flex items-center text-sm text-gray-500">
                                              <UserGroupIcon className="h-4 w-4 mr-2" />
                                              <span className="truncate">
                                                {quiz.targetRoles
                                                  .map((role) =>
                                                    typeof role === "string"
                                                      ? role
                                                      : role.name
                                                  )
                                                  .slice(0, 2)
                                                  .join(", ")}
                                                {quiz.targetRoles.length > 2 &&
                                                  ` +${
                                                    quiz.targetRoles.length - 2
                                                  } more`}
                                              </span>
                                            </div>
                                          )}
                                      </div>

                                      {/* Actions */}
                                      <div className="flex flex-col space-y-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuizDetail(quiz._id);
                                          }}
                                          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
                                        >
                                          View Details
                                        </button>
                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleViewQuizProgress(quiz);
                                            }}
                                            className="flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors duration-200"
                                          >
                                            <ChartBarIcon className="h-4 w-4 mr-1.5" />
                                            Analytics
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleQuizStatus(quiz);
                                            }}
                                            disabled={actionLoading.toggle}
                                            className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 ${
                                              quiz.isAvailable
                                                ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                                : "bg-green-50 text-green-700 hover:bg-green-100"
                                            }`}
                                          >
                                            {quiz.isAvailable ? (
                                              <>
                                                <PauseIcon className="h-4 w-4 mr-1.5" />
                                                Pause
                                              </>
                                            ) : (
                                              <>
                                                <PlayIcon className="h-4 w-4 mr-1.5" />
                                                Activate
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-100">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditQuiz(quiz);
                                            }}
                                            className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                                          >
                                            <PencilIcon className="h-3 w-3 mr-1" />
                                            Edit Quiz
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteQuiz(quiz);
                                            }}
                                            className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-red-600 font-medium transition-colors duration-200"
                                          >
                                            <TrashIcon className="h-3 w-3 mr-1" />
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Desktop Full Content (always visible) */}
                                <div
                                  className="hidden lg:block p-6"
                                  onClick={() => handleQuizDetail(quiz._id)}
                                >
                                  {/* Header */}
                                  <div className="flex items-start justify-between mb-3 lg:mb-4">
                                    <div className="flex items-center space-x-2 lg:space-x-3 flex-1 min-w-0">
                                      <div className="flex-shrink-0 p-1.5 lg:p-2 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-gray-100 transition-colors duration-200">
                                        <AcademicCapIcon className="h-4 w-4 lg:h-5 lg:w-5 text-indigo-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-base lg:text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                                          {quiz.title}
                                        </h3>
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                                            quiz.isAvailable
                                              ? "bg-green-50 text-green-700 border-green-200"
                                              : "bg-gray-50 text-gray-700 border-gray-200"
                                          }`}
                                        >
                                          {quiz.isAvailable ? (
                                            <>
                                              <PlayIcon className="h-3 w-3 mr-1" />
                                              Active
                                            </>
                                          ) : (
                                            <>
                                              <PauseIcon className="h-3 w-3 mr-1" />
                                              Inactive
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  {quiz.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                      {quiz.description}
                                    </p>
                                  )}

                                  {/* Quiz Meta Info */}
                                  <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <ClockIcon className="h-4 w-4 mr-2" />
                                      Created{" "}
                                      {quiz.createdAt
                                        ? new Date(
                                            quiz.createdAt
                                          ).toLocaleDateString()
                                        : "Unknown date"}
                                    </div>
                                    {quiz.targetRoles &&
                                      quiz.targetRoles.length > 0 && (
                                        <div className="flex items-center text-sm text-gray-500">
                                          <UserGroupIcon className="h-4 w-4 mr-2" />
                                          <span className="truncate">
                                            {quiz.targetRoles
                                              .map((role) =>
                                                typeof role === "string"
                                                  ? role
                                                  : role.name
                                              )
                                              .slice(0, 2)
                                              .join(", ")}
                                            {quiz.targetRoles.length > 2 &&
                                              ` +${
                                                quiz.targetRoles.length - 2
                                              } more`}
                                          </span>
                                        </div>
                                      )}
                                    {quiz.sourceQuestionBankIds &&
                                      quiz.sourceQuestionBankIds.length > 0 && (
                                        <div className="flex items-center text-sm text-gray-500">
                                          <BookOpenIcon className="h-4 w-4 mr-2" />
                                          <span className="truncate">
                                            {quiz.sourceQuestionBankIds.length}{" "}
                                            question bank
                                            {quiz.sourceQuestionBankIds
                                              .length !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                        </div>
                                      )}
                                  </div>

                                  {/* Quick Stats Row */}
                                  <div className="flex items-center justify-between py-3 bg-gray-50 rounded-lg mb-4">
                                    <div className="flex items-center space-x-4 px-3">
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-gray-900">
                                          {quiz.totalUniqueQuestionsInSourceSnapshot ||
                                            0}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Questions
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div
                                          className={`text-lg font-bold ${
                                            quiz.isAvailable
                                              ? "text-green-600"
                                              : "text-gray-400"
                                          }`}
                                        >
                                          {quiz.isAvailable ? "LIVE" : "OFF"}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Status
                                        </div>
                                      </div>
                                      {quiz.targetRoles &&
                                        quiz.targetRoles.length > 0 && (
                                          <div className="text-center">
                                            <div className="text-lg font-bold text-purple-600">
                                              {quiz.targetRoles.length}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Roles
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  </div>

                                  {/* Primary Actions */}
                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewQuizProgress(quiz);
                                      }}
                                      className="flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors duration-200"
                                    >
                                      <ChartBarIcon className="h-4 w-4 mr-1.5" />
                                      Analytics
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleQuizStatus(quiz);
                                      }}
                                      disabled={actionLoading.toggle}
                                      className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 ${
                                        quiz.isAvailable
                                          ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                          : "bg-green-50 text-green-700 hover:bg-green-100"
                                      }`}
                                    >
                                      {quiz.isAvailable ? (
                                        <>
                                          <PauseIcon className="h-4 w-4 mr-1.5" />
                                          Pause
                                        </>
                                      ) : (
                                        <>
                                          <PlayIcon className="h-4 w-4 mr-1.5" />
                                          Activate
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* Secondary Actions */}
                                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditQuiz(quiz);
                                      }}
                                      className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                                    >
                                      <PencilIcon className="h-3 w-3 mr-1" />
                                      Edit Quiz
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteQuiz(quiz);
                                      }}
                                      className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-red-600 font-medium transition-colors duration-200"
                                    >
                                      <TrashIcon className="h-3 w-3 mr-1" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Empty state for search */}
                      {filteredData.quizzes.length === 0 &&
                        state.searchTerm && (
                          <div className="text-center py-12">
                            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No quizzes found
                            </h3>
                            <p className="text-gray-500">
                              No quizzes match your search for "
                              {state.searchTerm}". Try a different search term.
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button - Hidden on mobile to prevent overlap with notification bell */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-40">
        <div className="relative group">
          {/* Quick actions menu */}
          <div className="absolute bottom-16 right-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-2 space-y-1 min-w-48">
              <button
                onClick={handleOpenCreateQuestionBankModal}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors duration-150"
              >
                <BookOpenIcon className="h-4 w-4" />
                <span>New Question Bank</span>
              </button>
              <button
                onClick={handleOpenGenerateQuizModal}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors duration-150"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Generate Quiz</span>
              </button>
              <button
                onClick={() => navigate("/staff-results")}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 rounded-md transition-colors duration-150"
              >
                <TrophyIcon className="h-4 w-4" />
                <span>View All Analytics</span>
              </button>
            </div>
          </div>

          {/* Main FAB */}
          <button
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 flex items-center justify-center group-hover:rotate-45"
            aria-label="Quick Actions"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Modals */}

      {/* Edit Quiz Modal */}
      <EditQuizModal
        isOpen={editQuizModal.isOpen}
        onClose={handleCloseEditQuizModal}
        onQuizUpdated={handleQuizUpdated}
        initialQuizData={editQuizModal.quiz}
        questionBanks={questionBanks}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        title="Confirm Deletion"
        size="sm"
      >
        <ConfirmationModalContent
          message={
            deleteModal.type === "question-bank"
              ? `Are you sure you want to delete the question bank "${
                  (deleteModal.item as IQuestionBank)?.name
                }"? This action cannot be undone.`
              : `Are you sure you want to delete the quiz "${
                  (deleteModal.item as ClientIQuiz)?.title
                }"? This action cannot be undone.`
          }
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseDeleteModal}
          confirmText={actionLoading.delete ? "Deleting..." : "Delete"}
          confirmButtonVariant="destructive"
        />
      </Modal>

      {/* Create Question Bank Modal */}
      <Modal
        isOpen={createQuestionBankModal}
        onClose={handleCloseCreateQuestionBankModal}
        title="Create New Question Bank"
        size="xl"
      >
        <CreateQuestionBankForm
          onBankCreated={handleQuestionBankCreated}
          onCancel={handleCloseCreateQuestionBankModal}
        />
      </Modal>

      {/* Generate Quiz Modal */}
      <GenerateQuizFromBanksModal
        isOpen={generateQuizModal}
        onClose={handleCloseGenerateQuizModal}
        onQuizGenerated={handleQuizGenerated}
        questionBanks={questionBanks}
      />

      {/* Quiz Progress Modal */}
      <Modal
        isOpen={quizProgressModal.isOpen}
        onClose={handleCloseQuizProgressModal}
        title={`Quiz Progress: ${quizProgressModal.quiz?.title || ""}`}
        size="xl"
      >
        <QuizProgressModalContent
          quiz={quizProgressModal.quiz}
          onClose={handleCloseQuizProgressModal}
        />
      </Modal>
    </div>
  );
};

export default QuizAndBankManagementPage;
