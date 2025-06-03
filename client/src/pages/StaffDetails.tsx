import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getQuizAttemptDetails } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";
import SuccessNotification from "../components/common/SuccessNotification";
import { formatDate } from "../utils/helpers";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { ClientQuizAttemptDetails } from "../types/quizTypes";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

import {
  UserIcon,
  TrophyIcon,
  ClockIcon,
  AcademicCapIcon,
  ChartBarIcon,
  BoltIcon,
  CakeIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// Import Chart.js components for radial chart
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Types for enhanced staff analytics
interface PersonalMetrics {
  totalQuizzesCompleted: number;
  overallAverageScore: number;
  averageCompletionTime: number;
  fastestQuizTime: number | null;
  totalQuestionsAnswered: number;
}

interface CategoryBreakdown {
  foodKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
  beverageKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
  wineKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
  proceduresKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
}

interface RecentQuiz {
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  averageScore: string;
  completionTime: number;
  completedAt: string;
}

interface RestaurantComparison {
  averageScore: number;
  averageCompletionTime: number;
}

interface EnhancedStaffData {
  staffInfo: {
    id: string;
    name: string;
    email: string;
    assignedRoleName?: string;
    dateJoined?: string | Date;
  };
  personalMetrics: PersonalMetrics;
  categoryBreakdown: CategoryBreakdown;
  recentQuizzes: RecentQuiz[];
  restaurantComparison: RestaurantComparison;
}

// Enhanced hook for staff analytics
const useEnhancedStaffAnalytics = (staffId: string | undefined) => {
  const [enhancedData, setEnhancedData] = useState<EnhancedStaffData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnhancedData = async () => {
      if (!staffId) {
        console.log("Enhanced analytics: No staffId provided");
        return;
      }

      console.log("Enhanced analytics: Fetching data for staffId:", staffId);

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/analytics/staff/${staffId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            "Content-Type": "application/json",
          },
        });

        console.log("Enhanced analytics: Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("Enhanced analytics: Error response:", errorText);
          throw new Error(
            `Failed to fetch enhanced staff analytics: ${response.status}`
          );
        }

        const data = await response.json();
        console.log("Enhanced analytics: Data received:", data);
        setEnhancedData(data.data);
      } catch (err) {
        console.log("Enhanced analytics: Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEnhancedData();
  }, [staffId]);

  return { enhancedData, loading, error };
};

// Category configuration for visual consistency
const CATEGORY_CONFIG = {
  foodKnowledge: {
    icon: CakeIcon,
    label: "Food Knowledge",
    color: "#10B981", // Green
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  beverageKnowledge: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    color: "#3B82F6", // Blue
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  wineKnowledge: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    color: "#8B5CF6", // Purple
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  proceduresKnowledge: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    color: "#F59E0B", // Orange
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
  },
};

// Helper function to format completion time
const formatCompletionTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// Personal Performance Cards Component
const PersonalPerformanceCards: React.FC<{
  metrics: PersonalMetrics;
  comparison: RestaurantComparison;
}> = ({ metrics, comparison }) => {
  const cards = [
    {
      title: "Overall Average Score",
      value: `${metrics.overallAverageScore.toFixed(1)}%`,
      comparison: `Restaurant avg: ${comparison.averageScore.toFixed(1)}%`,
      icon: TrophyIcon,
      color: "emerald",
      trend:
        metrics.overallAverageScore >= comparison.averageScore ? "up" : "down",
    },
    {
      title: "Quizzes Completed",
      value: metrics.totalQuizzesCompleted.toString(),
      comparison: `${metrics.totalQuestionsAnswered} questions answered`,
      icon: AcademicCapIcon,
      color: "blue",
    },
    {
      title: "Average Time",
      value: formatCompletionTime(metrics.averageCompletionTime),
      comparison: `Restaurant avg: ${formatCompletionTime(
        comparison.averageCompletionTime
      )}`,
      icon: ClockIcon,
      color: "purple",
      trend:
        metrics.averageCompletionTime <= comparison.averageCompletionTime
          ? "up"
          : "down",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div
            key={index}
            className={`bg-${card.color}-50 rounded-xl p-6 border border-${card.color}-100`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-2">{card.comparison}</p>
              </div>
              <div className={`p-3 bg-${card.color}-100 rounded-lg`}>
                <IconComponent className={`h-6 w-6 text-${card.color}-600`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Category Breakdown Radial Chart Component
const CategoryBreakdownChart: React.FC<{ categoryData: CategoryBreakdown }> = ({
  categoryData,
}) => {
  const categories = Object.entries(categoryData);
  const hasData = categories.some(([_, data]) => data.totalQuestions > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Knowledge Category Breakdown
        </h3>
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">
            Complete quizzes to see category breakdown
          </p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: categories.map(
      ([key, _]) => CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].label
    ),
    datasets: [
      {
        data: categories.map(([_, data]) => data.averageScore),
        backgroundColor: categories.map(
          ([key, _]) =>
            CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG].color
        ),
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const categoryKey = Object.keys(categoryData)[context.dataIndex];
            const data = categoryData[categoryKey as keyof CategoryBreakdown];
            return [
              `Average Score: ${data.averageScore.toFixed(1)}%`,
              `Questions: ${data.totalQuestions}`,
              `Avg Time: ${formatCompletionTime(data.averageCompletionTime)}`,
            ];
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Knowledge Category Breakdown
      </h3>
      <div style={{ height: "400px" }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>

      {/* Category Details */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(([key, data]) => {
          const config = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
          const IconComponent = config.icon;

          if (data.totalQuestions === 0) return null;

          return (
            <div key={key} className={`${config.bgColor} rounded-lg p-4`}>
              <div className="flex items-center gap-3">
                <IconComponent className={`h-5 w-5 ${config.textColor}`} />
                <div className="flex-1">
                  <h4 className={`font-medium ${config.textColor}`}>
                    {config.label}
                  </h4>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">
                      {data.averageScore.toFixed(1)}%
                    </span>{" "}
                    avg score • <span>{data.totalQuestions} questions</span> •{" "}
                    <span>
                      {formatCompletionTime(data.averageCompletionTime)} avg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Recent Quiz History Component
const RecentQuizHistory: React.FC<{
  recentQuizzes: RecentQuiz[];
  onViewDetails: (quizId: string) => void;
}> = ({ recentQuizzes, onViewDetails }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">
          Recent Quiz History
        </h3>
      </div>
      <div className="p-6">
        {recentQuizzes.length > 0 ? (
          <div className="space-y-4">
            {recentQuizzes.map((quiz, index) => (
              <div
                key={quiz.quizId}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">
                    {quiz.quizTitle}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <span>Score: {quiz.averageScore}%</span>
                    <span>
                      Time: {formatCompletionTime(quiz.completionTime)}
                    </span>
                    <span>{formatDate(quiz.completedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      parseFloat(quiz.averageScore) >= 70
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {parseFloat(quiz.averageScore) >= 70 ? "Passed" : "Failed"}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => onViewDetails(quiz.quizId)}
                    className="text-xs px-3 py-1"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AcademicCapIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-900 mb-2">
              No recent quizzes
            </h4>
            <p className="text-slate-500">
              Quiz history will appear here once completed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component Enhancement
const StaffDetails: React.FC = () => {
  const { id: staffId } = useParams<{ id: string }>();
  useAuth();
  const navigate = useNavigate();

  // Original hook for basic data
  const {
    staffDetails,
    loading: basicLoading,
    error: basicError,
  } = useStaffDetails(staffId);

  // Enhanced hook for analytics data
  const {
    enhancedData,
    loading: enhancedLoading,
    error: enhancedError,
  } = useEnhancedStaffAnalytics(staffId);

  // Combined loading and error states
  const loading = basicLoading || enhancedLoading;
  const error = basicError || enhancedError;

  // Debug logging
  console.log("StaffDetails Debug:", {
    staffId,
    basicLoading,
    enhancedLoading,
    basicError,
    enhancedError,
    staffDetails: staffDetails ? "loaded" : "null",
    enhancedData: enhancedData ? "loaded" : "null",
    loading,
    error,
  });

  // State for modals and notifications (unchanged)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDataForIncorrectAnswers, setModalDataForIncorrectAnswers] =
    useState<ClientQuizAttemptDetails | null>(null);
  const [loadingModalDetails, setLoadingModalDetails] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handlers (unchanged)
  const handleOpenAttemptModal = useCallback(async (attemptId: string) => {
    setLoadingModalDetails(true);
    setModalError(null);
    setModalDataForIncorrectAnswers(null);

    try {
      const attemptDetailsData = await getQuizAttemptDetails(attemptId);
      if (attemptDetailsData) {
        setModalDataForIncorrectAnswers(attemptDetailsData);
      } else {
        setModalError("Could not load attempt details.");
      }
    } catch (err: any) {
      console.error("Error fetching attempt details:", err);
      setModalError(err.message || "Failed to load details for this attempt.");
    } finally {
      setLoadingModalDetails(false);
      setIsModalOpen(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDataForIncorrectAnswers(null);
    setModalError(null);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner message="Loading staff details..." />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
                  <div className="p-3 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Error Loading Staff Details
                  </h1>
                  <ErrorMessage message={error} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // No data state
  if (!staffDetails && !enhancedData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                  <div className="p-3 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-slate-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-700 mb-4">
                    Staff Member Not Found
                  </h1>
                  <p className="text-slate-600">
                    The requested staff member could not be found.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Use enhanced data if available, fallback to basic data with proper null safety
  const displayData = enhancedData || {
    staffInfo: {
      id: staffDetails?._id || "",
      name: staffDetails?.name || "Unknown Staff",
      email: staffDetails?.email || "",
      assignedRoleName: staffDetails?.assignedRoleName || "Staff",
      dateJoined: staffDetails?.createdAt || new Date(),
    },
    personalMetrics: {
      totalQuizzesCompleted: 0,
      overallAverageScore: staffDetails?.averageScore || 0,
      averageCompletionTime: 0,
      fastestQuizTime: null,
      totalQuestionsAnswered: 0,
    },
    categoryBreakdown: {
      foodKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
      beverageKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
      wineKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
      proceduresKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
    },
    recentQuizzes: [],
    restaurantComparison: { averageScore: 0, averageCompletionTime: 0 },
  };

  // Additional detailed debugging
  console.log("Enhanced Data Full Structure:", enhancedData);
  console.log("Display Data:", displayData);
  console.log("Display Data staffInfo:", displayData?.staffInfo);

  // Additional null safety check to ensure displayData has the required structure
  if (!displayData || !displayData.staffInfo) {
    console.log("ISSUE: displayData or staffInfo is missing!", {
      displayData: !!displayData,
      staffInfo: !!displayData?.staffInfo,
      enhancedData: !!enhancedData,
      staffDetails: !!staffDetails,
    });

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                  <div className="p-3 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-slate-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-700 mb-4">
                    Loading Staff Data...
                  </h1>
                  <p className="text-slate-600">
                    Please wait while we load the staff information.
                  </p>
                </div>
              </div>
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
            <div className="space-y-8">
              {/* Header Section - Enhanced */}
              <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 shadow-sm">
                <div className="flex items-center space-x-6">
                  <div className="p-4 bg-emerald-600 rounded-xl shadow-lg">
                    <UserIcon className="h-10 w-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-900 mb-3">
                      {displayData?.staffInfo?.name || "Unknown Staff"}
                    </h1>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-slate-600">
                        <span className="font-medium">Email:</span>
                        <span>
                          {displayData?.staffInfo?.email || "No email"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <span className="font-medium">Professional Role:</span>
                        <span>
                          {displayData?.staffInfo?.assignedRoleName || "Staff"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <span className="font-medium">Date Joined:</span>
                        <span>
                          {displayData?.staffInfo?.dateJoined
                            ? formatDate(
                                displayData.staffInfo.dateJoined.toString()
                              )
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">
                      {(
                        displayData?.personalMetrics?.overallAverageScore || 0
                      ).toFixed(1)}
                      %
                    </div>
                    <div className="text-sm text-slate-600 font-medium">
                      Overall Average Score
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Performance Cards */}
              {displayData?.personalMetrics &&
                displayData?.restaurantComparison && (
                  <PersonalPerformanceCards
                    metrics={displayData.personalMetrics}
                    comparison={displayData.restaurantComparison}
                  />
                )}

              {/* Category Breakdown Chart */}
              {displayData?.categoryBreakdown && (
                <CategoryBreakdownChart
                  categoryData={displayData.categoryBreakdown}
                />
              )}

              {/* Recent Quiz History */}
              {displayData?.recentQuizzes && (
                <RecentQuizHistory
                  recentQuizzes={displayData.recentQuizzes}
                  onViewDetails={handleOpenAttemptModal}
                />
              )}

              {/* Original Quiz Results Section (kept for compatibility) */}
              {staffDetails && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Detailed Quiz Results
                    </h2>
                  </div>
                  <div className="p-6">
                    {staffDetails.aggregatedQuizPerformance.length > 0 ? (
                      <div className="space-y-4">
                        {staffDetails.aggregatedQuizPerformance.map(
                          (quizAgg) => (
                            <div
                              key={quizAgg.quizId}
                              className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <h3 className="font-medium text-slate-900">
                                    {quizAgg.quizTitle}
                                  </h3>
                                  <p className="text-sm text-slate-600">
                                    Score:{" "}
                                    {quizAgg.averageScorePercent?.toFixed(1) ??
                                      "N/A"}
                                    %
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {quizAgg.lastCompletedAt
                                      ? formatDate(quizAgg.lastCompletedAt)
                                      : "N/A"}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                      (quizAgg.averageScorePercent ?? 0) >= 70
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {quizAgg.averageScorePercent !== null
                                      ? (quizAgg.averageScorePercent >= 70
                                          ? "Passed"
                                          : "Failed") +
                                        ` (${quizAgg.averageScorePercent.toFixed(
                                          1
                                        )}%)`
                                      : "N/A"}
                                  </span>
                                  {quizAgg.attempts.length > 0 && (
                                    <Button
                                      variant="secondary"
                                      onClick={() =>
                                        handleOpenAttemptModal(
                                          quizAgg.attempts[
                                            quizAgg.attempts.length - 1
                                          ]._id
                                        )
                                      }
                                      className="text-xs px-3 py-1"
                                    >
                                      View Details
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <UserIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          No detailed quiz results yet
                        </h3>
                        <p className="text-slate-500">
                          Detailed quiz results will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal (unchanged) */}
            {isModalOpen && modalDataForIncorrectAnswers && (
              <ViewIncorrectAnswersModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                attemptDetails={modalDataForIncorrectAnswers}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffDetails;
