import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { inviteStaff, getStaffList } from "../services/api"; // Added inviteStaff, getStaffList
import Navbar from "../components/Navbar";
import { useStaffSummary } from "../hooks/useStaffSummary";
import { useQuizCount } from "../hooks/useQuizCount";
import { useMenus } from "../hooks/useMenus";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ErrorMessage from "../components/common/ErrorMessage";
import LoadingSpinner from "../components/common/LoadingSpinner";
import PdfMenuUpload from "../components/menu/PdfMenuUpload"; // Corrected import path
import { ResultSummary, StaffMemberWithData } from "../types/staffTypes"; // Added StaffMemberWithData, ensure ResultSummary is still used or remove
import BarChart from "../components/charts/BarChart"; // Added BarChart import
import { ChartData } from "chart.js"; // Added ChartData import

// Helper function to check if a quiz is completed regardless of capitalization
// This function uses ResultSummary, ensure it's compatible with the imported one
const _isCompletedQuiz = (result: ResultSummary): boolean => {
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
  const {
    menus,
    loading: menuLoading,
    error: menuError,
    fetchMenus,
  } = useMenus();

  // State for Invite Staff
  const [inviteEmail, setInviteEmail] = useState("");
  const [isStaffInviteLoading, setIsStaffInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Chart Data State
  const [averageScoreChartData, setAverageScoreChartData] =
    useState<ChartData<"bar"> | null>(null);

  // Keep other state
  const [copied, setCopied] = useState(false);

  // State for menu upload modal
  const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null); // Can be used for feedback before navigation

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

  const openPdfUploadModal = () => {
    setUploadMessage(null); // Clear previous messages
    setIsPdfUploadModalOpen(true);
  };

  const handleFileSelectedForDashboardUpload = (file: File) => {
    setIsPdfUploadModalOpen(false); // Close the modal
    // Navigate to MenuUploadPage, passing the file in state
    navigate("/menu-upload-path", { state: { fileToUpload: file } });
  };

  const handleActualInviteStaff = async (emailToInvite: string) => {
    setInviteMessage(null);
    setInviteError(null);
    if (!user || !user.restaurantId) {
      setInviteError("Cannot invite staff without restaurant information.");
      return;
    }
    setIsStaffInviteLoading(true);
    try {
      await inviteStaff({ email: emailToInvite });
      setInviteMessage(`Invitation sent to ${emailToInvite}.`);
      setInviteEmail("");
      // Optionally, refresh staffData if useStaffSummary hook doesn't auto-update on new staff
      // This might require making staffData mutable or calling a refresh function from the hook
    } catch (err: any) {
      setInviteError(err.response?.data?.message || "Failed to invite staff.");
    } finally {
      setIsStaffInviteLoading(false);
    }
  };

  const handleInviteFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      handleActualInviteStaff(inviteEmail.trim());
    }
  };

  // Effect to prepare chart data when staffData (from useStaffSummary) changes
  useEffect(() => {
    if (staffData && staffData.length > 0) {
      const labels = staffData.map((staff) => staff.name);

      const averageScores = staffData.map((staff) => staff.averageScore ?? 0);
      setAverageScoreChartData({
        labels,
        datasets: [
          {
            label: "Average Score (%)",
            data: averageScores,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      });
    } else {
      setAverageScoreChartData(null);
    }
  }, [staffData]);

  // Combine loading and error states for overall display
  const isLoading =
    authIsLoading || staffLoading || quizCountLoading || menuLoading;
  const displayError = staffError || quizCountError || menuError;

  if (authIsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Authenticating..." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner message="Loading dashboard data..." />
      </div>
    );
  }

  // Handle access denied specifically if it came from the hook
  if (!isLoading && staffError?.startsWith("Access denied")) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
        <ErrorMessage message={staffError} />
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
        {/* Page Title and Restaurant ID section */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {user?.restaurantName
                  ? `${user.restaurantName} Dashboard`
                  : "Restaurant Dashboard"}
              </h1>
              {user?.restaurantId && (
                <div className="mt-2 flex items-center">
                  <span className="text-sm font-medium text-gray-500 mr-2">
                    Restaurant ID:
                  </span>
                  <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {user.restaurantId}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="ml-2 p-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-700 transition-colors"
                    aria-label="Copy Restaurant ID"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
            {/* Optional: Add a primary action button here if needed for Soft UI style */}
          </div>
        </div>

        {displayError && (
          <div className="mb-6">
            <ErrorMessage message={displayError} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Staff Card - Link to /staff-results */}
          <Link to="/staff-results" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Staff
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {staffData.length}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-blue-500 mt-3 text-right">
                View Details &rarr;
              </p>
            </Card>
          </Link>

          {/* Quizzes Active Card - Link to /quiz-management */}
          <Link to="/quiz-management" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Quizzes Active
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {totalQuizzes}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-green-500 mt-3 text-right">
                Manage Quizzes &rarr;
              </p>
            </Card>
          </Link>

          {/* Menus Active Card - Link to /menu */}
          <Link to="/menu" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Menus Active
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {menus.length}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-3 text-right">
                Manage Menus &rarr;
              </p>
            </Card>
          </Link>

          {/* Overall Average Performance Card - Link to /staff-results */}
          <Link to="/staff-results" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg. Performance
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {overallAveragePerformance}%
                  </dd>
                </div>
              </div>
              <p className="text-xs text-purple-500 mt-3 text-right">
                View Staff Results &rarr;
              </p>
            </Card>
          </Link>
        </div>

        {/* Actions Grid: Menu Upload and Invite Staff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Menu Upload Section */}
          <Card className="bg-white shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Upload New Menu (PDF)
            </h2>
            <div className="space-y-4">
              <Button
                variant="secondary"
                onClick={openPdfUploadModal}
                className="mb-2 w-full text-sm py-2 truncate"
              >
                Select PDF to Upload
              </Button>
              {uploadMessage && (
                <p
                  className={`mt-3 text-xs ${
                    uploadMessage.includes("success")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {uploadMessage}
                </p>
              )}
            </div>
          </Card>

          {/* Invite Staff Section */}
          <Card className="bg-white shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Invite New Staff Member
            </h2>
            <form onSubmit={handleInviteFormSubmit} className="space-y-4">
              <div className="relative w-full">
                <input
                  type="email"
                  placeholder="Enter staff member's email..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Invite staff member"
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
              <Button
                variant="primary"
                type="submit"
                disabled={isStaffInviteLoading}
                className="w-full text-sm py-2"
              >
                {isStaffInviteLoading ? <LoadingSpinner /> : "Invite Staff"}
              </Button>
              {inviteMessage && (
                <p className="text-green-600 text-center mt-2">
                  {inviteMessage}
                </p>
              )}
              {inviteError && (
                <p className="text-red-600 text-center mt-2">{inviteError}</p>
              )}
            </form>
          </Card>
        </div>

        {/* Staff Performance Visualizations Section */}
        {averageScoreChartData && staffData.length > 0 && (
          <Card className="bg-white shadow-lg rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Staff Performance Visualizations
            </h2>
            <div className="mt-6 bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                Average Score by Staff
              </h3>
              {averageScoreChartData ? (
                <div style={{ height: "400px", position: "relative" }}>
                  <BarChart
                    data={averageScoreChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 110,
                          title: {
                            display: true,
                            text: "Average Score (%)",
                          },
                          ticks: {
                            callback: function (value, index, ticks) {
                              if (value === 110) {
                                return null;
                              }
                              return value + "%";
                            },
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: "Staff Member",
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500">
                  No average score data to display.
                </p>
              )}
            </div>
          </Card>
        )}
        {!averageScoreChartData && !staffLoading && staffData.length > 0 && (
          <Card className="bg-white shadow-lg rounded-xl p-6 mb-8">
            <p className="text-gray-500 text-center py-4">
              Visualizations are being generated or no staff data available for
              charts.
            </p>
          </Card>
        )}
        {staffData.length === 0 && !staffLoading && (
          <Card className="bg-white shadow-lg rounded-xl p-6 mb-8">
            <p className="text-gray-500 text-center py-4">
              No staff data available to display performance visualizations.
            </p>
          </Card>
        )}
      </main>

      {/* PDF Upload Modal for Dashboard */}
      {isPdfUploadModalOpen && (
        <PdfMenuUpload
          isOpen={isPdfUploadModalOpen}
          onClose={() => setIsPdfUploadModalOpen(false)}
          onFileSelected={handleFileSelectedForDashboardUpload}
        />
      )}
    </div>
  );
};

export default RestaurantDashboard;
