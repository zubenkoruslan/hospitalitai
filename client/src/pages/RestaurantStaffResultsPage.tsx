import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// Interfaces
// Interface for a single result belonging to a staff member
interface ResultSummary {
  _id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  completedAt?: string;
  status: string;
  retakeCount: number;
}

// Interface for a staff member with their results
interface StaffMemberWithResults {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  results: ResultSummary[]; // Array of their quiz results
}

// Helper Components (Assuming LoadingSpinner and ErrorMessage exist elsewhere or define here)
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
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
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

const RestaurantStaffResultsPage: React.FC = () => {
  const [staffData, setStaffData] = useState<StaffMemberWithResults[]>([]);
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0); // Add state for total quizzes
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null); // State for expanded row
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        // Expect { staff: [...], totalAvailableQuizzes: number }
        const response = await api.get<{
          staff: StaffMemberWithResults[];
          totalAvailableQuizzes: number;
        }>("/results/restaurant-view");
        setStaffData(response.data.staff);
        setTotalQuizzes(response.data.totalAvailableQuizzes); // Set total quizzes count
      } catch (err: any) {
        console.error("Error fetching staff results:", err);
        setError(err.response?.data?.message || "Failed to fetch results.");
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "restaurant") {
      fetchResults();
    } else {
      setError("Access denied. Only restaurant owners can view staff results.");
      setLoading(false);
    }
  }, [user]);

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

  const toggleExpand = (staffId: string) => {
    setExpandedStaffId((prevId) => (prevId === staffId ? null : staffId));
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
        Staff Quiz Results
      </h1>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mb-6">
        <Link
          to="/dashboard" // Link back to Restaurant Dashboard
          className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300 transition duration-150 ease-in-out"
        >
          &larr; Back to Dashboard
        </Link>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition duration-150 ease-in-out"
        >
          Logout
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          {staffData.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Staff Member
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Quizzes Completed
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Avg. Score
                  </th>
                  {/* Add more summary columns if needed */}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Joined
                  </th>
                  {/* Maybe add a details button? */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffData.map((staff) => {
                  const completedQuizzes = staff.results.filter(
                    (r) => r.status === "completed"
                  );
                  const totalScore = completedQuizzes.reduce(
                    (sum, r) => sum + r.score,
                    0
                  );
                  const totalPossibleScore = completedQuizzes.reduce(
                    (sum, r) => sum + r.totalQuestions,
                    0
                  );
                  const averagePercentage =
                    totalPossibleScore > 0
                      ? ((totalScore / totalPossibleScore) * 100).toFixed(0)
                      : null; // Handle division by zero
                  const isExpanded = expandedStaffId === staff._id;

                  return (
                    <React.Fragment key={staff._id}>
                      <tr
                        className={`hover:bg-gray-50 ${
                          isExpanded ? "bg-gray-100" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {staff.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {staff.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                          {`${completedQuizzes.length} / ${totalQuizzes}`}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-center font-semibold ${
                            averagePercentage === null
                              ? "text-gray-500"
                              : parseInt(averagePercentage) >= 70
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {averagePercentage !== null
                            ? `${averagePercentage}%`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(staff.createdAt)}
                        </td>
                        {/* Add expand toggle button */}
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => toggleExpand(staff._id)}
                            className={`p-1 rounded text-xs ${
                              isExpanded
                                ? "bg-blue-200 text-blue-800"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Row with Details */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="text-sm text-gray-800">
                              <h4 className="font-semibold mb-2">
                                Quiz Details for {staff.name}:
                              </h4>
                              {completedQuizzes.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                  {completedQuizzes.map((result) => (
                                    <li key={result._id}>
                                      <span className="font-medium">
                                        {result.quizTitle}:
                                      </span>{" "}
                                      {result.score}/{result.totalQuestions} (
                                      {(
                                        (result.score / result.totalQuestions) *
                                        100
                                      ).toFixed(0)}
                                      %)
                                      <span className="text-xs text-gray-500 ml-2">
                                        {" "}
                                        (Completed:{" "}
                                        {formatDate(result.completedAt)})
                                      </span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {" "}
                                        (Retakes:{" "}
                                        {result.retakeCount > 0
                                          ? result.retakeCount - 1
                                          : 0}
                                        )
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500 italic">
                                  No quizzes completed yet.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-6 px-4">
              No staff members found for this restaurant.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantStaffResultsPage;
