import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import api, {
  ClientIQuiz,
  ClientStaffQuizProgress,
  getAvailableQuizzesForStaff,
  getMyQuizProgress,
} from "../services/api";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import QuizResultDetailModal from "../components/QuizResultDetailModal";

// Types needed for Quiz Data (copied from deleted StaffQuizListPage)
interface QuizListItem {
  _id: string;
  title: string;
  description?: string;
  numQuestions: number;
  score?: number;
  totalQuestions?: number;
  completedAt?: Date | string;
  retakeCount?: number;
  status?: string; // e.g., 'pending', 'completed'
  latestResultId?: string; // Added field for the specific result ID from backend
}

// New interface for combining Quiz definition with its progress
interface StaffQuizDisplayItem extends ClientIQuiz {
  progress?: ClientStaffQuizProgress | null;
  averageScore?: number | null;
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

// --- Helper Component for Rendering a Single Quiz Item ---
interface QuizItemProps {
  quizDisplayItem: StaffQuizDisplayItem;
  formatDate: (dateString?: string | Date) => string;
}

const QuizItem: React.FC<QuizItemProps> = ({ quizDisplayItem, formatDate }) => {
  const { title, description, progress, averageScore } = quizDisplayItem;

  // ADDED: Log quizId and title
  useEffect(() => {
    if (quizDisplayItem && quizDisplayItem._id && quizDisplayItem.title) {
      console.log(
        `QUIZ INFO: ID = ${quizDisplayItem._id}, Title = "${quizDisplayItem.title}", AvgScore = ${averageScore}%`
      );
    }
  }, [quizDisplayItem, averageScore]);

  const isCompletedOverall = progress?.isCompletedOverall || false;
  const seenQuestionsCount = progress?.seenQuestionIds?.length || 0;
  const totalUniqueInSource =
    progress?.totalUniqueQuestionsInSource ||
    quizDisplayItem.numberOfQuestionsPerAttempt; // Fallback for display, use quizDisplayItem.numberOfQuestionsPerAttempt

  // Overall Progress calculation
  const overallProgressPercentage =
    totalUniqueInSource > 0
      ? Math.round((seenQuestionsCount / totalUniqueInSource) * 100)
      : 0;

  return (
    <div
      key={quizDisplayItem._id}
      className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 h-full"
    >
      {/* Quiz Info Section */}
      <div className="flex-grow">
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
          {/* {isCompletedOverall && (
            <span className="block text-xxs text-green-600 font-semibold mt-1">
              (Completed Overall)
            </span>
          )} */}
        </div>

        {averageScore !== null && averageScore !== undefined && (
          <p className="text-xs text-gray-500 mt-1 mb-2">
            Your Average Score:{" "}
            <span
              className={`font-semibold ${
                averageScore >= 70 ? "text-green-600" : "text-red-600"
              }`}
            >
              {averageScore.toFixed(1)}%
            </span>
          </p>
        )}
      </div>

      {/* Action Section */}
      <div className="flex-shrink-0 mt-auto pt-3">
        {!isCompletedOverall ? (
          <Link
            to={`/staff/quiz/${quizDisplayItem._id}/take`}
            className="w-full block"
          >
            <Button variant="primary" className="w-full text-sm py-1.5">
              Take Quiz
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
};

const StaffDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Log the user object to inspect its contents
  useEffect(() => {
    console.log("Auth User Object in StaffDashboard:", user);
    if (user && user.userId) {
      console.log("STAFF USER ID (Misha's UserID):", user.userId);
    }
  }, [user]);

  // State for quizzes
  const [quizzes, setQuizzes] = useState<StaffQuizDisplayItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(true);
  const [quizError, setQuizError] = useState<string | null>(null);
  // const [isCompletedVisible, setIsCompletedVisible] = useState<boolean>(false); // State for collapsible section - REMOVED FOR NOW, simplify

  // State for ranking
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loadingRanking, setLoadingRanking] = useState<boolean>(true);
  const [rankingError, setRankingError] = useState<string | null>(null);

  // State for Quiz Detail Modal
  // const [selectedResultIdForModal, setSelectedResultIdForModal] = useState<
  //   string | null
  // >(null);
  // const [isQuizDetailModalOpen, setIsQuizDetailModalOpen] =
  //   useState<boolean>(false);

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
        // 1. Fetch available quiz definitions
        const availableQuizzes = await getAvailableQuizzesForStaff();

        // 2. For each quiz, fetch its progress
        const quizzesWithProgress = await Promise.all(
          availableQuizzes.map(async (quizDef) => {
            try {
              const progress = await getMyQuizProgress(quizDef._id);
              return { ...quizDef, progress: progress || undefined }; // Ensure progress is undefined not null if not found
            } catch (progressError) {
              console.error(
                `Failed to fetch progress for quiz ${quizDef._id}:`,
                progressError
              );
              return { ...quizDef, progress: undefined }; // Attach quiz def even if progress fails
            }
          })
        );
        setQuizzes(quizzesWithProgress);
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
  const formatDate = (dateString?: string | Date) => {
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

  // --- Modal Handlers ---
  const handleOpenQuizDetailModal = (resultId: string) => {
    // setSelectedResultIdForModal(resultId);
    // setIsQuizDetailModalOpen(true);
  };

  const handleCloseQuizDetailModal = () => {
    // setIsQuizDetailModalOpen(false);
    // setSelectedResultIdForModal(null);
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

    const { myAverageScore, myRank, totalRankedStaff } = rankingData;

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
          {/* 
          <p>
            <span className="font-medium">Your Rank:</span> 
            {myRank !== null && totalRankedStaff > 0 
              ? ` ${myRank} out of ${totalRankedStaff}` 
              : " Not ranked yet"}
          </p>
          {totalRankedStaff === 0 && <p className="text-xs text-gray-500">(No staff have completed quizzes yet)</p>}
          */}
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
            {" "}
            {/* Wrapper div for consistent spacing if needed, can be Card directly */}
            <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
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
                        formatDate={formatDate}
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
                        formatDate={formatDate}
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
      {/* Removed QuizDetailModal for now to simplify, can be re-added if needed 
      {selectedResultIdForModal && (
        <QuizResultDetailModal
          isOpen={isQuizDetailModalOpen}
          onClose={handleCloseQuizDetailModal}
          resultId={selectedResultIdForModal}
        />
      )}
      */}
    </div>
  );
};

export default StaffDashboard;
