import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import QuizResultDetailModal from "../components/QuizResultDetailModal";

// Interface for individual quiz result details
interface QuizResult {
  _id: string; // Result ID
  quizId: string; // ID of the Quiz document
  quizTitle: string; // Title of the quiz
  score: number;
  totalQuestions: number;
  completedAt?: string;
  status: "Completed" | "In Progress" | "Not Started"; // Example statuses
  retakeCount: number;
  canRetake: boolean; // Flag from backend if retake is allowed
}

// Helper Components (reuse from other pages or define locally)
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

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

// Main Component
const MyResultsPage: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (user && user.role === "staff") {
        setIsLoading(true);
        setError(null);
        try {
          // Assuming an endpoint like '/results/my-results' exists
          const response = await api.get<{ results: QuizResult[] }>(
            "/results/my-results"
          );
          setResults(response.data.results || []);
        } catch (err: any) {
          setError(
            err.response?.data?.message || "Failed to load your quiz results."
          );
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (!authIsLoading) {
      fetchResults();
    }
  }, [user, authIsLoading]);

  const openResultDetail = (resultId: string) => {
    setSelectedResultId(resultId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedResultId(null);
  };

  if (authIsLoading) return <LoadingSpinner />;

  if (!user || user.role !== "staff") {
    // Redirect or show error if not logged in as staff
    return (
      <div className="p-8 flex flex-col items-center">
        <ErrorMessage message="Access Denied. Please log in as Staff." />
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const calculatePercentage = (score: number, total: number) => {
    if (total === 0) return "N/A";
    return ((score / total) * 100).toFixed(1) + "%";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">
              My Quiz Results
            </h1>
            <Link
              to="/staff/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              &larr; Back to Dashboard
            </Link>
          </div>

          {isLoading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!isLoading && !error && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {results.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {results.map((result) => (
                    <li key={result._id} className="px-4 py-4 sm:px-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* Result Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-medium text-blue-700 truncate">
                            {result.quizTitle}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Score:{" "}
                            <span className="font-semibold">
                              {result.score} / {result.totalQuestions} (
                              {calculatePercentage(
                                result.score,
                                result.totalQuestions
                              )}
                              )
                            </span>
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Status:{" "}
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                result.status === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {result.status}
                            </span>
                          </p>
                          {result.completedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Completed:{" "}
                              {new Date(result.completedAt).toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Attempts: {result.retakeCount + 1}{" "}
                          </p>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex-shrink-0 flex space-x-2">
                          {result.status === "Completed" && (
                            <button
                              onClick={() => openResultDetail(result._id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              View Details
                            </button>
                          )}
                          {result.status === "Completed" &&
                            result.canRetake && (
                              <Link
                                to={`/staff/quizzes/${result.quizId}`}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Retake Quiz
                              </Link>
                            )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  You haven't completed any quizzes yet.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Quiz Result Detail Modal */}
      <QuizResultDetailModal
        resultId={selectedResultId}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default MyResultsPage;
