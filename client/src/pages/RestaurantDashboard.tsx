import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Updated Interfaces to match the data structure needed
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

interface StaffMemberWithResults {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  results: ResultSummary[];
}

// Simple Loading Spinner Placeholder
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
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

// Simple Error Message Placeholder
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

const RestaurantDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading, logout } = useAuth();
  const navigate = useNavigate();
  // Remove old staff state
  // const [staffList, setStaffList] = useState<StaffMember[]>([]);
  // const [staffLoading, setStaffLoading] = useState<boolean>(false);
  // const [staffError, setStaffError] = useState<string | null>(null);
  // Add new state for combined data
  const [staffQuizData, setStaffQuizData] = useState<StaffMemberWithResults[]>(
    []
  );
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false); // State for copy feedback

  // Update useEffect to fetch combined staff/results data
  useEffect(() => {
    const fetchStaffQuizSummary = async () => {
      if (user && user.role === "restaurant") {
        setSummaryLoading(true);
        setSummaryError(null);
        try {
          const response = await api.get<{
            staff: StaffMemberWithResults[];
            totalAvailableQuizzes: number;
          }>(
            "/results/restaurant-view" // Use the endpoint that provides combined data
          );
          setStaffQuizData(response.data.staff || []);
          setTotalQuizzes(response.data.totalAvailableQuizzes || 0);
        } catch (err: any) {
          setSummaryError(
            err.response?.data?.message || "Failed to load staff quiz summary."
          );
          setStaffQuizData([]);
          setTotalQuizzes(0);
        } finally {
          setSummaryLoading(false);
        }
      }
    };
    if (!authIsLoading) fetchStaffQuizSummary();
  }, [user, authIsLoading]);

  const handleLogout = () => {
    setIsSidebarOpen(false);
    logout();
  };

  // --- Copy ID Handler ---
  const handleCopyId = () => {
    if (user?.userId) {
      navigator.clipboard
        .writeText(user.userId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        })
        .catch((err) => {
          console.error("Failed to copy ID: ", err);
          // Optionally show an error message to the user
        });
    }
  };

  if (authIsLoading) return <LoadingSpinner />;

  if (!user || user.role !== "restaurant") {
    return (
      <div className="p-8 flex flex-col items-center">
        <ErrorMessage message="Access Denied. Please log in as Restaurant Owner." />
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const navLinks = [
    { name: "Menu", path: "/menu" },
    { name: "Quizzes", path: "/quizzes" },
    { name: "Staff Results", path: "/staff-results" },
    { name: "Staff Management", path: "/staff" },
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 w-64">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 truncate">
          {user.restaurantName || "Dashboard"}
        </h2>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            onClick={() => setIsSidebarOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            {link.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-800"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar (Drawer) - Basic Implementation */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          isSidebarOpen ? "block" : "hidden"
        }`}
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        {/* Sidebar Content */}
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              {/* Basic Close Icon */}X
            </button>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
                  aria-label="Open sidebar"
                >
                  {/* Basic Hamburger Icon */}☰
                </button>
              </div>
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-gray-800 truncate">
                  {user.restaurantName || "Dashboard"}
                </h1>
              </div>
              <div className="flex items-center">
                {" "}
                {/* Add dummy div for spacing if needed */}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {user?.name}!
            </h1>
            {/* Display Restaurant ID and Copy Button */}
            {user?.userId && (
              <div className="mt-2 flex items-center space-x-2 bg-gray-50 p-2 rounded-md border border-gray-200 max-w-md">
                <p className="text-sm text-gray-600">
                  Your Restaurant ID (for staff registration):
                  <strong className="ml-1 font-mono text-gray-800">
                    {user.userId}
                  </strong>
                </p>
                <button
                  onClick={handleCopyId}
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    copied
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  } transition-colors duration-150 ease-in-out`}
                  aria-label={
                    copied ? "Copied Restaurant ID" : "Copy Restaurant ID"
                  }
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>

          {/* Grid for Management Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {/* Menu Card */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2 text-gray-900">
                Menu Management
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Create, view, and organize your restaurant's menus and items.
              </p>
              <div className="flex space-x-2">
                <Link to="/menu" className="w-full">
                  <button className="w-full px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                    View Menus
                  </button>
                </Link>
              </div>
            </div>
            {/* Quiz Card */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2 text-gray-900">
                Quiz Management
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Generate, manage, and review quizzes for staff training.
              </p>
              <div>
                <Link to="/quiz-management" className="w-full">
                  <button className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    Manage/Create Quiz
                  </button>
                </Link>
              </div>
            </div>
            {/* Add Staff Results Card */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">
                Staff Results
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                View your staff members' quiz performance and completion status.
              </p>
              <Link
                to="/staff-results"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition duration-150 ease-in-out"
              >
                View Staff Results
              </Link>
            </div>
            {/* Add Staff Management Card */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">
                Staff Management
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                View your staff list and their details.
              </p>
              <Link
                to="/staff"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition duration-150 ease-in-out"
              >
                Manage Staff
              </Link>
            </div>
          </div>

          {/* Staff List Table - Modified for Quiz Summary */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Staff Quiz Progress ({staffQuizData.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              {summaryLoading && <LoadingSpinner />}
              {summaryError && <ErrorMessage message={summaryError} />}
              {!summaryLoading && !summaryError && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Staff Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Quiz Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffQuizData.length > 0 ? (
                      staffQuizData.map((staff) => {
                        // Calculate number of *unique* completed quizzes
                        const completedQuizIds = new Set(
                          staff.results
                            .filter((r) => r.status === "completed")
                            .map((r) => r.quizId)
                        );
                        const completedCount = completedQuizIds.size;
                        const statusText =
                          completedCount >= totalQuizzes
                            ? "All Complete"
                            : "Pending";
                        const statusColor =
                          completedCount >= totalQuizzes
                            ? "text-green-600"
                            : "text-yellow-600";

                        return (
                          <tr key={staff._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <Link
                                to={`/staff/${staff._id}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {staff.name}
                              </Link>
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${statusColor}`}
                            >
                              {statusText} ({completedCount}/{totalQuizzes})
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-center py-4 text-sm text-gray-500"
                        >
                          No staff members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
