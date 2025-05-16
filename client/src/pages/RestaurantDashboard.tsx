import React, { useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { processPdfMenuUpload } from "../services/api"; // For menu upload
import Navbar from "../components/Navbar";
import { useStaffSummary } from "../hooks/useStaffSummary";
import { useQuizCount } from "../hooks/useQuizCount";
import { useMenus } from "../hooks/useMenus";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ErrorMessage from "../components/common/ErrorMessage";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { ResultSummary } from "../types/staffTypes"; // Removed StaffMemberWithData

// Helper function to check if a quiz is completed regardless of capitalization
// This function uses ResultSummary, ensure it's compatible with the imported one
const _isCompletedQuiz = (result: ResultSummary): boolean => {
  const status = result.status.toLowerCase();
  return status === "completed";
};

const RestaurantDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use custom hooks for data fetching
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
  const {
    menus,
    loading: menuLoading,
    error: menuError,
    fetchMenus,
  } = useMenus();

  // Keep other state
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // State for menu upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Memoize calculations based on staffData from the hook
  const overallAveragePerformance = useMemo(() => {
    const staffWithScores = staffData.filter(
      (staff) => staff.averageScore !== null
    );
    if (staffWithScores.length === 0) return "0";

    const sumOfAverages = staffWithScores.reduce(
      (sum, staff) => sum + (staff.averageScore as number), // Assert non-null
      0
    );
    const overallAverage = sumOfAverages / staffWithScores.length;
    return overallAverage.toFixed(1); // Display raw average score
  }, [staffData]);

  const filteredStaffData = useMemo(
    () =>
      searchTerm.length >= 3
        ? staffData.filter((staff) =>
            staff.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : staffData,
    [staffData, searchTerm]
  );

  // useCallback for copy handler
  const handleCopyId = useCallback(() => {
    if (user?.restaurantId) {
      navigator.clipboard
        .writeText(user.restaurantId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy ID: ", err);
        });
    }
  }, [user?.restaurantId]); // Dependency: user.restaurantId

  // useCallback for search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  ); // No dependency needed

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadMessage(null); // Clear previous messages
    } else {
      setSelectedFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !user?.restaurantId) {
      setUploadMessage("Please select a file and ensure you are logged in.");
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);
    const formData = new FormData();
    formData.append("menuPdf", selectedFile);

    try {
      await processPdfMenuUpload(user.restaurantId, formData);
      setUploadMessage("Menu uploaded successfully!");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset the file input
      }
      fetchMenus(); // Refresh menus list
    } catch (err: any) {
      setUploadMessage(
        err.response?.data?.message ||
          "Failed to upload menu. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Combine loading and error states for overall display
  const isLoading =
    authIsLoading || staffLoading || quizCountLoading || menuLoading;
  const displayError = staffError || quizCountError || menuError;

  if (authIsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Authenticating..." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner message="Loading dashboard data..." />
      </div>
    );
  }

  // Handle access denied specifically if it came from the hook
  if (!isLoading && staffError?.startsWith("Access denied")) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
        <ErrorMessage message={staffError} />
        <Button
          variant="primary"
          onClick={() => navigate("/login")}
          className="mt-4"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  // Handle general errors
  if (displayError) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ErrorMessage message={displayError} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Title and Restaurant ID section */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {
                  /* user?.restaurantName // This field is not in ClientUserMinimal
                  ? `${user.restaurantName} Dashboard`
                  : */ user?.name
                    ? `${user.name}'s Dashboard`
                    : "Restaurant Dashboard"
                }
              </h1>
              {user?.restaurantId && (
                <div className="mt-2 flex items-center">
                  <span className="text-sm font-medium text-gray-500 mr-2">
                    Restaurant ID:
                  </span>
                  <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {user.restaurantId}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="ml-2 p-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-700 transition-colors"
                    aria-label="Copy Restaurant ID"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
            {/* Optional: Add a primary action button here if needed for Soft UI style */}
          </div>
        </div>

        {displayError && (
          <div className="mb-6">
            <ErrorMessage message={displayError} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Staff Card - Link to /staff-results */}
          <Link to="/staff-results" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Staff
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {staffData.length}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-blue-500 mt-3 text-right">
                View Details &rarr;
              </p>
            </Card>
          </Link>

          {/* Quizzes Active Card - Link to /quiz-management */}
          <Link to="/quiz-management" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Quizzes Active
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {totalQuizzes}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-green-500 mt-3 text-right">
                Manage Quizzes &rarr;
              </p>
            </Card>
          </Link>

          {/* Menus Active Card - Link to /menu */}
          <Link to="/menu" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Menus Active
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {menus.length}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-3 text-right">
                Manage Menus &rarr;
              </p>
            </Card>
          </Link>

          {/* Overall Average Performance Card - Link to /staff-results */}
          <Link to="/staff-results" className="block hover:no-underline">
            <Card className="bg-white shadow-lg rounded-xl p-6 h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg. Performance
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {overallAveragePerformance}%
                  </dd>
                </div>
              </div>
              <p className="text-xs text-purple-500 mt-3 text-right">
                View Staff Results &rarr;
              </p>
            </Card>
          </Link>
        </div>

        {/* Menu Upload Section - Moved here */}
        <Card className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Upload New Menu (PDF)
          </h2>
          <div className="space-y-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: "none" }}
              id="menuPdfUpload"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mb-2 w-full text-sm py-2 truncate"
            >
              {selectedFile ? selectedFile.name : "Select PDF File"}
            </Button>
            {selectedFile && (
              <Button
                variant="primary"
                onClick={handleFileUpload}
                disabled={isUploading || !selectedFile}
                className="w-full text-sm py-2"
              >
                {isUploading ? <LoadingSpinner /> : "Upload Menu"}
              </Button>
            )}
            {uploadMessage && (
              <p
                className={`mt-3 text-xs ${
                  uploadMessage.includes("success")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {uploadMessage}
              </p>
            )}
          </div>
        </Card>

        {/* Staff List Section */}
        <Card className="bg-white shadow-lg rounded-xl mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Staff Overview
            </h2>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search staff by name..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Search staff"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {filteredStaffData.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {searchTerm.length >= 3
                  ? `No staff found matching "${searchTerm}".`
                  : "No staff members found or no results available yet."}
              </p>
            ) : (
              <Card className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Staff Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quizzes Taken
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStaffData.map((staff) => {
                        return (
                          <tr key={staff._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <Link
                                to={`/staff/${staff._id}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                aria-label={`View details for ${staff.name}`}
                              >
                                {staff.name}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {staff.professionalRole || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {staff.quizzesTaken ?? 0} / {totalQuizzes}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                                staff.averageScore === null
                                  ? "text-gray-500"
                                  : staff.averageScore >= 70
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {staff.averageScore !== null
                                ? `${staff.averageScore.toFixed(1)}%`
                                : "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default RestaurantDashboard;
