import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { KnowledgeCategory } from "../types/questionBankTypes";
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Types for advanced analytics
interface TimeRangeAnalytics {
  startDate: string;
  endDate: string;
  totalQuestions: number;
  averageAccuracy: number;
  staffParticipation: number;
  categoryBreakdown: {
    [key in KnowledgeCategory]: {
      totalQuestions: number;
      averageAccuracy: number;
      improvement: number;
    };
  };
}

interface ComparativeAnalytics {
  timeframe: string;
  currentPeriod: TimeRangeAnalytics;
  previousPeriod: TimeRangeAnalytics;
  improvement: {
    overall: number;
    byCategory: {
      [key in KnowledgeCategory]: number;
    };
  };
  benchmarks: {
    topPerformerThreshold: number;
    improvementGoals: {
      [key in KnowledgeCategory]: number;
    };
  };
}

interface PredictiveInsights {
  staffAtRisk: Array<{
    userId: string;
    userName: string;
    riskLevel: "low" | "medium" | "high";
    categories: KnowledgeCategory[];
    recommendedActions: string[];
  }>;
  categoryForecasts: {
    [key in KnowledgeCategory]: {
      predicted30DayAccuracy: number;
      confidence: number;
      trendDirection: "improving" | "declining" | "stable";
    };
  };
  trainingPriorities: Array<{
    category: KnowledgeCategory;
    priority: "high" | "medium" | "low";
    estimatedImpact: number;
  }>;
}

const AdvancedAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics data
  const [comparative, setComparative] = useState<ComparativeAnalytics | null>(
    null
  );
  const [predictive, setPredictive] = useState<PredictiveInsights | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeAnalytics | null>(null);

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
    "comparative" | "predictive" | "timerange"
  >("comparative");
  const [generatingReport, setGeneratingReport] = useState(false);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Import api service for consistent authentication handling
        const { default: api } = await import("../services/api");

        // Fetch comparative analytics
        const comparativeResponse = await api.get(
          `/analytics/comparative?timeframe=${selectedTimeframe}`
        );
        setComparative(comparativeResponse.data.data);

        // Fetch predictive insights
        const predictiveResponse = await api.get(
          "/analytics/predictive-insights"
        );
        setPredictive(predictiveResponse.data.data);

        // Fetch time range analytics
        const timeRangeResponse = await api.get(
          `/analytics/time-range?startDate=${selectedDateRange.startDate}&endDate=${selectedDateRange.endDate}`
        );
        setTimeRange(timeRangeResponse.data.data);
      } catch (err: any) {
        setError(
          err.response?.data?.message || err.message || "An error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAnalytics();
    }
  }, [user, selectedTimeframe, selectedDateRange]);

  const handleGenerateReport = async (
    reportType: string,
    category?: KnowledgeCategory
  ) => {
    try {
      setGeneratingReport(true);

      // Import api service for consistent authentication handling
      const { default: api } = await import("../services/api");

      const response = await api.post(
        "/analytics/generate-report",
        {
          reportType,
          category,
          timeframe: selectedTimeframe,
          format: "pdf",
        },
        {
          responseType: "blob", // Important for PDF downloads
        }
      );

      // Download the PDF
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-analytics-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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

  const formatCategoryName = (category: KnowledgeCategory): string => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
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
                  <LoadingSpinner message="Loading advanced analytics..." />
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
                    Advanced Analytics Dashboard
                  </h1>
                  <p className="text-purple-100">
                    Deep insights, predictive analytics, and comprehensive
                    reporting
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleGenerateReport("comprehensive")}
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

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab("comparative")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "comparative"
                        ? "border-blue-500 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowTrendingUpIcon className="h-5 w-5" />
                      Comparative Analysis
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("predictive")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "predictive"
                        ? "border-blue-500 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LightBulbIcon className="h-5 w-5" />
                      Predictive Insights
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("timerange")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "timerange"
                        ? "border-blue-500 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-5 w-5" />
                      Time Range Analysis
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Comparative Analysis Tab */}
                {activeTab === "comparative" && comparative && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">
                          Current Period
                        </h3>
                        <div className="space-y-2">
                          <p>
                            <span className="font-medium">Accuracy:</span>{" "}
                            {Math.round(
                              comparative.currentPeriod.averageAccuracy
                            )}
                            %
                          </p>
                          <p>
                            <span className="font-medium">Questions:</span>{" "}
                            {comparative.currentPeriod.totalQuestions}
                          </p>
                          <p>
                            <span className="font-medium">Staff:</span>{" "}
                            {comparative.currentPeriod.staffParticipation}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Previous Period
                        </h3>
                        <div className="space-y-2">
                          <p>
                            <span className="font-medium">Accuracy:</span>{" "}
                            {Math.round(
                              comparative.previousPeriod.averageAccuracy
                            )}
                            %
                          </p>
                          <p>
                            <span className="font-medium">Questions:</span>{" "}
                            {comparative.previousPeriod.totalQuestions}
                          </p>
                          <p>
                            <span className="font-medium">Staff:</span>{" "}
                            {comparative.previousPeriod.staffParticipation}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`rounded-lg p-6 border ${
                          comparative.improvement.overall >= 0
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <h3
                          className={`text-lg font-semibold mb-4 ${
                            comparative.improvement.overall >= 0
                              ? "text-green-900"
                              : "text-red-900"
                          }`}
                        >
                          Overall Improvement
                        </h3>
                        <div className="flex items-center gap-2">
                          {comparative.improvement.overall >= 0 ? (
                            <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
                          )}
                          <span
                            className={`text-2xl font-bold ${
                              comparative.improvement.overall >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {comparative.improvement.overall >= 0 ? "+" : ""}
                            {Math.round(comparative.improvement.overall)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Category-wise Improvement
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Previous
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Change
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(
                              comparative.improvement.byCategory
                            ).map(([category, improvement]) => {
                              const currentAcc =
                                comparative.currentPeriod.categoryBreakdown[
                                  category as KnowledgeCategory
                                ].averageAccuracy;
                              const previousAcc =
                                comparative.previousPeriod.categoryBreakdown[
                                  category as KnowledgeCategory
                                ].averageAccuracy;
                              return (
                                <tr key={category}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatCategoryName(
                                      category as KnowledgeCategory
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {Math.round(currentAcc)}%
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {Math.round(previousAcc)}%
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        improvement >= 0
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {improvement >= 0 ? "+" : ""}
                                      {Math.round(improvement)}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Predictive Insights Tab */}
                {activeTab === "predictive" && predictive && (
                  <div className="space-y-6">
                    {/* Staff at Risk */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                        <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                          <ExclamationTriangleIcon className="h-5 w-5" />
                          Staff at Risk ({predictive.staffAtRisk.length})
                        </h3>
                      </div>
                      <div className="p-6">
                        {predictive.staffAtRisk.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {predictive.staffAtRisk.map((staff) => (
                              <div
                                key={staff.userId}
                                className={`p-4 rounded-lg border ${getRiskLevelColor(
                                  staff.riskLevel
                                )}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">
                                    {staff.userName}
                                  </h4>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(
                                      staff.riskLevel
                                    )}`}
                                  >
                                    {staff.riskLevel.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-sm mb-2">
                                  <strong>Weak Areas:</strong>{" "}
                                  {staff.categories
                                    .map((cat) => formatCategoryName(cat))
                                    .join(", ")}
                                </p>
                                <div className="text-sm">
                                  <strong>Recommended Actions:</strong>
                                  <ul className="list-disc list-inside mt-1 space-y-1">
                                    {staff.recommendedActions.map(
                                      (action, index) => (
                                        <li key={index}>{action}</li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-8">
                            No staff at risk identified
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Training Priorities */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900">
                          Training Priorities
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Priority
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estimated Impact
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {predictive.trainingPriorities.map((priority) => (
                              <tr key={priority.category}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCategoryName(priority.category)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                      priority.priority
                                    )}`}
                                  >
                                    {priority.priority.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {priority.estimatedImpact}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    onClick={() =>
                                      handleGenerateReport(
                                        "category",
                                        priority.category
                                      )
                                    }
                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                  >
                                    Generate Report
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time Range Analysis Tab */}
                {activeTab === "timerange" && timeRange && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <h3 className="text-sm font-medium text-blue-700 mb-2">
                          Total Questions
                        </h3>
                        <p className="text-2xl font-bold text-blue-900">
                          {timeRange.totalQuestions}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                        <h3 className="text-sm font-medium text-green-700 mb-2">
                          Average Accuracy
                        </h3>
                        <p className="text-2xl font-bold text-green-900">
                          {Math.round(timeRange.averageAccuracy)}%
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                        <h3 className="text-sm font-medium text-purple-700 mb-2">
                          Staff Participation
                        </h3>
                        <p className="text-2xl font-bold text-purple-900">
                          {timeRange.staffParticipation}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                        <h3 className="text-sm font-medium text-orange-700 mb-2">
                          Date Range
                        </h3>
                        <p className="text-sm font-bold text-orange-900">
                          {new Date(timeRange.startDate).toLocaleDateString()} -{" "}
                          {new Date(timeRange.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Category Breakdown
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Questions
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Accuracy
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Improvement
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(timeRange.categoryBreakdown).map(
                              ([category, data]) => (
                                <tr key={category}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatCategoryName(
                                      category as KnowledgeCategory
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {data.totalQuestions}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {Math.round(data.averageAccuracy)}%
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        data.improvement >= 0
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {data.improvement >= 0 ? "+" : ""}
                                      {Math.round(data.improvement)}%
                                    </span>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
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

export default AdvancedAnalyticsDashboard;
