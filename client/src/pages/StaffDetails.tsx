import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";
import SuccessNotification from "../components/common/SuccessNotification";
import { formatDate } from "../utils/helpers";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { StaffDetailsData, QuizResultDetails } from "../types/staffTypes";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);
    try {
      await api.patch(`/staff/${staffId}`, { professionalRole: editedRole });
      fetchStaffDetails(); // Re-fetch details to get updated data
      setIsEditingRole(false);
      setSuccessMessage("Role updated successfully.");
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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading staff details..." />
        </main>
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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="text-sm"
          >
            &larr; Back
          </Button>
        </div>

        {/* Notifications Area */}
        {successMessage && (
          <div className="mb-4">
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </div>
        )}
        {roleError && isEditingRole && (
          <div className="mb-4">
            <ErrorMessage
              message={roleError}
              onDismiss={() => setRoleError(null)}
            />
          </div>
        )}

        {/* Updated Page Title Header for staff name */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {staffDetails.name}
          </h1>
          {/* Optional: Subtitle for role, if desired in this prominent header */}
          {/* <p className="mt-1 text-lg text-gray-600">{staffDetails.professionalRole || "Role not set"}</p> */}
        </div>

        {/* Updated Staff Details Card */}
        <Card className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start">
            {/* Left side: Email & Joined Date */}
            <div className="mb-4 sm:mb-0">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">
                Contact & Employment
              </h2>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {staffDetails.email}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Joined:</span>{" "}
                {formatDate(staffDetails.createdAt)}
              </p>
            </div>

            {/* Right side: Role & Average Score */}
            <div className="sm:ml-4 flex flex-col items-start sm:items-end space-y-3">
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-1">
                  Professional Role
                </h3>
                {isEditingRole ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editedRole}
                      onChange={handleRoleChange}
                      disabled={isSavingRole}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
                      aria-label="Professional Role"
                    />
                    <Button
                      variant="primary"
                      onClick={handleSaveRole}
                      isLoading={isSavingRole}
                      disabled={
                        isSavingRole ||
                        editedRole === (staffDetails?.professionalRole || "")
                      }
                      className="text-sm whitespace-nowrap"
                    >
                      Save Role
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleEditRoleToggle}
                      disabled={isSavingRole}
                      className="text-sm whitespace-nowrap"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-800 bg-gray-100 px-3 py-1.5 rounded-md">
                      {staffDetails.professionalRole || "Not Set"}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={handleEditRoleToggle}
                      className="text-xs px-2 py-1 whitespace-nowrap"
                    >
                      Edit Role
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-1">
                  Overall Average Score
                </h3>
                <p
                  className={`text-2xl font-bold ${
                    staffDetails.averageScore === null
                      ? "text-gray-500"
                      : staffDetails.averageScore >= 70
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {staffDetails.averageScore !== null
                    ? `${staffDetails.averageScore.toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Updated Quiz Results & Performance Card */}
        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Quiz Results & Performance
          </h2>
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
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenModal(result)}
                          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={
                            // If incorrectQuestions exists, use it, otherwise check score vs totalQuestions
                            (result.incorrectQuestions?.length || 0) === 0 &&
                            result.score >= result.totalQuestions
                          }
                          aria-label={`View incorrect answers for ${result.quizTitle}`}
                        >
                          {/* Determine if there are incorrect answers by: 
                              1. incorrectQuestions array length or 
                              2. comparing score to totalQuestions */}
                          {(result.incorrectQuestions?.length || 0) > 0 ||
                          result.score < result.totalQuestions
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
        </Card>
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
