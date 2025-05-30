import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import api from "../services/api"; // Removed unused direct API import
import { useAuth } from "../context/AuthContext";
import { useStaffSummary } from "../hooks/useStaffSummary"; // Import the new hook
import { useQuizCount } from "../hooks/useQuizCount"; // Import the quiz count hook
import DashboardLayout from "../components/layout/DashboardLayout"; // Updated import
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
} from "@heroicons/react/24/outline"; // Added icons

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

// Helper Components (Assuming LoadingSpinner and ErrorMessage exist elsewhere or define here)
// // Removed LoadingSpinner definition
// // Removed ErrorMessage definition

// Helper function to check if a quiz is completed regardless of capitalization
// // Removed local definition of isCompletedQuiz

// Enhanced bar chart component for visualizing score distribution
// // Removed ScoreDistributionChart definition

const RestaurantStaffResultsPage: React.FC = () => {
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

  // Remove totalQuizzes state, it now comes from the hook
  // const [totalQuizzes, setTotalQuizzes] = useState<number>(0);

  // Combine loading and error states
  const loading = staffLoading || quizCountLoading;
  const error = staffError || quizCountError;

  // Keep other state specific to this page
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const { user: _user } = useAuth();
  const _navigate = useNavigate();

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

  // Remove the incorrect placeholder useEffect for totalQuizzes
  /*
  useEffect(() => {
      // Placeholder: Calculate max taken from the data provided by the hook
      // Ideally, fetch this separately from '/quiz/count'
      const maxTaken = staffData.reduce(
          (max, staff) => Math.max(max, staff.quizzesTaken ?? 0),
          0
      );
      setTotalQuizzes(maxTaken);
  }, [staffData])
  */

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
    <DashboardLayout title="Staff Results & Analytics">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-600 rounded-xl shadow-lg">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Staff Results & Performance Analytics
              </h1>
              <p className="text-slate-600 mt-2">
                Track staff quiz performance and training progress
              </p>
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
            <div className="text-center">
              <LoadingSpinner message="Loading staff results..." />
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
            {/* KPIs Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Key Performance Indicators
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        {totalStaff === null ? "N/A" : totalStaff.toString()}
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
    </DashboardLayout>
  );
};

export default RestaurantStaffResultsPage;
