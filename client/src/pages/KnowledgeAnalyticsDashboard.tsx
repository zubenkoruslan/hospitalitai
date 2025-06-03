import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import KnowledgeCategoryPerformanceChart, {
  CategoryPerformanceData,
} from "../components/analytics/KnowledgeCategoryPerformanceChart";
import { KnowledgeCategory } from "../types/questionBankTypes";
import {
  ChartBarIcon,
  UsersIcon,
  AcademicCapIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CakeIcon,
  BoltIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  FireIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

// Enhanced types for Phase 5 analytics data
interface ParticipationMetrics {
  totalStaff: number;
  activeStaff: number;
  participationRate: number;
}

interface CompletionTimeStats {
  averageCompletionTime: number;
  fastestCompletionTime: number;
  slowestCompletionTime: number;
  totalQuizzesCompleted: number;
}

interface CategoryCompletionTimes {
  foodKnowledge: number;
  beverageKnowledge: number;
  wineKnowledge: number;
  proceduresKnowledge: number;
}

interface EnhancedRestaurantAnalytics {
  totalStaff: number;
  totalQuestionsAnswered: number;
  overallAverageScore: number;
  participationMetrics: ParticipationMetrics;
  categoryPerformance: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      averageScore: number;
      staffParticipation: number;
      improvementTrend: number;
    };
  };
  categoryCompletionTimes: CategoryCompletionTimes;
  completionTimeStats: CompletionTimeStats;

  topPerformers: Array<{
    userId: string | { _id: string; toString(): string };
    userName: string;
    overallAverageScore: number;
    strongestCategory: KnowledgeCategory;
  }>;
  staffNeedingSupport: Array<{
    userId: string | { _id: string; toString(): string };
    userName: string;
    overallAverageScore: number;
    weakestCategory: KnowledgeCategory;
  }>;
  questionDistribution: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      aiGenerated: number;
      manuallyCreated: number;
    };
  };
  lastUpdated: string;
}

// Category configuration
const CATEGORY_CONFIG = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: {
    icon: CakeIcon,
    label: "Food Knowledge",
    color: "bg-green-500",
    lightColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    timeKey: "foodKnowledge" as keyof CategoryCompletionTimes,
  },
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    timeKey: "beverageKnowledge" as keyof CategoryCompletionTimes,
  },
  [KnowledgeCategory.WINE_KNOWLEDGE]: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    color: "bg-purple-500",
    lightColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
    timeKey: "wineKnowledge" as keyof CategoryCompletionTimes,
  },
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
    timeKey: "proceduresKnowledge" as keyof CategoryCompletionTimes,
  },
};

// Helper function to format completion time
const formatCompletionTime = (seconds: number): string => {
  if (seconds === 0) return "N/A";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const KnowledgeAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] =
    useState<EnhancedRestaurantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "7d" | "30d" | "90d"
  >("30d");

  // Custom hook for enhanced analytics data
  useEffect(() => {
    const fetchEnhancedAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the new enhanced endpoint
        const response = await fetch("/api/analytics/restaurant/enhanced", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch enhanced analytics data");
        }

        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEnhancedAnalytics();
    }
  }, [user, selectedTimeframe]);

  // Transform data for chart component
  const chartData: CategoryPerformanceData[] = analytics
    ? Object.entries(analytics.categoryPerformance).map(
        ([category, performance]) => ({
          category: category as KnowledgeCategory,
          averageAccuracy: performance.averageScore,
          staffParticipation: performance.staffParticipation,
          totalQuestions: performance.totalQuestions,
          improvementTrend: performance.improvementTrend,
        })
      )
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
                <div className="text-center">
                  <LoadingSpinner message="Loading enhanced knowledge analytics..." />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <ErrorMessage message={error} />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
                <div className="text-center">
                  <p className="text-gray-500">
                    No enhanced analytics data available
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
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Enhanced Knowledge Analytics
                  </h1>
                  <p className="text-blue-100 mb-4">
                    Comprehensive performance insights with participation and
                    completion time analytics
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="h-4 w-4" />
                      <span>
                        {analytics.participationMetrics.activeStaff} of{" "}
                        {analytics.participationMetrics.totalStaff} staff active
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      <span>
                        Avg completion:{" "}
                        {formatCompletionTime(
                          analytics.completionTimeStats.averageCompletionTime
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedTimeframe}
                    onChange={(e) =>
                      setSelectedTimeframe(
                        e.target.value as "7d" | "30d" | "90d"
                      )
                    }
                    className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <PresentationChartLineIcon className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <UsersIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Staff
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.totalStaff}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <AcademicCapIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Questions Answered
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.totalQuestionsAnswered}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <TrophyIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Overall Average Score
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(analytics.overallAverageScore || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <ChartPieIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Participation Rate
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(
                        analytics.participationMetrics.participationRate
                      )}
                      %
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Need Support
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.staffNeedingSupport.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Insights - Moved up from bottom */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                    <TrophyIcon className="h-5 w-5" />
                    Top Performers
                  </h3>
                </div>
                <div className="p-6">
                  {analytics.topPerformers.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.topPerformers.map((performer, index) => {
                        const categoryConfig =
                          CATEGORY_CONFIG[performer.strongestCategory];
                        const IconComponent = categoryConfig.icon;

                        const userIdString =
                          typeof performer.userId === "object"
                            ? (performer.userId as any)._id ||
                              (performer.userId as any).toString()
                            : performer.userId;

                        return (
                          <div
                            key={userIdString}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                              console.log(
                                "Navigating to staff ID:",
                                userIdString,
                                "Type:",
                                typeof userIdString
                              );
                              window.open(`/staff/${userIdString}`, "_blank");
                            }}
                          >
                            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full text-green-600 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {performer.userName}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <IconComponent className="h-4 w-4" />
                                <span>Strongest: {categoryConfig.label}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {(performer.overallAverageScore || 0).toFixed(
                                  1
                                )}
                                %
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No performance data available
                    </p>
                  )}
                </div>
              </div>

              {/* Staff Needing Support */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-200">
                  <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    Staff Needing Support
                  </h3>
                </div>
                <div className="p-6">
                  {analytics.staffNeedingSupport.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.staffNeedingSupport.map((staff, index) => {
                        const categoryConfig =
                          CATEGORY_CONFIG[staff.weakestCategory];
                        const IconComponent = categoryConfig.icon;

                        const userIdString =
                          typeof staff.userId === "object"
                            ? (staff.userId as any)._id ||
                              (staff.userId as any).toString()
                            : staff.userId;

                        return (
                          <div
                            key={userIdString}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                              console.log(
                                "Navigating to staff ID:",
                                userIdString,
                                "Type:",
                                typeof userIdString
                              );
                              window.open(`/staff/${userIdString}`, "_blank");
                            }}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {staff.userName}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <IconComponent className="h-4 w-4" />
                                <span>Needs help: {categoryConfig.label}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">
                                {(staff.overallAverageScore || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
                      <TrophyIcon className="h-8 w-8 text-green-500" />
                      <span>All staff performing well!</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Performance Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Knowledge Category Performance Comparison
                </h2>
              </div>
              <div className="p-6">
                <KnowledgeCategoryPerformanceChart
                  data={chartData}
                  showParticipation={true}
                  showTrends={true}
                  height={500}
                />
              </div>
            </div>

            {/* Enhanced Question Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question Distribution by Category
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(analytics.questionDistribution).map(
                    ([category, distribution]) => {
                      const config =
                        CATEGORY_CONFIG[category as KnowledgeCategory];
                      const IconComponent = config.icon;

                      return (
                        <div
                          key={category}
                          className={`${config.lightColor} rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 ${config.color} rounded-lg`}>
                              <IconComponent className="h-5 w-5 text-white" />
                            </div>
                            <h4 className={`font-medium ${config.textColor}`}>
                              {config.label}
                            </h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total:</span>
                              <span className="font-medium">
                                {distribution.totalQuestions}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                AI Generated:
                              </span>
                              <span className="font-medium">
                                {distribution.aiGenerated}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Manual:</span>
                              <span className="font-medium">
                                {distribution.manuallyCreated}
                              </span>
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-500 text-center">
                                {Math.round(
                                  (distribution.aiGenerated /
                                    distribution.totalQuestions) *
                                    100
                                )}
                                % AI Generated
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Completion Time Analytics - Moved to bottom */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overall Completion Time Stats */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-white">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    Completion Time Analytics
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-indigo-600 mb-1">
                        Average Time
                      </p>
                      <p className="text-xl font-bold text-indigo-900">
                        {formatCompletionTime(
                          analytics.completionTimeStats.averageCompletionTime
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 mb-1">
                        Fastest Time
                      </p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCompletionTime(
                          analytics.completionTimeStats.fastestCompletionTime
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600 mb-1">
                        Slowest Time
                      </p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCompletionTime(
                          analytics.completionTimeStats.slowestCompletionTime
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 mb-1">
                        Total Quizzes
                      </p>
                      <p className="text-xl font-bold text-blue-900">
                        {analytics.completionTimeStats.totalQuizzesCompleted}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Completion Times */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 text-white">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FireIcon className="h-5 w-5" />
                    Average Completion Time by Category
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(analytics.categoryCompletionTimes).map(
                      ([categoryKey, time]) => {
                        // Find the matching category configuration
                        const categoryConfig = Object.values(
                          CATEGORY_CONFIG
                        ).find((config) => config.timeKey === categoryKey);

                        if (!categoryConfig) return null;

                        const IconComponent = categoryConfig.icon;

                        return (
                          <div
                            key={categoryKey}
                            className={`${categoryConfig.lightColor} ${categoryConfig.borderColor} rounded-lg p-4 border-2 hover:shadow-md transition-shadow`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 ${categoryConfig.color} rounded-lg`}
                                >
                                  <IconComponent className="h-5 w-5 text-white" />
                                </div>
                                <h4
                                  className={`font-medium ${categoryConfig.textColor} text-sm`}
                                >
                                  {categoryConfig.label}
                                </h4>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-xl font-bold ${categoryConfig.textColor}`}
                                >
                                  {formatCompletionTime(time)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  avg time
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <ClockIcon className="h-4 w-4" />
                <span>
                  Last updated:{" "}
                  {new Date(analytics.lastUpdated).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KnowledgeAnalyticsDashboard;
