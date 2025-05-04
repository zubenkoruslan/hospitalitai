import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import api from "../services/api";

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
}

// Interface for Ranking Data
interface RankingData {
  myAverageScore: number | null;
  myRank: number | null;
  totalRankedStaff: number;
}

// Simple Loading Spinner Placeholder
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

// Simple Error Message Placeholder
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

const StaffDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Log the user object to inspect its contents
  useEffect(() => {
    console.log("Auth User Object in StaffDashboard:", user);
  }, [user]);

  // State for quizzes
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(true);
  const [quizError, setQuizError] = useState<string | null>(null);

  // State for ranking
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loadingRanking, setLoadingRanking] = useState<boolean>(true);
  const [rankingError, setRankingError] = useState<string | null>(null);

  // Fetch quizzes and ranking data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "staff") {
        setLoadingQuizzes(false);
        setLoadingRanking(false);
        // Set appropriate errors if needed, or rely on the main check below
        return;
      }

      // Fetch Quizzes
      setLoadingQuizzes(true);
      setQuizError(null);
      try {
        const quizResponse = await api.get<{ quizzes: QuizListItem[] }>(
          "/quiz/staff-view"
        );
        setQuizzes(quizResponse.data.quizzes);
      } catch (err: any) {
        console.error("Error fetching quizzes:", err);
        setQuizError(
          err.response?.data?.message || "Failed to fetch quiz data."
        );
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
        console.error("Error fetching ranking data:", err);
        setRankingError(
          err.response?.data?.message || "Failed to fetch ranking data."
        );
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

  if (authIsLoading) return <LoadingSpinner />;

  // Combined loading state check (consider showing partial data if one loads first)
  // if (loadingQuizzes || loadingRanking) return <LoadingSpinner />;
  // For now, wait for both or show separate loading indicators

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
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Display Quiz List
  const renderQuizList = () => {
    if (loadingQuizzes) return <LoadingSpinner />;
    if (quizError) return <ErrorMessage message={quizError} />;
    if (quizzes.length === 0 && !loadingQuizzes) {
      return (
        <p className="text-gray-600">No quizzes available at the moment.</p>
      );
    }

    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {quizzes.map((quiz) => {
            const hasResult = quiz.status === "completed" && quiz.completedAt;
            const percentage =
              hasResult &&
              quiz.totalQuestions &&
              quiz.totalQuestions > 0 &&
              quiz.score !== undefined
                ? ((quiz.score / quiz.totalQuestions) * 100).toFixed(0) + "%"
                : "0%";

            return (
              <li
                key={quiz._id}
                className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition-colors duration-150"
              >
                {/* Quiz Info Section */}
                <div className="flex-1 min-w-0 mb-3 sm:mb-0 sm:mr-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {quiz.description}
                    </p>
                  )}
                  {hasResult ? (
                    <p className="text-sm text-gray-500 mt-1">
                      Completed: {formatDate(quiz.completedAt)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      {quiz.numQuestions} Questions
                    </p>
                  )}
                  {hasResult &&
                    quiz.retakeCount !== undefined &&
                    quiz.retakeCount > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Retakes used: {quiz.retakeCount - 1}
                      </p>
                    )}
                </div>

                {/* Action/Score Section */}
                <div className="flex-shrink-0 flex flex-col items-stretch sm:items-end space-y-2 w-full sm:w-auto">
                  {hasResult ? (
                    <>
                      <div className="text-right">
                        <p className="text-lg font-medium text-gray-900">
                          Score: {quiz.score} / {quiz.totalQuestions} (
                          {percentage})
                        </p>
                        {/* Optionally show pass/fail */}
                        <p
                          className={`text-sm font-semibold ${
                            parseInt(percentage) >= 70 // Assuming 70% is passing
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {parseInt(percentage) >= 70 ? "Passed" : "Failed"}
                        </p>
                      </div>
                      {/* Allow retake even if completed */}
                      <Link
                        to={`/staff/quiz/${quiz._id}/take`}
                        className="inline-block text-center w-full sm:w-auto px-4 py-2 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition duration-150 ease-in-out"
                      >
                        Repeat Quiz
                      </Link>
                    </>
                  ) : (
                    <Link
                      to={`/staff/quiz/${quiz._id}/take`}
                      className="inline-block text-center w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition duration-150 ease-in-out"
                    >
                      Take Quiz
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // Display Ranking Info - Modified to remove Rank display
  const renderRankingInfo = () => {
    if (loadingRanking) return <LoadingSpinner />;
    if (rankingError) return <ErrorMessage message={rankingError} />;
    if (!rankingData)
      return <p className="text-gray-600">Could not load performance data.</p>;

    const { myAverageScore, myRank, totalRankedStaff } = rankingData;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Performance Summary
        </h3>
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
      </div>
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
    </div>
  );
};

export default StaffDashboard;
