import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { getStaffList } from "../services/api"; // Added getStaffList
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
import {
  UsersIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowUpOnSquareIcon,
  DocumentArrowUpIcon,
  HomeIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BellIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

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

  // Get notifications for recent notifications section
  const { notifications } = useNotifications();

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

  // Helper function to format notification time
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  // Get recent notifications (limit to 4)
  const recentNotifications = notifications?.slice(0, 4) || [];

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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <LoadingSpinner message="Authenticating..." />
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <LoadingSpinner message="Loading dashboard data..." />
          </div>
        </main>
      </div>
    );
  }

  // Handle access denied specifically if it came from the hook
  if (!isLoading && staffError?.startsWith("Access denied")) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
              <p className="text-gray-600">{staffError}</p>
              <Button
                variant="primary"
                onClick={() => navigate("/login")}
                className="mt-4"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Handle general errors
  if (displayError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
              <p className="text-gray-600">{displayError}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Restaurant Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {user?.restaurantName}! Here's your overview.
              </p>
              {user?.restaurantId && (
                <div className="mt-3 flex items-center space-x-3">
                  <span className="text-sm font-medium text-slate-500">
                    Restaurant ID:
                  </span>
                  <span className="text-sm text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
                    {user.restaurantId}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors duration-200"
                    aria-label="Copy Restaurant ID"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Staff Card */}
              <Link to="/staff-results" className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                      <UsersIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Total Staff
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {staffData.length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                    <span>View Details</span>
                    <svg
                      className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Quizzes Active Card */}
              <Link to="/quiz-management" className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-600 rounded-xl shadow-lg">
                      <AcademicCapIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Quizzes Active
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {totalQuizzes}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-green-600 text-sm font-medium">
                    <span>Manage Quizzes</span>
                    <svg
                      className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Menus Active Card */}
              <Link to="/menu" className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-600 rounded-xl shadow-lg">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Menus Active
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {menus.length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-amber-600 text-sm font-medium">
                    <span>Manage Menus</span>
                    <svg
                      className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Average Performance Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-600 rounded-xl shadow-lg">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Avg. Performance
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {overallAveragePerformance}%
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          parseFloat(overallAveragePerformance),
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Quick Actions
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <button
                    onClick={openPdfUploadModal}
                    className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <DocumentArrowUpIcon className="h-5 w-5" />
                    <span>Upload Menu PDF</span>
                  </button>

                  <Link
                    to="/quiz-management"
                    className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Create New Quiz</span>
                  </Link>
                </div>
              </div>

              {/* Recent Notifications */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Recent Notifications
                  </h2>
                </div>
                <div className="p-6">
                  {recentNotifications.length > 0 ? (
                    <div className="space-y-3">
                      {recentNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-3 rounded-lg border transition-colors ${
                            notification.isRead
                              ? "bg-gray-50 border-gray-200"
                              : "bg-blue-50 border-blue-200"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              <span className="text-lg">
                                {notification.type === "new_quiz" && "🎯"}
                                {notification.type === "completed_training" &&
                                  "🎉"}
                                {notification.type === "new_staff" && "👋"}
                                {notification.type === "new_assignment" && "📋"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${
                                  notification.isRead
                                    ? "text-gray-600"
                                    : "text-gray-900 font-medium"
                                }`}
                              >
                                {notification.content}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatNotificationTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <svg
                          className="mx-auto h-12 w-12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M15 17h5l-5 5-5-5h5V3h-5l5-5 5 5h-5v14z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">
                        No recent notifications
                      </p>
                    </div>
                  )}

                  {recentNotifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Link
                        to="/staff-management"
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        View all notifications →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            {averageScoreChartData && staffData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Staff Performance Overview
                  </h2>
                </div>
                <div className="p-6">
                  <BarChart
                    data={averageScoreChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          titleColor: "white",
                          bodyColor: "white",
                          borderColor: "rgba(59, 130, 246, 0.5)",
                          borderWidth: 1,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          grid: {
                            color: "rgba(148, 163, 184, 0.1)",
                          },
                          ticks: {
                            color: "rgba(100, 116, 139, 0.8)",
                            callback: function (value, index, ticks) {
                              return value + "%";
                            },
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                          ticks: {
                            color: "rgba(100, 116, 139, 0.8)",
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* PDF Upload Modal */}
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
