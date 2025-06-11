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

// Interface for Leaderboard Data
interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  roleName?: string;
  overallAverageScore: number;
  totalQuestions: number;
}

interface LeaderboardData {
  topPerformers: LeaderboardEntry[];
  lastUpdated: string;
}

// Interface for Per-Quiz Leaderboard
interface QuizLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  roleName?: string;
  score: number;
  totalQuestions: number;
  completionTime?: number;
}

interface QuizLeaderboard {
  quizId: string;
  quizTitle: string;
  topPerformers: QuizLeaderboardEntry[];
}

interface PerQuizLeaderboardData {
  quizLeaderboards: QuizLeaderboard[];
  lastUpdated: string;
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
    <div
      data-testid={`quiz-item-${quizId}`}
      className={`flex flex-col justify-between h-full transition-all duration-300 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] border border-primary/20 ${
        isCompletedOverall
          ? "bg-gradient-to-br from-green-50 via-emerald-50 to-white"
          : isQuizOnCooldown
          ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-white"
          : "bg-gradient-to-br from-white via-primary-50 to-accent-50"
      }`}
    >
      <div className="flex-grow space-y-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-grow min-w-0">
            <h3
              className="text-lg sm:text-xl font-medium text-dark-slate mb-1 line-clamp-2 tracking-tight"
              title={title}
            >
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-gray line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 ml-3">
            {isCompletedOverall ? (
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-md">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
            ) : isQuizOnCooldown ? (
              <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-md">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
            ) : (
              <div className="p-2 bg-gradient-to-br from-primary to-primary-600 rounded-xl shadow-md">
                <PlayIcon className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-dark-slate">
              Progress
            </span>
            <span className="text-sm font-semibold text-primary-600">
              {overallProgressPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 shadow-inner">
            <div
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                isCompletedOverall
                  ? "bg-gradient-to-r from-emerald-500 to-green-600"
                  : "bg-gradient-to-r from-primary to-primary-600"
              }`}
              style={{ width: `${overallProgressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Average Score */}
        {progress?.averageScore !== null &&
          progress?.averageScore !== undefined && (
            <div className="bg-gradient-to-r from-secondary-50 to-secondary-100 rounded-xl p-3 border border-secondary-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-gradient-to-br from-secondary to-secondary-600 rounded-lg shadow-sm">
                    <ChartBarIcon className="h-4 w-4 text-white flex-shrink-0" />
                  </div>
                  <span className="text-sm font-medium text-dark-slate">
                    Your Average
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-secondary-600">
                    {progress.averageScore.toFixed(1)}%
                  </span>
                  <span className="text-sm">
                    {progress.averageScore >= 80
                      ? "🌟 Excellent"
                      : progress.averageScore >= 70
                      ? "👍 Good"
                      : "📈 Improving"}
                  </span>
                </div>
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
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-white/50 px-4">
        {isQuizOnCooldown ? (
          <div className="text-center space-y-3">
            <button
              className="w-full bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 border border-amber-300 rounded-xl px-4 py-3 font-medium cursor-not-allowed shadow-md"
              disabled
            >
              <ClockIcon className="h-4 w-4 mr-2 inline" />
              Quiz completed today
            </button>
            <p className="text-xs text-amber-600">
              {formatAvailability(nextAvailableAt)}
            </p>
          </div>
        ) : !isCompletedOverall ? (
          <button
            className="w-full bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl px-4 py-3 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => navigate(`/staff/quiz/${quizId}/take`)}
          >
            <PlayIcon className="h-4 w-4 mr-2 inline" />
            <span className="hidden sm:inline">Take Quiz</span>
            <span className="sm:hidden">Start</span>
          </button>
        ) : progress && progress.attempts.length === 0 ? (
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 shadow-md">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Quiz completed</span>
            </div>
          </div>
        ) : (
          <div className="text-center mb-4">
            <div className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-100 to-green-200 text-green-700 shadow-md">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Completed!</span>
            </div>
          </div>
        )}
      </div>
    </div>
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

  // State for leaderboard
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardData | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // State for per-quiz leaderboard
  const [perQuizLeaderboardData, setPerQuizLeaderboardData] =
    useState<PerQuizLeaderboardData | null>(null);
  const [loadingPerQuizLeaderboard, setLoadingPerQuizLeaderboard] =
    useState<boolean>(true);
  const [perQuizLeaderboardError, setPerQuizLeaderboardError] = useState<
    string | null
  >(null);

  // State for active tab
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<
    "overall" | "per-quiz"
  >("overall");

  // State for Incorrect Answers Modal
  const [isIncorrectAnswersModalOpen, setIsIncorrectAnswersModalOpen] =
    useState<boolean>(false);
  const [selectedAttemptForModal, setSelectedAttemptForModal] =
    useState<ClientQuizAttemptDetails | null>(null);
  const [_modalError, setModalError] = useState<string | null>(null);
  const [_modalLoading, setModalLoading] = useState<boolean>(false);

  // Combined loading state
  const isLoading =
    authIsLoading ||
    loadingQuizzes ||
    loadingRanking ||
    loadingLeaderboard ||
    loadingPerQuizLeaderboard;

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

      // Fetch Leaderboard Data
      setLoadingLeaderboard(true);
      setLeaderboardError(null);
      try {
        const leaderboardResponse = await api.get<LeaderboardData>(
          "/analytics/leaderboards?timePeriod=month&limit=5"
        );
        setLeaderboardData(leaderboardResponse.data);
      } catch (err: any) {
        setLeaderboardError(formatApiError(err, "fetching leaderboard data"));
      } finally {
        setLoadingLeaderboard(false);
      }

      // Fetch Per-Quiz Leaderboard Data
      setLoadingPerQuizLeaderboard(true);
      setPerQuizLeaderboardError(null);
      try {
        const perQuizLeaderboardResponse =
          await api.get<PerQuizLeaderboardData>(
            "/analytics/quiz-leaderboards?limit=3"
          );
        setPerQuizLeaderboardData(perQuizLeaderboardResponse.data);
      } catch (err: any) {
        setPerQuizLeaderboardError(
          formatApiError(err, "fetching per-quiz leaderboard data")
        );
      } finally {
        setLoadingPerQuizLeaderboard(false);
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
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="flex justify-center items-center min-h-[60vh]">
              <Card variant="elevated" className="text-center p-8">
                <LoadingSpinner message="Loading dashboard..." />
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-primary-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-primary-50 to-accent-50 rounded-3xl p-8 sm:p-12 mb-8 sm:mb-12 border border-primary/20 shadow-xl backdrop-blur-sm">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl"></div>

              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-4 sm:space-x-6 mb-6 sm:mb-0">
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-primary to-primary-600 rounded-3xl shadow-xl flex-shrink-0">
                      <UserIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-3xl sm:text-5xl font-light text-dark-slate truncate tracking-tight">
                        {user?.name}
                      </h1>
                      <p className="text-muted-gray text-lg sm:text-xl mt-2 font-light">
                        {user?.professionalRole || "Staff"} at{" "}
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                          {user?.restaurantName}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Quick action button */}
                  <div className="flex-shrink-0">
                    {pendingQuizzes.length > 0 && (
                      <button
                        onClick={() =>
                          navigate(`/staff/quiz/${pendingQuizzes[0]._id}/take`)
                        }
                        className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center space-x-3"
                      >
                        <PlayIcon className="h-5 w-5" />
                        <span className="hidden sm:inline text-lg">
                          Continue Learning
                        </span>
                        <span className="sm:hidden">Start Quiz</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Training progress overview */}
                <div className="mt-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-br from-accent to-accent-600 rounded-xl shadow-md">
                        <BookOpenIcon className="h-5 w-5 text-white flex-shrink-0" />
                      </div>
                      <span className="text-lg font-medium text-dark-slate">
                        Training Progress
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-muted-gray font-light">
                        {completedQuizzes.length} of {quizzes.length} quizzes
                        completed
                      </span>
                      {quizzes.length > 0 && (
                        <span className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                          {Math.round(
                            (completedQuizzes.length / quizzes.length) * 100
                          )}
                          %
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Average Score Section */}
                  {rankingData &&
                    rankingData.myAverageScore !== null &&
                    rankingData.myAverageScore !== undefined && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ChartBarIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-800">
                              Average Score
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-lg font-bold ${
                                rankingData.myAverageScore >= 80
                                  ? "text-green-600"
                                  : rankingData.myAverageScore >= 70
                                  ? "text-blue-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {rankingData.myAverageScore.toFixed(1)}%
                            </span>
                            <span className="text-xs text-slate-500">
                              {rankingData.myAverageScore >= 80
                                ? "🌟 Excellent"
                                : rankingData.myAverageScore >= 70
                                ? "👍 Good"
                                : "📈 Improving"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Your Rank Section */}
                  {rankingData &&
                    rankingData.myRank !== null &&
                    rankingData.totalRankedStaff > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <TrophyIcon className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-800">
                              Your Rank
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-600">
                              #{rankingData.myRank} of{" "}
                              {rankingData.totalRankedStaff}
                            </span>
                            {rankingData.myRank <= 3 && (
                              <span className="text-lg">
                                {rankingData.myRank === 1
                                  ? "🥇"
                                  : rankingData.myRank === 2
                                  ? "🥈"
                                  : "🥉"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {(quizError ||
              rankingError ||
              leaderboardError ||
              perQuizLeaderboardError) && (
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
                      message={
                        quizError ||
                        rankingError ||
                        leaderboardError ||
                        perQuizLeaderboardError ||
                        "An error occurred"
                      }
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Enhanced Quizzes Section */}
            <div className="bg-gradient-to-br from-white via-slate-50 to-primary-50 border border-primary/20 shadow-xl overflow-hidden rounded-3xl">
              <div className="bg-gradient-to-r from-primary-50 via-accent-50 to-white px-6 sm:px-8 py-6 border-b border-primary/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary-600 rounded-2xl shadow-lg">
                      <AcademicCapIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-light text-dark-slate tracking-tight">
                        Available
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium ml-2">
                          Quizzes
                        </span>
                      </h2>
                      <p className="text-lg text-muted-gray font-light">
                        {quizzes.length} quiz{quizzes.length !== 1 ? "es" : ""}{" "}
                        ready for you
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

              <div className="p-6 sm:p-8">
                {quizzes.length === 0 ? (
                  <div className="text-center py-16 sm:py-24">
                    <div className="relative">
                      <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary-100 to-accent-100 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
                        <AcademicCapIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary-600" />
                      </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-light text-dark-slate mb-4 tracking-tight">
                      No quizzes
                      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium ml-2">
                        available
                      </span>
                    </h3>
                    <p className="text-lg text-muted-gray max-w-md mx-auto leading-relaxed font-light">
                      Check back later for new training materials. Your manager
                      may be preparing new content for you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pending Quizzes */}
                    {pendingQuizzes.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-br from-primary to-primary-600 rounded-2xl shadow-lg">
                            <PlayIcon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-2xl font-light text-dark-slate tracking-tight">
                            Continue
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium ml-2">
                              Learning
                            </span>
                          </h3>
                          <span className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                            {pendingQuizzes.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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
                      <div className="space-y-6">
                        {pendingQuizzes.length > 0 && (
                          <div className="border-t border-primary/20 pt-8"></div>
                        )}
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-2xl font-light text-dark-slate tracking-tight">
                            Completed
                            <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent font-medium ml-2">
                              Quizzes
                            </span>
                          </h3>
                          <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                            {completedQuizzes.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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
            </div>

            {/* Leaderboard Section */}
            <Card variant="elevated" className="border-0 shadow-lg mt-8">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 sm:px-6 py-4 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg shadow-lg">
                      <TrophyIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                        Leaderboards
                      </h2>
                      <p className="text-sm text-slate-600">
                        See how you rank against your colleagues
                      </p>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                    <button
                      onClick={() => setActiveLeaderboardTab("overall")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeLeaderboardTab === "overall"
                          ? "bg-yellow-100 text-yellow-800 shadow-sm"
                          : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      Overall
                    </button>
                    <button
                      onClick={() => setActiveLeaderboardTab("per-quiz")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeLeaderboardTab === "per-quiz"
                          ? "bg-yellow-100 text-yellow-800 shadow-sm"
                          : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      Per Quiz
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Overall Leaderboard Tab */}
                {activeLeaderboardTab === "overall" && (
                  <>
                    {loadingLeaderboard ? (
                      <div className="flex justify-center items-center py-8">
                        <LoadingSpinner message="Loading overall leaderboard..." />
                      </div>
                    ) : leaderboardError ? (
                      <div className="text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-900 mb-2">
                          Unable to load overall leaderboard
                        </h3>
                        <p className="text-sm text-red-600">
                          {leaderboardError}
                        </p>
                      </div>
                    ) : leaderboardData &&
                      leaderboardData.topPerformers &&
                      leaderboardData.topPerformers.length > 0 ? (
                      <div className="space-y-3">
                        <div className="mb-4 text-center">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            Top 5 Overall Average Scores
                          </h3>
                          <p className="text-sm text-slate-600">
                            Best performers across all quizzes
                          </p>
                        </div>
                        {leaderboardData.topPerformers.map(
                          (performer, index) => {
                            const isCurrentUser =
                              performer.userId === user?._id;
                            const getRankBadge = (rank: number) => {
                              if (rank === 1) return "🥇";
                              if (rank === 2) return "🥈";
                              if (rank === 3) return "🥉";
                              return `#${rank}`;
                            };

                            const getRankStyle = (rank: number) => {
                              if (rank === 1)
                                return "bg-yellow-50 border-yellow-200 text-yellow-800";
                              if (rank === 2)
                                return "bg-gray-50 border-gray-200 text-gray-800";
                              if (rank === 3)
                                return "bg-orange-50 border-orange-200 text-orange-800";
                              return "bg-slate-50 border-slate-200 text-slate-800";
                            };

                            return (
                              <div
                                key={performer.userId}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                                  isCurrentUser
                                    ? "border-blue-300 bg-blue-50 shadow-md"
                                    : getRankStyle(performer.rank)
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="text-2xl font-bold">
                                      {getRankBadge(performer.rank)}
                                    </div>
                                    <div>
                                      <p
                                        className={`font-semibold ${
                                          isCurrentUser
                                            ? "text-blue-900"
                                            : "text-slate-900"
                                        }`}
                                      >
                                        {performer.name}
                                        {isCurrentUser && (
                                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            You
                                          </span>
                                        )}
                                      </p>
                                      {performer.roleName && (
                                        <p
                                          className={`text-sm ${
                                            isCurrentUser
                                              ? "text-blue-600"
                                              : "text-slate-600"
                                          }`}
                                        >
                                          {performer.roleName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div
                                      className={`text-xl font-bold ${
                                        isCurrentUser
                                          ? "text-blue-900"
                                          : "text-slate-900"
                                      }`}
                                    >
                                      {Math.round(
                                        performer.overallAverageScore
                                      )}
                                      %
                                    </div>
                                    <div
                                      className={`text-sm ${
                                        isCurrentUser
                                          ? "text-blue-600"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {performer.totalQuestions} questions
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}

                        {leaderboardData.lastUpdated && (
                          <div className="text-center text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200">
                            Last updated:{" "}
                            {new Date(
                              leaderboardData.lastUpdated
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <TrophyIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          No overall leaderboard data yet
                        </h3>
                        <p className="text-slate-600 max-w-md mx-auto">
                          Complete more quizzes to see how you rank against your
                          colleagues!
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Per-Quiz Leaderboard Tab */}
                {activeLeaderboardTab === "per-quiz" && (
                  <>
                    {loadingPerQuizLeaderboard ? (
                      <div className="flex justify-center items-center py-8">
                        <LoadingSpinner message="Loading quiz leaderboards..." />
                      </div>
                    ) : perQuizLeaderboardError ? (
                      <div className="text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-900 mb-2">
                          Unable to load quiz leaderboards
                        </h3>
                        <p className="text-sm text-red-600">
                          {perQuizLeaderboardError}
                        </p>
                      </div>
                    ) : perQuizLeaderboardData &&
                      perQuizLeaderboardData.quizLeaderboards &&
                      perQuizLeaderboardData.quizLeaderboards.length > 0 ? (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            Top Performers by Quiz
                          </h3>
                          <p className="text-sm text-slate-600">
                            Best scores for each individual quiz
                          </p>
                        </div>
                        {perQuizLeaderboardData.quizLeaderboards.map(
                          (quizLeaderboard) => (
                            <div
                              key={quizLeaderboard.quizId}
                              className="bg-slate-50 rounded-xl p-4 border border-slate-200"
                            >
                              <h4 className="font-semibold text-slate-900 mb-3 text-center">
                                {quizLeaderboard.quizTitle}
                              </h4>
                              <div className="space-y-2">
                                {quizLeaderboard.topPerformers.map(
                                  (performer) => {
                                    const isCurrentUser =
                                      performer.userId === user?._id;
                                    const getRankBadge = (rank: number) => {
                                      if (rank === 1) return "🥇";
                                      if (rank === 2) return "🥈";
                                      if (rank === 3) return "🥉";
                                      return `#${rank}`;
                                    };

                                    return (
                                      <div
                                        key={performer.userId}
                                        className={`p-3 rounded-lg border transition-all duration-200 ${
                                          isCurrentUser
                                            ? "border-blue-300 bg-blue-50"
                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <span className="text-lg font-bold">
                                              {getRankBadge(performer.rank)}
                                            </span>
                                            <div>
                                              <p
                                                className={`font-medium text-sm ${
                                                  isCurrentUser
                                                    ? "text-blue-900"
                                                    : "text-slate-900"
                                                }`}
                                              >
                                                {performer.name}
                                                {isCurrentUser && (
                                                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                                    You
                                                  </span>
                                                )}
                                              </p>
                                              {performer.roleName && (
                                                <p
                                                  className={`text-xs ${
                                                    isCurrentUser
                                                      ? "text-blue-600"
                                                      : "text-slate-600"
                                                  }`}
                                                >
                                                  {performer.roleName}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div
                                              className={`text-lg font-bold ${
                                                isCurrentUser
                                                  ? "text-blue-900"
                                                  : "text-slate-900"
                                              }`}
                                            >
                                              {performer.score}%
                                            </div>
                                            {performer.completionTime && (
                                              <div
                                                className={`text-xs ${
                                                  isCurrentUser
                                                    ? "text-blue-600"
                                                    : "text-slate-500"
                                                }`}
                                              >
                                                {Math.round(
                                                  performer.completionTime / 60
                                                )}
                                                m
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )
                        )}

                        {perQuizLeaderboardData.lastUpdated && (
                          <div className="text-center text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200">
                            Last updated:{" "}
                            {new Date(
                              perQuizLeaderboardData.lastUpdated
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <AcademicCapIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          No quiz leaderboards yet
                        </h3>
                        <p className="text-slate-600 max-w-md mx-auto">
                          Complete some quizzes to see leaderboards for
                          individual quizzes!
                        </p>
                      </div>
                    )}
                  </>
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
