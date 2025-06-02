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
} from "@heroicons/react/24/outline";

// Types for analytics data
interface RestaurantAnalytics {
  totalStaff: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  categoryPerformance: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      averageAccuracy: number;
      staffParticipation: number;
      improvementTrend: number;
    };
  };
  topPerformers: Array<{
    userId: string;
    userName: string;
    overallAccuracy: number;
    strongestCategory: KnowledgeCategory;
  }>;
  staffNeedingSupport: Array<{
    userId: string;
    userName: string;
    overallAccuracy: number;
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
  },
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  [KnowledgeCategory.WINE_KNOWLEDGE]: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    color: "bg-purple-500",
    lightColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    textColor: "text-orange-700",
  },
};

const KnowledgeAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<RestaurantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "7d" | "30d" | "90d"
  >("30d");

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/analytics/restaurant", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
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
      fetchAnalytics();
    }
  }, [user, selectedTimeframe]);

  // Transform data for chart component
  const chartData: CategoryPerformanceData[] = analytics
    ? Object.entries(analytics.categoryPerformance).map(
        ([category, performance]) => ({
          category: category as KnowledgeCategory,
          averageAccuracy: performance.averageAccuracy,
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
                  <LoadingSpinner message="Loading knowledge analytics..." />
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
                  <p className="text-gray-500">No analytics data available</p>
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
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Knowledge Analytics Dashboard
                  </h1>
                  <p className="text-blue-100">
                    Track staff performance across knowledge categories
                  </p>
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
                    <ChartBarIcon className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      Overall Accuracy
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(analytics.overallAccuracy)}%
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

            {/* Performance Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Knowledge Category Performance
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

            {/* Staff Insights */}
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

                        return (
                          <div
                            key={performer.userId}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
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
                                {Math.round(performer.overallAccuracy)}%
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
                      {analytics.staffNeedingSupport.map((staff) => {
                        const categoryConfig =
                          CATEGORY_CONFIG[staff.weakestCategory];
                        const IconComponent = categoryConfig.icon;

                        return (
                          <div
                            key={staff.userId}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
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
                                {Math.round(staff.overallAccuracy)}%
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      All staff performing well!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Question Distribution */}
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
                          className={`${config.lightColor} rounded-lg p-4 border border-gray-200`}
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
                          </div>
                        </div>
                      );
                    }
                  )}
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
