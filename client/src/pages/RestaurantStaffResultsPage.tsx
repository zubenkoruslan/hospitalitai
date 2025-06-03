import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import api from "../services/api"; // Removed unused direct API import
import { useAuth } from "../context/AuthContext";
import { useStaffSummary } from "../hooks/useStaffSummary"; // Import the new hook
import { useQuizCount } from "../hooks/useQuizCount"; // Import the quiz count hook
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner"; // Import common LoadingSpinner
import ErrorMessage from "../components/common/ErrorMessage"; // Import common ErrorMessage
import ScoreDistributionChart from "../components/charts/ScoreDistributionChart"; // Import the chart
import StaffResultsFilter from "../components/staff/StaffResultsFilter"; // Import the filter component
import StaffResultsTable from "../components/staff/StaffResultsTable"; // Import the table component
import Card from "../components/common/Card"; // Import Card
// Import shared types
import { Filters, StaffMemberWithData } from "../types/staffTypes";
// Import utility functions
// import { formatDate } from "../utils/helpers"; // Removed formatDate

import KPICard from "../components/settings/KPICard"; // Added KPICard import
import BarChart from "../components/charts/BarChart"; // Added BarChart import
import { ChartData } from "chart.js"; // Added ChartData import
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
} from "@heroicons/react/24/outline"; // Added new icons

// Enhanced interfaces for Phase 5 leaderboard features
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

// Category configuration for visual consistency
const CATEGORY_CONFIG = {
  foodKnowledge: {
    icon: CakeIcon,
    label: "Food Knowledge",
    color: "#10B981", // Green
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-600",
  },
  beverageKnowledge: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    color: "#3B82F6", // Blue
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-600",
  },
  wineKnowledge: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    color: "#8B5CF6", // Purple
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    iconColor: "text-purple-600",
  },
  proceduresKnowledge: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    color: "#F59E0B", // Orange
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    iconColor: "text-orange-600",
  },
};

// Helper function to format completion time
const formatCompletionTime = (seconds?: number): string => {
  if (!seconds) return "N/A";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
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

        return (
          <div
            key={categoryKey}
            className={`${config.bgColor} ${
              config.borderColor
            } rounded-xl p-6 border ${
              champion ? "hover:shadow-md transition-shadow" : ""
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
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
                  {champion.averageCompletionTime && (
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
  // Phase 5: Enhanced state for leaderboards
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("all");

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

  // Phase 5: Enhanced leaderboard data hook
  const {
    leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboardData(selectedTimePeriod);

  // Combine loading and error states
  const loading = staffLoading || quizCountLoading || leaderboardLoading;
  const error = staffError || quizCountError || leaderboardError;

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
      result = result.filter((staff) =>
        staff.professionalRole
          ?.toLowerCase()
          .includes(filters.role.toLowerCase())
      );
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
              {/* Header Section */}
              <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-600 rounded-xl shadow-lg">
                    <ChartBarIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-900">
                      Staff Results & Performance Analytics
                    </h1>
                    <p className="text-slate-600 mt-2">
                      Track staff quiz performance, leaderboards, and training
                      progress
                    </p>
                  </div>
                  {/* Phase 5: Time Period Filter */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Time Period:
                    </label>
                    <select
                      value={selectedTimePeriod}
                      onChange={(e) => setSelectedTimePeriod(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="all">All Time</option>
                      <option value="month">Last Month</option>
                      <option value="week">Last Week</option>
                    </select>
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
                  {/* Phase 5: Enhanced KPIs with Leaderboard Metrics */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">
                      Key Performance Indicators
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <UsersIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-slate-700">
                              Total Staff
                            </h3>
                            <p className="text-2xl font-bold text-slate-900">
                              {totalStaff === null
                                ? "N/A"
                                : totalStaff.toString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <TrophyIcon className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-slate-700">
                              Avg. Quiz Score
                            </h3>
                            <p className="text-2xl font-bold text-slate-900">
                              {formatPercentage(avgQuizScore)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <FireIcon className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-slate-700">
                              Top Performer
                            </h3>
                            <p className="text-lg font-bold text-slate-900">
                              {leaderboardData?.topPerformers?.[0]?.name ||
                                "N/A"}
                            </p>
                            {leaderboardData?.topPerformers?.[0] && (
                              <p className="text-sm text-slate-600">
                                {Math.round(
                                  leaderboardData.topPerformers[0]
                                    .overallAverageScore
                                )}
                                % average score
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 5: Leaderboards Section */}
                  <div className="grid grid-cols-1 gap-8">
                    {/* Top Performers Leaderboard */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center space-x-3">
                          <TrophyIcon className="h-6 w-6 text-yellow-600" />
                          <h2 className="text-xl font-semibold text-slate-900">
                            Top Performers
                          </h2>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          Highest overall quiz average scores (
                          {selectedTimePeriod})
                        </p>
                      </div>
                      <div className="p-6">
                        {leaderboardData?.topPerformers?.length ? (
                          <TopPerformersLeaderboard
                            topPerformers={leaderboardData.topPerformers}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <TrophyIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-500">
                              No performance data available
                            </p>
                            <p className="text-slate-400 text-sm">
                              Complete quizzes to see rankings
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Phase 5: Category Champions */}
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
