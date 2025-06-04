import React, { useState, useEffect, useCallback } from "react";
import { /* Link, */ useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import api, {
  getAvailableQuizzesForStaff,
  getMyQuizProgress,
  getQuizAttemptDetails,
} from "../services/api";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";
import { ClientStaffQuizProgressWithAttempts } from "../types/staffTypes";
import { ClientIQuiz, ClientQuizAttemptDetails } from "../types/quizTypes";
import {
  AcademicCapIcon,
  ChartBarIcon,
  TrophyIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

// New interface for combining Quiz definition with its progress
interface StaffQuizDisplayItem extends ClientIQuiz {
  progress?: ClientStaffQuizProgressWithAttempts | null;
}

// Interface for Ranking Data
interface RankingData {
  myAverageScore: number | null;
  myRank: number | null;
  totalRankedStaff: number;
}

// --- Error Formatting Helper ---
const formatApiError = (err: any, context: string): string => {
  console.error(`Error ${context}:`, err);
  if (err.response) {
    // Server responded with a status code outside 2xx range
    let message =
      err.response.data?.message ||
      `Request failed with status ${err.response.status}.`;
    if (err.response.status >= 500) {
      message += " Please try again later.";
    }
    return message;
  } else if (err.request) {
    // Request was made but no response received (network error)
    return `Network error while ${context}. Please check your connection and try again.`;
  } else {
    // Something else happened (e.g., setting up the request)
    return `An unexpected error occurred while ${context}. Please try again.`;
  }
};

// --- Helper function to format time remaining or specific time ---
const formatAvailability = (nextAvailableAtIso?: string | null): string => {
  if (!nextAvailableAtIso) return "";
  const nextAvailableDate = new Date(nextAvailableAtIso);
  const now = new Date();

  if (nextAvailableDate <= now) return "Available now";

  const diffMs = nextAvailableDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  // const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (diffHours > 0) {
    return `Available in ${diffHours}h ${diffMinutes}m`;
  }
  if (diffMinutes > 0) {
    return `Available in ${diffMinutes}m`;
  }
  return `Available in <1m`; // Or show seconds if preferred
  // Alternatively, for a specific time:
  // return `Available at ${nextAvailableDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

// --- Helper Component for Rendering a Single Quiz Item (Refactored) ---
interface QuizItemProps {
  quizDisplayItem: StaffQuizDisplayItem;
  onViewAttemptIncorrectAnswers: (attemptId: string) => void;
}

const QuizItem: React.FC<QuizItemProps> = ({
  quizDisplayItem,
  onViewAttemptIncorrectAnswers,
}) => {
  const {
    title,
    description,
    progress,
    _id: quizId,
    retakeCooldownHours,
    nextAvailableAt,
  } = quizDisplayItem;
  const navigate = useNavigate();

  const isCompletedOverall = progress?.isCompletedOverall || false;
  const overallProgressPercentage =
    progress?.totalUniqueQuestionsInSource &&
    progress.totalUniqueQuestionsInSource > 0
      ? Math.round(
          ((progress.seenQuestionIds?.length || 0) /
            progress.totalUniqueQuestionsInSource) *
            100
        )
      : 0;

  const isQuizOnCooldown =
    nextAvailableAt && new Date() < new Date(nextAvailableAt);

  return (
    <Card
      data-testid={`quiz-item-${quizId}`}
      variant="default"
      hover={true}
      className={`flex flex-col justify-between h-full transition-all duration-200 ${
        isCompletedOverall
          ? "border-green-200 bg-green-50/30"
          : isQuizOnCooldown
          ? "border-amber-200 bg-amber-50/30"
          : "border-slate-200 hover:border-blue-300"
      }`}
    >
      <div className="flex-grow space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-grow min-w-0">
            <h3
              className="text-base sm:text-lg font-semibold text-slate-900 mb-1 line-clamp-2"
              title={title}
            >
              {title}
            </h3>
            {description && (
              <p className="text-sm text-slate-600 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 ml-3">
            {isCompletedOverall ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
            ) : isQuizOnCooldown ? (
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-amber-600" />
              </div>
            ) : (
              <div className="p-2 bg-blue-100 rounded-lg">
                <PlayIcon className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-semibold text-slate-900">
              {overallProgressPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                isCompletedOverall
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
              }`}
              style={{ width: `${overallProgressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Average Score */}
        {progress?.averageScore !== null &&
          progress?.averageScore !== undefined && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Your Average
                </span>
                <span
                  className={`text-lg font-bold ${
                    progress.averageScore >= 80
                      ? "text-green-600"
                      : progress.averageScore >= 70
                      ? "text-blue-600"
                      : "text-red-600"
                  }`}
                >
                  {progress.averageScore.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

        {/* All Attempts - Expandable for mobile */}
        {progress && progress.attempts && progress.attempts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">
              All Attempts ({progress.attempts.length})
            </h4>
            <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
              {progress.attempts.map((attempt, index) => (
                <div
                  key={attempt._id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors duration-150"
                >
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-800">
                        #{progress.attempts.length - index}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        {new Date(attempt.attemptDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span
                      className={`text-sm font-semibold ${
                        attempt.score >= attempt.totalQuestions * 0.7
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {attempt.score}/{attempt.totalQuestions}
                    </span>
                    {attempt.hasIncorrectAnswers &&
                      progress.staffUserId?._id && (
                        <Button
                          variant="secondary"
                          className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 bg-transparent border-blue-200 hover:border-blue-300"
                          onClick={() =>
                            onViewAttemptIncorrectAnswers(attempt._id)
                          }
                        >
                          Review
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-slate-200">
        {isQuizOnCooldown ? (
          <div className="text-center space-y-2">
            <Button
              variant="secondary"
              className="w-full bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed"
              disabled
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Quiz completed today
            </Button>
            <p className="text-xs text-amber-600">
              {formatAvailability(nextAvailableAt)}
            </p>
          </div>
        ) : !isCompletedOverall ? (
          <Button
            variant="primary"
            className="w-full shadow-lg"
            onClick={() => navigate(`/staff/quiz/${quizId}/take`)}
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Take Quiz</span>
            <span className="sm:hidden">Start</span>
          </Button>
        ) : progress && progress.attempts.length === 0 ? (
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 text-slate-600">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm">Quiz completed</span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-2 rounded-lg bg-green-100 text-green-700">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Completed!</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const StaffDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // State for quizzes
  const [quizzes, setQuizzes] = useState<StaffQuizDisplayItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(true);
  const [quizError, setQuizError] = useState<string | null>(null);

  // State for ranking
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loadingRanking, setLoadingRanking] = useState<boolean>(true);
  const [rankingError, setRankingError] = useState<string | null>(null);

  // State for Incorrect Answers Modal
  const [isIncorrectAnswersModalOpen, setIsIncorrectAnswersModalOpen] =
    useState<boolean>(false);
  const [selectedAttemptForModal, setSelectedAttemptForModal] =
    useState<ClientQuizAttemptDetails | null>(null);
  const [_modalError, setModalError] = useState<string | null>(null);
  const [_modalLoading, setModalLoading] = useState<boolean>(false);

  // Combined loading state
  const isLoading = authIsLoading || loadingQuizzes || loadingRanking;

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "staff") {
        setLoadingQuizzes(false);
        setLoadingRanking(false);
        return;
      }

      setLoadingQuizzes(true);
      setQuizError(null);
      try {
        const available = await getAvailableQuizzesForStaff();
        if (available && available.length > 0) {
          const quizzesWithProgressPromises = available.map(async (quizDef) => {
            try {
              const progress = await getMyQuizProgress(quizDef._id);
              return {
                ...quizDef,
                progress: progress || undefined,
              };
            } catch (progressError) {
              console.error(
                `Failed to fetch progress for quiz ${quizDef._id}:`,
                progressError
              );
              return {
                ...quizDef,
                progress: undefined,
              };
            }
          });
          const quizzesWithProgress = await Promise.all(
            quizzesWithProgressPromises
          );
          setQuizzes(quizzesWithProgress);
        }
      } catch (err: any) {
        setQuizError(formatApiError(err, "fetching quizzes and progress"));
      } finally {
        setLoadingQuizzes(false);
      }

      // Fetch Ranking Data
      setLoadingRanking(true);
      setRankingError(null);
      try {
        const rankingResponse = await api.get<RankingData>(
          "/quiz-results/staff-ranking"
        );
        setRankingData(rankingResponse.data);
      } catch (err: any) {
        setRankingError(formatApiError(err, "fetching ranking data"));
      } finally {
        setLoadingRanking(false);
      }
    };

    fetchData();
  }, [user]); // Rerun if user changes

  // Helper to format date (copied from deleted StaffQuizListPage)
  const _formatDate = (dateString?: string | Date) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  // MODIFIED/NEW: Handler for opening modal with specific attempt details
  const handleOpenAttemptIncorrectAnswersModal = useCallback(
    async (attemptId: string) => {
      setModalLoading(true);
      setModalError(null);
      setSelectedAttemptForModal(null);

      try {
        const attemptDetailsResponse = await getQuizAttemptDetails(attemptId);
        if (attemptDetailsResponse) {
          setSelectedAttemptForModal(attemptDetailsResponse);
        } else {
          setModalError("Could not load attempt details.");
        }
      } catch (error) {
        console.error("Error fetching attempt details for modal:", error);
        setModalError(formatApiError(error, "loading incorrect answers"));
      } finally {
        setModalLoading(false);
        setIsIncorrectAnswersModalOpen(true);
      }
    },
    []
  );

  const handleCloseIncorrectAnswersModal = () => {
    setIsIncorrectAnswersModalOpen(false);
    setSelectedAttemptForModal(null);
    setModalError(null);
  };

  // Show loading spinner if auth context is loading
  if (authIsLoading) return <LoadingSpinner message="Authenticating..." />;

  // Handle case where user is definitively not staff
  if (!user || user.role !== "staff") {
    return (
      <div className="p-8 flex flex-col items-center">
        <ErrorMessage
          message={
            quizError ||
            rankingError ||
            "Access Denied. Please log in as Staff."
          }
        />
        <Button
          variant="primary"
          onClick={() => navigate("/login")}
          className="mt-4"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  // Calculate pending and completed quizzes
  const pendingQuizzes = quizzes.filter(
    (quiz) => !quiz.progress?.isCompletedOverall
  );
  const completedQuizzes = quizzes.filter(
    (quiz) => quiz.progress?.isCompletedOverall
  );

  // Display Ranking Info - Modified to remove Rank display
  const renderRankingInfo = () => {
    if (loadingRanking)
      return <LoadingSpinner message="Loading performance summary..." />;
    if (rankingError) return <ErrorMessage message={rankingError} />;
    if (!rankingData)
      return <p className="text-gray-600">Could not load performance data.</p>;

    const { myAverageScore } = rankingData;

    return (
      <Card title="Performance Summary">
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium">Your Average Score:</span>
            {myAverageScore !== null ? (
              // Add span with conditional coloring
              <span
                className={`font-semibold ${
                  myAverageScore >= 70 ? "text-green-600" : "text-red-600"
                }`}
              >
                {` ${myAverageScore.toFixed(1)}%`}
              </span>
            ) : (
              " N/A (No completed quizzes)"
            )}
          </p>
        </div>
      </Card>
    );
  };

  // --- Main Render ---

  if (isLoading && !user) {
    // Show main loader if auth is still loading
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <LoadingSpinner message="Loading dashboard..." />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 border border-slate-200 shadow-sm">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 rounded-full blur-3xl"></div>

              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg flex-shrink-0">
                      <UserIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
                        Staff Dashboard
                      </h1>
                      <p className="text-slate-600 text-sm sm:text-base mt-1">
                        Welcome back, {user?.name}!
                      </p>
                    </div>
                  </div>

                  {/* Quick action button for mobile */}
                  <div className="flex-shrink-0">
                    {pendingQuizzes.length > 0 && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          navigate(`/staff/quiz/${pendingQuizzes[0]._id}/take`)
                        }
                        className="w-full sm:w-auto bg-white/80 backdrop-blur-sm hover:bg-white/90 text-blue-600 border-blue-200 hover:border-blue-300"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">
                          Continue Learning
                        </span>
                        <span className="sm:hidden">Start Quiz</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Training progress overview */}
                <div className="mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                      <BookOpenIcon className="h-5 w-5 text-slate-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800">
                        Training Progress
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {completedQuizzes.length} of {quizzes.length} quizzes
                      completed
                      {quizzes.length > 0 && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {Math.round(
                            (completedQuizzes.length / quizzes.length) * 100
                          )}
                          %
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
              {/* Quizzes Completed */}
              <Card variant="elevated" className="border-0 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      Quizzes Completed
                    </p>
                    <p className="text-3xl font-bold text-slate-900 truncate">
                      {completedQuizzes.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {pendingQuizzes.length > 0
                        ? `${pendingQuizzes.length} pending`
                        : "All caught up!"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Average Score */}
              <Card variant="elevated" className="border-0 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      Average Score
                    </p>
                    <p className="text-3xl font-bold text-slate-900 truncate">
                      {rankingData?.myAverageScore !== null &&
                      rankingData?.myAverageScore !== undefined
                        ? `${rankingData.myAverageScore.toFixed(1)}%`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {rankingData?.myAverageScore !== null &&
                      rankingData?.myAverageScore !== undefined
                        ? rankingData.myAverageScore >= 80
                          ? "Excellent performance!"
                          : rankingData.myAverageScore >= 70
                          ? "Good progress"
                          : "Keep improving"
                        : "Take a quiz to see your score"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Error Message */}
            {(quizError || rankingError) && (
              <Card
                variant="outlined"
                className="border-red-200 bg-red-50/50 mb-6"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-800 mb-1">
                      Unable to load data
                    </h3>
                    <ErrorMessage
                      message={quizError || rankingError || "An error occurred"}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Enhanced Quizzes Section */}
            <Card
              variant="elevated"
              className="border-0 shadow-lg overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 sm:px-6 py-4 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                      <AcademicCapIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                        Available Quizzes
                      </h2>
                      <p className="text-sm text-slate-600">
                        {quizzes.length} quiz{quizzes.length !== 1 ? "es" : ""}{" "}
                        available
                      </p>
                    </div>
                  </div>

                  {/* Filter/Sort options - could be added later */}
                  {pendingQuizzes.length > 0 && completedQuizzes.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {pendingQuizzes.length} pending
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                        {completedQuizzes.length} completed
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {quizzes.length === 0 ? (
                  <div className="text-center py-12 sm:py-16">
                    <div className="relative">
                      <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <AcademicCapIcon className="h-10 w-10 sm:h-12 sm:w-12 text-slate-500" />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3">
                      No quizzes available
                    </h3>
                    <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                      Check back later for new training materials. Your manager
                      may be preparing new content for you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pending Quizzes */}
                    {pendingQuizzes.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <PlayIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            Continue Learning
                          </h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            {pendingQuizzes.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {pendingQuizzes.map((quizDisplayItem) => (
                            <QuizItem
                              key={quizDisplayItem._id}
                              quizDisplayItem={quizDisplayItem}
                              onViewAttemptIncorrectAnswers={
                                handleOpenAttemptIncorrectAnswersModal
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Quizzes */}
                    {completedQuizzes.length > 0 && (
                      <div className="space-y-4">
                        {pendingQuizzes.length > 0 && (
                          <div className="border-t border-slate-200 pt-6"></div>
                        )}
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            Completed Quizzes
                          </h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            {completedQuizzes.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {completedQuizzes.map((quizDisplayItem) => (
                            <QuizItem
                              key={quizDisplayItem._id}
                              quizDisplayItem={quizDisplayItem}
                              onViewAttemptIncorrectAnswers={
                                handleOpenAttemptIncorrectAnswersModal
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isIncorrectAnswersModalOpen && selectedAttemptForModal && (
        <ViewIncorrectAnswersModal
          isOpen={isIncorrectAnswersModalOpen}
          onClose={handleCloseIncorrectAnswersModal}
          attemptDetails={selectedAttemptForModal}
        />
      )}
    </div>
  );
};

export default StaffDashboard;
