import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { useStaffSummary } from "../hooks/useStaffSummary";
import { useQuizCount } from "../hooks/useQuizCount";
import { useMenus } from "../hooks/useMenus";

// Updated Interfaces to match API response from GET /api/staff
interface ResultSummary {
  // Assuming this remains the same if still needed
  _id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  completedAt?: string;
  status: string;
  retakeCount: number;
}

interface StaffMemberWithData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  professionalRole?: string;
  resultsSummary: ResultSummary[]; // Keep summary if needed
  averageScore: number | null; // Add the average score from backend
  quizzesTaken: number; // Add the count from backend
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

// Helper function to check if a quiz is completed regardless of capitalization
const isCompletedQuiz = (result: ResultSummary): boolean => {
  const status = result.status.toLowerCase();
  return status === "completed";
};

const RestaurantDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Use custom hooks for data fetching
  const {
    staffData,
    loading: staffLoading,
    error: staffError,
  } = useStaffSummary();
  const {
    quizCount: totalQuizzes,
    loading: quizCountLoading,
    error: quizCountError,
  } = useQuizCount();
  const { menus, loading: menuLoading, error: menuError } = useMenus();

  // Keep other state
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Memoize calculations based on staffData from the hook
  const overallAveragePerformance = useMemo(() => {
    const staffWithScores = staffData.filter(
      (staff) => staff.averageScore !== null
    );
    if (staffWithScores.length === 0) return "0";

    const sumOfAverages = staffWithScores.reduce(
      (sum, staff) => sum + (staff.averageScore as number), // Assert non-null
      0
    );
    const overallAverage = sumOfAverages / staffWithScores.length;
    return overallAverage.toFixed(1); // Display raw average score
  }, [staffData]);

  const filteredStaffData = useMemo(
    () =>
      searchTerm.length >= 3
        ? staffData.filter((staff) =>
            staff.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : staffData,
    [staffData, searchTerm]
  );

  // useCallback for copy handler
  const handleCopyId = useCallback(() => {
    if (user?.restaurantId) {
      navigator.clipboard
        .writeText(user.restaurantId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy ID: ", err);
        });
    }
  }, [user?.restaurantId]); // Dependency: user.restaurantId

  // useCallback for search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  ); // No dependency needed

  // Combine loading and error states for overall display
  const isLoading =
    authIsLoading || staffLoading || quizCountLoading || menuLoading;
  const displayError = staffError || quizCountError || menuError;

  if (isLoading) return <LoadingSpinner />;

  // Handle access denied specifically if it came from the hook
  if (!isLoading && staffError?.startsWith("Access denied")) {
    return (
      <div className="p-8 flex flex-col items-center">
        <ErrorMessage message={staffError} />
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Handle general errors
  if (displayError) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ErrorMessage message={displayError} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6 px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {user?.name}!
          </h1>
        </div>

        <div className="px-4 sm:px-0">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Dashboard Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700">Total Staff</h3>
              <p className="text-3xl font-semibold text-blue-600">
                {staffData.length}
              </p>
              <Link
                to="/staff"
                className="text-sm text-blue-500 hover:underline mt-2 inline-block"
              >
                Manage Staff
              </Link>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700">
                Menu Management
              </h3>
              <p className="text-3xl font-semibold text-green-600">
                {menus.length}
              </p>
              <Link
                to="/menu"
                className="text-sm text-green-500 hover:underline mt-2 inline-block"
              >
                Manage Menus
              </Link>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700">
                Available Quizzes
              </h3>
              <p className="text-3xl font-semibold text-purple-600">
                {totalQuizzes}
              </p>
              <Link
                to="/quiz-management"
                className="text-sm text-purple-500 hover:underline mt-2 inline-block"
              >
                Manage Quizzes
              </Link>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700">
                Staff Performance (Avg. Score)
              </h3>
              <p
                className={`text-3xl font-semibold ${
                  staffData.length === 0
                    ? "text-gray-500"
                    : parseFloat(overallAveragePerformance) >= 70
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {staffData.length > 0 ? `${overallAveragePerformance}%` : "N/A"}
              </p>
              <Link
                to="/staff-results"
                className="text-sm text-amber-500 hover:underline mt-2 inline-block"
              >
                View Quiz Results
              </Link>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between xl:col-span-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Quick Actions
                </h3>
                <div className="mb-3 text-sm text-gray-600">
                  <span className="font-medium">Your Restaurant ID:</span>
                  <div className="mt-1 flex items-center space-x-2 bg-gray-50 p-2 rounded border border-gray-200">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800 flex-grow truncate">
                      {user?.restaurantId}
                    </code>
                    <button
                      onClick={handleCopyId}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                        copied
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                      aria-label="Copy restaurant ID"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Staff use this ID to register.
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                <Link
                  to="/quiz-management/create"
                  className="block px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-center text-sm"
                >
                  Create New Quiz
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200 overflow-x-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h2 className="text-xl font-semibold text-gray-800">Overview</h2>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search staff by name..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Search staff"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {filteredStaffData.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {searchTerm.length >= 3
                  ? `No staff found matching "${searchTerm}".`
                  : "No staff members found or no results available yet."}
              </p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quizzes Taken
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaffData.map((staff) => {
                    return (
                      <tr key={staff._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <Link
                            to={`/staff/${staff._id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                            aria-label={`View details for ${staff.name}`}
                          >
                            {staff.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.professionalRole || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.quizzesTaken ?? 0} / {totalQuizzes}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                            staff.averageScore === null
                              ? "text-gray-500"
                              : staff.averageScore >= 70
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {staff.averageScore !== null
                            ? `${staff.averageScore.toFixed(1)}%`
                            : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RestaurantDashboard;
