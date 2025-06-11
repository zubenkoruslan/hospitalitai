import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/user";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import PlatformOverviewCards from "../components/admin/PlatformOverviewCards";
import GrowthTrendsChart from "../components/admin/GrowthTrendsChart";
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ArrowPathIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";

// Interface for platform metrics data
interface PlatformMetrics {
  totalUsers: number;
  totalRestaurants: number;
  activeRestaurants: number;
  totalStaffUsers: number;
  quizzesTaken: number;
  recentQuizzesTaken: number;
  averageScore: number;
  monthlyRecurringRevenue: number;
  retentionRate: number;
  growthRate: number;
  timeframe: string;
}

interface GrowthMetrics {
  userGrowthTrend: Array<{
    date: string;
    restaurants: number;
    staff: number;
    total: number;
    newRestaurants: number;
    newStaff: number;
    newTotal: number;
    growthRate?: number;
  }>;
  cohortRetention: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  }>;
  summary?: {
    totalGrowthRate: number;
    averageMonthlyGrowth: number;
  };
}

interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  quizCompletionRate: number;
  featureAdoptionRates: {
    sopDocuments: number;
    menuUploads: number;
    questionBanks: number;
    customQuizzes: number;
  };
  knowledgeCategoryPerformance: {
    [key: string]: {
      totalQuestions: number;
      averageScore: number;
      participationRate: number;
      activeParticipants: number;
      trend: number;
    };
  };
  engagement: {
    dau_mau_ratio: number;
    wau_mau_ratio: number;
    totalQuizAttempts: number;
    completedQuizzes: number;
  };
}

const AdminAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics data
  const [platformMetrics, setPlatformMetrics] =
    useState<PlatformMetrics | null>(null);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(
    null
  );
  const [engagementMetrics, setEngagementMetrics] =
    useState<EngagementMetrics | null>(null);

  // UI state
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [activeTab, setActiveTab] = useState<
    "overview" | "growth" | "engagement" | "cohort"
  >("overview");
  const [generatingReport, setGeneratingReport] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== UserRole.Admin) {
      setError("Admin access required");
      setLoading(false);
      return;
    }
  }, [user]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Import api service for consistent authentication handling
        const { default: api } = await import("../services/api");

        // Fetch platform overview
        const platformResponse = await api.get(
          "/admin/analytics/platform-overview"
        );
        setPlatformMetrics(platformResponse.data.data);

        // Fetch growth metrics
        const growthResponse = await api.get(
          `/admin/analytics/growth-metrics?timeframe=${selectedTimeframe}`
        );
        setGrowthMetrics(growthResponse.data.data);

        // Fetch engagement statistics
        const engagementResponse = await api.get(
          "/admin/analytics/engagement-stats"
        );
        setEngagementMetrics(engagementResponse.data.data);
      } catch (err: any) {
        console.error("Error fetching analytics:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load analytics data"
        );
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === UserRole.Admin) {
      fetchAnalytics();
    }
  }, [user, selectedTimeframe, selectedDateRange]);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);

      // Import api service for consistent authentication handling
      const { default: api } = await import("../services/api");

      const response = await api.post(
        "/admin/analytics/generate-report",
        {
          reportType: "comprehensive",
          timeframe: selectedTimeframe,
          format: "pdf",
        },
        {
          responseType: "blob", // Important for PDF downloads
        }
      );

      // Download the PDF (placeholder implementation)
      console.log("Report generation requested:", response.data);

      // TODO: Implement actual PDF download once backend is ready
      alert("Report generation feature will be implemented in Phase 3");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to generate report"
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
                <div className="text-center">
                  <LoadingSpinner message="Loading admin analytics..." />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Admin Analytics Dashboard
                  </h1>
                  <p className="text-purple-100">
                    Platform insights and metrics for investors and stakeholders
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    className="bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generatingReport ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <DocumentArrowDownIcon className="h-5 w-5" />
                    )}
                    Generate Report
                  </button>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <ChartBarIcon className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">
                    Timeframe:
                  </label>
                  <select
                    value={selectedTimeframe}
                    onChange={(e) =>
                      setSelectedTimeframe(e.target.value as any)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="quarter">Last Quarter</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Custom Range:
                  </label>
                  <input
                    type="date"
                    value={selectedDateRange.startDate}
                    onChange={(e) =>
                      setSelectedDateRange((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={selectedDateRange.endDate}
                    onChange={(e) =>
                      setSelectedDateRange((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Platform Overview Cards */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Platform Overview
              </h2>
              <PlatformOverviewCards
                metrics={platformMetrics}
                loading={false}
              />
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6 pt-6">
                  {[
                    { id: "overview", name: "Overview", icon: ChartBarIcon },
                    {
                      id: "growth",
                      name: "Growth Trends",
                      icon: PresentationChartLineIcon,
                    },
                    {
                      id: "engagement",
                      name: "Engagement",
                      icon: UserGroupIcon,
                    },
                    {
                      id: "cohort",
                      name: "Cohort Analysis",
                      icon: ChartPieIcon,
                    },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`${
                          activeTab === tab.id
                            ? "border-purple-500 text-purple-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                      >
                        <Icon className="h-5 w-5" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Platform Overview
                    </h3>
                    <p className="text-gray-600">
                      Key metrics for platform performance and user activity are
                      already displayed above.
                    </p>
                  </div>
                )}

                {activeTab === "growth" && (
                  <div className="space-y-6">
                    <GrowthTrendsChart
                      data={growthMetrics?.userGrowthTrend || []}
                      loading={loading}
                    />
                  </div>
                )}

                {activeTab === "engagement" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Engagement Analytics
                    </h3>
                    {engagementMetrics && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <UserGroupIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-900">
                                Active Users
                              </h4>
                              <p className="text-sm text-blue-600">
                                User engagement metrics
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-blue-700">
                                Daily Active Users:
                              </span>
                              <span className="font-semibold text-blue-900">
                                {engagementMetrics.dailyActiveUsers}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-blue-700">
                                Weekly Active Users:
                              </span>
                              <span className="font-semibold text-blue-900">
                                {engagementMetrics.weeklyActiveUsers}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-blue-700">
                                Monthly Active Users:
                              </span>
                              <span className="font-semibold text-blue-900">
                                {engagementMetrics.monthlyActiveUsers}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-blue-200">
                              <span className="text-sm text-blue-700">
                                DAU/MAU Ratio:
                              </span>
                              <span className="font-semibold text-blue-900">
                                {engagementMetrics.engagement.dau_mau_ratio}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <ChartBarIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-green-900">
                                Quiz Activity
                              </h4>
                              <p className="text-sm text-green-600">
                                Learning engagement
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-green-700">
                                Completion Rate:
                              </span>
                              <span className="font-semibold text-green-900">
                                {engagementMetrics.quizCompletionRate}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-green-700">
                                Session Duration:
                              </span>
                              <span className="font-semibold text-green-900">
                                {Math.round(
                                  engagementMetrics.averageSessionDuration / 60
                                )}
                                m
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-green-700">
                                Total Attempts:
                              </span>
                              <span className="font-semibold text-green-900">
                                {engagementMetrics.engagement.totalQuizAttempts}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-green-700">
                                Completed:
                              </span>
                              <span className="font-semibold text-green-900">
                                {engagementMetrics.engagement.completedQuizzes}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <ChartPieIcon className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-purple-900">
                                Feature Adoption
                              </h4>
                              <p className="text-sm text-purple-600">
                                Platform usage
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-purple-700">
                                SOP Documents:
                              </span>
                              <span className="font-semibold text-purple-900">
                                {
                                  engagementMetrics.featureAdoptionRates
                                    .sopDocuments
                                }
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-purple-700">
                                Custom Quizzes:
                              </span>
                              <span className="font-semibold text-purple-900">
                                {
                                  engagementMetrics.featureAdoptionRates
                                    .customQuizzes
                                }
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-purple-700">
                                Question Banks:
                              </span>
                              <span className="font-semibold text-purple-900">
                                {
                                  engagementMetrics.featureAdoptionRates
                                    .questionBanks
                                }
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-purple-700">
                                Menu Uploads:
                              </span>
                              <span className="font-semibold text-purple-900">
                                {
                                  engagementMetrics.featureAdoptionRates
                                    .menuUploads
                                }
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "cohort" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Cohort Analysis
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                      <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Cohort Analysis Dashboard
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Advanced user retention and behavior analysis coming
                        soon.
                      </p>
                      <div className="text-sm text-gray-500">
                        This will include user retention heatmaps, monthly
                        cohort performance, and restaurant retention analytics.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalyticsDashboard;
