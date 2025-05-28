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
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading dashboard..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        {/* Page Title Header */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Welcome, {user?.name || "Staff Member"}!
          </h1>
          <p className="mt-1 text-md text-gray-600">
            Here are your available quizzes and performance summary.
          </p>
        </div>

        {/* Combined Error Display for major errors */}
        {(quizError && !rankingError) ||
        (rankingError && !quizError) ||
        (quizError && rankingError) ? (
          <Card className="bg-white shadow-lg rounded-xl p-6 mb-6">
            <ErrorMessage
              message={
                quizError && rankingError
                  ? "Failed to load quiz and ranking data. Please try again later."
                  : quizError || rankingError || "An unexpected error occurred."
              }
            />
          </Card>
        ) : null}

        {/* Main content layout: Performance Summary on top, then Quizzes */}
        <div className="space-y-6">
          {/* Performance Summary Section */}
          <div>
            <Card
              className="bg-white shadow-lg rounded-xl p-4 sm:p-6"
              data-testid="performance-summary-card"
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Your Performance Summary
              </h2>
              {loadingRanking ? (
                <div className="text-center py-10">
                  <LoadingSpinner message="Loading performance data..." />
                </div>
              ) : rankingError ? (
                <ErrorMessage message={rankingError} />
              ) : (
                renderRankingInfo()
              )}
            </Card>
          </div>

          {/* Quizzes Section - Restructured into two cards */}
          {loadingQuizzes && quizzes.length === 0 ? (
            <div className="text-center py-10">
              <LoadingSpinner message="Loading quizzes..." />
            </div>
          ) : !loadingQuizzes && quizzes.length === 0 && !quizError ? (
            <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
              <p className="text-center text-gray-500 py-10">
                No quizzes are currently assigned to you.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Quizzes Card */}
              <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Pending Quizzes ({pendingQuizzes.length})
                </h2>
                {pendingQuizzes.length > 0 ? (
                  <div className="space-y-4">
                    {pendingQuizzes.map((quiz) => (
                      <QuizItem
                        key={quiz._id}
                        quizDisplayItem={quiz}
                        onViewAttemptIncorrectAnswers={
                          handleOpenAttemptIncorrectAnswersModal
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">
                    No pending quizzes. Great job!
                  </p>
                )}
              </Card>

              {/* Completed Quizzes Card */}
              <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Completed Quizzes ({completedQuizzes.length})
                </h2>
                {completedQuizzes.length > 0 ? (
                  <div className="space-y-4">
                    {completedQuizzes.map((quiz) => (
                      <QuizItem
                        key={quiz._id}
                        quizDisplayItem={quiz}
                        onViewAttemptIncorrectAnswers={
                          handleOpenAttemptIncorrectAnswersModal
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">
                    No quizzes completed yet. Keep learning!
                  </p>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
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
