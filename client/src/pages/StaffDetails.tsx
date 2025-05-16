import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getQuizAttemptDetails, updateStaffRole } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";
import SuccessNotification from "../components/common/SuccessNotification";
import { formatDate } from "../utils/helpers";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { QuizResultDetails } from "../types/staffTypes";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

// --- Main Component ---
const StaffDetails: React.FC = () => {
  const { id: staffId } = useParams<{ id: string }>();
  const { user: _user } = useAuth();
  const navigate = useNavigate();

  // Use the custom hook
  const { staffDetails, loading, error, fetchStaffDetails } =
    useStaffDetails(staffId);

  // Keep state specific to this page (modals, role editing)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDataForIncorrectAnswers, setModalDataForIncorrectAnswers] =
    useState<QuizResultDetails | null>(null);
  const [_loadingModalDetails, _setLoadingModalDetails] = useState(false);
  const [_modalError, _setModalError] = useState<string | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editedRole, setEditedRole] = useState<string>("");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleErrorText, setRoleErrorText] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update editedRole when staffDetails load or change (if not already editing)
  useEffect(() => {
    if (staffDetails && !isEditingRole) {
      setEditedRole(staffDetails.professionalRole || "");
    }
  }, [staffDetails, isEditingRole]);

  // --- Handlers ---
  const handleOpenAttemptModal = useCallback(
    async (attemptId: string) => {
      _setLoadingModalDetails(true);
      _setModalError(null);
      setModalDataForIncorrectAnswers(null);
      setIsModalOpen(true);

      try {
        const attemptDetailsData = await getQuizAttemptDetails(attemptId);
        if (attemptDetailsData) {
          setModalDataForIncorrectAnswers({
            _id: attemptDetailsData._id,
            quizId: attemptDetailsData.quizId,
            quizTitle: attemptDetailsData.quizTitle,
            userId: attemptDetailsData.userId,
            score: attemptDetailsData.score,
            totalQuestions: attemptDetailsData.totalQuestions,
            completedAt: attemptDetailsData.attemptDate,
            incorrectQuestions: attemptDetailsData.incorrectQuestions,
          });
        } else {
          _setModalError("Could not load attempt details.");
        }
      } catch (err: any) {
        console.error("Error fetching attempt details:", err);
        _setModalError(
          err.message || "Failed to load details for this attempt."
        );
      } finally {
        _setLoadingModalDetails(false);
      }
    },
    [_setLoadingModalDetails, _setModalError]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDataForIncorrectAnswers(null);
    _setModalError(null);
  }, [_setModalError]);

  const handleEditRoleToggle = useCallback(() => {
    if (isEditingRole) {
      setEditedRole(staffDetails?.professionalRole || "");
      setRoleErrorText(null);
    }
    setIsEditingRole((prev) => !prev);
  }, [isEditingRole, staffDetails?.professionalRole]);

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedRole(e.target.value);
      setRoleErrorText(null);
    },
    []
  );

  const handleSaveRole = useCallback(async () => {
    if (!staffId) return;
    if (editedRole === (staffDetails?.professionalRole || "")) {
      setIsEditingRole(false);
      return;
    }
    setIsSavingRole(true);
    setRoleErrorText(null);
    setSuccessMessage(null);
    try {
      await updateStaffRole(staffId, editedRole);
      fetchStaffDetails();
      setIsEditingRole(false);
      setSuccessMessage("Role updated successfully.");
    } catch (err: any) {
      console.error("Error saving role:", err);
      setRoleErrorText(err.response?.data?.message || "Failed to update role.");
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
        {roleErrorText && isEditingRole && (
          <div className="mb-4">
            <ErrorMessage
              message={roleErrorText}
              onDismiss={() => setRoleErrorText(null)}
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
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">
          Quiz Performance
        </h2>
        {loading && <LoadingSpinner message="Refreshing details..." />}
        {staffDetails.aggregatedQuizPerformance.length === 0 && !loading && (
          <Card className="p-4 text-center text-gray-500">
            No quiz performance data available for this staff member.
          </Card>
        )}
        <div className="space-y-6">
          {staffDetails.aggregatedQuizPerformance.map((quizAgg) => (
            <Card
              key={quizAgg.quizId}
              className="p-4 shadow-md rounded-lg bg-white"
            >
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                {quizAgg.quizTitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">
                    Average Score:{" "}
                  </span>
                  <span
                    className={`font-bold ${
                      (quizAgg.averageScorePercent ?? 0) >= 70
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {quizAgg.averageScorePercent?.toFixed(1) ?? "N/A"}%
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Attempts: </span>
                  {quizAgg.numberOfAttempts}
                </div>
                <div>
                  <span className="font-medium text-gray-600">
                    Last Attempt:{" "}
                  </span>
                  {quizAgg.lastCompletedAt
                    ? formatDate(quizAgg.lastCompletedAt)
                    : "N/A"}
                </div>
              </div>

              {quizAgg.attempts && quizAgg.attempts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-600 mb-2">
                    All Attempts:
                  </h4>
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {quizAgg.attempts.map((attempt, index) => (
                      <li
                        key={attempt._id}
                        className="text-sm p-3 bg-gray-50 hover:bg-gray-100 rounded-md flex flex-col sm:flex-row justify-between sm:items-center"
                      >
                        <div className="mb-2 sm:mb-0">
                          <span className="font-medium">
                            Attempt {quizAgg.attempts.length - index}
                          </span>
                          <span className="text-gray-500 ml-2">
                            (
                            {new Date(attempt.attemptDate).toLocaleDateString()}{" "}
                            {new Date(attempt.attemptDate).toLocaleTimeString()}
                            )
                          </span>
                          <span
                            className={`font-semibold ml-3 ${
                              attempt.score >= attempt.totalQuestions * 0.7
                                ? "text-green-600"
                                : "text-red-500"
                            }`}
                          >
                            Score: {attempt.score}/{attempt.totalQuestions}
                          </span>
                        </div>
                        {attempt.hasIncorrectAnswers && (
                          <Button
                            variant="secondary"
                            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:underline bg-transparent border-none shadow-none focus:outline-none focus:ring-0 self-start sm:self-center whitespace-nowrap"
                            onClick={() => handleOpenAttemptModal(attempt._id)}
                          >
                            View Incorrect Answers
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>

      {/* Modal for Incorrect Answers */}
      {isModalOpen && (
        <ViewIncorrectAnswersModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          quizResult={modalDataForIncorrectAnswers}
        />
      )}
    </div>
  );
};

export default StaffDetails;
