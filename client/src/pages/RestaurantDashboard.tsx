import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { getStaffList } from "../services/api"; // Added getStaffList
import Navbar from "../components/Navbar";
import { useStaffSummary } from "../hooks/useStaffSummary";
import { useQuizCount } from "../hooks/useQuizCount";
import { useMenus } from "../hooks/useMenus";
import { useCategoriesAnalytics } from "../hooks/useCategoriesAnalytics";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ErrorMessage from "../components/common/ErrorMessage";
import LoadingSpinner from "../components/common/LoadingSpinner";

import { ResultSummary, StaffMemberWithData } from "../types/staffTypes"; // Added StaffMemberWithData, ensure ResultSummary is still used or remove
import BarChart from "../components/charts/BarChart"; // Added BarChart import
import { ChartData } from "chart.js"; // Added ChartData import
import { Doughnut } from "react-chartjs-2"; // Added Doughnut chart import
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  ChartOptions,
} from "chart.js";

// Register Chart.js components - Including all required components for Doughnut charts
ChartJS.register(ArcElement, Tooltip, Legend, Title);

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
  CakeIcon,
  BeakerIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
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
  const {
    categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategoriesAnalytics();

  // Get notifications for recent notifications section
  const { notifications } = useNotifications();

  // Chart Data State for Knowledge Categories
  const [categoriesChartData, setCategoriesChartData] =
    useState<ChartData<"doughnut"> | null>(null);

  // Keep other state

  // State for menu upload modal
  const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] = useState(false);

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

  // Enhanced chart options with better styling and responsive design
  const chartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false, // We'll show a custom legend
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(59, 130, 246, 0.5)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed || 0;
            return ` ${label}: ${value}%`;
          },
        },
      },
      title: {
        display: false,
      },
    },
    cutout: "50%",
    rotation: -90,
    circumference: 360,
    animation: {
      animateRotate: true,
      animateScale: false,
      duration: 1000,
    },
    elements: {
      arc: {
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    },
  };

  // Effect to listen for analytics refresh events
  useEffect(() => {
    const handleAnalyticsRefresh = () => {
      console.log(
        "[Restaurant Dashboard] Received analytics refresh event, refetching data..."
      );
      fetchMenus(); // Refresh menus in case categories changed
      // The useCategoriesAnalytics hook will automatically refresh due to the event
    };

    window.addEventListener("analytics-refresh", handleAnalyticsRefresh);

    return () => {
      window.removeEventListener("analytics-refresh", handleAnalyticsRefresh);
    };
  }, [fetchMenus]);

  // Effect to prepare chart data when categoriesData changes
  useEffect(() => {
    console.log("Categories data received:", categoriesData); // Debug logging

    if (categoriesData && categoriesData.length > 0) {
      // Define knowledge category labels and colors
      const categoryLabels = {
        "food-knowledge": "Food Knowledge",
        "beverage-knowledge": "Beverage Knowledge",
        "wine-knowledge": "Wine Knowledge",
        "procedures-knowledge": "Procedures Knowledge",
      };

      const categoryColors = {
        "food-knowledge": "rgba(34, 197, 94, 0.8)", // Green
        "beverage-knowledge": "rgba(59, 130, 246, 0.8)", // Blue
        "wine-knowledge": "rgba(147, 51, 234, 0.8)", // Purple
        "procedures-knowledge": "rgba(249, 115, 22, 0.8)", // Orange
      };

      const labels = categoriesData.map(
        (cat) =>
          categoryLabels[cat.category as keyof typeof categoryLabels] ||
          cat.category
      );

      const averageScoreData = categoriesData.map(
        (cat) => Math.round(cat.averageAccuracy * 10) / 10
      );

      const backgroundColors = categoriesData.map(
        (cat) =>
          categoryColors[cat.category as keyof typeof categoryColors] ||
          "rgba(75, 192, 192, 0.8)"
      );

      const borderColors = backgroundColors.map((color) =>
        color.replace("0.8", "1")
      );

      const chartData = {
        labels,
        datasets: [
          {
            label: "Average Score (%)",
            data: averageScoreData,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            hoverOffset: 10,
            hoverBorderWidth: 3,
          },
        ],
      };

      console.log("Chart data prepared:", chartData); // Debug logging
      setCategoriesChartData(chartData);
    } else {
      console.log("No categories data or empty array"); // Debug logging
      setCategoriesChartData(null);
    }
  }, [categoriesData]);

  // Combine loading and error states for overall display
  const isLoading =
    authIsLoading ||
    staffLoading ||
    quizCountLoading ||
    menuLoading ||
    categoriesLoading;
  const displayError =
    staffError || quizCountError || menuError || categoriesError;

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

  // Enhanced skeleton loading component
  const SkeletonCard = ({ className = "" }: { className?: string }) => (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}
    >
      <div className="animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-20"></div>
            <div className="h-6 bg-slate-200 rounded w-12"></div>
          </div>
        </div>
        <div className="mt-4 h-4 bg-slate-200 rounded w-24"></div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header skeleton */}
              <div className="mb-8 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-3xl p-8 border border-primary/10 shadow-lg">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-slate-200/60 rounded-xl"></div>
                    <div className="h-8 bg-slate-200/60 rounded w-80"></div>
                  </div>
                  <div className="h-5 bg-slate-200/60 rounded w-96 mb-4"></div>
                  <div className="h-12 bg-slate-200/60 rounded-xl w-80"></div>
                </div>
              </div>

              {/* Stats grid skeleton */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>

              {/* Action cards skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-12 bg-slate-200 rounded-xl"></div>
                      <div className="h-12 bg-slate-200 rounded-xl"></div>
                      <div className="h-10 bg-slate-200 rounded-xl"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-40 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-16 bg-slate-200 rounded-xl"></div>
                      <div className="h-16 bg-slate-200 rounded-xl"></div>
                      <div className="h-16 bg-slate-200 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart skeleton */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-64 mb-6"></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="w-80 h-80 bg-slate-200 rounded-full mx-auto"></div>
                    <div className="space-y-4">
                      <div className="h-20 bg-slate-200 rounded-xl"></div>
                      <div className="h-20 bg-slate-200 rounded-xl"></div>
                      <div className="h-20 bg-slate-200 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Handle access denied specifically if it came from the hook
  if (!isLoading && staffError?.startsWith("Access denied")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="text-center">
              <Card
                variant="outlined"
                className="max-w-md mx-auto border-secondary/30"
              >
                <h1 className="text-2xl font-bold text-secondary mb-4">
                  Error
                </h1>
                <p className="text-muted-gray">{staffError}</p>
                <Button
                  variant="primary"
                  onClick={() => navigate("/login")}
                  className="mt-4"
                >
                  Go to Login
                </Button>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Handle general errors
  if (displayError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="text-center">
              <Card
                variant="outlined"
                className="max-w-md mx-auto border-secondary/30"
              >
                <h1 className="text-2xl font-bold text-secondary mb-4">
                  Error
                </h1>
                <p className="text-muted-gray">{displayError}</p>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header with gradient background */}
            <div className="mb-8 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-3xl p-8 border border-primary/10 shadow-lg backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-gradient-to-r from-primary to-accent rounded-xl shadow-lg">
                      <HomeIcon className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {user?.restaurantName || "Restaurant"} Dashboard
                    </h1>
                  </div>
                  <p className="text-muted-gray text-lg mb-4">
                    Welcome back,{" "}
                    <span className="font-semibold text-dark-slate">
                      {user?.name}
                    </span>
                    ! Here's your comprehensive overview.
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Grid with animations */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Total Staff Card */}
              <Link to="/staff-results" className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 relative overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <UsersIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 group-hover:text-slate-600">
                          Total Staff
                        </p>
                        <p className="text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {staffData.length}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                      <span>View Details</span>
                      <ArrowRightIcon className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Quizzes Active Card */}
              <Link to="/quiz-management" className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <AcademicCapIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 group-hover:text-slate-600">
                          Quizzes Active
                        </p>
                        <p className="text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {totalQuizzes}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-green-600 text-sm font-medium group-hover:text-green-700">
                      <span>Manage Quizzes</span>
                      <ArrowRightIcon className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Menus Active Card */}
              <Link to="/menu" className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <DocumentTextIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 group-hover:text-slate-600">
                          Menus Active
                        </p>
                        <p className="text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {menus.length}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-amber-600 text-sm font-medium group-hover:text-amber-700">
                      <span>Manage Menus</span>
                      <ArrowRightIcon className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Enhanced Average Performance Card */}
              <Link to="/staff-results" className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <ChartBarIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 group-hover:text-slate-600">
                          Avg. Performance
                        </p>
                        <p className="text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {overallAveragePerformance}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-purple-600 text-sm font-medium group-hover:text-purple-700">
                      <span>View Analytics</span>
                      <ArrowRightIcon className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Enhanced Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-600 rounded-lg">
                      <ClockIcon className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Quick Actions
                    </h2>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Streamline your workflow
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <button
                    onClick={() => navigate("/upload")}
                    className="w-full group flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <DocumentArrowUpIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    <span>Upload Menu PDF</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ArrowRightIcon className="h-4 w-4" />
                    </div>
                  </button>

                  <Link
                    to="/quiz-management"
                    className="w-full group flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <PlusIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    <span>Create New Quiz</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ArrowRightIcon className="h-4 w-4" />
                    </div>
                  </Link>

                  {/* Additional action */}
                  <Link
                    to="/staff-results"
                    className="w-full group flex items-center justify-center space-x-3 px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 border border-slate-200"
                  >
                    <TrophyIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>View Analytics</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ArrowRightIcon className="h-4 w-4" />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Enhanced Recent Notifications */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-orange-500 rounded-lg">
                        <BellIcon className="h-4 w-4 text-white" />
                      </div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Recent Notifications
                      </h2>
                    </div>
                    {recentNotifications.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {recentNotifications.filter((n) => !n.isRead).length}{" "}
                        new
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Stay updated with your team
                  </p>
                </div>
                <div className="p-6">
                  {recentNotifications.length > 0 ? (
                    <div className="space-y-3">
                      {recentNotifications.map((notification, index) => (
                        <div
                          key={notification._id}
                          className={`group p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                            notification.isRead
                              ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                              : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                          }`}
                          style={{
                            animationDelay: `${index * 0.1}s`,
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div
                                className={`p-2 rounded-lg ${
                                  notification.isRead
                                    ? "bg-slate-200"
                                    : "bg-blue-200"
                                }`}
                              >
                                {notification.type === "new_quiz" && (
                                  <AcademicCapIcon className="h-4 w-4 text-slate-600" />
                                )}
                                {notification.type === "completed_training" && (
                                  <TrophyIcon className="h-4 w-4 text-green-600" />
                                )}
                                {notification.type === "new_staff" && (
                                  <UsersIcon className="h-4 w-4 text-blue-600" />
                                )}
                                {notification.type === "new_assignment" && (
                                  <ClipboardDocumentIcon className="h-4 w-4 text-purple-600" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm leading-relaxed ${
                                  notification.isRead
                                    ? "text-slate-600"
                                    : "text-slate-900 font-medium"
                                }`}
                              >
                                {notification.content}
                              </p>
                              <div className="flex items-center mt-2 space-x-2">
                                <ClockIcon className="h-3 w-3 text-slate-400" />
                                <p className="text-xs text-slate-500">
                                  {formatNotificationTime(
                                    notification.createdAt
                                  )}
                                </p>
                              </div>
                            </div>
                            {!notification.isRead && (
                              <div className="flex-shrink-0">
                                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <BellIcon className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-900 mb-1">
                        No notifications yet
                      </h3>
                      <p className="text-sm text-slate-500">
                        You'll see updates about your team's progress here
                      </p>
                    </div>
                  )}

                  {recentNotifications.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <Link
                        to="/notifications"
                        className="group flex items-center justify-center w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 rounded-lg hover:bg-blue-50"
                      >
                        <span>View all notifications</span>
                        <ArrowRightIcon className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Knowledge Categories Performance Chart */}
            {categoriesLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-purple-600 rounded-lg">
                      <ChartBarIcon className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Knowledge Categories Performance
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="animate-pulse">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="w-80 h-80 bg-slate-200 rounded-full mx-auto"></div>
                      <div className="space-y-4">
                        <div className="h-20 bg-slate-200 rounded-xl"></div>
                        <div className="h-20 bg-slate-200 rounded-xl"></div>
                        <div className="h-20 bg-slate-200 rounded-xl"></div>
                        <div className="h-16 bg-slate-200 rounded-xl"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : categoriesError ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-red-500 rounded-lg">
                      <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Knowledge Categories Performance
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 mb-2">
                      Analytics Unavailable
                    </h3>
                    <p className="text-sm text-red-600 mb-1">
                      {categoriesError}
                    </p>
                    <p className="text-xs text-slate-500">
                      Please try refreshing the page or check back later
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
              </div>
            ) : categoriesChartData &&
              categoriesData &&
              categoriesData.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-purple-600 rounded-lg">
                      <ChartBarIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Knowledge Categories Performance
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Average scores across the four knowledge areas
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {/* Four Horizontal Circular Charts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {categoriesData.map((cat, index) => {
                      const categoryConfig = {
                        "food-knowledge": {
                          label: "Food Knowledge",
                          color: "rgba(34, 197, 94, 0.8)",
                          bgColor: "bg-green-50",
                          borderColor: "border-green-200",
                          icon: CakeIcon,
                          iconColor: "text-green-600",
                        },
                        "beverage-knowledge": {
                          label: "Beverage Knowledge",
                          color: "rgba(59, 130, 246, 0.8)",
                          bgColor: "bg-blue-50",
                          borderColor: "border-blue-200",
                          icon: BeakerIcon,
                          iconColor: "text-blue-600",
                        },
                        "wine-knowledge": {
                          label: "Wine Knowledge",
                          color: "rgba(147, 51, 234, 0.8)",
                          bgColor: "bg-purple-50",
                          borderColor: "border-purple-200",
                          icon: GlobeAltIcon,
                          iconColor: "text-purple-600",
                        },
                        "procedures-knowledge": {
                          label: "Procedures Knowledge",
                          color: "rgba(249, 115, 22, 0.8)",
                          bgColor: "bg-orange-50",
                          borderColor: "border-orange-200",
                          icon: Cog6ToothIcon,
                          iconColor: "text-orange-600",
                        },
                      };

                      const config = categoryConfig[
                        cat.category as keyof typeof categoryConfig
                      ] || {
                        label: cat.category,
                        color: "rgba(75, 192, 192, 0.8)",
                        bgColor: "bg-gray-50",
                        borderColor: "border-gray-200",
                        icon: ChartBarIcon,
                        iconColor: "text-gray-600",
                      };

                      const score = Math.round(cat.averageAccuracy * 10) / 10;
                      const IconComponent = config.icon;

                      // Performance status
                      const getPerformanceStatus = (score: number) => {
                        if (score >= 85)
                          return {
                            label: "Excellent",
                            color: "text-green-600",
                            bgColor: "bg-green-100",
                          };
                        if (score >= 70)
                          return {
                            label: "Good",
                            color: "text-blue-600",
                            bgColor: "bg-blue-100",
                          };
                        if (score >= 50)
                          return {
                            label: "Fair",
                            color: "text-yellow-600",
                            bgColor: "bg-yellow-100",
                          };
                        return {
                          label: "Needs Improvement",
                          color: "text-red-600",
                          bgColor: "bg-red-100",
                        };
                      };

                      const status = getPerformanceStatus(score);

                      const chartData = {
                        labels: [config.label, "Remaining"],
                        datasets: [
                          {
                            data: [score, 100 - score],
                            backgroundColor: [
                              config.color,
                              "rgba(226, 232, 240, 0.3)",
                            ],
                            borderColor: [
                              config.color.replace("0.8", "1"),
                              "rgba(226, 232, 240, 0.5)",
                            ],
                            borderWidth: 3,
                            cutout: "75%",
                            borderRadius: 4,
                          },
                        ],
                      };

                      const singleChartOptions: ChartOptions<"doughnut"> = {
                        responsive: true,
                        maintainAspectRatio: true,
                        devicePixelRatio: window.devicePixelRatio || 2,
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: false },
                        },
                        animation: {
                          animateRotate: true,
                          duration: 1200,
                          easing: "easeOutQuart",
                        },
                        elements: {
                          arc: {
                            borderWidth: 3,
                            hoverBorderWidth: 4,
                            borderAlign: "inner",
                          },
                        },
                        layout: {
                          padding: 0,
                        },
                      };

                      return (
                        <Link
                          to="/staff-results"
                          key={cat.category}
                          className="group block"
                        >
                          <div
                            className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 cursor-pointer`}
                          >
                            {/* Icon and Status */}
                            <div className="flex items-center justify-between mb-4">
                              <div
                                className={`p-2 bg-white rounded-lg border ${config.borderColor} shadow-sm`}
                              >
                                <IconComponent
                                  className={`h-5 w-5 ${config.iconColor}`}
                                />
                              </div>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                              >
                                {status.label}
                              </span>
                            </div>

                            {/* Chart */}
                            <div className="w-32 h-32 mx-auto relative mb-4">
                              <Doughnut
                                data={chartData}
                                options={singleChartOptions}
                              />
                              {/* Center text overlay */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-slate-900 group-hover:scale-110 transition-transform duration-300">
                                    {score}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Category Info */}
                            <div className="text-center">
                              <h4 className="font-semibold text-slate-900 text-sm mb-2 group-hover:text-slate-700 transition-colors">
                                {config.label}
                              </h4>
                              <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
                                <span className="flex items-center">
                                  <ClipboardDocumentIcon className="h-3 w-3 mr-1" />
                                  {cat.totalQuestions} answered
                                </span>
                                <span className="flex items-center">
                                  <UsersIcon className="h-3 w-3 mr-1" />
                                  {cat.totalStaffParticipating} staff
                                </span>
                              </div>

                              {/* View Details Indicator */}
                              <div className="mt-3 flex items-center justify-center text-xs text-slate-400 group-hover:text-blue-600 transition-colors">
                                <span>View Details</span>
                                <ArrowRightIcon className="ml-1 h-3 w-3 transform group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-slate-400 rounded-lg">
                      <ChartBarIcon className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Knowledge Categories Performance
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center py-16">
                    <div className="mx-auto w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                      <ChartBarIcon className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      Analytics Coming Soon
                    </h3>
                    <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
                      Knowledge category performance will appear here once your
                      staff begin taking quizzes. Create quizzes and assign them
                      to staff to see detailed analytics.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Food Knowledge
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Beverage Knowledge
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        Wine Knowledge
                      </span>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                        Procedures Knowledge
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() =>
                        (window.location.href = "/quiz-management")
                      }
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Your First Quiz
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          {/* Quick actions menu */}
          <div className="absolute bottom-16 right-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-2 space-y-1 min-w-48">
              <Link
                to="/upload"
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors duration-150"
              >
                <DocumentArrowUpIcon className="h-4 w-4" />
                <span>Upload Menu</span>
              </Link>
              <Link
                to="/quiz-management"
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors duration-150"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create Quiz</span>
              </Link>
              <Link
                to="/staff-results"
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors duration-150"
              >
                <TrophyIcon className="h-4 w-4" />
                <span>View Analytics</span>
              </Link>
            </div>
          </div>

          {/* Main FAB */}
          <button
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 flex items-center justify-center group-hover:rotate-45"
            aria-label="Quick Actions"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
