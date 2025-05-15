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
  const { title, description, numberOfQuestionsPerAttempt, progress } =
    quizDisplayItem;
  const isCompletedOverall = progress?.isCompletedOverall || false;
  const questionsAnsweredToday = progress?.questionsAnsweredToday || 0;
  const seenQuestionsCount = progress?.seenQuestionIds?.length || 0;
  const totalUniqueInSource =
    progress?.totalUniqueQuestionsInSource || numberOfQuestionsPerAttempt; // Fallback for display

  // Overall Progress calculation
  const overallProgressPercentage =
    totalUniqueInSource > 0
      ? Math.round((seenQuestionsCount / totalUniqueInSource) * 100)
      : 0;

  // Daily Progress calculation (example)
  const dailyProgressDisplay = `${questionsAnsweredToday} / ${numberOfQuestionsPerAttempt}`;

  const commonClasses =
    "px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors duration-150";
  const clickableClasses = "hover:bg-gray-50";

  return (
    <li
      key={quizDisplayItem._id}
      className={`${commonClasses} ${clickableClasses}`}
    >
      {/* Quiz Info Section */}
      <div className="flex-1 min-w-0 mb-3 sm:mb-0 sm:mr-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1 truncate">{description}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Overall Progress: {seenQuestionsCount} / {totalUniqueInSource} (
          {overallProgressPercentage}%)
          {isCompletedOverall && (
            <span className="ml-2 text-green-600 font-semibold">
              (Completed)
            </span>
          )}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Questions per Attempt: {numberOfQuestionsPerAttempt}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Answered Today: {dailyProgressDisplay}
        </p>
      </div>

      {/* Action/Score Section */}
      <div className="flex-shrink-0 flex flex-col items-stretch sm:items-end space-y-2 w-full sm:w-auto">
        {!isCompletedOverall ? (
          <Link
            to={`/staff/quiz/${quizDisplayItem._id}/take`}
            className="w-full sm:w-auto"
          >
            <Button variant="primary" className="w-full">
              Take Quiz
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            Quiz Completed
          </Button>
        )}
      </div>
    </li>
  );
};

const StaffDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Log the user object to inspect its contents
  useEffect(() => {
    console.log("Auth User Object in StaffDashboard:", user);
  }, [user]);

  // State for quizzes
  const [quizzes, setQuizzes] = useState<StaffQuizDisplayItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(true);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isCompletedVisible, setIsCompletedVisible] = useState<boolean>(false); // State for collapsible section

  // State for ranking
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loadingRanking, setLoadingRanking] = useState<boolean>(true);
  const [rankingError, setRankingError] = useState<string | null>(null);

  // State for Quiz Detail Modal
  const [selectedResultIdForModal, setSelectedResultIdForModal] = useState<
    string | null
  >(null);
  const [isQuizDetailModalOpen, setIsQuizDetailModalOpen] =
    useState<boolean>(false);

  // Fetch quizzes and ranking data
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
    setSelectedResultIdForModal(resultId);
    setIsQuizDetailModalOpen(true);
  };

  const handleCloseQuizDetailModal = () => {
    setIsQuizDetailModalOpen(false);
    setSelectedResultIdForModal(null);
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

  // Display Quiz List - Modified
  const renderQuizList = () => {
    if (loadingQuizzes && !quizzes.length) {
      return <LoadingSpinner />;
    }
    if (!quizzes.length && !quizError && !loadingQuizzes) {
      return (
        <Card>
          <p className="text-center text-gray-500 py-8">
            No quizzes available at the moment.
          </p>
        </Card>
      );
    }

    const pendingQuizzes = quizzes.filter(
      (quiz) => !quiz.progress?.isCompletedOverall
    );
    const completedQuizzes = quizzes.filter(
      (quiz) => quiz.progress?.isCompletedOverall
    );

    return (
      <div className="space-y-8">
        {/* Pending Quizzes */}
        <Card className="p-0 overflow-hidden">
          <h3 className="text-md font-semibold text-gray-700 px-4 py-3 border-b bg-gray-50">
            Pending Quizzes ({pendingQuizzes.length})
          </h3>
          {pendingQuizzes.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {pendingQuizzes.map((quiz) => (
                <QuizItem
                  key={quiz._id}
                  quizDisplayItem={quiz}
                  formatDate={formatDate}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 px-4 py-4">
              No pending quizzes.
            </p>
          )}
        </Card>

        {/* Completed Quizzes (Collapsible) */}
        {completedQuizzes.length > 0 && (
          <Card className="p-0 overflow-hidden">
            {completedQuizzes.length > 5 ? (
              <button
                onClick={() => setIsCompletedVisible(!isCompletedVisible)}
                className="w-full px-4 py-3 border-b bg-gray-50 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                aria-expanded={isCompletedVisible}
                aria-controls="completed-quizzes-list"
              >
                <h3 className="text-md font-semibold text-gray-700">
                  Completed Quizzes ({completedQuizzes.length})
                </h3>
                {/* Chevron Icon */}
                <svg
                  className={`h-5 w-5 text-gray-500 transform transition-transform duration-150 ${
                    isCompletedVisible ? "rotate-180" : ""
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            ) : (
              <div className="w-full px-4 py-3 border-b bg-gray-50 text-left">
                <h3 className="text-md font-semibold text-gray-700">
                  Completed Quizzes ({completedQuizzes.length})
                </h3>
              </div>
            )}
            {/* Show list if 5 or less, OR if more than 5 AND isCompletedVisible is true */}
            {(completedQuizzes.length <= 5 || isCompletedVisible) && (
              <ul
                id="completed-quizzes-list"
                className="divide-y divide-gray-200 animate-fade-in-short"
              >
                {completedQuizzes.map((quiz) => (
                  <QuizItem
                    key={quiz._id}
                    quizDisplayItem={quiz}
                    formatDate={formatDate}
                  />
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    );
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6 pb-4 border-b border-gray-300">
            <h1 className="text-2xl font-semibold text-gray-900">
              Hello {user?.name?.split(" ")[0] || "User"}!
            </h1>
            {/* Display role and restaurant name */}
            {user?.professionalRole && user?.restaurantName && (
              <p className="text-md text-gray-500 italic">
                {user.professionalRole} at {user.restaurantName}
              </p>
            )}
            {/* Fallback if only one exists (optional) */}
            {/* {user?.professionalRole && !user?.restaurantName && (
              <p className="text-md text-gray-500 italic">{user.professionalRole}</p>
            )}
            {!user?.professionalRole && user?.restaurantName && (
               <p className="text-lg text-gray-600">{user.restaurantName}</p> // Keep original style if only name exists
            )} */}
          </div>

          {/* Layout Container (e.g., Grid) - Reordered Sections */}
          <div className="grid grid-cols-1 gap-6">
            {/* Performance Summary Section (Top) */}
            <section>
              {/* Optional: Add a heading if desired */}
              {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2> */}
              {renderRankingInfo()}
            </section>

            {/* Quiz List Section (Bottom) */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                My Quizzes
              </h2>
              {renderQuizList()}
            </section>
          </div>
        </div>
      </main>

      {/* Quiz Detail Modal */}
      <QuizResultDetailModal
        resultId={selectedResultIdForModal}
        isOpen={isQuizDetailModalOpen}
        onClose={handleCloseQuizDetailModal}
      />
    </div>
  );
};

export default StaffDashboard;
