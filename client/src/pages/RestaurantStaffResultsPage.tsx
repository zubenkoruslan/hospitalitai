import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useStaffSummary } from "../hooks/useStaffSummary"; // Import the new hook
import { useQuizCount } from "../hooks/useQuizCount"; // Import the quiz count hook
import Navbar from "../components/Navbar"; // Import Navbar
import LoadingSpinner from "../components/common/LoadingSpinner"; // Import common LoadingSpinner
import ErrorMessage from "../components/common/ErrorMessage"; // Import common ErrorMessage
import ScoreDistributionChart from "../components/charts/ScoreDistributionChart"; // Import the chart
import StaffResultsFilter from "../components/staff/StaffResultsFilter"; // Import the filter component
import StaffResultsTable from "../components/staff/StaffResultsTable"; // Import the table component
import Card from "../components/common/Card"; // Import Card
// Import shared types
import {
  ResultSummary,
  StaffMemberWithData,
  SortField,
  SortDirection,
  Filters,
} from "../types/staffTypes";
// Import utility functions
import { formatDate } from "../utils/helpers"; // Import only formatDate

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
    quizCount: totalQuizzes,
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
  const { user } = useAuth(); // Still needed for potential conditional logic or display
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
  const [showChart, setShowChart] = useState<boolean>(true);

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
            Staff Quiz Results
          </h1>
          {loading && <LoadingSpinner message="Loading staff results..." />}
          {error && <ErrorMessage message={error} />}
          {!loading && !error && (
            <>
              {/* Chart Toggle */}
              <div className="mb-4">
                <button
                  onClick={() => setShowChart(!showChart)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showChart
                    ? "Hide Performance Chart"
                    : "Show Performance Chart"}
                </button>
              </div>

              {/* Performance Chart */}
              {showChart && (
                <ScoreDistributionChart
                  staffData={staffData} // Use staffData from hook
                  selectedCategory={selectedPerformanceCategory}
                  onSelectCategory={setSelectedPerformanceCategory}
                />
              )}

              {/* Filters */}
              <StaffResultsFilter
                filters={filters}
                staffData={staffData}
                selectedCategory={selectedPerformanceCategory}
                onFilterChange={handleFilterChange}
                onCategoryChange={setSelectedPerformanceCategory}
                onResetFilters={resetFilters}
              />

              {/* Use Card to wrap the table container */}
              <Card className="p-0 overflow-hidden">
                {filteredAndSortedStaff.length > 0 ? (
                  <StaffResultsTable
                    staff={filteredAndSortedStaff} // Uses derived data
                    expandedStaffId={expandedStaffId}
                    onToggleExpand={toggleExpand}
                  />
                ) : (
                  <p className="text-center text-gray-500 py-6 px-4">
                    {filters.name || filters.role || selectedPerformanceCategory
                      ? "No staff members match the selected filters."
                      : "No staff members found."}
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default RestaurantStaffResultsPage;
