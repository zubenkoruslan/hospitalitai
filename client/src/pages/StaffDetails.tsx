import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";
import { formatDate } from "../utils/helpers";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { StaffDetailsData, QuizResultDetails } from "../types/staffTypes";

// --- Main Component ---
const StaffDetails: React.FC = () => {
  const { id: staffId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use the custom hook
  const { staffDetails, loading, error, fetchStaffDetails } =
    useStaffDetails(staffId);

  // Keep state specific to this page (modals, role editing)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuizResult, setSelectedQuizResult] =
    useState<QuizResultDetails | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editedRole, setEditedRole] = useState<string>("");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Update editedRole when staffDetails load or change (if not already editing)
  useEffect(() => {
    if (staffDetails && !isEditingRole) {
      setEditedRole(staffDetails.professionalRole || "");
    }
  }, [staffDetails, isEditingRole]);

  // --- Handlers ---
  const handleOpenModal = useCallback((result: QuizResultDetails) => {
    setSelectedQuizResult(result);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedQuizResult(null);
  }, []);

  const handleEditRoleToggle = useCallback(() => {
    if (isEditingRole) {
      // Reset to original value if cancelling
      setEditedRole(staffDetails?.professionalRole || "");
      setRoleError(null);
    }
    setIsEditingRole((prev) => !prev);
  }, [isEditingRole, staffDetails?.professionalRole]);

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedRole(e.target.value);
      setRoleError(null); // Clear error on change
    },
    []
  );

  const handleSaveRole = useCallback(async () => {
    if (!staffId) return;
    if (editedRole === (staffDetails?.professionalRole || "")) {
      setIsEditingRole(false); // No change, just exit edit mode
      return;
    }

    setIsSavingRole(true);
    setRoleError(null);
    try {
      await api.patch(`/staff/${staffId}`, { professionalRole: editedRole });
      fetchStaffDetails(); // Re-fetch details to get updated data
      setIsEditingRole(false);
    } catch (err: any) {
      console.error("Error saving role:", err);
      setRoleError(err.response?.data?.message || "Failed to update role.");
    } finally {
      setIsSavingRole(false);
    }
  }, [staffId, editedRole, staffDetails?.professionalRole, fetchStaffDetails]);

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  // Use error state from hook
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 px-4">
          <ErrorMessage message={error} />
        </main>
      </div>
    );
  }

  if (!staffDetails) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 px-4">
          <ErrorMessage message="Staff member not found." />
        </main>
      </div>
    );
  }

  // Use staffDetails from hook in the render
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-4xl mx-auto py-6 px-4">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)} // Go back one step in history
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          &larr; Back to Staff List
        </button>

        {/* Staff Header */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {staffDetails.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {staffDetails.email} &middot; Joined:{" "}
                {formatDate(staffDetails.createdAt)}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-4">
              {/* Container for Role and Average Score */}
              <div className="flex flex-col items-start sm:items-end space-y-2">
                {/* Role Editing/Display */}
                {isEditingRole ? (
                  <div className="flex items-center space-x-2">
                    {/* Role Input, Save, Cancel Buttons */}
                    <input
                      type="text"
                      value={editedRole}
                      onChange={handleRoleChange}
                      disabled={isSavingRole}
                      className="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                      aria-label="Professional Role"
                    />
                    <button
                      onClick={handleSaveRole}
                      disabled={isSavingRole}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSavingRole ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleEditRoleToggle}
                      disabled={isSavingRole}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 disabled:opacity-50 whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                      Role: {staffDetails.professionalRole || "Not Set"}
                    </span>
                    <button
                      onClick={handleEditRoleToggle}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap"
                    >
                      Edit Role
                    </button>
                  </div>
                )}
                {roleError && (
                  <p className="text-xs text-red-600 mt-1 text-right">
                    {roleError}
                  </p>
                )}

                {/* Average Score Display - Add Styling */}
                <div className="text-sm text-gray-600">
                  Average Score:{" "}
                  {staffDetails.averageScore != null ? (
                    <span
                      className={`font-semibold ${
                        staffDetails.averageScore >= 70
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {`${staffDetails.averageScore.toFixed(1)}%`}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-500">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Results Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-800 p-4 border-b">
            Tests Taken
          </h3>
          {staffDetails.quizResults && staffDetails.quizResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left font-medium tracking-wider"
                    >
                      Quiz Title
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left font-medium tracking-wider"
                    >
                      Completed
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left font-medium tracking-wider"
                    >
                      Score
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left font-medium tracking-wider"
                    >
                      Retakes
                    </th>
                    <th scope="col" className="relative px-4 py-2">
                      <span className="sr-only">View Incorrect</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {staffDetails.quizResults.map((result) => (
                    <tr key={result._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {result.quizTitle}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(result.completedAt, true)}
                      </td>
                      {/* Score Column - Add Styling */}
                      <td className="px-4 py-3 text-gray-700">
                        {result.score}/{result.totalQuestions}
                        {result.totalQuestions > 0 && (
                          <span
                            className={`ml-2 font-semibold ${
                              (result.score / result.totalQuestions) * 100 >= 70
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            (
                            {(
                              (result.score / result.totalQuestions) *
                              100
                            ).toFixed(0)}
                            %)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {result.retakeCount > 0 ? result.retakeCount - 1 : 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenModal(result)}
                          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={result.incorrectQuestions.length === 0}
                          aria-label={`View incorrect answers for ${result.quizTitle}`}
                        >
                          {result.incorrectQuestions.length > 0
                            ? "View Incorrect"
                            : "All Correct"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 p-6">
              No quizzes have been completed by this staff member.
            </p>
          )}
        </div>
      </main>

      {/* Modal for Incorrect Answers */}
      <ViewIncorrectAnswersModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        quizResult={selectedQuizResult}
      />
    </div>
  );
};

export default StaffDetails;
