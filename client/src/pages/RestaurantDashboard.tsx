import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { inviteStaff, getStaffList } from "../services/api"; // Added inviteStaff, getStaffList
import DashboardLayout from "../components/layout/DashboardLayout";
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
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner message="Authenticating..." />
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <LoadingSpinner message="Loading dashboard data..." />
        </div>
      </DashboardLayout>
    );
  }

  // Handle access denied specifically if it came from the hook
  if (!isLoading && staffError?.startsWith("Access denied")) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  // Handle general errors
  if (displayError) {
    return (
      <DashboardLayout>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ErrorMessage message={displayError} />
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Restaurant Dashboard">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {user?.restaurantName
                  ? `${user.restaurantName} Dashboard`
                  : "Restaurant Dashboard"}
              </h1>
              <p className="text-slate-600 mt-2">
                Monitor your restaurant's performance and manage your team
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
          </div>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <ErrorMessage message={displayError} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Staff Card */}
          <Link to="/staff-results" className="block group">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
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
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
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
                <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-lg">
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
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
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
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
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
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">
                Quick Actions
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={openPdfUploadModal}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <DocumentArrowUpIcon className="h-5 w-5" />
                <span>Upload Menu PDF</span>
              </button>

              <Link
                to="/quiz-management"
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create New Quiz</span>
              </Link>
            </div>
          </div>

          {/* Invite Staff */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">
                Invite Staff
              </h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleInviteFormSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="invite-email"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="invite-email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter staff email"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isStaffInviteLoading || !inviteEmail.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isStaffInviteLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    "Send Invitation"
                  )}
                </button>
              </form>

              {/* Feedback Messages */}
              {inviteMessage && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">{inviteMessage}</p>
                </div>
              )}

              {inviteError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{inviteError}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        {averageScoreChartData && staffData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">
                Staff Performance Overview
              </h3>
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

      {/* PDF Upload Modal */}
      {isPdfUploadModalOpen && (
        <PdfMenuUpload
          isOpen={isPdfUploadModalOpen}
          onClose={() => setIsPdfUploadModalOpen(false)}
          onFileSelected={handleFileSelectedForDashboardUpload}
        />
      )}
    </DashboardLayout>
  );
};

export default RestaurantDashboard;
