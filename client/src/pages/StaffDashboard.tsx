import React, { useState, useEffect, useCallback } from "react";
import { /* Link, */ useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";
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
      className="flex flex-col justify-between h-full shadow-sm hover:shadow-lg transition-shadow duration-200 border border-gray-200"
    >
      <div className="flex-grow p-4">
        <h3
          className="text-md font-semibold text-gray-800 mb-1 truncate"
          title={title}
        >
          {title}
        </h3>
        {description && (
          <p className="text-xs text-gray-600 mt-1 mb-2 line-clamp-2">
            {description}
          </p>
        )}
        <div className="mt-2 mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-blue-700">
              Overall Progress
            </span>
            <span className="text-xs font-medium text-blue-700">
              {overallProgressPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallProgressPercentage}%` }}
            ></div>
          </div>
        </div>

        {progress?.averageScore !== null &&
          progress?.averageScore !== undefined && (
            <p className="text-xs text-gray-500 mt-1 mb-2">
              Your Average Score:{" "}
              <span
                className={`font-semibold ${
                  progress.averageScore >= 70
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {progress.averageScore.toFixed(1)}%
              </span>
            </p>
          )}

        {progress && progress.attempts && progress.attempts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-medium text-gray-600 mb-2">
              Your Attempts:
            </h4>
            <ul className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {progress.attempts.map((attempt, index) => (
                <li
                  key={attempt._id}
                  className="text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded-md flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium text-gray-700">
                      Attempt {progress.attempts.length - index}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({new Date(attempt.attemptDate).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`font-semibold mr-2 ${
                        attempt.score >= attempt.totalQuestions * 0.7
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {attempt.score}/{attempt.totalQuestions} pts
                    </span>
                    {attempt.hasIncorrectAnswers &&
                      progress.staffUserId?._id && (
                        <Button
                          variant="secondary"
                          className="text-blue-600 hover:text-blue-700 hover:underline text-xs p-0 m-0 leading-none bg-transparent border-none shadow-none focus:outline-none focus:ring-0"
                          onClick={() =>
                            onViewAttemptIncorrectAnswers(attempt._id)
                          }
                        >
                          View Incorrect
                        </Button>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 mt-auto p-4 border-t border-gray-100">
        {isQuizOnCooldown ? (
          <div className="text-center">
            <Button
              variant="primary"
              className="w-full text-sm py-1.5 opacity-70 cursor-not-allowed bg-slate-400 hover:bg-slate-400 focus:bg-slate-400"
              disabled
            >
              You've completed your quiz for today.
            </Button>
          </div>
        ) : !isCompletedOverall ? (
          <Button
            variant="primary"
            className="w-full text-sm py-1.5"
            onClick={() => navigate(`/staff/quiz/${quizId}/take`)}
          >
            Take Quiz
          </Button>
        ) : progress && progress.attempts.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-1.5">
            Quiz completed. No attempts logged.
          </p>
        ) : (
          <p className="text-xs text-green-600 text-center py-1.5">
            You have completed this quiz.
          </p>
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
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <DashboardLayout title="Loading">
          <main className="flex-grow flex items-center justify-center">
            <LoadingSpinner message="Loading dashboard..." />
          </main>
        </DashboardLayout>
      </div>
    );
  }

  return (
    <DashboardLayout title="Staff Dashboard">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-600 rounded-xl shadow-lg">
              <AcademicCapIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Staff Dashboard
              </h1>
              <p className="text-slate-600 mt-2">
                Track your progress and continue your training journey
              </p>
              {user?.name && (
                <p className="text-sm text-green-700 mt-2 font-medium">
                  Welcome back, {user.name}!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Quizzes Completed */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Quizzes Completed
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {completedQuizzes.length}
                </p>
              </div>
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Certificates Earned */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Certificates Earned
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {completedQuizzes.length}
                </p>
              </div>
              <div className="p-3 bg-amber-600 rounded-xl shadow-lg">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Average Score
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {rankingData?.myAverageScore !== null &&
                  rankingData?.myAverageScore !== undefined
                    ? `${rankingData.myAverageScore.toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <div className="p-3 bg-purple-600 rounded-xl shadow-lg">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {quizError && rankingError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <ErrorMessage message={quizError} />
          </div>
        )}

        {/* Quizzes Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Available Quizzes
            </h2>
          </div>
          <div className="p-6">
            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <AcademicCapIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No quizzes available
                </h3>
                <p className="text-slate-500">
                  Check back later for new training materials.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quizDisplayItem) => (
                  <QuizItem
                    key={quizDisplayItem._id}
                    quizDisplayItem={quizDisplayItem}
                    onViewAttemptIncorrectAnswers={
                      handleOpenAttemptIncorrectAnswersModal
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isIncorrectAnswersModalOpen && selectedAttemptForModal && (
        <ViewIncorrectAnswersModal
          isOpen={isIncorrectAnswersModalOpen}
          onClose={handleCloseIncorrectAnswersModal}
          attemptDetails={selectedAttemptForModal}
        />
      )}
    </DashboardLayout>
  );
};

export default StaffDashboard;
