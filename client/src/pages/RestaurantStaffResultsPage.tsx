import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar"; // Import Navbar

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
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0); // Keep track of total quizzes
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null); // State for expanded row
  const { user } = useAuth(); // Use logout from Navbar
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        // Endpoint returns { staff: StaffMemberWithResults[], totalAvailableQuizzes: number }
        const response = await api.get<{
          staff: StaffMemberWithResults[];
          totalAvailableQuizzes: number;
        }>("/results/restaurant-view");
        setStaffData(response.data.staff || []);
        setTotalQuizzes(response.data.totalAvailableQuizzes || 0);
      } catch (err: any) {
        console.error("Error fetching staff results:", err);
        setError(err.response?.data?.message || "Failed to fetch results.");
        setStaffData([]);
        setTotalQuizzes(0);
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

  const formatDate = (dateString?: string, includeTime: boolean = false) => {
    if (!dateString) return "N/A";
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
      }
      return new Date(dateString).toLocaleDateString("en-US", options);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  const toggleExpand = (staffId: string) => {
    setExpandedStaffId((prevId) => (prevId === staffId ? null : staffId));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {" "}
          {/* Wider container */}
          <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
            Staff Quiz Results
          </h1>
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {!loading && !error && (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              {staffData.length > 0 ? (
                <div className="overflow-x-auto">
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
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Joined
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">View Details</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staffData.map((staff) => {
                        const completedQuizzes = staff.results.filter(
                          (r) => r.status === "completed"
                        );
                        const totalScore = completedQuizzes.reduce(
                          (sum, r) => sum + (r.score || 0),
                          0
                        );
                        const totalPossibleScore = completedQuizzes.reduce(
                          (sum, r) => sum + (r.totalQuestions || 0),
                          0
                        );
                        const averagePercentage =
                          totalPossibleScore > 0
                            ? ((totalScore / totalPossibleScore) * 100).toFixed(
                                0
                              )
                            : null;
                        const isExpanded = expandedStaffId === staff._id;

                        return (
                          <React.Fragment key={staff._id}>
                            <tr
                              className={`hover:bg-gray-50 ${
                                isExpanded ? "bg-blue-50" : ""
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                {/* Clickable Name */}
                                <Link
                                  to={`/staff/${staff._id}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {staff.name}
                                </Link>
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
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <button
                                  onClick={() => toggleExpand(staff._id)}
                                  className={`p-1 px-2 rounded text-xs ${
                                    isExpanded
                                      ? "bg-blue-200 text-blue-800"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                  aria-expanded={isExpanded}
                                  aria-controls={`details-${staff._id}`}
                                  aria-label={`${
                                    isExpanded ? "Hide" : "Show"
                                  } quiz details for ${staff.name}`}
                                >
                                  {isExpanded ? "Hide" : "Details"}
                                </button>
                              </td>
                            </tr>
                            {/* Expanded Row with Details */}
                            {isExpanded && (
                              <tr id={`details-${staff._id}`}>
                                <td
                                  colSpan={5}
                                  className="px-6 py-4 bg-gray-50 border-t border-gray-200"
                                >
                                  <div className="text-sm text-gray-800">
                                    <h4 className="font-semibold mb-2 text-gray-700">
                                      Quiz Details:
                                    </h4>
                                    {completedQuizzes.length > 0 ? (
                                      <ul className="space-y-2">
                                        {completedQuizzes.map((result) => (
                                          <li
                                            key={result._id}
                                            className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                                          >
                                            <span className="font-medium">
                                              {result.quizTitle}:
                                            </span>{" "}
                                            {result.score}/
                                            {result.totalQuestions} (
                                            {(
                                              (result.score /
                                                result.totalQuestions) *
                                              100
                                            ).toFixed(0)}
                                            %)
                                            <span className="text-xs text-gray-500 ml-2">
                                              {" "}
                                              (Completed:{" "}
                                              {formatDate(
                                                result.completedAt,
                                                true
                                              )}
                                              )
                                            </span>
                                            <span className="text-xs text-gray-500 ml-2">
                                              {" "}
                                              (Retakes:{" "}
                                              {result.retakeCount > 0
                                                ? result.retakeCount - 1
                                                : 0}
                                              )
                                            </span>
                                            {/* Optional: Add button to view incorrect for this specific quiz */}
                                            {/* <button onClick={() => handleOpenIncorrectModal(result)} className="text-xs text-indigo-500 ml-2 hover:underline">(View Incorrect)</button> */}
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
                </div>
              ) : (
                <p className="text-center text-gray-500 py-6 px-4">
                  No staff members found.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RestaurantStaffResultsPage;
