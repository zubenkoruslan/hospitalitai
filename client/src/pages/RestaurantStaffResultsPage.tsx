import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useStaffSummary } from "../hooks/useStaffSummary";
import { useQuizCount } from "../hooks/useQuizCount";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ScoreDistributionChart from "../components/charts/ScoreDistributionChart";
import StaffResultsFilter from "../components/staff/StaffResultsFilter";
import StaffResultsTable from "../components/staff/StaffResultsTable";
import Card from "../components/common/Card";

// Import shared types
import { Filters, StaffMemberWithData } from "../types/staffTypes";
import { KnowledgeCategory } from "../types/questionBankTypes";

import KPICard from "../components/settings/KPICard";
import BarChart from "../components/charts/BarChart";
import { ChartData } from "chart.js";
import {
  ChartBarIcon,
  UsersIcon,
  AcademicCapIcon,
  TrophyIcon,
  ClockIcon,
  BoltIcon,
  CakeIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  FireIcon,
  SparklesIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

// Enhanced interfaces for comprehensive analytics
interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  roleName?: string;
  overallAverageScore: number;
  totalQuestions: number;
  completionTime?: number;
  totalQuizzes?: number;
}

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

interface CategoryChampion {
  userId: string;
  name: string;
  roleName?: string;
  averageScore: number;
  totalQuestions: number;
  averageCompletionTime?: number;
}

interface LeaderboardData {
  timePeriod: string;
  topPerformers: LeaderboardEntry[];
  categoryChampions: {
    foodKnowledge: CategoryChampion | null;
    beverageKnowledge: CategoryChampion | null;
    wineKnowledge: CategoryChampion | null;
    proceduresKnowledge: CategoryChampion | null;
  };
  lastUpdated: string;
}

// Enhanced hook for leaderboard data
const useLeaderboardData = (timePeriod: string = "all") => {
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/analytics/leaderboards?timePeriod=${timePeriod}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard data");
        }

        const result = await response.json();
        setLeaderboardData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [timePeriod]);

  return { leaderboardData, loading, error };
};

// Enhanced hook for comprehensive analytics data
const useEnhancedAnalytics = (selectedTimeframe: string = "30d") => {
  const [analytics, setAnalytics] =
    useState<EnhancedRestaurantAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnhancedAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

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

    fetchEnhancedAnalytics();
  }, [selectedTimeframe]);

  return { analytics, loading, error };
};

// Category configuration for visual consistency
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
  // Legacy keys for leaderboard compatibility
  foodKnowledge: {
    icon: CakeIcon,
    label: "Food Knowledge",
    color: "#10B981",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-600",
  },
  beverageKnowledge: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    color: "#3B82F6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-600",
  },
  wineKnowledge: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    color: "#8B5CF6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    iconColor: "text-purple-600",
  },
  proceduresKnowledge: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    color: "#F59E0B",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    iconColor: "text-orange-600",
  },
};

// Helper function to format completion time
const formatCompletionTime = (seconds?: number): string => {
  if (!seconds) return "N/A";
  if (seconds === 0) return "N/A";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// Helper function to format completion time (for enhanced analytics)
const formatCompletionTimeDetailed = (seconds?: number): string => {
  if (!seconds || seconds === 0) return "N/A";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Helper function to format percentages (moved from StaffManagement.tsx)
const formatPercentage = (value: number | null) =>
  value === null ? "N/A" : `${value.toFixed(1)}%`;

// Helper function to calculate staff completion rate (moved from StaffManagement.tsx)
const calculateStaffCompletionRate = (staff: StaffMemberWithData): number => {
  if (staff.quizProgressSummaries && staff.quizProgressSummaries.length > 0) {
    const completedCount = staff.quizProgressSummaries.filter(
      (qps) => qps.isCompletedOverall
    ).length;
    return (completedCount / staff.quizProgressSummaries.length) * 100;
  }
  return 0;
};

// Top Performers Leaderboard Component
const TopPerformersLeaderboard: React.FC<{
  topPerformers: LeaderboardEntry[];
}> = ({ topPerformers }) => {
  const navigate = useNavigate();

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-50 border-yellow-200 text-yellow-800";
    if (rank === 2) return "bg-gray-50 border-gray-200 text-gray-800";
    if (rank === 3) return "bg-orange-50 border-orange-200 text-orange-800";
    return "bg-slate-50 border-slate-200 text-slate-800";
  };

  const handleStaffClick = (userId: string) => {
    console.log("Navigating to staff ID:", userId, "Type:", typeof userId);
    window.open(`/staff/${userId}`, "_blank");
  };

  return (
    <div className="space-y-3">
      {topPerformers.map((performer) => (
        <div
          key={performer.userId}
          className={`p-4 rounded-lg border ${getRankStyle(
            performer.rank
          )} hover:bg-gray-100 transition-colors cursor-pointer`}
          onClick={() => handleStaffClick(performer.userId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">
                {getRankBadge(performer.rank)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                  {performer.name}
                </p>
                {performer.roleName && (
                  <p className="text-sm text-slate-600">{performer.roleName}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-slate-900">
                {Math.round(performer.overallAverageScore)}%
              </div>
              <div className="text-sm text-slate-600">
                {performer.totalQuestions} questions
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Category Champions Component
const CategoryChampions: React.FC<{
  categoryChampions: LeaderboardData["categoryChampions"];
}> = ({ categoryChampions }) => {
  const navigate = useNavigate();

  const handleStaffClick = (userId: string) => {
    console.log("Navigating to staff ID:", userId, "Type:", typeof userId);
    window.open(`/staff/${userId}`, "_blank");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(categoryChampions).map(([categoryKey, champion]) => {
        const config =
          CATEGORY_CONFIG[categoryKey as keyof typeof CATEGORY_CONFIG];
        const IconComponent = config.icon;

        // Use type-safe property access
        const bgColorClass =
          "bgColor" in config ? config.bgColor : config.lightColor;
        const iconColorClass =
          "iconColor" in config ? config.iconColor : config.textColor;

        return (
          <div
            key={categoryKey}
            className={`${bgColorClass} ${
              config.borderColor
            } rounded-xl p-6 border ${
              champion ? "hover:shadow-md transition-shadow" : ""
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <IconComponent className={`h-6 w-6 ${iconColorClass}`} />
              <h3 className={`font-semibold ${config.textColor}`}>
                {config.label}
              </h3>
            </div>

            {champion ? (
              <div
                className="cursor-pointer"
                onClick={() => handleStaffClick(champion.userId)}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  <p className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                    {champion.name}
                  </p>
                </div>
                {champion.roleName && (
                  <p className="text-sm text-slate-600 mb-2">
                    {champion.roleName}
                  </p>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Average Score:</span>
                    <span className="font-medium">
                      {Math.round(champion.averageScore)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Questions:</span>
                    <span className="font-medium">
                      {champion.totalQuestions}
                    </span>
                  </div>
                  {champion.averageCompletionTime &&
                    champion.averageCompletionTime > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Avg Time:</span>
                        <span className="font-medium">
                          {formatCompletionTime(champion.averageCompletionTime)}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <SparklesIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No champion yet</p>
                <p className="text-slate-400 text-xs">
                  Complete quizzes to compete
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const RestaurantStaffResultsPage: React.FC = () => {
  // Enhanced state for comprehensive analytics
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "7d" | "30d" | "90d"
  >("30d");

  // Use custom hooks for data
  const {
    staffData,
    loading: staffLoading,
    error: staffError,
  } = useStaffSummary();
  const {
    quizCount: _totalQuizzes,
    loading: quizCountLoading,
    error: quizCountError,
  } = useQuizCount();

  // Enhanced analytics hooks
  const {
    leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboardData(selectedTimePeriod);

  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useEnhancedAnalytics(selectedTimeframe);

  // Debug logging for data issues
  React.useEffect(() => {
    console.log("Debug - Analytics data:", analytics);
    console.log("Debug - Staff data sample:", staffData.slice(0, 2));
  }, [analytics, staffData]);

  // Combine loading and error states
  const loading =
    staffLoading || quizCountLoading || leaderboardLoading || analyticsLoading;
  const error =
    staffError || quizCountError || leaderboardError || analyticsError;

  // Keep other state specific to this page
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const { user: _user } = useAuth();
  const navigate = useNavigate();

  // Filtering state
  const [filters, setFilters] = useState<Filters>({
    name: "",
    role: "",
  });

  // State for card-based category filter
  const [selectedPerformanceCategory, setSelectedPerformanceCategory] =
    useState<string | null>(null);

  // Performance metrics state
  const [showDistributionChart, setShowDistributionChart] =
    useState<boolean>(true);

  // KPI State (moved from StaffManagement.tsx)
  const [totalStaff, setTotalStaff] = useState<number | null>(null);
  const [avgQuizScore, setAvgQuizScore] = useState<number | null>(null);

  // Chart Data State (moved from StaffManagement.tsx)
  const [averageScoreChartData, setAverageScoreChartData] =
    useState<ChartData<"bar"> | null>(null);
  const [completionRateChartData, setCompletionRateChartData] =
    useState<ChartData<"bar"> | null>(null);

  const toggleExpand = useCallback((staffId: string) => {
    setExpandedStaffId((prev) => (prev === staffId ? null : staffId));
  }, []);

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({ name: "", role: "" });
    setSelectedPerformanceCategory(null); // Also reset category filter
  }, []);

  // Apply filters and sorting to staff data
  const filteredAndSortedStaff = useMemo(() => {
    let result = [...staffData];

    // Apply filters
    if (filters.name) {
      result = result.filter(
        (staff) =>
          staff.name.toLowerCase().includes(filters.name.toLowerCase()) ||
          staff.email.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.role) {
      result = result.filter((staff) => {
        const roleName = staff.assignedRoleName || staff.professionalRole;
        return roleName?.toLowerCase().includes(filters.role.toLowerCase());
      });
    }

    // Apply selected category filter
    if (selectedPerformanceCategory) {
      result = result.filter((staff) => {
        const avgScore = staff.averageScore;

        if (selectedPerformanceCategory === "noResults") {
          return avgScore === null;
        }
        if (avgScore === null) return false;

        // Use the same thresholds as the chart
        // TODO: Adjust threshold if averageScore scale differs
        switch (selectedPerformanceCategory) {
          case "excellent":
            return avgScore >= 90;
          case "good":
            return avgScore >= 75 && avgScore < 90;
          case "average":
            return avgScore >= 60 && avgScore < 75;
          case "needsWork":
            return avgScore < 60;
          default:
            return false;
        }
      });
    }

    // Default sort (e.g., by name) if needed, or keep API order
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [staffData, filters, selectedPerformanceCategory]);

  // Function to calculate and set KPIs (adapted from StaffManagement.tsx)
  const calculateAndSetKPIs = useCallback(
    (currentStaffList: StaffMemberWithData[]) => {
      setTotalStaff(currentStaffList.length);

      let totalScoreSum = 0;
      let staffWithScoresCount = 0;
      currentStaffList.forEach((staff) => {
        if (staff.averageScore !== null && staff.averageScore !== undefined) {
          totalScoreSum += staff.averageScore;
          staffWithScoresCount++;
        }
      });
      setAvgQuizScore(
        staffWithScoresCount > 0 ? totalScoreSum / staffWithScoresCount : 0
      );
    },
    []
  );

  // Effect to prepare KPI and chart data when staffData changes
  useEffect(() => {
    if (staffData && staffData.length > 0) {
      calculateAndSetKPIs(staffData);

      // Prepare chart data for BarCharts (based on all staff, not filteredAndSortedStaff)
      // This uses staffData directly to show overall visualizations before filtering for the table.
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

      const completionRates = staffData.map((staff) =>
        calculateStaffCompletionRate(staff)
      );
      setCompletionRateChartData({
        labels,
        datasets: [
          {
            label: "Completion Rate (%)",
            data: completionRates,
            backgroundColor: "rgba(153, 102, 255, 0.6)",
            borderColor: "rgba(153, 102, 255, 1)",
            borderWidth: 1,
          },
        ],
      });
    } else {
      calculateAndSetKPIs([]); // Reset KPIs if no staff data
      setAverageScoreChartData(null);
      setCompletionRateChartData(null);
    }
  }, [staffData, calculateAndSetKPIs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Enhanced Header with Analytics Overview */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      Comprehensive Staff Analytics
                    </h1>
                    <p className="text-blue-100 mb-4">
                      Track staff performance, leaderboards, knowledge
                      analytics, and training progress
                    </p>
                    <div className="flex items-center gap-6 text-sm">
                      {analytics && (
                        <>
                          <div className="flex items-center gap-2">
                            <UserGroupIcon className="h-4 w-4" />
                            <span>
                              {analytics.participationMetrics.activeStaff} of{" "}
                              {analytics.participationMetrics.totalStaff} staff
                              active
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" />
                            <span>
                              Avg completion:{" "}
                              {formatCompletionTimeDetailed(
                                analytics.completionTimeStats
                                  .averageCompletionTime
                              )}
                            </span>
                          </div>
                        </>
                      )}
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
                    <select
                      value={selectedTimePeriod}
                      onChange={(e) => setSelectedTimePeriod(e.target.value)}
                      className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      <option value="all">All Time</option>
                      <option value="month">Last Month</option>
                      <option value="week">Last Week</option>
                    </select>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <PresentationChartLineIcon className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading and Error States */}
              {loading && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
                  <div className="text-center">
                    <LoadingSpinner message="Loading staff results and leaderboards..." />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <ErrorMessage message={error} />
                </div>
              )}

              {!loading && !error && (
                <>
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
                            {analytics?.totalStaff || totalStaff || 0}
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
                            {analytics?.totalQuestionsAnswered || 0}
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
                            {analytics?.overallAverageScore?.toFixed(1) ||
                              avgQuizScore?.toFixed(1) ||
                              0}
                            %
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
                            {analytics
                              ? Math.round(
                                  analytics.participationMetrics
                                    .participationRate
                                )
                              : 0}
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
                            {analytics?.staffNeedingSupport?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Staff Insights from Analytics */}
                  {analytics && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Performers from Analytics */}
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
                              {analytics.topPerformers.map(
                                (performer, index) => {
                                  const categoryConfig =
                                    CATEGORY_CONFIG[
                                      performer.strongestCategory
                                    ];
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
                                        window.open(
                                          `/staff/${userIdString}`,
                                          "_blank"
                                        );
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
                                          <span>
                                            Strongest: {categoryConfig.label}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">
                                          {(
                                            performer.overallAverageScore || 0
                                          ).toFixed(1)}
                                          %
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
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
                              {analytics.staffNeedingSupport.map(
                                (staff, index) => {
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
                                        window.open(
                                          `/staff/${userIdString}`,
                                          "_blank"
                                        );
                                      }}
                                    >
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                          {staff.userName}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                          <IconComponent className="h-4 w-4" />
                                          <span>
                                            Needs help: {categoryConfig.label}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-bold text-orange-600">
                                          {(
                                            staff.overallAverageScore || 0
                                          ).toFixed(1)}
                                          %
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
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
                  )}

                  {/* Score Distribution Chart */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-900">
                          Score Distribution
                        </h2>
                        <button
                          onClick={() =>
                            setShowDistributionChart(!showDistributionChart)
                          }
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                          {showDistributionChart ? "Hide Chart" : "Show Chart"}
                        </button>
                      </div>
                    </div>

                    {showDistributionChart && (
                      <div className="p-6">
                        <ScoreDistributionChart
                          staffData={staffData}
                          selectedCategory={selectedPerformanceCategory}
                          onSelectCategory={setSelectedPerformanceCategory}
                        />
                      </div>
                    )}
                  </div>

                  {/* Staff Results Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                      <h2 className="text-xl font-semibold text-slate-900">
                        Detailed Staff Performance
                      </h2>
                    </div>

                    <div className="p-6">
                      <StaffResultsFilter
                        filters={filters}
                        staffData={staffData}
                        selectedCategory={selectedPerformanceCategory}
                        onFilterChange={handleFilterChange}
                        onCategoryChange={setSelectedPerformanceCategory}
                        onResetFilters={resetFilters}
                      />
                      <div className="mt-6">
                        <StaffResultsTable
                          staff={filteredAndSortedStaff}
                          expandedStaffId={expandedStaffId}
                          onToggleExpand={toggleExpand}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Champions */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-slate-200">
                      <div className="flex items-center space-x-3">
                        <AcademicCapIcon className="h-6 w-6 text-green-600" />
                        <h2 className="text-xl font-semibold text-slate-900">
                          Category Champions
                        </h2>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        Best performers in each knowledge category
                      </p>
                    </div>
                    <div className="p-6">
                      {leaderboardData?.categoryChampions ? (
                        <CategoryChampions
                          categoryChampions={leaderboardData.categoryChampions}
                        />
                      ) : (
                        <div className="text-center py-8">
                          <SparklesIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-500">
                            No category data available
                          </p>
                          <p className="text-slate-400 text-sm">
                            Complete category-specific quizzes to see champions
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Question Distribution */}
                  {analytics && (
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

                              // Use type-safe property access
                              const lightColorClass =
                                "lightColor" in config
                                  ? config.lightColor
                                  : "bg-gray-50";

                              return (
                                <div
                                  key={category}
                                  className={`${lightColorClass} rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow`}
                                >
                                  <div className="flex items-center gap-3 mb-3">
                                    <div
                                      className={`p-2 ${config.color} rounded-lg`}
                                    >
                                      <IconComponent className="h-5 w-5 text-white" />
                                    </div>
                                    <h4
                                      className={`font-medium ${config.textColor}`}
                                    >
                                      {config.label}
                                    </h4>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">
                                        Total:
                                      </span>
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
                                      <span className="text-gray-600">
                                        Manual:
                                      </span>
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
                  )}

                  {/* Completion Time Analytics */}
                  {analytics && (
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
                                {analytics.completionTimeStats
                                  ?.averageCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .averageCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <p className="text-sm text-green-600 mb-1">
                                Fastest Time
                              </p>
                              <p className="text-xl font-bold text-green-900">
                                {analytics.completionTimeStats
                                  ?.fastestCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .fastestCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                              <p className="text-sm text-orange-600 mb-1">
                                Slowest Time
                              </p>
                              <p className="text-xl font-bold text-orange-900">
                                {analytics.completionTimeStats
                                  ?.slowestCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .slowestCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-600 mb-1">
                                Total Quizzes
                              </p>
                              <p className="text-xl font-bold text-blue-900">
                                {analytics.completionTimeStats
                                  ?.totalQuizzesCompleted || 0}
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
                          {analytics.categoryCompletionTimes ? (
                            <div className="grid grid-cols-1 gap-4">
                              {Object.entries(
                                analytics.categoryCompletionTimes
                              ).map(([categoryKey, time]) => {
                                // Find the matching category configuration
                                const categoryConfig = Object.values(
                                  CATEGORY_CONFIG
                                ).find(
                                  (config) =>
                                    "timeKey" in config &&
                                    config.timeKey === categoryKey
                                );

                                if (!categoryConfig) return null;

                                const IconComponent = categoryConfig.icon;

                                // Use type-safe property access for completion times
                                const lightColorClass =
                                  "lightColor" in categoryConfig
                                    ? categoryConfig.lightColor
                                    : "bg-gray-50";
                                const borderColorClass =
                                  "borderColor" in categoryConfig
                                    ? categoryConfig.borderColor
                                    : "border-gray-200";
                                const colorClass =
                                  "color" in categoryConfig
                                    ? categoryConfig.color
                                    : "bg-gray-500";

                                return (
                                  <div
                                    key={categoryKey}
                                    className={`${lightColorClass} ${borderColorClass} rounded-lg p-4 border-2 hover:shadow-md transition-shadow`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`p-2 ${colorClass} rounded-lg`}
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
                                          {formatCompletionTimeDetailed(time)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          avg time
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">
                                No category completion time data available
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last Updated */}
                  {analytics && (
                    <div className="text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        <span>
                          Analytics last updated:{" "}
                          {new Date(analytics.lastUpdated).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RestaurantStaffResultsPage;
