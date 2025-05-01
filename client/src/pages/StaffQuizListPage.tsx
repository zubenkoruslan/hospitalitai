import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api"; // Correct the import path
import { useAuth } from "../context/AuthContext"; // Assuming you have an AuthContext
import Navbar from "../components/Navbar"; // Import Navbar

// Updated Interface to include optional result fields
interface QuizListItem {
  _id: string;
  title: string;
  description?: string;
  numQuestions: number;
  // Optional result fields
  score?: number;
  totalQuestions?: number;
  completedAt?: Date | string; // Allow string initially from JSON, Date after parsing
  retakeCount?: number;
  status?: string;
}

interface ApiError {
  message: string;
}

// Simple Loading Spinner Placeholder
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Simple Error Message Placeholder
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
    role="alert"
  >
    <strong className="font-bold">Error:</strong>
    <span className="block sm:inline"> {message}</span>
  </div>
);

const StaffQuizListPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Get logged-in user info

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      setError(null);
      try {
        // Call the new backend endpoint
        const response = await api.get<{ quizzes: QuizListItem[] }>(
          "/quiz/staff-view" // Use the new combined view endpoint
        );
        setQuizzes(response.data.quizzes);
      } catch (err: any) {
        console.error("Error fetching quizzes:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch quizzes.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    // Fetch quizzes only if the user is logged in and is staff
    if (user && user.role === "staff") {
      fetchQuizzes();
    } else {
      // Handle case where user is not staff or not logged in (optional)
      setError("You must be logged in as staff to view quizzes.");
      setLoading(false);
    }
  }, [user]); // Re-run effect if user changes

  // Add the formatDate helper function
  const formatDate = (dateString?: string) => {
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar /> {/* Add Navbar */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
            Available Quizzes
          </h1>

          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              {quizzes.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {quizzes.map((quiz) => {
                    const hasResult =
                      quiz.status === "completed" && quiz.completedAt;
                    const percentage =
                      hasResult &&
                      quiz.totalQuestions &&
                      quiz.totalQuestions > 0 &&
                      quiz.score !== undefined
                        ? ((quiz.score / quiz.totalQuestions) * 100).toFixed(0)
                        : 0;

                    return (
                      <li
                        key={quiz._id}
                        className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50"
                      >
                        {/* Quiz Info Section */}
                        <div className="flex-1 min-w-0 mb-3 sm:mb-0 sm:mr-4">
                          <h2 className="text-lg font-semibold text-gray-900 truncate">
                            {quiz.title}
                          </h2>
                          {quiz.description && (
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {quiz.description}
                            </p>
                          )}
                          {/* Show num questions if no result, otherwise show completion date */}
                          {!hasResult ? (
                            <p className="text-sm text-gray-500 mt-1">
                              {quiz.numQuestions} Questions
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 mt-1">
                              Completed:{" "}
                              {formatDate(quiz.completedAt?.toString())}
                            </p>
                          )}
                          {/* Show retake count if completed */}
                          {hasResult && quiz.retakeCount !== undefined && (
                            <p className="text-xs text-gray-400 mt-1">
                              Retakes:{" "}
                              {quiz.retakeCount > 0 ? quiz.retakeCount - 1 : 0}
                            </p>
                          )}
                        </div>

                        {/* Action/Score Section */}
                        <div className="flex-shrink-0 flex flex-col items-end space-y-2 w-full sm:w-auto">
                          {hasResult ? (
                            // Display score and Repeat button
                            <>
                              <div className="text-right">
                                <p className="text-lg font-medium text-gray-900">
                                  {quiz.score} / {quiz.totalQuestions}
                                </p>
                                <p
                                  className={`text-sm font-semibold ${
                                    parseInt(percentage.toString()) >= 70
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {percentage}%
                                </p>
                              </div>
                              <Link
                                to={`/staff/quiz/${quiz._id}/take`}
                                className="inline-block text-center w-full sm:w-auto px-4 py-2 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition duration-150 ease-in-out"
                              >
                                Repeat Quiz
                              </Link>
                            </>
                          ) : (
                            // Display Take Quiz button
                            <Link
                              to={`/staff/quiz/${quiz._id}/take`} // Link to the quiz taking page
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
              ) : (
                <p className="text-center text-gray-500 py-6 px-4">
                  No quizzes are currently available for you.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StaffQuizListPage;
