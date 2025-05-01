import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar"; // Import Navbar

// Interfaces
// Interface for a single result belonging to a staff member
interface ResultSummary {
  _id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  completedAt?: string;
  status: string;
  retakeCount: number;
}

// Interface for a staff member with their results
interface StaffMemberWithResults {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  professionalRole?: string; // Add professionalRole
  results: ResultSummary[]; // Array of their quiz results
}

// Sort types
type SortField = "name" | "role" | "completed" | "score" | "joined";
type SortDirection = "asc" | "desc";

// Filter types
interface Filters {
  name: string;
  role: string;
}

// Helper Components (Assuming LoadingSpinner and ErrorMessage exist elsewhere or define here)
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

// Helper function to check if a quiz is completed regardless of capitalization
const isCompletedQuiz = (result: ResultSummary): boolean => {
  const status = result.status.toLowerCase();
  return status === "completed";
};

// Enhanced bar chart component for visualizing score distribution
const ScoreDistributionChart: React.FC<{
  staffData: StaffMemberWithResults[];
  selectedCategory: string | null;
  onSelectCategory: (categoryKey: string | null) => void;
}> = ({ staffData, selectedCategory, onSelectCategory }) => {
  // Calculate distribution of scores into categories
  const scoreDistribution = useMemo(() => {
    const distribution = {
      excellent: 0, // 90-100%
      good: 0, // 75-89%
      average: 0, // 60-74%
      needsWork: 0, // 0-59%
      noResults: 0, // No completed quizzes
    };

    staffData.forEach((staff) => {
      const completedQuizzes = staff.results.filter(isCompletedQuiz);
      if (completedQuizzes.length === 0) {
        distribution.noResults++;
        return;
      }

      const totalScore = completedQuizzes.reduce(
        (sum, r) => sum + (r.score || 0),
        0
      );
      const totalPossibleScore = completedQuizzes.reduce(
        (sum, r) => sum + (r.totalQuestions || 0),
        0
      );

      if (totalPossibleScore === 0) {
        distribution.noResults++;
        return;
      }

      const averagePercentage = (totalScore / totalPossibleScore) * 100;

      if (averagePercentage >= 90) distribution.excellent++;
      else if (averagePercentage >= 75) distribution.good++;
      else if (averagePercentage >= 60) distribution.average++;
      else distribution.needsWork++;
    });

    return distribution;
  }, [staffData]);

  const maxCount = Math.max(...Object.values(scoreDistribution));
  const totalStaff = Object.values(scoreDistribution).reduce(
    (a, b) => a + b,
    0
  );

  // Calculate percentages for each category
  const getPercentage = (count: number) => {
    return totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0;
  };

  // Distribution categories configuration
  const categories = [
    {
      key: "excellent",
      label: "Excellent",
      range: "90-100%",
      color: "bg-green-500",
      hoverColor: "bg-green-600",
      textColor: "text-green-800",
      count: scoreDistribution.excellent,
      percentage: getPercentage(scoreDistribution.excellent),
    },
    {
      key: "good",
      label: "Good",
      range: "75-89%",
      color: "bg-blue-500",
      hoverColor: "bg-blue-600",
      textColor: "text-blue-800",
      count: scoreDistribution.good,
      percentage: getPercentage(scoreDistribution.good),
    },
    {
      key: "average",
      label: "Average",
      range: "60-74%",
      color: "bg-yellow-500",
      hoverColor: "bg-yellow-600",
      textColor: "text-yellow-800",
      count: scoreDistribution.average,
      percentage: getPercentage(scoreDistribution.average),
    },
    {
      key: "needsWork",
      label: "Needs Work",
      range: "<60%",
      color: "bg-red-500",
      hoverColor: "bg-red-600",
      textColor: "text-red-800",
      count: scoreDistribution.needsWork,
      percentage: getPercentage(scoreDistribution.needsWork),
    },
    {
      key: "noResults",
      label: "No Results",
      range: "",
      color: "bg-gray-300",
      hoverColor: "bg-gray-400",
      textColor: "text-gray-800",
      count: scoreDistribution.noResults,
      percentage: getPercentage(scoreDistribution.noResults),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Staff Performance Overview
        </h2>
        <div className="text-sm text-gray-500">
          Total Staff: <span className="font-semibold">{totalStaff}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.key;
          return (
            <div
              key={category.key}
              className={`flex flex-col bg-gray-50 rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "ring-2 ring-blue-500 shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => onSelectCategory(isSelected ? null : category.key)}
              role="button"
              aria-pressed={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  onSelectCategory(isSelected ? null : category.key);
              }}
            >
              <div className="mb-2">
                <div className="flex justify-between items-center">
                  <h3 className={`font-semibold ${category.textColor}`}>
                    {category.label}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {category.range}
                  </span>
                </div>
                <div className="text-3xl font-bold mt-1">{category.count}</div>
                <div className="text-sm text-gray-500">
                  {category.percentage}% of staff
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`${category.color} h-2.5 rounded-full transition-all duration-500 ease-out hover:${category.hoverColor}`}
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RestaurantStaffResultsPage: React.FC = () => {
  const [staffData, setStaffData] = useState<StaffMemberWithResults[]>([]);
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0); // Keep track of total quizzes
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null); // State for expanded row
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filtering state
  const [filters, setFilters] = useState<Filters>({
    name: "",
    role: "",
  });

  // State for card-based category filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Performance metrics state
  const [showChart, setShowChart] = useState<boolean>(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        // Endpoint returns { staff: StaffMemberWithResults[], totalAvailableQuizzes: number }
        const response = await api.get<{
          staff: StaffMemberWithResults[];
          totalAvailableQuizzes: number;
        }>("/results/restaurant-view");

        // Debug logging
        console.log("Staff Results Data:", response.data);
        if (response.data.staff) {
          // Check for any results with status "completed" (lowercase)
          const staffWithLowerCaseResults = response.data.staff.filter((s) =>
            s.results.some((r) => r.status === "completed")
          );
          if (staffWithLowerCaseResults.length > 0) {
            console.log(
              "Found results with lowercase 'completed' status:",
              staffWithLowerCaseResults
            );
          }

          // Check all staff results statuses
          console.log("All unique statuses in results:", [
            ...new Set(
              response.data.staff.flatMap((s) => s.results.map((r) => r.status))
            ),
          ]);

          // Look for Misha's results specifically
          const misha = response.data.staff.find((s) =>
            s.name.toLowerCase().includes("misha")
          );
          if (misha) {
            console.log("Misha's data:", misha);
            console.log(
              "Misha's results statuses:",
              misha.results.map((r) => r.status)
            );
          }
        }

        setStaffData(response.data.staff || []);
        setTotalQuizzes(response.data.totalAvailableQuizzes || 0);
      } catch (err: any) {
        console.error("Error fetching staff results:", err);
        setError(err.response?.data?.message || "Failed to fetch results.");
        setStaffData([]);
        setTotalQuizzes(0);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "restaurant") {
      fetchResults();
    } else {
      setError("Access denied. Only restaurant owners can view staff results.");
      setLoading(false);
    }
  }, [user]);

  const formatDate = (dateString?: string, includeTime: boolean = false) => {
    if (!dateString) return "N/A";
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
      }
      return new Date(dateString).toLocaleDateString("en-US", options);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  const toggleExpand = (staffId: string) => {
    setExpandedStaffId((prevId) => (prevId === staffId ? null : staffId));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      name: "",
      role: "",
    });
    setSelectedCategory(null);
  };

  // Apply filters and sorting to staff data
  const filteredAndSortedStaffData = useMemo(() => {
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
    if (selectedCategory) {
      result = result.filter((staff) => {
        const completedQuizzes = staff.results.filter(isCompletedQuiz);

        if (selectedCategory === "noResults") {
          return completedQuizzes.length === 0;
        }

        if (completedQuizzes.length === 0) return false; // Cannot match score categories if no results

        const totalScore = completedQuizzes.reduce(
          (sum, r) => sum + (r.score || 0),
          0
        );
        const totalPossibleScore = completedQuizzes.reduce(
          (sum, r) => sum + (r.totalQuestions || 0),
          0
        );

        if (totalPossibleScore === 0) return false; // Avoid division by zero

        const averagePercentage = (totalScore / totalPossibleScore) * 100;

        switch (selectedCategory) {
          case "excellent":
            return averagePercentage >= 90;
          case "good":
            return averagePercentage >= 75 && averagePercentage < 90;
          case "average":
            return averagePercentage >= 60 && averagePercentage < 75;
          case "needsWork":
            return averagePercentage < 60;
          default:
            return false;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "role":
          comparison = (a.professionalRole || "").localeCompare(
            b.professionalRole || ""
          );
          break;
        case "completed":
          const aCompleted = a.results.filter(isCompletedQuiz).length;
          const bCompleted = b.results.filter(isCompletedQuiz).length;
          comparison = aCompleted - bCompleted;
          break;
        case "score":
          const aCompletedQuizzes = a.results.filter(isCompletedQuiz);
          const bCompletedQuizzes = b.results.filter(isCompletedQuiz);

          const aTotalScore = aCompletedQuizzes.reduce(
            (sum, r) => sum + (r.score || 0),
            0
          );
          const aTotalPossible = aCompletedQuizzes.reduce(
            (sum, r) => sum + (r.totalQuestions || 0),
            0
          );

          const bTotalScore = bCompletedQuizzes.reduce(
            (sum, r) => sum + (r.score || 0),
            0
          );
          const bTotalPossible = bCompletedQuizzes.reduce(
            (sum, r) => sum + (r.totalQuestions || 0),
            0
          );

          const aAvg = aTotalPossible > 0 ? aTotalScore / aTotalPossible : 0;
          const bAvg = bTotalPossible > 0 ? bTotalScore / bTotalPossible : 0;

          comparison = aAvg - bAvg;
          break;
        case "joined":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [staffData, filters, sortField, sortDirection, selectedCategory]);

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
            Staff Quiz Results
          </h1>

          {loading && <LoadingSpinner />}
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
                  staffData={staffData}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              )}

              {/* Filters */}
              <div className="bg-white shadow-md rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="name-filter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Search by Name/Email
                  </label>
                  <input
                    type="text"
                    id="name-filter"
                    name="name"
                    value={filters.name}
                    onChange={handleFilterChange}
                    placeholder="Search staff..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="role-filter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Filter by Role
                  </label>
                  <input
                    type="text"
                    id="role-filter"
                    name="role"
                    value={filters.role}
                    onChange={handleFilterChange}
                    placeholder="Filter by role..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition text-sm font-medium"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                {filteredAndSortedStaffData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("name")}
                          >
                            Staff Member {sortArrow("name")}
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("role")}
                          >
                            Role {sortArrow("role")}
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("completed")}
                          >
                            Quizzes Completed {sortArrow("completed")}
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("score")}
                          >
                            Avg. Score {sortArrow("score")}
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("joined")}
                          >
                            Joined {sortArrow("joined")}
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">View Details</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedStaffData.map((staff) => {
                          const completedQuizzes =
                            staff.results.filter(isCompletedQuiz);
                          const totalScore = completedQuizzes.reduce(
                            (sum, r) => sum + (r.score || 0),
                            0
                          );
                          const totalPossibleScore = completedQuizzes.reduce(
                            (sum, r) => sum + (r.totalQuestions || 0),
                            0
                          );
                          const averagePercentage =
                            totalPossibleScore > 0
                              ? (
                                  (totalScore / totalPossibleScore) *
                                  100
                                ).toFixed(0)
                              : null;
                          const isExpanded = expandedStaffId === staff._id;

                          return (
                            <React.Fragment key={staff._id}>
                              <tr
                                className={`hover:bg-gray-50 ${
                                  isExpanded ? "bg-blue-50" : ""
                                }`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {/* Clickable Name */}
                                  <Link
                                    to={`/staff/${staff._id}`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {staff.name}
                                  </Link>
                                  <div className="text-sm text-gray-500">
                                    {staff.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {staff.professionalRole || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                                  {`${completedQuizzes.length} / ${totalQuizzes}`}
                                </td>
                                <td
                                  className={`px-6 py-4 whitespace-nowrap text-sm text-center font-semibold ${
                                    averagePercentage === null
                                      ? "text-gray-500"
                                      : parseInt(averagePercentage) >= 70
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {averagePercentage !== null
                                    ? `${averagePercentage}%`
                                    : "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(staff.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                  <button
                                    onClick={() => toggleExpand(staff._id)}
                                    className={`p-1 px-2 rounded text-xs ${
                                      isExpanded
                                        ? "bg-blue-200 text-blue-800"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                    aria-expanded={isExpanded}
                                    aria-controls={`details-${staff._id}`}
                                    aria-label={`${
                                      isExpanded ? "Hide" : "Show"
                                    } quiz details for ${staff.name}`}
                                  >
                                    {isExpanded ? "Hide" : "Details"}
                                  </button>
                                </td>
                              </tr>
                              {/* Expanded Row with Details */}
                              {isExpanded && (
                                <tr id={`details-${staff._id}`}>
                                  <td
                                    colSpan={6}
                                    className="px-6 py-4 bg-gray-50 border-t border-gray-200"
                                  >
                                    <div className="text-sm text-gray-800">
                                      <h4 className="font-semibold mb-2 text-gray-700">
                                        Quiz Details:
                                      </h4>
                                      {completedQuizzes.length > 0 ? (
                                        <ul className="space-y-2">
                                          {completedQuizzes.map((result) => (
                                            <li
                                              key={result._id}
                                              className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                                            >
                                              <span className="font-medium">
                                                {result.quizTitle}:
                                              </span>{" "}
                                              {result.score}/
                                              {result.totalQuestions} (
                                              {(
                                                (result.score /
                                                  result.totalQuestions) *
                                                100
                                              ).toFixed(0)}
                                              %)
                                              <span className="text-xs text-gray-500 ml-2">
                                                {" "}
                                                (Completed:{" "}
                                                {formatDate(
                                                  result.completedAt,
                                                  true
                                                )}
                                                )
                                              </span>
                                              <span className="text-xs text-gray-500 ml-2">
                                                {" "}
                                                (Retakes:{" "}
                                                {result.retakeCount > 0
                                                  ? result.retakeCount - 1
                                                  : 0}
                                                )
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-gray-500 italic">
                                          No quizzes completed yet.
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-6 px-4">
                    {filters.name || filters.role || selectedCategory
                      ? "No staff members match the selected filters."
                      : "No staff members found."}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default RestaurantStaffResultsPage;
