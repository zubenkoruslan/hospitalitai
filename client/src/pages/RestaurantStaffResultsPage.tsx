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

// Import shared types
import { Filters, StaffMemberWithData } from "../types/staffTypes";
import { KnowledgeCategory } from "../types/questionBankTypes";

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
  InformationCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

// Enhanced interfaces for comprehensive analytics
interface LeaderboardEntry {
  rank: number;
  userId: string | { _id: string; toString(): string };
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
  userId: string | { _id: string; toString(): string };
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

// Helper function to map time periods for different APIs
const mapTimePeriodForLeaderboards = (timePeriod: string): string => {
  switch (timePeriod) {
    case "7d":
      return "week";
    case "30d":
      return "month";
    case "90d":
      return "all"; // 90 days maps to "all" since no quarterly option
    case "all":
      return "all";
    default:
      return "all";
  }
};

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

        // Map the time period for leaderboards API
        const mappedTimePeriod = mapTimePeriodForLeaderboards(timePeriod);

        console.log(
          "[Leaderboard API] Fetching data for time period:",
          timePeriod,
          "mapped to:",
          mappedTimePeriod
        );

        const response = await fetch(
          `/api/analytics/leaderboards?timePeriod=${mappedTimePeriod}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("[Leaderboard API] Response status:", response.status);

        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard data");
        }

        const result = await response.json();
        console.log("[Leaderboard API] Full response:", result);
        console.log(
          "[Leaderboard API] Category champions specifically:",
          result.data?.categoryChampions
        );

        setLeaderboardData(result.data);
      } catch (err) {
        console.error("[Leaderboard API] Error:", err);
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

  const handleStaffClick = (
    userId: string | { _id: string; toString(): string }
  ) => {
    // Ensure userId is always a string
    const staffId =
      typeof userId === "string" ? userId : userId._id || userId.toString();
    console.log("Navigating to staff ID:", staffId, "Type:", typeof staffId);
    window.open(`/staff/${staffId}`, "_blank");
  };

  return (
    <div className="space-y-3">
      {topPerformers.map((performer) => (
        <div
          key={
            typeof performer.userId === "string"
              ? performer.userId
              : performer.userId._id || performer.userId.toString()
          }
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

  // Debug logging for category champions
  React.useEffect(() => {
    console.log("[Category Champions] Received data:", categoryChampions);
    if (categoryChampions) {
      Object.entries(categoryChampions).forEach(([key, champion]) => {
        console.log(`[Category Champions] ${key}:`, champion);
      });
    }
  }, [categoryChampions]);

  const handleStaffClick = (
    userId: string | { _id: string; toString(): string }
  ) => {
    // Ensure userId is always a string
    const staffId =
      typeof userId === "string" ? userId : userId._id || userId.toString();
    console.log("Navigating to staff ID:", staffId, "Type:", typeof staffId);
    window.open(`/staff/${staffId}`, "_blank");
  };

  if (!categoryChampions) {
    console.log("[Category Champions] No categoryChampions data available");
    return (
      <div className="text-center py-8">
        <SparklesIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500">No category champions data available</p>
        <p className="text-slate-400 text-sm">
          Complete category-specific quizzes to see champions
        </p>
      </div>
    );
  }

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
  // Enhanced state for comprehensive analytics - consolidate time filters
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("30d");

  // Use custom hooks for data - use single time filter for both
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

  // Enhanced analytics hooks - use consolidated time filter
  const {
    leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboardData(selectedTimePeriod);

  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useEnhancedAnalytics(selectedTimePeriod as "7d" | "30d" | "90d");

  // Debug logging for data issues
  React.useEffect(() => {
    console.log("Debug - Analytics data:", analytics);
    console.log("Debug - Staff data sample:", staffData.slice(0, 2));
    console.log("Debug - Leaderboard data:", leaderboardData);
    console.log("Debug - Selected time period:", selectedTimePeriod);
    console.log(
      "Debug - Mapped time period for leaderboards:",
      mapTimePeriodForLeaderboards(selectedTimePeriod)
    );
  }, [analytics, staffData, leaderboardData, selectedTimePeriod]);

  // Listen for analytics refresh events (when questions are updated)
  React.useEffect(() => {
    const handleAnalyticsRefresh = () => {
      console.log(
        "[Staff Results] Received analytics refresh event, refetching all data..."
      );

      // Force refresh all data by triggering re-fetch
      // This will cause the hooks to refetch their data
      window.location.reload(); // Simple but effective approach for comprehensive refresh
    };

    window.addEventListener("analytics-refresh", handleAnalyticsRefresh);

    return () => {
      window.removeEventListener("analytics-refresh", handleAnalyticsRefresh);
    };
  }, []);

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

  // Mobile expandable sections state
  const [expandedMobileSections, setExpandedMobileSections] = useState({
    topPerformers: true,
    staffNeedingSupport: true,
    scoreDistribution: false,
    staffPerformance: false,
    categoryChampions: false,
    questionDistribution: false,
    completionTimes: false,
  });

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

  // Toggle mobile section expansion
  const toggleMobileSection = useCallback(
    (section: keyof typeof expandedMobileSections) => {
      setExpandedMobileSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }));
    },
    []
  );

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
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Enhanced Header matching RestaurantDashboard */}
              <div className="mb-6 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-2xl p-4 lg:p-6 border border-primary/10 shadow-md backdrop-blur-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-gradient-to-r from-primary to-accent rounded-lg shadow-md">
                        <PresentationChartLineIcon className="h-5 w-5 text-white" />
                      </div>
                      <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Comprehensive Staff Analytics
                      </h1>
                    </div>
                    <p className="text-muted-gray text-sm mb-3">
                      Track staff performance, leaderboards, knowledge
                      analytics, and training progress across your restaurant.
                    </p>

                    {/* Stats Preview */}
                    {analytics && (
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 rounded">
                            <UserGroupIcon className="h-3 w-3 text-blue-600" />
                          </div>
                          <span>
                            {analytics.participationMetrics.activeStaff} of{" "}
                            {analytics.participationMetrics.totalStaff} staff
                            active
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-100 rounded">
                            <ClockIcon className="h-3 w-3 text-green-600" />
                          </div>
                          <span>
                            Avg completion:{" "}
                            {formatCompletionTimeDetailed(
                              analytics.completionTimeStats
                                .averageCompletionTime
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time Period Selector */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-600">
                        Time Period:
                      </span>
                      <select
                        value={selectedTimePeriod}
                        onChange={(e) => setSelectedTimePeriod(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-slate-400"
                      >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="all">All Time</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading and Error States */}
              {loading && (
                <div className="bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-2xl p-6 lg:p-8 border border-primary/10 shadow-md backdrop-blur-sm">
                  <div className="text-center">
                    <LoadingSpinner message="Loading comprehensive staff analytics..." />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 shadow-sm">
                  <ErrorMessage message={error} />
                </div>
              )}

              {!loading && !error && (
                <>
                  {/* Enhanced Key Metrics with animations - matching RestaurantDashboard */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-5 mb-8">
                    {/* Total Staff Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                      <div className="relative z-10">
                        <div className="flex items-center space-x-2 lg:space-x-4">
                          <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                            <UsersIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                              Total Staff
                            </p>
                            <p className="text-lg lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                              {analytics?.totalStaff || totalStaff || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Questions Answered Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                      <div className="relative z-10">
                        <div className="flex items-center space-x-2 lg:space-x-4">
                          <div className="p-2 lg:p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                            <AcademicCapIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                              Questions Answered
                            </p>
                            <p className="text-lg lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                              {analytics?.totalQuestionsAnswered || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overall Average Score Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                      <div className="relative z-10">
                        <div className="flex items-center space-x-2 lg:space-x-4">
                          <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                            <TrophyIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                              Avg. Score
                            </p>
                            <p className="text-lg lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                              {analytics?.overallAverageScore?.toFixed(1) ||
                                avgQuizScore?.toFixed(1) ||
                                0}
                              %
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Participation Rate Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-teal-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                      <div className="relative z-10">
                        <div className="flex items-center space-x-2 lg:space-x-4">
                          <div
                            className="p-2 lg:p-3 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                            style={{ backgroundColor: "#0d9488" }}
                          >
                            <UserGroupIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                              Participation
                            </p>
                            <p className="text-lg lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
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
                    </div>

                    {/* Need Support Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                      <div className="relative z-10">
                        <div className="flex items-center space-x-2 lg:space-x-4">
                          <div className="p-2 lg:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                            <ExclamationTriangleIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                              Need Support
                            </p>
                            <p className="text-lg lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                              {analytics?.staffNeedingSupport?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Staff Insights from Analytics */}
                  {analytics && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Performers from Analytics */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Mobile Header with Toggle */}
                        <div
                          className="lg:hidden cursor-pointer"
                          onClick={() => toggleMobileSection("topPerformers")}
                        >
                          <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-green-600 rounded-lg">
                                  <TrophyIcon className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-green-900">
                                  Top Performers
                                </h3>
                                <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                                  {analytics.topPerformers.length}
                                </span>
                              </div>
                              <ChevronRightIcon
                                className={`h-5 w-5 text-green-600 transform transition-transform duration-200 ${
                                  expandedMobileSections.topPerformers
                                    ? "rotate-90"
                                    : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden lg:block bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-600 rounded-lg">
                              <TrophyIcon className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-900">
                              Top Performers
                            </h3>
                          </div>
                        </div>

                        {/* Content - Expandable on mobile, always visible on desktop */}
                        <div
                          className={`${
                            expandedMobileSections.topPerformers
                              ? "block"
                              : "hidden"
                          } lg:block p-6`}
                        >
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
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Mobile Header with Toggle */}
                        <div
                          className="lg:hidden cursor-pointer"
                          onClick={() =>
                            toggleMobileSection("staffNeedingSupport")
                          }
                        >
                          <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-600 rounded-lg">
                                  <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-orange-900">
                                  Staff Needing Support
                                </h3>
                                <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
                                  {analytics.staffNeedingSupport.length}
                                </span>
                              </div>
                              <ChevronRightIcon
                                className={`h-5 w-5 text-orange-600 transform transition-transform duration-200 ${
                                  expandedMobileSections.staffNeedingSupport
                                    ? "rotate-90"
                                    : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden lg:block bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-orange-600 rounded-lg">
                              <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-orange-900">
                              Staff Needing Support
                            </h3>
                          </div>
                        </div>

                        {/* Content - Expandable on mobile, always visible on desktop */}
                        <div
                          className={`${
                            expandedMobileSections.staffNeedingSupport
                              ? "block"
                              : "hidden"
                          } lg:block p-6`}
                        >
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
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    {/* Mobile Header with Toggle */}
                    <div
                      className="lg:hidden cursor-pointer"
                      onClick={() => toggleMobileSection("scoreDistribution")}
                    >
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                              <ChartBarIcon className="h-4 w-4 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">
                              Score Distribution
                            </h2>
                          </div>
                          <ChevronRightIcon
                            className={`h-5 w-5 text-slate-600 transform transition-transform duration-200 ${
                              expandedMobileSections.scoreDistribution
                                ? "rotate-90"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:block bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-blue-600 rounded-lg">
                            <ChartBarIcon className="h-4 w-4 text-white" />
                          </div>
                          <h2 className="text-xl font-semibold text-slate-900">
                            Score Distribution
                          </h2>
                        </div>
                        <button
                          onClick={() =>
                            setShowDistributionChart(!showDistributionChart)
                          }
                          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                          {showDistributionChart ? "Hide Chart" : "Show Chart"}
                        </button>
                      </div>
                    </div>

                    {/* Mobile Content - Simplified */}
                    <div
                      className={`${
                        expandedMobileSections.scoreDistribution
                          ? "block"
                          : "hidden"
                      } lg:hidden p-6`}
                    >
                      <div className="space-y-4">
                        <div className="text-center text-sm text-slate-600 mb-4">
                          Staff distribution by performance level
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            {
                              label: "Excellent (90%+)",
                              category: "excellent",
                              bgColor: "bg-green-50",
                              textColor: "text-green-700",
                              borderColor: "border-green-200",
                            },
                            {
                              label: "Good (75-89%)",
                              category: "good",
                              bgColor: "bg-blue-50",
                              textColor: "text-blue-700",
                              borderColor: "border-blue-200",
                            },
                            {
                              label: "Average (60-74%)",
                              category: "average",
                              bgColor: "bg-yellow-50",
                              textColor: "text-yellow-700",
                              borderColor: "border-yellow-200",
                            },
                            {
                              label: "Needs Work (<60%)",
                              category: "needsWork",
                              bgColor: "bg-red-50",
                              textColor: "text-red-700",
                              borderColor: "border-red-200",
                            },
                          ].map((item) => {
                            const count = staffData.filter((staff) => {
                              const avgScore = staff.averageScore;
                              if (avgScore === null) return false;
                              switch (item.category) {
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
                            }).length;

                            return (
                              <div
                                key={item.category}
                                className={`${item.bgColor} ${item.borderColor} border-2 rounded-lg p-4 text-center cursor-pointer hover:shadow-md transition-shadow`}
                                onClick={() =>
                                  setSelectedPerformanceCategory(item.category)
                                }
                              >
                                <div
                                  className={`text-2xl font-bold ${item.textColor} mb-1`}
                                >
                                  {count}
                                </div>
                                <div
                                  className={`text-xs ${item.textColor} font-medium`}
                                >
                                  {item.label.split(" ")[0]}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Content - Full Chart */}
                    <div className="hidden lg:block">
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
                  </div>

                  {/* Staff Results Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    {/* Mobile Header with Toggle */}
                    <div
                      className="lg:hidden cursor-pointer"
                      onClick={() => toggleMobileSection("staffPerformance")}
                    >
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                              <UsersIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-slate-900">
                                Staff Performance
                              </h2>
                              <p className="text-xs text-slate-600">
                                {filteredAndSortedStaff.length} members
                              </p>
                            </div>
                          </div>
                          <ChevronRightIcon
                            className={`h-5 w-5 text-slate-600 transform transition-transform duration-200 ${
                              expandedMobileSections.staffPerformance
                                ? "rotate-90"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:block bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-purple-600 rounded-lg">
                          <UsersIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">
                            Detailed Staff Performance
                          </h2>
                          <p className="text-sm text-slate-600 mt-1">
                            Complete performance breakdown for all team members
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Content - Simplified */}
                    <div
                      className={`${
                        expandedMobileSections.staffPerformance
                          ? "block"
                          : "hidden"
                      } lg:hidden p-6`}
                    >
                      {/* Minimal Filters */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            name="name"
                            placeholder="Search staff..."
                            value={filters.name}
                            onChange={handleFilterChange}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <UsersIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        </div>
                        {(filters.name || selectedPerformanceCategory) && (
                          <button
                            onClick={resetFilters}
                            className="px-3 py-2 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Simplified Staff Table */}
                      <div className="space-y-3">
                        {filteredAndSortedStaff.length > 0 ? (
                          filteredAndSortedStaff.map((staff) => (
                            <div
                              key={staff._id}
                              className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-slate-900 text-sm truncate">
                                    {staff.name}
                                  </div>
                                  <div className="text-xs text-slate-600 truncate">
                                    {staff.assignedRoleName ||
                                      staff.professionalRole ||
                                      "No role assigned"}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div
                                    className={`text-lg font-bold ${
                                      staff.averageScore === null
                                        ? "text-slate-400"
                                        : staff.averageScore >= 85
                                        ? "text-green-600"
                                        : staff.averageScore >= 70
                                        ? "text-blue-600"
                                        : staff.averageScore >= 50
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {staff.averageScore !== null
                                      ? `${staff.averageScore.toFixed(1)}%`
                                      : "N/A"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-500">
                            No staff found matching filters
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Content - Full Table */}
                    <div className="hidden lg:block p-6">
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
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    {/* Mobile Header with Toggle */}
                    <div
                      className="lg:hidden cursor-pointer"
                      onClick={() => toggleMobileSection("categoryChampions")}
                    >
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-green-600 rounded-lg">
                              <AcademicCapIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-slate-900">
                                Category Champions
                              </h2>
                            </div>
                          </div>
                          <ChevronRightIcon
                            className={`h-5 w-5 text-slate-600 transform transition-transform duration-200 ${
                              expandedMobileSections.categoryChampions
                                ? "rotate-90"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:block bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-green-600 rounded-lg">
                          <AcademicCapIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">
                            Category Champions
                          </h2>
                          <p className="text-sm text-slate-600 mt-1">
                            Best performers in each knowledge category
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Content - 2x2 Grid */}
                    <div
                      className={`${
                        expandedMobileSections.categoryChampions
                          ? "block"
                          : "hidden"
                      } lg:hidden p-6`}
                    >
                      {leaderboardData?.categoryChampions ? (
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(
                            leaderboardData.categoryChampions
                          ).map(([categoryKey, champion]) => {
                            const config =
                              CATEGORY_CONFIG[
                                categoryKey as keyof typeof CATEGORY_CONFIG
                              ];
                            const IconComponent = config.icon;

                            const bgColorClass =
                              "bgColor" in config
                                ? config.bgColor
                                : config.lightColor;

                            return (
                              <div
                                key={categoryKey}
                                className={`${bgColorClass} ${config.borderColor} rounded-lg p-3 border text-center`}
                              >
                                <div className="flex items-center justify-center mb-2">
                                  <IconComponent
                                    className={`h-4 w-4 ${config.textColor}`}
                                  />
                                </div>
                                <h3
                                  className={`font-medium text-xs ${config.textColor} mb-2 truncate`}
                                >
                                  {config.label}
                                </h3>

                                {champion ? (
                                  <div>
                                    <p className="font-semibold text-slate-900 text-sm truncate mb-1">
                                      {champion.name}
                                    </p>
                                    <p className="text-lg font-bold text-slate-800">
                                      {Math.round(champion.averageScore)}%
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <p className="text-xs text-slate-500">
                                      No champion
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <SparklesIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">
                            No data available
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Desktop Content - Full Grid */}
                    <div className="hidden lg:block p-6">
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
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                      {/* Mobile Header with Toggle */}
                      <div
                        className="lg:hidden cursor-pointer"
                        onClick={() =>
                          toggleMobileSection("questionDistribution")
                        }
                      >
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="p-1.5 bg-amber-600 rounded-lg">
                                <ChartPieIcon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-slate-900">
                                  Question Distribution
                                </h3>
                              </div>
                            </div>
                            <ChevronRightIcon
                              className={`h-5 w-5 text-slate-600 transform transition-transform duration-200 ${
                                expandedMobileSections.questionDistribution
                                  ? "rotate-90"
                                  : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Header */}
                      <div className="hidden lg:block bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-amber-600 rounded-lg">
                            <ChartPieIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">
                              Question Distribution by Category
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Breakdown of AI-generated vs manually created
                              questions
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Content - 2x2 Grid */}
                      <div
                        className={`${
                          expandedMobileSections.questionDistribution
                            ? "block"
                            : "hidden"
                        } lg:hidden p-6`}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(analytics.questionDistribution).map(
                            ([category, distribution]) => {
                              const config =
                                CATEGORY_CONFIG[category as KnowledgeCategory];
                              const IconComponent = config.icon;

                              const lightColorClass =
                                "lightColor" in config
                                  ? config.lightColor
                                  : "bg-gray-50";

                              return (
                                <div
                                  key={category}
                                  className={`${lightColorClass} rounded-lg p-3 border border-gray-200 text-center`}
                                >
                                  <div className="flex items-center justify-center mb-2">
                                    <IconComponent
                                      className={`h-4 w-4 ${config.textColor}`}
                                    />
                                  </div>
                                  <h4
                                    className={`font-medium text-xs ${config.textColor} mb-2 truncate`}
                                  >
                                    {config.label}
                                  </h4>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-slate-900 mb-1">
                                      {distribution.totalQuestions}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      {Math.round(
                                        (distribution.aiGenerated /
                                          distribution.totalQuestions) *
                                          100
                                      )}
                                      % AI
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Desktop Content - Full Grid */}
                      <div className="hidden lg:block p-6">
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
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Mobile Header with Toggle */}
                        <div
                          className="lg:hidden cursor-pointer"
                          onClick={() => toggleMobileSection("completionTimes")}
                        >
                          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-slate-600 rounded-lg">
                                  <ClockIcon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold text-slate-900">
                                    Completion Time Analytics
                                  </h3>
                                </div>
                              </div>
                              <ChevronRightIcon
                                className={`h-5 w-5 text-slate-600 transform transition-transform duration-200 ${
                                  expandedMobileSections.completionTimes
                                    ? "rotate-90"
                                    : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden lg:block bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="p-1.5 bg-slate-600 rounded-lg">
                                <ClockIcon className="h-4 w-4 text-white" />
                              </div>
                              <h3 className="text-xl font-semibold text-slate-900">
                                Completion Time Analytics
                              </h3>
                            </div>
                            {/* Info icon for unusually fast times */}
                            {analytics.completionTimeStats
                              ?.averageCompletionTime &&
                              analytics.completionTimeStats
                                .averageCompletionTime < 60 && (
                                <div className="relative group">
                                  <InformationCircleIcon className="h-5 w-5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                                  <div className="absolute right-0 top-8 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                    <strong>Note:</strong> Average completion
                                    times appear unusually fast (under 1
                                    minute). This may indicate test data or
                                    rapid clicking through quizzes.
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Mobile Content - 2x2 Grid */}
                        <div
                          className={`${
                            expandedMobileSections.completionTimes
                              ? "block"
                              : "hidden"
                          } lg:hidden p-6`}
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                              <p className="text-xs font-medium text-slate-600 mb-1">
                                Average
                              </p>
                              <p className="text-lg font-bold text-slate-900">
                                {analytics.completionTimeStats
                                  ?.averageCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .averageCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                              <p className="text-xs font-medium text-green-700 mb-1">
                                Fastest
                              </p>
                              <p className="text-lg font-bold text-green-900">
                                {analytics.completionTimeStats
                                  ?.fastestCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .fastestCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                              <p className="text-xs font-medium text-orange-700 mb-1">
                                Slowest
                              </p>
                              <p className="text-lg font-bold text-orange-900">
                                {analytics.completionTimeStats
                                  ?.slowestCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .slowestCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                              <p className="text-xs font-medium text-blue-700 mb-1">
                                Total Quizzes
                              </p>
                              <p className="text-lg font-bold text-blue-900">
                                {analytics.completionTimeStats
                                  ?.totalQuizzesCompleted || 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Content - Full Grid */}
                        <div className="hidden lg:block p-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                              <p className="text-sm font-medium text-slate-600 mb-2">
                                Average Time
                              </p>
                              <p className="text-2xl font-bold text-slate-900">
                                {analytics.completionTimeStats
                                  ?.averageCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .averageCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                              {analytics.completionTimeStats
                                ?.averageCompletionTime && (
                                <p className="text-xs text-slate-500 mt-1">
                                  ≈{" "}
                                  {Math.round(
                                    analytics.completionTimeStats
                                      .averageCompletionTime / 5
                                  )}{" "}
                                  sec/question
                                </p>
                              )}
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                              <p className="text-sm font-medium text-green-700 mb-2">
                                Fastest Time
                              </p>
                              <p className="text-2xl font-bold text-green-900">
                                {analytics.completionTimeStats
                                  ?.fastestCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .fastestCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                              {analytics.completionTimeStats
                                ?.fastestCompletionTime && (
                                <p className="text-xs text-green-600 mt-1">
                                  ≈{" "}
                                  {Math.round(
                                    analytics.completionTimeStats
                                      .fastestCompletionTime / 5
                                  )}{" "}
                                  sec/question
                                </p>
                              )}
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                              <p className="text-sm font-medium text-orange-700 mb-2">
                                Slowest Time
                              </p>
                              <p className="text-2xl font-bold text-orange-900">
                                {analytics.completionTimeStats
                                  ?.slowestCompletionTime
                                  ? formatCompletionTimeDetailed(
                                      analytics.completionTimeStats
                                        .slowestCompletionTime
                                    )
                                  : "N/A"}
                              </p>
                              {analytics.completionTimeStats
                                ?.slowestCompletionTime && (
                                <p className="text-xs text-orange-600 mt-1">
                                  ≈{" "}
                                  {Math.round(
                                    analytics.completionTimeStats
                                      .slowestCompletionTime / 5
                                  )}{" "}
                                  sec/question
                                </p>
                              )}
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                              <p className="text-sm font-medium text-blue-700 mb-2">
                                Total Quizzes
                              </p>
                              <p className="text-2xl font-bold text-blue-900">
                                {analytics.completionTimeStats
                                  ?.totalQuizzesCompleted || 0}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                completed attempts
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Category Completion Times */}
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Mobile Header with Toggle */}
                        <div
                          className="lg:hidden cursor-pointer"
                          onClick={() => toggleMobileSection("completionTimes")}
                        >
                          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-purple-600 rounded-lg">
                                  <FireIcon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold text-slate-900">
                                    Completion Times
                                  </h3>
                                </div>
                              </div>
                              <ChevronRightIcon
                                className={`h-5 w-5 text-slate-600 transform transition-transform duration-200 ${
                                  expandedMobileSections.completionTimes
                                    ? "rotate-90"
                                    : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden lg:block bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                              <FireIcon className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">
                              Category Completion Times
                            </h3>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            Average time to complete quizzes by knowledge area
                          </p>
                        </div>

                        {/* Mobile Content - 2x2 Grid */}
                        <div
                          className={`${
                            expandedMobileSections.completionTimes
                              ? "block"
                              : "hidden"
                          } lg:hidden p-6`}
                        >
                          {analytics.categoryCompletionTimes ? (
                            <div className="grid grid-cols-2 gap-3">
                              {Object.entries(
                                analytics.categoryCompletionTimes
                              ).map(([categoryKey, time]) => {
                                const categoryConfig = Object.values(
                                  CATEGORY_CONFIG
                                ).find(
                                  (config) =>
                                    "timeKey" in config &&
                                    config.timeKey === categoryKey
                                );

                                if (!categoryConfig) return null;

                                const IconComponent = categoryConfig.icon;
                                const lightColorClass =
                                  "lightColor" in categoryConfig
                                    ? categoryConfig.lightColor
                                    : "bg-gray-50";

                                return (
                                  <div
                                    key={categoryKey}
                                    className={`${lightColorClass} rounded-lg p-3 border border-gray-200 text-center`}
                                  >
                                    <div className="flex items-center justify-center mb-2">
                                      <IconComponent
                                        className={`h-4 w-4 ${categoryConfig.textColor}`}
                                      />
                                    </div>
                                    <h4
                                      className={`font-medium text-xs ${categoryConfig.textColor} mb-2 truncate`}
                                    >
                                      {categoryConfig.label}
                                    </h4>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-slate-900 mb-1">
                                        {formatCompletionTimeDetailed(time)}
                                      </div>
                                      <div className="text-xs text-slate-600">
                                        avg time
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <ClockIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">
                                No data available
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Desktop Content - Full List */}
                        <div className="hidden lg:block p-6">
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
                    <div className="text-center bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
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
